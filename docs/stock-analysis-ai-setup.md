# 股票分析 AI 功能配置说明

## ⚠️ 重要提示

**AI 分析报告功能需要配置 OpenAI API Key 才能正常工作。**

如果没有配置 API Key，股票分析功能仍然可用，但 AI 报告部分会显示错误信息。

---

## 🔑 配置步骤

### 方式 1: 配置本地开发环境

编辑文件：`stock-analysis-service/.env`

```bash
cd /Users/qiuliang/code/alfred/stock-analysis-service
vi .env
```

修改以下内容：

```bash
# 替换为你的真实 API Key
OPENAI_API_KEY=sk-your-real-api-key-here

# 可选：使用其他兼容 OpenAI 的服务
# OPENAI_BASE_URL=https://api.openai.com/v1
# OPENAI_MODEL=gpt-4
```

### 方式 2: 使用环境变量（推荐用于生产环境）

```bash
export OPENAI_API_KEY=sk-your-real-api-key-here
```

### 方式 3: 使用兼容 OpenAI 的其他服务

你可以使用国内的大模型服务（如通义千问、DeepSeek、智谱等），它们提供了兼容 OpenAI 的 API：

**阿里云通义千问**:
```bash
OPENAI_API_KEY=sk-your-qwen-key
OPENAI_BASE_URL=https://dashscope.aliyuncs.com/compatible-mode/v1
OPENAI_MODEL=qwen-plus
```

**DeepSeek**:
```bash
OPENAI_API_KEY=sk-your-deepseek-key
OPENAI_BASE_URL=https://api.deepseek.com/v1
OPENAI_MODEL=deepseek-chat
```

---

## 🔄 重启服务

配置完成后，重启 Python 服务：

```bash
# 停止旧服务
pkill -f "uvicorn api.main:app"

# 启动新服务
cd /Users/qiuliang/code/alfred/stock-analysis-service
source venv/bin/activate
uvicorn api.main:app --host 0.0.0.0 --port 8001
```

---

## ✅ 验证配置

1. 访问 http://localhost:3000/
2. 登录后进入股票分析页面
3. 输入股票代码（如 600000）
4. 点击"快速分析"
5. 查看 AI 分析报告卡片

如果配置正确，会看到详细的 AI 分析报告（投资建议、风险提示等）。

如果配置不正确，会看到错误提示：`AI 分析生成失败: 未设置API密钥...`

---

## 💰 费用说明

- OpenAI API 按使用量收费
- GPT-4 大约 $0.03-0.06 每次分析
- GPT-3.5 更便宜，大约 $0.002 每次分析
- 使用国内服务（通义千问等）通常更便宜

---

## 🚀 不配置 API Key 也能用

**重要**：即使不配置 AI API Key，以下功能仍然完全可用：

- ✅ 获取股票实时行情
- ✅ 技术分析（20+ 指标）
- ✅ 基本面评分
- ✅ 趋势分析
- ❌ AI 分析报告（需要 API Key）

---

## 📝 示例 API Key 获取地址

- **OpenAI**: https://platform.openai.com/api-keys
- **阿里云通义千问**: https://dashscope.aliyuncs.com/
- **DeepSeek**: https://platform.deepseek.com/
- **智谱 AI**: https://open.bigmodel.cn/
