from scoring.router import process_transaction

print("\n===== FRAUD SYSTEM TEST SUITE =====\n")

# Build a full-ish feature template so model input is not mostly zeros
def make_tx(tx_id, amt, card1, device, email, is_fraud=0, overrides=None):
    tx = {
        "TransactionID": tx_id,
        "TransactionAmt": amt,
        "card1": card1,
        "card2": 321.0,
        "card3": 150.0,
        "card5": 226.0,
        "addr1": 315.0,
        "addr2": 87.0,
        "dist1": 19.0,
        "C1": 1.0, "C2": 2.0, "C3": 1.0, "C4": 0.0, "C5": 1.0,
        "C6": 0.0, "C7": 0.0, "C8": 1.0, "C9": 0.0, "C10": 2.0,
        "C11": 1.0, "C12": 0.0, "C13": 1.0, "C14": 2.0,
        "D1": 120.0, "D2": 10.0, "D3": 5.0, "D4": 3.0, "D5": 1.0,
        "D6": 0.0, "D7": 1.0, "D8": 2.0, "D9": 0.0, "D10": 1.0,
        "D11": 4.0, "D12": 0.0, "D13": 2.0, "D14": 1.0, "D15": 0.0,

        # graph linkage fields used by your update_graph()
        "device": device,
        "email": email,

        # only for known historical fraud nodes
        "isFraud": is_fraud,
    }

    if overrides:
        tx.update(overrides)

    return tx


def run_case(name, tx):
    print(f"\n--- {name} ---")
    result = process_transaction(tx)
    print("TransactionID:", tx["TransactionID"])
    print("Fraud Score :", result.get("fraud_score"))
    print("Top Features:", result.get("top_features"))
    print("Graph Insights:", result.get("graph_insights"))
    print("Fraud Paths:", result.get("fraud_paths", []))


# ----------------------------
# 1) Seed one known fraud anchor
# ----------------------------
fraud_seed = make_tx(
    tx_id=900001,
    amt=85000,
    card1=7777,
    device="seed_device_A",
    email="seed_fraud@mail.com",
    is_fraud=1,
    overrides={
        "C10": 9.0,
        "D1": 280.0,
        "dist1": 120.0
    }
)

# ----------------------------
# 2) Linked transaction (should show fraud paths)
# ----------------------------
linked_to_fraud = make_tx(
    tx_id=900002,
    amt=42000,
    card1=7777,  # same account
    device="seed_device_A",  # same device
    email="seed_fraud@mail.com",  # same email
    overrides={
        "C10": 8.0,
        "D1": 240.0,
        "dist1": 95.0
    }
)

# ----------------------------
# 3) Truly isolated (cold-ish) transaction
# ----------------------------
isolated = make_tx(
    tx_id=900003,
    amt=1200,
    card1=8888,
    device="unique_device_X_900003",
    email="unique_900003@test.com",
    overrides={
        "C1": 0.0,
        "C2": 0.0,
        "D1": 5.0,
        "dist1": 1.0
    }
)

# ----------------------------
# 4) Same graph links, low tabular risk
# ----------------------------
low_risk_linked = make_tx(
    tx_id=900004,
    amt=1500,
    card1=7777,  # linked
    device="seed_device_A",
    email="seed_fraud@mail.com",
    overrides={
        "C10": 0.0,
        "D1": 10.0,
        "dist1": 2.0,
        "C14": 0.0
    }
)

# ----------------------------
# 5) Same graph links, high tabular risk
# ----------------------------
high_risk_linked = make_tx(
    tx_id=900005,
    amt=98000,
    card1=7777,  # linked
    device="seed_device_A",
    email="seed_fraud@mail.com",
    overrides={
        "C10": 12.0,
        "D1": 360.0,
        "dist1": 200.0,
        "C14": 10.0
    }
)

# ----------------------------
# 6) Sparse link via shared device only
# ----------------------------
shared_device_only = make_tx(
    tx_id=900006,
    amt=7000,
    card1=9999,
    device="seed_device_A",  # shared device
    email="other_user_900006@mail.com",
    overrides={
        "C10": 2.0,
        "D1": 40.0,
        "dist1": 12.0
    }
)

tests = [
    ("Seed Fraud Anchor", fraud_seed),
    ("Linked To Fraud (expect paths)", linked_to_fraud),
    ("Isolated Transaction", isolated),
    ("Low Risk but Linked", low_risk_linked),
    ("High Risk and Linked", high_risk_linked),
    ("Shared Device Only", shared_device_only),
]

for test_name, tx in tests:
    run_case(test_name, tx)

print("\n===== TEST SUITE COMPLETE =====")