# src/utils/graph_utils.py

def get_suspicious_paths(G, node_id, y, txid_to_index):
    """
    Find suspicious paths from a transaction node to connected frauds.
    Includes all neighbors, even missing devices/emails.
    """
    suspicious_paths = []

    if node_id not in G:
        return suspicious_paths

    for n2 in G.neighbors(node_id):
        if n2.startswith("T_"):
            try:
                tid = int(n2[2:])
                idx = txid_to_index[tid]
                if y[idx] == 1:
                    suspicious_paths.append(f"{n2} (fraud)")
                else:
                    suspicious_paths.append(n2)
            except (KeyError, ValueError):
                suspicious_paths.append(n2)
        else:
            # Keep Accounts / Devices / Emails, even if 'nan'
            suspicious_paths.append(n2)

    return suspicious_paths

# ----------------------------
# NEW FUNCTION
# ----------------------------
def explain_paths(paths):
    """
    Convert suspicious paths into human-readable explanations.
    """
    explanations = []

    for p in paths:
        if "(fraud)" in p:
            explanations.append("Linked transaction involved in fraud")
        elif p.startswith("A_"):
            explanations.append("Linked account involved in fraud")
        elif p.startswith("D_"):
            if p == "D_nan":
                explanations.append("Device information missing")
            else:
                explanations.append("Shared device with fraudulent transaction")
        elif p.startswith("E_"):
            if p == "E_nan":
                explanations.append("Email information missing")
            else:
                explanations.append("Shared email with fraudulent transaction")
        else:
            # Other unknown nodes
            explanations.append(f"Suspicious connection: {p}")

    return explanations