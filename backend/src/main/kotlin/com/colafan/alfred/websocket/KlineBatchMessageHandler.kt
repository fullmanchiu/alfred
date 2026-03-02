package com.colafan.alfred.websocket

import com.colafan.alfred.dto.stock.StockKlineBatch
import com.colafan.alfred.service.StockService
import com.fasterxml.jackson.databind.JsonNode
import org.slf4j.Logger
import org.slf4j.LoggerFactory
import org.springframework.stereotype.Component
import org.springframework.transaction.annotation.Transactional
import org.springframework.web.socket.WebSocketSession
import org.springframework.web.socket.TextMessage
import java.math.BigDecimal
import java.time.LocalDate

/**
 * K线批量消息处理器
 * 处理 batch_klines 类型的消息
 */
@Component
class KlineBatchMessageHandler(
    private val stockService: StockService
) {

    private val logger: Logger = LoggerFactory.getLogger(KlineBatchMessageHandler::class.java)

    /**
     * 处理批量 K线消息
     */
    @Transactional
    fun handle(session: WebSocketSession, payload: JsonNode) {
        try {
            val batchIndex = payload.path("batchIndex").asInt()
            val totalBatches = payload.path("totalBatches").asInt()
            val klinesArray = payload.path("klines")
            val stockInfoNode = payload.path("stockInfo")

            logger.debug("接收批次 {}/{}", batchIndex, totalBatches)

            val klineBatches = mutableListOf<StockKlineBatch>()

            for (klineNode in klinesArray) {
                val bsCode = klineNode.path("bs_code").asText()
                val code = bsCode.replace("sh.", "").replace("sz.", "")

                val batch = StockKlineBatch(
                    code = code,
                    tradeDate = LocalDate.parse(klineNode.path("trade_date").asText()),
                    open = BigDecimal(klineNode.path("open").asText()),
                    high = BigDecimal(klineNode.path("high").asText()),
                    low = BigDecimal(klineNode.path("low").asText()),
                    close = BigDecimal(klineNode.path("close").asText()),
                    volume = klineNode.path("volume").asLong(),
                    amount = if (klineNode.has("amount") && !klineNode.path("amount").isNull)
                        BigDecimal(klineNode.path("amount").asText()) else null,
                    preClose = if (klineNode.has("pre_close") && !klineNode.path("pre_close").isNull)
                        BigDecimal(klineNode.path("pre_close").asText()) else null,
                    turnRate = if (klineNode.has("turn_rate") && !klineNode.path("turn_rate").isNull)
                        BigDecimal(klineNode.path("turn_rate").asText()) else null,
                    pctChange = if (klineNode.has("pct_change") && !klineNode.path("pct_change").isNull)
                        BigDecimal(klineNode.path("pct_change").asText()) else null
                )

                klineBatches.add(batch)
            }

            val savedCount = saveKlinesBatch(klineBatches, stockInfoNode)

            val response = String.format(
                "{\"type\":\"batch_ack\",\"batchIndex\":%d,\"savedCount\":%d}",
                batchIndex, savedCount
            )
            session.sendMessage(TextMessage(response))

            if (batchIndex == totalBatches - 1) {
                logger.info("所有批次接收完成，总计: {} 条K线", savedCount)
            }

        } catch (e: Exception) {
            logger.error("处理批量K线数据失败", e)
            try {
                session.sendMessage(TextMessage(
                    "{\"type\":\"error\",\"batchIndex\":${payload.path("batchIndex").asInt()},\"message\":\"${e.message}\"}"
                ))
            } catch (ex: Exception) {
                logger.error("发送错误消息失败", ex)
            }
        }
    }

    /**
     * 批量保存K线数据
     */
    protected fun saveKlinesBatch(batches: List<StockKlineBatch>, stockInfoNode: JsonNode): Int {
        if (batches.isEmpty()) {
            return 0
        }

        var savedCount = 0
        var updatedCount = 0

        val stockName = if (stockInfoNode.has("name") && !stockInfoNode.path("name").isNull)
            stockInfoNode.path("name").asText() else null
        val securityType = if (stockInfoNode.has("type") && !stockInfoNode.path("type").isNull)
            stockInfoNode.path("type").asText() else null

        val grouped = batches.groupBy { it.code }

        for ((code, codeBatches) in grouped) {
            try {
                val klines = codeBatches.map { batch ->
                    val klineMap = mutableMapOf<String, Any>()
                    klineMap["trade_date"] = batch.tradeDate.toString()
                    klineMap["open"] = batch.open
                    klineMap["high"] = batch.high
                    klineMap["low"] = batch.low
                    klineMap["close"] = batch.close
                    klineMap["volume"] = batch.volume
                    batch.amount?.let { klineMap["amount"] = it }
                    batch.preClose?.let { klineMap["pre_close"] = it }
                    batch.turnRate?.let { klineMap["turn_rate"] = it }
                    batch.pctChange?.let { klineMap["pct_change"] = it }
                    klineMap
                }

                val result = stockService.saveKlines(code, klines, stockName, securityType, true)
                savedCount += result.first
                updatedCount += result.second

            } catch (e: Exception) {
                logger.error("保存K线失败: code={}, error={}", batches[0].code, e.message, e)
            }
        }

        return savedCount + updatedCount
    }
}
