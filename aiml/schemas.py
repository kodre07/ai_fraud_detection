from pydantic import BaseModel
from typing import Optional, List, Dict, Any

class TransactionFeature(BaseModel):
    TransactionID: int
    TransactionAmt: float
    card1: int
    device: Optional[str] = "D_nan"
    email: Optional[str] = "E_nan"
    # Add other tabular features...

class ScoringResponse(BaseModel):
    fraud_score: float
    risk_level: str
    method: str
    confidence: float
    neighbor_count: int
    shap_values: Dict[str, float]
    suspicious_paths: List[str]
