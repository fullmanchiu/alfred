# Task 调度系统实施计划

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**目标:** 实现前端可创建、可监控的后台任务调度系统

**架构:** Java 后端 (8080) 调用 Python 微服务 (8001) 的任务 API，Python 使用 APScheduler 执行定时任务，PostgreSQL 持久化。

**技术栈:** APScheduler, SQLAlchemy, PostgreSQL, React, Ant Design

---

## Task 1: Python 数据库模型和迁移

**Files:**
- Create: `py-service/models/scheduled_task.py`
- Create: `py-service/models/task_execution.py`
- Create: `py-service/migrations/versions/XXX_create_tasks_tables.py`

**Step 1: 创建 ScheduledTask 模型**

```python
from sqlalchemy import Column, Integer, String, Boolean, DateTime, JSON
from sqlalchemy.ext.declarative import declarative_base

Base = declarative_base()

class ScheduledTask(Base):
    __tablename__ = 'scheduled_tasks'

    id = Column(Integer, primary_key=True)
    name = Column(String(255), unique=True, nullable=False)
    task_type = Column(String(100), nullable=False)
    schedule_type = Column(String(20), nullable=False)  # cron, interval, once
    cron_expr = Column(String(100), nullable=True)
    interval_seconds = Column(Integer, nullable=True)
    enabled = Column(Boolean, default=True)
    params = Column(JSON, nullable=True)
    created_at = Column(DateTime, nullable=False)
    updated_at = Column(DateTime, nullable=False)
```

**Step 2: 创建 TaskExecution 模型**

```python
from sqlalchemy import Column, String, DateTime, Integer, JSON
import uuid
from enum import Enum

class ExecutionStatus(str, Enum):
    PENDING = "pending"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"

class TaskExecution(Base):
    __tablename__ = 'task_executions'

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    task_name = Column(String(255), nullable=False)
    status = Column(String(20), nullable=False)
    retry_count = Column(Integer, default=0)
    max_retries = Column(Integer, default=3)
    started_at = Column(DateTime, nullable=True)
    completed_at = Column(DateTime, nullable=True)
    result = Column(JSON, nullable=True)
    error = Column(String, nullable=True)
    created_at = Column(DateTime, nullable=False)
```

**Step 3: 创建数据库迁移**

```python
"""create tasks tables

Revision ID: XXX
Revises:
Create Date: 2026-02-17

"""
from alembic import op
import sqlalchemy as sa

def upgrade():
    op.create_table('scheduled_tasks',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('name', sa.String(length=255), nullable=False),
        sa.Column('task_type', sa.String(length=100), nullable=False),
        sa.Column('schedule_type', sa.String(length=20), nullable=False),
        sa.Column('cron_expr', sa.String(length=100), nullable=True),
        sa.Column('interval_seconds', sa.Integer(), nullable=True),
        sa.Column('enabled', sa.Boolean(), nullable=False),
        sa.Column('params', sa.JSON(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False)
    )
    op.create_index('scheduled_tasks', 'ix_scheduled_tasks_name', ['name'])

    op.create_table('task_executions',
        sa.Column('id', sa.String(length=36), nullable=False),
        sa.Column('task_name', sa.String(length=255), nullable=False),
        sa.Column('status', sa.String(length=20), nullable=False),
        sa.Column('retry_count', sa.Integer(), nullable=False),
        sa.Column('max_retries', sa.Integer(), nullable=False),
        sa.Column('started_at', sa.DateTime(), nullable=True),
        sa.Column('completed_at', sa.DateTime(), nullable=True),
        sa.Column('result', sa.JSON(), nullable=True),
        sa.Column('error', sa.String(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False)
    )
    op.create_index('task_executions', 'ix_task_executions_task_name', ['task_name'])

def downgrade():
    op.drop_index('task_executions', 'ix_task_executions_task_name')
    op.drop_table('task_executions')
    op.drop_index('scheduled_tasks', 'ix_scheduled_tasks_name')
    op.drop_table('scheduled_tasks')
```

**Step 4: 运行迁移**

```bash
cd py-service
source venv/bin/activate
alembic revision -m "create tasks tables"
# 编辑生成的迁移文件
alembic upgrade head
```

**Step 5: 验证**

```bash
python -c "from models.scheduled_task import ScheduledTask; print('Models loaded successfully')"
```

**Step 6: Commit**

```bash
git add py-service/models/ py-service/migrations/
git commit -m "feat: add task scheduling database models"
```

---

## Task 2: Python 任务调度器 (APScheduler)

**Files:**
- Create: `py-service/scheduler/task_scheduler.py`
- Create: `py-service/scheduler/__init__.py`

**Step 1: 创建任务调度器**

```python
from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.cron import CronTrigger
from apscheduler.triggers.interval import IntervalTrigger
from logging_config import get_logger
from models.scheduled_task import ScheduledTask
from executor.task_executor import execute_task_wrapper

logger = get_logger('task_scheduler')

scheduler = BackgroundScheduler()

def sync_scheduled_tasks():
    """从数据库同步任务到调度器"""
    tasks = ScheduledTask.query.filter_by(enabled=True).all()

    for task in tasks:
        # 移除旧任务
        if scheduler.get_job(task.name):
            scheduler.remove_job(task.name)

        # 添加新任务
        if task.schedule_type == 'cron' and task.cron_expr:
            scheduler.add_job(
                func=execute_task_wrapper,
                trigger=CronTrigger.from_crontab(task.cron_expr),
                id=task.name,
                args=[task.name],
                name=task.name
            )
        elif task.schedule_type == 'interval' and task.interval_seconds:
            scheduler.add_job(
                func=execute_task_wrapper,
                trigger=IntervalTrigger(seconds=task.interval_seconds),
                id=task.name,
                args=[task.name],
                name=task.name
            )

    logger.info(f"已同步 {len(tasks)} 个定时任务到调度器")

def start_scheduler():
    """启动调度器"""
    sync_scheduled_tasks()
    scheduler.start()
    logger.info("任务调度器已启动")

def stop_scheduler():
    """停止调度器"""
    scheduler.shutdown()
    logger.info("任务调度器已停止")
```

**Step 2: 在 main.py 中启动调度器**

```python
# 在 startup_event 中
@app.on_event("startup")
async def startup_event():
    # ... 现有代码 ...

    from scheduler.task_scheduler import start_scheduler
    start_scheduler()
    logger.info("任务调度器已初始化")

@app.on_event("shutdown")
async def shutdown_event():
    from scheduler.task_scheduler import stop_scheduler
    stop_scheduler()
```

**Step 3: 安装依赖**

```bash
pip install apscheduler
```

**Step 4: 验证**

```bash
python -c "from scheduler.task_scheduler import scheduler; print('Scheduler imported')"
```

**Step 5: Commit**

```bash
git add py-service/scheduler/ py-service/main.py
git commit -m "feat: add APScheduler-based task scheduler"
```

---

## Task 3: Python 任务执行器

**Files:**
- Create: `py-service/executor/task_executor.py`
- Create: `py-service/executor/__init__.py`

**Step 1: 创建任务执行器**

```python
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime
from logging_config import get_logger
from models.scheduled_task import ScheduledTask
from models.task_execution import TaskExecution, ExecutionStatus
from sqlalchemy.orm import select

logger = get_logger('task_executor')

executor = ThreadPoolExecutor(max_workers=4)

def execute_task_wrapper(task_name: str):
    """调度器回调，创建执行记录并执行"""
    try:
        # 创建执行记录
        execution = TaskExecution(
            task_name=task_name,
            status=ExecutionStatus.PENDING
        )
        execution.save()

        # 提交到线程池执行
        executor.submit(execute_task, execution.id)

    except Exception as e:
        logger.error(f"任务创建失败: {task_name}, error: {str(e)}")

def execute_task(execution_id: str):
    """执行任务"""
    execution = TaskExecution.get_by_id(execution_id)
    if not execution:
        logger.error(f"执行记录不存在: {execution_id}")
        return

    try:
        # 检查幂等性：是否有相同任务正在运行
        if not acquire_lock(execution.task_name):
            execution.update(
                status=ExecutionStatus.FAILED,
                error="任务已在运行中"
            )
            return

        # 获取任务定义
        task = ScheduledTask.get_by_name(execution.task_name)
        if not task:
            raise ValueError(f"任务不存在: {execution.task_name}")

        # 更新状态为运行中
        execution.update(
            status=ExecutionStatus.RUNNING,
            started_at=datetime.now()
        )

        # 执行实际业务逻辑
        result = dispatch_task(task.task_type, task.params)

        # 完成
        execution.update(
            status=ExecutionStatus.COMPLETED,
            completed_at=datetime.now(),
            result=result
        )

    except Exception as e:
        logger.error(f"任务执行失败: {execution.task_name}, error: {str(e)}")

        # 重试逻辑
        if execution.retry_count < execution.max_retries:
            execution.update(
                retry_count=execution.retry_count + 1,
                status=ExecutionStatus.PENDING
            )
        else:
            execution.update(
                status=ExecutionStatus.FAILED,
                error=str(e),
                completed_at=datetime.now()
            )

def acquire_lock(task_name: str) -> bool:
    """获取任务锁（幂等性）"""
    with get_db_session() as session:
        task = session.execute(
            select(ScheduledTask)
            .where(ScheduledTask.name == task_name)
            .with_for_update()
        ).scalar_one()

        # 检查是否有正在运行的任务
        running = session.execute(
            select(TaskExecution)
            .where(TaskExecution.task_name == task_name)
            .where(TaskExecution.status == ExecutionStatus.RUNNING)
        ).first()

        return running is None

def dispatch_task(task_type: str, params: dict):
    """根据任务类型分发到具体业务模块"""
    if task_type == "sync_klines":
        from scheduler import sync_klines
        return sync_klines.execute_sync(**params)
    elif task_type == "calculate_indicators":
        from modules import technical_analysis
        # 实现指标计算
        return {"status": "success", "data": {}}
    else:
        raise ValueError(f"未知任务类型: {task_type}")
```

**Step 2: 验证**

```bash
python -c "from executor.task_executor import execute_task; print('Executor imported')"
```

**Step 3: Commit**

```bash
git add py-service/executor/
git commit -m "feat: add task executor with ThreadPoolExecutor"
```

---

## Task 4: Python 任务 API (FastAPI)

**Files:**
- Create: `py-service/api/tasks.py`
- Modify: `py-service/main.py` (include router)

**Step 1: 创建任务 API**

```python
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional, Dict, Any
from models.scheduled_task import ScheduledTask
from models.task_execution import TaskExecution, ExecutionStatus
from sqlalchemy.orm import select
import uuid

router = APIRouter(prefix="/api/tasks", tags=["tasks"])

class ScheduleTaskRequest(BaseModel):
    name: str
    task_type: str
    schedule_type: str  # cron, interval, once
    cron_expr: Optional[str] = None
    interval_seconds: Optional[int] = None
    enabled: bool = True
    params: Dict[str, Any] = {}

class ExecuteTaskRequest(BaseModel):
    task_type: str
    params: Dict[str, Any] = {}

@router.post("/schedule")
async def schedule_task(request: ScheduleTask):
    """创建或更新定时任务"""
    # 检查任务是否已存在
    task = ScheduledTask.get_by_name(request.name)

    if task:
        # 更新
        task.task_type = request.task_type
        task.schedule_type = request.schedule_type
        task.cron_expr = request.cron_expr
        task.interval_seconds = request.interval_seconds
        task.enabled = request.enabled
        task.params = request.params
        task.save()
    else:
        # 创建
        task = ScheduledTask(
            name=request.name,
            task_type=request.task_type,
            schedule_type=request.schedule_type,
            cron_expr=request.cron_expr,
            interval_seconds=request.interval_seconds,
            enabled=request.enabled,
            params=request.params
        )
        task.save()

    # 通知调度器重新加载
    from scheduler.task_scheduler import sync_scheduled_tasks
    sync_scheduled_tasks()

    return {"success": True, "task": task.to_dict()}

@router.post("/execute")
async def execute_task(request: ExecuteTaskRequest):
    """立即执行任务"""
    execution_id = str(uuid.uuid4())

    # 创建执行记录
    execution = TaskExecution(
        id=execution_id,
        task_name=f"once_{execution_id}",
        task_type=request.task_type,
        status=ExecutionStatus.PENDING,
        params=request.params,
        max_retries=3
    )
    execution.save()

    # 提交执行
    from executor.task_executor import execute_task
    execute_task(execution_id)

    return {"success": True, "execution_id": execution_id}

@router.get("/scheduled")
async def list_scheduled_tasks():
    """获取所有定时任务"""
    tasks = ScheduledTask.query.all()
    return {"tasks": [t.to_dict() for t in tasks]}

@router.get("/executions/{execution_id}")
async def get_execution(execution_id: str):
    """查询执行状态"""
    execution = TaskExecution.get_by_id(execution_id)
    if not execution:
        raise HTTPException(status_code=404, detail="执行记录不存在")
    return execution.to_dict()

@router.get("/executions")
async def list_executions(task_name: str = None, limit: int = 10):
    """获取执行历史"""
    query = TaskExecution.query

    if task_name:
        query = query.filter_by(task_name=task_name)

    query = query.order_by(TaskExecution.created_at.desc())
    query = query.limit(limit)

    executions = query.all()
    return {"executions": [e.to_dict() for e in executions]}
```

**Step 2: 注册路由**

```python
# 在 main.py 中
from api.tasks import router as tasks_router

app.include_router(tasks_router)
```

**Step 3: 验证**

```bash
curl http://localhost:8001/api/tasks/scheduled
```

**Step 4: Commit**

```bash
git add py-service/api/tasks.py py-service/main.py
git commit -m "feat: add task scheduling API endpoints"
```

---

## Task 5: Java 任务服务客户端

**Files:**
- Create: `backend/src/main/kotlin/com/colafan/alfred/service/PythonTaskService.kt`
- Create: `backend/src/main/kotlin/com/colafan/alfred/dto/task/TaskDTO.kt`

**Step 1: 创建任务 DTO**

```kotlin
package com.colafan.alfred.dto.task

data class ScheduleTaskRequest(
    val name: String,
    val taskType: String,
    val scheduleType: String,  // cron, interval, once
    val cronExpr: String? = null,
    val intervalSeconds: Int? = null,
    val enabled: Boolean = true,
    val params: Map<String, Any> = emptyMap()
)

data class TaskExecutionResponse(
    val executionId: String,
    val status: String,
    val result: Map<String, Any>?,
    val error: String?
)

data class TaskListResponse(
    val tasks: List<ScheduledTaskDTO>
)

data class ScheduledTaskDTO(
    val id: Int?,
    val name: String,
    val taskType: String,
    val scheduleType: String,
    val cronExpr: String?,
    val intervalSeconds: Int?,
    val enabled: Boolean,
    val params: Map<String, Any>?
)
```

**Step 2: 创建任务服务客户端**

```kotlin
package com.colafan.alfred.service

import com.colafan.alfred.dto.task.*
import com.colafan.alfred.websocket.MessageHandler
import org.slf4j.LoggerFactory
import org.springframework.stereotype.Service

@Service
class PythonTaskService(
    private val messageHandler: MessageHandler
) {
    private val logger = LoggerFactory.getLogger(PythonTaskService::class.java)

    fun scheduleTask(request: ScheduleTaskRequest): ScheduledTaskDTO {
        val response = messageHandler.sendRequest(
            action = "tasks.schedule",
            payload = mapOf(
                "name" to request.name,
                "task_type" to request.taskType,
                "schedule_type" to request.scheduleType,
                "cron_expr" to request.cronExpr,
                "interval_seconds" to request.intervalSeconds,
                "enabled" to request.enabled,
                "params" to request.params
            )
        )

        if (response?.payload?.get("success") == true) {
            @Suppress("UNCHECKED_CAST")
            return mapToTaskDTO(response.payload["data"] as Map<String, Any>)
        }

        throw RuntimeException("创建任务失败")
    }

    fun executeTask(taskType: String, params: Map<String, Any>): String {
        val response = messageHandler.sendRequest(
            action = "tasks.execute",
            payload = mapOf(
                "task_type" to taskType,
                "params" to params
            )
        )

        if (response?.payload?.get("success") == true) {
            @Suppress("UNCHECKED_CAST")
            return response.payload["data"]["execution_id"] as String
        }

        throw RuntimeException("执行任务失败")
    }

    fun listTasks(): List<ScheduledTaskDTO> {
        val response = messageHandler.sendRequest(
            action = "tasks.list_scheduled",
            payload = emptyMap()
        )

        if (response?.payload?.get("success") == true) {
            @Suppress("UNCHECKED_CAST")
            val tasks = response.payload["data"]["tasks"] as List<Map<String, Any>>
            return tasks.map { mapToTaskDTO(it) }
        }

        return emptyList()
    }

    fun getExecution(executionId: String): TaskExecutionResponse? {
        val response = messageHandler.sendRequest(
            action = "tasks.get_execution",
            payload = mapOf("execution_id" to executionId)
        )

        if (response?.payload?.get("success") == true) {
            @Suppress("UNCHECKED_CAST")
            val data = response.payload["data"] as Map<String, Any>
            return TaskExecutionResponse(
                executionId = data["execution_id"] as String,
                status = data["status"] as String,
                result = data["result"] as? Map<String, Any>,
                error = data["error"] as? String
            )
        }

        return null
    }

    private fun mapToTaskDTO(data: Map<String, Any>): ScheduledTaskDTO {
        return ScheduledTaskDTO(
            id = data["id"] as? Int,
            name = data["name"] as String,
            taskType = data["task_type"] as String,
            scheduleType = data["schedule_type"] as String,
            cronExpr = data["cron_expr"] as? String,
            intervalSeconds = data["interval_seconds"] as? Int?,
            enabled = data["enabled"] as Boolean,
            params = data["params"] as? Map<String, Any>
        )
    }
}
```

**Step 3: 验证编译**

```bash
cd backend && ./gradlew compileKotlin
```

**Step 4: Commit**

```bash
git add backend/src/main/kotlin/com/colafan/alfred/service/PythonTaskService.kt
git add backend/src/main/kotlin/com/colafan/alfred/dto/task/
git commit -m "feat: add Python task service client"
```

---

## Task 6: Java 任务 Controller

**Files:**
- Create: `backend/src/main/kotlin/com/colafan/alfred/controller/TaskController.kt`
- Modify: `backend/src/main/resources/application.yml` (添加配置)

**Step 1: 创建任务 Controller**

```kotlin
package com.colafan.alfred.controller

import com.colafan.alfred.dto.task.*
import com.colafan.alfred.service.PythonTaskService
import org.springframework.web.bind.annotation.*

@RestController
@RequestMapping("/api/v1/tasks")
class TaskController(
    private val taskService: PythonTaskService
) {

    @PostMapping
    fun createTask(@RequestBody request: ScheduleTaskRequest): ResponseEntity<Map<String, Any>> {
        val task = taskService.scheduleTask(request)
        return ResponseEntity.ok(mapOf(
            "success" to true,
            "task" to task
        ))
    }

    @GetMapping
    fun listTasks(): ResponseEntity<TaskListResponse> {
        val tasks = taskService.listTasks()
        return ResponseEntity.ok(TaskListResponse(tasks))
    }

    @GetMapping("/{id}/status")
    fun getTaskStatus(@PathVariable id: String): ResponseEntity<Map<String, Any>> {
        // 支持按任务名称或执行ID查询
        val execution = taskService.getExecution(id)

        if (execution != null) {
            return ResponseEntity.ok(mapOf(
                "success" to true,
                "execution" to execution
            ))
        }

        return ResponseEntity.notFound().build()
    }

    @PostMapping("/{id}/cancel")
    fun cancelTask(@PathVariable id: String): ResponseEntity<Map<String, Any>> {
        // TODO: 实现取消逻辑
        return ResponseEntity.ok(mapOf(
            "success" to true,
            "message" to "任务已取消"
        ))
    }
}
```

**Step 2: 添加配置**

```yaml
# application.yml
app:
  python:
    websocket-url: ws://localhost:8001/ws
    task:
      # 任务相关配置
      timeout: 1800  # 30分钟
```

**Step 3: 验证**

```bash
cd backend && ./gradlew compileKotlin
```

**Step 4: Commit**

```bash
git add backend/src/main/kotlin/com/colafan/alfred/controller/TaskController.kt
git add backend/src/main/resources/application.yml
git commit -m "feat: add task controller for frontend API"
```

---

## Task 7: Python action handlers（任务调度支持）

**Files:**
- Modify: `py-service/action_handlers.py`

**Step 1: 添加任务调度 action**

```python
@register_action("tasks.schedule")
def action_schedule_task(payload: Dict[str, Any]) -> ActionResult:
    """创建或更新定时任务"""
    from models.scheduled_task import ScheduledTask
    from scheduler.task_scheduler import sync_scheduled_tasks

    name = payload.get("name")
    if not name:
        return ActionResult(success=False, code=400, message="缺少 name 参数")

    # 检查任务类型
    task_type = payload.get("task_type")
    if task_type not in ["sync_klines", "calculate_indicators"]:
        return ActionResult(success=False, code=400, message=f"不支持的任务类型: {task_type}")

    # 检查调度类型
    schedule_type = payload.get("schedule_type")
    if schedule_type not in ["cron", "interval", "once"]:
        return ActionResult(success=False, code=400, message="schedule_type 必须是 cron/interval/once")

    # 获取或创建任务
    task = ScheduledTask.get_by_name(name)

    if task:
        task.task_type = task_type
        task.schedule_type = schedule_type
        task.cron_expr = payload.get("cron_expr")
        task.interval_seconds = payload.get("interval_seconds")
        task.enabled = payload.get("enabled", True)
        task.params = payload.get("params", {})
        task.save()
    else:
        task = ScheduledTask(
            name=name,
            task_type=task_type,
            schedule_type=schedule_type,
            cron_expr=payload.get("cron_expr"),
            interval_seconds=payload.get("interval_seconds"),
            enabled=payload.get("enabled", True),
            params=payload.get("params", {})
        )
        task.save()

    # 重新加载调度器
    sync_scheduled_tasks()

    return ActionResult(
        success=True,
        data=task.to_dict(),
        message="任务已创建/更新"
    )

@register_action("tasks.execute")
def action_execute_task(payload: Dict[str, Any]) -> ActionResult:
    """立即执行任务"""
    import uuid
    from models.task_execution import TaskExecution, ExecutionStatus
    from executor.task_executor import execute_task

    task_type = payload.get("task_type")
    params = payload.get("params", {})

    execution_id = str(uuid.uuid4())

    execution = TaskExecution(
        id=execution_id,
        task_name=f"once_{execution_id}",
        task_type=task_type,
        status=ExecutionStatus.PENDING,
        params=params,
        max_retries=3
    )
    execution.save()

    # 异步执行
    import threading
    thread = threading.Thread(target=execute_task, args=(execution_id,), daemon=True)
    thread.start()

    return ActionResult(
        success=True,
        data={"execution_id": execution_id},
        message="任务已提交"
    )

@register_action("tasks.list_scheduled")
def action_list_scheduled_tasks(payload: Dict[str, Any]) -> ActionResult:
    """获取所有定时任务"""
    from models.scheduled_task import ScheduledTask

    tasks = ScheduledTask.query.all()

    return ActionResult(
        success=True,
        data={"tasks": [t.to_dict() for t in tasks]}
    )

@register_action("tasks.get_execution")
def action_get_execution(payload: Dict[str, Any]) -> ActionResult:
    """查询执行状态"""
    from models.task_execution import TaskExecution

    execution_id = payload.get("execution_id")
    if not execution_id:
        return ActionResult(success=False, code=400, message="缺少 execution_id")

    execution = TaskExecution.get_by_id(execution_id)
    if not execution:
        return ActionResult(success=False, code=404, message="执行记录不存在")

    return ActionResult(
        success=True,
        data=execution.to_dict()
    )
```

**Step 2: 验证**

```bash
python -c "from action_handlers import invoke; result = invoke('tasks.list_scheduled', {}); print(result)"
```

**Step 3: Commit**

```bash
git add py-service/action_handlers.py
git commit -m "feat: add task scheduling action handlers"
```

---

## Task 8: 前端任务管理页面

**Files:**
- Create: `frontend/src/pages/Tasks.tsx`
- Create: `frontend/src/components/TaskForm.tsx`
- Modify: `frontend/src/App.tsx` (添加路由)

**Step 1: 创建任务表单组件**

```tsx
import { Form, Input, Select, Button, Switch, DatePicker, TimePicker } from 'antd';
import { ScheduleTaskRequest } from '@/types/task';

interface TaskFormProps {
  onSubmit: (task: ScheduleTaskRequest) => void;
}

const TaskForm: React.FC<TaskFormProps> = ({ onSubmit }) => {
  const [form] = Form.useForm();

  const handleSubmit = (values: any) => {
    const task: ScheduleTaskRequest = {
      name: values.name,
      taskType: values.taskType,
      scheduleType: values.scheduleType,
      cronExpr: values.cronExpr,
      intervalSeconds: values.intervalSeconds,
      enabled: values.enabled ?? true,
      params: values.params || {}
    };
    onSubmit(task);
  };

  return (
    <Form form={form} layout="vertical" onFinish={handleSubmit}>
      <Form.Item name="name" label="任务名称" rules={[{ required: true }]}>
        <Input placeholder="例如: daily_sync_000001" />
      </Form.Item>

      <Form.Item name="taskType" label="任务类型" rules={[{ required: true }]}>
        <Select placeholder="选择任务类型">
          <Select.Option value="sync_klines">股票数据同步</Select.Option>
          <Select.Option value="calculate_indicators">技术指标计算</Select.Option>
        </Select>
      </Form.Item>

      <Form.Item name="scheduleType" label="调度类型" rules={[{ required: true }]}>
        <Select placeholder="选择调度类型">
          <Select.Option value="cron">Cron 表达式</Select.Option>
          <Select.Option value="interval">固定间隔</Select.Option>
          <Select.Option value="once">立即执行一次</Select.Option>
        </Select>
      </Form.Item>

      <Form.Item noStyle shouldUpdate={(prev, next) => {
        const scheduleType = form.getFieldValue('scheduleType');
        return scheduleType !== 'once';
      }}>
        <Form.Item name="cronExpr" label="Cron 表达式" dependency={['scheduleType']}>
          <Input placeholder="0 15 * * *" />
        </Form.Item>
      </Form.Item>

      <Form.Item noStyle shouldUpdate={(prev, next) => {
        const scheduleType = form.getFieldValue('scheduleType');
        return scheduleType === 'interval';
      }}>
        <Form.Item name="intervalSeconds" label="间隔秒数" dependency={['scheduleType']}>
          <Input type="number" placeholder="3600 (每小时)" />
        </Form.Item>
      </Form.Item>

      <Form.Item name="enabled" label="启用" valuePropName="checked">
        <Switch checkedChildren={["启用", "禁用"]} />
      </Form.Item>

      <Form.Item>
        <Button type="primary" htmlType="submit">创建任务</Button>
      </Form.Item>
    </Form>
  );
};

export default TaskForm;
```

**Step 2: 创建任务列表页面**

```tsx
import { useEffect, useState } from 'react';
import { Table, Button, Tag, Space, Card, Modal } from 'antd';
import { api } from '@/services/api';
import type { TaskInfo, TaskExecution } from '@/types/task';
import TaskForm from '@/components/TaskForm';

const Tasks: React.FC = () => {
  const [tasks, setTasks] = useState<TaskInfo[]>([]);
  const [executions, setExecutions] = useState<Record<string, TaskExecution[]>>({});
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<TaskExecution[]>([]);

  useEffect(() => {
    fetchTasks();
    // 轮询更新状态
    const interval = setInterval(fetchTasks, 5000);
    return () => clearInterval(interval);
  }, []);

  const fetchTasks = async () => {
    try {
      const response = await api.getTasks();
      setTasks(response.tasks || []);

      // 获取每个任务的最新执行状态
      for (const task of response.tasks || []) {
        const history = await api.getTaskExecutions(task.name);
        setExecutions(prev => ({
          ...prev,
          [task.name]: history.executions
        }));
      }
    } catch (error) {
      console.error('Failed to fetch tasks:', error);
    }
  };

  const showHistory = async (taskName: string) => {
    const history = await api.getTaskExecutions(taskName);
    setSelectedTask(history.executions);
    setIsModalOpen(true);
  };

  const columns = [
    { title: '任务名称', dataIndex: 'name', key: 'name' },
    { title: '类型', dataIndex: 'taskType', key: 'taskType' },
    {
      title: '调度类型',
      dataIndex: 'scheduleType',
      key: 'scheduleType',
      render: (type: string) => {
        const map = { cron: 'Cron', interval: '间隔', once: '一次性' };
        return map[type as keyof typeof map] || type;
      }
    },
    { title: '调度规则', dataIndex: 'scheduleType', key: 'rule' },
    { title: '状态', dataIndex: 'enabled', render: (enabled: boolean) => (
      <Tag color={enabled ? 'success' : 'default'}>{enabled ? '启用' : '禁用'}</Tag>
    )},
    {
      title: '操作',
      key: 'actions',
      render: (_, record) => (
        <Space>
          <Button size="small" onClick={() => showHistory(record.name)}>
            查看历史
          </Button>
        </Space>
      )
    }
  ];

  const historyColumns = [
    { title: '执行ID', dataIndex: 'executionId', key: 'executionId', ellipsis: true },
    { title: '状态', dataIndex: 'status', key: 'status' },
    { title: '重试次数', dataIndex: 'retryCount', key: 'retryCount' },
    { title: '结果', dataIndex: 'result', key: 'result', render: (result: any) => (
      <span style={{ fontSize: 12 }}>{JSON.stringify(result)}</span>
    )},
    { title: '错误', dataIndex: 'error', key: 'error', ellipsis: true }
  ];

  return (
    <div style={{ padding: 24 }}>
      <Card
        title="任务管理"
        extra={
          <Button type="primary" onClick={() => setIsModalOpen(true)}>
            创建任务
          </Button>
        }
      >
        <Table
          columns={columns}
          dataSource={tasks}
          rowKey="name"
        />
      </Card>

      <Modal
        title="创建任务"
        open={isModalOpen}
        onCancel={() => setIsModalOpen(false)}
        footer={null}
      >
        <TaskForm
          onSubmit={async (task) => {
            await api.createTask(task);
            setIsModalOpen(false);
            fetchTasks();
          }}
        />
      </Modal>

      <Modal
        title="执行历史"
        open={isModalOpen}
        onCancel={() => setIsModalOpen(false)}
        width={800}
      >
        <Table
          columns={historyColumns}
          dataSource={selectedTask}
          rowKey="executionId"
          pagination={{ pageSize: 10 }}
        />
      </Modal>
    </div>
  );
};

export default Tasks;
```

**Step 3: 添加类型定义**

```typescript
// frontend/src/types/task.ts
export interface TaskInfo {
  id?: number;
  name: string;
  taskType: string;
  scheduleType: string;
  cronExpr?: string;
  intervalSeconds?: number;
  enabled: boolean;
  params?: Record<string, any>;
}

export interface TaskExecution {
  executionId: string;
  status: string;
  retryCount: number;
  result?: Record<string, any>;
  error?: string;
}

export interface ScheduleTaskRequest {
  name: string;
  taskType: string;
  scheduleType: string;
  cronExpr?: string;
  intervalSeconds?: number;
  enabled?: boolean;
  params?: Record<string, any>;
}
```

**Step 4: 添加 API 服务**

```typescript
// frontend/src/services/api.ts
export const taskApi = {
  getTasks: () => api.get<{ tasks: TaskInfo[] }>('/api/v1/tasks'),
  createTask: (task: ScheduleTaskRequest) => api.post('/api/v1/tasks', task),
  getTaskStatus: (id: string) => api.get<{ execution: TaskExecution }>(`/api/v1/tasks/${id}/status`),
  cancelTask: (id: string) => api.post(`/api/v1/tasks/${id}/cancel`),
  getTaskExecutions: (taskName: string) => api.get<{ executions: TaskExecution[] }>(`/api/v1/tasks/executions?taskName=${taskName}`)
};

// 添加到 api 对象中
const api = {
  // ... 现有方法 ...
  ...taskApi
};
```

**Step 5: 添加路由**

```tsx
// App.tsx
import Tasks from '@/pages/Tasks';

// 添加路由
<Route path="/tasks" element={<Tasks />} />
```

**Step 6: 验证**

```bash
cd frontend && npm run build
```

**Step 7: Commit**

```bash
git add frontend/src/pages/Tasks.tsx frontend/src/components/TaskForm.tsx
git add frontend/src/types/task.ts frontend/src/services/api.ts frontend/src/App.tsx
git commit -m "feat: add task management UI"
```

---

## Task 9: WebSocket 状态推送

**Files:**
- Modify: `py-service/websocket/message_router.py` (添加任务状态推送)
- Create: `backend/src/main/kotlin/com/colafan/alfred/websocket/TaskStatusHandler.kt`
- Modify: `backend/src/main/kotlin/com/colafan/alfred/config/WebSocketConfig.kt` (注册处理器)
- Modify: `frontend/src/pages/Tasks.tsx` (接收状态更新)

**Step 1: Python 端添加状态推送**

```python
# message_router.py 中添加
def push_task_status(task_name: str, execution_data: dict):
    """推送任务状态到 Java"""
    from connection_manager import manager

    message = WebSocketMessage(
        type=MessageType.NOTIFICATION,
        payload={
            "action": "task.status_update",
            "task_name": task_name,
            "execution": execution_data
        }
    )

    # 广播到所有连接（包括 Java）
    for connection in manager.active_connections:
        try:
            import asyncio
            asyncio.create_task(connection.send_text(message.model_dump_json()))
        except:
            pass

# 在执行器中调用
def execute_task(execution_id: str):
    # ... 执行逻辑 ...

    # 状态变更时推送
    push_task_status(execution.task_name, execution.to_dict())
```

**Step 2: Java 端接收状态更新**

```kotlin
@Component
class TaskStatusHandler : WebSocketMessageListener {

    @Autowired
    private val simpMessagingTemplate: SimpMessagingTemplate

    fun handleMessage(payload: Map<String, Any>) {
        val action = payload["action"]?.toString()

        if (action == "task.status_update") {
            val taskName = payload["task_name"]?.toString()
            val execution = payload["execution"] as Map<*, *>

            // 推送到前端
            simpMessagingTemplate.convertAndSend(
                "/topic/task-status",
                mapOf("taskName" to taskName, "execution" to execution)
            )
        }
    }
}
```

**Step 3: 前端接收状态更新**

```tsx
// Tasks.tsx 中添加 WebSocket 监听
import { useEffect } from 'react';
import { Stomp } from '@stomp/stompjs';

useEffect(() => {
  const socket = new SockJS('/api/ws');
  const stompClient = Stomp.over(socket);

  stompClient.connect({}, () => {
    stompClient.subscribe('/topic/task-status', (message) => {
      const update = JSON.parse(message.body);
      // 更新任务状态
      setExecutions(prev => ({
        ...prev,
        [update.taskName]: [...(prev[update.taskName] || []), update.execution]
      }));
    });
  });

  return () => {
    stompClient.disconnect();
  };
}, []);
```

**Step 4: Commit**

```bash
git add py-service/websocket/message_router.py
git add backend/src/main/kotlin/com/colafan/alfred/websocket/TaskStatusHandler.kt
git add backend/src/main/kotlin/com/colafan/alfred/config/WebSocketConfig.kt
git add frontend/src/pages/Tasks.tsx
git commit -m "feat: add WebSocket-based task status push"
```

---

## Task 10: 测试

**Step 1: Python 单元测试**

```python
# tests/test_task_scheduler.py
import pytest
from scheduler.task_scheduler import scheduler
from models.scheduled_task import ScheduledTask

def test_add_scheduled_task():
    task = ScheduledTask(
        name="test_task",
        task_type="sync_klines",
        schedule_type="cron",
        cron_expr="0 15 * * *",
        enabled=True,
        params={}
    )
    task.save()

    assert task.id is not None
```

**Step 2: API 集成测试**

```bash
# scripts/test_tasks.sh
#!/bin/bash
# 创建任务
curl -X POST http://localhost:8001/api/tasks/schedule \
  -H "Content-Type: application/json" \
  -d '{
    "name": "test_sync",
    "task_type": "sync_klines",
    "schedule_type": "once",
    "params": {"stock_code": "000001"}
  }'

# 查询任务状态
sleep 2
curl http://localhost:8001/api/tasks/executions?limit=1
```

**Step 3: 提交测试代码**

```bash
git add tests/test_task_scheduler.py scripts/test_tasks.sh
git commit -m "test: add task scheduling tests"
```

---

## Task 11: 文档更新

**Files:**
- Modify: `README.md`
- Modify: `CLAUDE.md`

**Step 1: 更新 README**

添加任务系统功能说明和使用示例。

**Step 2: 提交**

```bash
git add README.md CLAUDE.md
git commit -m "docs: document task scheduling system"
```
