package com.colafan.alfred.entity

import jakarta.persistence.*
import java.time.LocalDate
import java.time.LocalDateTime

/**
 * 历史K线数据
 * 由Python定时任务每天收盘后更新
 */
@Entity
@Table(name = "stock_klines", uniqueConstraints = [
    (UniqueConstraint(columnNames = ["stock_id", "trade_date"]))
])
class StockKline(
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    val id: Long? = null,

    @Column(name = "stock_id", nullable = false)
    val stockId: Long,

    @Column(name = "trade_date", nullable = false)
    val tradeDate: LocalDate,

    @Column(nullable = false)
    var open: java.math.BigDecimal,  // 开盘价

    @Column(nullable = false)
    var high: java.math.BigDecimal,  // 最高价

    @Column(nullable = false)
    var low: java.math.BigDecimal,   // 最低价

    @Column(nullable = false)
    var close: java.math.BigDecimal, // 收盘价

    @Column(nullable = false)
    var volume: Long,  // 成交量

    @Column
    var amount: java.math.BigDecimal? = null,  // 成交额

    @Column
    var preClose: java.math.BigDecimal? = null,  // 昨收价

    @Column
    var turnRate: java.math.BigDecimal? = null,  // 换手率 (%)

    @Column
    var pctChange: java.math.BigDecimal? = null,  // 涨跌幅 (%)

    @Column(name = "created_at", updatable = false)
    val createdAt: LocalDateTime = LocalDateTime.now()
)
