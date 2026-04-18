# Fraulens Analytics Engine (AI/ML Module)

> **Fraud Detection System — Complete Project Handoff**
> A real-time fraud detection system for financial transactions using a hybrid AI system (GraphSAGE + XGBoost) and Entity Resolution.

## 1. What This Project Is
This repository contains the **Python Analytics Engine** (Layer 5) for Fraulens. It is not a simple rule engine, but a hybrid AI system combining:
- **Graph Neural Networks (GraphSAGE)** to understand relationships between accounts, devices, and IPs.
- **XGBoost** to make the final fraud scoring decision.
- **Entity Resolution** linking accounts sharing devices/IPs/emails via Neo4j.

## 2. Directory Structure
```
fraud-analytics/
├── main.py              # FastAPI app, health endpoint
├── worker.py            # Redis consumer, retry + DLQ logic
├── schemas.py           # Pydantic request/response models
├── graph/
│   ├── extractor.py     # Neo4j subgraph queries (time-filtered, sampled)
│   └── builder.py       # Convert Neo4j result to PyG Data object
├── models/
│   ├── graphsage.py     # GraphSAGE 2-layer, 32-dim output
│   ├── xgboost_model.py # Hybrid classifier
│   └── explainer.py     # SHAP values + GraphRAG-lite paths
├── features/
│   └── temporal.py      # Velocity, deviation, rolling stats, risk_velocity
├── scoring/
│   ├── router.py        # Decides PATH A / B / C
│   ├── rule_based.py    # PATH A implementation
│   └── post_process.py  # Dedup, case grouping, prioritization
└── db/
    ├── neo4j_client.py  # Async driver
    ├── mongo_client.py  # Async client
    └── redis_client.py  # Redis client
```

*Note: Exploratory scripts, previous notebooks, and visualizations from the initial MVP buildup have been preserved in the `experiments/` directory.*

## 3. The Cold-Start Problem (Routing)
The scoring router handles the cold-start problem:
- **0 neighbors (New Account)** → Rule-based scoring
- **1-2 neighbors (Sparse)** → XGBoost tabular only
- **3+ neighbors (Active)** → GNN Hybrid Main Path

## 4. Setup & Running Local Development

1. **Environment Setup**
    ```bash
    python -m venv venv
    source venv/bin/activate  # (or `venv\Scripts\activate` on Windows)
    pip install -r requirements.txt
    ```

2. **Connecting Requirements**
    Ensure you have your environment variables set for:
    - REDIS_URL
    - NEO4J_URI
    - MONGO_URI

3. **Running the API Gateway**
    ```bash
    uvicorn main:app --reload
    ```

4. **Running the Worker Process**
    ```bash
    python worker.py
    ```

*(Refer to the main team architectural document for detailed data flow schemas involving the Node.js API Gateway, Analyst Dashboard, and MongoDB).*
