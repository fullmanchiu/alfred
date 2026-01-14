package com.colafan.alfred.dto.response

import com.colafan.alfred.entity.Transaction
import java.time.LocalDateTime

data class TransactionResponse(
    val id: Long,
    val type: String,
    val amount: Double,
    val fromAccountId: Long?,
    val toAccountId: Long?,
    val categoryId: Long?,
    val transactionDate: LocalDateTime,
    val notes: String = "",
    val location: String = "",
    val tags: String = "",
    val imageCount: Int,
    val createdAt: LocalDateTime
) {
    companion object {
        fun fromEntity(transaction: Transaction): TransactionResponse {
            return TransactionResponse(
                id = transaction.id!!,
                type = transaction.type,
                amount = transaction.amount.toDouble(),
                fromAccountId = transaction.fromAccountId,
                toAccountId = transaction.toAccountId,
                categoryId = transaction.categoryId,
                transactionDate = transaction.transactionDate,
                notes = transaction.notes ?: "",
                location = transaction.location ?: "",
                tags = transaction.tags ?: "",
                imageCount = transaction.imageCount,
                createdAt = transaction.createdAt!!
            )
        }
    }
}
