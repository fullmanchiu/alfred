package com.colafan.alfred.controller

import com.colafan.alfred.dto.request.ExchangeRateBatchRequest
import com.colafan.alfred.dto.request.ExchangeRateRequest
import com.colafan.alfred.dto.response.ExchangeRateResponse
import com.colafan.alfred.entity.ExchangeRate
import com.colafan.alfred.service.AuthService
import com.colafan.alfred.service.ExchangeRateService
import io.swagger.v3.oas.annotations.Operation
import io.swagger.v3.oas.annotations.tags.Tag
import jakarta.validation.Valid
import org.slf4j.LoggerFactory
import org.springframework.format.annotation.DateTimeFormat
import org.springframework.http.ResponseEntity
import org.springframework.security.core.Authentication
import org.springframework.web.bind.annotation.*
import java.time.LocalDate

/**
 * 汇率管理 API
 */
@Tag(name = "汇率管理", description = "汇率查询和管理接口")
@RestController
@RequestMapping("/api/v1/exchange-rates")
class ExchangeRateController(
    private val exchangeRateService: ExchangeRateService,
    private val authService: AuthService
) {
    private val logger = LoggerFactory.getLogger(ExchangeRateController::class.java)

    /**
     * 获取汇率列表
     */
    @GetMapping
    @Operation(summary = "获取汇率列表", description = "支持按日期范围和币种筛选")
    fun getRates(
        @RequestParam(required = false) from: String?,
        @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) startDate: LocalDate?,
        @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) endDate: LocalDate?,
        @RequestParam(required = false, defaultValue = "CNY") to: String,
        authentication: Authentication
    ): ResponseEntity<List<ExchangeRateResponse>> {
        authService.getCurrentUserId(authentication) // 验证用户身份

        val rates = exchangeRateService.getRates(startDate, endDate, from, to)

        logger.info("查询汇率列表: from={}, startDate={}, endDate={}, to={}, count={}",
            from, startDate, endDate, to, rates.size)

        return ResponseEntity.ok(rates.map { ExchangeRateResponse.fromEntity(it) })
    }

    /**
     * 获取当前汇率
     */
    @GetMapping("/current")
    @Operation(summary = "获取当前汇率", description = "获取指定币种对CNY的最新汇率")
    fun getCurrentRate(
        @RequestParam from: String,
        @RequestParam(required = false, defaultValue = "CNY") to: String,
        authentication: Authentication
    ): ResponseEntity<ExchangeRateResponse> {
        authService.getCurrentUserId(authentication) // 验证用户身份

        val rate = exchangeRateService.getCurrentRate(from, to)

        logger.info("查询当前汇率: from={}, to={}, rate={}", from, to, rate)

        return ResponseEntity.ok(
            ExchangeRateResponse(
                date = LocalDate.now(),
                fromCurrency = from,
                toCurrency = to,
                rate = rate
            )
        )
    }

    /**
     * 创建/更新单个汇率
     */
    @PostMapping
    @Operation(summary = "创建或更新汇率", description = "创建新的汇率记录或更新已有汇率")
    fun createRate(
        @Valid @RequestBody request: ExchangeRateRequest,
        authentication: Authentication
    ): ResponseEntity<ExchangeRateResponse> {
        val userId = authService.getCurrentUserId(authentication)

        logger.info("用户 {} 创建汇率: date={}, from={}, to={}, rate={}",
            userId, request.date, request.fromCurrency, request.toCurrency, request.rate)

        val rate = exchangeRateService.saveRate(
            date = request.date!!,
            fromCurrency = request.fromCurrency!!,
            toCurrency = request.toCurrency!!,
            rate = request.rate!!
        )

        return ResponseEntity.ok(ExchangeRateResponse.fromEntity(rate))
    }

    /**
     * 批量创建/更新汇率
     */
    @PostMapping("/batch")
    @Operation(summary = "批量创建汇率", description = "批量创建或更新多个汇率记录")
    fun batchCreateRates(
        @Valid @RequestBody request: ExchangeRateBatchRequest,
        authentication: Authentication
    ): ResponseEntity<Map<String, Any>> {
        val userId = authService.getCurrentUserId(authentication)

        logger.info("用户 {} 批量创建汇率: count={}", userId, request.rates.size)

        val count = exchangeRateService.batchSaveRates(
            request.rates.map { Triple(it.date, it.fromCurrency, it.rate) }
        )

        return ResponseEntity.ok(mapOf(
            "success" to true,
            "message" to "成功保存 $count 条汇率记录",
            "count" to count
        ))
    }
}
