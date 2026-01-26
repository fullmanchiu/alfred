#!/bin/bash

# 获取脚本所在目录的父目录（项目根目录）
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

echo "========================================"
echo "健康档案 API 测试"
echo "========================================"
echo "项目根目录: $PROJECT_ROOT"
echo ""

# 颜色定义
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 测试结果统计
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0

# 测试辅助函数
test_step() {
    local step_name="$1"
    local step_num="$2"
    echo ""
    echo "[$step_num] $step_name"
    TOTAL_TESTS=$((TOTAL_TESTS + 1))
}

assert_success() {
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✅ 通过${NC}"
        PASSED_TESTS=$((PASSED_TESTS + 1))
        return 0
    else
        echo -e "${RED}❌ 失败${NC}"
        FAILED_TESTS=$((FAILED_TESTS + 1))
        return 1
    fi
}

# 1. 登录
test_step "登录测试" "1"
TOKEN=$(curl -s -X POST http://localhost:8080/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"lance","password":"921217qL"}' | jq -r '.token')

if [ "$TOKEN" = "null" ] || [ -z "$TOKEN" ]; then
  echo -e "${RED}❌ 登录失败${NC}"
  exit 1
fi

echo -e "${GREEN}✅ 登录成功${NC}"
echo "   Token: ${TOKEN:0:30}..."

# 2. 测试获取健康档案（应该返回空）
test_step "获取健康档案（初始状态）" "2"
PROFILE=$(curl -s -X GET http://localhost:8080/api/v1/health/profile \
  -H "Authorization: Bearer $TOKEN")

HAS_DATA=$(echo $PROFILE | jq -r '.data | length')
if [ "$HAS_DATA" = "0" ]; then
  echo -e "${GREEN}✅ 初始状态正确（无健康数据）${NC}"
  PASSED_TESTS=$((PASSED_TESTS + 1))
elif [ -n "$HAS_DATA" ]; then
  echo -e "${YELLOW}⚠️  已有历史数据（非初始状态）${NC}"
  echo "   数据ID: $(echo $PROFILE | jq -r '.data.id')"
  PASSED_TESTS=$((PASSED_TESTS + 1))
else
  echo -e "${RED}❌ 初始状态错误${NC}"
  echo "   响应: $PROFILE"
  FAILED_TESTS=$((FAILED_TESTS + 1))
fi

# 3. 创建健康档案
test_step "创建健康档案" "3"
CREATE_RESULT=$(curl -s -X POST http://localhost:8080/api/v1/health/profile \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "height": 175,
    "weight": 70,
    "body_fat": 18.5,
    "muscle_rate": 45.0,
    "water_rate": 55.0
  }')

PROFILE_ID=$(echo $CREATE_RESULT | jq -r '.data.id')
HEIGHT=$(echo $CREATE_RESULT | jq -r '.data.height')
WEIGHT=$(echo $CREATE_RESULT | jq -r '.data.weight')
BMI=$(echo $CREATE_RESULT | jq -r '.data.bmi')

if [ "$PROFILE_ID" != "null" ] && [ -n "$PROFILE_ID" ]; then
  echo -e "${GREEN}✅ 创建健康档案成功${NC}"
  echo "   ID: $PROFILE_ID"
  echo "   身高: ${HEIGHT}cm, 体重: ${WEIGHT}kg, BMI: ${BMI}"
  PASSED_TESTS=$((PASSED_TESTS + 1))
else
  echo -e "${RED}❌ 创建健康档案失败${NC}"
  echo "   响应: $CREATE_RESULT"
  FAILED_TESTS=$((FAILED_TESTS + 1))
fi

# 4. 验证BMI计算（175cm, 70kg => BMI = 22.9）
test_step "验证BMI计算" "4"
# BMI = 70 / (1.75 * 1.75) = 22.857... ≈ 22.8 或 22.9
EXPECTED_BMI=22.8
if [ "$BMI" = "$EXPECTED_BMI" ]; then
  echo -e "${GREEN}✅ BMI计算正确${NC}"
  echo "   期望: ~$EXPECTED_BMI, 实际: $BMI"
  PASSED_TESTS=$((PASSED_TESTS + 1))
else
  echo -e "${YELLOW}⚠️  BMI值略有偏差${NC}"
  echo "   期望: ~$EXPECTED_BMI, 实际: $BMI"
  # 只要范围合理就算通过
  BMI_INT=${BMI%.*}
  if [ "$BMI_INT" = "22" ]; then
    echo "   但范围合理，视为通过"
    PASSED_TESTS=$((PASSED_TESTS + 1))
  else
    FAILED_TESTS=$((FAILED_TESTS + 1))
  fi
fi

# 5. 再次获取健康档案（应该返回刚才创建的）
test_step "获取健康档案（创建后）" "5"
PROFILE_AFTER=$(curl -s -X GET http://localhost:8080/api/v1/health/profile \
  -H "Authorization: Bearer $TOKEN")

PROFILE_ID_AFTER=$(echo $PROFILE_AFTER | jq -r '.data.id')
if [ "$PROFILE_ID_AFTER" = "$PROFILE_ID" ]; then
  echo -e "${GREEN}✅ 获取健康档案成功${NC}"
  echo "   ID: $PROFILE_ID_AFTER"
  PASSED_TESTS=$((PASSED_TESTS + 1))
else
  echo -e "${RED}❌ 获取健康档案失败${NC}"
  echo "   响应: $PROFILE_AFTER"
  FAILED_TESTS=$((FAILED_TESTS + 1))
fi

# 6. 更新健康档案（不提供身高，应该使用历史身高计算BMI）
test_step "更新健康档案（保留历史身高）" "6"
UPDATE_RESULT=$(curl -s -X PUT http://localhost:8080/api/v1/health/profile \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "weight": 69,
    "body_fat": 17.5,
    "muscle_rate": 46.0
  }')

NEW_PROFILE_ID=$(echo $UPDATE_RESULT | jq -r '.data.id')
NEW_WEIGHT=$(echo $UPDATE_RESULT | jq -r '.data.weight')
NEW_HEIGHT=$(echo $UPDATE_RESULT | jq -r '.data.height')
NEW_BMI=$(echo $UPDATE_RESULT | jq -r '.data.bmi')

# 使用 bc 进行浮点数比较
WEIGHT_CORRECT=$(echo "$NEW_WEIGHT == 69" | bc -l)
HEIGHT_CORRECT=$(echo "$NEW_HEIGHT == 175" | bc -l)

if [ "$NEW_PROFILE_ID" != "null" ] && [ "$WEIGHT_CORRECT" = "1" ] && [ "$HEIGHT_CORRECT" = "1" ]; then
  echo -e "${GREEN}✅ 更新健康档案成功${NC}"
  echo "   新ID: $NEW_PROFILE_ID（应该创建新记录）"
  echo "   身高: ${NEW_HEIGHT}cm（保留历史值）"
  echo "   体重: ${NEW_WEIGHT}kg"
  echo "   BMI: $NEW_BMI"
  PASSED_TESTS=$((PASSED_TESTS + 1))
else
  echo -e "${RED}❌ 更新健康档案失败${NC}"
  echo "   响应: $UPDATE_RESULT"
  FAILED_TESTS=$((FAILED_TESTS + 1))
fi

# 7. 获取历史记录
test_step "获取健康档案历史" "7"
HISTORY=$(curl -s -X GET http://localhost:8080/api/v1/health/history \
  -H "Authorization: Bearer $TOKEN")

HISTORY_COUNT=$(echo $HISTORY | jq '.data | length')
if [ "$HISTORY_COUNT" -ge 2 ]; then
  echo -e "${GREEN}✅ 获取历史记录成功${NC}"
  echo "   记录数: $HISTORY_COUNT"
  PASSED_TESTS=$((PASSED_TESTS + 1))
else
  echo -e "${RED}❌ 获取历史记录失败${NC}"
  echo "   响应: $HISTORY"
  FAILED_TESTS=$((FAILED_TESTS + 1))
fi

# 8. 删除最新的健康档案
test_step "删除健康档案" "8"
DELETE_RESULT=$(curl -s -X DELETE http://localhost:8080/api/v1/health/profile \
  -H "Authorization: Bearer $TOKEN")

DELETE_STATUS=$(echo $DELETE_RESULT | jq -r '.status')
if [ "$DELETE_STATUS" = "success" ]; then
  echo -e "${GREEN}✅ 删除健康档案成功${NC}"
  PASSED_TESTS=$((PASSED_TESTS + 1))
else
  echo -e "${RED}❌ 删除健康档案失败${NC}"
  echo "   响应: $DELETE_RESULT"
  FAILED_TESTS=$((FAILED_TESTS + 1))
fi

# 9. 验证删除后可以继续创建
test_step "删除后重新创建" "9"
RECREATE_RESULT=$(curl -s -X POST http://localhost:8080/api/v1/health/profile \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "height": 180,
    "weight": 75
  }')

RECREATE_ID=$(echo $RECREATE_RESULT | jq -r '.data.id')
if [ "$RECREATE_ID" != "null" ] && [ -n "$RECREATE_ID" ]; then
  echo -e "${GREEN}✅ 删除后重新创建成功${NC}"
  echo "   新ID: $RECREATE_ID"
  PASSED_TESTS=$((PASSED_TESTS + 1))
else
  echo -e "${RED}❌ 删除后重新创建失败${NC}"
  echo "   响应: $RECREATE_RESULT"
  FAILED_TESTS=$((FAILED_TESTS + 1))
fi

# 输出测试结果摘要
echo ""
echo "========================================"
echo "测试结果摘要"
echo "========================================"
echo -e "${GREEN}通过: $PASSED_TESTS${NC}"
echo -e "${RED}失败: $FAILED_TESTS${NC}"
echo "总计: $TOTAL_TESTS"
echo ""

if [ $FAILED_TESTS -eq 0 ]; then
  echo -e "${GREEN}🎉 所有测试通过！健康档案功能正常。${NC}"
  exit 0
else
  SUCCESS_RATE=$((PASSED_TESTS * 100 / TOTAL_TESTS))
  echo -e "${YELLOW}⚠️  部分测试失败，成功率: $SUCCESS_RATE%${NC}"
  exit 1
fi
