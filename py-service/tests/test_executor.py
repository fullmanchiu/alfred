#!/usr/bin/env python3
"""
任务执行器测试脚本
"""
import sys
import os

# 添加项目路径
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from logging_config import setup_logging
from executor.task_executor import (
    submit_task,
    get_running_tasks,
    shutdown_executor,
    execute_hello
)

# 设置日志
setup_logging()


def test_submit_task():
    """测试任务提交"""
    print("\n=== 测试任务提交 ===")

    # 提交一个 hello 任务
    submit_task(
        task_name="test_hello",
        task_type="hello",
        params={"name": "Alfred"}
    )

    print("任务已提交，等待执行...")

    # 检查运行中的任务
    running = get_running_tasks()
    print(f"运行中的任务: {running}")


def test_execute_hello():
    """测试 hello 任务"""
    print("\n=== 测试 Hello 任务 ===")

    result = execute_hello({"name": "Traveler"})
    print(f"Hello 任务结果: {result}")


def test_sync_klines():
    """测试 K 线同步任务"""
    print("\n=== 测试 K 线同步任务 ===")

    submit_task(
        task_name="test_sync_klines",
        task_type="sync_klines",
        params={"stock_code": "601985"}
    )

    print("K 线同步任务已提交，等待执行...")


def main():
    """主函数"""
    print("任务执行器测试")

    try:
        # 测试直接执行
        test_execute_hello()

        # 测试任务提交
        test_submit_task()

        # 测试 K 线同步
        test_sync_klines()

        # 等待任务完成
        print("\n等待任务完成...")
        import time
        time.sleep(5)

        # 检查运行中的任务
        running = get_running_tasks()
        print(f"\n运行中的任务: {running}")

    except Exception as e:
        print(f"测试失败: {str(e)}")
        import traceback
        traceback.print_exc()

    finally:
        # 关闭执行器
        shutdown_executor(wait=True)
        print("\n执行器已关闭")


if __name__ == "__main__":
    main()
