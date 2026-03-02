#!/usr/bin/env python3
"""
验证任务调度相关的 action handlers 是否正确注册

运行方式：
    cd alfred
    source py-service/venv/bin/activate
    python scripts/test_action_handlers_registration.py
"""
import sys
import os

# 添加 py-service 目录到 Python 路径
py_service_path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'py-service')
sys.path.insert(0, py_service_path)

from action_handlers import get_registry, ActionResult


def test_action_registration():
    """测试所有任务调度相关的 action 是否已注册"""
    print("=" * 60)
    print("任务调度 Action Handlers 注册验证")
    print("=" * 60)

    registry = get_registry()
    all_actions = registry.list_actions()

    print("\n已注册的所有 Actions:")
    for action in sorted(all_actions):
        print(f"  - {action}")

    # 检查任务调度相关的 actions
    required_actions = {
        "tasks.schedule": "创建或更新定时任务",
        "tasks.execute": "立即执行任务",
        "tasks.list_scheduled": "获取所有定时任务",
        "tasks.get_execution": "查询执行状态",
        "tasks.get_execution_history": "获取执行历史",
        "tasks.delete": "删除任务",
        "tasks.toggle": "启用/禁用任务"
    }

    print("\n" + "=" * 60)
    print("任务调度 Actions 验证:")
    print("=" * 60)

    all_registered = True
    for action, description in required_actions.items():
        is_registered = registry.has(action)
        status = "✓ 已注册" if is_registered else "✗ 未注册"
        print(f"  {status:12} {action:30} - {description}")
        if not is_registered:
            all_registered = False

    print("\n" + "=" * 60)
    if all_registered:
        print("✓ 所有任务调度相关的 Actions 都已正确注册!")
    else:
        print("✗ 部分 Actions 未注册，请检查 action_handlers.py")
    print("=" * 60)

    return all_registered


def test_action_signature():
    """测试 action 处理器的函数签名是否正确"""
    print("\n" + "=" * 60)
    print("Action 处理器签名验证")
    print("=" * 60)

    registry = get_registry()

    test_cases = [
        {
            "action": "tasks.schedule",
            "payload": {
                "name": "test_task",
                "taskType": "hello",
                "scheduleType": "interval",
                "intervalSeconds": 60,
                "enabled": False
            },
            "description": "测试参数验证（不依赖后端）"
        },
        {
            "action": "tasks.execute",
            "payload": {
                "taskName": "test",
                "taskType": "hello",
                "params": {}
            },
            "description": "测试参数验证（不依赖后端）"
        },
        {
            "action": "tasks.list_scheduled",
            "payload": {},
            "description": "测试空参数"
        },
        {
            "action": "tasks.get_execution",
            "payload": {"executionId": "test-id"},
            "description": "测试参数验证"
        },
        {
            "action": "tasks.get_execution_history",
            "payload": {"taskName": "test", "limit": 10},
            "description": "测试参数验证"
        },
        {
            "action": "tasks.delete",
            "payload": {"taskId": 123},
            "description": "测试参数验证"
        },
        {
            "action": "tasks.toggle",
            "payload": {"taskId": 123, "enabled": True},
            "description": "测试参数验证"
        }
    ]

    print("\n注意: 以下测试会尝试调用 Java API，如果后端未运行会失败")
    print("这是正常的，我们主要验证函数签名和参数处理逻辑\n")

    for test_case in test_cases:
        action = test_case["action"]
        payload = test_case["payload"]
        description = test_case["description"]

        print(f"测试 {action} - {description}")
        print(f"  参数: {payload}")

        handler = registry.get(action)
        if handler:
            try:
                # 尝试调用（可能会因为后端未运行而失败）
                result = handler(payload)
                print(f"  结果: success={result.success}, code={result.code}, message={result.message}")
            except Exception as e:
                print(f"  异常: {type(e).__name__}: {str(e)[:100]}")
        else:
            print(f"  ✗ Handler 未找到")
        print()


def test_missing_parameters():
    """测试缺少必需参数的情况"""
    print("=" * 60)
    print("参数验证测试（缺少必需参数）")
    print("=" * 60)

    registry = get_registry()

    test_cases = [
        {
            "action": "tasks.schedule",
            "payload": {},  # 缺少 name
            "expected_code": 400,
            "expected_message": "缺少 name 参数"
        },
        {
            "action": "tasks.execute",
            "payload": {},  # 缺少 taskName
            "expected_code": 400,
            "expected_message": "缺少 taskName 参数"
        },
        {
            "action": "tasks.get_execution",
            "payload": {},  # 缺少 executionId
            "expected_code": 400,
            "expected_message": "缺少 executionId"
        },
        {
            "action": "tasks.get_execution_history",
            "payload": {},  # 缺少 taskName
            "expected_code": 400,
            "expected_message": "缺少 taskName"
        },
        {
            "action": "tasks.delete",
            "payload": {},  # 缺少 taskId
            "expected_code": 400,
            "expected_message": "缺少 taskId"
        },
        {
            "action": "tasks.toggle",
            "payload": {},  # 缺少 taskId
            "expected_code": 400,
            "expected_message": "缺少 taskId"
        }
    ]

    print("\n")
    for test_case in test_cases:
        action = test_case["action"]
        payload = test_case["payload"]
        expected_code = test_case["expected_code"]
        expected_message = test_case["expected_message"]

        handler = registry.get(action)
        if handler:
            result = handler(payload)

            status = "✓" if result.code == expected_code and expected_message in result.message else "✗"
            print(f"{status} {action:30} - code={result.code}, message={result.message}")

        print()


def main():
    """主测试流程"""
    print()

    # 1. 测试注册
    registered = test_action_registration()

    if not registered:
        print("\n请确保 action_handlers.py 中的所有 actions 都已正确注册")
        return

    # 2. 测试函数签名
    test_action_signature()

    # 3. 测试参数验证
    test_missing_parameters()

    print("\n" + "=" * 60)
    print("验证完成!")
    print("=" * 60)


if __name__ == "__main__":
    main()
