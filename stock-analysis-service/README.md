# 股票分析微服务 (Stock Analysis Microservice)

Alfred 项目的股票分析微服务，提供技术分析、基本面分析和 AI 报告生成功能。

---

## 🏗️ 架构

```
Alfred (Spring Boot) → HTTP REST API → Stock Analysis Service (Python)
                                                   ↓
                                    +------------------------+
                                    | 技术分析引擎 (TA-Lib)  |
                                    | 基本面分析             |
                                    | AI 报告生成            |
                                    +------------------------+
                                                   ↓
                                    +------------------------+
                                    | Baostock + AkShare     |
                                    | OpenAI API             |
                                    +------------------------+
```

---

## 🚀 快速开始

### 本地开发

```bash
# 1. 安装依赖
pip install -r requirements.txt

# 2. 配置环境变量
cp .env.example .env
# 编辑 .env 文件，添加 API 密钥

# 3. 启动服务
cd api
python main.py

# 服务将在 http://localhost:8001 启动
# API 文档: http://localhost:8001/docs
```

### Docker 部署

```bash
# 构建镜像
docker build -t stock-analysis-service:latest .

# 运行容器
docker run -d \
  --name stock-analysis-service \
  -p 8001:8001 \
  -e OPENAI_API_KEY=your-key-here \
  -e OPENAI_BASE_URL=https://api.openai.com/v1 \
  stock-analysis-service:latest

# 查看日志
docker logs -f stock-analysis-service

# 健康检查
curl http://localhost:8001/api/health
```

---

## 📡 API 接口

### 健康检查

```http
GET /api/health
```

**响应**:
```json
{
  "status": "ok",
  "service": "stock-analysis-service",
  "version": "1.0.0"
}
```

### 综合分析

```http
POST /api/stock/analyze
Content-Type: application/json

{
  "code": "sh.600000",
  "start_date": "2024-01-01",
  "end_date": "2024-12-31",
  "include_ai": true
}
```

**响应**:
```json
{
  "success": true,
  "data": {
    "stock_code": "sh.600000",
    "stock_name": "浦发银行",
    "technical_analysis": {
      "ma": {},
      "macd": {},
      "rsi": {}
    },
    "fundamental_analysis": {
      "pe": 10.5,
      "pb": 1.2,
      "roe": 15.3
    },
    "ai_report": "AI分析报告内容..."
  }
}
```

### 股票信息

```http
GET /api/stock/{code}/info
```

### 技术分析

```http
GET /api/stock/{code}/technical?days=30
```

### 基本面分析

```http
GET /api/stock/{code}/fundamental
```

### AI 报告

```http
POST /api/stock/{code}/ai-report

{
  "start_date": "2024-01-01"
}
```

---

## 🔧 环境变量

| 变量名 | 必填 | 说明 | 默认值 |
|--------|------|------|--------|
| `OPENAI_API_KEY` | 是 | OpenAI API 密钥 | - |
| `OPENAI_BASE_URL` | 否 | OpenAI API 地址 | https://api.openai.com/v1 |
| `OPENAI_MODEL` | 否 | 使用的模型 | gpt-4 |
| `PORT` | 否 | 服务端口 | 8001 |
| `LOG_LEVEL` | 否 | 日志级别 | INFO |

---

## 📁 目录结构

```
stock-analysis-service/
├── api/
│   └── main.py              # FastAPI 应用入口
├── modules/                 # 分析模块（待迁移）
│   ├── technical_analysis.py
│   ├── fundamental_analysis.py
│   ├── ai_analyzer.py
│   └── data_fetcher.py
├── requirements.txt         # Python 依赖
├── Dockerfile              # Docker 构建文件
├── .env.example            # 环境变量示例
└── README.md               # 本文件
```

---

## 🔗 与 Alfred 集成

### Alfred 后端调用示例

```kotlin
@Service
class StockAnalysisService {
    private val stockServiceUrl = "http://stock-analysis-service:8001"

    fun analyzeStock(code: String): StockAnalysisReport {
        val response = restTemplate.postForObject(
            "$stockServiceUrl/api/stock/analyze",
            mapOf("code" to code, "include_ai" to true),
            StockAnalysisResponse::class.java
        )
        return convertToReport(response)
    }
}
```

---

## ⚠️ 注意事项

1. **数据源限制**:
   - Baostock 需要网络连接到中国数据源
   - AkShare 有请求频率限制

2. **AI API 成本**:
   - 每次生成 AI 报告都会调用 OpenAI API
   - 建议使用缓存减少重复调用

3. **TA-Lib 安装**:
   - 需要编译安装，Dockerfile 已包含
   - 本地开发需要先安装系统依赖

---

## 🚧 开发状态

- [x] FastAPI 接口框架
- [x] Docker 配置
- [x] CI/CD 集成
- ] 迁移技术分析模块
- ] 迁移基本面分析模块
- ] 迁移 AI 分析模块
- ] 完善错误处理
- ] 添加单元测试

---

## 📄 许可证

MIT License
