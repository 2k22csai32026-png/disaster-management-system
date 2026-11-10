from fastapi import APIRouter, HTTPException, Query
from app.database import db
from app.models.incident import IncidentCreate
from datetime import datetime
from bson import ObjectId

router = APIRouter(prefix="/api/incidents", tags=["Incidents"])

@router.post("/", status_code=201)
async def report_incident(payload: IncidentCreate):
    incident_doc = {
        "title": payload.title,
        "disaster_type": payload.disaster_type.lower(),
        "description": payload.description,
        "location": {
            "type": "Point",
            "coordinates": [payload.longitude, payload.latitude]  # [lng, lat]
        },
        "severity": payload.severity.upper(),
        "status": "REPORTED",
        "created_at": datetime.utcnow()
    }
    result = await db.incidents.insert_one(incident_doc)
    return {"id": str(result.inserted_id), "message": "Incident reported successfully"}

@router.get("/nearby")
async def get_nearby_incidents(
    latitude: float = Query(..., ge=-90, le=90),
    longitude: float = Query(..., ge=-180, le=180),
    radius_km: float = Query(10.0, ge=1.0, le=100.0)
):
    """Finds incidents within a given radius in kilometers using MongoDB $near."""
    radius_meters = radius_km * 1000

    query = {
        "location": {
            "$near": {
                "$geometry": {
                    "type": "Point",
                    "coordinates": [longitude, latitude]
                },
                "$maxDistance": radius_meters
            }
        }
    }

    cursor = db.incidents.find(query)
    incidents = []
    async for doc in cursor:
        doc["id"] = str(doc.pop("_id"))
        incidents.append(doc)

    return {"count": len(incidents), "incidents": incidents}