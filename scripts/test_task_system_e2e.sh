#!/bin/bash

# 获取脚本所在目录的父目录（项目根目录）
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

echo "========================================"
echo "任务调度系统端到端测试"
echo "========================================"
echo "项目根目录: $PROJECT_ROOT"

# 配置
JAVA_BASE_URL="http://localhost:8080"
PYTHON_BASE_URL="http://localhost:8001"

# 颜色输出
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

# 测试计数器
TESTS_PASSED=0
TESTS_FAILED=0

# 测试函数
test_name() {
    echo -e "\n${YELLOW}测试: $1${NC}"
}

test_pass() {
    echo -e "${GREEN}✓ 通过: $1${NC}"
    ((TESTS_PASSED++))
}

test_fail() {
    echo -e "${RED}✗ 失败: $1${NC}"
    ((TESTS_FAILED++))
}

# 检查服务状态
check_services() {
    echo -e "\n${YELLOW}检查服务状态...${NC}"

    # 检查 Java 服务
    if ! curl -s "${JAVA_BASE_URL}/actuator/health" > /dev/null; then
        echo -e "${RED}错误: Java 后端服务未运行${NC}"
        echo "请启动: cd backend && ./gradlew bootRun"
        exit 1
    fi
    echo -e "${GREEN}✓ Java 后端服务运行中${NC}"

    # 检查 Python 服务
    if ! curl -s "${PYTHON_BASE_URL}/health" > /dev/null; then
        echo -e "${RED}错误: Python 微服务未运行${NC}"
        echo "请启动: cd py-service && python3 main.py"
        exit 1
    fi
    echo -e "${GREEN}✓ Python 微服务运行中${NC}"
}

# 登录获取 token
login() {
    test_name "用户登录"
    TOKEN=$(curl -s -X POST "${JAVA_BASE_URL}/api/v1/auth/login" \
        -H "Content-Type: application/json" \
        -d '{"username":"test003","password":"test003"}' | jq -r '.token')

    if [ "$TOKEN" = "null" ] || [ -z "$TOKEN" ]; then
        test_fail "登录失败"
        exit 1
    fi

    test_pass "登录成功"
    echo "Token: ${TOKEN:0:30}..."
}

# ========== Java API 测试 ==========

# 1. 测试创建定时任务
test_name "Java API - 创建定时任务"
TASK_RESPONSE=$(curl -s -X POST "${JAVA_BASE_URL}/api/v1/tasks" \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    -d '{
        "name": "e2e_test_hello_task",
        "taskType": "hello",
        "scheduleType": "interval",
        "intervalSeconds": 3600,
        "enabled": true,
        "params": "{\"name\": \"测试\"}"
    }')

echo "响应: $TASK_RESPONSE"
if echo "$TASK_RESPONSE" | jq -e '.success == true' > /dev/null; then
    TASK_ID=$(echo "$TASK_RESPONSE" | jq -r '.data.task.id')
    test_pass "创建定时任务 (ID: $TASK_ID)"
else
    test_fail "创建定时任务"
fi

# 2. 测试获取任务列表
test_name "Java API - 获取任务列表"
TASKS_RESPONSE=$(curl -s "${JAVA_BASE_URL}/api/v1/tasks" \
    -H "Authorization: Bearer $TOKEN")

echo "响应: $TASKS_RESPONSE"
if echo "$TASKS_RESPONSE" | jq -e '.success == true' > /dev/null; then
    TASK_COUNT=$(echo "$TASKS_RESPONSE" | jq -r '.data.tasks | length')
    test_pass "获取任务列表 (共 $TASK_COUNT 个任务)"
else
    test_fail "获取任务列表"
fi

# 3. 测试获取启用的任务
test_name "Java API - 获取启用的任务"
ENABLED_RESPONSE=$(curl -s "${JAVA_BASE_URL}/api/v1/tasks/enabled" \
    -H "Authorization: Bearer $TOKEN")

if echo "$ENABLED_RESPONSE" | jq -e '.success == true' > /dev/null; then
    ENABLED_COUNT=$(echo "$ENABLED_RESPONSE" | jq -r '.data.tasks | length')
    test_pass "获取启用任务 (共 $ENABLED_COUNT 个启用任务)"
else
    test_fail "获取启用任务"
fi

# 4. 测试立即执行任务
test_name "Java API - 立即执行任务"
EXECUTE_RESPONSE=$(curl -s -X POST "${JAVA_BASE_URL}/api/v1/tasks/executions" \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    -d '{
        "taskName": "e2e_test_hello_task",
        "taskType": "hello",
        "params": "{\"name\": \"端到端测试\"}"
    }')

echo "响应: $EXECUTE_RESPONSE"
if echo "$EXECUTE_RESPONSE" | jq -e '.success == true' > /dev/null; then
    EXECUTION_ID=$(echo "$EXECUTE_RESPONSE" | jq -r '.data.execution.id')
    test_pass "立即执行任务 (执行ID: $EXECUTION_ID)"
else
    test_fail "立即执行任务"
    EXECUTION_ID=""
fi

# 5. 等待并查询执行状态
if [ -n "$EXECUTION_ID" ]; then
    test_name "Java API - 等待任务完成并查询状态"
    sleep 2

    STATUS_RESPONSE=$(curl -s "${JAVA_BASE_URL}/api/v1/tasks/executions/${EXECUTION_ID}" \
        -H "Authorization: Bearer $TOKEN")

    echo "响应: $STATUS_RESPONSE"
    EXECUTION_STATUS=$(echo "$STATUS_RESPONSE" | jq -r '.data.execution.status')
    test_pass "查询执行状态 (状态: $EXECUTION_STATUS)"
fi

# 6. 测试获取执行历史
test_name "Java API - 获取执行历史"
HISTORY_RESPONSE=$(curl -s "${JAVA_BASE_URL}/api/v1/tasks/executions?taskName=e2e_test_hello_task&limit=10" \
    -H "Authorization: Bearer $TOKEN")

if echo "$HISTORY_RESPONSE" | jq -e '.success == true' > /dev/null; then
    HISTORY_COUNT=$(echo "$HISTORY_RESPONSE" | jq -r '.data.executions | length')
    test_pass "获取执行历史 (共 $HISTORY_COUNT 条记录)"
else
    test_fail "获取执行历史"
fi

# 7. 测试禁用任务
test_name "Java API - 禁用任务"
DISABLE_RESPONSE=$(curl -s -X PUT "${JAVA_BASE_URL}/api/v1/tasks/${TASK_ID}/toggle?enabled=false" \
    -H "Authorization: Bearer $TOKEN")

if echo "$DISABLE_RESPONSE" | jq -e '.success == true' > /dev/null; then
    test_pass "禁用任务"
else
    test_fail "禁用任务"
fi

# 8. 测试重新启用任务
test_name "Java API - 重新启用任务"
ENABLE_RESPONSE=$(curl -s -X PUT "${JAVA_BASE_URL}/api/v1/tasks/${TASK_ID}/toggle?enabled=true" \
    -H "Authorization: Bearer $TOKEN")

if echo "$ENABLE_RESPONSE" | jq -e '.success == true' > /dev/null; then
    test_pass "重新启用任务"
else
    test_fail "重新启用任务"
fi

# ========== Python API 测试 ==========

# 9. 测试获取任务类型
test_name "Python API - 获取支持的任务类型"
TYPES_RESPONSE=$(curl -s "${PYTHON_BASE_URL}/api/tasks/types")

if echo "$TYPES_RESPONSE" | jq -e '.success == true' > /dev/null; then
    TYPES=$(echo "$TYPES_RESPONSE" | jq -r '.data.types[]' | tr '\n' ', ')
    test_pass "获取任务类型 (类型: ${Types%,})"
else
    test_fail "获取任务类型"
fi

# 10. 测试异步执行任务
test_name "Python API - 异步执行任务"
ASYNC_RESPONSE=$(curl -s -X POST "${PYTHON_BASE_URL}/api/tasks/execute-async" \
    -H "Content-Type: application/json" \
    -d '{
        "taskType": "hello",
        "params": {"name": "Python测试"}
    }')

echo "响应: $ASYNC_RESPONSE"
if echo "$ASYNC_RESPONSE" | jq -e '.success == true' > /dev/null; then
    PYTHON_EXECUTION_ID=$(echo "$ASYNC_RESPONSE" | jq -r '.data.executionId')
    test_pass "异步执行任务 (执行ID: $PYTHON_EXECUTION_ID)"
else
    test_fail "异步执行任务"
    PYTHON_EXECUTION_ID=""
fi

# 11. 查询 Python 任务状态
if [ -n "$PYTHON_EXECUTION_ID" ]; then
    test_name "Python API - 查询任务状态"
    sleep 2

    PY_STATUS_RESPONSE=$(curl -s "${PYTHON_BASE_URL}/api/tasks/status/${PYTHON_EXECUTION_ID}")

    echo "响应: $PY_STATUS_RESPONSE"
    PY_STATUS=$(echo "$PY_STATUS_RESPONSE" | jq -r '.data.status')
    test_pass "查询Python任务状态 (状态: $PY_STATUS)"
fi

# 12. 测试调度器状态
test_name "Python API - 获取调度器状态"
SCHEDULER_STATUS=$(curl -s "${PYTHON_BASE_URL}/api/scheduler/status")

if echo "$SCHEDULER_STATUS" | jq -e '.success == true' > /dev/null; then
    SCHEDULER_RUNNING=$(echo "$SCHEDULER_STATUS" | jq -r '.data.running')
    JOB_COUNT=$(echo "$SCHEDULER_STATUS" | jq -r '.data.job_count')
    test_pass "获取调度器状态 (运行: $SCHEDULER_RUNNING, 任务数: $JOB_COUNT)"
else
    test_fail "获取调度器状态"
fi

# 13. 测试重新同步调度器
test_name "Python API - 重新同步调度器"
RESYNC_RESPONSE=$(curl -s -X POST "${PYTHON_BASE_URL}/api/scheduler/resync")

if echo "$RESYNC_RESPONSE" | jq -e '.success == true' > /dev/null; then
    test_pass "重新同步调度器"
else
    test_fail "重新同步调度器"
fi

# ========== WebSocket 通信测试 ==========

# 14. 测试通过 Java API 创建执行记录并更新状态
test_name "集成测试 - 创建执行记录并更新状态"
CREATE_EXEC_RESPONSE=$(curl -s -X POST "${JAVA_BASE_URL}/api/v1/tasks/executions" \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    -d '{
        "taskName": "websocket_test_task",
        "taskType": "hello",
        "params": "{\"test\": \"websocket\"}"
    }')

if echo "$CREATE_EXEC_RESPONSE" | jq -e '.success == true' > /dev/null; then
    WS_EXEC_ID=$(echo "$CREATE_EXEC_RESPONSE" | jq -r '.data.execution.id')

    # 更新为运行中
    curl -s -X PUT "${JAVA_BASE_URL}/api/v1/tasks/executions/${WS_EXEC_ID}/status" \
        -H "Authorization: Bearer $TOKEN" \
        -H "Content-Type: application/json" \
        -d '{"status": "RUNNING"}' > /dev/null

    # 更新为完成
    UPDATE_RESPONSE=$(curl -s -X PUT "${JAVA_BASE_URL}/api/v1/tasks/executions/${WS_EXEC_ID}/status" \
        -H "Authorization: Bearer $TOKEN" \
        -H "Content-Type: application/json" \
        -d '{"status": "COMPLETED", "result": "{\"test\": \"success\"}"}')

    if echo "$UPDATE_RESPONSE" | jq -e '.success == true' > /dev/null; then
        test_pass "执行记录状态更新完整流程"
    else
        test_fail "执行记录状态更新"
    fi
else
    test_fail "创建执行记录"
fi

# ========== 清理测试数据 ==========

test_name "清理测试数据"
# 删除测试任务
DELETE_RESPONSE=$(curl -s -X DELETE "${JAVA_BASE_URL}/api/v1/tasks/${TASK_ID}" \
    -H "Authorization: Bearer $TOKEN")

if echo "$DELETE_RESPONSE" | jq -e '.success == true' > /dev/null; then
    test_pass "删除测试任务"
else
    test_fail "删除测试任务"
fi

# ========== 测试总结 ==========

echo -e "\n========================================"
echo "测试总结"
echo "========================================"
echo -e "通过: ${GREEN}${TESTS_PASSED}${NC}"
echo -e "失败: ${RED}${TESTS_FAILED}${NC}"
echo -e "总计: $((TESTS_PASSED + TESTS_FAILED))"

if [ $TESTS_FAILED -eq 0 ]; then
    echo -e "\n${GREEN}所有测试通过！${NC}"
    exit 0
else
    echo -e "\n${RED}部分测试失败，请检查日志${NC}"
    exit 1
fi
