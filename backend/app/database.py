import os
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv

load_dotenv()

MONGO_URI = os.getenv("MONGO_URI")
DB_NAME = os.getenv("DB_NAME", "disaster_db")

client = AsyncIOMotorClient(MONGO_URI)
db = client[DB_NAME]

async def init_db():
    # Ensure geospatial index exists for coordinate lookups
    await db.incidents.create_index([("location", "2dsphere")])
    await db.shelters.create_index([("location", "2dsphere")])
    print("Connected to MongoDB Atlas and verified 2dsphere indexes.")