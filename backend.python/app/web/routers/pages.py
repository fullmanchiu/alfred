# app/web/routers/pages.py
from pathlib import Path
from fastapi import APIRouter, Request
from fastapi.responses import HTMLResponse, PlainTextResponse, JSONResponse
from fastapi.templating import Jinja2Templates

# 绝对路径：.../app/web/routers/pages.py -> .../app/web/templates
TEMPLATES_DIR = Path(__file__).resolve().parent.parent / "templates"
templates = Jinja2Templates(directory=str(TEMPLATES_DIR))

router = APIRouter()

# ---- 页面路由（返回 HTML），仅负责模板渲染 ----
# 注意：现在主要使用Flutter前端，这些HTML页面作为备用或调试用途

@router.get("/", response_class=HTMLResponse)
async def index(request: Request):
    """重定向到Flutter前端"""
    return HTMLResponse(
        content="""
        <!DOCTYPE html>
        <html>
        <head>
            <title>Alfred - 智能健身助手</title>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1">
            <style>
                body {
                    font-family: Arial, sans-serif;
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    color: white;
                    margin: 0;
                    padding: 40px;
                    text-align: center;
                    min-height: 100vh;
                    display: flex;
                    flex-direction: column;
                    justify-content: center;
                    align-items: center;
                }
                .container {
                    background: rgba(255,255,255,0.1);
                    padding: 40px;
                    border-radius: 20px;
                    backdrop-filter: blur(10px);
                    max-width: 500px;
                    width: 100%;
                }
                h1 {
                    font-size: 2.5em;
                    margin-bottom: 20px;
                    text-shadow: 0 2px 4px rgba(0,0,0,0.3);
                }
                p {
                    font-size: 1.2em;
                    margin-bottom: 30px;
                    opacity: 0.9;
                }
                .btn {
                    display: inline-block;
                    padding: 15px 30px;
                    background: #ff6b6b;
                    color: white;
                    text-decoration: none;
                    border-radius: 50px;
                    font-weight: bold;
                    transition: all 0.3s ease;
                    margin: 10px;
                }
                .btn:hover {
                    background: #ff5252;
                    transform: translateY(-2px);
                    box-shadow: 0 5px 15px rgba(0,0,0,0.3);
                }
                .api-info {
                    margin-top: 40px;
                    padding: 20px;
                    background: rgba(255,255,255,0.1);
                    border-radius: 10px;
                    font-size: 0.9em;
                }
            </style>
        </head>
        <body>
            <div class="container">
                <h1>🚴 Alfred</h1>
                <p>智能健身数据管理助手</p>
                <div>
                    <a href="/static/map.html" class="btn">查看地图示例</a>
                    <a href="/docs" class="btn">Swagger UI</a>
                    <a href="/redoc" class="btn">ReDoc</a>
                </div>
                <div class="api-info">
                    <strong>API服务状态:</strong> <span id="api-status">检查中...</span><br>
                    <strong>Flutter应用:</strong>
                    <a href="http://localhost:13871" target="_blank" style="color: #ffd93d;">http://localhost:13871</a>
                </div>
            </div>
            <script>
                // 检查API状态
                fetch('/health')
                    .then(response => response.json())
                    .then(data => {
                        document.getElementById('api-status').textContent = '正常';
                        document.getElementById('api-status').style.color = '#4caf50';
                    })
                    .catch(error => {
                        document.getElementById('api-status').textContent = '连接失败';
                        document.getElementById('api-status').style.color = '#ff5252';
                    });
            </script>
        </body>
        </html>
        """,
        status_code=200
    )

@router.get("/map", response_class=HTMLResponse)
async def map_redirect(request: Request):
    """地图页面重定向到静态文件"""
    return HTMLResponse(
        content="""
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <meta http-equiv="refresh" content="0; url=/static/map.html">
            <title>重定向到地图页面</title>
        </head>
        <body>
            <p>正在重定向到地图页面...</p>
            <p>如果没有自动跳转，请点击这里：<a href="/static/map.html">地图页面</a></p>
        </body>
        </html>
        """,
        status_code=200
    )

# ---- 可选：临时调试端点，核对模板根是否正确；确认后可删除 ----
@router.get("/__debug/templates", response_class=PlainTextResponse)
async def debug_templates():
    up = TEMPLATES_DIR / "base.html"
    files = []
    try:
        files = [p.name for p in TEMPLATES_DIR.iterdir()]
    except Exception as e:
        files = [f"<error: {e}>"]
    lines = [
        f"TEMPLATES_DIR = {TEMPLATES_DIR}",
        f"Exists        = {TEMPLATES_DIR.exists()}",
        f"base.html    = {up} (exists={up.exists()})",
        "Files: " + ", ".join(files),
    ]
    return "\n".join(lines)
