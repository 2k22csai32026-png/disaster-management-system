from pydantic import BaseModel, Field
from typing import List, Optional

class GeoPoint(BaseModel):
    type: str = "Point"
    coordinates: List[float]  # [longitude, latitude]

class ShelterResponse(BaseModel):
    id: str
    name: str
    location: GeoPoint
    capacity: int
    occupancy: int
    contact_phone: str
    distance_meters: Optional[float] = None