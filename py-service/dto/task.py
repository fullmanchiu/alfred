"""
任务相关的数据传输对象
与 Java 后端保持一致的命名和结构
"""
from dataclasses import dataclass, field
from typing import Dict, Any, Optional
from enum import Enum


class ScheduleType(str, Enum):
    """调度类型枚举"""
    CRON = "cron"
    INTERVAL = "interval"
    ONCE = "once"


class ExecutionStatus(str, Enum):
    """执行状态枚举"""
    PENDING = "pending"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"


class TaskType(str, Enum):
    """任务类型枚举"""
    SYNC_KLINES = "sync_klines"
    CALCULATE_INDICATORS = "calculate_indicators"


@dataclass
class ScheduledTaskDTO:
    """
    定时任务 DTO
    与 Java 后端的 ScheduledTaskDTO 对应
    """
    id: Optional[int] = None
    name: str = ""
    taskType: str = ""           # 使用驼峰命名，与 Java 一致
    scheduleType: str = ""       # 使用驼峰命名，与 Java 一致
    cronExpr: Optional[str] = None
    intervalSeconds: Optional[int] = None
    enabled: bool = True
    params: Optional[str] = None  # JSON 字符串
    createdAt: Optional[str] = None
    updatedAt: Optional[str] = None

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'ScheduledTaskDTO':
        """从 Java API 返回的字典创建 DTO"""
        return cls(
            id=data.get('id'),
            name=data.get('name', ''),
            taskType=data.get('taskType', ''),
            scheduleType=data.get('scheduleType', ''),
            cronExpr=data.get('cronExpr'),
            intervalSeconds=data.get('intervalSeconds'),
            enabled=data.get('enabled', True),
            params=data.get('params'),
            createdAt=data.get('createdAt'),
            updatedAt=data.get('updatedAt')
        )

    def to_request(self) -> Dict[str, Any]:
        """转换为创建任务请求（Java API 格式）"""
        return {
            'name': self.name,
            'taskType': self.taskType,
            'scheduleType': self.scheduleType,
            'cronExpr': self.cronExpr,
            'intervalSeconds': self.intervalSeconds,
            'enabled': self.enabled,
            'params': self.params
        }


@dataclass
class TaskExecutionDTO:
    """
    任务执行记录 DTO
    与 Java 后端的 TaskExecutionDTO 对应
    """
    id: str = ""
    taskName: str = ""           # 使用驼峰命名，与 Java 一致
    status: str = "pending"
    retryCount: int = 0          # 使用驼峰命名，与 Java 一致
    maxRetries: int = 3          # 使用驼峰命名，与 Java 一致
    params: Optional[str] = None  # JSON 字符串
    startedAt: Optional[str] = None
    completedAt: Optional[str] = None
    result: Optional[str] = None
    error: Optional[str] = None
    createdAt: Optional[str] = None

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'TaskExecutionDTO':
        """从 Java API 返回的字典创建 DTO"""
        return cls(
            id=data.get('id', ''),
            taskName=data.get('taskName', ''),
            status=data.get('status', 'pending'),
            retryCount=data.get('retryCount', 0),
            maxRetries=data.get('maxRetries', 3),
            params=data.get('params'),
            startedAt=data.get('startedAt'),
            completedAt=data.get('completedAt'),
            result=data.get('result'),
            error=data.get('error'),
            createdAt=data.get('createdAt')
        )
