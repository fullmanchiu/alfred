package com.colafan.alfred.dto.request

import java.time.LocalDateTime

data class TransactionRequest(
    val type: String,
    val amount: Double,
    val fromAccountId: Long? = null,
    val toAccountId: Long? = null,
    val categoryId: Long? = null,
    val transactionDate: LocalDateTime,
    val notes: String? = null,
    val location: String? = null,
    val tags: String? = null,
    val imageCount: Int = 0
)
