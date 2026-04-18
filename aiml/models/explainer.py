import joblib
from graph.utils import get_suspicious_paths, explain_paths

class FraudExplainer:
    def __init__(self, model_path, shap_path):
        self.model = joblib.load(model_path)
        self.explainer = joblib.load(shap_path)

    def explain_transaction(self, i, X, G, y, tx_ids, txid_to_index):
        
        # SHAP values
        shap_values = self.explainer.shap_values(X)
        shap_value = shap_values[i]

        # Top SHAP features
        top_indices = abs(shap_value).argsort()[-5:]
        
        # Graph explanation
        node_id = f"T_{tx_ids[i]}"
        paths = get_suspicious_paths(G, node_id, y, txid_to_index)
        graph_explanations = explain_paths(paths)

        return {
            "top_features": top_indices.tolist(),
            "graph_insights": graph_explanations
        }