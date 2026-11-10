from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.database import init_db
from app.routes import incidents, shelters, triage

# 1. Instantiate the app first
app = FastAPI(title="CrisisGrid Emergency Backend")

# 2. Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 3. Startup event for DB indexing
@app.on_event("startup")
async def on_startup():
    await init_db()

# 4. Attach routers
app.include_router(incidents.router)
app.include_router(shelters.router)
app.include_router(triage.router)

@app.get("/")
def root():
    return {"status": "online", "system": "CrisisGrid"}