from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime

class GeoPoint(BaseModel):
    type: str = "Point"
    coordinates: List[float]  # [longitude, latitude]

class IncidentCreate(BaseModel):
    title: str = Field(..., json_schema_extra={"example": "Severe Waterlogging on GT Road"})
    disaster_type: str = Field(..., json_schema_extra={"example": "flood"})
    description: str = Field(..., json_schema_extra={"example": "Road submerged under 3 feet of water."})
    latitude: float = Field(..., ge=-90, le=90, json_schema_extra={"example": 26.4499})
    longitude: float = Field(..., ge=-180, le=180, json_schema_extra={"example": 80.3319})
    severity: Optional[str] = "MEDIUM"

class IncidentResponse(BaseModel):
    id: str
    title: str
    disaster_type: str
    description: str
    location: GeoPoint
    severity: str
    status: str
    created_at: datetime