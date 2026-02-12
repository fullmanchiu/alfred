package com.colafan.alfred.entity

import jakarta.persistence.*
import java.math.BigDecimal
import java.time.LocalDate
import java.time.LocalDateTime

/**
 * 汇率实体（ExchangeRate）
 *
 * 存储外汇牌价数据，用于多货币记账的汇率转换
 *
 * @property id 汇率记录ID
 * @property date 汇率生效日期
 * @property fromCurrency 原始币种（ISO 4217标准，如 USD, HKD, EUR, JPY）
 * @property toCurrency 目标币种（ISO 4217标准，目前固定为 CNY）
 * @property rate 汇率（1 from_currency = X to_currency）
 * @property createdAt 创建时间
 * @property updatedAt 更新时间
 */
@Entity
@Table(name = "exchange_rates",
    uniqueConstraints = [
        UniqueConstraint(name = "uk_exchange_rates_date_currency", columnNames = ["date", "from_currency", "to_currency"])
    ]
)
data class ExchangeRate(
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    val id: Long? = null,

    @Column(name = "date", nullable = false)
    val date: LocalDate,

    @Column(name = "from_currency", nullable = false, length = 3)
    val fromCurrency: String,

    @Column(name = "to_currency", nullable = false, length = 3)
    val toCurrency: String,

    @Column(nullable = false, precision = 10, scale = 6)
    val rate: BigDecimal,

    @Column(name = "created_at", nullable = false, updatable = false)
    val createdAt: LocalDateTime = LocalDateTime.now(),

    @Column(name = "updated_at", nullable = false)
    val updatedAt: LocalDateTime = LocalDateTime.now()
)
