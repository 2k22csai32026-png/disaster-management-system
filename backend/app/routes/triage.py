import os
import joblib
from fastapi import APIRouter
from pydantic import BaseModel

router = APIRouter(prefix="/api/triage", tags=["AI Triage"])

MODEL_PATH = os.path.join(os.path.dirname(__file__), "..", "triage_model.joblib")
model = None

if os.path.exists(MODEL_PATH):
    model = joblib.load(MODEL_PATH)

class TriageRequest(BaseModel):
    description: str

@router.post("/predict-severity")
def predict_severity(payload: TriageRequest):
    if not model or not payload.description.strip():
        return {"suggested_severity": "MEDIUM", "confidence": 0.5}
    
    pred = model.predict([payload.description])[0]
    probs = model.predict_proba([payload.description])[0]
    confidence = float(max(probs))
    
    return {
        "suggested_severity": pred,
        "confidence": round(confidence, 2)
    }