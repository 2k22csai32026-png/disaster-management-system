import asyncio
import os
from motor.motor_asyncio import AsyncIOMotorClient

MONGO_URI = os.getenv(
    "MONGO_URI",
    "mongodb+srv://gaurav_1:up78eb5767@cluster0.59usq.mongodb.net/?retryWrites=true&w=majority"
)

client = AsyncIOMotorClient(MONGO_URI)
db = client["disaster_db"]

KANPUR_SHELTERS = [
    {
        "name": "Green Park Relief Center & Shelter",
        "location": {"type": "Point", "coordinates": [80.3498, 26.4815]},
        "capacity": 1200,
        "occupancy": 320,
        "contact_phone": "+91-512-2304111"
    },
    {
        "name": "GSVM Medical College Relief Base",
        "location": {"type": "Point", "coordinates": [80.3090, 26.4784]},
        "capacity": 800,
        "occupancy": 150,
        "contact_phone": "+91-512-2535483"
    },
    {
        "name": "Govind Nagar Community Emergency Shelter",
        "location": {"type": "Point", "coordinates": [80.3060, 26.4380]},
        "capacity": 500,
        "occupancy": 85,
        "contact_phone": "+91-512-2291040"
    },
    {
        "name": "Chakeri Airfield Evacuation Camp",
        "location": {"type": "Point", "coordinates": [80.4042, 26.4025]},
        "capacity": 2000,
        "occupancy": 410,
        "contact_phone": "+91-512-2401201"
    }
]

async def seed():
    await db.shelters.delete_many({})
    await db.shelters.insert_many(KANPUR_SHELTERS)
    print("Successfully seeded relief shelters into Atlas.")

if __name__ == "__main__":
    asyncio.run(seed())