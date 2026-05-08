package com.colafan.alfred.service.ai

import com.colafan.alfred.service.StockService
import org.slf4j.LoggerFactory
import org.springframework.ai.tool.annotation.Tool
import org.springframework.stereotype.Component

/**
 * 股票分析工具集
 * 供 AI Agent 调用，查询股票数据
 *
 * 搜索使用东方财富 API（不依赖本地数据库的 name 字段），
 * 概览查询使用本地数据库（K线、指标）。
 */
@Component
class StockAnalysisTools(
    private val stockService: StockService,
    private val eastMoneyApiClient: EastMoneyApiClient
) {
    private val logger = LoggerFactory.getLogger(StockAnalysisTools::class.java)

    /**
     * 搜索股票
     * @param keyword 股票代码或名称关键词，如 "600519" 或 "茅台" 或 "中国神华"
     * @return 匹配的股票列表（代码、名称、市场），按匹配度排序。
     *         如果只匹配到一个，可以直接用其 code 调用 getStockOverview。
     *         如果匹配到多个，应列出让用户选择。
     *         如果没有结果，返回空列表。
     */
    @Tool(
        name = "searchStocks",
        description = "按股票代码或名称关键词搜索股票。支持中文名称（如'茅台'、'中国神华'）、拼音、代码搜索。返回匹配列表，匹配多个时列出让用户选择。"
    )
    fun searchStocks(keyword: String): List<Map<String, String>> {
        logger.info("[Tool] searchStocks: keyword=$keyword")
        val results = eastMoneyApiClient.search(keyword)
        return results.map {
            mapOf(
                "code" to it.code,
                "name" to it.name,
                "market" to it.market
            )
        }
    }

    /**
     * 获取股票概览
     * @param code 股票代码，如 "600519"
     * @return 股票基本信息（含正确名称）、最近5日K线、最新技术指标
     */
    @Tool(
        name = "getStockOverview",
        description = "获取指定股票代码的详细信息：基本信息、最近K线数据和技术指标。"
    )
    fun getStockOverview(code: String): Map<String, Any> {
        logger.info("[Tool] getStockOverview: code=$code")

        // 1. 用东方财富 API 补全正确名称
        val externalInfo = eastMoneyApiClient.getStockInfo(code)
        val correctName = externalInfo?.name ?: code
        val correctMarket = externalInfo?.market ?: ""

        // 2. 查本地数据库
        val stockInfo = stockService.findStockByCode(code)
        if (stockInfo == null) {
            return mapOf(
                "code" to code,
                "name" to correctName,
                "market" to correctMarket,
                "error" to "本地未同步该股票数据，暂无K线和指标信息"
            )
        }

        // 3. 获取数据库数据并用正确名称覆盖
        val overview = stockService.getStockOverview(stockInfo.id!!).toMutableMap()
        val infoMap = (overview["info"] as? Map<String, Any>)?.toMutableMap() ?: mutableMapOf()
        infoMap["name"] = correctName
        if (correctMarket.isNotBlank()) {
            infoMap["market"] = correctMarket
        }
        overview["info"] = infoMap

        return overview
    }
}
