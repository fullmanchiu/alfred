"""
任务执行器
使用 ThreadPoolExecutor 并发执行任务，通过 WebSocket 与Java通信
"""
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import datetime
from threading import Lock, local
from logging_config import get_logger
from typing import Dict, Any, Optional, List
import json
import asyncio
from enum import Enum
from dataclasses import dataclass, field

# 导入 WebSocket 通信模块
import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from python_to_java_websocket import init_websocket_client, send_to_java, get_websocket_client

logger = get_logger('task_executor')

# 线程池（最多 4 个并发任务）
executor = ThreadPoolExecutor(max_workers=4)

# 运行中的任务锁（防止幂等性问题）
_running_tasks: Dict[str, str] = {}  # {task_name: execution_id}
_running_lock = Lock()

# 线程本地存储，用于在执行上下文中传递 execution_id
_execution_context = local()

# 已注册的任务类型
_REGISTERED_TASK_TYPES = [
    "sync_klines",
    "fetch_market_klines",
    "fetch_market_klines_incremental",
    "fetch_market_klines_full",
    "fetch_market_klines_fast",
    "fetch_watchlist_klines",
    "calculate_indicators",
    "hello",
]


class TaskStatus(Enum):
    """任务状态"""
    PENDING = "pending"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"

    @property
    def value(self):
        return self._value_


@dataclass
class TaskExecution:
    """任务执行记录"""
    execution_id: str
    task_type: str
    status: TaskStatus
    progress: int = 0
    result: Dict[str, Any] = field(default_factory=dict)
    error: Optional[str] = None
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None


# 存储执行记录
_executions: Dict[str, TaskExecution] = {}


class TaskManager:
    """任务管理器"""

    def get_registered_types(self) -> List[str]:
        """获取已注册的任务类型"""
        return _REGISTERED_TASK_TYPES.copy()

    def execute_task(self, task_type: str, params: Dict[str, Any]) -> TaskExecution:
        """同步执行任务"""
        execution_id = f"exec_{datetime.now().strftime('%Y%m%d%H%M%S')}"

        execution = TaskExecution(
            execution_id=execution_id,
            task_type=task_type,
            status=TaskStatus.PENDING
        )
        _executions[execution_id] = execution

        try:
            execution.started_at = datetime.now()
            execution.status = TaskStatus.RUNNING

            result = dispatch_task(task_type, params)

            execution.status = TaskStatus.COMPLETED
            execution.result = result
            execution.progress = 100
            execution.completed_at = datetime.now()

        except Exception as e:
            execution.status = TaskStatus.FAILED
            execution.error = str(e)
            execution.completed_at = datetime.now()
            logger.error(f"任务执行失败: {task_type}", exc_info=True)

        return execution

    def execute_task_async(self, task_type: str, params: Dict[str, Any]) -> str:
        """异步执行任务，返回 execution_id"""
        execution_id = f"exec_{datetime.now().strftime('%Y%m%d%H%M%S_%f')}"

        execution = TaskExecution(
            execution_id=execution_id,
            task_type=task_type,
            status=TaskStatus.PENDING
        )
        _executions[execution_id] = execution

        # 提交到线程池
        executor.submit(self._run_task, execution_id, task_type, params)

        return execution_id

    def _run_task(self, execution_id: str, task_type: str, params: Dict[str, Any]):
        """在线程池中运行任务"""
        execution = _executions.get(execution_id)
        if not execution:
            logger.error(f"执行记录不存在: {execution_id}")
            return

        try:
            execution.started_at = datetime.now()
            execution.status = TaskStatus.RUNNING

            result = dispatch_task(task_type, params)

            execution.status = TaskStatus.COMPLETED
            execution.result = result
            execution.progress = 100
            execution.completed_at = datetime.now()

        except Exception as e:
            execution.status = TaskStatus.FAILED
            execution.error = str(e)
            execution.completed_at = datetime.now()
            logger.error(f"任务执行失败: {task_type}", exc_info=True)

    def get_execution(self, execution_id: str) -> Optional[TaskExecution]:
        """获取执行记录"""
        return _executions.get(execution_id)

    def cancel_execution(self, execution_id: str) -> bool:
        """取消执行（仅对 PENDING 状态有效）"""
        execution = _executions.get(execution_id)
        if not execution:
            return False

        if execution.status == TaskStatus.PENDING:
            execution.status = TaskStatus.CANCELLED
            execution.completed_at = datetime.now()
            return True

        return False


# 全局任务管理器实例
_task_manager = TaskManager()


def get_task_manager() -> TaskManager:
    """获取任务管理器实例"""
    return _task_manager


def submit_task(task_name: str, task_type: str, params: Dict[str, Any] = None):
    """
    提交任务到执行器
    创建执行记录并提交到线程池执行
    注意：这个函数在 APScheduler 的线程中运行

    Args:
        task_name: 任务名称
        task_type: 任务类型
        params: 任务参数
    """
    params = params or {}

    # 幂等性检查：是否有相同任务正在运行
    with _running_lock:
        if task_name in _running_tasks:
            logger.warning(f"任务 {task_name} 已在运行中，跳过本次执行")
            return
        _running_tasks[task_name] = "pending"

    try:
        # 创建执行记录
        execution = java_client.create_execution(
            task_name=task_name,
            task_type=task_type,
            params=params
        )

        if not execution:
            logger.error(f"创建执行记录失败: {task_name}")
            with _running_lock:
                _running_tasks.pop(task_name, None)
            return

        execution_id = execution['id']
        with _running_lock:
            _running_tasks[task_name] = execution_id

        # 提交到线程池执行
        executor.submit(execute_task, execution_id, task_name, task_type, params)

    except Exception as e:
        logger.error(f"任务提交失败: {task_name}, error: {str(e)}")
        with _running_lock:
            _running_tasks.pop(task_name, None)


def get_current_execution_id() -> Optional[str]:
    """获取当前执行上下文中的 execution_id"""
    return getattr(_execution_context, 'execution_id', None)


def update_execution_progress(progress: int, execution_id: Optional[str] = None):
    """
    更新当前任务的执行进度（通过 WebSocket）

    Args:
        progress: 进度百分比 (0-100)
        execution_id: 执行记录 ID，如果为 None 则从上下文获取
    """
    if execution_id is None:
        execution_id = get_current_execution_id()

    if execution_id:
        try:
            send_to_java('taskProgress', {
                'executionId': execution_id,
                'progress': progress
            })
            logger.debug(f"更新执行进度: {execution_id}, {progress}%")
        except Exception as e:
            logger.warning(f"更新执行进度失败: {e}")


def log_message(level: str, message: str, execution_id: Optional[str] = None):
    """
    保存任务执行日志（通过 WebSocket）

    Args:
        level: 日志级别 (INFO, WARNING, ERROR, DEBUG)
        message: 日志消息
        execution_id: 执行记录 ID，如果为 None 则从上下文获取
    """
    if execution_id is None:
        execution_id = get_current_execution_id()

    if execution_id:
        try:
            # 直接通过 WebSocket 发送（非阻塞）
            send_to_java('taskLog', {
                'executionId': execution_id,
                'timestamp': datetime.now().isoformat(),
                'level': level,
                'message': message
            })
        except Exception as e:
            logger.warning(f"发送日志失败: {e}")


def execute_task(execution_id: str, task_name: str, task_type: str, params: Dict[str, Any]):
    """
    执行任务
    在线程池中运行

    Args:
        execution_id: 执行记录 ID
        task_name: 任务名称
        task_type: 任务类型
        params: 任务参数
    """
    # 设置执行上下文
    _execution_context.execution_id = execution_id

    try:
        logger.info(f"开始执行任务: {task_name} (execution_id: {execution_id})")

        # 更新状态为运行中（通过 WebSocket）
        send_to_java('taskStatus', {
            'executionId': execution_id,
            'status': 'RUNNING'
        })

        # 推送状态更新
        push_task_status_update(task_name, execution_id, 'RUNNING')

        # 执行实际业务逻辑
        result = dispatch_task(task_type, params)

        # 完成（通过 WebSocket）
        send_to_java('taskStatus', {
            'executionId': execution_id,
            'status': 'COMPLETED',
            'result': json.dumps({'data': result})
        })

        # 推送状态更新
        push_task_status_update(task_name, execution_id, 'COMPLETED', result={'data': result})

        logger.info(f"任务执行成功: {task_name} (execution_id: {execution_id})")

    except Exception as e:
        logger.error(f"任务执行失败: {task_name}, error: {str(e)}", exc_info=True)

        # 失败 - 截断错误消息以适配数据库VARCHAR(255)（通过 WebSocket）
        error_msg = str(e)[:250]
        send_to_java('taskStatus', {
            'executionId': execution_id,
            'status': 'FAILED',
            'error': error_msg
        })

        # 推送状态更新
        push_task_status_update(task_name, execution_id, 'FAILED', error=error_msg)

    finally:
        # 清除运行状态
        with _running_lock:
            _running_tasks.pop(task_name, None)

        # 清除执行上下文
        _execution_context.execution_id = None


def dispatch_task(task_type: str, params: Dict[str, Any]) -> Dict[str, Any]:
    """
    根据任务类型分发到具体业务模块

    Args:
        task_type: 任务类型
        params: 任务参数

    Returns:
        执行结果

    Raises:
        ValueError: 未知任务类型
    """
    # 动态导入执行器模块，避免循环依赖
    if task_type == "sync_klines":
        # 单只股票同步（兼容旧参数）
        return execute_sync_klines(params)
    elif task_type == "fetch_market_klines":
        # 全市场K线获取 - 使用新的队列+多进程服务
        return execute_sync_klines({**params, 'task_type': 'market'})
    elif task_type == "fetch_watchlist_klines":
        # 自选股K线获取 - 使用新的队列+多进程服务
        return execute_sync_klines({**params, 'task_type': 'watchlist', 'stock_codes': params.get('stock_codes', [])})
    elif task_type == "fetch_market_klines_incremental":
        return execute_fetch_market_incremental(params)
    elif task_type == "fetch_market_klines_full":
        return execute_fetch_market_full(params)
    elif task_type == "fetch_market_klines_fast":
        return execute_fetch_market_fast(params)
    elif task_type == "calculate_indicators":
        return execute_calculate_indicators(params)
    elif task_type == "hello":
        return execute_hello(params)
    else:
        raise ValueError(f"未知任务类型: {task_type}")


def execute_fetch_market_fast(params: Dict[str, Any]) -> Dict[str, Any]:
    """
    快速全量获取全市场K线数据（多线程 + WebSocket批量传输）

    优化：
    1. 多线程并行获取（8-16线程）
    2. 通过 WebSocket 批量传输
    3. Java 端批量插入

    目标：3分钟内完成

    Args:
        params: 任务参数
            - market: 市场范围 'all'/'sh'/'sz'，默认 'sz'
            - days: 获取天数，默认 30
            - threads: 并发线程数，默认 8
            - use_websocket: 是否使用 WebSocket 传输，默认 True

    Returns:
        执行结果
    """
    import asyncio
    from datetime import timedelta, datetime
    from modules.kline_fetcher import fetch_market_parallel

    market = params.get('market', 'sz')
    days = params.get('days', 30)
    threads = params.get('threads', 8)
    use_websocket = params.get('use_websocket', True)
    start_date = params.get('start_date')
    end_date = params.get('end_date')

    # 获取当前执行ID
    current_exec_id = get_current_execution_id()

    # 计算日期范围
    end = datetime.now()
    start = end - timedelta(days=days)
    start_date = start_date or start.strftime('%Y-%m-%d')
    end_date = end_date or end.strftime('%Y-%m-%d')

    logger.info(f"快速获取全市场K线: market={market}, threads={threads}, websocket={use_websocket}")
    log_message('INFO', f'========== 快速全量获取 ==========')
    log_message('INFO', f'市场: {market}, 线程数: {threads}, 日期: {start_date} ~ {end_date}')
    log_message('INFO', f'传输方式: {"WebSocket批量传输" if use_websocket else "HTTP逐条"}')
    log_message('INFO', f'日志方式: WebSocket实时推送')

    # 初始化 WebSocket 通信客户端
    ws_client = init_websocket_client()

    if ws_client is None or not ws_client.connected:
        error_msg = "WebSocket 连接失败，无法执行任务。请检查 Java 后端是否运行。"
        log_message('ERROR', error_msg)
        raise Exception(error_msg)

    log_message('INFO', 'WebSocket 连接成功，开始执行任务')

    # 设置日志回调函数 - 通过 WebSocket 发送到 Java
    def websocket_log_callback(level: str, message: str):
        """通过 WebSocket 发送日志到 Java"""
        send_to_java('taskLog', {
            'executionId': current_exec_id,
            'timestamp': datetime.now().isoformat(),
            'level': level,
            'message': message
        })

    # 设置 kline_fetcher 的日志回调
    from modules.kline_fetcher import set_log_callback
    set_log_callback(websocket_log_callback)

    # 第一阶段：多线程获取数据
    log_message('INFO', f'========== 第一阶段：多线程获取 ==========')
    fetch_result = fetch_market_parallel(start_date, end_date, market=market, max_workers=threads)

    klines_dict = fetch_result['klines_dict']
    stock_dict = fetch_result['stock_dict']

    log_message('INFO', f'获取完成: {fetch_result["success_count"]}/{fetch_result["total_count"]} 只证券, 耗时 {fetch_result["elapsed_time"]:.1f} 秒')
    log_message('INFO', f'获取K线总数: {fetch_result["total_klines"]} 条')

    # 第二阶段：传输和保存
    if use_websocket:
        log_message('INFO', f'========== 第二阶段：WebSocket 批量传输 ==========')

        # 使用 WebSocket 批量发送（异步）
        async def send_via_ws():
            from modules.websocket_batch_sender import send_klines_via_websocket

            def progress_callback(current, total):
                log_message('INFO', f'传输进度: {current}/{total} 批次 ({current * 100 // total}%)')

            result = await send_klines_via_websocket(
                klines_dict,
                stock_dict,
                progress_callback=progress_callback
            )
            return result

        # 运行异步函数
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        try:
            send_result = loop.run_until_complete(send_via_ws())

            log_message('INFO', f'传输完成: {send_result["batches"]} 批次, {send_result["total_klines"]} 条K线')

            # 返回结果（保存由 Java 端异步处理）
            return {
                'mode': 'fast_websocket',
                'market': market,
                'start_date': start_date,
                'end_date': end_date,
                'fetch_success': fetch_result['success_count'],
                'fetch_failed': fetch_result['failed_count'],
                'fetch_total': fetch_result['total_count'],
                'fetch_time': fetch_result['elapsed_time'],
                'sent_batches': send_result['batches'],
                'total_klines': send_result['total_klines'],
                'message': (f'快速获取完成: {fetch_result["success_count"]} 只证券, {send_result["batches"]} 批次, {send_result["total_klines"]} 条K线, 耗时 {fetch_result["elapsed_time"]:.1f} 秒')[:250]
            }
        finally:
            loop.close()
    else:
        # 使用 HTTP 逐条保存（兼容模式）
        log_message('INFO', f'========== 第二阶段：HTTP 保存 ==========')
        from modules.kline_fetcher import save_klines_batch

        def progress_callback(current, total):
            log_message('INFO', f'保存进度: {current}/{total} 只证券 ({current * 100 // total}%)')

        save_result = save_klines_batch(klines_dict, stock_dict, upsert=True, progress_callback=progress_callback)

        return {
            'mode': 'fast_http',
            'market': market,
            'start_date': start_date,
            'end_date': end_date,
            'fetch_success': fetch_result['success_count'],
            'fetch_failed': fetch_result['failed_count'],
            'fetch_total': fetch_result['total_count'],
            'fetch_time': fetch_result['elapsed_time'],
            'saved_stocks': save_result['saved_stocks'],
            'updated_stocks': save_result['updated_stocks'],
            'saved_klines': save_result['saved_klines'],
            'updated_klines': save_result['updated_klines'],
            'total_stocks': save_result['total_stocks'],
            'total_klines': save_result['total_klines'],
            'message': (f'快速获取完成: {save_result["total_stocks"]} 只证券, 新增 {save_result["saved_klines"]} 条, 更新 {save_result["updated_klines"]} 条, 总耗时 {fetch_result["elapsed_time"]:.1f} 秒')[:250]
        }


def execute_fetch_market_incremental(params: Dict[str, Any]) -> Dict[str, Any]:
    """
    增量更新全市场K线数据（只获取缺失的数据）

    流程：
    1. 获取所有证券列表
    2. 查询数据库每只股票的最新日期
    3. 只获取缺失日期的数据

    Args:
        params: 任务参数
            - market: 市场范围 'all'/'sh'/'sz'，默认 'sz'
            - days: 获取天数，默认 30
            - start_date: 可选，指定开始日期
            - end_date: 可选，指定结束日期

    Returns:
        执行结果
    """
    from datetime import timedelta, datetime
    from modules.kline_fetcher import fetch_market, set_log_callback, save_klines_batch

    market = params.get('market', 'sz')
    days = params.get('days', 30)
    start_date = params.get('start_date')
    end_date = params.get('end_date')

    # 计算日期范围
    end = datetime.now()
    start = end - timedelta(days=days)
    start_date = start_date or start.strftime('%Y-%m-%d')
    end_date = end_date or end.strftime('%Y-%m-%d')

    logger.info(f"增量更新全市场K线: market={market}, {start_date} ~ {end_date}")
    log_message('INFO', f'========== 增量更新全市场K线 ==========')
    log_message('INFO', f'市场: {market}, 日期: {start_date} ~ {end_date}')

    # 设置日志回调
    set_log_callback(log_message)

    # 第一阶段：获取数据
    log_message('INFO', f'========== 第一阶段：获取数据 ==========')
    fetch_result = fetch_market(start_date, end_date, market=market)

    klines_dict = fetch_result['klines_dict']
    stock_dict = fetch_result['stock_dict']
    total_klines = fetch_result.get('total_klines', 0)

    log_message('INFO', f'获取完成: {fetch_result["success_count"]}/{fetch_result["total_count"]} 只证券')
    log_message('INFO', f'获取K线总数: {total_klines} 条')

    # 第二阶段：保存数据（增量模式：upsert=False）
    log_message('INFO', f'========== 第二阶段：保存数据（增量模式） ==========')
    save_result = save_klines_batch(klines_dict, stock_dict, upsert=False)

    result = {
        'mode': 'incremental',
        'market': market,
        'start_date': start_date,
        'end_date': end_date,
        'fetch_success': fetch_result['success_count'],
        'fetch_failed': fetch_result['failed_count'],
        'fetch_total': fetch_result['total_count'],
        'saved_stocks': save_result['saved_stocks'],
        'saved_klines': save_result['saved_klines'],
        'skipped_stocks': save_result['total_stocks'] - save_result['saved_stocks'],
        'message': (f'增量更新完成: 新增 {save_result["saved_stocks"]} 只证券, {save_result["saved_klines"]} 条K线')[:250]
    }

    logger.info(f"增量更新完成: {result}")
    log_message('INFO', result['message'])
    return result


def execute_fetch_market_full(params: Dict[str, Any]) -> Dict[str, Any]:
    """
    全量获取全市场K线数据（覆盖数据库）

    使用新的 kline_sync_service，基于数学批量模式：
    - 阈值决策：≤15只用单进程，>15只用4进程
    - 批量大小：25只股票/批
    - 完成条件：基于计算批次数，不依赖超时

    流程：
    1. 获取所有证券列表
    2. 使用新的多进程服务获取K线数据并流式保存
    3. 完成条件：所有批次已发送且2秒无新保存结果

    Args:
        params: 任务参数
            - market: 市场范围 'all'/'sh'/'sz'，默认 'sz'
            - days: 获取天数，默认 30
            - start_date: 可选，指定开始日期
            - end_date: 可选，指定结束日期

    Returns:
        执行结果
    """
    from datetime import timedelta, datetime
    from modules.kline_fetcher import _get_stock_list
    from modules.kline_sync_service import MultiProcessFetcher

    market = params.get('market', 'sz')
    days = params.get('days', 30)
    start_date = params.get('start_date')
    end_date = params.get('end_date')

    # 计算日期范围
    end = datetime.now()
    start = end - timedelta(days=days)
    start_date = start_date or start.strftime('%Y-%m-%d')
    end_date = end_date or end.strftime('%Y-%m-%d')

    logger.info(f"全量获取全市场K线: market={market}, {start_date} ~ {end_date}")
    log_message('INFO', f'========== 全量获取全市场K线（新服务） ==========')
    log_message('INFO', f'市场: {market}, 日期: {start_date} ~ {end_date}')

    # 第一阶段：获取证券列表
    log_message('INFO', f'========== 第一阶段：获取证券列表 ==========')
    stock_dict = _get_stock_list(market=market)
    stock_codes = list(stock_dict.keys())

    # 如果指定了 stockCount，限制股票数量
    stock_count = params.get('stockCount')
    if stock_count and stock_count > 0:
        stock_codes = stock_codes[:stock_count]
        # 同样限制 stock_dict
        stock_dict = {code: stock_dict[code] for code in stock_codes if code in stock_dict}
        log_message('INFO', f'限制股票数量为: {stock_count}')

    log_message('INFO', f'获取到 {len(stock_codes)} 只证券')
    logger.info(f"获取到 {len(stock_codes)} 只证券")

    # 第二阶段：预创建股票记录（确保数据库中存在）
    log_message('INFO', f'========== 第二阶段：预创建股票记录 ==========')
    from java_client import java_client
    created_count = 0
    for code, info in stock_dict.items():
        # 调用 Java API 创建股票记录（发送空 klines 列表，只创建股票信息）
        result = java_client.save_stock_klines(
            code=code,
            klines=[],  # 空列表，只创建股票记录
            stock_name=info.get('name', ''),
            security_type=info.get('type', ''),
            upsert=True  # 存在则跳过
        )
        if result and result.get('totalCount', 0) > 0:
            created_count += 1
    log_message('INFO', f'预创建股票记录完成: {created_count} 只')
    logger.info(f'预创建股票记录完成: {created_count} 只')

    # 第三阶段：使用新的多进程服务获取K线并流式保存
    log_message('INFO', f'========== 第三阶段：获取K线数据（流式保存） ==========')

    fetcher = MultiProcessFetcher(max_retries=2)
    # 获取当前执行ID以支持 WebSocket 日志推送
    execution_id = get_current_execution_id()
    fetch_result = fetcher.fetch(stock_codes, start_date, end_date, execution_id=execution_id)

    # 构建结果
    result = {
        'mode': 'full',
        'market': market,
        'start_date': start_date,
        'end_date': end_date,
        'fetch_success': fetch_result['success_count'],
        'fetch_failed': fetch_result['failed_count'],
        'fetch_total': len(stock_codes),  # 总股票数
        'saved_stocks': fetch_result['success_count'],  # 成功获取的都保存了
        'saved_klines': fetch_result.get('total_klines', 0),
        'total_stocks': len(stock_codes),
        'total_klines': fetch_result.get('total_klines', 0),
        'elapsed_time': fetch_result['elapsed'],
        'message': (f'全量获取完成: 处理 {fetch_result["success_count"]}/{len(stock_codes)} 只证券, '
                   f'获取 {fetch_result.get("total_klines", 0)} 条K线, 耗时 {fetch_result["elapsed"]:.1f}秒')[:250]
    }

    logger.info(f"全量获取完成: {result}")
    log_message('INFO', result['message'])
    return result


def execute_fetch_watchlist_klines(params: Dict[str, Any]) -> Dict[str, Any]:
    """
    执行自选股 K 线数据获取任务（批量）

    Args:
        params: 任务参数
            - codes: 股票代码列表，如 ['000001', '000002']
            - days: 获取天数，默认 30

    Returns:
        执行结果
    """
    from datetime import timedelta, datetime
    from modules.kline_fetcher import fetch_batch, save_to_java

    codes = params.get('codes', [])
    days = params.get('days', 30)

    if not codes:
        raise ValueError("自选股代码列表不能为空")

    # 计算日期范围
    end = datetime.now()
    start = end - timedelta(days=days)
    start_date = start.strftime('%Y-%m-%d')
    end_date = end.strftime('%Y-%m-%d')

    logger.info(f"获取自选股K线: {len(codes)}只股票, {start_date} ~ {end_date}")
    log_message('INFO', f'获取自选股K线: {len(codes)}只股票, {start_date} ~ {end_date}')

    # 设置日志回调
    from modules.kline_fetcher import set_log_callback
    set_log_callback(log_message)

    # 批量获取K线数据
    klines_dict = fetch_batch(codes, start_date, end_date)

    # 统计结果
    total_stocks = len(klines_dict)
    total_klines = sum(len(klines) for klines in klines_dict.values())
    saved_stocks = 0
    updated_stocks = 0
    saved_klines = 0
    updated_klines = 0

    log_message('INFO', f'获取到 {total_stocks} 只股票的K线数据，共 {total_klines} 条记录')

    # 保存到 Java（增量模式）
    for code, klines in klines_dict.items():
        if klines:
            result = save_to_java(klines, code, upsert=False)
            saved_count = result.get('savedCount', 0)
            updated_count = result.get('updatedCount', 0)

            if saved_count > 0:
                saved_stocks += 1
                saved_klines += saved_count
            if updated_count > 0:
                updated_stocks += 1
                updated_klines += updated_count

    result = {
        'total_stocks': total_stocks,
        'start_date': start_date,
        'end_date': end_date,
        'total_klines': total_klines,
        'saved_stocks': saved_stocks,
        'updated_stocks': updated_stocks,
        'saved_klines': saved_klines,
        'updated_klines': updated_klines,
        'message': (f'自选股K线获取完成: {saved_stocks + updated_stocks}/{total_stocks}只股票, {saved_klines + updated_klines}条记录')[:250]
    }

    logger.info(f"自选股K线获取完成: {result}")
    log_message('INFO', result['message'])
    return result


def execute_fetch_market_klines(params: Dict[str, Any]) -> Dict[str, Any]:
    """
    执行全市场 K 线数据获取任务

    Args:
        params: 任务参数
            - market: 市场范围 'all'/'sh'/'sz'，默认 'sz'
            - days: 获取天数，默认 30

    Returns:
        执行结果
    """
    from datetime import timedelta, datetime
    from modules.kline_fetcher import fetch_market, save_to_java

    market = params.get('market', 'sz')
    days = params.get('days', 30)

    # 计算日期范围
    end = datetime.now()
    start = end - timedelta(days=days)
    start_date = start.strftime('%Y-%m-%d')
    end_date = end.strftime('%Y-%m-%d')

    logger.info(f"开始获取全市场K线数据: market={market}, {start_date} ~ {end_date}")
    log_message('INFO', f'开始获取全市场K线数据: {market} 市场, {start_date} ~ {end_date}')

    # 设置日志回调，让 kline_fetcher 能保存日志
    from modules.kline_fetcher import set_log_callback
    set_log_callback(log_message)

    # 获取K线数据并保存（fetch_market 内部已处理保存）
    # save_to_db=True 表示在 fetch_market 内部保存到数据库
    result = fetch_market(start_date, end_date, market=market, save_to_db=True)

    log_message('INFO', f'全市场K线获取完成: {result["success_count"]}/{result["total_count"]} 只证券')

    logger.info(f"全市场K线获取完成: {result}")
    return result


def execute_sync_klines(params: Dict[str, Any]) -> Dict[str, Any]:
    """
    执行K线数据同步任务（使用新的队列服务）

    基于性能测试优化：
    - 阈值15只股票：≤15只用单进程，>15只用4进程
    - 重试机制保证100%数据完整性

    Args:
        params: 任务参数
            - stock_code: 单只股票代码（兼容旧参数）
            - stock_codes: 股票代码列表（新参数，支持批量）
            - task_type: 任务类型 single|watchlist|hs300|market
            - user_id: 用户ID（watchlist类型使用）
            - days: 获取天数，默认 365（全量）

    Returns:
        执行结果
    """
    from datetime import timedelta, datetime
    from modules.kline_sync_service import MultiProcessFetcher, get_stock_codes_for_task, SyncTask

    # 解析参数
    task_type = params.get('task_type', 'single')
    stock_codes = params.get('stock_codes', [])
    user_id = params.get('user_id')

    # 兼容旧的单股票参数
    if not stock_codes:
        stock_code = params.get('stock_code')
        if stock_code:
            stock_codes = [stock_code]
            task_type = 'single'

    # 默认全量同步（365天）
    days = params.get('days', 365)

    # 计算日期范围
    end = datetime.now()
    start = end - timedelta(days=days)
    start_date = start.strftime('%Y-%m-%d')
    end_date = end.strftime('%Y-%m-%d')

    # 创建临时任务对象用于获取股票代码
    temp_task = SyncTask(
        task_id=0,
        task_name=f"同步K线",
        task_type=task_type,
        stock_codes=stock_codes
    )

    # 根据任务类型获取股票代码
    if not stock_codes:
        stock_codes = get_stock_codes_for_task(temp_task)

    if not stock_codes:
        raise ValueError("无法获取股票代码列表")

    stock_count = len(stock_codes)
    logger.info(f"开始获取K线数据: task_type={task_type}, stock_count={stock_count}, {start_date} ~ {end_date}")
    log_message('INFO', f'K线同步: {task_type}, {stock_count}只股票, {start_date}~{end_date}')
    if len(stock_codes) <= 20:
        log_message('INFO', f'股票列表: {", ".join(stock_codes)}')
    else:
        log_message('INFO', f'股票列表: {", ".join(stock_codes[:15])}... 等{len(stock_codes)}只')

    # 获取当前执行记录ID（用于子进程日志推送）
    execution_id = get_current_execution_id()

    log_message('INFO', '========== 流式处理：边获取边保存 ==========')

    # 使用新的多进程获取器（自动选择进程数，流式保存）
    fetcher = MultiProcessFetcher(max_retries=2)
    fetch_result = fetcher.fetch(stock_codes, start_date, end_date, execution_id)

    # 流式保存已在 fetch 过程中完成
    result = {
        'task_type': task_type,
        'stock_count': stock_count,
        'success_count': fetch_result['success_count'],
        'failed_count': fetch_result['failed_count'],
        'total_klines': fetch_result['total_klines'],
        'saved_count': fetch_result.get('saved_count', fetch_result['total_klines']),
        'error_count': fetch_result.get('error_count', fetch_result['failed_count']),
        'elapsed_time': fetch_result['elapsed'],
        'message': (f'K线同步完成: 成功{fetch_result["success_count"]}/{stock_count}只, '
                   f'{fetch_result.get("saved_count", fetch_result["total_klines"])}条K线已保存, '
                   f'耗时{fetch_result["elapsed"]:.2f}秒')[:250]
    }

    logger.info(f"K线同步完成: {result}")
    log_message('INFO', result['message'])

    return result


def execute_fetch_watchlist_klines(params: Dict[str, Any]) -> Dict[str, Any]:
    """
    执行自选股 K 线数据获取任务（使用新的多进程服务）

    基于性能测试优化：
    - 阈值15只股票：≤15只用单进程，>15只用4进程
    - 重试机制保证100%数据完整性

    Args:
        params: 任务参数
            - codes: 股票代码列表，如 ['000001', '000002']
            - days: 获取天数，默认 365（全量）

    Returns:
        执行结果
    """
    from datetime import timedelta, datetime
    from modules.kline_sync_service import MultiProcessFetcher

    codes = params.get('codes', [])
    days = params.get('days', 365)

    if not codes:
        raise ValueError("自选股代码列表不能为空")

    # 计算日期范围
    end = datetime.now()
    start = end - timedelta(days=days)
    start_date = start.strftime('%Y-%m-%d')
    end_date = end.strftime('%Y-%m-%d')

    stock_count = len(codes)
    logger.info(f"开始获取自选股K线数据: {stock_count}只股票, {start_date} ~ {end_date}")
    log_message('INFO', f'自选股K线同步: {stock_count}只股票, {start_date}~{end_date}')

    # 使用新的多进程获取器（自动选择进程数，流式保存）
    execution_id = get_current_execution_id()
    fetcher = MultiProcessFetcher(max_retries=2)
    fetch_result = fetcher.fetch(codes, start_date, end_date, execution_id)

    # 流式保存已在 fetch 过程中完成
    result = {
        'total_stocks': stock_count,
        'start_date': start_date,
        'end_date': end_date,
        'success_count': fetch_result['success_count'],
        'failed_count': fetch_result['failed_count'],
        'total_klines': fetch_result['total_klines'],
        'saved_count': fetch_result.get('saved_count', fetch_result['total_klines']),
        'error_count': fetch_result.get('error_count', fetch_result['failed_count']),
        'elapsed_time': fetch_result['elapsed'],
        'message': (f'自选股K线同步完成: 成功{fetch_result["success_count"]}/{stock_count}只, '
                   f'已保存{fetch_result.get("saved_count", fetch_result["total_klines"])}条, '
                   f'耗时{fetch_result["elapsed"]:.2f}秒')[:250]
    }

    logger.info(f"自选股K线获取完成: {result}")
    log_message('INFO', result['message'])
    return result


def execute_calculate_indicators(params: Dict[str, Any]) -> Dict[str, Any]:
    """
    执行技术指标计算任务

    Args:
        params: 任务参数

    Returns:
        执行结果
    """
    # TODO: 实现实际的指标计算逻辑
    stock_code = params.get('stock_code', '000001')
    indicators = params.get('indicators', ['MA', 'MACD'])

    logger.info(f"计算技术指标: {stock_code}, {indicators}")

    return {
        'stock_code': stock_code,
        'indicators': indicators,
        'message': '指标计算完成'
    }


def execute_hello(params: Dict[str, Any]) -> Dict[str, Any]:
    """
    测试任务（用于验证调度器工作正常）

    Args:
        params: 任务参数

    Returns:
        执行结果
    """
    name = params.get('name', 'World')
    logger.info(f"Hello, {name}!")

    return {
        'message': f'Hello, {name}!',
        'timestamp': datetime.now().isoformat()
    }


def get_running_tasks() -> Dict[str, str]:
    """
    获取正在运行的任务

    Returns:
        运行中的任务字典 {task_name: execution_id}
    """
    with _running_lock:
        return _running_tasks.copy()


def shutdown_executor(wait: bool = True):
    """
    关闭线程池

    Args:
        wait: 是否等待所有任务完成
    """
    logger.info(f"关闭任务执行器线程池 (wait={wait})")
    executor.shutdown(wait=wait)


def push_task_status_update(task_name: str, execution_id: str, status: str, result: Dict = None, error: str = None):
    """
    推送任务状态更新到 Java

    Args:
        task_name: 任务名称
        execution_id: 执行ID
        status: 状态（RUNNING/COMPLETED/FAILED）
        result: 执行结果（可选）
        error: 错误信息（可选）
    """
    try:
        from websocket.connection_manager import manager
        from dto.message import WebSocketMessage, MessageType

        payload = {
            "action": "task.status_update",
            "taskName": task_name,
            "executionId": execution_id,
            "status": status,
            "timestamp": datetime.now().isoformat()
        }

        if result is not None:
            payload["result"] = result
        if error is not None:
            payload["error"] = error

        message = WebSocketMessage(
            type=MessageType.NOTIFICATION,
            payload=payload
        )

        # 在新的事件循环中广播（避免阻塞线程池）
        try:
            loop = asyncio.get_event_loop()
            if loop.is_running():
                asyncio.create_task(manager.broadcast(message.model_dump_json()))
            else:
                loop.run_until_complete(manager.broadcast(message.model_dump_json()))
        except RuntimeError:
            # 没有事件循环，创建一个新的
            asyncio.run(manager.broadcast(message.model_dump_json()))

        logger.info(f"任务状态更新已推送: {task_name} -> {status}")

    except Exception as e:
        logger.error(f"推送任务状态更新失败: {str(e)}", exc_info=True)


def push_task_log(execution_id: str, level: str, message: str):
    """
    推送任务日志到 Java

    Args:
        execution_id: 执行ID
        level: 日志级别 (INFO, WARNING, ERROR, DEBUG)
        message: 日志消息
    """
    try:
        from websocket.connection_manager import manager
        from dto.message import WebSocketMessage, MessageType

        payload = {
            "action": "task.log",
            "executionId": execution_id,
            "level": level,
            "message": message,
            "timestamp": datetime.now().isoformat()
        }

        ws_message = WebSocketMessage(
            type=MessageType.NOTIFICATION,
            payload=payload
        )

        # 在新的事件循环中广播（避免阻塞线程池）
        try:
            loop = asyncio.get_event_loop()
            if loop.is_running():
                asyncio.create_task(manager.broadcast(ws_message.model_dump_json()))
            else:
                loop.run_until_complete(manager.broadcast(ws_message.model_dump_json()))
        except RuntimeError:
            # 没有事件循环，创建一个新的
            asyncio.run(manager.broadcast(ws_message.model_dump_json()))

        logger.debug(f"任务日志已推送: {execution_id} [{level}] {message}")

    except Exception as e:
        logger.error(f"推送任务日志失败: {str(e)}", exc_info=True)
