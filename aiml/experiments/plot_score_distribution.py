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

    # 2) Same split protocol as your results
    _, X_test, _, y_test = train_test_split(
        X, y,
        test_size=0.2,
        stratify=y,
        random_state=42
    )

    # 3) Load trained full model
    with open("models/hybrid_xgb.pkl", "rb") as f:
        model = pickle.load(f)

    # 4) Predict fraud scores (probability of class 1)
    scores = model.predict_proba(X_test)[:, 1]

    legit_scores = scores[y_test == 0]
    fraud_scores = scores[y_test == 1]

    # 5) Plot (hist + KDE)
    plt.figure(figsize=(8, 5.5))

    sns.histplot(
        legit_scores,
        bins=50,
        stat="density",
        kde=True,
        color="#1f77b4",
        alpha=0.35,
        label=f"Legitimate (n={len(legit_scores)})"
    )

    sns.histplot(
        fraud_scores,
        bins=50,
        stat="density",
        kde=True,
        color="#d62728",
        alpha=0.35,
        label=f"Fraudulent (n={len(fraud_scores)})"
    )

    plt.xlabel("Predicted Fraud Score")
    plt.ylabel("Density")
    plt.title("Fraud Score Distribution: Legitimate vs Fraudulent")
    plt.xlim(0, 1)
    plt.legend()
    plt.grid(alpha=0.25)
    plt.tight_layout()

    out_file = "score_distribution.png"
    plt.savefig(out_file, dpi=300)
    print(f"Saved: {out_file}")
    print(f"Legit mean score: {legit_scores.mean():.4f}")
    print(f"Fraud mean score: {fraud_scores.mean():.4f}")


if __name__ == "__main__":
    main()