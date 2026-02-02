# 股票分析微服务迁移实施计划

**日期**: 2026-01-29
**目标**: 将 stock_analysis 项目作为微服务集成到 Alfred

---

## 📋 总体架构

```
┌─────────────────────────────────────────────────────────┐
│                   Alfred (Spring Boot)                   │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐     │
│  │财务管理     │  │健康管理     │  │股票分析     │ ← 新增
│  └─────────────┘  └─────────────┘  └──────┬──────┘     │
└───────────────────────────────────────────┼─────────────┘
                                            │ HTTP REST API
                                            ↓
┌─────────────────────────────────────────────────────────┐
│          Stock Analysis Service (Python 微服务)          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │技术分析引擎  │  │基本面分析    │  │AI报告生成    │  │
│  └──────────────┘  └──────────────┘  └──────────────┘  │
│                                                         │
│  数据源: Baostock + AkShare + OpenAI API                │
└─────────────────────────────────────────────────────────┘
```

---

## 🎯 实施步骤

### 阶段 1: Python 微服务化 (1周)

#### 1.1 创建 FastAPI 接口包装
- **位置**: `/stock-analysis-service/`
- **文件**: `api/main.py`
- **端口**: 8001
- **接口设计**:

```python
# 核心接口
GET  /api/health                    # 健康检查
POST /api/stock/analyze            # 综合分析
GET  /api/stock/{code}/info        # 股票信息
GET  /api/stock/{code}/technical   # 技术分析
GET  /api/stock/{code}/fundamental # 基本面分析
POST /api/stock/{code}/ai-report   # AI分析报告
```

#### 1.2 创建 Dockerfile
- **基础镜像**: `python:3.13-slim`
- **端口**: 8001
- **依赖**: 从 stock_analysis 的 requirements.txt 迁移

#### 1.3 Docker Compose 配置
- 服务名: `stock-analysis-service`
- 网络: `alfred-network` (与现有服务共享)
- 环境变量: OpenAI API Key 等

---

### 阶段 2: Alfred 后端集成 (1周)

#### 2.1 创建 Kotlin 数据模型
**位置**: `backend/src/main/kotlin/com/colafan/alfred/entity/`

```kotlin
// 股票实体
@Entity
class Stock(
    val code: String,
    val name: String,
    val user: User
)

// 分析报告实体
@Entity
class StockAnalysisReport(
    val stock: Stock,
    val content: String,  // Markdown
    val analysisType: String, // technical, fundamental, ai
    val createdAt: LocalDateTime
)
```

#### 2.2 创建 Service 和 Controller
**位置**:
- `backend/src/main/kotlin/com/colafan/alfred/service/StockAnalysisService.kt`
- `backend/src/main/kotlin/com/colafan/alfred/controller/StockController.kt`

**功能**: 代理调用 Python 微服务

#### 2.3 数据库迁移
**位置**: `backend/src/main/resources/db/migration/V{n}__create_stock_tables.sql`

---

### 阶段 3: 前端页面开发 (1周)

#### 3.1 创建 React 页面
**位置**: `frontend/src/pages/Stocks.tsx`

**功能**:
- 股票搜索框
- 分析结果展示（技术指标、财务数据、AI报告）
- 历史报告查看
- 报告导出（Markdown/PDF）

#### 3.2 添加路由
- `/stocks` - 股票列表
- `/stocks/analyze/:code` - 分析页面

---

## 🔄 CI/CD 更新

### GitHub Actions Workflow

**文件**: `.github/workflows/build.yml`

**新增步骤**:
```yaml
# 1. 构建 Python 服务
- name: 构建 Python 股票分析服务
  run: |
    cd stock-analysis-service
    docker build -t stock-service:${{ github.sha }} .
    docker tag stock-service:${{ github.sha }} stock-service:latest

# 2. 保存 Docker 镜像
- name: 保存 Docker 镜像
  run: |
    docker save stock-service:latest | gzip > stock-service.tar.gz

# 3. 上传到 Release
- name: 创建 Release 并上传所有产物
  with:
    files: |
      backend/build/libs/app.jar
      frontend/dist.tar.gz
      stock-service.tar.gz  # 新增
```

### 部署脚本更新

**文件**: `/root/alfred/deploy.sh`

**新增逻辑**:
```bash
# 1. 下载 Python 服务镜像
download_file "${backend_url}" "/tmp/stock-service.tar.gz"

# 2. 加载镜像
docker load < /tmp/stock-service.tar.gz

# 3. 重启服务（如果已存在）或启动新服务
if docker ps -a | grep -q stock-analysis-service; then
    docker rm -f stock-analysis-service
fi

docker run -d \
  --name stock-analysis-service \
  --network alfred-network \
  -p 8001:8001 \
  --restart unless-stopped \
  stock-service:latest
```

---

## 📁 目录结构

```
alfred/
├── stock-analysis-service/     # 新增：Python 微服务
│   ├── api/
│   │   └── main.py            # FastAPI 接口
│   ├── modules/               # 从 stock_analysis 迁移
│   │   ├── technical_analysis.py
│   │   ├── fundamental_analysis.py
│   │   ├── ai_analyzer.py
│   │   └── data_fetcher.py
│   ├── requirements.txt
│   ├── Dockerfile
│   └── .env.example
├── backend/                    # Spring Boot
│   └── src/main/kotlin/com/colafan/alfred/
│       ├── entity/
│       │   ├── Stock.kt       # 新增
│       │   └── StockAnalysisReport.kt  # 新增
│       ├── service/
│       │   └── StockAnalysisService.kt  # 新增
│       └── controller/
│           └── StockController.kt  # 新增
├── frontend/                   # React
│   └── src/pages/
│       └── Stocks.tsx         # 新增
└── .github/workflows/
    └── build.yml              # 更新：添加 Python 服务构建
```

---

## 🔑 关键决策

1. **端口分配**: Python 服务使用 8001 端口
2. **网络**: 使用现有的 `alfred-network` Docker 网络
3. **数据存储**: 分析报告存储在 PostgreSQL（通过 Alfred）
4. **AI Key**: 通过环境变量注入到 Python 服务
5. **部署方式**: Docker 容器，独立部署/重启

---

## ⏱️ 时间估算

| 阶段 | 任务 | 工作量 |
|------|------|--------|
| 阶段1 | Python 微服务化 | 5-7天 |
| 阶段2 | Alfred 后端集成 | 5-7天 |
| 阶段3 | 前端页面开发 | 5-7天 |
| **总计** | | **15-21天 (3周)** |

---

## ✅ 验收标准

- [ ] Python 服务可以独立运行并返回分析结果
- [ ] Alfred 后端可以成功调用 Python 服务
- [ ] 前端页面可以展示股票分析结果
- [ ] CI/CD 流水线可以自动构建和部署所有服务
- [ ] 所有服务在同一 Docker 网络中正常运行

---

## 🚀 下一步行动

1. ✅ 创建实施计划（本文档）
2. ⏳ 更新 GitHub Actions workflow
3. ⏳ 创建 Python FastAPI 接口
4. ⏳ 创建 Dockerfile
5. ⏳ 更新部署脚本
6. ⏳ 测试完整流程

---

**备注**: 本计划采用渐进式实施，先完成 Python 微服务和 CI/CD，再进行前后端集成。
