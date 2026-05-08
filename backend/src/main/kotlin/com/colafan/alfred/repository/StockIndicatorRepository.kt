package com.colafan.alfred.repository

import com.colafan.alfred.entity.StockIndicator
import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.data.jpa.repository.Query
import org.springframework.stereotype.Repository
import java.time.LocalDateTime

/**
 * 技术指标缓存Repository
 */
@Repository
interface StockIndicatorRepository : JpaRepository<StockIndicator, Long> {
    fun findByStockIdAndTradeDate(stockId: Long, tradeDate: java.time.LocalDate): StockIndicator?

    @Query("""
        SELECT si FROM StockIndicator si
        WHERE si.stockId = :stockId
        ORDER BY si.tradeDate ASC
        LIMIT :limit
    """)
    fun findByStockIdOrderByTradeDateAsc(stockId: Long, limit: Int = 500): List<StockIndicator>

    @Query("""
        SELECT si FROM StockIndicator si
        WHERE si.stockId = :stockId
        ORDER BY si.tradeDate DESC
        LIMIT 1
    """)
    fun findLatestByStockId(stockId: Long): StockIndicator?

    @Query("""
        SELECT si FROM StockIndicator si
        WHERE si.stockId = :stockId
        AND si.updatedAt > :threshold
        ORDER BY si.tradeDate DESC
        LIMIT 1
    """)
    fun findCachedByStockId(stockId: Long, threshold: LocalDateTime): StockIndicator?
}
