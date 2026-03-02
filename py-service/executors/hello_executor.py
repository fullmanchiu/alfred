"""
示例任务执行器 - Hello World
用于测试调度器功能
"""
from logging_config import get_logger

logger = get_logger('hello_executor')


def execute_hello_task(params: dict) -> dict:
    """
    执行 Hello World 任务

    Args:
        params: 任务参数，可包含 name 字段

    Returns:
        执行结果
    """
    name = params.get('name', 'World')
    message = f"Hello, {name}!"

    logger.info(f"执行 Hello World 任务: {message}")

    return {
        'message': message,
        'timestamp': __import__('datetime').datetime.now().isoformat()
    }
