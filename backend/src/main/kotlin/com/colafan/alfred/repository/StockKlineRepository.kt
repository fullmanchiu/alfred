package com.colafan.alfred.repository

import com.colafan.alfred.entity.StockKline
import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.data.jpa.repository.Query
import org.springframework.stereotype.Repository
import java.time.LocalDate

/**
 * 历史K线数据Repository
 */
@Repository
interface StockKlineRepository : JpaRepository<StockKline, Long> {
    fun findByStockIdAndTradeDateBetweenOrderByTradeDate(
        stockId: Long,
        startDate: LocalDate,
        endDate: LocalDate
    ): List<StockKline>

    fun findTopByStockIdOrderByTradeDateDesc(stockId: Long): StockKline?

    @Query("""
        SELECT sk FROM StockKline sk
        WHERE sk.stockId = :stockId
        ORDER BY sk.tradeDate DESC
        LIMIT :limit
    """)
    fun findLatestKLines(stockId: Long, limit: Int = 90): List<StockKline>

    /**
     * 统计股票的K线数据数量
     */
    fun countByStockId(stockId: Long): Int

    /**
     * 查找指定股票的K线数据（按交易日期升序）
     * @param stockId 股票ID
     * @param limit 返回记录数限制
     * @return 按交易日期升序排列的K线数据
     */
    @Query("""
        SELECT sk FROM StockKline sk
        WHERE sk.stockId = :stockId
        ORDER BY sk.tradeDate ASC
        LIMIT :limit
    """)
    fun findByStockIdOrderByTradeDateAsc(stockId: Long, limit: Int = 500): List<StockKline>
}
