from pathlib import Path
from dotenv import load_dotenv


env_path = Path(__file__).resolve().parents[2] / ".env"   # backend_lara_racha/.env
load_dotenv(env_path)

from fastapi import FastAPI

from backend.app.routers.auth import router as auth_router
from backend.app.routers.candidates import router as candidates_router

from fastapi import Request
from fastapi.exceptions import HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from backend.app.routers.auth_session import router as session_router

app = FastAPI(title="HireLoop API")

app.include_router(auth_router)
app.include_router(candidates_router)
app.include_router(session_router)

app.add_middleware(CORSMiddleware, allow_origins=["http://localhost:5173"],
                   allow_credentials=True, allow_methods=["*"], allow_headers=["*"])



@app.get("/")
def root():
    return {"message": "HireLoop API is running"}

@app.exception_handler(HTTPException)
async def http_error(request: Request, exc: HTTPException):
    return JSONResponse(status_code=exc.status_code, content={"message": exc.detail})