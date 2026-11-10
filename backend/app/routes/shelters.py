from fastapi import APIRouter, Query
from app.database import db

router = APIRouter(prefix="/api/shelters", tags=["Shelters"])

@router.get("/nearest")
async def get_nearest_shelters(
    latitude: float = Query(..., ge=-90, le=90),
    longitude: float = Query(..., ge=-180, le=180),
    limit: int = Query(3, ge=1, le=10)
):
    """Calculates nearest operational emergency shelters with available capacity."""
    pipeline = [
        {
            "$geoNear": {
                "near": {
                    "type": "Point",
                    "coordinates": [longitude, latitude]
                },
                "distanceField": "distance_meters",
                "spherical": True,
                "query": {"$expr": {"$lt": ["$occupancy", "$capacity"]}}
            }
        },
        {"$limit": limit}
    ]

    cursor = db.shelters.aggregate(pipeline)
    shelters = []
    async for doc in cursor:
        doc["id"] = str(doc.pop("_id"))
        doc["distance_km"] = round(doc["distance_meters"] / 1000, 2)
        shelters.append(doc)

    return {"shelters": shelters}