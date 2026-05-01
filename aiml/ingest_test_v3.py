# -*- coding: utf-8 -*-
"""
ingest_test_v3.py
POST every row of fraud_test_v3.csv to the backend transaction API,
then poll MongoDB for the scored results and print a comparison table.

Run from: aiml/   (.venv\Scripts\python.exe ingest_test_v3.py)
Requires: backend (npm run dev) + Python worker (python main.py) both running.
"""

import asyncio
import csv
import sys
import os
from pathlib import Path

import httpx
from dotenv import load_dotenv

# Force UTF-8 output so emojis don't crash on Windows cp1252
sys.stdout.reconfigure(encoding="utf-8", errors="replace")

load_dotenv()

BACKEND_URL   = os.getenv("BACKEND_URL", "http://localhost:5000")
CSV_PATH      = Path(__file__).parent / "fraud_test_v3.csv"
POST_TIMEOUT  = 15.0
POLL_WAIT_S   = 20      # seconds to wait before polling results
POLL_ATTEMPTS = 12      # poll up to 12 x 5s = 60s per transaction
POLL_SLEEP_S  = 5


# ── Type helpers ──────────────────────────────────────────────────────────────

def coerce_bool(val: str) -> bool:
    return str(val).strip().lower() in ("true", "1", "yes")


def coerce_float(val: str):
    try:
        return float(val.strip())
    except (ValueError, AttributeError):
        return None

# ── HTTP helpers ──────────────────────────────────────────────────────────────

async def post_transaction(client: httpx.AsyncClient, row: dict) -> dict:
    payload = {
        "senderId":         row["senderId"].strip(),
        "receiverId":       row["receiverId"].strip(),
        "amount":           coerce_float(row.get("amount", "0")),
        "deviceId":         row.get("deviceId", "").strip() or None,
        "ipAddress":        row.get("ipAddress", "").strip() or None,
        "email":            row.get("email", "").strip() or None,
        "phone":            row.get("phone", "").strip() or None,
        "isVpn":            coerce_bool(row.get("isVpn", "false")),
        "isProxy":          coerce_bool(row.get("isProxy", "false")),
        "ipCountry":        row.get("ipCountry", "").strip() or None,
        "accountCountry":   row.get("accountCountry", "").strip() or None,
        "currency":         row.get("currency", "").strip() or None,
        "merchantCategory": row.get("merchantCategory", "").strip() or None,
    }

    resp = await client.post(
        f"{BACKEND_URL}/api/transactions",
        json=payload,
        timeout=POST_TIMEOUT,
    )
    resp.raise_for_status()
    body = resp.json()

    # Extract the transaction _id from various possible response shapes
    tx_id = (
        (body.get("data") or {}).get("_id")
        or body.get("_id")
        or body.get("id")
        or body.get("transactionId")
    )
    return {"senderId": payload["senderId"], "txId": str(tx_id) if tx_id else None}


async def poll_result(client: httpx.AsyncClient, tx_id: str) -> dict | None:
    """Poll until the transaction is ML-scored or we give up."""
    for _ in range(POLL_ATTEMPTS):
        try:
            resp = await client.get(
                f"{BACKEND_URL}/api/transactions/{tx_id}",
                timeout=10.0,
            )
            if resp.status_code == 200:
                body = resp.json()
                tx = body.get("data") or body
                if tx.get("mlProcessed") or float(tx.get("fraudScore", 0)) > 0:
                    return tx
        except Exception:
            pass
        await asyncio.sleep(POLL_SLEEP_S)
    return None


# ── Main ──────────────────────────────────────────────────────────────────────

async def main():
    if not CSV_PATH.exists():
        print(f"[ERROR] CSV not found at: {CSV_PATH}")
        return

    rows = []
    with open(CSV_PATH, newline="", encoding="utf-8") as f:
        for row in csv.DictReader(f):
            rows.append(row)

    print(f"\n=== Ingesting {len(rows)} transactions from {CSV_PATH.name} ===")
    print(f"    Backend: {BACKEND_URL}\n")

    submitted = []
    async with httpx.AsyncClient() as client:
        # Quick connectivity check
        try:
            await client.get(f"{BACKEND_URL}/api/health", timeout=5.0)
        except Exception:
            try:
                await client.get(f"{BACKEND_URL}/", timeout=5.0)
            except Exception as e:
                print(f"[WARN] Backend may be unreachable: {e}")
                print("       Proceeding anyway — check that 'npm run dev' is running.\n")

        for row in rows:
            sender = row["senderId"].strip()
            try:
                result = await post_transaction(client, row)
                submitted.append(result)
                tag = "(ring )" if any(x in sender for x in ("r1","r2")) else "(clean)"
                print(f"  [OK ] {sender:<15} {tag} -> txId={result['txId']}")
            except Exception as e:
                print(f"  [ERR] {sender:<15}       -> {e}")
                submitted.append({"senderId": sender, "txId": None})
            await asyncio.sleep(0.4)

    print(f"\n[...] Waiting {POLL_WAIT_S}s for ML worker to process queue ...\n")
    await asyncio.sleep(POLL_WAIT_S)

    # ── Poll for scored results ───────────────────────────────────────────────
    print("=" * 72)
    print(f"{'Account':<15} {'Type':<7} {'Score':>7} {'Risk':<10} {'Method'}")
    print("-" * 72)

    ring_scores  = []
    clean_scores = []

    async with httpx.AsyncClient() as client:
        for entry in submitted:
            if not entry["txId"]:
                print(f"  {entry['senderId']:<15}  [no txId — POST failed]")
                continue

            tx = await poll_result(client, entry["txId"])
            if not tx:
                print(f"  {entry['senderId']:<15}  [not scored after {POLL_ATTEMPTS*POLL_SLEEP_S}s]")
                continue

            score  = float(tx.get("fraudScore", 0.0))
            risk   = tx.get("riskLevel", "?")
            method = tx.get("scoringMethod") or tx.get("methodUsed") or "?"
            sender = tx.get("senderId", entry["senderId"])
            is_ring = any(x in sender for x in ("r1a","r1b","r1c","r1d","r1e","r2a","r2b","r2c"))
            tag    = "RING  " if is_ring else "clean "

            print(f"  {sender:<15} {tag} {score:>7.4f}  {risk:<10} {method}")

            if is_ring:
                ring_scores.append(score)
            else:
                clean_scores.append(score)

    # ── Summary ───────────────────────────────────────────────────────────────
    print("=" * 72)
    print("\n=== SUMMARY ===")
    if ring_scores:
        print(f"  Ring  ({len(ring_scores):>2} accounts): "
              f"avg={sum(ring_scores)/len(ring_scores):.4f}  "
              f"min={min(ring_scores):.4f}  max={max(ring_scores):.4f}")
    if clean_scores:
        print(f"  Clean ({len(clean_scores):>2} accounts): "
              f"avg={sum(clean_scores)/len(clean_scores):.4f}  "
              f"min={min(clean_scores):.4f}  max={max(clean_scores):.4f}")

    if ring_scores and clean_scores:
        ring_avg  = sum(ring_scores)  / len(ring_scores)
        clean_avg = sum(clean_scores) / len(clean_scores)
        print()
        print(f"  Ring avg > Clean avg    : {'PASS' if ring_avg > clean_avg else 'FAIL'}")
        print(f"  All clean scores < 0.30 : {'PASS' if all(s < 0.30 for s in clean_scores) else 'FAIL (some >= 0.30)'}")
    print()


if __name__ == "__main__":
    asyncio.run(main())
