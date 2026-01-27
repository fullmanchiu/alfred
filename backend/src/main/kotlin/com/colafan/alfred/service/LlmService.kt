package com.colafan.alfred.service

import com.colafan.alfred.config.LlmConfig
import com.fasterxml.jackson.databind.JsonNode
import com.fasterxml.jackson.databind.ObjectMapper
import com.fasterxml.jackson.module.kotlin.jacksonObjectMapper
import org.slf4j.LoggerFactory
import org.springframework.http.HttpEntity
import org.springframework.http.HttpHeaders
import org.springframework.http.MediaType
import org.springframework.http.codec.ServerSentEvent
import org.springframework.stereotype.Service
import org.springframework.web.client.RestTemplate
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter
import java.io.BufferedReader
import java.io.InputStreamReader
import java.net.HttpURLConnection
import java.net.URL
import java.nio.charset.StandardCharsets

/**
 * LLM服务类
 * 提供AI建议和财务分析功能
 */
@Service
class LlmService(
    private val llmConfig: LlmConfig,
    private val restTemplate: RestTemplate,
    private val transactionService: TransactionService,
    private val budgetService: BudgetService
) {
    private val logger = LoggerFactory.getLogger(LlmService::class.java)
    private val mapper: ObjectMapper = jacksonObjectMapper()

    /**
     * 识别用户意图
     * @param userInput 用户输入
     * @return 意图类型
     */
    fun recognizeIntent(userInput: String): com.colafan.alfred.dto.Intent {
        val prompt = """你是意图识别助手。将用户输入分类为以下之一：
- QUERY_TRANSACTION: 查询消费、记账、花了多少钱、交易记录
- ADD_TRANSACTION: 记账、添加交易、记录支出
- QUERY_BUDGET: 查询预算、预算使用情况
- QUERY_HEALTH: 查询健康、体重、运动数据
- QUERY_ACTIVITY: 查询运动、骑行、活动记录
- CHAT: 闲聊、问候、其他无法分类的问题

用户输入：$userInput

只返回意图名称（QUERY_TRANSACTION/ADD_TRANSACTION/QUERY_BUDGET/QUERY_HEALTH/QUERY_ACTIVITY/CHAT），不要解释。
"""

        return try {
            val systemPrompt = "你是意图识别专家。只返回意图类型名称，不要其他内容。"
            val response = callOpenAICompatible(prompt, systemPrompt)

            when (response.trim().uppercase()) {
                "QUERY_TRANSACTION" -> com.colafan.alfred.dto.Intent.QUERY_TRANSACTION
                "ADD_TRANSACTION" -> com.colafan.alfred.dto.Intent.ADD_TRANSACTION
                "QUERY_BUDGET" -> com.colafan.alfred.dto.Intent.QUERY_BUDGET
                "QUERY_HEALTH" -> com.colafan.alfred.dto.Intent.QUERY_HEALTH
                "QUERY_ACTIVITY" -> com.colafan.alfred.dto.Intent.QUERY_ACTIVITY
                "CHAT" -> com.colafan.alfred.dto.Intent.CHAT
                else -> com.colafan.alfred.dto.Intent.UNKNOWN
            }
        } catch (e: Exception) {
            logger.warn("意图识别失败，默认为CHAT: ${e.message}")
            com.colafan.alfred.dto.Intent.CHAT
        }
    }

    /**
     * 生成预算分析建议
     */
    fun analyzeBudget(userId: Long, period: String = "monthly"): String {
        val prompt = buildBudgetPrompt(userId, period)
        return callLLM(prompt)
    }

    /**
     * 生成消费建议
     */
    fun analyzeSpending(
        transactions: List<Map<String, Any?>>,
        budgetInfo: Map<String, Any?>
    ): String {
        val prompt = buildSpendingPrompt(transactions, budgetInfo)
        return callLLM(prompt)
    }

    /**
     * 生成财务健康报告
     */
    fun generateFinancialReport(
        income: Double,
        expenses: Double,
        savings: Double,
        topCategories: List<Map<String, Any?>>
    ): String {
        val prompt = buildFinancialReportPrompt(income, expenses, savings, topCategories)
        return callLLM(prompt)
    }

    /**
     * 调用LLM API
     */
    private fun callLLM(userPrompt: String): String {
        val systemPrompt = getSystemPrompt()

        return when (llmConfig.provider) {
            "custom", "openai" -> callOpenAICompatible(userPrompt, systemPrompt)
            "anthropic" -> callAnthropic(userPrompt, systemPrompt)
            else -> throw IllegalArgumentException("不支持的LLM提供商: ${llmConfig.provider}")
        }
    }

    /**
     * 调用OpenAI兼容API
     */
    private fun callOpenAICompatible(userPrompt: String, systemPrompt: String): String {
        val apiKey = if (llmConfig.provider == "custom") {
            llmConfig.custom.apiKey
        } else {
            llmConfig.openai.apiKey
        }

        val baseUrl = if (llmConfig.provider == "custom") {
            llmConfig.custom.baseUrl
        } else {
            llmConfig.openai.baseUrl
        }

        val model = if (llmConfig.provider == "custom") {
            llmConfig.custom.model
        } else {
            llmConfig.openai.model
        }

        if (apiKey.isBlank()) {
            throw IllegalArgumentException("未配置API密钥，请设置环境变量：DASHSCOPE_API_KEY 或 OPENAI_API_KEY")
        }

        if (baseUrl.isBlank()) {
            throw IllegalArgumentException("未配置API地址，请设置环境变量：CUSTOM_BASE_URL")
        }

        logger.info("调用LLM API: provider=${llmConfig.provider}, model=$model")

        // 构建请求体
        val requestBody = mapOf(
            "model" to model,
            "messages" to listOf(
                mapOf("role" to "system", "content" to systemPrompt),
                mapOf("role" to "user", "content" to userPrompt)
            ),
            "temperature" to (if (llmConfig.provider == "custom") llmConfig.custom.temperature else 0.7),
            "max_tokens" to (if (llmConfig.provider == "custom") llmConfig.custom.maxTokens else 3500)
        )

        val headers = HttpHeaders().apply {
            contentType = MediaType.APPLICATION_JSON
            set("Authorization", "Bearer $apiKey")
        }

        val entity = HttpEntity(requestBody, headers)

        try {
            val response = restTemplate.postForObject(
                "$baseUrl/chat/completions",
                entity,
                String::class.java
            )

            // 解析响应
            val jsonResponse = mapper.readTree(response)
            return jsonResponse.path("choices").path(0).path("message").path("content").asText()
        } catch (e: Exception) {
            logger.error("LLM API调用失败", e)
            throw RuntimeException("AI分析失败: ${e.message}", e)
        }
    }

    /**
     * 调用Anthropic (Claude) API
     */
    private fun callAnthropic(userPrompt: String, systemPrompt: String): String {
        val apiKey = llmConfig.anthropic.apiKey
        val model = llmConfig.anthropic.model

        if (apiKey.isBlank()) {
            throw IllegalArgumentException("未配置Anthropic API密钥，请设置环境变量：ANTHROPIC_API_KEY")
        }

        logger.info("调用Anthropic API: model=$model")

        // 构建请求体
        val requestBody = mapOf(
            "model" to model,
            "max_tokens" to 3500,
            "temperature" to 0.7,
            "system" to systemPrompt,
            "messages" to listOf(
                mapOf("role" to "user", "content" to userPrompt)
            )
        )

        val headers = HttpHeaders().apply {
            contentType = MediaType.APPLICATION_JSON
            set("x-api-key", apiKey)
            set("anthropic-version", "2023-06-01")
        }

        val entity = HttpEntity(requestBody, headers)

        try {
            val response = restTemplate.postForObject(
                "https://api.anthropic.com/v1/messages",
                entity,
                String::class.java
            )

            // 解析响应
            val jsonResponse = mapper.readTree(response)
            return jsonResponse.path("content").path(0).path("text").asText()
        } catch (e: Exception) {
            logger.error("Anthropic API调用失败", e)
            throw RuntimeException("AI分析失败: ${e.message}", e)
        }
    }

    /**
     * 获取系统提示词
     */
    private fun getSystemPrompt(): String {
        return """You are a professional personal finance advisor.

Input:
- You are given only raw, irreducible data
- No indicators or derived metrics are provided by design

Rules:
- You must decide yourself what relationships, comparisons, or transformations (if any) are useful
- Any metric, ratio, or indicator you use must be derived explicitly from the raw data
- Do not assume any predefined analysis framework
- If the data is insufficient to support a conclusion, state it clearly

Output:
- Chinese
- Markdown
- Focus on reasoning transparency rather than completeness
- Provide actionable financial advice
"""
    }

    /**
     * 构建预算分析提示词
     */
    private fun buildBudgetPrompt(userId: Long, period: String): String {
        // TODO: 从数据库获取实际的预算和交易数据
        return """请分析以下预算情况：

周期: $period

用户ID: $userId

请提供：
1. 预算使用情况分析
2. 消费趋势洞察
3. 节省建议
4. 风险提示

请用中文Markdown格式回答。"""
    }

    /**
     * 构建消费分析提示词
     */
    private fun buildSpendingPrompt(
        transactions: List<Map<String, Any?>>,
        budgetInfo: Map<String, Any?>
    ): String {
        val transactionsJson = mapper.writeValueAsString(transactions)
        val budgetJson = mapper.writeValueAsString(budgetInfo)

        return """请分析以下消费数据：

## 交易记录
$transactionsJson

## 预算信息
$budgetJson

请提供：
1. 消费模式分析
2. 异常支出识别
3. 优化建议
4. 下月预算建议

请用中文Markdown格式回答。"""
    }

    /**
     * 构建财务报告提示词
     */
    private fun buildFinancialReportPrompt(
        income: Double,
        expenses: Double,
        savings: Double,
        topCategories: List<Map<String, Any?>>
    ): String {
        val categoriesJson = mapper.writeValueAsString(topCategories)

        return """请根据以下财务数据生成健康报告：

## 财务概览
- 收入: ¥$income
- 支出: ¥$expenses
- 储蓄: ¥$savings
- 储蓄率: ${(savings / income * 100).toInt()}%

## 主要支出类别
$categoriesJson

请提供：
1. 财务健康状况评分
2. 改进建议
3. 目标设定
4. 行动计划

请用中文Markdown格式回答。"""
    }

    /**
     * 流式分析消费行为（返回 SSE Emitter）
     */
    fun analyzeSpendingStream(
        transactions: List<Map<String, Any?>>,
        budgetInfo: Map<String, Any?>,
        emitter: SseEmitter
    ) {
        Thread {
            try {
                val userPrompt = buildSpendingPrompt(transactions, budgetInfo)
                val systemPrompt = getSystemPrompt()

                when (llmConfig.provider) {
                    "custom", "openai" -> streamOpenAICompatible(userPrompt, systemPrompt, emitter)
                    "anthropic" -> streamAnthropic(userPrompt, systemPrompt, emitter)
                    else -> {
                        emitter.send(SseEmitter.event().data("不支持的LLM提供商: ${llmConfig.provider}"))
                        emitter.complete()
                    }
                }
            } catch (e: Exception) {
                logger.error("流式LLM调用失败", e)
                emitter.send(SseEmitter.event().data("分析失败: ${e.message}"))
                emitter.completeWithError(e)
            }
        }.start()
    }

    /**
     * 流式调用OpenAI兼容API
     */
    private fun streamOpenAICompatible(
        userPrompt: String,
        systemPrompt: String,
        emitter: SseEmitter
    ) {
        val apiKey = if (llmConfig.provider == "custom") {
            llmConfig.custom.apiKey
        } else {
            llmConfig.openai.apiKey
        }

        val baseUrl = if (llmConfig.provider == "custom") {
            llmConfig.custom.baseUrl
        } else {
            llmConfig.openai.baseUrl
        }

        val model = if (llmConfig.provider == "custom") {
            llmConfig.custom.model
        } else {
            llmConfig.openai.model
        }

        if (apiKey.isBlank()) {
            emitter.send(SseEmitter.event().data("未配置API密钥"))
            emitter.complete()
            return
        }

        logger.info("流式调用LLM API: provider=${llmConfig.provider}, model=$model")

        try {
            val url = URL("$baseUrl/chat/completions")
            val connection = url.openConnection() as HttpURLConnection
            connection.requestMethod = "POST"
            connection.doOutput = true
            connection.setRequestProperty("Content-Type", "application/json")
            connection.setRequestProperty("Authorization", "Bearer $apiKey")
            connection.connectTimeout = 60000
            connection.readTimeout = 120000

            // 构建请求体（启用流式输出）
            val requestBody = mapOf(
                "model" to model,
                "messages" to listOf(
                    mapOf("role" to "system", "content" to systemPrompt),
                    mapOf("role" to "user", "content" to userPrompt)
                ),
                "temperature" to (if (llmConfig.provider == "custom") llmConfig.custom.temperature else 0.7),
                "max_tokens" to (if (llmConfig.provider == "custom") llmConfig.custom.maxTokens else 3500),
                "stream" to true  // 启用流式输出
            )

            connection.outputStream.use { os ->
                os.write(mapper.writeValueAsBytes(requestBody))
            }

            // 读取流式响应
            BufferedReader(InputStreamReader(connection.inputStream, StandardCharsets.UTF_8)).use { reader ->
                var line: String?
                while (reader.readLine().also { line = it } != null) {
                    val currentLine = line
                    if (currentLine != null && currentLine.startsWith("data: ")) {
                        val data = currentLine.substring(6)
                        if (data == "[DONE]") {
                            emitter.send(SseEmitter.event().data("[DONE]"))
                            emitter.complete()
                            break
                        }

                        try {
                            val json = mapper.readTree(data)
                            val content = json.path("choices")
                                .path(0)
                                .path("delta")
                                .path("content")
                                .asText()

                            if (content.isNotEmpty()) {
                                emitter.send(SseEmitter.event().data(content))
                            }
                        } catch (e: Exception) {
                            logger.debug("解析流式数据失败: $data", e)
                        }
                    }
                }
            }
        } catch (e: Exception) {
            logger.error("流式调用失败", e)
            emitter.send(SseEmitter.event().data("调用失败: ${e.message}"))
            emitter.completeWithError(e)
        }
    }

    /**
     * 流式调用Anthropic API（暂不实现）
     */
    private fun streamAnthropic(
        userPrompt: String,
        systemPrompt: String,
        emitter: SseEmitter
    ) {
        emitter.send(SseEmitter.event().data("Anthropic流式调用暂未实现"))
        emitter.complete()
    }

    /**
     * 智能对话（流式返回）
     * @param message 用户消息
     * @param userId 用户ID
     * @param emitter SSE发射器
     */
    fun chat(message: String, userId: Long, emitter: SseEmitter) {
        Thread {
            try {
                // 1. 识别用户意图
                val intent = recognizeIntent(message)
                logger.info("识别到用户意图: $intent")

                // 2. 根据意图获取相关数据
                val contextData = when (intent) {
                    com.colafan.alfred.dto.Intent.QUERY_TRANSACTION -> getContextDataForTransaction(userId)
                    com.colafan.alfred.dto.Intent.QUERY_BUDGET -> getContextDataForBudget(userId)
                    else -> null
                }

                // 3. 构建系统提示词和用户消息
                val systemPrompt = buildSystemPrompt(intent, contextData)
                val userMessage = if (contextData != null) {
                    "$message\n\n参考数据：\n${mapper.writeValueAsString(contextData)}"
                } else {
                    message
                }

                // 4. 流式调用LLM
                when (llmConfig.provider) {
                    "custom", "openai" -> streamOpenAICompatible(userMessage, systemPrompt, emitter)
                    "anthropic" -> streamAnthropic(userMessage, systemPrompt, emitter)
                    else -> {
                        emitter.send(SseEmitter.event().data("不支持的LLM提供商: ${llmConfig.provider}"))
                        emitter.complete()
                    }
                }
            } catch (e: Exception) {
                logger.error("智能对话失败", e)
                emitter.send(SseEmitter.event().data("对话失败: ${e.message}"))
                emitter.completeWithError(e)
            }
        }.start()
    }

    /**
     * 为交易查询获取上下文数据
     */
    private fun getContextDataForTransaction(userId: Long): Map<String, Any?> {
        val transactions = transactionService.getTransactionsByUserId(userId)
        val recentTransactions = transactions.take(20)

        return mapOf(
            "recentTransactions" to recentTransactions.map { transaction ->
                mapOf(
                    "date" to transaction.transactionDate,
                    "amount" to transaction.amount,
                    "type" to transaction.type,
                    "categoryId" to transaction.categoryId,
                    "notes" to transaction.notes
                )
            }
        )
    }

    /**
     * 为预算查询获取上下文数据
     */
    private fun getContextDataForBudget(userId: Long): List<Map<String, Any?>> {
        val budgetUsage = budgetService.getBudgetUsage(userId)
        return budgetUsage.map {
            mapOf(
                "category" to it.categoryName,
                "budgetAmount" to it.budgetAmount,
                "usedAmount" to it.usedAmount,
                "remainingAmount" to it.remainingAmount,
                "usagePercentage" to it.usagePercentage
            )
        }
    }

    /**
     * 根据意图构建系统提示词
     */
    private fun buildSystemPrompt(
        intent: com.colafan.alfred.dto.Intent,
        contextData: Any?
    ): String {
        val basePrompt = """You are Alfred, a professional personal finance and life assistant.

Input:
- User provides questions or requests
- You may receive relevant data to help with your response

Rules:
- Be friendly and professional
- Provide clear, actionable advice
- Use markdown formatting
- Respond in Chinese
- If you don't know something, say so honestly
"""

        return when (intent) {
            com.colafan.alfred.dto.Intent.QUERY_TRANSACTION -> """$basePrompt

Specialize in:
- Analyzing spending patterns
- Explaining transaction history
- Providing financial insights
"""
            com.colafan.alfred.dto.Intent.QUERY_BUDGET -> """$basePrompt

Specialize in:
- Budget analysis
- Spending vs budget comparison
- Budget optimization advice
"""
            com.colafan.alfred.dto.Intent.ADD_TRANSACTION -> """$basePrompt

Specialize in:
- Helping users record transactions
- Suggesting appropriate categories
- Providing helpful tips
"""
            else -> basePrompt
        }
    }
}
