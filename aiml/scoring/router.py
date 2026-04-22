# src/hybrid/process.py

import numpy as np
import pickle
import networkx as nx
import shap
import joblib
import concurrent.futures
from graph.extractor import generate_embedding_real

# ✅ Fix 5 — Neo4j / graph-density timeout (400 ms)
# If get_graph_density_signal does not return within NEO4J_TIMEOUT_S seconds
# (e.g. Neo4j is slow, unavailable, or the in-memory graph is huge), we fall
# back to the XGBoost path rather than blocking the entire worker loop.
NEO4J_TIMEOUT_S = 0.4   # 400 ms — adjust if graph is very large

def _get_graph_density_safe(tx_id: str) -> int:
    """
    Wraps get_graph_density_signal with a hard wall-clock timeout.
    Returns -1 as a sentinel on timeout or any exception so the caller
    can safely route to the XGBoost fallback.
    """
    try:
        with concurrent.futures.ThreadPoolExecutor(max_workers=1) as executor:
            future = executor.submit(get_graph_density_signal, tx_id)
            return future.result(timeout=NEO4J_TIMEOUT_S)
    except concurrent.futures.TimeoutError:
        print(f"⚠️  Neo4j/graph timeout ({NEO4J_TIMEOUT_S}s) for {tx_id} — routing to XGBoost fallback")
        return -1
    except Exception as exc:
        print(f"⚠️  Neo4j/graph error for {tx_id}: {exc} — routing to XGBoost fallback")
        return -1

# Load everything once (important for performance)
with open("models/hybrid_xgb.pkl", "rb") as f:
    model = pickle.load(f)

explainer = shap.TreeExplainer(model)

with open("data/graph.pkl", "rb") as f:
    graph = pickle.load(f)


# ===============================
# MAIN FUNCTION
# ===============================


tabular_feature_names = joblib.load("data/tabular_feature_names.pkl")
def process_transaction(transaction):
    
    # 1. Features
    features = build_tabular_features(transaction)

    # 2. Graph
    update_graph(transaction)
    subgraph = get_subgraph(transaction)
    tx_id = f"T_{transaction['TransactionID']}"
        # Graph signal for routing
    graph_context_count = _get_graph_density_safe(tx_id)  # ✅ Fix 5: timeout-guarded call
    print("Graph context count:", graph_context_count)

    # PATH A — RULE BASED (cold start / no graph context, OR Neo4j timeout sentinel)
    if graph_context_count <= 0:   # 0 = no history; -1 = timeout/error sentinel
        fraud_score = rule_based_score(transaction)
        fraud_paths = get_fraud_paths(transaction, max_hops=2)

        return {
            "fraud_score": fraud_score,
            "method": "rule_based",          # ✅ Fix 4: honest label
            "top_features": ["Rule-based scoring"],
            "graph_insights": ["New or isolated account"],
            "fraud_paths": fraud_paths
        }

    # PATH B — TABULAR + weak graph embedding (xgboost)
    elif graph_context_count <= 2:
        embedding = generate_embedding_real(subgraph, f"T_{transaction['TransactionID']}")
        final_features = np.concatenate([features, embedding * 0.1])
        fraud_score = model.predict_proba([final_features])[0][1]
        fraud_paths = get_fraud_paths(transaction, max_hops=2)

        return {
            "fraud_score": float(fraud_score),
            "method": "xgboost",             # ✅ Fix 4: honest label (tabular model)
            "top_features": get_shap_explanation(final_features),
            "graph_insights": ["Limited graph information"],
            "fraud_paths": fraud_paths
        }

    # PATH C — GNN HYBRID SLOT (falls back to XGBoost until GNN is trained)
    else:
        embedding = generate_embedding_real(subgraph, f"T_{transaction['TransactionID']}")
        final_features = np.concatenate([features, embedding])
        fraud_score = model.predict_proba([final_features])[0][1]
        fraud_paths = get_fraud_paths(transaction, max_hops=4)

        return {
            "fraud_score": float(fraud_score),
            # ✅ Fix 4: "gnn_hybrid_fallback" — GNN slot is active but uses XGBoost
            # internally until dedicated GNN weights are available. Replace with
            # "gnn_hybrid" once a trained GNN model is loaded.
            "method": "gnn_hybrid_fallback",
            "top_features": get_shap_explanation(final_features),
            "graph_insights": get_graph_insights(transaction),
            "fraud_paths": fraud_paths
        }

def build_tabular_features(transaction):
    features = []

    for feature in tabular_feature_names:
        value = transaction.get(feature, 0)  # default = 0
        features.append(value)

    return np.array(features)

def update_graph(transaction):
    tx_id = f"T_{transaction['TransactionID']}"

    # normalize fraud label to int 0/1
    try:
        fraud_label = int(transaction.get("isFraud", 0))
    except (TypeError, ValueError):
        fraud_label = 0

    graph.add_node(tx_id, type="transaction", isFraud=fraud_label)

    # Avoid double prefixes if already passed as D_xxx / E_xxx
    raw_card = str(transaction.get("card1", "unknown"))
    raw_device = str(transaction.get("device", "nan"))
    raw_email = str(transaction.get("email", "nan"))

    acc = raw_card if raw_card.startswith("A_") else f"A_{raw_card}"
    device = raw_device if raw_device.startswith("D_") else f"D_{raw_device}"
    email = raw_email if raw_email.startswith("E_") else f"E_{raw_email}"

    graph.add_node(acc, type="account")
    graph.add_node(device, type="device")
    graph.add_node(email, type="email")

    graph.add_edge(tx_id, acc)
    graph.add_edge(tx_id, device)
    graph.add_edge(tx_id, email)

def get_subgraph(transaction, k=2):
    tx_id = f"T_{transaction['TransactionID']}"

    nodes = nx.single_source_shortest_path_length(graph, tx_id, cutoff=k).keys()
    return graph.subgraph(nodes)

def generate_embedding(subgraph):
    raise Exception("Use generate_embedding_real instead")
    print("Embedding sample:", embedding[:5])


def get_shap_explanation(features):
    shap_values = explainer.shap_values([features])[0]
    top_indices = np.argsort(np.abs(shap_values))[-5:]

    explanations = set()

    for i in top_indices:
        if i < len(tabular_feature_names):
            explanations.add(f"{tabular_feature_names[i]} influenced prediction")
        else:
            explanations.add("Graph relationships influenced prediction")

    return list(explanations)

def get_graph_insights(transaction):
    tx_id = f"T_{transaction['TransactionID']}"
    insights = []

    if tx_id not in graph:
        return insights

    neighbors = list(graph.neighbors(tx_id))

    for node in neighbors:

        for n2 in graph.neighbors(node):
            if graph.nodes[n2].get("isFraud") == 1:
                insights.append(f"{node} linked to past fraud")

        if "D_nan" in node:
            insights.append("Missing device info (risk)")

        if "E_nan" in node:
            insights.append("Missing email info (risk)")

    if not insights:
        insights.append("No suspicious graph patterns detected")

    return list(set(insights))

def rule_based_score(transaction):
    score = 0

    if transaction.get("TransactionAmt", 0) > 30000:
        score += 0.4

    if transaction.get("device") == "D_nan":
        score += 0.3

    if transaction.get("email") == "E_nan":
        score += 0.3

    return min(score, 1.0)

def tabular_only_score(features):
    return model.predict_proba([features])[0][1]

def get_fraud_paths(transaction, max_hops=3):
    tx_id = f"T_{transaction['TransactionID']}"
    paths = []

    if tx_id not in graph:
        return paths

    # candidate fraud transaction nodes
    fraud_nodes = []
    for n, attrs in graph.nodes(data=True):
        if not (isinstance(n, str) and n.startswith("T_")):
            continue

        raw = attrs.get("isFraud", 0)
        try:
            is_fraud = int(raw) == 1
        except (TypeError, ValueError):
            is_fraud = str(raw).lower() in {"true", "1", "yes"}

        if is_fraud and n != tx_id:
            fraud_nodes.append(n)

    if not fraud_nodes:
        return []

    # shortest bounded paths from current tx to known fraud tx nodes
    for fn in fraud_nodes:
        try:
            p = nx.shortest_path(graph, source=tx_id, target=fn)
            if 2 <= len(p) - 1 <= max_hops:  # hops between 2 and max_hops
                paths.append(p)
        except (nx.NetworkXNoPath, nx.NodeNotFound):
            continue

    # dedupe
    unique_paths = []
    seen = set()
    for p in paths:
        t = tuple(p)
        if t not in seen:
            seen.add(t)
            unique_paths.append(p)

    return unique_paths

def get_graph_density_signal(tx_id):
    """
    Count transaction neighbors within 2 hops (excluding self).
    Better signal than direct degree (which is always ~3 for tx->account/device/email).
    """
    if tx_id not in graph:
        return 0

    hop1 = set(graph.neighbors(tx_id))
    hop2 = set()

    for n1 in hop1:
        hop2.update(graph.neighbors(n1))

    # Keep only transaction-like nodes except self
    tx_like = {n for n in (hop1 | hop2) if isinstance(n, str) and n.startswith("T_") and n != tx_id}
    return len(tx_like)