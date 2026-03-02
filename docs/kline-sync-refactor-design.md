# 股票K线同步服务重构设计文档

**基于性能测试结果的重构方案**

---

## 一、测试结论

### 1. 阈值测试结果

| 股票数 | 单进程 | 4进程 | 加速比 | 推荐 |
|--------|--------|-------|--------|------|
| 10只 | 5.37秒 | 5.55秒 | 0.97x | 单进程 ✅ |
| **20只** | 5.88秒 | 3.87秒 | **1.52x** | 4进程 ✅ |
| 50只 | 16.96秒 | 10.59秒 | 1.60x | 4进程 ✅ |
| 100只 | 28.21秒 | 13.95秒 | 2.02x | 4进程 ✅ |

**阈值点：15只股票**
- ≤15只：使用单进程（避免进程创建开销）
- ＞15只：使用4进程（并发优势显现）

---

## 二、架构设计

### 1. 核心架构（串行队列+智能进程选择）

```
┌─────────────────────────────────────────────────────────────┐
│                      Java后端                                │
│  - SyncTaskService: 任务管理（创建/删除/启动/停止）         │
│  - StockController: API接口                                │
└────────────────────────┬────────────────────────────────────┘
                         │ HTTP API
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                   Python服务 (FastAPI)                        │
│                                                               │
│  ┌─────────────────────────────────────────────────────┐   │
│  │              任务队列（串行排队）                      │   │
│  │                                                       │   │
│  │  [Task1] [Task2] [Task3] [Task4] ...                  │   │
│  │    ↓                                                │   │
│  │  当前执行 ← Task1(自选10只)                          │   │
│  │    ↓                                                │   │
│  │  判断阈值: 10 ≤ 15 → 用单进程                         │   │
│  │    ↓                                                │   │
│  │  ┌─────────────────────────────────────────────┐      │   │
│  │  │ 单进程获取10只股票 (串行处理)                   │      │   │
│  │  │ [1] → [2] → [3] → ... → [10]                   │      │   │
│  │  └─────────────────────────────────────────────┘      │   │
│  │                                                     │   │
│  │  Task1完成，取下一个任务                             │   │
│  │    ↓                                                │   │
│  │  当前执行 ← Task2(沪深300只)                         │   │
│  │    ↓                                                │   │
│  │  判断阈值: 300 > 15 → 用4进程                          │   │
│  │    ↓                                                │   │
│  │  ┌─────────────────────────────────────────────┐      │   │
│  │  │      4进程并发获取300只股票                        │      │   │
│  │  │                                                 │      │   │
│  │  │  进程1: [75只]  进程2: [75只]                      │      │   │
│  │  │  进程3: [75只]  进程4: [75只]                      │      │   │
│  │  │                                                 │      │   │
│  │  └─────────────────────────────────────────────┘      │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                               │
│  关键点：                                                  │
│  1. 队列内任务串行执行（一次只处理一个任务）                  │
│  2. 当前执行的任务内部根据阈值选择单/多进程                   │
│  3. 单个任务内部可以并发（4进程）                            │
└─────────────────────────────────────────────────────────────┘
```

### 2. 任务执行流程

```
1. 用户创建任务 (Java后端)
   ↓
2. 任务入队 (Python TaskQueueManager)
   ↓
3. 队列串行处理 (一个接一个)
   ↓
4. 当前任务出列
   ↓
5. 计算进程数 (根据股票数量阈值)
   ├─ ≤15只 → 单进程串行获取
   └─ ＞15只 → 4进程并发获取
   ↓
6. 收集结果并保存到Java
   ↓
7. 更新任务状态，取下一个任务
```

### 3. 阈值决策逻辑

```python
def calculate_optimal_processes(stock_count: int) -> int:
    """
    根据股票数量决定进程数

    队列串行，单个任务内部并发
    """
    if stock_count <= 15:
        return 1  # 单进程：避免进程创建开销
    else:
        return 4  # 4进程：并发优势显现
```

---

## 三、核心代码模块

### 1. `kline_sync_service.py` - 核心服务

**主要类**：

#### `MultiProcessFetcher`
```python
fetch(stock_codes, start_date, end_date)
```
- 自动选择进程数（基于阈值）
- 单进程：≤15只股票
- 4进程：＞15只股票
- 带重试机制（max_retries=2）

#### `TaskQueueManager`
```python
enqueue(task)        # 任务入队
start()              # 启动处理循环
execute_task(task)  # 执行单个任务
get_status()         # 获取队列状态
```

#### 数据模型
```python
SyncTask:
    - task_id: 任务ID
    - task_name: 任务名称
    - task_type: 任务类型 (single/watchlist/market/hs300)
    - stock_codes: 股票代码列表
    - date_range: 日期范围

SyncResult:
    - status: 任务状态
    - total_stocks: 总股票数
    - success_count: 成功数量
    - failed_count: 失败数量
    - elapsed_time: 耗时
```

### 2. `sync_routes.py` - API路由

**端点**：

| 端点 | 方法 | 说明 |
|------|------|------|
| `/api/sync/execute` | POST | 执行同步任务（通用） |
| `/api/sync/status/{task_id}` | GET | 查询任务状态 |
| `/api/sync/queue-status` | GET | 查询队列状态 |
| `/api/sync/execute-single` | POST | 单只股票同步 |
| `/api/sync/execute-watchlist` | POST | 自选股同步 |
| `/api/sync/execute-hs300` | POST | 沪深300同步 |
| `/api/sync/execute-market` | POST | 全市场同步 |

---

## 四、集成步骤

### 1. Python服务集成

在 `main.py` 中添加路由：

```python
from api.sync_routes import router as sync_router

app.include_router(sync_router)
```

### 2. Java后端调用

```java
// 单只股票同步
String url = "http://localhost:8001/api/sync/execute-single";
Map<String, Object> request = Map.of("stock_code", "600000");
restTemplate.postForObject(url, request, Map.class);

// 自选股同步
String url = "http://localhost:8001/api/sync/execute-watchlist";
Map<String, Object> request = Map.of("user_id", userId);
restTemplate.postForObject(url, request, Map.class);
```

### 3. 前端调用

```typescript
// 创建同步任务
const createTask = async (taskType: string, stockCodes?: string[]) => {
  const result = await api.post(`/api/sync/execute-${taskType}`, {
    task_id: Date.now(),
    task_name: `同步${taskType}`,
    stock_codes: stockCodes
  });
  return result;
};

// 查询任务状态
const pollTaskStatus = async (taskId: number) => {
  const result = await api.get(`/api/sync/status/${taskId}`);
  return result;
};
```

---

## 五、性能优化要点

### 1. 进程数决策

```python
def calculate_optimal_processes(stock_count: int) -> int:
    THRESHOLD = 15
    return 1 if stock_count <= THRESHOLD else 4
```

### 2. 均匀分配算法

```python
# 5只股票，4进程 → [2, 1, 1, 1]
# 10只股票，4进程 → [3, 3, 2, 2]
# 301只股票，4进程 → [76, 76, 75, 74]
```

### 3. 重试机制

- 每只股票最多重试2次
- 失败时重新登录后重试
- 保证100%数据完整性

### 4. 错开登录

- 进程间隔0.3秒错开登录
- 减少baostock会话冲突

---

## 六、测试验证

### 单元测试

```bash
cd py-service

# 阈值测试
python test_threshold.py

# 多进程验证
python test_multiprocess.py
```

### 集成测试

```bash
# 测试单只股票同步
curl -X POST http://localhost:8001/api/sync/execute-single?stock_code=600000

# 测试沪深300同步
curl -X POST http://localhost:8001/api/sync/execute-hs300

# 查询队列状态
curl http://localhost:8001/api/sync/queue-status
```

---

## 七、部署注意事项

1. **Python服务必须先启动** - Java后端依赖Python服务
2. **监控队列状态** - 避免任务堆积
3. **错误处理** - 失败任务自动重试
4. **资源限制** - 确保4进程不会导致系统资源耗尽

---

## 八、性能指标

| 场景 | 股票数 | 进程数 | 预期耗时 |
|------|--------|--------|----------|
| 单只股票 | 1 | 1 | ~0.5秒 |
| 自选股 | ~10 | 1 | ~5秒 |
| 沪深300 | 300 | 4 | ~15秒 |
| 全市场 | ~5000 | 4 | ~5分钟 |

---

**文档版本**: v1.0
**创建时间**: 2026-02-26
**基于测试**: 阈值测试(test_threshold.py)、多进程测试(test_multiprocess.py)
