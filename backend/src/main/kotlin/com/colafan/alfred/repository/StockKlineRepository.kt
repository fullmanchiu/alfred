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
}
