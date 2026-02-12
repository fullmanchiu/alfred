package com.colafan.alfred.repository

import com.colafan.alfred.entity.ExchangeRate
import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.data.jpa.repository.Query
import org.springframework.data.repository.query.Param
import org.springframework.stereotype.Repository
import java.time.LocalDate

/**
 * 汇率数据访问接口
 */
@Repository
interface ExchangeRateRepository : JpaRepository<ExchangeRate, Long> {

    /**
     * 查找指定日期和币种的汇率
     */
    fun findByDateAndFromCurrencyAndToCurrency(
        date: LocalDate,
        fromCurrency: String,
        toCurrency: String
    ): ExchangeRate?

    /**
     * 查找指定日期范围内的汇率
     */
    fun findByDateBetweenAndFromCurrencyAndToCurrencyOrderByDateAsc(
        startDate: LocalDate,
        endDate: LocalDate,
        fromCurrency: String,
        toCurrency: String
    ): List<ExchangeRate>

    /**
     * 查找最新的汇率（不早于指定日期）
     */
    @Query("SELECT e FROM ExchangeRate e WHERE e.date <= :date AND e.fromCurrency = :fromCurrency AND e.toCurrency = :toCurrency ORDER BY e.date DESC LIMIT 1")
    fun findLatestRate(
        @Param("date") date: LocalDate,
        @Param("fromCurrency") fromCurrency: String,
        @Param("toCurrency") toCurrency: String
    ): ExchangeRate?

    /**
     * 查找指定币种的所有汇率记录
     */
    fun findByFromCurrencyAndToCurrencyOrderByDateDesc(
        fromCurrency: String,
        toCurrency: String
    ): List<ExchangeRate>

    /**
     * 批量保存汇率（去重）
     */
    @Query("""
        INSERT INTO exchange_rates (date, from_currency, to_currency, rate, created_at, updated_at)
        VALUES (:date, :fromCurrency, :toCurrency, :rate, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        ON CONFLICT (date, from_currency, to_currency)
        DO UPDATE SET rate = :rate, updated_at = CURRENT_TIMESTAMP
    """, nativeQuery = true)
    fun upsertRate(
        @Param("date") date: LocalDate,
        @Param("fromCurrency") fromCurrency: String,
        @Param("toCurrency") toCurrency: String,
        @Param("rate") rate: java.math.BigDecimal
    ): Int
}
