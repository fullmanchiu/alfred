"""
操作处理器注册和调用
统一的操作处理框架，支持动态注册和调用操作
"""
import json
from typing import Dict, Callable, Any, Optional
from dataclasses import dataclass
from functools import wraps
from logging_config import get_logger

logger = get_logger('action_handlers')


@dataclass
class ActionResult:
    """操作执行结果"""
    success: bool
    message: Optional[str] = None
    code: int = 0
    data: Any = None


class ActionRegistry:
    """操作注册表"""

    def __init__(self):
        self._actions: Dict[str, Callable] = {}

    def register(self, name: str, handler: Callable[[Dict[str, Any]], ActionResult]):
        """注册操作处理器"""
        self._actions[name] = handler
        logger.info(f"已注册操作: {name}")

    def get(self, name: str) -> Optional[Callable]:
        """获取操作处理器"""
        return self._actions.get(name)

    def list_actions(self) -> list[str]:
        """列出所有已注册的操作"""
        return list(self._actions.keys())

    def has(self, name: str) -> bool:
        """检查操作是否已注册"""
        return name in self._actions


# 全局注册表实例
_registry: Optional[ActionRegistry] = None


def get_registry() -> ActionRegistry:
    """获取全局注册表实例"""
    global _registry
    if _registry is None:
        _registry = ActionRegistry()
    return _registry


def invoke(action: str, payload: Dict[str, Any]) -> ActionResult:
    """调用操作处理器

    Args:
        action: 操作名称
        payload: 操作参数

    Returns:
        ActionResult: 执行结果
    """
    registry = get_registry()
    handler = registry.get(action)

    if not handler:
        logger.warning(f"未找到操作: {action}")
        return ActionResult(
            success=False,
            code=404,
            message=f"未找到操作: {action}"
        )

    try:
        logger.info(f"执行操作: {action}")
        result = handler(payload)
        return result
    except Exception as e:
        logger.error(f"执行操作失败: {action}, 错误: {str(e)}", exc_info=True)
        return ActionResult(
            success=False,
            code=500,
            message=f"执行失败: {str(e)}"
        )


def register_action(name: str):
    """操作注册装饰器

    Usage:
        @register_action("my.action")
        def my_action(payload: Dict[str, Any]) -> ActionResult:
            return ActionResult(success=True)
    """
    def decorator(func: Callable[[Dict[str, Any]], ActionResult]):
        @wraps(func)
        def wrapper(payload: Dict[str, Any]) -> ActionResult:
            return func(payload)

        get_registry().register(name, wrapper)
        return wrapper

    return decorator


# ===== 任务调度相关 =====

@register_action("tasks.schedule")
def action_schedule_task(payload: Dict[str, Any]) -> ActionResult:
    """
    创建或更新定时任务

    请求参数：
    {
        "name": "任务名称",
        "taskType": "sync_klines",
        "scheduleType": "cron",  # cron, interval, once
        "cronExpr": "0 0 * * *",
        "intervalSeconds": 3600,
        "enabled": true,
        "params": {...}
    }
    """
    from java_client import java_client
    from scheduler.task_scheduler import sync_scheduled_tasks

    name = payload.get("name")
    if not name:
        return ActionResult(success=False, code=400, message="缺少 name 参数")

    # 检查任务类型
    task_type = payload.get("taskType")
    if task_type not in ["sync_klines", "calculate_indicators", "hello"]:
        return ActionResult(success=False, code=400, message=f"不支持的任务类型: {task_type}")

    # 检查调度类型
    schedule_type = payload.get("scheduleType")
    if schedule_type not in ["cron", "interval", "once"]:
        return ActionResult(success=False, code=400, message="scheduleType 必须是 cron/interval/once")

    # 构建 Java API 请求
    request_data = {
        'name': name,
        'taskType': task_type,
        'scheduleType': schedule_type,
        'enabled': payload.get('enabled', True),
        'params': payload.get('params', {})
    }

    if schedule_type == 'cron':
        cron_expr = payload.get('cronExpr')
        if not cron_expr:
            return ActionResult(success=False, code=400, message="cron 类型任务需要 cronExpr 参数")
        request_data['cronExpr'] = cron_expr
    elif schedule_type == 'interval':
        interval_seconds = payload.get('intervalSeconds')
        if not interval_seconds:
            return ActionResult(success=False, code=400, message="interval 类型任务需要 intervalSeconds 参数")
        request_data['intervalSeconds'] = interval_seconds

    # 调用 Java API
    task = java_client.create_scheduled_task(request_data)

    if task:
        # 重新同步调度器
        sync_scheduled_tasks()

        return ActionResult(
            success=True,
            data=task,
            message="任务已创建/更新"
        )

    return ActionResult(success=False, code=500, message="创建任务失败")


@register_action("tasks.execute")
def action_execute_task(payload: Dict[str, Any]) -> ActionResult:
    """
    立即执行任务

    请求参数：
    {
        "taskName": "任务名称",
        "taskType": "sync_klines",
        "params": {...},
        "executionId": "执行记录ID"  // Java端已创建
    }
    """
    from executor.task_executor import execute_task

    task_name = payload.get("taskName")
    if not task_name:
        return ActionResult(success=False, code=400, message="缺少 taskName 参数")

    task_type = payload.get("taskType")
    if not task_type:
        return ActionResult(success=False, code=400, message="缺少 taskType 参数")

    # 从Java传入的payload中获取executionId
    execution_id = payload.get("executionId")
    if not execution_id:
        return ActionResult(success=False, code=400, message="缺少 executionId 参数")

    # params 可能是字符串（来自 Java），需要解析
    params = payload.get("params", {})
    if isinstance(params, str):
        try:
            params = json.loads(params)
        except json.JSONDecodeError:
            params = {}

    # 异步执行（不再创建执行记录，直接使用Java传入的executionId）
    import threading
    thread = threading.Thread(
        target=execute_task,
        args=(execution_id, task_name, task_type, params),
        daemon=True
    )
    thread.start()

    return ActionResult(
        success=True,
        data={'execution_id': execution_id},
        message="任务已提交"
    )


@register_action("tasks.list_scheduled")
def action_list_scheduled_tasks(payload: Dict[str, Any]) -> ActionResult:
    """
    获取所有定时任务
    """
    from java_client import java_client

    tasks = java_client.get_all_scheduled_tasks()

    return ActionResult(
        success=True,
        data={'tasks': tasks}
    )


@register_action("tasks.get_execution")
def action_get_execution(payload: Dict[str, Any]) -> ActionResult:
    """
    查询执行状态

    请求参数：
    {
        "executionId": "执行ID"
    }
    """
    from java_client import java_client

    execution_id = payload.get("executionId")
    if not execution_id:
        return ActionResult(success=False, code=400, message="缺少 executionId")

    execution = java_client.get_execution(execution_id)

    if not execution:
        return ActionResult(success=False, code=404, message="执行记录不存在")

    return ActionResult(
        success=True,
        data=execution
    )


@register_action("tasks.get_execution_history")
def action_get_execution_history(payload: Dict[str, Any]) -> ActionResult:
    """
    获取执行历史

    请求参数：
    {
        "taskName": "任务名称",
        "limit": 10  # 可选
    }
    """
    from java_client import java_client

    task_name = payload.get("taskName")
    if not task_name:
        return ActionResult(success=False, code=400, message="缺少 taskName")

    limit = payload.get("limit", 10)

    executions = java_client.get_execution_history(task_name, limit)

    return ActionResult(
        success=True,
        data={'executions': executions}
    )


@register_action("tasks.delete")
def action_delete_task(payload: Dict[str, Any]) -> ActionResult:
    """
    删除任务

    请求参数：
    {
        "taskId": 123
    }
    """
    from java_client import java_client
    from scheduler.task_scheduler import sync_scheduled_tasks

    task_id = payload.get("taskId")
    if not task_id:
        return ActionResult(success=False, code=400, message="缺少 taskId")

    success = java_client.delete_task(task_id)

    if success:
        # 重新同步调度器
        sync_scheduled_tasks()

        return ActionResult(
            success=True,
            message="任务已删除"
        )

    return ActionResult(success=False, code=500, message="删除任务失败")


@register_action("tasks.toggle")
def action_toggle_task(payload: Dict[str, Any]) -> ActionResult:
    """
    启用/禁用任务

    请求参数：
    {
        "taskId": 123,
        "enabled": true
    }
    """
    from java_client import java_client
    from scheduler.task_scheduler import sync_scheduled_tasks

    task_id = payload.get("taskId")
    if task_id is None:
        return ActionResult(success=False, code=400, message="缺少 taskId")

    enabled = payload.get("enabled")

    success = java_client.toggle_task(task_id, enabled)

    if success:
        # 重新同步调度器
        sync_scheduled_tasks()

        return ActionResult(
            success=True,
            message="任务状态已更新"
        )

    return ActionResult(success=False, code=500, message="更新任务状态失败")


@register_action("tasks.cancel_execution")
def action_cancel_execution(payload: Dict[str, Any]) -> ActionResult:
    """
    取消执行

    请求参数：
    {
        "executionId": "执行ID"
    }
    """
    from executor.task_executor import _running_tasks, _running_lock

    execution_id = payload.get("executionId")
    if not execution_id:
        return ActionResult(success=False, code=400, message="缺少 executionId")

    # 从运行任务列表中移除（防止幂等性检查阻止下次执行）
    with _running_lock:
        for task_name, eid in list(_running_tasks.items()):
            if eid == execution_id or eid == "pending":
                _running_tasks.pop(task_name, None)
                logger.info(f"已移除运行中的任务: {task_name} (execution_id: {execution_id})")

    return ActionResult(
        success=True,
        message="执行已取消"
    )


# ===== K线同步队列相关 =====

@register_action("sync_klines_queue")
def action_sync_klines_queue(payload: Dict[str, Any]) -> ActionResult:
    """
    K线同步队列服务（基于性能测试优化）

    请求参数：
    {
        "task_type": "single|watchlist|hs300|market",
        "stock_codes": ["600000", ...],  // 可选，single类型必需
        "user_id": 123                   // 可选，watchlist类型必需
    }

    返回：
    {
        "success": true,
        "task_id": 123456,
        "message": "任务已加入队列"
    }
    """
    from modules.kline_sync_service import enqueue_sync_task
    from datetime import datetime

    task_type = payload.get("task_type")
    if not task_type:
        return ActionResult(success=False, code=400, message="缺少 task_type 参数")

    # 验证任务类型
    valid_types = ["single", "watchlist", "hs300", "market"]
    if task_type not in valid_types:
        return ActionResult(success=False, code=400, message=f"无效的 task_type，必须是: {', '.join(valid_types)}")

    # 生成任务ID
    task_id = int(datetime.now().timestamp() * 1000)

    # 获取股票代码
    stock_codes = payload.get("stock_codes")

    # 根据任务类型获取股票代码
    if task_type == "single":
        if not stock_codes or len(stock_codes) == 0:
            return ActionResult(success=False, code=400, message="single 类型需要 stock_codes 参数")
        task_name = f"同步股票 {stock_codes[0]}"
    elif task_type == "watchlist":
        task_name = "同步自选股"
        # stock_codes 为空，由 get_stock_codes_for_task 内部获取
    elif task_type == "hs300":
        task_name = "同步沪深300"
    elif task_type == "market":
        task_name = "同步全市场"

    # 入队任务
    result = enqueue_sync_task(
        task_id=task_id,
        task_name=task_name,
        task_type=task_type,
        stock_codes=stock_codes or []
    )

    return ActionResult(
        success=result['success'],
        data={'task_id': task_id},
        message=result['message']
    )


@register_action("sync_klines_status")
def action_sync_klines_status(payload: Dict[str, Any]) -> ActionResult:
    """
    查询K线同步任务状态

    请求参数：
    {
        "task_id": 123456
    }

    返回：
    {
        "status": "pending|running|success|failed",
        "progress": 0.5,
        "result": {...}
    }
    """
    from modules.kline_sync_service import get_queue_manager

    task_id = payload.get("task_id")
    if not task_id:
        return ActionResult(success=False, code=400, message="缺少 task_id 参数")

    manager = get_queue_manager()
    result = manager.get_task_result(task_id)

    if result is None:
        return ActionResult(
            success=True,
            data={
                'task_id': task_id,
                'status': 'pending',
                'message': '任务等待执行中'
            }
        )

    return ActionResult(
        success=True,
        data={
            'task_id': task_id,
            'status': result.status.value,
            'progress': result.success_count / result.total_stocks if result.total_stocks > 0 else 0,
            'result': {
                'total_stocks': result.total_stocks,
                'success_count': result.success_count,
                'failed_count': result.failed_count,
                'total_klines': result.total_klines,
                'elapsed_time': result.elapsed_time
            }
        }
    )


@register_action("sync_klines_queue_status")
def action_sync_klines_queue_status(payload: Dict[str, Any]) -> ActionResult:
    """
    查询K线同步队列状态

    返回：
    {
        "pending_count": 2,
        "current_task": "同步股票 600000",
        "is_processing": true
    }
    """
    from modules.kline_sync_service import get_queue_manager

    manager = get_queue_manager()
    status = manager.get_status()

    return ActionResult(
        success=True,
        data=status
    )
