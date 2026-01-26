package com.colafan.alfred.service

import com.colafan.alfred.entity.Account
import com.colafan.alfred.exception.ApiException
import com.colafan.alfred.exception.ErrorCode
import com.colafan.alfred.repository.AccountRepository
import org.springframework.data.repository.findByIdOrNull
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.math.BigDecimal

@Service
class AccountService(
    private val accountRepository: AccountRepository
) {

    fun getAccountsByUserId(userId: Long): List<Account> {
        return accountRepository.findByUserIdAndIsActiveTrueOrderByCreatedAtDesc(userId)
    }

    fun getAccountById(userId: Long, accountId: Long): Account {
        val account = accountRepository.findByIdOrNull(accountId)
            ?: throw ApiException(ErrorCode.NOT_FOUND, "账户不存在")

        if (account.userId != userId) {
            throw ApiException(ErrorCode.FORBIDDEN, "无权访问此账户")
        }

        return account
    }

    fun getTotalBalance(userId: Long): BigDecimal {
        return accountRepository.findByUserIdAndIsActiveTrueOrderByCreatedAtDesc(userId)
            .map { it.balance }
            .fold(BigDecimal.ZERO) { acc, balance -> acc.add(balance) }
    }

    @Transactional
    fun createAccount(userId: Long, account: Account): Account {
        val newAccount = Account(
            userId = userId,
            name = account.name,
            accountType = account.accountType,
            accountNumber = account.accountNumber,
            balance = account.balance,
            currency = account.currency,
            isDefault = account.isDefault,
            icon = account.icon,
            color = account.color,
            notes = account.notes,
            isActive = true
        )

        return accountRepository.save(newAccount)
    }

    @Transactional
    fun updateAccount(userId: Long, accountId: Long, updatedAccount: Account): Account {
        val existingAccount = getAccountById(userId, accountId)

        val accountToUpdate = Account(
            id = existingAccount.id,
            userId = existingAccount.userId,
            name = updatedAccount.name,
            accountType = updatedAccount.accountType,
            accountNumber = updatedAccount.accountNumber,
            balance = existingAccount.balance,
            currency = updatedAccount.currency,
            isDefault = updatedAccount.isDefault,
            icon = updatedAccount.icon,
            color = updatedAccount.color,
            notes = updatedAccount.notes,
            isActive = existingAccount.isActive,
            createdAt = existingAccount.createdAt,
            updatedAt = existingAccount.updatedAt
        )

        return accountRepository.save(accountToUpdate)
    }

    @Transactional
    fun deleteAccount(userId: Long, accountId: Long) {
        val account = getAccountById(userId, accountId)

        val accountToDelete = Account(
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
            isActive = false,
            createdAt = account.createdAt,
            updatedAt = account.updatedAt
        )

        accountRepository.save(accountToDelete)
    }

    @Transactional
    fun updateAccountBalance(accountId: Long, amount: BigDecimal) {
        val account = accountRepository.findByIdOrNull(accountId)
            ?: throw ApiException(ErrorCode.NOT_FOUND, "账户不存在")

        val updatedAccount = Account(
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
            createdAt = account.createdAt,
            updatedAt = account.updatedAt
        )

        accountRepository.save(updatedAccount)
    }

    @Transactional
    fun adjustBalance(userId: Long, accountId: Long, newBalance: BigDecimal, reason: String): Account {
        val account = accountRepository.findByIdOrNull(accountId)
            ?: throw ApiException(ErrorCode.NOT_FOUND, "账户不存在")

        if (account.userId != userId) {
            throw ApiException(ErrorCode.FORBIDDEN, "无权访问此账户")
        }

        val oldBalance = account.balance
        val difference = newBalance.subtract(oldBalance)

        // 更新账户余额
        val updatedAccount = Account(
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
            createdAt = account.createdAt,
            updatedAt = account.updatedAt
        )

        return accountRepository.save(updatedAccount)
    }
}
