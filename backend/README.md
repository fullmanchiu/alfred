# Alfred

ColaFit 智能后端助手服务，基于 FastAPI 构建，提供健身数据管理和分析功能。

## 功能特性

- JWT 用户认证
- FIT 文件上传和解析
- 健康数据管理（体重、身体指标等）
- 活动记录存储和检索
- AI 洞察分析（OpenAI 集成）
- 短信验证码服务（阿里云）
- 地图数据可视化支持

## 技术栈

- **框架**: FastAPI (Python 3.8+)
- **数据库**: SQLite
- **认证**: JWT
- **外部服务**:
  - OpenAI API
  - 阿里云短信服务
  - 高德地图 API

## 快速开始

### 1. 环境准备

```bash
# 克隆仓库
git clone <repository-url>
cd Alfred

# 创建虚拟环境
python -m venv .venv

# 激活虚拟环境
# Linux/macOS:
source .venv/bin/activate
# Windows:
.venv\Scripts\activate

# 安装依赖
pip install -r requirements.txt
```

### 2. 环境配置

复制 `.env.example` 为 `.env` 并配置必要的环境变量：

```bash
cp .env.example .env
```

编辑 `.env` 文件，填入以下配置：

```env
# 阿里云号码认证服务配置
ALIYUN_ACCESS_KEY_ID=your-access-key-id
ALIYUN_ACCESS_KEY_SECRET=your-access-key-secret
ALIYUN_SMS_SIGN_NAME=your-sign-name
ALIYUN_SMS_TEMPLATE_CODE=your-template-code

# Redis配置
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_DB=0

# JWT配置
SECRET_KEY=your-secret-key-here
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30

# 验证码配置
CODE_EXPIRE_SECONDS=300
CODE_LENGTH=6

# 高德地图配置
AMAP_API_KEY=your-amap-api-key
AMAP_API_SECRET=your-amap-api-secret
```

### 3. 启动服务

使用构建脚本（推荐）：

```bash
source build/envsetup.sh
cola -s    # setup
cola -r    # run
```

或手动启动：

```bash
# 激活虚拟环境后
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

服务将在 `http://localhost:8000` 运行。

### 4. 访问 API 文档

- **Swagger UI**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc

## API 文档

详细的 API 文档请参考 [docs/api/backend_api.md](docs/api/backend_api.md)

主要端点：

- `POST /api/v1/auth/register` - 用户注册
- `POST /api/v1/auth/login` - 用户登录
- `GET /api/v1/activities` - 获取活动列表
- `POST /api/v1/upload` - 上传 FIT 文件
- `GET /api/v1/health/profile` - 获取健康数据

## 开发指南

详细的开发和部署指南请参考：
- [架构文档](docs/architecture/overview.md)
- [开发部署指南](docs/guides/development_deployment.md)

## 项目结构

```
Alfred/
├── app/              # 应用核心代码
│   ├── api/          # API 路由
│   ├── core/         # 核心配置
│   ├── models/       # 数据库模型
│   ├── schemas/      # 数据模式
│   ├── services/     # 业务逻辑服务
│   └── web/          # Web 路由和模板
├── build/            # 构建脚本
├── docs/             # 项目文档
└── tests/            # 测试文件
```

## 测试

```bash
# 运行测试
pytest

# 生成测试覆盖率报告
pytest --cov=app --cov-report=html
```

## 部署

### Docker 部署

```bash
# 构建镜像
docker build -t colafit-backend .

# 运行容器
docker run -d -p 8000:8000 --env-file .env colafit-backend
```

### 生产环境

```bash
# 使用 Gunicorn
gunicorn -w 4 -k uvicorn.workers.UvicornWorker app.main:app --bind 0.0.0.0:8000
```

## 许可证

MIT License - 详见 [LICENSE](LICENSE) 文件

## 贡献

欢迎提交 Pull Request 或 Issue。

## 相关项目

- **[ColaFit-Frontend](https://github.com/yourusername/ColaFit-Frontend)** - Flutter 前端应用
  - 提供跨平台用户界面
  - 支持多种活动类型和健康数据管理
