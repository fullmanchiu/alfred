#!/usr/bin/env python3
"""
任务执行器演示脚本
"""
import sys
import os
import time

# 添加项目路径
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from logging_config import setup_logging, get_logger

# 设置日志
setup_logging(service_name='executor-demo', log_level='INFO')
logger = get_logger('demo')


def demo_hello_task():
    """演示 Hello 任务"""
    print("\n=== 演示 1: Hello 任务 ===")

    from executor.task_executor import execute_hello

    result = execute_hello({"name": "Alfred"})
    print(f"结果: {result}")


def demo_dispatch_task():
    """演示任务分发"""
    print("\n=== 演示 2: 任务分发 ===")

    from executor.task_executor import dispatch_task

    # 测试 hello 任务
    result = dispatch_task("hello", {"name": "Traveler"})
    print(f"Hello 任务结果: {result}")

    # 测试 calculate_indicators 任务
    result = dispatch_task("calculate_indicators", {
        "stock_code": "000001",
        "indicators": ["MA", "MACD"]
    })
    print(f"指标计算结果: {result}")


def demo_running_tasks():
    """演示运行中的任务管理"""
    print("\n=== 演示 3: 运行中的任务 ===")

    from executor.task_executor import get_running_tasks

    running = get_running_tasks()
    print(f"当前运行中的任务: {running}")


def demo_unknown_task():
    """演示未知任务类型"""
    print("\n=== 演示 4: 未知任务类型 ===")

    from executor.task_executor import dispatch_task

    try:
        dispatch_task("unknown_type", {})
    except ValueError as e:
        print(f"捕获到预期错误: {e}")


def main():
    """主函数"""
    print("=" * 50)
    print("任务执行器演示")
    print("=" * 50)

    try:
        # 演示 1: Hello 任务
        demo_hello_task()

        # 演示 2: 任务分发
        demo_dispatch_task()

        # 演示 3: 运行中的任务
        demo_running_tasks()

        # 演示 4: 未知任务类型
        demo_unknown_task()

        print("\n" + "=" * 50)
        print("演示完成！")
        print("=" * 50)

    except Exception as e:
        logger.error(f"演示失败: {str(e)}", exc_info=True)
        print(f"\n错误: {str(e)}")


if __name__ == "__main__":
    main()
