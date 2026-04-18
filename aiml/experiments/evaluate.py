import numpy as np
import pickle

from sklearn.model_selection import train_test_split
from sklearn.metrics import (
    confusion_matrix,
    precision_score,
    recall_score,
    f1_score,
    classification_report,
    average_precision_score,
    precision_recall_curve
)

import matplotlib.pyplot as plt

# -------------------------------
# 1️⃣ Load Data
# -------------------------------
print("Loading data...")

X = np.load("data/X_final.npy")
y = np.load("data/y.npy")

print(f"X shape: {X.shape}")
print(f"y shape: {y.shape}")

# -------------------------------
# 2️⃣ Train-Test Split
# -------------------------------
X_train, X_test, y_train, y_test = train_test_split(
    X, y,
    test_size=0.2,
    stratify=y,
    random_state=42
)

print("\nData split completed")
print(f"Train size: {X_train.shape}")
print(f"Test size: {X_test.shape}")

# -------------------------------
# 3️⃣ Load Trained Model
# -------------------------------
print("\nLoading model...")

with open("models/hybrid_xgb.pkl", "rb") as f:
    model = pickle.load(f)

print("Model loaded successfully!")

# -------------------------------
# 4️⃣ Predictions
# -------------------------------
print("\nGenerating predictions...")

y_pred = model.predict(X_test)
y_prob = model.predict_proba(X_test)[:, 1]

# -------------------------------
# 5️⃣ Confusion Matrix
# -------------------------------
cm = confusion_matrix(y_test, y_pred)

print("\nConfusion Matrix:")
print(cm)

# -------------------------------
# 6️⃣ Metrics
# -------------------------------
precision = precision_score(y_test, y_pred)
recall = recall_score(y_test, y_pred)
f1 = f1_score(y_test, y_pred)

print("\n📊 Evaluation Metrics:")
print(f"Precision: {precision:.4f}")
print(f"Recall:    {recall:.4f}")
print(f"F1-score:  {f1:.4f}")

# -------------------------------
# 7️⃣ PR-AUC
# -------------------------------
pr_auc = average_precision_score(y_test, y_prob)
print(f"PR-AUC:    {pr_auc:.4f}")

# -------------------------------
# 8️⃣ Classification Report
# -------------------------------
print("\n📋 Classification Report:")
print(classification_report(y_test, y_pred))

# -------------------------------
# 9️⃣ Precision-Recall Curve
# -------------------------------
precision_vals, recall_vals, thresholds = precision_recall_curve(y_test, y_prob)

plt.figure(figsize=(8, 6))
plt.plot(recall_vals, precision_vals)
plt.xlabel("Recall")
plt.ylabel("Precision")
plt.title("Precision-Recall Curve")
plt.grid()
plt.show()

# -------------------------------
# 🔟 Threshold Tuning (Optional)
# -------------------------------
print("\n🔧 Testing different thresholds...")

thresholds_to_test = [0.3, 0.4, 0.5, 0.6, 0.7]

for t in thresholds_to_test:
    y_pred_custom = (y_prob > t).astype(int)

    p = precision_score(y_test, y_pred_custom)
    r = recall_score(y_test, y_pred_custom)
    f = f1_score(y_test, y_pred_custom)

    print(f"\nThreshold: {t}")
    print(f"Precision: {p:.4f}")
    print(f"Recall:    {r:.4f}")
    print(f"F1-score:  {f:.4f}")