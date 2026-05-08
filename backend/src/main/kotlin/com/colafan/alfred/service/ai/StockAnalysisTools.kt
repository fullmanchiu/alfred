package com.colafan.alfred.service.ai

import com.colafan.alfred.service.StockService
import org.slf4j.LoggerFactory
import org.springframework.ai.tool.annotation.Tool
import org.springframework.stereotype.Component

/**
 * 股票分析工具集
 * 供 AI Agent 调用，查询股票数据
 */
@Component
class StockAnalysisTools(
    private val stockService: StockService
) {
    private val logger = LoggerFactory.getLogger(StockAnalysisTools::class.java)

    /**
     * 搜索股票
     * @param keyword 股票代码或名称关键词，如 "茅台" 或 "600519"
     * @return 匹配的股票列表（代码、名称、市场）
     */
    @Tool(name = "searchStocks", description = "按代码或名称关键词搜索股票，返回匹配的股票列表")
    fun searchStocks(keyword: String): List<Map<String, String>> {
        logger.info("[Tool] searchStocks: keyword=$keyword")
        val stocks = stockService.searchStocks(keyword)
        return stocks.map {
            mapOf(
                "code" to it.code,
                "name" to it.name,
                "market" to (it.market ?: "")
            )
        }
    }

    /**
     * 获取股票概览
     * @param code 股票代码，如 "600519"
     * @return 股票基本信息、最近5日K线、最新技术指标
     */
    @Tool(name = "getStockOverview", description = "获取指定股票的基本信息、最近K线数据和技术指标概览")
    fun getStockOverview(code: String): Map<String, Any> {
        logger.info("[Tool] getStockOverview: code=$code")
        val stockInfo = stockService.findStockByCode(code)
            ?: return mapOf("error" to "股票不存在: $code")

        return stockService.getStockOverview(stockInfo.id!!)
    }

}
