package com.colafan.alfred.service.ai

import com.fasterxml.jackson.databind.ObjectMapper
import org.slf4j.LoggerFactory
import org.springframework.stereotype.Component
import java.net.HttpURLConnection
import java.net.URL
import java.net.URLEncoder

/**
 * 东方财富搜索 API 客户端
 * 用于名称→代码映射，不依赖本地数据库
 */
@Component
class EastMoneyApiClient(
    private val objectMapper: ObjectMapper
) {
    private val logger = LoggerFactory.getLogger(EastMoneyApiClient::class.java)

    data class StockSearchResult(
        val code: String,
        val name: String,
        val market: String
    )

    /**
     * 按名称搜索股票
     * @param keyword 名称关键词（如"茅台"、"中国神华"、"601088"）
     * @return 匹配的股票列表（已过滤只保留A股），按匹配度排序
     */
    fun search(keyword: String): List<StockSearchResult> {
        logger.info("[EastMoney] 搜索: keyword=$keyword")
        val encoded = URLEncoder.encode(keyword, "UTF-8")
        val url = "https://searchapi.eastmoney.com/api/suggest/get?input=$encoded&type=14&count=10"

        return try {
            val response = fetch(url)
            val data = objectMapper.readTree(response)
            parseResults(data)
        } catch (e: Exception) {
            logger.error("[EastMoney] 搜索失败: ${e.message}", e)
            emptyList()
        }
    }

    /**
     * 获取单只股票的详细信息（名称、市场）
     * @param code 股票代码（如"600519"）
     * @return 股票信息，未找到返回 null
     */
    fun getStockInfo(code: String): StockSearchResult? {
        val results = search(code)
        return results.firstOrNull { it.code == code }
    }

    private fun fetch(urlStr: String): String {
        val conn = URL(urlStr).openConnection() as HttpURLConnection
        conn.requestMethod = "GET"
        conn.setRequestProperty("User-Agent", "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)")
        conn.setRequestProperty("Referer", "https://www.eastmoney.com/")
        conn.connectTimeout = 5000
        conn.readTimeout = 5000

        val responseCode = conn.responseCode
        if (responseCode != 200) {
            throw RuntimeException("HTTP $responseCode")
        }

        return conn.inputStream.bufferedReader().use { it.readText() }
    }

    private fun parseResults(data: com.fasterxml.jackson.databind.JsonNode): List<StockSearchResult> {
        val results = mutableListOf<StockSearchResult>()
        val dataArray = data.path("QuotationCodeTable").path("Data")

        if (!dataArray.isArray) {
            return results
        }

        for (item in dataArray) {
            val classify = item.path("Classify").asText("")
            // 只保留 A 股
            if (classify != "AStock") continue

            val code = item.path("Code").asText("")
            val name = item.path("Name").asText("")
            val securityType = item.path("SecurityTypeName").asText("")
            val market = when {
                securityType.contains("沪") -> "SH"
                securityType.contains("深") -> "SZ"
                code.startsWith("6") -> "SH"
                else -> "SZ"
            }

            if (code.isNotBlank() && name.isNotBlank()) {
                results.add(StockSearchResult(code, name, market))
            }
        }

        logger.info("[EastMoney] 解析结果: ${results.size} 条")
        return results
    }
}
