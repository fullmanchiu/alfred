"""
模型单元测试
使用内存 SQLite 数据库测试
"""

import sys
import os
import unittest
from datetime import datetime

# 添加项目根目录到 Python 路径
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from models import ScheduledTask, TaskExecution, ExecutionStatus, Base


class TestModels(unittest.TestCase):
    """测试数据库模型"""

    def setUp(self):
        """设置测试数据库"""
        # 使用内存 SQLite 数据库
        self.engine = create_engine('sqlite:///:memory:')
        Base.metadata.create_all(self.engine)
        self.Session = sessionmaker(bind=self.engine)
        self.session = self.Session()

    def tearDown(self):
        """清理测试数据库"""
        self.session.close()
        Base.metadata.drop_all(self.engine)

    def test_scheduled_task_creation(self):
        """测试 ScheduledTask 创建"""
        task = ScheduledTask(
            name='test_task',
            task_type='stock_sync',
            schedule_type='cron',
            cron_expr='0 9 * * MON-FRI',
            enabled=True,
            params={'stock_code': '000001'}
        )
        self.session.add(task)
        self.session.commit()

        # 验证数据
        saved_task = self.session.query(ScheduledTask).filter_by(name='test_task').first()
        self.assertIsNotNone(saved_task)
        self.assertEqual(saved_task.task_type, 'stock_sync')
        self.assertEqual(saved_task.schedule_type, 'cron')
        self.assertTrue(saved_task.enabled)

    def test_scheduled_task_to_dict(self):
        """测试 ScheduledTask 序列化"""
        task = ScheduledTask(
            name='test_task',
            task_type='stock_sync',
            schedule_type='cron',
            cron_expr='0 9 * * MON-FRI',
            enabled=True,
            params={'stock_code': '000001'}
        )
        task_dict = task.to_dict()

        self.assertEqual(task_dict['name'], 'test_task')
        self.assertEqual(task_dict['task_type'], 'stock_sync')
        self.assertEqual(task_dict['schedule_type'], 'cron')
        self.assertTrue(task_dict['enabled'])
        self.assertEqual(task_dict['params']['stock_code'], '000001')

    def test_task_execution_creation(self):
        """测试 TaskExecution 创建"""
        execution = TaskExecution(
            task_name='test_task',
            status=ExecutionStatus.PENDING,
            retry_count=0,
            max_retries=3
        )
        self.session.add(execution)
        self.session.commit()

        # 验证数据
        saved_execution = self.session.query(TaskExecution).filter_by(task_name='test_task').first()
        self.assertIsNotNone(saved_execution)
        self.assertEqual(saved_execution.status, ExecutionStatus.PENDING)
        self.assertEqual(saved_execution.retry_count, 0)
        self.assertEqual(saved_execution.max_retries, 3)

    def test_task_execution_to_dict(self):
        """测试 TaskExecution 序列化"""
        execution = TaskExecution(
            task_name='test_task',
            status=ExecutionStatus.PENDING,
            retry_count=0,
            max_retries=3
        )
        execution_dict = execution.to_dict()

        self.assertEqual(execution_dict['task_name'], 'test_task')
        self.assertEqual(execution_dict['status'], 'pending')
        self.assertEqual(execution_dict['retry_count'], 0)
        self.assertEqual(execution_dict['max_retries'], 3)

    def test_execution_status_enum(self):
        """测试 ExecutionStatus 枚举"""
        self.assertEqual(ExecutionStatus.PENDING, 'pending')
        self.assertEqual(ExecutionStatus.RUNNING, 'running')
        self.assertEqual(ExecutionStatus.COMPLETED, 'completed')
        self.assertEqual(ExecutionStatus.FAILED, 'failed')

    def test_scheduled_task_unique_name(self):
        """测试任务名称唯一性"""
        task1 = ScheduledTask(
            name='duplicate_task',
            task_type='stock_sync',
            schedule_type='cron',
            cron_expr='0 9 * * MON-FRI',
            enabled=True
        )
        self.session.add(task1)
        self.session.commit()

        # 尝试创建同名任务
        task2 = ScheduledTask(
            name='duplicate_task',
            task_type='stock_sync',
            schedule_type='interval',
            interval_seconds=3600,
            enabled=True
        )
        self.session.add(task2)

        # 应该抛出异常
        with self.assertRaises(Exception):
            self.session.commit()


if __name__ == '__main__':
    unittest.main()
