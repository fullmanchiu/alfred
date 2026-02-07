package com.colafan.alfred.service

import com.colafan.alfred.dto.response.FundAccountResponse
import com.colafan.alfred.entity.FundAccount
import com.colafan.alfred.entity.FundAccountBalance
import com.colafan.alfred.entity.Transaction
import com.colafan.alfred.exception.ApiException
import com.colafan.alfred.exception.ErrorCode
import com.colafan.alfred.repository.FundAccountBalanceRepository
import com.colafan.alfred.repository.FundAccountRepository
import com.colafan.alfred.repository.SystemAccountRepository
import com.colafan.alfred.repository.TransactionRepository
import org.springframework.data.repository.findByIdOrNull
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.math.BigDecimal
import java.time.LocalDateTime

@Service
class FundAccountService(
    private val accountRepository: FundAccountRepository,
    private val accountBalanceRepository: FundAccountBalanceRepository,
    private val postingService: PostingService,
    private val transactionRepository: TransactionRepository,
    private val systemAccountRepository: SystemAccountRepository
) {

    fun getAccountsWithBalances(userId: Long): List<FundAccountResponse> {
        val accounts = accountRepository.findByUserIdAndDeletedFalseOrderByCreatedAtDesc(userId)

        return accounts.map { account ->
            val balances = accountBalanceRepository.findByAccountId(account.id!!)
            FundAccountResponse.fromEntityWithBalances(account, balances)
        }
    }

    fun getAccountsByUserId(userId: Long): List<FundAccount> {
        return accountRepository.findByUserIdAndDeletedFalseOrderByCreatedAtDesc(userId)
    }

    fun getAccountById(userId: Long, accountId: Long): FundAccount {
        val account = accountRepository.findByIdOrNull(accountId)
            ?: throw ApiException(ErrorCode.NOT_FOUND, "账户不存在")

        if (account.userId != userId) {
            throw ApiException(ErrorCode.FORBIDDEN, "无权访问此账户")
        }

        return account
    }

    fun getTotalBalance(userId: Long): BigDecimal {
        return accountRepository.findByUserIdAndDeletedFalseOrderByCreatedAtDesc(userId)
            .map { it.balance }
            .fold(BigDecimal.ZERO) { acc, balance -> acc.add(balance) }
    }

    @Transactional
    fun createAccount(userId: Long, account: FundAccount): FundAccount {
        val newAccount = FundAccount(
            userId = userId,
            name = account.name,
            accountType = account.accountType,
            accountNumber = account.accountNumber,
            balance = account.balance,
            currency = account.currency,
            isDefault = account.isDefault,
            institutionName = account.institutionName,
            icon = account.icon,
            color = account.color,
            notes = account.notes,
            isActive = true,
            deleted = false,
            fpsId = account.fpsId,
            swiftCode = account.swiftCode,
            iban = account.iban
        )

        val savedAccount = accountRepository.save(newAccount)

        // 创建主货币余额
        val balance = FundAccountBalance(
            accountId = savedAccount.id!!,
            currency = account.currency,
            balance = account.balance
        )
        accountBalanceRepository.save(balance)

        return savedAccount
    }

    /**
     * 创建账户并初始化多个货币余额
     *
     * TODO: 创建初始余额的 postings（如果有初始余额）
     * 借：账户，贷：EQUITY_INITIAL
     */
    @Transactional
    fun createAccountWithCurrencies(userId: Long, account: FundAccount, currencies: List<String>): FundAccount {
        // 创建账户
        val newAccount = FundAccount(
            userId = userId,
            name = account.name,
            accountType = account.accountType,
            accountNumber = account.accountNumber,
            balance = account.balance,
            currency = account.currency,
            isDefault = account.isDefault,
            institutionName = account.institutionName,
            icon = account.icon,
            color = account.color,
            notes = account.notes,
            isActive = true,
            deleted = false,
            fpsId = account.fpsId,
            swiftCode = account.swiftCode,
            iban = account.iban
        )

        val savedAccount = accountRepository.save(newAccount)

        // 为每个货币创建余额记录
        currencies.forEach { currencyCode ->
            val balance = if (currencyCode == account.currency) {
                account.balance  // 主货币使用初始余额
            } else {
                BigDecimal.ZERO  // 其他货币余额为0
            }

            val accountBalance = FundAccountBalance(
                accountId = savedAccount.id!!,
                currency = currencyCode,
                balance = balance
            )
            accountBalanceRepository.save(accountBalance)
        }

        // TODO: 如果有初始余额，需要创建 postings 来记录权益
        // 例如：借：用户账户，贷：EQUITY_INITIAL（初始投入）
        // if (account.balance > BigDecimal.ZERO) {
        //     // 创建一个特殊的"初始余额"交易记录
        //     // 然后调用 postingService.createPostings(...)
        // }

        return savedAccount
    }

    @Transactional
    fun updateAccount(userId: Long, accountId: Long, updatedAccount: FundAccount): FundAccount {
        val existingAccount = getAccountById(userId, accountId)

        val accountToUpdate = FundAccount(
            id = existingAccount.id,
            userId = existingAccount.userId,
            name = updatedAccount.name,
            accountType = updatedAccount.accountType,
            accountNumber = updatedAccount.accountNumber,
            balance = existingAccount.balance,
            currency = updatedAccount.currency,
            isDefault = updatedAccount.isDefault,
            institutionName = updatedAccount.institutionName,
            icon = updatedAccount.icon,
            color = updatedAccount.color,
            notes = updatedAccount.notes,
            isActive = existingAccount.isActive,
            deleted = existingAccount.deleted,
            fpsId = updatedAccount.fpsId,
            swiftCode = updatedAccount.swiftCode,
            iban = updatedAccount.iban,
            createdAt = existingAccount.createdAt,
            updatedAt = existingAccount.updatedAt
        )

        return accountRepository.save(accountToUpdate)
    }

    /**
     * 更新账户及其支持的货币列表
     *
     * @param userId 用户ID
     * @param accountId 账户ID
     * @param updatedAccount 更新的账户信息
     * @param currencies 支持的货币列表
     * @return 更新后的账户
     */
    @Transactional
    fun updateAccountWithCurrencies(userId: Long, accountId: Long, updatedAccount: FundAccount, currencies: List<String>): FundAccount {
        val existingAccount = getAccountById(userId, accountId)

        // 更新账户基本信息
        val accountToUpdate = FundAccount(
            id = existingAccount.id,
            userId = existingAccount.userId,
            name = updatedAccount.name,
            accountType = updatedAccount.accountType,
            accountNumber = updatedAccount.accountNumber,
            balance = existingAccount.balance,
            currency = updatedAccount.currency,
            isDefault = updatedAccount.isDefault,
            institutionName = updatedAccount.institutionName,
            icon = updatedAccount.icon,
            color = updatedAccount.color,
            notes = updatedAccount.notes,
            isActive = existingAccount.isActive,
            deleted = existingAccount.deleted,
            fpsId = updatedAccount.fpsId,
            swiftCode = updatedAccount.swiftCode,
            iban = updatedAccount.iban,
            createdAt = existingAccount.createdAt,
            updatedAt = existingAccount.updatedAt
        )

        val savedAccount = accountRepository.save(accountToUpdate)

        // 获取现有的余额记录
        val existingBalances = accountBalanceRepository.findByAccountId(accountId)
        val existingCurrencyMap = existingBalances.associateBy { it.currency }

        // 处理每个货币
        currencies.forEach { currencyCode ->
            if (existingCurrencyMap.containsKey(currencyCode)) {
                // 货币已存在，保留现有余额
                // 不需要做任何操作
            } else {
                // 货币不存在，创建新记录，余额为0
                val newBalance = FundAccountBalance(
                    accountId = accountId,
                    currency = currencyCode,
                    balance = BigDecimal.ZERO
                )
                accountBalanceRepository.save(newBalance)
            }
        }

        // 删除不再支持的货币（余额为0的）
        existingBalances.forEach { balance ->
            if (!currencies.contains(balance.currency) && balance.balance.compareTo(BigDecimal.ZERO) == 0) {
                accountBalanceRepository.delete(balance)
            }
        }

        return savedAccount
    }

    @Transactional
    fun deleteAccount(userId: Long, accountId: Long) {
        val account = getAccountById(userId, accountId)

        // 软删除：标记为 deleted，不真删
        val accountToDelete = FundAccount(
            id = account.id,
            userId = account.userId,
            name = account.name,
            accountType = account.accountType,
            accountNumber = account.accountNumber,
            balance = account.balance,
            currency = account.currency,
            isDefault = account.isDefault,
            icon = account.icon,
            color = account.color,
            notes = account.notes,
            isActive = account.isActive,
            deleted = true,
            createdAt = account.createdAt,
            updatedAt = account.updatedAt
        )

        accountRepository.save(accountToDelete)
    }

    @Transactional
    fun updateAccountBalance(accountId: Long, amount: BigDecimal, currency: String = "CNY") {
        val account = accountRepository.findByIdOrNull(accountId)
            ?: throw ApiException(ErrorCode.NOT_FOUND, "账户不存在")

        // 更新 fund_account_balances 表
        val accountBalance = accountBalanceRepository.findByAccountIdAndCurrency(accountId, currency)
        if (accountBalance != null) {
            // 已存在该货币余额，更新
            accountBalance.addBalance(amount)
            accountBalanceRepository.save(accountBalance)
        } else {
            // 不存在该货币余额，创建新记录
            val newBalance = FundAccountBalance(
                accountId = accountId,
                currency = currency,
                balance = amount
            )
            accountBalanceRepository.save(newBalance)
        }

        // 同时更新 fund_accounts 表的主余额字段（如果是主货币）
        if (currency == account.currency) {
            val updatedAccount = FundAccount(
                id = account.id,
                userId = account.userId,
                name = account.name,
                accountType = account.accountType,
                accountNumber = account.accountNumber,
                balance = account.balance.add(amount),
                currency = account.currency,
                isDefault = account.isDefault,
                icon = account.icon,
                color = account.color,
                notes = account.notes,
                isActive = account.isActive,
                deleted = account.deleted,
                createdAt = account.createdAt,
                updatedAt = account.updatedAt
            )
            accountRepository.save(updatedAccount)
        }
    }

    @Transactional
    fun adjustBalance(userId: Long, accountId: Long, newBalance: BigDecimal, reason: String): FundAccount {
        val account = accountRepository.findByIdOrNull(accountId)
            ?: throw ApiException(ErrorCode.NOT_FOUND, "账户不存在")

        if (account.userId != userId) {
            throw ApiException(ErrorCode.FORBIDDEN, "无权访问此账户")
        }

        val oldBalance = account.balance
        val difference = newBalance.subtract(oldBalance)

        // 更新账户余额
        val updatedAccount = FundAccount(
            id = account.id,
            userId = account.userId,
            name = account.name,
            accountType = account.accountType,
            accountNumber = account.accountNumber,
            balance = newBalance,
            currency = account.currency,
            isDefault = account.isDefault,
            icon = account.icon,
            color = account.color,
            notes = account.notes,
            isActive = account.isActive,
            deleted = account.deleted,
            createdAt = account.createdAt,
            updatedAt = account.updatedAt
        )

        return accountRepository.save(updatedAccount)
    }

    /**
     * 更新指定货币的余额（支持多货币）
     */
    @Transactional
    fun updateBalanceByCurrency(userId: Long, accountId: Long, currency: String, newBalance: BigDecimal, reason: String? = null): FundAccount {
        val account = accountRepository.findByIdOrNull(accountId)
            ?: throw ApiException(ErrorCode.NOT_FOUND, "账户不存在")

        if (account.userId != userId) {
            throw ApiException(ErrorCode.FORBIDDEN, "无权访问此账户")
        }

        // 找到对应的余额记录
        val balance = accountBalanceRepository.findByAccountIdAndCurrency(accountId, currency)
            ?: throw ApiException(ErrorCode.NOT_FOUND, "该账户没有${currency}货币余额")

        // 计算余额变化
        val oldBalance = balance.balance
        val balanceChange = newBalance.subtract(oldBalance)

        // 如果余额有变化，创建交易记录和复式记账记录
        if (balanceChange.compareTo(BigDecimal.ZERO) != 0) {
            val isIncrease = balanceChange.compareTo(BigDecimal.ZERO) > 0
            val amount = balanceChange.abs()

            // 创建交易记录（类型为 adjustment）
            // 注意：adjustment 类型的交易不使用 fromAccountId/toAccountId 指向系统账户
            // 系统账户信息记录在 postings 表中
            val transaction = Transaction(
                userId = userId,
                type = "adjustment",
                amount = amount,
                currency = currency,
                fromAccountId = null,  // adjustment 不使用用户账户作为来源
                toAccountId = accountId,  // 目标是用户账户
                transactionDate = LocalDateTime.now(),
                adjustmentType = if (isIncrease) "deposit" else "withdraw",
                adjustmentReason = reason,
                notes = reason,  // 不提供默认备注
                isActive = true
            )
            val savedTransaction = transactionRepository.save(transaction)

            // 创建复式记账记录
            postingService.createAdjustmentPostings(
                transactionId = savedTransaction.id!!,
                accountId = accountId,
                amount = amount,
                isIncrease = isIncrease
            )
        }

        // 更新余额
        balance.balance = newBalance
        accountBalanceRepository.save(balance)

        // 如果是主货币，同步更新account表的balance字段
        if (currency == account.currency) {
            val updatedAccount = FundAccount(
                id = account.id,
                userId = account.userId,
                name = account.name,
                accountType = account.accountType,
                accountNumber = account.accountNumber,
                balance = newBalance,
                currency = account.currency,
                isDefault = account.isDefault,
                icon = account.icon,
                color = account.color,
                notes = account.notes,
                isActive = account.isActive,
                deleted = account.deleted,
                institutionName = account.institutionName,
                createdAt = account.createdAt,
                updatedAt = account.updatedAt
            )
            return accountRepository.save(updatedAccount)
        }

        return account
    }
}
