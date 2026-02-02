package com.colafan.alfred.entity

import jakarta.persistence.*
import java.time.LocalDate
import java.time.LocalDateTime

/**
 * 技术指标缓存
 * 缓存1小时，由Python计算
 */
@Entity
@Table(name = "stock_indicators", uniqueConstraints = [
    (UniqueConstraint(columnNames = ["stock_id", "trade_date"]))
])
class StockIndicator(
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    val id: Long? = null,

    @Column(name = "stock_id", nullable = false)
    val stockId: Long,

    @Column(name = "trade_date", nullable = false)
    val tradeDate: LocalDate,

    // MA指标
    @Column
    var ma5: java.math.BigDecimal? = null,

    @Column
    var ma10: java.math.BigDecimal? = null,

    @Column
    var ma20: java.math.BigDecimal? = null,

    @Column
    var ma60: java.math.BigDecimal? = null,

    // MACD指标
    @Column
    var macd: java.math.BigDecimal? = null,

    @Column(name = "macd_signal")
    var macdSignal: java.math.BigDecimal? = null,

    @Column(name = "macd_hist")
    var macdHist: java.math.BigDecimal? = null,

    // RSI指标
    @Column
    var rsi: java.math.BigDecimal? = null,

    // KDJ指标
    @Column(name = "kdj_k")
    var kdjK: java.math.BigDecimal? = null,

    @Column(name = "kdj_d")
    var kdjD: java.math.BigDecimal? = null,

    @Column(name = "kdj_j")
    var kdjJ: java.math.BigDecimal? = null,

    // 布林带
    @Column(name = "boll_upper")
    var bollUpper: java.math.BigDecimal? = null,

    @Column(name = "boll_middle")
    var bollMiddle: java.math.BigDecimal? = null,

    @Column(name = "boll_lower")
    var bollLower: java.math.BigDecimal? = null,

    @Column(name = "created_at", updatable = false)
    var createdAt: LocalDateTime = LocalDateTime.now(),

    @Column(name = "updated_at")
    var updatedAt: LocalDateTime = LocalDateTime.now()
) {
    @PreUpdate
    fun onUpdate() {
        updatedAt = LocalDateTime.now()
    }
}
