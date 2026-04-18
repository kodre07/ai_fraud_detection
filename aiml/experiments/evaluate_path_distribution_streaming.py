import time
import numpy as np
import pandas as pd
import networkx as nx

from sklearn.model_selection import train_test_split
from sklearn.metrics import f1_score, average_precision_score

# import module (not just function) so we can reset its global graph
import src.hybrid.process as hp

THRESHOLD = 0.05
MAX_TEST_SAMPLES = 3000  # increase later if needed


def make_tx_from_row(row):
    tx = row.to_dict()
    txid = int(row["TransactionID"])
    tx["TransactionID"] = txid
    tx["card1"] = row.get("card1", "unknown")

    # map IEEE columns to your current process.py expectations
    dev = row.get("DeviceInfo", "nan")
    mail = row.get("P_emaildomain", "nan")

    # Avoid giant missing-value hubs that collapse routing into Path C.
    tx["device"] = f"missing_dev_{txid}" if pd.isna(dev) else str(dev)
    tx["email"] = f"missing_email_{txid}" if pd.isna(mail) else str(mail)

    # Prevent label leakage at inference time.
    tx.pop("isFraud", None)
    return tx


def infer_path(result):
    # matches your current response patterns
    if result.get("top_features") == ["Rule-based scoring"]:
        return "A"
    if result.get("graph_insights") == ["Limited graph information"]:
        return "B"
    return "C"


def safe_f1(y_true, y_pred):
    if len(y_true) == 0:
        return 0.0
    return f1_score(y_true, y_pred, zero_division=0)

def safe_pr_auc(y_true, y_score):
    if len(y_true) == 0:
        return 0.0
    # PR-AUC is undefined when only one class is present in the slice.
    if len(set(y_true)) < 2:
        return 0.0
    return average_precision_score(y_true, y_score)


def main():
    # 1) Load source data
    df = pd.read_csv("data/train_transaction.csv")
    if "isFraud" not in df.columns:
        raise ValueError("isFraud not found in train_transaction.csv")

    # 2) same split protocol you used in results (stratified 80/20)
    idx_train, idx_test = train_test_split(
        np.arange(len(df)),
        test_size=0.2,
        stratify=df["isFraud"].values,
        random_state=42
    )

    train_df = df.iloc[idx_train].sort_values("TransactionDT").reset_index(drop=True)
    test_df = df.iloc[idx_test].sort_values("TransactionDT").reset_index(drop=True)

    if MAX_TEST_SAMPLES and len(test_df) > MAX_TEST_SAMPLES:
        test_df = test_df.iloc[:MAX_TEST_SAMPLES].copy()

    # 3) CRITICAL: reset graph so cold-start can exist
    hp.graph = nx.Graph()

    # 4) Warm-up graph with a slice of train stream (optional but realistic)
    warmup_n = min(200, len(train_df))
    print(f"Warming graph with {warmup_n} train transactions...")
    for _, row in train_df.iloc[:warmup_n].iterrows():
        hp.process_transaction(make_tx_from_row(row))

    # 5) Evaluate test stream
    stats = {
        "A": {"y_true": [], "y_pred": [], "y_score": [], "lat_ms": []},
        "B": {"y_true": [], "y_pred": [], "y_score": [], "lat_ms": []},
        "C": {"y_true": [], "y_pred": [], "y_score": [], "lat_ms": []},
    }

    print(f"Evaluating {len(test_df)} test transactions...")
    for i, row in test_df.iterrows():
        tx = make_tx_from_row(row)

        t0 = time.perf_counter()
        result = hp.process_transaction(tx)
        lat_ms = (time.perf_counter() - t0) * 1000

        path = infer_path(result)
        score = float(result.get("fraud_score", 0.0))
        pred = 1 if score >= THRESHOLD else 0
        true = int(row["isFraud"])

        stats[path]["y_true"].append(true)
        stats[path]["y_pred"].append(pred)
        stats[path]["y_score"].append(score)
        stats[path]["lat_ms"].append(lat_ms)

        if (i + 1) % 200 == 0:
            print(f"Processed {i + 1}/{len(test_df)}")

    # 6) Report
    total = len(test_df)
    print("\n===== PATH DISTRIBUTION RESULTS =====")
    rows = []
    for p, name in [("A", "A — Rule-based"), ("B", "B — XGBoost"), ("C", "C — GNN Hybrid")]:
        n = len(stats[p]["y_true"])
        pct = 100.0 * n / total if total else 0.0
        f1 = safe_f1(stats[p]["y_true"], stats[p]["y_pred"])
        lat = float(np.mean(stats[p]["lat_ms"])) if n else 0.0
        pr_auc = safe_pr_auc(stats[p]["y_true"], stats[p]["y_score"])

        print(name)
        print(f"  % Transactions: {pct:.2f}%")
        print(f"  Avg. F1       : {f1:.4f}")
        print(f"  PR-AUC        : {pr_auc:.4f}")
        print(f"  Avg. Latency  : {lat:.2f} ms")
        rows.append((name, pct, f1, pr_auc, lat))

    print("\n===== LATEX ROWS =====")
    for name, pct, f1, pr_auc, lat in rows:
        print(f"{name} & {pct:.2f}\\% & {f1:.4f} & {lat:.2f}\\,ms \\\\ % PR-AUC={pr_auc:.4f}")


if __name__ == "__main__":
    main()