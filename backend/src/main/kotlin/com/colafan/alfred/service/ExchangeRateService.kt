package com.colafan.alfred.service

import com.colafan.alfred.config.ExchangeRateConfig
import com.colafan.alfred.dto.response.ExternalExchangeRateResponse
import com.colafan.alfred.entity.ExchangeRate
import com.colafan.alfred.exception.ApiException
import com.colafan.alfred.exception.ErrorCode
import com.colafan.alfred.repository.ExchangeRateRepository
import org.slf4j.LoggerFactory
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import org.springframework.web.client.RestTemplate
import java.math.BigDecimal
import java.time.LocalDate

/**
 * 汇率服务
 *
 * 提供汇率查询、缓存和外部API调用功能
 */
@Service
class ExchangeRateService(
    private val exchangeRateRepository: ExchangeRateRepository,
    private val exchangeRateConfig: ExchangeRateConfig,
    private val restTemplate: RestTemplate
) {
    private val logger = LoggerFactory.getLogger(ExchangeRateService::class.java)

    companion object {
        const val DEFAULT_TO_CURRENCY = "CNY"
        val SUPPORTED_CURRENCIES = listOf("CNY", "USD", "HKD", "EUR", "JPY", "GBP")
    }

    /**
     * 获取或创建汇率
     *
     * 如果数据库中存在指定日期的汇率，直接返回
     * 如果不存在，从外部API获取并存储
     *
     * @param date 汇率日期
     * @param fromCurrency 原始币种
     * @param toCurrency 目标币种（默认为CNY）
     * @return 汇率
     */
    @Transactional
    fun getOrCreateRate(
        date: LocalDate,
        fromCurrency: String,
        toCurrency: String = DEFAULT_TO_CURRENCY
    ): BigDecimal {
        // 如果源币种和目标币种相同，汇率为1
        if (fromCurrency == toCurrency) {
            return BigDecimal.ONE
        }

        // 检查币种是否支持
        if (fromCurrency !in SUPPORTED_CURRENCIES || toCurrency !in SUPPORTED_CURRENCIES) {
            throw ApiException.withMessage(ErrorCode.BAD_REQUEST, "不支持的币种: $fromCurrency, $toCurrency")
        }

        // 从数据库查询
        val existingRate = exchangeRateRepository.findByDateAndFromCurrencyAndToCurrency(
            date, fromCurrency, toCurrency
        )

        if (existingRate != null) {
            logger.debug("使用缓存的汇率: {} = {} {}", date, fromCurrency, existingRate.rate)
            return existingRate.rate
        }

        // 数据库中没有，尝试获取最新的汇率（不晚于指定日期）
        val latestRate = exchangeRateRepository.findLatestRate(date, fromCurrency, toCurrency)

        if (latestRate != null) {
            logger.info("使用最近的汇率: {} ({}) = {} {}", latestRate.date, fromCurrency, latestRate.rate, toCurrency)
            return latestRate.rate
        }

        // 既没有当日汇率，也没有历史汇率，尝试使用当前最新汇率
        val currentLatestRate = exchangeRateRepository.findLatestRate(
            LocalDate.now(), fromCurrency, toCurrency
        )
        if (currentLatestRate != null) {
            logger.info("使用当前最新汇率: {} ({}) = {} {}", currentLatestRate.date, fromCurrency, currentLatestRate.rate, toCurrency)
            return currentLatestRate.rate
        }

        // 既没有当天汇率，也没有历史汇率，也没有当前汇率，尝试从外部API获取
        if (exchangeRateConfig.enabled) {
            try {
                logger.info("从外部API获取汇率: {} -> {}", fromCurrency, toCurrency)
                val fetchedRate = fetchFromExternalApi(fromCurrency, toCurrency)
                // 保存到数据库（使用今天的日期）
                saveRate(LocalDate.now(), fromCurrency, toCurrency, fetchedRate)
                logger.info("成功从外部API获取并保存汇率: {} = {} {}", fromCurrency, fetchedRate, toCurrency)
                return fetchedRate
            } catch (e: Exception) {
                logger.error("从外部API获取汇率失败: ${e.message}", e)
                throw ApiException.withMessage(ErrorCode.SERVICE_UNAVAILABLE, "无法获取汇率数据，请稍后再试")
            }
        }

        // 外部API未启用，抛出异常
        logger.warn("未找到汇率数据且外部API未启用: date={}, from={}, to={}", date, fromCurrency, toCurrency)
        throw ApiException.withMessage(ErrorCode.NOT_FOUND, "未找到 $fromCurrency 到 $toCurrency 在 $date 的汇率数据")
    }

    /**
     * 从外部API获取汇率
     *
     * @param fromCurrency 源币种
     * @param toCurrency 目标币种
     * @return 汇率
     */
    private fun fetchFromExternalApi(fromCurrency: String, toCurrency: String): BigDecimal {
        val url = "${exchangeRateConfig.apiUrl}/$fromCurrency"

        try {
            // 添加Accept头，指定JSON格式
            val headers = org.springframework.http.HttpHeaders()
            headers.set("Accept", "application/json")

            val entity = org.springframework.http.HttpEntity<Void>(headers)
            logger.info("调用外部汇率API: url={}, headers={}", url, headers.toSingleValueMap())

            val responseEntity = restTemplate.exchange(url, org.springframework.http.HttpMethod.GET, entity, ExternalExchangeRateResponse::class.java)
                ?: throw ApiException.withMessage(ErrorCode.SERVICE_UNAVAILABLE, "汇率API无响应")

            logger.info("外部汇率API响应状态: statusCode={}, contentType={}",
                responseEntity.statusCode.value(), responseEntity.headers.getContentType()?.toString())

            // 检查Content-Type
            val contentType = responseEntity.headers.getContentType()?.toString() ?: ""
            if (!contentType.contains("application/json")) {
                logger.error("外部API返回了非JSON格式: {}", contentType)
                throw ApiException.withMessage(ErrorCode.SERVICE_UNAVAILABLE, "汇率API返回了非JSON格式: $contentType")
            }

            // 从响应体中获取目标币种的汇率
            val responseBody = responseEntity.body
                ?: throw ApiException.withMessage(ErrorCode.SERVICE_UNAVAILABLE, "汇率API响应为空")

            val rate = responseBody.rates?.get(toCurrency)
                ?: throw ApiException.withMessage(ErrorCode.NOT_FOUND, "汇率API未返回 $toCurrency 汇率")

            return BigDecimal.valueOf(rate).setScale(6, java.math.RoundingMode.HALF_UP)
        } catch (e: ApiException) {
            throw e
        } catch (e: Exception) {
            logger.error("调用汇率API失败: ${e.message}", e)
            throw ApiException.withMessage(ErrorCode.SERVICE_UNAVAILABLE, "调用汇率API失败: ${e.message}")
        }
    }

    /**
     * 获取当前汇率（今天）
     */
    fun getCurrentRate(fromCurrency: String, toCurrency: String = DEFAULT_TO_CURRENCY): BigDecimal {
        logger.info("getCurrentRate called: from=$fromCurrency, to=$toCurrency")
        return try {
            getOrCreateRate(LocalDate.now(), fromCurrency, toCurrency)
        } catch (e: Exception) {
            logger.error("getCurrentRate failed: from=$fromCurrency, to=$toCurrency, error=${e.message}", e)
            throw e
        }
    }

    /**
     * 保存或更新汇率
     */
    @Transactional
    fun saveRate(
        date: LocalDate,
        fromCurrency: String,
        toCurrency: String,
        rate: BigDecimal
    ): ExchangeRate {
        val existingRate = exchangeRateRepository.findByDateAndFromCurrencyAndToCurrency(
            date, fromCurrency, toCurrency
        )

        return if (existingRate != null) {
            // 更新现有汇率
            exchangeRateRepository.save(
                ExchangeRate(
                    id = existingRate.id,
                    date = date,
                    fromCurrency = fromCurrency,
                    toCurrency = toCurrency,
                    rate = rate,
                    createdAt = existingRate.createdAt,
                    updatedAt = java.time.LocalDateTime.now()
                )
            )
        } else {
            // 创建新汇率
            exchangeRateRepository.save(
                ExchangeRate(
                    date = date,
                    fromCurrency = fromCurrency,
                    toCurrency = toCurrency,
                    rate = rate
                )
            )
        }
    }

    /**
     * 批量保存汇率
     */
    @Transactional
    fun batchSaveRates(rates: List<Triple<LocalDate, String, BigDecimal>>): Int {
        var count = 0
        rates.forEach { (date, fromCurrency, rate) ->
            saveRate(date, fromCurrency, DEFAULT_TO_CURRENCY, rate)
            count++
        }
        return count
    }

    /**
     * 获取汇率列表
     */
    fun getRates(
        startDate: LocalDate? = null,
        endDate: LocalDate? = null,
        fromCurrency: String? = null,
        toCurrency: String = DEFAULT_TO_CURRENCY
    ): List<ExchangeRate> {
        return if (startDate != null && endDate != null && fromCurrency != null) {
            exchangeRateRepository.findByDateBetweenAndFromCurrencyAndToCurrencyOrderByDateAsc(
                startDate, endDate, fromCurrency, toCurrency
            )
        } else if (fromCurrency != null) {
            exchangeRateRepository.findByFromCurrencyAndToCurrencyOrderByDateDesc(
                fromCurrency, toCurrency
            )
        } else {
            exchangeRateRepository.findAll()
        }
    }

    /**
     * 计算CNY等值金额
     *
     * @param amount 原始金额
     * @param currency 原始币种
     * @param date 交易日期
     * @return CNY等值金额
     */
    fun calculateCnyAmount(amount: BigDecimal, currency: String, date: LocalDate): BigDecimal {
        if (currency == DEFAULT_TO_CURRENCY) {
            return amount
        }

        val rate = getOrCreateRate(date, currency, DEFAULT_TO_CURRENCY)
        return amount.multiply(rate).setScale(2, java.math.RoundingMode.HALF_UP)
    }
}
