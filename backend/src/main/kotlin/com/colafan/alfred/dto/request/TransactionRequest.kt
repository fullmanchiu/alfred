package com.colafan.alfred.dto.request

import jakarta.validation.constraints.NotNull
import jakarta.validation.constraints.Positive
import java.time.LocalDateTime

data class TransactionRequest(
    @field:NotNull(message = "交易类型不能为空")
    val type: String,

    @field:NotNull(message = "金额不能为空")
    @field:Positive(message = "金额必须大于0")
    val amount: Double,

    val fromAccountId: Long? = null,
    val toAccountId: Long? = null,
    val categoryId: Long? = null,

    @field:NotNull(message = "交易日期不能为空")
    val transactionDate: LocalDateTime,

    val notes: String? = null,
    val location: String? = null,
    val tags: String? = null,
    val imageCount: Int = 0
)
