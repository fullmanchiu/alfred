package com.colafan.alfred.util

import com.colafan.alfred.entity.Transaction

/**
 * 交易工具类
 */
object TransactionUtil {

    /**
     * 判断交易是否为流入（收入）
     * 对于普通交易：toAccountId != null 表示流入
     * 对于账户历史记录：需要判断是否流入指定账户
     *
     * @param transaction 交易实体
     * @param accountId 账户ID（可选，用于账户历史记录判断）
     * @return true表示流入，false表示流出
     */
    fun isInflow(transaction: Transaction, accountId: Long? = null): Boolean {
        return if (accountId != null) {
            // 账户历史记录：判断是否流入该账户
            transaction.toAccountId == accountId
        } else {
            // 普通交易：toAccountId 不为空表示流入
            transaction.toAccountId != null
        }
    }
}
