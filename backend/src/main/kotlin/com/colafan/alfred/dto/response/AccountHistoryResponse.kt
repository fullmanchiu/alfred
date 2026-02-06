package com.colafan.alfred.dto.response

import java.time.LocalDateTime

/**
 * 账户历史记录响应
 *
 * 用于返回账户的历史交易记录，包含交易类型、金额、方向等详细信息
 *
 * @property id 交易ID
 * @property typeCode 交易类型代码：'income', 'expense', 'transfer_in', 'transfer_out', 'balance_increase', 'balance_decrease'
 * @property typeDisplay 交易类型显示名称：'收入', '支出', '转入', '转出', '余额校准(增加)', '余额校准(减少)'
 * @property amount 交易金额
 * @property currency 货币代码：CNY, HKD, USD, EUR, MOP
 * @property isInflow 是否为流入（true=转入/收入，false=转出/支出）
 * @property entryType 复式记账分录类型：'DEBIT' 或 'CREDIT'
 * @property transactionDate 交易日期时间
 * @property relatedAccount 关联账户ID（转账类型时显示对方账户）
 * @property notes 备注说明或余额校准原因
 * @property categoryId 分类ID（用于前端获取分类图标和名称）
 * @property categoryName 分类名称（已废弃，保留用于兼容性）
 */
data class AccountHistoryResponse(
    val id: Long,
    val typeCode: String, // 'income', 'expense', 'transfer_in', 'transfer_out', 'balance_increase', 'balance_decrease'
    val typeDisplay: String, // '收入', '支出', '转入', '转出', '余额校准(增加)', '余额校准(减少)'
    val amount: Double,
    val currency: String,
    val isInflow: Boolean, // true=流入, false=流出
    val entryType: String?, // 'DEBIT' 或 'CREDIT'
    val transactionDate: LocalDateTime,
    val relatedAccount: Long?, // 转账时的对方账户
    val notes: String?,
    val categoryId: Long?, // 分类ID，用于前端查询分类信息
    @Deprecated("使用 categoryId 代替")
    val categoryName: String?
)
