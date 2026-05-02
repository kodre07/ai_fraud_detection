"""
aiml/scoring/scorer.py — Production scoring router for real MongoDB transactions.

Routing decision based on account neighbour count (from Neo4j):
  <= 0 neighbours  -> rule_based          (new/isolated account; -1 = Neo4j error)
  1-2  neighbours  -> xgboost             (sparse graph data)
  >= 3 neighbours  -> gnn_hybrid_fallback (full graph context)

Calibration v3 changes (over-correction fixes):
  Fix 1 — Graph neighbor tier adjustments cut by ~40% (were erasing all fraud signal)
  Fix 2 — Exculpatory signal weights reduced; total safe contribution capped at -0.20
  Fix 3 — Exculpatory cap is neighbor-aware to prevent double-dipping with graph adj
  Fix 4 — Score floor: transactions with any fraud signal cannot score exactly 0.00
  Fix 5 — Confidence dampening changed to lighter formula (was pulling scores too low)
  Fix 6 — PATH C uses reduced neighbor-aware exculpatory cap (GNN already encodes graph trust)

Calibration v4 changes (signal weight boosts + zero-peer fallback):
  Change 2  — Fraud signal weights boosted further; see _collect_fraud_signals
  Change 3  — Exculpatory signal weights reduced; PATH B cap tightened to -0.08
  Change 4  — Risk tier (_classify_risk) now compares the RAW score, not eff_score —
              dampening cannot suppress the alert trigger
  Change 5  — Confidence dampening formula changed to 0.95 + 0.05*confidence (near-no-op)
  Change 10 — Zero-peer fallback implemented in worker.py (DEFAULT_PEER_COUNT=3)

Calibration v5 changes (ring detection completeness):
  Fix A — Tiered velocity: extreme (>=10 tx/hr) → 0.35, high (>=5) → 0.24, moderate (>=3) → 0.14
  Fix B — graph_linked signals fire from neighbor_count in payload (order-independent)
  Fix C — shared_ip_peer_count / shared_device_peer_count signals from worker in-memory cache
  Fix D — Exculpatory cap in PATH A applied consistently (fraud_sum floor at 0.0)
"""

import logging
import math
import os
import pickle
from datetime import datetime
from typing import Any

import numpy as np

logger = logging.getLogger(__name__)

# ── Module-level model loading (PATH C) ───────────────────────────────────────
# Loaded once at import time; failures are non-fatal — PATH C falls back to
# _tabular_score() automatically when either artifact is unavailable.

_MODEL_DIR = os.path.join(os.path.dirname(__file__), "..", "models")
_DATA_DIR  = os.path.join(os.path.dirname(__file__), "..", "data")

try:
    with open(os.path.join(_MODEL_DIR, "hybrid_xgb.pkl"), "rb") as _f:
        _hybrid_xgb = pickle.load(_f)
    logger.info("✅ hybrid_xgb.pkl loaded (116-dim: 52 tabular + 64 GNN)")
except Exception as _e:
    _hybrid_xgb = None
    logger.warning(f"⚠️  hybrid_xgb.pkl not loaded — PATH C will use tabular fallback: {_e}")

try:
    import joblib as _joblib
    _tabular_feature_names = _joblib.load(os.path.join(_DATA_DIR, "tabular_feature_names.pkl"))
    logger.info(f"✅ tabular_feature_names loaded ({len(_tabular_feature_names)} features)")
except Exception as _e:
    _tabular_feature_names = None
    logger.warning(f"⚠️  tabular_feature_names.pkl not loaded: {_e}")

try:
    from graph.extractor import generate_embedding_real as _generate_embedding
    logger.info("✅ GNN extractor (GraphSAGE 64-dim) loaded for PATH C")
except Exception as _e:
    _generate_embedding = None
    logger.warning(f"⚠️  graph.extractor not loaded — PATH C will use tabular fallback: {_e}")

# ── Risk thresholds ────────────────────────────────────────────────────────────
_RISK_LOW    = 0.40   # 0.00-0.39 -> low      (no action)
_RISK_MEDIUM = 0.65   # 0.40-0.64 -> medium   (monitor)
_RISK_HIGH   = 0.85   # 0.65-0.84 -> high     (analyst review)
# >= 0.85           -> critical              (immediate action)

# ── Routing thresholds ─────────────────────────────────────────────────────────
_THRESH_RULE = 0   # neighbour_count <= 0 -> rule_based
_THRESH_XGB  = 3   # neighbour_count 1-2  -> xgboost


# ── Sigmoid normalization ──────────────────────────────────────────────────────

def _sigmoid_normalize(raw: float, center: float = 0.5, slope: float = 5.0) -> float:
    """
    Map a raw additive score to (0, 1) via sigmoid.
    Prevents linear addition from trivially saturating to 1.0.
    """
    return round(1.0 / (1.0 + math.exp(-slope * (raw - center))), 4)


# ── Risk classifier ────────────────────────────────────────────────────────────

def _classify_risk(raw_score: float) -> str:
    """
    Map the RAW (un-dampened) fraud score to a risk tier.

    Change 4: intentionally uses raw_score, NOT eff_score.  Confidence dampening
    exists to reduce overconfident reporting but must never suppress alert triggers.
    Example: raw=0.42 dampened to eff=0.39 is still classified 'medium' because
    the underlying signal IS medium risk — we just don't over-report certainty.
    """
    if raw_score < _RISK_LOW:
        return "low"
    if raw_score < _RISK_MEDIUM:
        return "medium"
    if raw_score < _RISK_HIGH:
        return "high"
    return "critical"


# ── Change 5: Minimal confidence dampening ────────────────────────────────────

def _effective_score(fraud_score: float, confidence: float) -> float:
    """
    Minimally dampen raw fraud_score for the reported score value only.

    Change 5 formula: effective = fraud_score * (0.95 + 0.05 * confidence)

    vs v3 formula:    effective = fraud_score * (0.85 + 0.15 * confidence)

    The v3 formula caused near-miss suppressions: 0.40 raw at confidence=0.65
    → 0.40 * 0.9475 = 0.379, below the 0.40 medium threshold, so alert dropped.
    This formula keeps eff_score close to raw_score:
      confidence=1.00 -> multiplier=1.000 (no reduction)
      confidence=0.65 -> multiplier=0.9825 (1.75% reduction)
      confidence=0.50 -> multiplier=0.975  (2.5% reduction)

    NOTE: risk tier classification uses raw_score, not eff_score (see _classify_risk).
    """
    return round(fraud_score * (0.95 + 0.05 * confidence), 4)


# ── FIX 1: Reduced graph neighbor adjustment tiers (~40% cut) ─────────────────

def _graph_adjustment(peer_count: int) -> float:
    """
    Return score adjustment based on cross-account peer linkage (peer_count).

    peer_count = number of other accounts sharing a device/IP/email/phone
    with this account (from get_peer_link_count in neo4j_client.py).
    A higher peer count = more suspicious cross-account sharing.

    Reduced by ~40% vs v2 to prevent wiping out fraud signals entirely.
    An established account can still commit fraud; this nudges, not erases.

    Tier table (v4):
      0        ->  0.00  (no cross-account sharing)
      1-2      -> -0.02  (was -0.03)
      3-5      -> -0.04  (was -0.06)
      6-10     -> -0.06  (was -0.10)
      11-15    -> -0.08  (was -0.13)
      > 15     -> -0.10  (was -0.16)
    """
    if peer_count <= 0:
        return 0.00
    if peer_count <= 2:
        return -0.02
    if peer_count <= 5:
        return -0.04
    if peer_count <= 10:
        return -0.06
    if peer_count <= 15:
        return -0.08
    return -0.10


# ── FIX 3: Neighbor-aware exculpatory cap ─────────────────────────────────────

def _exculpatory_cap(peer_count: int, path: str) -> float:
    """
    Return the maximum total safe/exculpatory signal contribution allowed.

    This prevents double-dipping: when the peer-graph adjustment is already
    applying a trust discount, the exculpatory signals cap is reduced so both
    systems don't independently penalise the fraud score for the same reason.

    peer_count = accounts sharing identifiers with this account (FRAUD SIGNAL).

    PATH A (rule_based):  no cap (-99 sentinel) — full safe signals allowed
    PATH B (xgboost):     full cap of -0.20
    PATH C (gnn_hybrid):  peer-aware cap (tighter because XGBoost already
                          receives the 64-dim GNN embedding as extra features)
      peer_count < 6  -> -0.18
      peer_count 6-10 -> -0.12
      peer_count 11-15-> -0.08
      peer_count > 15 -> -0.05
    """
    if path == "rule_based":
        return -99.0   # sentinel: no cap at all

    if path == "xgboost":
        return -0.08   # Change 5: tightened from -0.20 — safe signals were cancelling too much

    # PATH C: gnn_hybrid_fallback — peer-aware tighter cap
    if peer_count <= 5:
        return -0.18
    if peer_count <= 10:
        return -0.12
    if peer_count <= 15:
        return -0.08
    return -0.05


# ── FIX 4: Minimum score floor ────────────────────────────────────────────────

def _apply_score_floor(score: float, fraud_signal_count: int) -> float:
    """
    Prevent a transaction that had real fraud signals from scoring exactly 0.0.

    A score of 0.0000 tells the analyst "we are 100% certain this is not fraud",
    which is never epistemically justified when signals fired.

      >= 2 fraud signals -> floor at 0.10
      >= 1 fraud signal  -> floor at 0.05
         0 fraud signals -> no floor (0.0 is valid)
    """
    if fraud_signal_count >= 2:
        return max(score, 0.10)
    if fraud_signal_count >= 1:
        return max(score, 0.05)
    return score


# ── Hour-of-day helper ─────────────────────────────────────────────────────────

def _is_odd_hour(tx: dict) -> bool:
    """Return True if the transaction occurred between 01:00 and 05:00 UTC."""
    ts_raw = tx.get("createdAt") or tx.get("timestamp") or tx.get("transactionDate")
    if not ts_raw:
        return False
    try:
        if isinstance(ts_raw, str):
            ts = datetime.fromisoformat(ts_raw.replace("Z", "+00:00"))
        elif isinstance(ts_raw, datetime):
            ts = ts_raw
        else:
            return False
        return 1 <= ts.hour <= 5
    except Exception:
        return False


# ── Explanation builder ────────────────────────────────────────────────────────

def _build_explanation(
    signals: list[dict],
    fraud_score: float,
    effective: float,
) -> dict:
    """
    Build a rich explanation object for the alert panel.

    Each signal entry:
        feature, actual_value, contribution, direction ("fraud"|"safe"), reason
    """
    fraud_total = round(sum(s["contribution"] for s in signals if s["direction"] == "fraud"), 4)
    safe_total  = round(sum(s["contribution"] for s in signals if s["direction"] == "safe"),  4)

    fraud_signals = [s for s in signals if s["direction"] == "fraud"]
    top = max(fraud_signals, key=lambda s: s["contribution"]) if fraud_signals else None

    if top:
        top_reason = top["reason"]
    else:
        top_reason = "No significant fraud signals detected; score driven by base risk."

    if safe_total < 0:
        net_str = (
            f"+{fraud_total:.2f} fraud signals, "
            f"{safe_total:.2f} safe signals = "
            f"net raw {round(fraud_total + safe_total, 2):.2f}, "
            f"final score {fraud_score:.2f}"
        )
    else:
        net_str = f"+{fraud_total:.2f} fraud signals = net {fraud_total:.2f}, final score {fraud_score:.2f}"

    return {
        "shapValues":      signals,
        "topReason":       top_reason,
        "netContribution": net_str,
    }


# ── Internal: collect fraud signals only ──────────────────────────────────────

def _collect_fraud_signals(tx: dict) -> tuple[float, list[dict]]:
    """
    Evaluate all positive (fraud) signals.
    Returns (raw_sum, signals_list).
    Safe/exculpatory signals are handled separately so the cap can be applied.
    """
    raw: float    = 0.0
    signals: list = []

    amount       = float(tx.get("amount") or 0)
    avg_7d       = float(tx.get("avgAmount7d") or 0)
    deviation    = float(tx.get("amountDeviation") or 0)
    device       = (tx.get("deviceId") or "").strip().lower()
    ip           = (tx.get("ipAddress") or "").strip()
    ip_country   = (tx.get("ipCountry") or "").strip()
    acc_country  = (tx.get("accountCountry") or "").strip()
    er           = tx.get("entityResolution") or {}
    linked_count = int(er.get("linkedAccountCount") or 0)
    link_conf    = float(er.get("maxLinkConfidence") or 0)
    tx_count_1h  = int(tx.get("transactionCount1h") or 0)
    is_vpn       = bool(tx.get("isVpn"))
    is_proxy     = bool(tx.get("isProxy"))
    is_new_device= bool(tx.get("isNewDevice"))
    is_new_ip    = bool(tx.get("isNewIp"))
    is_first_tx  = bool(tx.get("isFirstTransaction"))

    # Amount risk
    if amount > 100_000:
        w = 0.22; raw += w
        signals.append({
            "feature": "transaction_amount", "actual_value": f"{amount:,.0f}",
            "contribution": +w, "direction": "fraud",
            "reason": f"Amount {amount:,.0f} is extremely high (>100,000)",
        })
    elif amount > 50_000:
        w = 0.25; raw += w   # boosted from 0.15
        avg_str = f" vs avg {avg_7d:,.0f}" if avg_7d > 0 else ""
        signals.append({
            "feature": "transaction_amount", "actual_value": f"{amount:,.0f}",
            "contribution": +w, "direction": "fraud",
            "reason": f"Amount {amount:,.0f} is high (>50,000){avg_str}",
        })
    elif amount > 20_000:
        w = 0.15; raw += w   # boosted from 0.06
        avg_str = f" vs avg {avg_7d:,.0f}" if avg_7d > 0 else ""
        signals.append({
            "feature": "transaction_amount", "actual_value": f"{amount:,.0f}",
            "contribution": +w, "direction": "fraud",
            "reason": f"Amount {amount:,.0f} is elevated (>20,000){avg_str}",
        })
    elif amount > 10_000:
        w = 0.08; raw += w   # new tier
        signals.append({
            "feature": "transaction_amount", "actual_value": f"{amount:,.0f}",
            "contribution": +w, "direction": "fraud",
            "reason": f"Amount {amount:,.0f} is above normal range (>10,000)",
        })

    # Missing device
    if not device or device in ("nan", "none", "null", ""):
        w = 0.12; raw += w
        signals.append({
            "feature": "device_id", "actual_value": "UNKNOWN",
            "contribution": +w, "direction": "fraud",
            "reason": "No device ID recorded — transaction source is unverifiable",
        })

    # Missing IP
    if not ip or ip.lower() in ("nan", "none", "null", ""):
        w = 0.08; raw += w
        signals.append({
            "feature": "ip_address", "actual_value": "UNKNOWN",
            "contribution": +w, "direction": "fraud",
            "reason": "No IP address recorded — network origin is unknown",
        })

    # VPN
    if is_vpn:
        w = 0.20; raw += w   # Change 4: boosted from 0.18
        signals.append({
            "feature": "vpn_detected", "actual_value": True,
            "contribution": +w, "direction": "fraud",
            "reason": "Transaction originated from a VPN — identity masking possible",
        })

    # Proxy
    if is_proxy:
        w = 0.16; raw += w   # Change 4: boosted from 0.15
        signals.append({
            "feature": "proxy_detected", "actual_value": True,
            "contribution": +w, "direction": "fraud",
            "reason": "Transaction routed through a proxy server",
        })

    # Geo mismatch
    if ip_country and acc_country and ip_country != acc_country:
        w = 0.22; raw += w   # Change 4: boosted from 0.20
        signals.append({
            "feature": "ip_country",
            "actual_value": f"{ip_country} (account: {acc_country})",
            "contribution": +w, "direction": "fraud",
            "reason": f"IP country ({ip_country}) does not match account country ({acc_country})",
        })

    # Linked accounts
    if linked_count >= 3:
        w = 0.15; raw += w
        signals.append({
            "feature": "linked_accounts", "actual_value": linked_count,
            "contribution": +w, "direction": "fraud",
            "reason": f"Account linked to {linked_count} others via shared device/IP/email — possible syndicate",
        })
    elif linked_count >= 1:
        w = round(0.05 + link_conf * 0.05, 4); raw += w
        signals.append({
            "feature": "linked_accounts", "actual_value": linked_count,
            "contribution": +w, "direction": "fraud",
            "reason": f"Account shares identifiers with {linked_count} other account (confidence: {link_conf:.0%})",
        })

    # First transaction
    if is_first_tx:
        w = 0.14; raw += w   # boosted from 0.06
        signals.append({
            "feature": "first_transaction", "actual_value": True,
            "contribution": +w, "direction": "fraud",
            "reason": "First transaction on this account — no baseline to compare to",
        })

    # New device / New IP — combined signal carries extra weight
    if is_new_device and is_new_ip:
        w = 0.22; raw += w   # Change 4: boosted from 0.20 (combined signal)
        signals.append({
            "feature": "new_device_and_ip",
            "actual_value": f"{device or 'UNKNOWN'} / {ip or 'UNKNOWN'}",
            "contribution": +w, "direction": "fraud",
            "reason": "Both device AND IP are new on this account — strong anonymity indicator",
        })
    elif is_new_device:
        w = 0.12; raw += w   # Change 4: boosted from 0.10
        signals.append({
            "feature": "new_device", "actual_value": device or "UNKNOWN",
            "contribution": +w, "direction": "fraud",
            "reason": "Device not previously seen on this account",
        })
    elif is_new_ip:
        w = 0.10; raw += w   # Change 4: boosted from 0.08
        signals.append({
            "feature": "new_ip", "actual_value": ip or "UNKNOWN",
            "contribution": +w, "direction": "fraud",
            "reason": "IP address not previously associated with this account",
        })

    # Velocity — 1h window (Fix A: tiered — extreme/high/moderate)
    if tx_count_1h >= 10:
        w = 0.35; raw += w   # Fix A: extreme velocity — structuring / burst attack pattern
        signals.append({
            "feature": "transaction_velocity_1h", "actual_value": tx_count_1h,
            "contribution": +w, "direction": "fraud",
            "reason": f"{tx_count_1h} transactions in the last hour — extreme burst velocity (structuring pattern)",
        })
    elif tx_count_1h >= 5:
        w = 0.24; raw += w   # Change 4: boosted from 0.22
        signals.append({
            "feature": "transaction_velocity_1h", "actual_value": tx_count_1h,
            "contribution": +w, "direction": "fraud",
            "reason": f"{tx_count_1h} transactions in the last hour — high velocity",
        })
    elif tx_count_1h >= 3:
        w = 0.14; raw += w   # Change 4: boosted from 0.12
        signals.append({
            "feature": "transaction_velocity_1h", "actual_value": tx_count_1h,
            "contribution": +w, "direction": "fraud",
            "reason": f"{tx_count_1h} transactions in the last hour — elevated velocity",
        })

    # Graph-linked signal — fires from neighbor_count passed in payload (Fix B)
    # This is order-independent: the neighbor_count reflects the account's SENT
    # transaction history in Neo4j, not peer-link timing, so it never returns 0
    # for an account that has already made prior transactions.
    neighbor_count = int(tx.get("_neighbor_count") or 0)
    if neighbor_count >= 3:
        w = 0.10; raw += w   # additional ring bonus on top of base graph_linked
        signals.append({
            "feature": "graph_linked_strong", "actual_value": neighbor_count,
            "contribution": +w, "direction": "fraud",
            "reason": f"Account has {neighbor_count} prior transactions — well-embedded in graph (ring amplifier)",
        })
    elif neighbor_count >= 1:
        w = 0.05; raw += w
        signals.append({
            "feature": "graph_linked", "actual_value": neighbor_count,
            "contribution": +w, "direction": "fraud",
            "reason": f"Account has {neighbor_count} prior transactions in Neo4j graph",
        })

    # Shared-IP ring signal — from worker.py in-memory ip_sender_cache (Fix C)
    # shared_ip_peer_count = how many OTHER sender accounts used the same IP
    shared_ip_peers = int(tx.get("shared_ip_peer_count") or 0)
    if shared_ip_peers >= 2:
        w = 0.10; raw += w   # additional — large IP-sharing ring
        signals.append({
            "feature": "shared_ip_ring_large", "actual_value": shared_ip_peers,
            "contribution": +w, "direction": "fraud",
            "reason": f"{shared_ip_peers} other accounts used this IP — large IP-sharing ring detected",
        })
    if shared_ip_peers >= 1:
        w = 0.20; raw += w
        signals.append({
            "feature": "shared_ip_ring", "actual_value": shared_ip_peers,
            "contribution": +w, "direction": "fraud",
            "reason": f"{shared_ip_peers} other account(s) share this IP — possible syndicate",
        })

    # Shared-device ring signal — from worker.py in-memory device_sender_cache (Fix C)
    shared_dev_peers = int(tx.get("shared_device_peer_count") or 0)
    if shared_dev_peers >= 2:
        w = 0.10; raw += w   # additional — large device-sharing ring
        signals.append({
            "feature": "shared_device_ring_large", "actual_value": shared_dev_peers,
            "contribution": +w, "direction": "fraud",
            "reason": f"{shared_dev_peers} other accounts used this device — large device-sharing ring",
        })
    if shared_dev_peers >= 1:
        w = 0.25; raw += w   # device sharing is higher confidence than IP sharing
        signals.append({
            "feature": "shared_device_ring", "actual_value": shared_dev_peers,
            "contribution": +w, "direction": "fraud",
            "reason": f"{shared_dev_peers} other account(s) share this device — synthetic-identity risk",
        })

    # Amount deviation
    if deviation > 5.0:
        w = 0.15; raw += w
        avg_str = f"avg {avg_7d:,.0f}" if avg_7d > 0 else "account baseline"
        signals.append({
            "feature": "amount_deviation", "actual_value": f"{deviation:.1f}x",
            "contribution": +w, "direction": "fraud",
            "reason": f"Amount is {deviation:.1f}x above {avg_str} — extreme deviation",
        })
    elif deviation > 2.0:
        w = 0.18; raw += w   # boosted from 0.08
        avg_str = f"avg {avg_7d:,.0f}" if avg_7d > 0 else "account baseline"
        signals.append({
            "feature": "amount_deviation", "actual_value": f"{deviation:.1f}x",
            "contribution": +w, "direction": "fraud",
            "reason": f"Amount is {deviation:.1f}x above {avg_str}",
        })
    elif deviation > 1.5:
        w = 0.10; raw += w   # new tier
        avg_str = f"avg {avg_7d:,.0f}" if avg_7d > 0 else "account baseline"
        signals.append({
            "feature": "amount_deviation", "actual_value": f"{deviation:.1f}x",
            "contribution": +w, "direction": "fraud",
            "reason": f"Amount is {deviation:.1f}x above {avg_str} — moderate deviation",
        })

    # Odd-hour transaction
    if _is_odd_hour(tx):
        w = 0.08; raw += w
        signals.append({
            "feature": "transaction_hour", "actual_value": "01:00-05:00 UTC",
            "contribution": +w, "direction": "fraud",
            "reason": "Transaction occurred during suspicious overnight window (1am-5am UTC)",
        })

    return raw, signals


# ── Internal: collect safe/exculpatory signals only ───────────────────────────

def _collect_safe_signals(tx: dict) -> tuple[float, list[dict]]:
    """
    Evaluate all negative (safe/exculpatory) signals with reduced weights (v3).

    FIX 2: Individual weights reduced from v2, further reduced in v4:
      trusted_device:   -0.04  (was -0.08 in v3, -0.12 in v2)
      trusted_ip:       -0.03  (was -0.06 in v3, -0.10 in v2)
      frequent_user>10: -0.05  (was -0.10 in v3, -0.15 in v2)
      frequent_user>5:  -0.05  (unchanged)
      low_amount:       -0.02  (was -0.05 in v3, -0.08 in v2)

    Returns (raw_sum, signals_list).
    The caller is responsible for applying the exculpatory cap before combining
    with the fraud raw sum.
    """
    raw: float    = 0.0
    signals: list = []

    amount       = float(tx.get("amount") or 0)
    deviation    = float(tx.get("amountDeviation") or 0)
    device       = (tx.get("deviceId") or "").strip().lower()
    ip           = (tx.get("ipAddress") or "").strip()
    tx_count_24h = int(tx.get("transactionCount24h") or 0)
    is_new_device= bool(tx.get("isNewDevice"))
    is_new_ip    = bool(tx.get("isNewIp"))

    # Frequent user — known, active account
    if tx_count_24h > 10:
        w = -0.04; raw += w   # Change 3: reduced from -0.05
        signals.append({
            "feature": "account_activity", "actual_value": tx_count_24h,
            "contribution": w, "direction": "safe",
            "reason": f"Account has {tx_count_24h} transactions in 24h — high-frequency legitimate user",
        })
    elif tx_count_24h > 5:
        w = -0.05; raw += w   # unchanged
        signals.append({
            "feature": "account_activity", "actual_value": tx_count_24h,
            "contribution": w, "direction": "safe",
            "reason": f"Account has {tx_count_24h} transactions in 24h — regular user",
        })

    # Known device (present and not flagged as new)
    if device and device not in ("nan", "none", "null", "") and not is_new_device:
        w = -0.03; raw += w   # Change 3: reduced from -0.04
        signals.append({
            "feature": "trusted_device", "actual_value": tx.get("deviceId", ""),
            "contribution": w, "direction": "safe",
            "reason": "Device recognized from previous transactions on this account",
        })

    # Known IP (present and not flagged as new)
    if ip and ip.lower() not in ("nan", "none", "null", "") and not is_new_ip:
        w = -0.02; raw += w   # Change 3: reduced from -0.03
        signals.append({
            "feature": "trusted_ip", "actual_value": ip,
            "contribution": w, "direction": "safe",
            "reason": "IP address matches a previously used address on this account",
        })

    # Low amount — normal range
    if amount > 0 and amount < 5_000 and deviation < 1.5:
        w = -0.02; raw += w   # reduced from -0.05
        signals.append({
            "feature": "low_amount_normal", "actual_value": f"{amount:,.0f}",
            "contribution": w, "direction": "safe",
            "reason": f"Amount {amount:,.0f} is within normal range — no deviation from history",
        })

    return raw, signals


# ── Rule-based scorer (PATH A) ─────────────────────────────────────────────────

def _rule_based_score(tx: dict) -> tuple[float, list[dict]]:
    """
    PATH A: Pure rule-based scorer for new/isolated accounts.

    Fix D: Exculpatory signals are still applied, but the combined pre-graph
    score is floored at 0.0 so safe signals can never cancel ring-fraud bonuses
    (graph_linked, shared_ip_ring, shared_device_ring) that were added in
    _collect_fraud_signals.  The safe signals remain visible in the explanation.
    """
    fraud_raw, fraud_sigs = _collect_fraud_signals(tx)
    safe_raw,  safe_sigs  = _collect_safe_signals(tx)

    # Cap safe contribution so it cannot drive the score negative
    combined_raw = max(fraud_raw + safe_raw, 0.0)   # Fix D: floor at 0
    all_signals  = fraud_sigs + safe_sigs

    score = _sigmoid_normalize(combined_raw)
    score = _apply_score_floor(score, len(fraud_sigs))   # FIX 4
    return score, all_signals


# ── Build tabular feature vector for XGBoost (PATH C) ───────────────────────

def _build_tabular_features(tx: dict) -> "np.ndarray":
    """
    Map MongoDB transaction fields (from transaction.js schema) to the
    52-dim IEEE-CIS feature vector that hybrid_xgb.pkl was trained on.

    IEEE-CIS column → MongoDB field mapping:

    TransactionAmt  → amount
    card1           → transactionCount1h        (velocity proxy)
    card2           → transactionCount24h        (daily velocity proxy)
    card3           → amountDeviation            (deviation from baseline)
    card5           → avgAmount7d                (spending baseline)
    addr1           → linkedAccountCount         (entity resolution signal)
    addr2           → maxLinkConfidence * 100     (link strength, scaled)
    dist1           → geo_mismatch (0 or 1)      (country mismatch binary)

    C1  → isFirstTransaction (0/1)
    C2  → isNewDevice (0/1)
    C3  → isNewIp (0/1)
    C4  → isVpn (0/1)
    C5  → isProxy (0/1)
    C6  → vpn_and_geo_mismatch (0/1)            (compound signal)
    C7  → proxy_and_new_device (0/1)            (compound signal)
    C8  → high_velocity (1 if tx_1h >= 5 else 0)
    C9  → high_amount (1 if amount > 50000 else 0)
    C10 → extreme_deviation (1 if deviation > 3.0 else 0)
    C11 → linked_account_count (raw int)
    C12 → max_link_confidence (raw float)
    C13 → amount / avgAmount7d ratio (capped at 10)
    C14 → transactionCount1h / max(transactionCount24h, 1) ratio

    D1  → transactionCount24h
    D2  → amountDeviation
    D3  → amount / 1000 (scaled)
    D4  → avgAmount7d / 1000 (scaled)
    D5  → linkedAccountCount
    D6  → isVpn (0/1) repeated for D-feature weight
    D7  → isProxy (0/1) repeated
    D8  → geo_mismatch (0/1) repeated
    D9  → isNewDevice (0/1) repeated
    D10 → isNewIp (0/1) repeated

    V1-V20: compound/interaction features using the above signals

    All remaining V slots → 0 (no equivalent data available)
    """
    if _tabular_feature_names is None:
        return np.zeros(52, dtype=np.float32)

    # ── Raw field extraction ──────────────────────────────────────────────────
    amount        = float(tx.get("amount") or 0)
    avg_7d        = float(tx.get("avgAmount7d") or 0)
    deviation     = float(tx.get("amountDeviation") or 0)
    tx_1h         = float(tx.get("transactionCount1h") or 0)
    tx_24h        = float(tx.get("transactionCount24h") or 0)
    is_vpn        = 1.0 if tx.get("isVpn") else 0.0
    is_proxy      = 1.0 if tx.get("isProxy") else 0.0
    is_new_dev    = 1.0 if tx.get("isNewDevice") else 0.0
    is_new_ip     = 1.0 if tx.get("isNewIp") else 0.0
    is_first      = 1.0 if tx.get("isFirstTransaction") else 0.0

    ip_country    = (tx.get("ipCountry") or "").strip()
    acc_country   = (tx.get("accountCountry") or "").strip()
    geo_mismatch  = 1.0 if (ip_country and acc_country and ip_country != acc_country) else 0.0

    er                  = tx.get("entityResolution") or {}
    linked_count        = float(er.get("linkedAccountCount") or 0)
    max_link_conf       = float(er.get("maxLinkConfidence") or 0)

    # ── Derived signals ───────────────────────────────────────────────────────
    amount_ratio         = min(amount / avg_7d, 10.0) if avg_7d > 0 else 1.0
    velocity_ratio       = tx_1h / max(tx_24h, 1.0)
    high_velocity        = 1.0 if tx_1h >= 5 else 0.0
    high_amount          = 1.0 if amount > 50_000 else 0.0
    extreme_deviation    = 1.0 if deviation > 3.0 else 0.0
    vpn_and_geo          = 1.0 if (is_vpn and geo_mismatch) else 0.0
    proxy_and_new_dev    = 1.0 if (is_proxy and is_new_dev) else 0.0

    # ── Build vector in exact tabular_feature_names.pkl order ─────────────────
    # Order: TransactionAmt, card1, card2, card3, card5,
    #        addr1, addr2, dist1,
    #        C1..C14, D1..D10, V1..V20
    vec = np.array([
        # TransactionAmt, card1, card2, card3, card5
        amount,           tx_1h,  tx_24h,  deviation,  avg_7d,
        # addr1,                addr2,                  dist1
        linked_count,     max_link_conf * 100.0,        geo_mismatch,
        # C1..C14
        is_first,           # C1
        is_new_dev,         # C2
        is_new_ip,          # C3
        is_vpn,             # C4
        is_proxy,           # C5
        vpn_and_geo,        # C6
        proxy_and_new_dev,  # C7
        high_velocity,      # C8
        high_amount,        # C9
        extreme_deviation,  # C10
        linked_count,       # C11
        max_link_conf,      # C12
        amount_ratio,       # C13
        velocity_ratio,     # C14
        # D1..D10
        tx_24h,             # D1
        deviation,          # D2
        amount / 1000.0,    # D3
        avg_7d / 1000.0,    # D4
        linked_count,       # D5
        is_vpn,             # D6
        is_proxy,           # D7
        geo_mismatch,       # D8
        is_new_dev,         # D9
        is_new_ip,          # D10
        # V1..V20 — interaction/compound features
        is_vpn * geo_mismatch,              # V1
        is_proxy * is_new_dev,              # V2
        is_vpn * is_proxy,                  # V3
        high_velocity * high_amount,        # V4
        extreme_deviation * high_amount,    # V5
        geo_mismatch * high_velocity,       # V6
        is_first * high_amount,             # V7
        linked_count * max_link_conf,       # V8
        tx_1h * deviation,                  # V9
        amount_ratio * geo_mismatch,        # V10
        is_vpn * high_amount,               # V11
        is_proxy * geo_mismatch,            # V12
        is_new_dev * is_new_ip,             # V13
        high_velocity * is_vpn,             # V14
        linked_count * high_amount,         # V15
        is_first * is_new_dev,              # V16
        deviation * tx_1h,                  # V17
        geo_mismatch * is_proxy,            # V18
        extreme_deviation * linked_count,   # V19
        velocity_ratio * deviation,         # V20
    ], dtype=np.float32)

    # Safety check: ensure exactly 52 features
    assert len(vec) == 52, f"Feature vector length mismatch: {len(vec)} != 52"
    return vec



# ── Tabular scorer (PATH B — and PATH C fallback when GNN unavailable) ────────

def _tabular_score(
    tx: dict,
    peer_count: int,
    path: str = "xgboost",
) -> tuple[float, list[dict], float]:
    """
    Tabular scorer used by PATH B (always) and PATH C (when GNN is unavailable).

    peer_count: number of peer-linked accounts — a FRAUD SIGNAL, not transaction
    volume. Used to determine graph adjustment tier and exculpatory cap.

    FIX 2+3: Exculpatory signals are capped before being combined with fraud raw.
    FIX 4:   Score floor applied after all adjustments.

    Args:
        tx:         Transaction document.
        peer_count: Peer-linked account count (fraud signal, from Neo4j).
        path:       "xgboost" (PATH B) or "gnn_hybrid_fallback" (PATH C fallback).

    Returns:
        (score, signals, confidence)
    """
    fraud_raw, fraud_sigs = _collect_fraud_signals(tx)
    safe_raw,  safe_sigs  = _collect_safe_signals(tx)

    # Apply peer-aware exculpatory cap
    cap = _exculpatory_cap(peer_count, path)
    capped_safe_raw = max(safe_raw, cap)   # safe_raw is negative; cap is the floor

    # Scale safe signal contributions to match the cap so explanation sums correctly
    if safe_raw < cap and safe_raw != 0:
        scale = capped_safe_raw / safe_raw
        safe_sigs = [
            {**s, "contribution": round(s["contribution"] * scale, 4)}
            for s in safe_sigs
        ]

    # Peer-graph adjustment (reduced tiers — nudges, doesn't erase fraud signal)
    adj = _graph_adjustment(peer_count)

    # Cold-start penalty: brand-new account + high amount is extra suspicious
    amount = float(tx.get("amount") or 0)
    cold_penalty = 0.0
    if peer_count == 0 and amount > 50_000:
        cold_penalty = 0.10
        fraud_sigs.append({
            "feature": "cold_start_high_amount",
            "actual_value": f"{amount:,.0f} (0 peers)",
            "contribution": +cold_penalty, "direction": "fraud",
            "reason": f"No peer-linked accounts and high amount {amount:,.0f} — elevated cold-start risk",
        })

    combined_raw = fraud_raw + capped_safe_raw + adj + cold_penalty
    score = _sigmoid_normalize(combined_raw)
    score = _apply_score_floor(score, len(fraud_sigs))   # FIX 4

    # Build peer-graph adjustment signal entry (for explanation)
    adj_signals: list[dict] = []
    if adj != 0.0:
        adj_signals.append({
            "feature": "peer_link_count",
            "actual_value": peer_count,
            "contribution": round(adj, 4),
            "direction": "safe" if adj < 0 else "fraud",
            "reason": (
                f"Account has {peer_count} peer-linked accounts — "
                + ("high sharing; syndicate risk" if peer_count > 15
                   else "some cross-account sharing; score adjusted"
                   if adj < 0 else "no peer links; no trust adjustment")
            ),
        })

    all_signals = fraud_sigs + safe_sigs + adj_signals

    # Confidence scales with peer connectivity richness
    if peer_count <= 0:
        confidence = 0.45
    elif peer_count <= 2:
        confidence = 0.55
    elif peer_count <= 5:
        confidence = 0.65
    elif peer_count <= 10:
        confidence = 0.72
    elif peer_count <= 15:
        confidence = 0.78
    else:
        confidence = 0.84

    return score, all_signals, confidence


# ── Main routing function ──────────────────────────────────────────────────────

def route(
    transaction: dict,
    routing_count: int,
    peer_count: int,
    subgraph,
) -> dict[str, Any]:
    """
    Route a MongoDB transaction to the correct scoring path.

    Args:
        transaction:   Full MongoDB transaction document.
        routing_count: Prior SENT-transaction count (from get_neighbor_count).
                       Used ONLY to select PATH A / B / C.
                       -1 = Neo4j error → routes to rule_based (PATH A).
        peer_count:    Accounts sharing device/IP/email/phone with this account
                       (from get_peer_link_count).  This is a FRAUD SIGNAL and
                       is the value passed to all scoring helpers.
        subgraph:      networkx.Graph of the 2-hop account neighbourhood
                       (from get_account_subgraph).  Used by PATH C GNN.

    Returns a result dict ready to POST to Node.js POST /api/ml/result.
    """
    tx_id      = str(transaction.get("_id", ""))
    account_id = str(transaction.get("senderId", ""))

    logger.info(
        f"[scorer] Routing tx={tx_id} account={account_id} "
        f"routing_count={routing_count} peer_count={peer_count}"
    )

    # ── PATH A: Rule-based ─────────────────────────────────────────────────────
    if routing_count <= _THRESH_RULE:
        score, signals = _rule_based_score(transaction)
        confidence = round(0.50 + (0.15 if score > 0.5 else 0.0), 4)
        method     = "rule_based"
        reason     = "Neo4j error" if routing_count < 0 else "no prior transactions"

    # ── PATH B: XGBoost tabular + peer-graph signal ────────────────────────────
    elif routing_count < _THRESH_XGB:
        score, signals, confidence = _tabular_score(
            transaction, peer_count, path="xgboost"
        )
        method = "xgboost"
        reason = f"{routing_count} prior transactions (< {_THRESH_XGB})"

    # ── PATH C: GNN hybrid ─────────────────────────────────────────────────────
    # Runs the real GraphSAGE GNN on the account's 2-hop Neo4j subgraph to
    # produce a 64-dim embedding.  That embedding is concatenated with 52
    # tabular features → 116-dim input to hybrid_xgb.pkl.
    #
    # If the GNN model, XGBoost model, or feature-name list failed to load at
    # startup, PATH C falls back to _tabular_score() with a tighter peer-aware
    # exculpatory cap (same math as PATH B but stricter cap).
    else:
        gnn_active = (
            _generate_embedding is not None
            and _hybrid_xgb is not None
            and _tabular_feature_names is not None
        )

        if gnn_active:
            try:
                # 1. GNN embedding (64-dim) from account subgraph
                tx_node_id = f"T_{tx_id}"
                embedding  = _generate_embedding(subgraph, tx_node_id)   # np.ndarray (64,)

                # 2. Tabular features (52-dim) in training column order
                tabular  = _build_tabular_features(transaction)          # np.ndarray (52,)

                # 3. Concatenate → 116-dim; XGBoost predicts fraud probability
                features = np.concatenate([tabular, embedding])          # shape (116,)
                score    = round(float(_hybrid_xgb.predict_proba([features])[0][1]), 4)

                # 4. Collect rule signals for analyst explanation panel.
                #    These do NOT influence the XGBoost score.
                fraud_raw, fraud_sigs = _collect_fraud_signals(transaction)
                safe_raw,  safe_sigs  = _collect_safe_signals(transaction)
                cap = _exculpatory_cap(peer_count, "gnn_hybrid_fallback")
                capped_safe_raw = max(safe_raw, cap)
                if safe_raw < cap and safe_raw != 0:
                    scale = capped_safe_raw / safe_raw
                    safe_sigs = [
                        {**s, "contribution": round(s["contribution"] * scale, 4)}
                        for s in safe_sigs
                    ]
                signals = fraud_sigs + safe_sigs
                score   = _apply_score_floor(score, len(fraud_sigs))

                # Confidence reflects GNN + XGBoost joint certainty
                if peer_count <= 0:
                    confidence = 0.70
                elif peer_count <= 2:
                    confidence = 0.76
                elif peer_count <= 5:
                    confidence = 0.82
                else:
                    confidence = 0.88
                confidence = round(min(confidence, 0.90), 4)

                method = "gnn_hybrid_fallback"
                reason = (
                    f"{routing_count} prior transactions (>= {_THRESH_XGB}); "
                    "GNN embedding active"
                )

            except Exception as _gnn_err:
                logger.warning(
                    f"[scorer] GNN inference failed tx={tx_id}: {_gnn_err} "
                    "— falling back to tabular scorer"
                )
                gnn_active = False  # fall through to tabular fallback

        if not gnn_active:
            # Tabular fallback: identical math to PATH B but with tighter cap
            score, signals, confidence = _tabular_score(
                transaction, peer_count, path="gnn_hybrid_fallback"
            )
            confidence = round(min(confidence + 0.05, 0.90), 4)
            method = "gnn_hybrid_fallback"
            reason = (
                f"{routing_count} prior transactions (>= {_THRESH_XGB}); "
                "GNN unavailable — tabular fallback"
            )

    # ── Confidence dampening (lighter formula — see _effective_score) ──────────
    eff_score  = _effective_score(score, confidence)
    risk_level = _classify_risk(score)   # Change 4: compare RAW score to thresholds

    # ── Build rich explanation ─────────────────────────────────────────────────
    explanation = _build_explanation(
        signals=signals,
        fraud_score=score,
        effective=eff_score,
    )

    logger.info(
        f"[scorer] tx={tx_id} account={account_id} "
        f"routing={routing_count} peers={peer_count} ({reason}) "
        f"-> method={method} raw={score:.4f} eff={eff_score:.4f} "
        f"risk={risk_level} conf={confidence:.4f}"
    )

    return {
        "transaction_id":   tx_id,
        "account_id":       account_id,
        "score":            score,
        "effective_score":  eff_score,
        "risk_level":       risk_level,
        "method":           method,
        "confidence":       confidence,
        "shap_values":      explanation,
        "suspicious_paths": [],
    }
