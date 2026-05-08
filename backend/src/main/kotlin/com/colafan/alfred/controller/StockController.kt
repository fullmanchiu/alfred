package com.colafan.alfred.controller

import com.colafan.alfred.dto.stock.KlineDataDTO
import com.colafan.alfred.dto.stock.KlineResponseDTO
import com.colafan.alfred.dto.stock.StockSearchItemDTO
import com.colafan.alfred.dto.stock.StockSearchResponseDTO
import com.colafan.alfred.service.StockService
import com.colafan.alfred.service.LlmService
import com.colafan.alfred.service.AuthService
import com.colafan.alfred.service.SyncTaskService
import com.colafan.alfred.config.PythonServiceConfig
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
    private val authService: AuthService,
    private val syncTaskService: SyncTaskService,
    private val pythonServiceConfig: PythonServiceConfig
) {

    companion object {
        private val logger = LoggerFactory.getLogger(StockController::class.java)
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
     * 搜索股票
     */
    @GetMapping("/search")
    @Operation(summary = "搜索股票", description = "按代码或名称模糊搜索股票")
    fun searchStocks(
        @RequestParam keyword: String,
        authentication: Authentication?
    ): Map<String, Any> {
        val stocks = stockService.searchStocks(keyword)

        // 保存搜索历史（如果已登录）
        if (authentication != null && authentication.isAuthenticated) {
            val userId = getUserId(authentication)
            stockService.saveSearchHistory(userId, keyword)
        }

        val dtoList = stocks.map { stock ->
            StockSearchItemDTO(
                code = stock.code,
                name = stock.name,
                market = stock.market ?: "",
                industry = stock.industry,
                latestPrice = null,  // TODO: 从最新K线获取
                changePercent = null,
                volume = null
            )
        }

        return mapOf(
            "success" to true,
            "data" to mapOf(
                "stocks" to dtoList
            )
        )
    }

    /**
     * 获取搜索历史
     */
    @GetMapping("/search-history")
    @Operation(summary = "获取搜索历史", description = "获取用户的搜索历史记录")
    fun getSearchHistory(
        @RequestParam(defaultValue = "10") limit: Int,
        authentication: Authentication
    ): Map<String, Any> {
        val userId = getUserId(authentication)
        val histories = stockService.getSearchHistory(userId, limit.coerceAtMost(50))

        return mapOf(
            "success" to true,
            "data" to mapOf(
                "histories" to histories
            )
        )
    }

    /**
     * 清空搜索历史
     */
    @DeleteMapping("/search-history")
    @Operation(summary = "清空搜索历史", description = "清空用户的所有搜索历史")
    fun clearSearchHistory(authentication: Authentication): Map<String, Any> {
        val userId = getUserId(authentication)
        stockService.clearSearchHistory(userId)

        return mapOf("success" to true)
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
     * 获取股票K线数据（包含技术指标）
     */
    @GetMapping("/{code}/klines")
    @Operation(summary = "获取K线数据", description = "获取股票历史K线数据和技术指标")
    fun getStockKlines(
        @PathVariable code: String,
        @RequestParam(defaultValue = "day") period: String,
        @RequestParam(defaultValue = "500") limit: Int
    ): Map<String, Any> {
        try {
            val (stockInfo, klines, indicators) = stockService.getStockKlinesWithIndicators(code, limit)

            val klineDtos = klines.map { kline ->
                KlineDataDTO(
                    time = kline.tradeDate.atStartOfDay().atZone(java.time.ZoneId.systemDefault()).toInstant().toEpochMilli(),
                    open = kline.open.toDouble(),
                    high = kline.high.toDouble(),
                    low = kline.low.toDouble(),
                    close = kline.close.toDouble(),
                    volume = kline.volume
                )
            }

            // 构建技术指标时间序列数据
            val indicatorsData: MutableMap<String, Any> = mutableMapOf()

            if (indicators.isNotEmpty()) {
                // 均线数据
                indicatorsData["ma5"] = indicators.map { it.ma5?.toDouble() }
                indicatorsData["ma10"] = indicators.map { it.ma10?.toDouble() }
                indicatorsData["ma20"] = indicators.map { it.ma20?.toDouble() }
                indicatorsData["ma60"] = indicators.map { it.ma60?.toDouble() }

                // MACD数据
                indicatorsData["macd"] = indicators.map { indicator ->
                    val macd = indicator.macd
                    val macdSignal = indicator.macdSignal
                    val macdHist = indicator.macdHist
                    if (macd != null && macdSignal != null && macdHist != null) {
                        mapOf(
                            "dif" to macd.toDouble(),
                            "dea" to macdSignal.toDouble(),
                            "macd" to macdHist.toDouble()
                        )
                    } else null
                }

                // KDJ数据
                indicatorsData["kdj"] = indicators.map { indicator ->
                    val kdjK = indicator.kdjK
                    val kdjD = indicator.kdjD
                    val kdjJ = indicator.kdjJ
                    if (kdjK != null && kdjD != null && kdjJ != null) {
                        mapOf(
                            "k" to kdjK.toDouble(),
                            "d" to kdjD.toDouble(),
                            "j" to kdjJ.toDouble()
                        )
                    } else null
                }
            }

            return mapOf(
                "success" to true,
                "data" to mapOf(
                    "code" to stockInfo.code,
                    "name" to stockInfo.name,
                    "klines" to klineDtos,
                    "indicators" to indicatorsData
                )
            )
        } catch (e: IllegalArgumentException) {
            return mapOf(
                "success" to false,
                "message" to (e.message ?: "股票不存在")
            )
        }
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
     * 检查股票数据状态
     */
    @GetMapping("/{code}/check-data")
    @Operation(summary = "检查数据状态", description = "检查股票数据是否已同步")
    fun checkStockData(@PathVariable code: String): Map<String, Any> {
        val result = syncTaskService.checkStockData(code)
        return mapOf(
            "success" to true,
            "data" to result
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

            } catch (e: IllegalArgumentException) {
                // 股票不存在等业务错误
                logger.error("实时分析失败: code=$code, error=${e.message}", e)
                sendEvent(emitter, "error", mapOf(
                    "message" to e.message,
                    "type" to "NOT_FOUND",
                    "suggestSync" to false
                ))
                emitter.completeWithError(e)
            } catch (e: Exception) {
                logger.error("实时分析失败: code=$code, error=${e.message}", e)
                sendEvent(emitter, "error", mapOf("message" to "分析失败: ${e.message}"))
                emitter.completeWithError(e)
            }
        }

        return emitter
    }

    /**
     * 内部接口：保存K线数据（Python定时任务调用，只插入新数据）
     */
    @PostMapping("/internal/save-klines")
    @Operation(summary = "保存K线数据", description = "内部接口，Python定时任务调用，只插入新数据")
    fun saveKlines(@RequestBody request: SaveKlinesRequest): Map<String, Any> {
        val (savedCount, updatedCount) = stockService.saveKlines(request.code, request.klines, request.stockName, request.type, upsert = false)

        return mapOf(
            "success" to true,
            "data" to mapOf(
                "savedCount" to savedCount,
                "updatedCount" to updatedCount,
                "totalCount" to savedCount + updatedCount
            )
        )
    }

    /**
     * 内部接口：覆盖更新K线数据（全量获取时使用）
     */
    @PostMapping("/internal/upsert-klines")
    @Operation(summary = "覆盖更新K线数据", description = "内部接口，全量获取时使用，存在则更新")
    fun upsertKlines(@RequestBody request: SaveKlinesRequest): Map<String, Any> {
        val (savedCount, updatedCount) = stockService.saveKlines(request.code, request.klines, request.stockName, request.type, upsert = true)

        return mapOf(
            "success" to true,
            "data" to mapOf(
                "savedCount" to savedCount,
                "updatedCount" to updatedCount,
                "totalCount" to savedCount + updatedCount
            )
        )
    }

    /**
     * 内部接口：保存技术指标（Python计算后调用）
     * 支持批量保存
     */
    @PostMapping("/internal/save-indicators")
    @Operation(summary = "保存技术指标", description = "内部接口，Python计算后保存，支持批量")
    fun saveIndicators(@RequestBody request: SaveIndicatorsRequest): Map<String, Any> {
        val count = stockService.saveIndicatorsBatch(request.code, request.indicators)
        return mapOf(
            "success" to true,
            "data" to mapOf("savedCount" to count)
        )
    }

    /**
     * 内部接口：获取所有股票代码（用于K线同步）
     */
    @GetMapping("/internal/all-stocks")
    @Operation(summary = "获取所有股票代码", description = "内部接口，返回所有股票代码列表")
    fun getAllStocks(): Map<String, Any> {
        val stocks = stockService.getAllStockCodes()
        return mapOf(
            "success" to true,
            "data" to mapOf(
                "stocks" to stocks.map { mapOf("code" to it.code) }
            )
        )
    }

    // ==================== 私有方法 ====================

    private fun fetchRealtimeData(code: String): Map<String, Any> {
        val pythonUrl = "${pythonServiceConfig.baseUrl}/api/stock/$code/realtime"
        @Suppress("UNCHECKED_CAST")
        val response = restTemplate.getForObject(pythonUrl, Map::class.java) as? Map<String, Any>
        return response?.get("data") as? Map<String, Any>
            ?: throw RuntimeException("获取实时行情失败")
    }

    private fun fetchIndicators(code: String): Map<String, Any> {
        val pythonUrl = "${pythonServiceConfig.baseUrl}/api/stock/$code/technical"
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
        val pythonUrl = "${pythonServiceConfig.baseUrl}/api/stock/$code/fundamental"
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
    val klines: List<Map<String, Any>>,
    val stockName: String? = null,
    val type: String? = null  // 证券类型: 1=股票, 2=指数, 5=ETF
)

data class SaveIndicatorsRequest(
    val code: String,
    val indicators: List<Map<String, Any>>
)
