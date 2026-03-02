#!/usr/bin/env python3
"""
测试任务调度相关的 action handlers

运行方式：
    cd alfred
    source py-service/venv/bin/activate
    python scripts/test_task_actions.py
"""
import sys
import os

# 添加项目路径（指向 py-service 目录）
py_service_path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'py-service')
if os.path.exists(py_service_path):
    sys.path.insert(0, py_service_path)
else:
    # 如果直接在 py-service 目录运行，使用当前目录
    sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from action_handlers import invoke, get_registry


def test_list_actions():
    """列出所有已注册的 actions"""
    print("\n===== 已注册的 Actions =====")
    registry = get_registry()
    actions = registry.list_actions()
    for action in sorted(actions):
        print(f"  - {action}")
    print(f"总计: {len(actions)} 个 actions\n")
    return actions


def test_action_schedule():
    """测试创建定时任务"""
    print("===== 测试 tasks.schedule =====")

    # 创建一个简单的 hello 任务（每分钟执行一次）
    payload = {
        "name": "test_hello_task",
        "taskType": "hello",
        "scheduleType": "interval",
        "intervalSeconds": 60,
        "enabled": False,  # 默认禁用，避免自动执行
        "params": {"name": "Test"}
    }

    result = invoke("tasks.schedule", payload)

    if result.success:
        print(f"  成功: {result.message}")
        print(f"  任务数据: {result.data}")
        return result.data
    else:
        print(f"  失败: {result.message} (code: {result.code})")
        return None


def test_action_list_scheduled():
    """测试获取所有定时任务"""
    print("\n===== 测试 tasks.list_scheduled =====")

    result = invoke("tasks.list_scheduled", {})

    if result.success:
        tasks = result.data.get('tasks', [])
        print(f"  成功: 找到 {len(tasks)} 个任务")
        for task in tasks:
            print(f"    - {task['name']} (type={task['taskType']}, enabled={task['enabled']})")
        return tasks
    else:
        print(f"  失败: {result.message} (code: {result.code})")
        return None


def test_action_execute():
    """测试立即执行任务"""
    print("\n===== 测试 tasks.execute =====")

    payload = {
        "taskName": "manual_hello",
        "taskType": "hello",
        "params": {"name": "Manual Test"}
    }

    result = invoke("tasks.execute", payload)

    if result.success:
        execution_id = result.data.get('execution_id')
        print(f"  成功: {result.message}")
        print(f"  执行ID: {execution_id}")
        return execution_id
    else:
        print(f"  失败: {result.message} (code: {result.code})")
        return None


def test_action_get_execution(execution_id):
    """测试查询执行状态"""
    print(f"\n===== 测试 tasks.get_execution (ID: {execution_id}) =====")

    payload = {
        "executionId": execution_id
    }

    result = invoke("tasks.get_execution", payload)

    if result.success:
        execution = result.data
        print(f"  成功:")
        print(f"    任务名: {execution.get('taskName')}")
        print(f"    状态: {execution.get('status')}")
        print(f"    开始时间: {execution.get('startTime')}")
        if execution.get('result'):
            print(f"    结果: {execution['result']}")
        if execution.get('error'):
            print(f"    错误: {execution['error']}")
        return execution
    else:
        print(f"  失败: {result.message} (code: {result.code})")
        return None


def test_action_get_execution_history():
    """测试获取执行历史"""
    print("\n===== 测试 tasks.get_execution_history =====")

    payload = {
        "taskName": "manual_hello",
        "limit": 5
    }

    result = invoke("tasks.get_execution_history", payload)

    if result.success:
        executions = result.data.get('executions', [])
        print(f"  成功: 找到 {len(executions)} 条执行记录")
        for exec in executions:
            print(f"    - {exec['id']}: {exec['status']} at {exec.get('startTime', 'N/A')}")
        return executions
    else:
        print(f"  失败: {result.message} (code: {result.code})")
        return None


def test_action_toggle(task_id):
    """测试启用/禁用任务"""
    print(f"\n===== 测试 tasks.toggle (task_id: {task_id}) =====")

    payload = {
        "taskId": task_id,
        "enabled": True
    }

    result = invoke("tasks.toggle", payload)

    if result.success:
        print(f"  成功: {result.message}")
    else:
        print(f"  失败: {result.message} (code: {result.code})")

    # 再次禁用
    payload["enabled"] = False
    result = invoke("tasks.toggle", payload)
    if result.success:
        print(f"  再次禁用: {result.message}")


def test_action_delete(task_id):
    """测试删除任务"""
    print(f"\n===== 测试 tasks.delete (task_id: {task_id}) =====")

    payload = {
        "taskId": task_id
    }

    result = invoke("tasks.delete", payload)

    if result.success:
        print(f"  成功: {result.message}")
    else:
        print(f"  失败: {result.message} (code: {result.code})")


def main():
    """主测试流程"""
    print("=" * 60)
    print("任务调度 Action Handlers 测试")
    print("=" * 60)

    # 1. 列出所有已注册的 actions
    actions = test_list_actions()

    # 检查任务调度相关的 actions 是否已注册
    required_actions = [
        "tasks.schedule",
        "tasks.execute",
        "tasks.list_scheduled",
        "tasks.get_execution",
        "tasks.get_execution_history",
        "tasks.delete",
        "tasks.toggle"
    ]

    missing_actions = [a for a in required_actions if a not in actions]
    if missing_actions:
        print(f"警告: 以下 actions 未注册: {missing_actions}")
        print("请确保 action_handlers.py 已被正确导入")
        return

    print("所有任务调度相关的 actions 已正确注册!")

    # 2. 测试创建定时任务
    task = test_action_schedule()
    task_id = task.get('id') if task else None

    # 3. 测试获取所有任务
    test_action_list_scheduled()

    # 4. 测试立即执行任务
    execution_id = test_action_execute()

    # 5. 等待一下，让任务执行
    if execution_id:
        import time
        print("\n等待 2 秒让任务执行...")
        time.sleep(2)

        # 6. 查询执行状态
        test_action_get_execution(execution_id)

        # 7. 获取执行历史
        test_action_get_execution_history()

    # 8. 测试启用/禁用任务
    if task_id:
        test_action_toggle(task_id)

        # 9. 测试删除任务
        # test_action_delete(task_id)  # 可选：测试删除功能

    print("\n" + "=" * 60)
    print("测试完成!")
    print("=" * 60)


if __name__ == "__main__":
    main()
