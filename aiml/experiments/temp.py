from sklearn.metrics import (
    classification_report,
    confusion_matrix,
    precision_score,
    recall_score,
    f1_score,
    average_precision_score
)

# -------------------------------
# 1️⃣ Get predictions
# -------------------------------
y_pred = model.predict(X_test)  # 0 or 1
y_prob = model.predict_proba(X_test)[:, 1]  # probabilities

# -------------------------------
# 2️⃣ Confusion Matrix
# -------------------------------
cm = confusion_matrix(y_test, y_pred)
print("Confusion Matrix:\n", cm)

# -------------------------------
# 3️⃣ Precision, Recall, F1
# -------------------------------
precision = precision_score(y_test, y_pred)
recall = recall_score(y_test, y_pred)
f1 = f1_score(y_test, y_pred)

print(f"Precision: {precision:.4f}")
print(f"Recall: {recall:.4f}")
print(f"F1-score: {f1:.4f}")

# -------------------------------
# 4️⃣ PR-AUC
# -------------------------------
pr_auc = average_precision_score(y_test, y_prob)
print(f"PR-AUC: {pr_auc:.4f}")

# -------------------------------
# 5️⃣ Full report
# -------------------------------
print("\nClassification Report:\n")
print(classification_report(y_test, y_pred))