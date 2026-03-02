"""
日志配置模块
支持按日期分割的文件日志 + 统一格式
"""

import logging
import os
import tempfile
from logging.handlers import TimedRotatingFileHandler
from datetime import datetime
import json

# 日志目录
# 优先使用环境变量，否则使用项目内 logs 目录
default_log_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'logs')
LOG_DIR = os.getenv('LOG_DIR', default_log_dir)
try:
    os.makedirs(LOG_DIR, exist_ok=True)
except (OSError, PermissionError):
    # 回退到系统临时目录
    LOG_DIR = tempfile.gettempdir()
    os.makedirs(LOG_DIR, exist_ok=True)


class RequestContext:
    """请求上下文，用于存储 request-id"""
    _context = {}

    @classmethod
    def set_request_id(cls, request_id: str):
        cls._context['request_id'] = request_id

    @classmethod
    def get_request_id(cls) -> str:
        return cls._context.get('request_id', 'N/A')

    @classmethod
    def clear(cls):
        cls._context.clear()


class JSONFormatter(logging.Formatter):
    """JSON 格式化器"""

    def format(self, record):
        log_data = {
            'timestamp': datetime.utcnow().isoformat() + 'Z',
            'level': record.levelname,
            'logger': record.name,
            'message': record.getMessage(),
            'service': 'py-service',
            'request_id': RequestContext.get_request_id(),
        }

        # 添加异常信息
        if record.exc_info:
            log_data['exception'] = self.formatException(record.exc_info)

        # 添加额外字段
        if hasattr(record, 'latency_ms'):
            log_data['latency_ms'] = record.latency_ms

        return json.dumps(log_data, ensure_ascii=False)


class TextFormatter(logging.Formatter):
    """文本格式化器（带 request-id）"""

    def __init__(self):
        fmt = '%(asctime)s [%(request_id)s] [%(levelname)s] %(name)s - %(message)s'
        super().__init__(fmt, datefmt='%Y-%m-%d %H:%M:%S')

    def format(self, record):
        # 注入 request_id
        record.request_id = RequestContext.get_request_id()
        return super().format(record)


def setup_logging(service_name: str = 'py-service', log_level: str = 'INFO'):
    """
    配置日志系统

    Args:
        service_name: 服务名称
        log_level: 日志级别
    """
    # 创建 logger
    logger = logging.getLogger()
    logger.setLevel(getattr(logging, log_level.upper()))

    # 清除已有的 handlers
    logger.handlers.clear()

    # 控制台处理器
    console_handler = logging.StreamHandler()
    console_handler.setFormatter(TextFormatter())
    logger.addHandler(console_handler)

    # INFO 文件处理器（按天滚动）
    info_handler = TimedRotatingFileHandler(
        filename=f'{LOG_DIR}/{service_name}-info.log',
        when='midnight',
        interval=1,
        backupCount=30,
        encoding='utf-8'
    )
    info_handler.setLevel(logging.INFO)
    info_handler.suffix = '%Y-%m-%d'
    info_handler.setFormatter(TextFormatter())
    logger.addHandler(info_handler)

    # ERROR 文件处理器（按天滚动）
    error_handler = TimedRotatingFileHandler(
        filename=f'{LOG_DIR}/{service_name}-error.log',
        when='midnight',
        interval=1,
        backupCount=30,
        encoding='utf-8'
    )
    error_handler.setLevel(logging.ERROR)
    error_handler.suffix = '%Y-%m-%d'
    error_handler.setFormatter(TextFormatter())
    logger.addHandler(error_handler)

    return logger


def get_logger(name: str) -> logging.Logger:
    """获取 logger 实例"""
    return logging.getLogger(name)
