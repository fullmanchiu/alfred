from fastapi import APIRouter
from app.web.routers.pages import router as pages_router

web_router = APIRouter()
web_router.include_router(pages_router)