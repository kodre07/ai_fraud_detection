import numpy as np
import pickle
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import seaborn as sns

from sklearn.model_selection import train_test_split


def main():
    # 1) Load data
    X = np.load("data/X_final.npy")
    y = np.load("data/y.npy")

    # 2) Same split protocol as your other results
    _, X_test, _, y_test = train_test_split(
        X, y,
        test_size=0.2,
        stratify=y,
        random_state=42
    )

    # 3) Load trained model
    with open("models/hybrid_xgb.pkl", "rb") as f:
        model = pickle.load(f)

    # 4) Fraud scores
    scores = model.predict_proba(X_test)[:, 1]
    legit_scores = scores[y_test == 0]
    fraud_scores = scores[y_test == 1]

    # 5) Pure KDE plot
    plt.figure(figsize=(8, 5.5))

    sns.kdeplot(
        legit_scores,
        bw_adjust=1.1,
        fill=True,
        alpha=0.35,
        linewidth=2,
        color="#1f77b4",
        label=f"Legitimate (n={len(legit_scores)})"
    )

    sns.kdeplot(
        fraud_scores,
        bw_adjust=1.1,
        fill=True,
        alpha=0.35,
        linewidth=2,
        color="#d62728",
        label=f"Fraudulent (n={len(fraud_scores)})"
    )

    plt.xlabel("Predicted Fraud Score")
    plt.ylabel("Density")
    plt.title("Fraud Score Distribution (KDE): Legitimate vs Fraudulent")
    plt.xlim(0, 1)
    plt.legend()
    plt.grid(alpha=0.25)
    plt.tight_layout()

    out_file = "score_distribution_kde.png"
    plt.savefig(out_file, dpi=300)
    print(f"Saved: {out_file}")
    print(f"Legit mean score: {legit_scores.mean():.4f}")
    print(f"Fraud mean score: {fraud_scores.mean():.4f}")


if __name__ == "__main__":
    main()