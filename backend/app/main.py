from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.api import auth, dashboards, datasets
from app.config import settings
from app.database.session import Base, engine
from app.models import models  # noqa: F401  (ensures models are registered with Base)

app = FastAPI(
    title=settings.APP_NAME,
    description="Automatically generate visual analytics dashboards from raw datasets using ML and AI.",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_origin_regex=r".*",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def on_startup():
    # For production, use Alembic migrations instead of create_all.
    Base.metadata.create_all(bind=engine)


@app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, exc: Exception):
    return JSONResponse(
        status_code=500,
        content={"detail": f"Internal server error: {exc}"},
    )


app.include_router(auth.router)
app.include_router(datasets.router)
app.include_router(dashboards.router)


@app.get("/")
def root():
    return {"status": "ok", "service": settings.APP_NAME}


@app.get("/health")
def health():
    return {"status": "healthy"}
