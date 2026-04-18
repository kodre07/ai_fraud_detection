import torch
from torch_geometric.data import Data
from models.graphsage import GraphSAGE

# ===============================
# MODEL CONFIG (match training)
# ===============================

IN_CHANNELS = 52
HIDDEN_CHANNELS = 64
OUT_CHANNELS = 2

# ===============================
# LOAD MODEL
# ===============================

model = GraphSAGE(IN_CHANNELS, HIDDEN_CHANNELS, OUT_CHANNELS)

model.load_state_dict(torch.load("models/gnn_model.pt", map_location=torch.device("cpu")))

model.eval()

# ===============================
# GRAPH → PYG
# ===============================

def graph_to_pyg(subgraph):
    node_list = list(subgraph.nodes())
    node_mapping = {node: i for i, node in enumerate(node_list)}

    edge_index = []

    for u, v in subgraph.edges():
        edge_index.append([node_mapping[u], node_mapping[v]])
        edge_index.append([node_mapping[v], node_mapping[u]])

    edge_index = torch.tensor(edge_index, dtype=torch.long).t().contiguous()

    # SAME AS TRAINING
    x = []

    for node in node_list:
        # Feature 1: node degree
        degree = len(list(subgraph.neighbors(node)))

        # Feature 2: node type encoding
        if "T_" in node:
            node_type = 1
        elif "A_" in node:
            node_type = 2
        elif "D_" in node:
            node_type = 3
        elif "E_" in node:
            node_type = 4
        else:
            node_type = 0

        feature_vector = [degree, node_type]

        # pad to 52 (IMPORTANT)
        feature_vector += [0] * (52 - len(feature_vector))

        x.append(feature_vector)

    x = torch.tensor(x, dtype=torch.float)

    return Data(x=x, edge_index=edge_index), node_mapping


# ===============================
# EMBEDDING
# ===============================

def generate_embedding_real(subgraph, tx_id):
    data, node_mapping = graph_to_pyg(subgraph)

    print("Node feature shape:", data.x.shape)

    with torch.no_grad():
        _, embeddings = model(data.x, data.edge_index)

    if tx_id not in node_mapping:
        return torch.zeros(64).numpy()

    idx = node_mapping[tx_id]
    return embeddings[idx].numpy()