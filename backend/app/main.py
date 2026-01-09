# app/main.py - 生产版本
"""
主应用入口文件
"""

from fastapi import FastAPI, Request
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response
import httpx
import urllib.parse
import logging
import uuid

# 数据库相关导入
from app.models import __all_models__
from app.db import engine, Base

# 路由导入
from app.api.router import api_router
from app.web.routers import web_router

# 日志器
logger = logging.getLogger(__name__)

# ========================================
# FastAPI 应用初始化
# ========================================
app = FastAPI(
    title="Alfred - ColaFit 后端服务",
    description="健身数据管理、记账、FIT文件处理",
    version="1.0.0"
)

# ========================================
# 请求日志中间件
# ========================================
@app.middleware("http")
async def log_requests(request: Request, call_next):
    """记录所有HTTP请求"""
    request_id = str(uuid.uuid4())[:8]
    logger.info(f"[{request_id}] {request.method} {request.url.path}")
    
    response = await call_next(request)
    
    logger.info(f"[{request_id}] {response.status_code}")
    return response

# ========================================
# 创建数据库表
# ========================================
Base.metadata.create_all(bind=engine)

# ========================================
# CORS 中间件配置
# ========================================
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ========================================
# 静态文件挂载
# ========================================
app.mount("/static", StaticFiles(directory="app/web/static"), name="static")

# ========================================
# 高德地图代理服务
# ========================================
@app.api_route("/_AMapService/{path:path}", methods=["GET", "POST"])
async def amap_proxy_service(request: Request, path: str = ""):
    """
    高德地图JSAPI安全代理服务
    """
    try:
        # 1. 读取配置
        from app.core.config import settings
        api_key = settings.AMAP_API_KEY
        api_secret = settings.AMAP_API_SECRET
        
        # 检查是否为空
        if not api_key or api_key == "":
            logger.warning("AMAP_API_KEY is empty or invalid")
            return Response(
                content='{"status": "0", "info": "INVALID_USER_KEY"}',
                status_code=200,
                media_type="application/json"
            )
        
        if not api_secret or api_secret == "":
            pass  # API Secret 不是必需的，允许为空
        
        # 2. 获取查询参数
        query_params = dict(request.query_params)
        
        # 3. 添加密钥参数
        query_params['key'] = api_key
        
        if api_secret and api_secret != "":
            query_params['jscode'] = api_secret
        
        # 4. 路由分发
        if path.startswith('v4/map/styles'):
            target_host = "https://webapi.amap.com"
            target_path = path
            service_name = "地图样式"
        elif path.startswith('v3/vectormap'):
            target_host = "https://fmap01.amap.com"
            target_path = path
            service_name = "海外地图"
        elif path.startswith('v3/log') or path.startswith('v3/stat'):
            callback = query_params.get('callback', 'callback')
            return Response(
                content=f'{callback}({{"status":"1","info":"OK"}})',
                status_code=200,
                media_type="application/javascript",
                headers={"Access-Control-Allow-Origin": "*"}
            )
        else:
            target_host = "https://restapi.amap.com"
            target_path = path
            service_name = "Web API"
        
        # 5. 构造目标URL
        query_string = urllib.parse.urlencode(query_params)
        target_url = f"{target_host}/{target_path}?{query_string}"
        
        # 6. 转发请求
        async with httpx.AsyncClient(timeout=30.0) as client:
            if request.method == "POST":
                body = await request.body()
                response = await client.post(target_url, content=body)
            else:
                response = await client.get(target_url)
            
            # 8. 返回响应
            return Response(
                content=response.content,
                status_code=response.status_code,
                headers={
                    "Content-Type": response.headers.get("content-type", "application/json"),
                    "Access-Control-Allow-Origin": "*",
                    "Cache-Control": "no-cache",
                }
            )
            
    except httpx.TimeoutException:
        logger.error(f"AMap proxy timeout: {path}")
        return Response(
            content='{"status": "0", "info": "请求超时"}',
            status_code=200,
            media_type="application/json"
        )
    except Exception as e:
        logger.error(f"AMap proxy error: {str(e)}")
        return Response(
            content='{"status": "0", "info": "代理服务错误"}',
            status_code=200,
            media_type="application/json"
        )


# ========================================
# 注册路由
# ========================================
app.include_router(api_router)
app.include_router(web_router)

# ========================================
# 健康检查端点
# ========================================
@app.get("/health")
def health_check():
    """健康检查"""
    return {"status": "ok", "service": "Alfred 后端 API", "version": "1.0.0"}

@app.get("/")
def root():
    """根路径重定向"""
    from fastapi.responses import RedirectResponse
    return RedirectResponse(url="/")

# ========================================
# 启动事件
# ========================================
@app.on_event("startup")
async def startup_event():
    """应用启动"""
    logger.info("Starting Alfred 后端服务...")

@app.on_event("shutdown")
async def shutdown_event():
    """应用关闭"""
    logger.info("Shutting down Alfred 后端服务...")

# ========================================
# 开发环境运行
# ========================================
if __name__ == "__main__":
    import uvicorn
    logger.info("Starting Uvicorn server...")
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        log_level="info"
    )
