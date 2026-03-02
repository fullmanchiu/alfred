package com.colafan.alfred.controller

import com.colafan.alfred.repository.StockInfoRepository
import com.colafan.alfred.repository.StockKlineRepository
import org.springframework.web.bind.annotation.*

@RestController
@RequestMapping("/api/v1/debug")
class DebugController(
    private val stockInfoRepository: StockInfoRepository,
    private val stockKlineRepository: StockKlineRepository
) {
    @GetMapping("/stock-check/{code}")
    fun checkStock(@PathVariable code: String): Map<String, Any?> {
        val stock = stockInfoRepository.findByCode(code)
        if (stock == null) {
            return mapOf(
                "found" to false,
                "message" to "股票不存在: $code"
            )
        }

        val stockId = stock.id!!
        val klineCount = stockKlineRepository.countByStockId(stockId)
        val latestKline = stockKlineRepository.findTopByStockIdOrderByTradeDateDesc(stockId)

        // 检查所有股票的K线数据情况
        val allStocks = stockInfoRepository.findAll()
        val stocksWithKlines = allStocks.map { s ->
            val sid = s.id!!
            mapOf(
                "code" to s.code,
                "name" to s.name,
                "klineCount" to stockKlineRepository.countByStockId(sid)
            )
        }.sortedByDescending { it["klineCount"] as Int }

        return mapOf(
            "found" to true,
            "stock" to mapOf(
                "id" to stock.id,
                "code" to stock.code,
                "name" to stock.name,
                "market" to stock.market
            ),
            "klineCount" to klineCount,
            "latestKline" to latestKline?.let {
                mapOf(
                    "tradeDate" to it.tradeDate,
                    "close" to it.close
                )
            },
            "totalStocksInDb" to allStocks.size,
            "stocksWithKlines" to stocksWithKlines.take(20)
        )
    }
}
