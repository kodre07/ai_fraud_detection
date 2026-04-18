# evaluate_path_distribution.py
import time
import numpy as np
import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.metrics import f1_score

from src.hybrid.process import process_transaction


THRESHOLD = 0.5
MAX_TEST_SAMPLES = 2000   # reduce if runtime is too high


def make_tx_from_row(row):
    """
    Build transaction dict from IEEE-CIS row.
    Includes all row fields so your tabular builder can pick what it needs.
    """
    tx = row.to_dict()

    # Keep labels for evaluation (if present)
    if "isFraud" in row:
        tx["isFraud"] = int(row["isFraud"])

    # Ensure required keys used by your graph update logic exist
    tx["TransactionID"] = int(row["TransactionID"])
    tx["card1"] = row.get("card1", "unknown")

    # Your current graph code expects these keys:
    # device/email may not exist in IEEE raw table; map from nearest available cols
    device_candidate = row.get("DeviceInfo", "nan")
    email_candidate = row.get("P_emaildomain", "nan")

    tx["device"] = "nan" if pd.isna(device_candidate) else str(device_candidate)
    tx["email"] = "nan" if pd.isna(email_candidate) else str(email_candidate)

    return tx


def route_name_from_result(result):
    """
    Infer route from result payload shape.
    - Path A returns top_features == ['Rule-based scoring']
    - Path B returns graph_insights == ['Limited graph information']
    - else Path C
    """
    top_features = result.get("top_features", [])
    graph_insights = result.get("graph_insights", [])

    if top_features == ["Rule-based scoring"]:
        return "A"
    if graph_insights == ["Limited graph information"]:
        return "B"
    return "C"


def safe_f1(y_true, y_pred):
    if len(y_true) == 0:
        return 0.0
    # zero_division=0 equivalent behavior
    return f1_score(y_true, y_pred, zero_division=0)


def main():
    print("Loading train_transaction.csv ...")
    df = pd.read_csv("data/train_transaction.csv")

    # Keep only rows with labels
    if "isFraud" not in df.columns:
        raise ValueError("isFraud column not found in data/train_transaction.csv")

    # Match your current evaluation protocol (stratified 80/20)
    idx_train, idx_test = train_test_split(
        np.arange(len(df)),
        test_size=0.2,
        stratify=df["isFraud"].values,
        random_state=42
    )

    test_df = df.iloc[idx_test].reset_index(drop=True)

    # Optional cap for speed
    if MAX_TEST_SAMPLES and len(test_df) > MAX_TEST_SAMPLES:
        test_df = test_df.iloc[:MAX_TEST_SAMPLES].copy()

    print(f"Evaluating {len(test_df)} test transactions ...")

    stats = {
        "A": {"y_true": [], "y_pred": [], "lat_ms": []},
        "B": {"y_true": [], "y_pred": [], "lat_ms": []},
        "C": {"y_true": [], "y_pred": [], "lat_ms": []},
    }

    for i, row in test_df.iterrows():
        tx = make_tx_from_row(row)

        t0 = time.perf_counter()
        result = process_transaction(tx)
        dt_ms = (time.perf_counter() - t0) * 1000.0

        path = route_name_from_result(result)
        score = float(result.get("fraud_score", 0.0))
        pred = 1 if score >= THRESHOLD else 0
        true = int(row["isFraud"])

        stats[path]["y_true"].append(true)
        stats[path]["y_pred"].append(pred)
        stats[path]["lat_ms"].append(dt_ms)

        if (i + 1) % 200 == 0:
            print(f"Processed {i + 1}/{len(test_df)}")

    total = len(test_df)
    print("\n===== PATH DISTRIBUTION RESULTS =====")

    for path, label in [("A", "A — Rule-based"), ("B", "B — XGBoost"), ("C", "C — GNN Hybrid")]:
        n = len(stats[path]["y_true"])
        pct = (100.0 * n / total) if total > 0 else 0.0
        f1 = safe_f1(stats[path]["y_true"], stats[path]["y_pred"])
        lat = float(np.mean(stats[path]["lat_ms"])) if n > 0 else 0.0

        print(f"{label}")
        print(f"  % Transactions: {pct:.2f}%")
        print(f"  Avg. F1       : {f1:.4f}")
        print(f"  Avg. Latency  : {lat:.2f} ms")

    print("\n===== LATEX ROWS =====")
    for path, latex_name in [("A", "A --- Rule-based"), ("B", "B --- XGBoost"), ("C", "C --- GNN Hybrid")]:
        n = len(stats[path]["y_true"])
        pct = (100.0 * n / total) if total > 0 else 0.0
        f1 = safe_f1(stats[path]["y_true"], stats[path]["y_pred"])
        lat = float(np.mean(stats[path]["lat_ms"])) if n > 0 else 0.0

        print(f"{latex_name} & {pct:.2f}\\% & {f1:.4f} & {lat:.2f}\\,ms \\\\")


if __name__ == "__main__":
    main()