package com.colafan.alfred.dto.response

import java.math.BigDecimal
import java.time.LocalDateTime

/**
 * 交易响应（包含显示信息）
 *
 * 后端统一处理图标、颜色、显示名称，前端只需渲染
 */
data class TransactionDisplayResponse(
    val id: Long,
    val type: String, // 'income', 'expense', 'transfer', 'adjustment', etc.
    val amount: BigDecimal,
    val currency: String,
    val transactionDate: LocalDateTime,
    val notes: String?,

    // 分类信息
    val categoryId: Long?,
    val categoryName: String?,
    val categoryIcon: String?, // Material Icon 名称

    // 账户信息
    val fromAccountId: Long?,
    val toAccountId: Long?,
    val fromAccountName: String?,
    val toAccountName: String?,

    // 统一的显示信息（后端处理）
    val displayIcon: String,      // Material Icon 名称
    val displayColor: String,     // 颜色值
    val displayName: String,      // 显示名称
    val isInflow: Boolean         // 是否为流入
)
