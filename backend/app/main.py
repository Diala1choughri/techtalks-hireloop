from fastapi import FastAPI

from backend.app.routers.auth import router as auth_router
from backend.app.routers.candidates import router as candidates_router

app = FastAPI(title="HireLoop API")

app.include_router(auth_router)
app.include_router(candidates_router)


@app.get("/")
def root():
    return {"message": "HireLoop API is running"}