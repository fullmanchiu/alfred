package com.colafan.alfred.controller

import com.colafan.alfred.service.StockService
import com.colafan.alfred.service.LlmService
import com.colafan.alfred.service.AuthService
import io.swagger.v3.oas.annotations.Operation
import io.swagger.v3.oas.annotations.tags.Tag
import org.slf4j.LoggerFactory
import org.springframework.http.MediaType
import org.springframework.web.bind.annotation.*
import org.springframework.web.client.RestTemplate
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter
import org.springframework.security.core.Authentication
import java.io.IOException
import java.util.concurrent.CompletableFuture

/**
 * 股票分析控制器
 * 提供股票数据查询和实时分析SSE流
 */
@RestController
@RequestMapping("/api/v1/stocks")
@Tag(name = "股票分析", description = "股票技术分析、基本面分析和AI报告")
class StockController(
    private val stockService: StockService,
    private val llmService: LlmService,
    private val authService: AuthService
) {

    companion object {
        private val logger = LoggerFactory.getLogger(StockController::class.java)
        private const val PYTHON_SERVICE_URL = "http://localhost:8001"
    }

    private val restTemplate = RestTemplate()

    /**
     * 获取用户自选股列表
     */
    @GetMapping
    @Operation(summary = "获取自选股列表", description = "获取当前用户的自选股")
    fun getUserStocks(authentication: Authentication): List<Map<String, Any>> {
        val userId = getUserId(authentication)
        return stockService.getUserStocks(userId)
    }

    /**
     * 添加自选股
     */
    @PostMapping
    @Operation(summary = "添加自选股", description = "添加股票到自选")
    fun addStock(
        @RequestBody request: AddStockRequest,
        authentication: Authentication
    ): Map<String, Any> {
        val userId = getUserId(authentication)
        val userStock = stockService.addStock(userId, request.code, request.note)

        return mapOf(
            "success" to true,
            "data" to mapOf(
                "id" to userStock.id,
                "stockId" to userStock.stockId,
                "addedAt" to userStock.addedAt
            )
        )
    }

    /**
     * 删除自选股
     */
    @DeleteMapping("/{id}")
    @Operation(summary = "删除自选股", description = "从自选中删除股票")
    fun removeStock(
        @PathVariable id: Long,
        authentication: Authentication
    ): Map<String, Any> {
        val userId = getUserId(authentication)
        stockService.removeStock(userId, id)

        return mapOf("success" to true)
    }

    /**
     * 获取股票概览（从数据库读取，快速返回）
     */
    @GetMapping("/{code}/overview")
    @Operation(summary = "股票概览", description = "获取股票基本信息和历史K线（从数据库）")
    fun getStockOverview(@PathVariable code: String): Map<String, Any> {
        // 根据代码查找股票
        val stockInfo = findStockByCode(code)

        return mapOf(
            "success" to true,
            "data" to stockService.getStockOverview(stockInfo.id!!)
        )
    }

    /**
     * 实时分析（SSE流式返回）
     * 依次推送：实时行情 → 技术指标 → LLM流式分析
     */
    @GetMapping("/{code}/realtime", produces = [MediaType.TEXT_EVENT_STREAM_VALUE])
    @Operation(summary = "实时分析", description = "SSE流式返回：实时行情、技术指标、AI分析")
    fun realtimeAnalysis(
        @PathVariable code: String,
        authentication: Authentication
    ): SseEmitter {
        val emitter = SseEmitter(120000L) // 2分钟超时
        val userId = getUserId(authentication)

        logger.info("用户 $userId 请求股票 $code 的实时分析")

        // 异步处理
        CompletableFuture.runAsync {
            try {
                val stockInfo = findStockByCode(code)

                // 1. 推送实时行情（调用Python）
                sendEvent(emitter, "status", "正在获取实时行情...")
                val realtimeData = fetchRealtimeData(code)
                sendEvent(emitter, "realtime", realtimeData)

                // 2. 推送技术指标（调用Python）
                sendEvent(emitter, "status", "正在计算技术指标...")
                val technicalData = fetchIndicators(code)
                sendEvent(emitter, "indicators", technicalData)

                // 3. 推送基本面分析（调用Python）
                sendEvent(emitter, "status", "正在分析基本面...")
                val fundamentalData = fetchFundamental(code)
                sendEvent(emitter, "fundamental", fundamentalData)

                // 4. 推送LLM分析（Spring Boot调用LLM）
                sendEvent(emitter, "status", "正在生成AI分析...")
                streamLLMAnalysis(emitter, code, realtimeData, technicalData, fundamentalData)

                sendEvent(emitter, "status", "分析完成")
                emitter.complete()

            } catch (e: Exception) {
                logger.error("实时分析失败: code=$code, error=${e.message}", e)
                sendEvent(emitter, "error", mapOf("message" to "分析失败: ${e.message}"))
                emitter.completeWithError(e)
            }
        }

        return emitter
    }

    /**
     * 内部接口：保存K线数据（Python定时任务调用）
     */
    @PostMapping("/internal/save-klines")
    @Operation(summary = "保存K线数据", description = "内部接口，Python定时任务调用")
    fun saveKlines(@RequestBody request: SaveKlinesRequest): Map<String, Any> {
        val savedCount = stockService.saveKlines(request.code, request.klines)

        return mapOf(
            "success" to true,
            "data" to mapOf(
                "savedCount" to savedCount
            )
        )
    }

    /**
     * 内部接口：保存技术指标（Python计算后调用）
     */
    @PostMapping("/internal/save-indicators")
    @Operation(summary = "保存技术指标", description = "内部接口，Python计算后保存")
    fun saveIndicators(@RequestBody request: SaveIndicatorsRequest): Map<String, Any> {
        val indicator = stockService.saveIndicator(request.code, request.indicators)

        return mapOf(
            "success" to true,
            "data" to mapOf(
                "id" to indicator.id
            )
        )
    }

    // ==================== 私有方法 ====================

    private fun fetchRealtimeData(code: String): Map<String, Any> {
        val pythonUrl = "$PYTHON_SERVICE_URL/api/stock/$code/realtime"
        @Suppress("UNCHECKED_CAST")
        val response = restTemplate.getForObject(pythonUrl, Map::class.java) as? Map<String, Any>
        return response?.get("data") as? Map<String, Any>
            ?: throw RuntimeException("获取实时行情失败")
    }

    private fun fetchIndicators(code: String): Map<String, Any> {
        val pythonUrl = "$PYTHON_SERVICE_URL/api/stock/$code/technical"
        @Suppress("UNCHECKED_CAST")
        val response = restTemplate.getForObject(pythonUrl, Map::class.java) as? Map<String, Any>
        val data = response?.get("data") as? Map<String, Any>
            ?: throw RuntimeException("获取技术指标失败")

        // 提取trend信息
        @Suppress("UNCHECKED_CAST")
        val trend = data["trend"] as? Map<String, Any> ?: mapOf()

        // 构建返回数据，包含trend和indicators
        return mapOf(
            "trend" to trend,
            "indicators" to (data["indicators"] as? Map<String, Any> ?: mapOf())
        )
    }

    private fun fetchFundamental(code: String): Map<String, Any> {
        val pythonUrl = "$PYTHON_SERVICE_URL/api/stock/$code/fundamental"
        @Suppress("UNCHECKED_CAST")
        val response = restTemplate.getForObject(pythonUrl, Map::class.java) as? Map<String, Any>
        return response?.get("data") as? Map<String, Any>
            ?: throw RuntimeException("获取基本面分析失败")
    }

    private fun streamLLMAnalysis(
        emitter: SseEmitter,
        code: String,
        realtimeData: Map<String, Any>,
        technicalData: Map<String, Any>,
        fundamentalData: Map<String, Any>
    ) {
        // 调用统一的LLM服务，传入股票分析提示词
        @Suppress("UNCHECKED_CAST")
        val stockData = mapOf(
            "code" to code,
            "name" to (realtimeData["name"] ?: ""),
            "realtime" to realtimeData,
            "technical" to technicalData,
            "fundamental" to fundamentalData
        ) as Map<String, Any>

        llmService.streamStockAnalysis(stockData, emitter)
    }

    private fun sendEvent(emitter: SseEmitter, name: String, data: Any) {
        try {
            emitter.send(SseEmitter.event().name(name).data(data))
        } catch (e: IOException) {
            logger.error("发送SSE事件失败: name=$name", e)
        }
    }

    private fun getUserId(authentication: Authentication): Long {
        return authService.getCurrentUserId(authentication)
    }

    private fun findStockByCode(code: String): com.colafan.alfred.entity.StockInfo {
        // 从数据库查询股票信息
        val stockInfo = stockService.findStockByCode(code)
        return stockInfo ?: throw IllegalArgumentException("股票代码不存在: $code")
    }
}

/**
 * 请求DTO
 */
data class AddStockRequest(
    val code: String,
    val note: String? = null
)

data class SaveKlinesRequest(
    val code: String,
    val klines: List<Map<String, Any>>
)

data class SaveIndicatorsRequest(
    val code: String,
    val indicators: Map<String, Any>
)
