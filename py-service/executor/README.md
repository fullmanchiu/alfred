# 任务执行器 (Task Executor)

## 概述

任务执行器是 Python 微服务的核心组件，负责执行定时任务和手动触发的任务。它使用 `ThreadPoolExecutor` 实现并发执行，并通过 Java API 持久化执行记录。

## 架构

```
APScheduler (调度器)
    ↓
execute_task_wrapper (调度器回调)
    ↓
submit_task (提交到执行器)
    ├─ 创建执行记录 (Java API)
    ├─ 幂等性检查
    └─ 提交到线程池
        ↓
execute_task (在线程池中执行)
    ├─ 更新状态为 RUNNING
    ├─ dispatch_task (分发到具体业务)
    └─ 更新状态为 COMPLETED/FAILED
```

## 主要组件

### 1. executor/task_executor.py

核心执行器模块，提供以下功能：

- **submit_task()**: 提交任务到执行器
- **execute_task()**: 执行任务（在线程池中运行）
- **dispatch_task()**: 根据任务类型分发到具体业务模块
- **get_running_tasks()**: 获取正在运行的任务
- **shutdown_executor()**: 关闭线程池

### 2. 线程池配置

```python
executor = ThreadPoolExecutor(max_workers=4)
```

- 最多 4 个并发任务
- 每个任务在独立线程中执行
- 自动管理线程生命周期

### 3. 幂等性保证

使用线程锁和字典防止重复执行：

```python
_running_tasks: Dict[str, str] = {}  # {task_name: execution_id}
_running_lock = Lock()
```

## 任务类型

### hello

测试任务，用于验证调度器工作正常。

**参数**:
```json
{
  "name": "World"
}
```

**返回**:
```json
{
  "message": "Hello, World!",
  "timestamp": "2024-02-18T00:00:00"
}
```

### sync_klines

K 线数据同步任务。

**参数**:
```json
{
  "stock_code": "601985",
  "task_id": 123
}
```

**返回**:
```json
{
  "success": true,
  "message": "同步成功",
  "records_count": 100
}
```

### calculate_indicators

技术指标计算任务。

**参数**:
```json
{
  "stock_code": "000001",
  "indicators": ["MA", "MACD"]
}
```

**返回**:
```json
{
  "stock_code": "000001",
  "indicators": ["MA", "MACD"],
  "message": "指标计算完成"
}
```

## 状态流转

```
PENDING (创建执行记录)
    ↓
RUNNING (开始执行)
    ↓
COMPLETED (成功) 或 FAILED (失败)
```

## API 集成

### 创建执行记录

```python
execution = java_client.create_execution(
    task_name="sync_klines_daily",
    task_type="sync_klines",
    params={"stock_code": "601985"}
)
```

### 更新执行状态

```python
java_client.update_execution_status(
    execution_id=execution['id'],
    status='RUNNING'
)
```

## 测试

### 单元测试

```bash
cd /Users/qiuliang/code/alfred/py-service
python3 tests/test_executor_unit.py
```

### 集成测试

参考 `tests/integration_test.md`

## 错误处理

1. **任务提交失败**: 记录日志，清除运行状态
2. **任务执行失败**: 更新状态为 FAILED，保存错误信息
3. **幂等性检查**: 相同任务正在运行时，跳过本次执行

## 注意事项

1. **线程安全**: 所有共享状态都使用锁保护
2. **资源清理**: 确保在 finally 块中清除运行状态
3. **日志记录**: 关键操作都有日志记录
4. **API 调用**: 所有 API 调用都有错误处理
