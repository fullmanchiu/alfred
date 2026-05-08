#!/bin/bash

# 测试股票详情页（单chart多pane测试版）
# Test Stock Detail Test Page (Single Chart Multi-Pane)

BASE_URL="http://localhost:3000"

echo "🧪 测试股票详情测试页..."
echo "================================"

# 测试1: 检查页面是否可访问
echo "📋 测试1: 检查测试页面路由"
STOCK_CODE="000001"
TEST_URL="${BASE_URL}/stocks/test/${STOCK_CODE}"
echo "测试URL: $TEST_URL"

# 这里只输出URL，实际测试需要在浏览器中进行
echo "✅ 请在浏览器中访问: $TEST_URL"
echo ""
echo "📝 测试清单:"
echo "  1. 页面是否正常加载"
echo "  2. K线图是否显示"
echo "  3. 是否有3个默认副图（VOL、MACD、KDJ）"
echo "  4. 点击添加副图按钮是否能添加新副图"
echo "  5. 点击删除副图按钮是否能删除副图"
echo "  6. 副图数量是否限制在4个以内"
echo "  7. 刷新按钮是否能重新加载数据"
echo ""
echo "✅ 测试URL已生成，请在浏览器中手动测试"
