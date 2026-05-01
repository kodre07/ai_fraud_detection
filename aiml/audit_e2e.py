"""
audit_e2e.py — Comprehensive end-to-end system audit.
Run from: aiml/   (python audit_e2e.py)
"""
import sys, os, traceback
sys.path.insert(0, ".")

PASS = "✅ PASS"
FAIL = "❌ FAIL"
WARN = "⚠️  WARN"
results = []


def check(label, fn):
    try:
        msg = fn()
        results.append((PASS, label, msg or ""))
        print(f"{PASS}  {label}" + (f"  [{msg}]" if msg else ""))
    except Exception as e:
        results.append((FAIL, label, str(e)))
        print(f"{FAIL}  {label}")
        print(f"       {e}")


# ── 1. ARTIFACT FILES ──────────────────────────────────────────────────────────
print()
print("=" * 70)
print("  END-TO-END AIML SYSTEM AUDIT")
print("=" * 70)
print()
print("── 1. ARTIFACT FILES ─────────────────────────────────────────────────")

check(
    "models/hybrid_xgb.pkl  exists",
    lambda: f'{os.path.getsize("models/hybrid_xgb.pkl"):,} bytes',
)
check(
    "models/gnn_model.pt    exists",
    lambda: f'{os.path.getsize("models/gnn_model.pt"):,} bytes',
)
check(
    "data/tabular_feature_names.pkl  exists",
    lambda: f'{os.path.getsize("data/tabular_feature_names.pkl"):,} bytes',
)

# ── 2. TABULAR FEATURE NAMES ───────────────────────────────────────────────────
print()
print("── 2. TABULAR FEATURE NAMES ──────────────────────────────────────────")
import joblib


def check_features():
    feats = joblib.load("data/tabular_feature_names.pkl")
    assert len(feats) == 52, f"Expected 52, got {len(feats)}"
    assert len(feats) == len(set(feats)), "Duplicates found"
    expected_start = [
        "TransactionAmt", "card1", "card2", "card3", "card5",
        "addr1", "addr2", "dist1",
    ]
    assert feats[:8] == expected_start, f"Wrong order: {feats[:8]}"
    assert feats[-1] == "V20", f"Last feature wrong: {feats[-1]}"
    return f"52 features OK, first={feats[0]}, last={feats[-1]}"


check("tabular_feature_names.pkl loads + 52 features in correct order", check_features)

# ── 3. MODEL LOADING ───────────────────────────────────────────────────────────
print()
print("── 3. MODEL LOADING ──────────────────────────────────────────────────")


def check_xgb():
    import pickle
    with open("models/hybrid_xgb.pkl", "rb") as f:
        m = pickle.load(f)
    assert hasattr(m, "predict_proba"), "Missing predict_proba"
    n_feat = m.n_features_in_
    assert n_feat == 116, f"Expected 116 input features, got {n_feat}"
    return f"XGBClassifier OK, n_features_in_={n_feat}"


check("hybrid_xgb.pkl  → XGBClassifier with 116 input features", check_xgb)


def check_gnn():
    import torch
    from models.graphsage import GraphSAGE
    model = GraphSAGE(52, 64, 2)
    model.load_state_dict(torch.load("models/gnn_model.pt", map_location="cpu"))
    model.eval()
    params = sum(p.numel() for p in model.parameters())
    return f"GraphSAGE(52→64→2) loaded, {params:,} params"


check("gnn_model.pt  → GraphSAGE(52,64,2) loads + eval()", check_gnn)

# ── 4. SCORER MODULE-LEVEL LOADS ──────────────────────────────────────────────
print()
print("── 4. SCORER MODULE-LEVEL LOADS (scorer.py import) ──────────────────")


def check_scorer_loads():
    from scoring import scorer as sc
    ok_xgb  = sc._hybrid_xgb is not None
    ok_feats = sc._tabular_feature_names is not None
    ok_gnn   = sc._generate_embedding is not None
    issues = []
    if not ok_xgb:   issues.append("hybrid_xgb NOT loaded")
    if not ok_feats: issues.append("tabular_feature_names NOT loaded")
    if not ok_gnn:   issues.append("_generate_embedding NOT loaded")
    if issues:
        raise RuntimeError("; ".join(issues))
    return f"xgb={ok_xgb} feats={ok_feats} gnn={ok_gnn} → all loaded"


check("scoring.scorer imports with all 3 artifacts loaded", check_scorer_loads)

# ── 5. EXTRACTOR ──────────────────────────────────────────────────────────────
print()
print("── 5. GRAPH EXTRACTOR (graph/extractor.py) ───────────────────────────")


def check_extractor():
    import networkx as nx
    from graph.extractor import generate_embedding_real
    import numpy as np

    G = nx.Graph()
    G.add_node("A_acc1");  G.add_node("T_tx001");  G.add_node("D_mobile")
    G.add_edge("A_acc1", "T_tx001")
    G.add_edge("T_tx001", "D_mobile")
    emb = generate_embedding_real(G, "T_tx001")
    assert emb.shape == (64,),    f"Bad shape: {emb.shape}"
    assert emb.dtype == "float32", f"Bad dtype: {emb.dtype}"
    return f"shape={emb.shape} dtype={emb.dtype}"


check("generate_embedding_real(connected_graph, tx_id) → (64,) float32", check_extractor)


def check_extractor_missing_node():
    """When tx_id is not in the graph, extractor must return zeros(64)."""
    import networkx as nx
    from graph.extractor import generate_embedding_real
    import numpy as np

    G = nx.Graph()
    G.add_node("A_acc2");  G.add_node("T_other");  G.add_node("D_dev")
    G.add_edge("A_acc2", "T_other")
    G.add_edge("T_other", "D_dev")
    emb = generate_embedding_real(G, "T_NOT_PRESENT")
    assert emb.shape == (64,), f"Bad shape: {emb.shape}"
    assert (emb == 0).all(), "Expected all-zeros for missing tx_id"
    return "missing tx_id → zeros(64) ✓"


check("generate_embedding_real(missing tx_id) → zeros(64)", check_extractor_missing_node)

# ── 6. TABULAR FEATURE VECTOR ─────────────────────────────────────────────────
print()
print("── 6. TABULAR FEATURE VECTOR (_build_tabular_features) ───────────────")


def check_tabular_vec():
    from scoring.scorer import _build_tabular_features, _tabular_feature_names
    import numpy as np

    tx = {"TransactionAmt": 5000.0, "card1": 9999, "C1": 1.0, "V1": 0.5}
    vec = _build_tabular_features(tx)
    assert vec.shape == (52,),     f"Expected (52,), got {vec.shape}"
    assert vec.dtype == "float32", f"dtype={vec.dtype}"
    feats = _tabular_feature_names
    assert vec[feats.index("TransactionAmt")] == 5000.0, "TransactionAmt mismatch"
    assert vec[feats.index("card1")]          == 9999.0, "card1 mismatch"
    assert vec[feats.index("C1")]             == 1.0,    "C1 mismatch"
    assert vec[feats.index("D5")]             == 0.0,    "D5 should default to 0"
    return f"shape={vec.shape} dtype={vec.dtype}, field mapping correct"


check("_build_tabular_features → (52,) float32, known/unknown fields map correctly", check_tabular_vec)

# ── 7. 116-DIM CONCAT → XGBoost ──────────────────────────────────────────────
print()
print("── 7. 116-DIM CONCATENATION (tab 52 + GNN 64) → XGBoost ─────────────")


def check_concat():
    import numpy as np, pickle, networkx as nx
    from scoring.scorer import _build_tabular_features
    from graph.extractor import generate_embedding_real

    tx = {"TransactionAmt": 8000.0, "card1": 1234}
    G  = nx.Graph()
    for n in ["A_acc", "T_tx1", "D_dev"]:
        G.add_node(n)
    G.add_edge("A_acc", "T_tx1")
    G.add_edge("T_tx1", "D_dev")

    tab      = _build_tabular_features(tx)         # (52,)
    emb      = generate_embedding_real(G, "T_tx1") # (64,)
    combined = np.concatenate([tab, emb])          # (116,)
    assert combined.shape == (116,), f"Expected (116,), got {combined.shape}"

    with open("models/hybrid_xgb.pkl", "rb") as f:
        xgb = pickle.load(f)
    prob = float(xgb.predict_proba([combined])[0][1])
    assert 0.0 <= prob <= 1.0, f"Invalid probability: {prob}"
    return f"concat={combined.shape} → XGB prob={prob:.6f} (valid [0,1])"


check("tab(52) + GNN(64) → (116,) → hybrid_xgb.pkl → valid probability", check_concat)

# ── 8. SCORER PATH A (rule_based) ─────────────────────────────────────────────
print()
print("── 8. SCORER PATH A  (routing_count=0, rule_based) ───────────────────")


def check_path_a():
    from scoring.scorer import route
    import networkx as nx

    tx = {
        "_id": "tx_path_a", "senderId": "acc_new",
        "amount": 75000, "deviceId": "", "ipAddress": "",
        "isVpn": True, "isProxy": False, "isFirstTransaction": True,
        "isNewDevice": False, "isNewIp": False,
        "ipCountry": "RU", "accountCountry": "US",
        "transactionCount1h": 0, "transactionCount24h": 0,
        "avgAmount7d": 0, "amountDeviation": 0,
        "entityResolution": {"linkedAccountCount": 0, "maxLinkConfidence": 0},
    }
    G = nx.Graph(); G.add_node("A_acc_new", type="account")
    r = route(tx, routing_count=0, peer_count=0, subgraph=G)
    assert r["method"] == "rule_based",       f"method={r['method']}"
    assert 0 <= r["score"] <= 1,              f"score={r['score']}"
    assert r["risk_level"] in ("low","medium","high","critical")
    return f"score={r['score']:.4f} risk={r['risk_level']} method={r['method']}"


check("routing_count=0  →  method=rule_based, score in [0,1]", check_path_a)


def check_path_a_neo4j_error():
    """routing_count=-1 (Neo4j error sentinel) must also route to rule_based."""
    from scoring.scorer import route
    import networkx as nx
    tx = {"_id":"tx_neo4j_err","senderId":"acc_x","amount":1000,"deviceId":"d",
          "ipAddress":"1.1.1.1","isVpn":False,"isProxy":False,
          "isFirstTransaction":False,"isNewDevice":False,"isNewIp":False,
          "ipCountry":"US","accountCountry":"US","transactionCount1h":0,
          "transactionCount24h":2,"avgAmount7d":900,"amountDeviation":0.5,
          "entityResolution":{"linkedAccountCount":0,"maxLinkConfidence":0}}
    G = nx.Graph(); G.add_node("A_acc_x", type="account")
    r = route(tx, routing_count=-1, peer_count=0, subgraph=G)
    assert r["method"] == "rule_based", f"Neo4j sentinel should give rule_based, got {r['method']}"
    return f"Neo4j error (-1) → rule_based ✓"


check("routing_count=-1  (Neo4j error)  →  still rule_based", check_path_a_neo4j_error)

# ── 9. SCORER PATH B (xgboost) ────────────────────────────────────────────────
print()
print("── 9. SCORER PATH B  (routing_count=2, xgboost) ──────────────────────")


def check_path_b():
    from scoring.scorer import route
    import networkx as nx

    tx = {
        "_id": "tx_path_b", "senderId": "acc_sparse",
        "amount": 5000, "deviceId": "dev_known", "ipAddress": "1.2.3.4",
        "isVpn": False, "isProxy": False, "isFirstTransaction": False,
        "isNewDevice": False, "isNewIp": False,
        "ipCountry": "US", "accountCountry": "US",
        "transactionCount1h": 1, "transactionCount24h": 8,
        "avgAmount7d": 4500, "amountDeviation": 1.1,
        "entityResolution": {"linkedAccountCount": 0, "maxLinkConfidence": 0},
    }
    G = nx.Graph(); G.add_node("A_acc_sparse", type="account")
    r = route(tx, routing_count=2, peer_count=0, subgraph=G)
    assert r["method"] == "xgboost",   f"method={r['method']}"
    assert 0 <= r["score"] <= 1,       f"score={r['score']}"
    return f"score={r['score']:.4f} risk={r['risk_level']} method={r['method']}"


check("routing_count=2  →  method=xgboost, score in [0,1]", check_path_b)

# ── 10. SCORER PATH C (gnn_hybrid_fallback) ───────────────────────────────────
print()
print("── 10. SCORER PATH C  (routing_count=5, gnn_hybrid_fallback) ─────────")


def check_path_c():
    from scoring.scorer import route
    import networkx as nx

    tx = {
        "_id": "tx_path_c", "senderId": "acc_established",
        "amount": 12000, "deviceId": "dev_known", "ipAddress": "10.0.0.1",
        "isVpn": False, "isProxy": False, "isFirstTransaction": False,
        "isNewDevice": False, "isNewIp": False,
        "ipCountry": "US", "accountCountry": "US",
        "transactionCount1h": 1, "transactionCount24h": 15,
        "avgAmount7d": 10000, "amountDeviation": 1.2,
        "entityResolution": {"linkedAccountCount": 0, "maxLinkConfidence": 0},
    }
    # Realistic 2-hop subgraph with 6 nodes and edges
    G = nx.Graph()
    G.add_node("A_acc_established", type="account")
    for i in range(4):
        G.add_node(f"T_prior_{i}", type="transaction")
        G.add_edge("A_acc_established", f"T_prior_{i}")
    G.add_node("T_tx_path_c", type="transaction")
    G.add_edge("A_acc_established", "T_tx_path_c")
    r = route(tx, routing_count=5, peer_count=1, subgraph=G)
    assert r["method"] == "gnn_hybrid_fallback", f"method={r['method']}"
    assert 0 <= r["score"] <= 1,                 f"score={r['score']}"
    return f"score={r['score']:.4f} risk={r['risk_level']} method={r['method']}"


check("routing_count=5  →  method=gnn_hybrid_fallback, score in [0,1]", check_path_c)

# ── 11. SCORER OUTPUT CONTRACT ────────────────────────────────────────────────
print()
print("── 11. SCORER OUTPUT CONTRACT (keys worker.py maps to Node.js) ────────")


def check_output_keys():
    from scoring.scorer import route
    import networkx as nx

    tx = {
        "_id": "tx_keys", "senderId": "acc_k",
        "amount": 1000, "deviceId": "d1", "ipAddress": "1.1.1.1",
        "isVpn": False, "isProxy": False, "isFirstTransaction": False,
        "isNewDevice": False, "isNewIp": False,
        "ipCountry": "US", "accountCountry": "US",
        "transactionCount1h": 0, "transactionCount24h": 3,
        "avgAmount7d": 900, "amountDeviation": 0.9,
        "entityResolution": {"linkedAccountCount": 0, "maxLinkConfidence": 0},
    }
    G = nx.Graph(); G.add_node("A_acc_k", type="account")
    r = route(tx, 0, 0, G)

    # Keys that worker.py._post_result() directly accesses
    required = [
        "transaction_id",   # → payload["transactionId"]
        "score",            # → payload["score"]
        "risk_level",       # → payload["risk_level"]
        "method",           # → payload["method_used"]
        "confidence",       # → payload["confidence_score"]
        "shap_values",      # → payload["shapExplanation"]
        "suspicious_paths", # → payload["suspiciousPaths"]
    ]
    missing = [k for k in required if k not in r]
    assert not missing, f"Missing keys: {missing}"

    # Type checks
    assert isinstance(r["score"],       float), f"score type={type(r['score'])}"
    assert isinstance(r["confidence"],  float), f"conf  type={type(r['confidence'])}"
    assert isinstance(r["shap_values"], dict),  f"shap  type={type(r['shap_values'])}"
    assert isinstance(r["suspicious_paths"], list), f"paths type={type(r['suspicious_paths'])}"
    return f"All {len(required)} keys present, types correct"


check("scorer.route() output has all keys + correct types for worker.py", check_output_keys)

# ── 12. SCORE FLOOR AND BOUNDS ────────────────────────────────────────────────
print()
print("── 12. SCORE BOUNDS & FLOOR ──────────────────────────────────────────")


def check_score_bounds():
    from scoring.scorer import route
    import networkx as nx

    # High-fraud transaction — should score high, never exactly 0
    tx_fraud = {
        "_id": "tx_fraud_heavy", "senderId": "acc_fraud",
        "amount": 150000, "deviceId": "", "ipAddress": "",
        "isVpn": True, "isProxy": True, "isFirstTransaction": True,
        "isNewDevice": True, "isNewIp": True,
        "ipCountry": "NG", "accountCountry": "US",
        "transactionCount1h": 6, "transactionCount24h": 0,
        "avgAmount7d": 0, "amountDeviation": 10.0,
        "entityResolution": {"linkedAccountCount": 5, "maxLinkConfidence": 0.9},
    }
    G = nx.Graph(); G.add_node("A_acc_fraud", type="account")
    r = route(tx_fraud, 0, 8, G)
    assert 0 < r["score"] <= 1.0, f"score out of range: {r['score']}"
    assert r["risk_level"] in ("high","critical"), f"expected high/critical, got {r['risk_level']}"

    # Clean transaction — should score low
    tx_clean = {
        "_id": "tx_clean", "senderId": "acc_clean",
        "amount": 200, "deviceId": "dev_trusted", "ipAddress": "10.0.0.1",
        "isVpn": False, "isProxy": False, "isFirstTransaction": False,
        "isNewDevice": False, "isNewIp": False,
        "ipCountry": "US", "accountCountry": "US",
        "transactionCount1h": 0, "transactionCount24h": 20,
        "avgAmount7d": 500, "amountDeviation": 0.4,
        "entityResolution": {"linkedAccountCount": 0, "maxLinkConfidence": 0},
    }
    G2 = nx.Graph(); G2.add_node("A_acc_clean", type="account")
    r2 = route(tx_clean, 0, 0, G2)
    assert 0 <= r2["score"] < 0.65, f"clean tx scored too high: {r2['score']}"
    return f"fraud→score={r['score']:.4f}({r['risk_level']})  clean→score={r2['score']:.4f}({r2['risk_level']})"


check("heavy-fraud → high/critical, clean → low/medium, both in [0,1]", check_score_bounds)

# ── SUMMARY ───────────────────────────────────────────────────────────────────
print()
print("=" * 70)
print("  AUDIT SUMMARY")
print("=" * 70)
passed = sum(1 for r in results if r[0] == PASS)
failed = sum(1 for r in results if r[0] == FAIL)
total  = len(results)
print(f"  Total  : {total}")
print(f"  Passed : {passed}")
print(f"  Failed : {failed}")
print()
if failed == 0:
    print("  🎉  ALL CHECKS PASSED — system is end-to-end ready")
else:
    print("  🔴  FAILURES DETECTED:")
    for status, label, msg in results:
        if status == FAIL:
            print(f"       • {label}")
            print(f"         {msg}")
print("=" * 70)
