from scoring.router import process_transaction

print("\n===== ROUTER + FRAUD PATH TESTING =====\n")

# ===============================
# TEST CASE 1 — PATH A (NEW USER)
# ===============================
tx1 = {
    "TransactionID": 1001,
    "TransactionAmt": 60000,
    "card1": 1111,
    "device": "D_nan",
    "email": "E_nan"
}

# ===============================
# TEST CASE 2 — PATH C (FRAUD LINK)
# ===============================
# First insert fraud
tx_fraud = {
    "TransactionID": 2001,
    "TransactionAmt": 80000,
    "card1": 2222,
    "device": "mobile",
    "email": "fraud@gmail.com",
    "isFraud": 1
}

# Then test transaction linked to it
tx2 = {
    "TransactionID": 2002,
    "TransactionAmt": 20000,
    "card1": 2222,  # SAME ACCOUNT
    "device": "mobile",
    "email": "fraud@gmail.com"
}

# ===============================
# TEST CASE 3 — PATH B (SMALL GRAPH)
# ===============================
tx3 = {
    "TransactionID": 3001,
    "TransactionAmt": 5000,
    "card1": 3333,
    "device": "mobile",
    "email": "user@gmail.com"
}

# ===============================
# RUN TESTS
# ===============================

tests = [
    ("Path A (New User)", tx1),
    ("Insert Fraud Node", tx_fraud),
    ("Path C (Fraud Link)", tx2),
    ("Path B (Small Graph)", tx3)
]

for name, tx in tests:
    print(f"\n--- {name} ---")

    result = process_transaction(tx)

    print("Fraud Score:", result["fraud_score"])
    print("Top Features:", result["top_features"])
    print("Graph Insights:", result["graph_insights"])
    print("Fraud Paths:", result.get("fraud_paths", []))

print("\n===== TEST COMPLETE =====")