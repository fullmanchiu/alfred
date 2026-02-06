package com.colafan.alfred.service

import com.colafan.alfred.entity.Transaction
import com.colafan.alfred.repository.PostingRepository
import com.colafan.alfred.repository.TransactionRepository
import org.springframework.data.domain.Page
import org.springframework.data.domain.Pageable
import org.springframework.stereotype.Service

/**
 * 账户历史服务
 *
 * 负责查询和组装账户的历史交易记录
 */
@Service
class AccountHistoryService(
    private val transactionRepository: TransactionRepository,
    private val postingRepository: PostingRepository
) {

    /**
     * 获取账户的历史记录
     *
     * @param accountId 账户ID
     * @param currency 货币代码（可选）
     * @param pageable 分页参数
     * @return 分页的历史记录
     */
    fun getAccountHistory(
        accountId: Long,
        currency: String?,
        pageable: Pageable
    ): Page<com.colafan.alfred.dto.response.AccountHistoryResponse> {
        // 查询该账户相关的所有交易
        val transactions = transactionRepository
            .findByAccountIdOrderByIdDesc(accountId, pageable)

        // 转换为响应格式
        val historyRecords = transactions.content.map { transaction ->
            val isInflow = transaction.toAccountId == accountId
            val amount = transaction.amount
            val posting = postingRepository
                .findByTransactionIdAndUserAccountId(transaction.id!!, accountId)
                .firstOrNull()

            val (typeCode, typeDisplay) = when {
                transaction.type == "transfer" -> if (isInflow)
                    "transfer_in" to "转入" else "transfer_out" to "转出"
                transaction.type == "adjustment" -> if (isInflow)
                    "balance_increase" to "余额校准(增加)" else "balance_decrease" to "余额校准(减少)"
                transaction.type == "income" -> "income" to "收入"
                transaction.type == "expense" -> "expense" to "支出"
                else -> "unknown" to "未知"
            }

            com.colafan.alfred.dto.response.AccountHistoryResponse(
                id = transaction.id!!,
                typeCode = typeCode,
                typeDisplay = typeDisplay,
                amount = amount.toDouble(),
                currency = transaction.currency,
                isInflow = isInflow,
                entryType = posting?.entryType, // 'DEBIT' 或 'CREDIT'
                transactionDate = transaction.transactionDate,
                relatedAccount = if (transaction.type == "transfer") {
                    if (isInflow) transaction.fromAccountId else transaction.toAccountId
                } else null,
                notes = transaction.notes ?: transaction.adjustmentReason,
                categoryId = transaction.categoryId, // 返回分类ID，让前端自己查询分类信息
                categoryName = "-" // 已废弃，保留用于兼容性
            )
        }.filter { historyRecord ->
            // 如果指定了货币，只返回该货币的记录
            currency == null || historyRecord.currency == currency
        }

        // 手动构建新的 Page 对象
        return org.springframework.data.domain.PageImpl(
            historyRecords,
            pageable,
            transactions.totalElements
        )
    }
}
