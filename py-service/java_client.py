"""
Java API 客户端
通过 HTTP API 与 Java 后端通信，不直接访问数据库

所有数据操作都通过 Java API 完成，Python 只负责业务逻辑处理
"""
import httpx
import os
from typing import Dict, Any, List, Optional
from logging_config import get_logger
import json

logger = get_logger('java_client')

# Java 后端地址，可通过环境变量配置
JAVA_BASE_URL = os.getenv('JAVA_BASE_URL', 'http://localhost:8080')


class JavaAPIClient:
    """
    Java API 客户端

    提供与 Java 后端通信的统一接口，处理所有数据访问操作
    """

    def __init__(self, base_url: str = JAVA_BASE_URL):
        self.base_url = base_url.rstrip('/')
        # 使用同步客户端，timeout 设置为 30 秒
        self.client = httpx.Client(timeout=30.0)
        logger.info(f"Java API 客户端初始化，base_url={self.base_url}")

    def _request(
        self,
        method: str,
        path: str,
        **kwargs
    ) -> Optional[Dict[str, Any]]:
        """
        发送 HTTP 请求

        Args:
            method: HTTP 方法（GET, POST, PUT, DELETE 等）
            path: API 路径
            **kwargs: httpx.request 的其他参数

        Returns:
            API 响应的 data 字段内容，失败返回 None
        """
        url = f"{self.base_url}{path}"
        try:
            response = self.client.request(method, url, **kwargs)
            response.raise_for_status()

            # Java API 返回格式：{ "success": true, "data": {...}, "message": "..." }
            result = response.json()
            if result.get('success'):
                return result.get('data')
            else:
                logger.error(f"API 返回失败: {method} {url}, message={result.get('message')}")
                return None

        except httpx.HTTPStatusError as e:
            logger.error(f"API HTTP 错误: {method} {url}, status={e.response.status_code}, response={e.response.text}")
            return None
        except httpx.HTTPError as e:
            logger.error(f"API 请求失败: {method} {url}, error={str(e)}")
            return None
        except json.JSONDecodeError as e:
            logger.error(f"JSON 解析失败: {method} {url}, error={str(e)}")
            return None

    # ===== 定时任务相关 =====

    def create_scheduled_task(self, task_data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """
        创建或更新定时任务

        Args:
            task_data: 任务数据，格式如 ScheduleTaskRequest

        Returns:
            创建的任务 DTO，失败返回 None
        """
        result = self._request('POST', '/api/v1/tasks', json=task_data)
        return result.get('task') if result else None

    def get_all_scheduled_tasks(self) -> List[Dict[str, Any]]:
        """
        获取所有定时任务

        Returns:
            任务列表
        """
        result = self._request('GET', '/api/v1/tasks')
        return result.get('tasks', []) if result else []

    def get_enabled_scheduled_tasks(self) -> List[Dict[str, Any]]:
        """
        获取启用的定时任务

        Returns:
            启用的任务列表
        """
        result = self._request('GET', '/api/v1/tasks/enabled')
        return result.get('tasks', []) if result else []

    def delete_task(self, task_id: int) -> bool:
        """
        删除任务

        Args:
            task_id: 任务 ID

        Returns:
            是否成功
        """
        # 对于删除操作，即使没有 data 字段，只要 HTTP 状态码是 2xx 就算成功
        url = f"{self.base_url}/api/v1/tasks/{task_id}"
        try:
            response = self.client.request('DELETE', url)
            response.raise_for_status()
            result = response.json()
            # 删除成功时，success 应该是 true
            return result.get('success', False)
        except httpx.HTTPError as e:
            logger.error(f"删除任务失败: DELETE {url}, error={str(e)}")
            return False

    def toggle_task(self, task_id: int, enabled: bool) -> Optional[Dict[str, Any]]:
        """
        启用/禁用任务

        Args:
            task_id: 任务 ID
            enabled: 是否启用

        Returns:
            更新后的任务 DTO，失败返回 None
        """
        result = self._request(
            'PUT',
            f'/api/v1/tasks/{task_id}/toggle',
            params={'enabled': enabled}
        )
        return result.get('task') if result else None

    # ===== 执行记录相关 =====

    def create_execution(
        self,
        task_name: str,
        task_type: str,
        params: Dict[str, Any] = None
    ) -> Optional[Dict[str, Any]]:
        """
        创建执行记录

        Args:
            task_name: 任务名称
            task_type: 任务类型
            params: 任务参数（字典），会被转换为 JSON 字符串

        Returns:
            创建的执行记录 DTO，失败返回 None
        """
        data = {
            'taskName': task_name,
            'taskType': task_type,
            'params': json.dumps(params) if params else None
        }
        result = self._request('POST', '/api/v1/tasks/executions', json=data)
        return result.get('execution') if result else None

    def get_execution(self, execution_id: str) -> Optional[Dict[str, Any]]:
        """
        获取执行记录

        Args:
            execution_id: 执行记录 ID

        Returns:
            执行记录 DTO，失败返回 None
        """
        result = self._request('GET', f'/api/v1/tasks/executions/{execution_id}')
        return result.get('execution') if result else None

    def update_execution_status(
        self,
        execution_id: str,
        status: str,
        result: Dict[str, Any] = None,
        error: str = None
    ) -> Optional[Dict[str, Any]]:
        """
        更新执行状态

        Args:
            execution_id: 执行记录 ID
            status: 新状态（pending/running/completed/failed）会自动转换为大写
            result: 执行结果（字典），会被转换为 JSON 字符串
            error: 错误信息

        Returns:
            更新后的执行记录 DTO，失败返回 None
        """
        # 将状态转换为大写，匹配 Java 端的枚举值
        status_upper = status.upper()
        data = {'status': status_upper}
        if result is not None:
            data['result'] = json.dumps(result)
        if error is not None:
            data['error'] = error

        updated = self._request(
            'PUT',
            f'/api/v1/tasks/executions/{execution_id}/status',
            json=data
        )
        return updated.get('execution') if updated else None

    def update_execution_progress(
        self,
        execution_id: str,
        progress: int
    ) -> Optional[Dict[str, Any]]:
        """
        更新执行进度

        Args:
            execution_id: 执行记录 ID
            progress: 进度百分比 (0-100)

        Returns:
            更新后的执行记录 DTO，失败返回 None
        """
        # 确保进度在 0-100 之间
        progress_clamped = max(0, min(100, progress))

        updated = self._request(
            'PUT',
            f'/api/v1/tasks/executions/{execution_id}/progress',
            json={'progress': progress_clamped}
        )
        return updated.get('execution') if updated else None

    def append_execution_log(
        self,
        execution_id: str,
        level: str,
        message: str
    ) -> Optional[Dict[str, Any]]:
        """
        添加执行日志

        Args:
            execution_id: 执行记录 ID
            level: 日志级别 (INFO, WARNING, ERROR, DEBUG)
            message: 日志消息

        Returns:
            更新后的执行记录 DTO，失败返回 None
        """
        updated = self._request(
            'POST',
            f'/api/v1/tasks/executions/{execution_id}/logs',
            json={'level': level, 'message': message}
        )
        return updated.get('execution') if updated else None

    def get_execution_history(self, task_name: str, limit: int = 10) -> List[Dict[str, Any]]:
        """
        获取执行历史

        Args:
            task_name: 任务名称
            limit: 返回记录数量

        Returns:
            执行记录列表
        """
        result = self._request(
            'GET',
            f'/api/v1/tasks/executions',
            params={'taskName': task_name, 'limit': limit}
        )
        return result.get('executions', []) if result else []

    def get_all_executions(self, limit: int = 50) -> List[Dict[str, Any]]:
        """
        获取所有执行记录

        Args:
            limit: 返回记录数量

        Returns:
            执行记录列表
        """
        result = self._request(
            'GET',
            f'/api/v1/tasks/executions',
            params={'limit': limit}
        )
        return result.get('executions', []) if result else []

    # ===== 股票K线数据相关 =====

    def save_stock_klines(
        self,
        code: str,
        klines: List[Dict[str, Any]],
        stock_name: str = None,
        security_type: str = None,
        upsert: bool = False
    ) -> Optional[Dict[str, int]]:
        """
        保存股票K线数据

        Args:
            code: 股票代码
            klines: K线数据列表
            stock_name: 股票名称（可选，用于自动创建股票信息）
            security_type: 证券类型（可选）: 1=股票, 2=指数, 5=ETF
            upsert: 是否覆盖更新（true=存在则更新，false=只插入新数据）

        Returns:
            {'savedCount': 新增数量, 'updatedCount': 更新数量, 'totalCount': 总数量}
            失败返回 None
        """
        data = {
            'code': code,
            'klines': klines
        }
        if stock_name:
            data['stockName'] = stock_name
        if security_type:
            data['type'] = security_type

        # 根据upsert参数选择不同的endpoint
        endpoint = '/api/v1/stocks/internal/upsert-klines' if upsert else '/api/v1/stocks/internal/save-klines'
        result = self._request('POST', endpoint, json=data)
        return result if result else None

    def save_stock_indicators(
        self,
        code: str,
        indicators: Dict[str, Any]
    ) -> Optional[int]:
        """
        保存股票技术指标

        Args:
            code: 股票代码
            indicators: 指标数据

        Returns:
            保存的记录ID，失败返回 None
        """
        data = {
            'code': code,
            'indicators': indicators
        }
        result = self._request('POST', '/api/v1/stocks/internal/save-indicators', json=data)
        return result.get('id') if result else None

    def get_all_stocks(self) -> List[Dict[str, Any]]:
        """
        获取所有股票代码

        Returns:
            股票代码列表，格式 [{'code': '000001'}, ...]
        """
        result = self._request('GET', '/api/v1/stocks/internal/all-stocks')
        return result.get('stocks', []) if result else []

    # ===== 健康检查 =====

    def health_check(self) -> bool:
        """
        检查 Java 后端是否可用

        Returns:
            是否健康
        """
        try:
            response = self.client.get(f"{self.base_url}/actuator/health", timeout=5.0)
            return response.status_code == 200
        except Exception as e:
            logger.warning(f"健康检查失败: {str(e)}")
            return False

    def close(self):
        """关闭客户端"""
        self.client.close()


# 全局单例实例
java_client = JavaAPIClient()
