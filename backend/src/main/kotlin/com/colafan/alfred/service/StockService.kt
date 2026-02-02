package com.colafan.alfred.service

import com.colafan.alfred.entity.StockIndicator
import com.colafan.alfred.entity.StockInfo
import com.colafan.alfred.entity.StockKline
import com.colafan.alfred.entity.UserStock
import com.colafan.alfred.repository.StockIndicatorRepository
import com.colafan.alfred.repository.StockInfoRepository
import com.colafan.alfred.repository.StockKlineRepository
import com.colafan.alfred.repository.UserStockRepository
import org.slf4j.LoggerFactory
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.time.LocalDateTime

/**
 * 股票分析服务
 * 职责：数据查询、缓存管理、调用Python微服务
 */
@Service
class StockService(
    private val stockInfoRepository: StockInfoRepository,
    private val userStockRepository: UserStockRepository,
    private val stockKlineRepository: StockKlineRepository,
    private val stockIndicatorRepository: StockIndicatorRepository
) {
    companion object {
        private val logger = LoggerFactory.getLogger(StockService::class.java)
    }

    /**
     * 获取用户自选股列表
     */
    fun getUserStocks(userId: Long): List<Map<String, Any>> {
        val userStocks = userStockRepository.findByUserId(userId)

        return userStocks.map { userStock ->
            val stockInfo = stockInfoRepository.findById(userStock.stockId).orElse(null)
            @Suppress("UNCHECKED_CAST")
            mapOf<String, Any>(
                "id" to userStock.id!!,
                "stockId" to userStock.stockId,
                "code" to (stockInfo?.code ?: ""),
                "name" to (stockInfo?.name ?: ""),
                "note" to (userStock.note ?: ""),
                "addedAt" to userStock.addedAt
            )
        }
    }

    /**
     * 添加自选股
     */
    @Transactional
    fun addStock(userId: Long, code: String, note: String? = null): UserStock {
        // 查找或创建股票信息
        val stockInfo = stockInfoRepository.findByCode(code)
            ?: throw IllegalArgumentException("股票代码不存在: $code")

        val stockId = stockInfo.id!!

        // 检查是否已添加
        val existing = userStockRepository.findByUserIdAndStockId(userId, stockId)
        if (existing != null) {
            throw IllegalArgumentException("该股票已在自选中")
        }

        // 添加到自选
        val userStock = UserStock(
            userId = userId,
            stockId = stockId,
            note = note
        )
        return userStockRepository.save(userStock)
    }

    /**
     * 删除自选股
     */
    @Transactional
    fun removeStock(userId: Long, stockId: Long) {
        userStockRepository.deleteByUserIdAndStockId(userId, stockId)
        logger.info("用户 $userId 删除自选股 $stockId")
    }

    /**
     * 获取股票概览（从数据库读取，不调用Python）
     */
    fun getStockOverview(stockId: Long): Map<String, Any> {
        val stockInfo = stockInfoRepository.findById(stockId)
            .orElseThrow { IllegalArgumentException("股票不存在") }

        // 获取最新K线（最近90天）
        val klines = stockKlineRepository.findLatestKLines(stockId, 90)

        // 获取缓存的指标（1小时内）
        val cachedIndicator = stockIndicatorRepository.findCachedByStockId(
            stockId,
            LocalDateTime.now().minusHours(1)
        )

        @Suppress("UNCHECKED_CAST")
        return mapOf<String, Any>(
            "info" to mapOf<String, Any>(
                "id" to (stockInfo.id ?: 0),
                "code" to stockInfo.code,
                "name" to stockInfo.name,
                "market" to (stockInfo.market ?: ""),
                "industry" to (stockInfo.industry ?: "")
            ),
            "klines" to klines.takeLast(5).map { kline ->
                mapOf<String, Any>(
                    "date" to kline.tradeDate,
                    "open" to kline.open,
                    "high" to kline.high,
                    "low" to kline.low,
                    "close" to kline.close,
                    "volume" to kline.volume
                )
            },
            "latestIndicator" to (cachedIndicator?.let {
                mapOf<String, Any>(
                    "ma5" to (it.ma5 ?: 0),
                    "ma10" to (it.ma10 ?: 0),
                    "ma20" to (it.ma20 ?: 0),
                    "macd" to (it.macd ?: 0),
                    "rsi" to (it.rsi ?: 0),
                    "updatedAt" to it.updatedAt
                )
            } ?: mapOf<String, Any>())
        )
    }

    /**
     * 保存K线数据（由Python定时任务调用）
     */
    @Transactional
    fun saveKlines(stockCode: String, klines: List<Map<String, Any>>): Int {
        val stockInfo = stockInfoRepository.findByCode(stockCode)
            ?: throw IllegalArgumentException("股票代码不存在: $stockCode")

        val stockId = stockInfo.id!!

        var savedCount = 0
        klines.forEach { klineData ->
            val tradeDate = java.time.LocalDate.parse(klineData["trade_date"].toString())
            val existing = stockKlineRepository.findByStockIdAndTradeDateBetweenOrderByTradeDate(
                stockId,
                tradeDate,
                tradeDate
            ).firstOrNull()

            if (existing == null) {
                val kline = StockKline(
                    stockId = stockId,
                    tradeDate = tradeDate,
                    open = java.math.BigDecimal(klineData["open"].toString()),
                    high = java.math.BigDecimal(klineData["high"].toString()),
                    low = java.math.BigDecimal(klineData["low"].toString()),
                    close = java.math.BigDecimal(klineData["close"].toString()),
                    volume = (klineData["volume"] as Number).toLong(),
                    amount = klineData["amount"]?.let { java.math.BigDecimal(it.toString()) }
                )
                stockKlineRepository.save(kline)
                savedCount++
            }
        }

        logger.info("保存 ${klines.size} 条K线数据，实际新增 $savedCount 条")
        return savedCount
    }

    /**
     * 保存技术指标（由Python计算后调用）
     */
    @Transactional
    fun saveIndicator(stockCode: String, indicatorData: Map<String, Any>): StockIndicator {
        val stockInfo = stockInfoRepository.findByCode(stockCode)
            ?: throw IllegalArgumentException("股票代码不存在: $stockCode")

        val stockId = stockInfo.id!!
        val tradeDate = java.time.LocalDate.parse(indicatorData["trade_date"].toString())

        val indicator = stockIndicatorRepository.findByStockIdAndTradeDate(stockId, tradeDate)
            ?: StockIndicator(
                stockId = stockId,
                tradeDate = tradeDate
            )

        // 更新指标值
        indicatorData["ma5"]?.let { indicator.ma5 = java.math.BigDecimal(it.toString()) }
        indicatorData["ma10"]?.let { indicator.ma10 = java.math.BigDecimal(it.toString()) }
        indicatorData["ma20"]?.let { indicator.ma20 = java.math.BigDecimal(it.toString()) }
        indicatorData["ma60"]?.let { indicator.ma60 = java.math.BigDecimal(it.toString()) }
        indicatorData["macd"]?.let { indicator.macd = java.math.BigDecimal(it.toString()) }
        indicatorData["macd_signal"]?.let { indicator.macdSignal = java.math.BigDecimal(it.toString()) }
        indicatorData["macd_hist"]?.let { indicator.macdHist = java.math.BigDecimal(it.toString()) }
        indicatorData["rsi"]?.let { indicator.rsi = java.math.BigDecimal(it.toString()) }
        indicatorData["kdj_k"]?.let { indicator.kdjK = java.math.BigDecimal(it.toString()) }
        indicatorData["kdj_d"]?.let { indicator.kdjD = java.math.BigDecimal(it.toString()) }
        indicatorData["kdj_j"]?.let { indicator.kdjJ = java.math.BigDecimal(it.toString()) }
        indicatorData["boll_upper"]?.let { indicator.bollUpper = java.math.BigDecimal(it.toString()) }
        indicatorData["boll_middle"]?.let { indicator.bollMiddle = java.math.BigDecimal(it.toString()) }
        indicatorData["boll_lower"]?.let { indicator.bollLower = java.math.BigDecimal(it.toString()) }

        return stockIndicatorRepository.save(indicator)
    }

    /**
     * 根据代码查找股票信息
     */
    fun findStockByCode(code: String): StockInfo? {
        return stockInfoRepository.findByCode(code)
    }
}
