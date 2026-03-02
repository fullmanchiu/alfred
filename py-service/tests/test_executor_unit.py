#!/usr/bin/env python3
"""
任务执行器单元测试
"""
import sys
import os
import unittest
from unittest.mock import Mock, patch, MagicMock

# 添加项目路径
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from executor.task_executor import (
    submit_task,
    execute_hello,
    execute_calculate_indicators,
    dispatch_task,
    get_running_tasks,
    _running_tasks,
    _running_lock
)


class TestTaskExecutor(unittest.TestCase):
    """任务执行器测试"""

    def setUp(self):
        """测试前准备"""
        # 清空运行中的任务
        with _running_lock:
            _running_tasks.clear()

    def test_execute_hello(self):
        """测试 Hello 任务执行"""
        result = execute_hello({"name": "Traveler"})
        self.assertEqual(result['message'], 'Hello, Traveler!')
        self.assertIn('timestamp', result)

    def test_execute_calculate_indicators(self):
        """测试技术指标计算"""
        result = execute_calculate_indicators({
            "stock_code": "000001",
            "indicators": ["MA", "MACD"]
        })
        self.assertEqual(result['stock_code'], '000001')
        self.assertEqual(result['indicators'], ["MA", "MACD"])

    @patch('executor.task_executor.java_client')
    def test_submit_task_creates_execution(self, mock_java_client):
        """测试任务提交创建执行记录"""
        # Mock Java 客户端
        mock_execution = {'id': 'test-execution-123'}
        mock_java_client.create_execution.return_value = mock_execution
        mock_java_client.update_execution_status.return_value = mock_execution

        # 提交任务
        submit_task("test_task", "hello", {"name": "Test"})

        # 验证创建执行记录被调用
        mock_java_client.create_execution.assert_called_once()
        call_args = mock_java_client.create_execution.call_args
        self.assertEqual(call_args[1]['task_name'], 'test_task')
        self.assertEqual(call_args[1]['task_type'], 'hello')

    @patch('executor.task_executor.java_client')
    def test_submit_task_idempotency(self, mock_java_client):
        """测试任务提交的幂等性"""
        # Mock Java 客户端
        mock_execution = {'id': 'test-execution-123'}
        mock_java_client.create_execution.return_value = mock_execution
        mock_java_client.update_execution_status.return_value = mock_execution

        # 提交相同的任务两次
        submit_task("duplicate_task", "hello", {"name": "Test"})
        submit_task("duplicate_task", "hello", {"name": "Test"})

        # 验证只创建了一次执行记录
        self.assertEqual(mock_java_client.create_execution.call_count, 1)

    @patch('executor.task_executor.java_client')
    @patch('executor.task_executor.executor')
    def test_submit_task_submits_to_pool(self, mock_executor_pool, mock_java_client):
        """测试任务提交到线程池"""
        # Mock Java 客户端和线程池
        mock_execution = {'id': 'test-execution-123'}
        mock_java_client.create_execution.return_value = mock_execution
        mock_executor_pool.submit.return_value = MagicMock()

        # 提交任务
        submit_task("test_task", "hello", {"name": "Test"})

        # 验证任务被提交到线程池
        mock_executor_pool.submit.assert_called_once()

    def test_get_running_tasks(self):
        """测试获取运行中的任务"""
        # 手动添加运行中的任务
        with _running_lock:
            _running_tasks['task1'] = 'exec-1'
            _running_tasks['task2'] = 'exec-2'

        # 获取运行中的任务
        running = get_running_tasks()

        # 验证结果
        self.assertEqual(len(running), 2)
        self.assertEqual(running['task1'], 'exec-1')
        self.assertEqual(running['task2'], 'exec-2')

    def test_dispatch_task_unknown_type(self):
        """测试未知任务类型"""
        with self.assertRaises(ValueError) as context:
            dispatch_task("unknown_type", {})

        self.assertIn("未知任务类型", str(context.exception))


if __name__ == '__main__':
    unittest.main()
