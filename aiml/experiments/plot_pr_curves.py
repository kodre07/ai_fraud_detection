# plot_pr_curves.py
import numpy as np
import pickle
import joblib
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt

from sklearn.model_selection import train_test_split
from sklearn.metrics import precision_recall_curve, average_precision_score
from xgboost import XGBClassifier


def main():
    # -----------------------------
    # 1) Load data
    # -----------------------------
    X_full = np.load("data/X_final.npy")   # proposed full model features
    X_tab = np.load("data/X_tab.npy")      # tabular-only baseline features
    y = np.load("data/y.npy")

    # Keep split protocol consistent across all models
    idx = np.arange(len(y))
    idx_train, idx_test, y_train, y_test = train_test_split(
        idx, y, test_size=0.2, stratify=y, random_state=42
    )

    X_full_train, X_full_test = X_full[idx_train], X_full[idx_test]
    X_tab_train, X_tab_test = X_tab[idx_train], X_tab[idx_test]

    # -----------------------------
    # 2) Proposed (full) model
    # -----------------------------
    with open("models/hybrid_xgb.pkl", "rb") as f:
        full_model = pickle.load(f)

    y_score_full = full_model.predict_proba(X_full_test)[:, 1]

    # -----------------------------
    # 3) XGBoost tabular baseline
    # -----------------------------
    pos = float((y_train == 1).sum())
    neg = float((y_train == 0).sum())
    scale_pos_weight = neg / pos if pos > 0 else 1.0

    xgb_tab = XGBClassifier(
        n_estimators=300,
        max_depth=6,
        learning_rate=0.05,
        subsample=0.8,
        colsample_bytree=0.8,
        objective="binary:logistic",
        eval_metric="logloss",
        n_jobs=4,
        random_state=42,
        scale_pos_weight=scale_pos_weight,
    )
    xgb_tab.fit(X_tab_train, y_train)
    y_score_tab = xgb_tab.predict_proba(X_tab_test)[:, 1]

    # -----------------------------
    # 4) Rule-based baseline
    # -----------------------------
    feature_names = joblib.load("data/tabular_feature_names.pkl")
    amt_idx = feature_names.index("TransactionAmt")

    amt_test = X_tab_test[:, amt_idx]
    # same simple rule score style used before
    y_score_rule = (amt_test > 30000).astype(float) * 0.4

    # -----------------------------
    # 5) PR curves + AP scores
    # -----------------------------
    p_rule, r_rule, _ = precision_recall_curve(y_test, y_score_rule)
    p_tab, r_tab, _ = precision_recall_curve(y_test, y_score_tab)
    p_full, r_full, _ = precision_recall_curve(y_test, y_score_full)

    ap_rule = average_precision_score(y_test, y_score_rule)
    ap_tab = average_precision_score(y_test, y_score_tab)
    ap_full = average_precision_score(y_test, y_score_full)

    # -----------------------------
    # 6) Plot
    # -----------------------------
    plt.figure(figsize=(8, 6))
    plt.plot(r_rule, p_rule, label=f"Rule-based (PR-AUC={ap_rule:.4f})", linewidth=2)
    plt.plot(r_tab, p_tab, label=f"XGBoost tabular (PR-AUC={ap_tab:.4f})", linewidth=2)
    plt.plot(r_full, p_full, label=f"Proposed full (PR-AUC={ap_full:.4f})", linewidth=2)

    plt.xlabel("Recall")
    plt.ylabel("Precision")
    plt.title("Precision-Recall Curves on Test Set")
    plt.legend(loc="lower left")
    plt.grid(alpha=0.3)
    plt.tight_layout()

    out_file = "pr_curves.png"
    plt.savefig(out_file, dpi=300)
    print(f"Saved: {out_file}")
    print(f"Rule-based AP: {ap_rule:.4f}")
    print(f"XGBoost tabular AP: {ap_tab:.4f}")
    print(f"Proposed full AP: {ap_full:.4f}")


if __name__ == "__main__":
    main()