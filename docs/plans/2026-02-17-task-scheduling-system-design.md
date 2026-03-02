# Task 调度系统设计

> **创建时间:** 2026-02-17
> **目标:** 实现前端可创建、可监控的后台任务调度系统

---

## 概述

为 Alfred 添加完整的任务调度系统，支持前端创建任务（一次性/定时/周期性），实时查看任务状态和执行结果。

## 架构

```
前端 (React) → Java (8080) → Python (8001) → PostgreSQL
    创建任务      调度接口      执行 & 存储
    查看状态      WebSocket   定时触发
```

---

## 需求

### 功能需求
1. **任务类型**
   - **一次性任务**: 立即执行，执行一次即完成
   - **定时任务**: 按 Cron 表达式执行（每天 15:00）
   - **周期性任务**: 按间隔执行（每小时）

2. **任务管理**
   - 创建任务（选择类型、参数、调度规则）
   - 查看任务列表
   - 查看任务状态（pending/running/completed/failed）
   - 查看执行结果
   - 取消/删除任务
   - 启用/禁用任务

3. **任务监控**
   - 实时状态更新（WebSocket 推送）
   - 执行历史记录
   - 失败重试机制

### 技术栈
- **前端**: React + Ant Design
- **Java**: Spring Boot (调用 Python 任务 API)
- **Python**: FastAPI + APScheduler + SQLAlchemy
- **数据库**: PostgreSQL
- **通讯**: REST API + WebSocket

---

## 数据模型

### scheduled_tasks 表（定时任务定义）
```sql
CREATE TABLE scheduled_tasks (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) UNIQUE NOT NULL,
    task_type VARCHAR(100) NOT NULL,        -- sync_klines, calculate_indicators
    schedule_type VARCHAR(20) NOT NULL,     -- cron, interval, once
    cron_expr VARCHAR(100),                  -- "0 15 * * *"
    interval_seconds INTEGER,               -- 3600 (每小时)
    enabled BOOLEAN DEFAULT TRUE,
    params JSONB,                           -- {"stock_code": "000001"}
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
```

### task_executions 表（任务执行记录）
```sql
CREATE TABLE task_executions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_name VARCHAR(255) REFERENCES scheduled_tasks(name),
    status VARCHAR(20) NOT NULL,             -- pending, running, completed, failed
    retry_count INTEGER DEFAULT 0,
    max_retries INTEGER DEFAULT 3,
    started_at TIMESTAMP,
    completed_at TIMESTAMP,
    result JSONB,
    error TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);
```

---

## API 接口

### Python → Java

**1. 创建/更新任务**
```
POST /api/tasks/schedule
Request: { "name": "daily_sync", "task_type": "sync_klines", "schedule_type": "cron", "cron_expr": "0 15 * * *", "params": {...} }
Response: { "success": true, "task": {...} }
```

**2. 立即执行任务**
```
POST /api/tasks/execute
Request: { "task_type": "sync_klines", "params": {...} }
Response: { "success": true, "execution_id": "uuid" }
```

**3. 查询执行状态**
```
GET /api/tasks/executions/{execution_id}
Response: { "status": "completed", "result": {...} }
```

**4. 获取任务列表**
```
GET /api/tasks/scheduled
Response: { "tasks": [...] }
```

**5. 获取执行历史**
```
GET /api/tasks/executions?task_name={name}&limit=10
Response: { "executions": [...] }
```

### Java → 前端

**1. 创建任务**
```
POST /api/v1/tasks
Request: { "name": "股票同步", "taskType": "sync_klines", "scheduleType": "cron", ... }
```

**2. 任务列表**
```
GET /api/v1/tasks
```

**3. 任务状态**
```
GET /api/v1/tasks/{id}/status
```

**4. 取消任务**
```
POST /api/v1/tasks/{id}/cancel
```

---

## 核心组件

### Python 端

**1. TaskScheduler (APScheduler)**
- 扫描 scheduled_tasks 表
- 添加/移除定时任务
- 触发任务执行

**2. TaskExecutor**
- ThreadPoolExecutor 并发执行
- 更新执行状态
- 失败重试逻辑

**3. TaskService (FastAPI)**
- REST API 接口
- 任务 CRUD 操作

**4. WebSocket 推送**
- 状态变更通知
- 执行结果推送

### Java 端

**1. TaskController**
- 前端任务 API
- 调用 Python 任务服务

**2. TaskWebSocketHandler**
- 接收 Python 的状态推送
- 转发到前端

### 前端

**1. 任务创建页面**
- 表单：任务类型、参数、调度规则

**2. 任务列表页面**
- 显示所有任务
- 实时状态更新
- 查看执行历史

---

## 错误处理

**1. 重试策略**
- 网络错误：指数退避（1min, 5min, 30min）
- 数据错误：不重试
- 最大重试次数：3

**2. 幂等性**
- 执行前检查是否有 running 状态的相同任务
- 数据库行锁防止并发

**3. 超时处理**
- 任务超时时间：30 分钟
- 超时后标记为 failed，不再等待

---

## 日志

- 任务调度日志（创建/移除）
- 任务执行日志（开始/完成/失败）
- 重试日志
- 使用已有的 request-id 透传机制

---

## 测试

**单元测试**
- APScheduler 配置测试
- 任务执行器测试
- 重试逻辑测试

**集成测试**
- 创建定时任务
- 执行一次性任务
- 验证状态更新

**端到端测试**
- 前端创建任务
- 验证执行
- 查看结果
