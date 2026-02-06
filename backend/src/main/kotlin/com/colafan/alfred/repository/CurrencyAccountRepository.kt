package com.colafan.alfred.repository

import com.colafan.alfred.entity.CurrencyAccount
import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.stereotype.Repository

/**
 * 货币账户数据访问层
 */
@Repository
interface CurrencyAccountRepository : JpaRepository<CurrencyAccount, Long> {

    /**
     * 查询用户的所有货币账户（包括软删除的）
     */
    fun findByUserId(userId: Long): List<CurrencyAccount>

    /**
     * 查询指定账户组的所有激活货币账户
     */
    fun findByAccountGroupIdAndIsActiveTrue(accountGroupId: Long): List<CurrencyAccount>

    /**
     * 查询指定账户组和货币的货币账户
     */
    fun findByAccountGroupIdAndCurrencyAndIsActiveTrue(
        accountGroupId: Long,
        currency: String
    ): CurrencyAccount?

    /**
     * 查询用户的所有激活货币账户
     */
    fun findByUserIdAndIsActiveTrue(userId: Long): List<CurrencyAccount>

    /**
     * 查询用户指定货币的所有激活货币账户
     */
    fun findByUserIdAndCurrencyAndIsActiveTrue(
        userId: Long,
        currency: String
    ): List<CurrencyAccount>

    /**
     * 检查账户组是否已存在指定货币
     */
    fun existsByAccountGroupIdAndCurrencyAndIsActiveTrue(
        accountGroupId: Long,
        currency: String
    ): Boolean
}
