package com.colafan.alfred.service

import com.colafan.alfred.entity.Posting
import com.colafan.alfred.repository.PostingRepository
import com.colafan.alfred.repository.SystemAccountRepository
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.math.BigDecimal

/**
 * 复式记账服务
 *
 * 负责创建和管理借贷分录，确保每笔交易都遵循复式记账原则：
 * - 有借必有贷
 * - 借贷必相等
 */
@Service
class PostingService(
    private val postingRepository: PostingRepository,
    private val systemAccountRepository: SystemAccountRepository
) {

    /**
     * 创建复式记账分录
     * 自动创建借贷双方的分录
     *
     * @param transactionId 交易ID
     * @param debitAccountId 借方账户ID
     * @param creditAccountId 贷方账户ID
     * @param amount 金额
     * @param isUserAccount 是否为用户账户（true）或系统账户（false）
     */
    @Transactional
    fun createPostings(
        transactionId: Long,
        debitAccountId: Long,
        creditAccountId: Long,
        amount: BigDecimal,
        isUserAccount: Boolean = true
    ) {
        val debitPosting = if (isUserAccount) {
            Posting(
                transactionId = transactionId,
                userAccountId = debitAccountId,
                systemAccountId = null,
                entryType = "DEBIT",
                amount = amount
            )
        } else {
            Posting(
                transactionId = transactionId,
                userAccountId = null,
                systemAccountId = debitAccountId,
                entryType = "DEBIT",
                amount = amount
            )
        }

        val creditPosting = if (isUserAccount) {
            Posting(
                transactionId = transactionId,
                userAccountId = creditAccountId,
                systemAccountId = null,
                entryType = "CREDIT",
                amount = amount
            )
        } else {
            Posting(
                transactionId = transactionId,
                userAccountId = null,
                systemAccountId = creditAccountId,
                entryType = "CREDIT",
                amount = amount
            )
        }

        postingRepository.saveAll(listOf(debitPosting, creditPosting))
    }

    /**
     * 为余额校准创建分录
     *
     * @param transactionId 交易ID
     * @param accountId 用户账户ID
     * @param amount 校准金额
     * @param isIncrease true=增加余额, false=减少余额
     */
    @Transactional
    fun createAdjustmentPostings(
        transactionId: Long,
        accountId: Long,
        amount: BigDecimal,
        isIncrease: Boolean
    ) {
        // 从 system_accounts 获取权益账户
        val equityCode = if (isIncrease) "EQUITY_ADD" else "EQUITY_WITHDRAW"
        val equityAccount = systemAccountRepository.findByCode(equityCode)
            ?: throw IllegalArgumentException("未找到权益账户: $equityCode")

        if (isIncrease) {
            // 借：用户账户，贷：权益账户
            val debitPosting = Posting(
                transactionId = transactionId,
                userAccountId = accountId,
                systemAccountId = null,
                entryType = "DEBIT",
                amount = amount
            )

            val creditPosting = Posting(
                transactionId = transactionId,
                userAccountId = null,
                systemAccountId = equityAccount.id!!,
                entryType = "CREDIT",
                amount = amount
            )

            postingRepository.saveAll(listOf(debitPosting, creditPosting))
        } else {
            // 借：权益账户，贷：用户账户
            val debitPosting = Posting(
                transactionId = transactionId,
                userAccountId = null,
                systemAccountId = equityAccount.id!!,
                entryType = "DEBIT",
                amount = amount
            )

            val creditPosting = Posting(
                transactionId = transactionId,
                userAccountId = accountId,
                systemAccountId = null,
                entryType = "CREDIT",
                amount = amount
            )

            postingRepository.saveAll(listOf(debitPosting, creditPosting))
        }
    }
}
