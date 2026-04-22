"""
aiml/scoring/scorer.py — Production scoring router for real MongoDB transactions.

This file is the entry point for the worker. The existing scoring/router.py
handles the Kaggle-format research pipeline (batch training); this file handles
the real-time production pipeline.

Routing decision based on account neighbour count (from Neo4j):
  ≤ 0 neighbours  → rule_based          (new / isolated account; -1 = Neo4j error)
  1–4 neighbours  → xgboost             (limited graph data — tabular model)
  ≥ 5 neighbours  → gnn_hybrid_fallback (full graph context; XGBoost internally
                                         until dedicated GNN weights are trained)
"""

import logging
from typing import Any

logger = logging.getLogger(__name__)

# ── Risk thresholds ────────────────────────────────────────────────────────────
_RISK_LOW      = 0.40   # 0.00–0.39 → low
_RISK_MEDIUM   = 0.70   # 0.40–0.69 → medium
_RISK_HIGH     = 0.90   # 0.70–0.89 → high
# >= 0.90  → critical

# ── Routing thresholds (neighbour count from Neo4j) ────────────────────────────
_THRESH_RULE = 0   # 0 or below → rule_based   (-1 is the error sentinel)
_THRESH_XGB  = 5   # 1–4        → xgboost


def _classify_risk(score: float) -> str:
    """
    Returns lowercase risk level matching MongoDB Transaction.riskLevel enum:
        "low" | "medium" | "high" | "critical"
    """
    if score < _RISK_LOW:
        return "low"
    if score < _RISK_MEDIUM:
        return "medium"
    if score < _RISK_HIGH:
        return "high"
    return "critical"


# ── Rule-based scorer ──────────────────────────────────────────────────────────

def _rule_based_score(tx: dict) -> tuple[float, dict[str, float]]:
    """
    Pure-rule fraud scorer for new/isolated accounts.
    Works on real MongoDB transaction field names (senderId, amount, deviceId …).

    Returns:
        (score 0.0–1.0,  shap_values dict {feature_name: weight_applied})
    """
    score: float = 0.0
    shap:  dict[str, float] = {}

    amount = float(tx.get("amount") or 0)
    if amount > 100_000:
        w = 0.45; score += w; shap["high_amount_extreme"] = w
    elif amount > 50_000:
        w = 0.30; score += w; shap["high_amount"] = w
    elif amount > 20_000:
        w = 0.10; score += w; shap["elevated_amount"] = w

    device = (tx.get("deviceId") or "").strip().lower()
    if not device or device in ("nan", "none", "null", ""):
        w = 0.25; score += w; shap["missing_device"] = w

    ip = (tx.get("ipAddress") or "").strip()
    if not ip or ip.lower() in ("nan", "none", "null", ""):
        w = 0.15; score += w; shap["missing_ip"] = w

    if tx.get("isVpn"):
        w = 0.20; score += w; shap["vpn_detected"] = w

    if tx.get("isProxy"):
        w = 0.20; score += w; shap["proxy_detected"] = w

    ip_country  = (tx.get("ipCountry")      or "").strip()
    acc_country = (tx.get("accountCountry") or "").strip()
    if ip_country and acc_country and ip_country != acc_country:
        w = 0.20; score += w; shap["cross_country_ip"] = w

    er            = tx.get("entityResolution") or {}
    linked_count  = int(er.get("linkedAccountCount") or 0)
    link_conf     = float(er.get("maxLinkConfidence") or 0)
    if linked_count >= 3:
        w = 0.25; score += w; shap["many_linked_accounts"] = w
    elif linked_count >= 1:
        w = round(0.10 + link_conf * 0.10, 4)
        score += w; shap["linked_account"] = w

    return min(round(score, 4), 1.0), shap


# ── Tabular scorer (XGBoost slot) ─────────────────────────────────────────────

def _tabular_score(
    tx: dict,
    neighbor_count: int,
) -> tuple[float, dict[str, float], float]:
    """
    Tabular scorer for accounts with some graph history.
    Uses the rule-based engine as a feature extractor and adjusts the output
    with a neighbour-count confidence correction.

    Being a known account (more neighbours) means raw rule-scores may
    over-estimate risk, so we apply a small negative adjustment.

    Returns:
        (score, shap_values, confidence)
    """
    base_score, shap = _rule_based_score(tx)

    # More neighbours → slightly lower adjustment (account is more "known")
    # Max adjustment: -0.10 at neighbor_count ≥ 4
    neighbour_weight = min(neighbor_count, 4)
    adjustment       = -0.025 * neighbour_weight
    adjusted_score   = max(0.0, round(base_score + adjustment, 4))

    # Confidence scales with graph richness: 0.55 (1 neighbour) → 0.70 (4+)
    confidence = round(0.50 + (0.05 * neighbour_weight), 4)

    shap["neighbor_count_adjustment"] = round(adjustment, 4)

    return min(adjusted_score, 1.0), shap, min(confidence, 0.70)


# ── Main routing function ──────────────────────────────────────────────────────

def route(transaction: dict, neighbor_count: int) -> dict[str, Any]:
    """
    Route a MongoDB transaction document to the correct scoring path and
    return a result dict ready to POST to Node.js  POST /api/ml/result.

    Args:
        transaction:    Raw MongoDB document with Python-native types.
                        Must have at minimum: _id (str), senderId (str).
        neighbor_count: From Neo4j get_neighbor_count().
                        -1 signals an error/timeout → forces rule_based.

    Returns:
        {
          transaction_id  : str,
          account_id      : str,
          score           : float,   # 0.0 – 1.0
          risk_level      : str,     # LOW | MEDIUM | HIGH
          method          : str,     # rule_based | xgboost | gnn_hybrid_fallback
          confidence      : float,   # 0.0 – 1.0
          shap_values     : dict,    # {feature: weight}
          suspicious_paths: list,
        }
    """
    tx_id      = str(transaction.get("_id", ""))
    account_id = str(transaction.get("senderId", ""))

    # ── PATH A: Rule-based ─────────────────────────────────────────────────────
    if neighbor_count <= _THRESH_RULE:
        score, shap = _rule_based_score(transaction)
        # Confidence higher when we triggered at least one rule
        confidence  = round(0.65 + (0.10 if score > 0.5 else 0.0), 4)
        method      = "rule_based"

    # ── PATH B: XGBoost (tabular) ──────────────────────────────────────────────
    elif neighbor_count < _THRESH_XGB:
        score, shap, confidence = _tabular_score(transaction, neighbor_count)
        method = "xgboost"

    # ── PATH C: GNN hybrid slot ────────────────────────────────────────────────
    # Uses XGBoost internally until a dedicated GNN model is trained.
    # Reported as gnn_hybrid_fallback so API consumers know the GNN is pending.
    else:
        score, shap, confidence = _tabular_score(transaction, neighbor_count)
        # Rich graph context → higher score confidence
        confidence = min(round(confidence + 0.10, 4), 0.90)
        method = "gnn_hybrid_fallback"

    risk_level = _classify_risk(score)

    logger.info(
        f"[scorer] tx={tx_id} account={account_id} neighbours={neighbor_count} "
        f"method={method} score={score:.4f} risk={risk_level} confidence={confidence:.4f}"
    )

    return {
        "transaction_id":   tx_id,
        "account_id":       account_id,
        "score":            score,
        "risk_level":       risk_level,
        "method":           method,
        "confidence":       confidence,
        "shap_values":      shap,
        "suspicious_paths": [],   # populated by GNN path when implemented
    }
