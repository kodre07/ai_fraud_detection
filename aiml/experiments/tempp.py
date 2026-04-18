import numpy as np
import joblib

X_tab = np.load("data/X_tab.npy")
X_gnn = np.load("data/X_gnn.npy")

tabular_feature_names = joblib.load("data/tabular_feature_names.pkl")

print("Tabular features:", len(tabular_feature_names))
print("GNN shape:", X_gnn.shape)
print("Expected total:", len(tabular_feature_names) + X_gnn.shape[1])