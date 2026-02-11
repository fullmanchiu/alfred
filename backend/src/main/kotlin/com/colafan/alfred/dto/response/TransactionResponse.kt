package com.colafan.alfred.dto.response

import com.colafan.alfred.entity.Transaction
import com.colafan.alfred.util.IconMapper
import com.colafan.alfred.util.TransactionUtil
import java.time.LocalDateTime

data class TransactionResponse(
    val id: Long,
    val type: String,
    val amount: Double,
    val currency: String,
    val fromAccountId: Long?,
    val toAccountId: Long?,
    val categoryId: Long?,
    val transactionDate: LocalDateTime,
    val notes: String = "",
    val location: String = "",
    val tags: String = "",
    val imageCount: Int,
    val createdAt: LocalDateTime,

    // 统一的显示信息（由后端填充）
    val displayIcon: String = "help",        // Material Icon 名称
    val displayColor: String = "#8c8c8c",    // 显示颜色
    val displayName: String = "未知",         // 显示名称
    val categoryName: String? = null,        // 分类名称
    val isInflow: Boolean = false            // 是否流入
) {
    companion object {
        fun fromEntity(transaction: Transaction): TransactionResponse {
            // 判断是否为流入（使用统一的工具方法）
            val isInflow = TransactionUtil.isInflow(transaction)

            return TransactionResponse(
                id = transaction.id!!,
                type = transaction.type,
                amount = transaction.amount.toDouble(),
                currency = transaction.currency,
                fromAccountId = transaction.fromAccountId,
                toAccountId = transaction.toAccountId,
                categoryId = transaction.categoryId,
                transactionDate = transaction.transactionDate,
                notes = transaction.notes ?: "",
                location = transaction.location ?: "",
                tags = transaction.tags ?: "",
                imageCount = transaction.imageCount,
                createdAt = transaction.createdAt!!,
                isInflow = isInflow,
                displayIcon = IconMapper.getTransactionTypeIcon(transaction.type, isInflow),
                displayColor = IconMapper.getTransactionTypeColor(transaction.type, isInflow),
                displayName = IconMapper.getTransactionTypeDisplayName(transaction.type, isInflow)
            )
        }
    }
}
