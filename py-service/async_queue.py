"""
异步消息队列模块
提供非阻塞的消息队列，用于处理需要异步发送的消息（如日志）
"""
import queue
import threading
from typing import Callable, Optional, Any
from logging_config import get_logger

logger = get_logger('async_queue')


class AsyncMessageQueue:
    """异步消息队列"""

    def __init__(self, max_size: int = 10000):
        """
        初始化队列

        Args:
            max_size: 队列最大大小
        """
        self._queue = queue.Queue(maxsize=max_size)
        self._worker_running = False
        self._worker_thread: Optional[threading.Thread] = None
        self._message_handler: Optional[Callable] = None

    def set_handler(self, handler: Callable[[Any], None]):
        """设置消息处理器"""
        self._message_handler = handler

    def start(self):
        """启动后台处理线程"""
        if self._worker_running:
            return

        self._worker_running = True

        def _process_queue():
            while self._worker_running:
                try:
                    message = self._queue.get(timeout=0.1)
                    if self._message_handler:
                        self._message_handler(message)
                except queue.Empty:
                    continue
                except Exception as e:
                    logger.error(f"队列处理异常: {e}")

        self._worker_thread = threading.Thread(target=_process_queue, daemon=True)
        self._worker_thread.start()
        logger.info("异步消息队列已启动")

    def stop(self):
        """停止后台处理线程"""
        self._worker_running = False
        if self._worker_thread:
            self._worker_thread.join(timeout=2)
            logger.info("异步消息队列已停止")

    def put(self, message: Any, block: bool = False) -> bool:
        """
        放入消息

        Args:
            message: 消息内容
            block: 是否阻塞等待

        Returns:
            bool: 是否成功
        """
        try:
            if block:
                self._queue.put(message)
            else:
                self._queue.put_nowait(message)
            return True
        except queue.Full:
            logger.warning("队列已满，丢弃消息")
            return False

    def task_done(self):
        """标记一个任务完成"""
        self._queue.task_done()


# 全局日志队列实例
_log_queue: Optional[AsyncMessageQueue] = None


def get_log_queue() -> Optional[AsyncMessageQueue]:
    """获取全局日志队列"""
    return _log_queue


def init_log_queue(handler: Callable[[Any], None]) -> AsyncMessageQueue:
    """
    初始化全局日志队列

    Args:
        handler: 消息处理器

    Returns:
        AsyncMessageQueue: 日志队列实例
    """
    global _log_queue

    if _log_queue is None:
        _log_queue = AsyncMessageQueue()
        _log_queue.set_handler(handler)
        _log_queue.start()

    return _log_queue
