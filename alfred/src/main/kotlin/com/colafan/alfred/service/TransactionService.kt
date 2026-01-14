package com.colafan.alfred.service

import com.colafan.alfred.entity.Transaction
import com.colafan.alfred.exception.ApiException
import com.colafan.alfred.exception.ErrorCode
import com.colafan.alfred.repository.TransactionRepository
import org.springframework.data.repository.findByIdOrNull
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.math.BigDecimal
import java.time.LocalDateTime

@Service
class TransactionService(
    private val transactionRepository: TransactionRepository,
    private val accountService: AccountService
) {

    fun getTransactionsByUserId(userId: Long): List<Transaction> {
        return transactionRepository.findByUserIdAndIsActiveTrueOrderByTransactionDateDesc(userId)
    }

    fun getTransactionsByType(userId: Long, type: String): List<Transaction> {
        return transactionRepository.findByUserIdAndTypeAndIsActiveTrueOrderByTransactionDateDesc(userId, type)
    }

    fun getTransactionsByDateRange(
        userId: Long,
        startDate: LocalDateTime,
        endDate: LocalDateTime
    ): List<Transaction> {
        return transactionRepository.findByUserIdAndTransactionDateBetweenAndIsActiveTrueOrderByTransactionDateDesc(
            userId,
            startDate,
            endDate
        )
    }

    fun getTransactionById(userId: Long, transactionId: Long): Transaction {
        val transaction = transactionRepository.findByIdOrNull(transactionId)
            ?: throw ApiException(ErrorCode.NOT_FOUND, "交易记录不存在")

        if (transaction.userId != userId) {
            throw ApiException(ErrorCode.FORBIDDEN, "无权访问此交易记录")
        }

        return transaction
    }

    @Transactional
    fun createTransaction(userId: Long, transaction: Transaction): Transaction {
        val toAccountId = transaction.toAccountId
        val fromAccountId = transaction.fromAccountId

        // 验证交易类型和账户
        when (transaction.type) {
            "income" -> {
                if (toAccountId == null) {
                    throw ApiException(ErrorCode.BAD_REQUEST, "收入交易必须指定转入账户")
                }
                // 增加转入账户余额
                accountService.updateAccountBalance(toAccountId, transaction.amount)
            }

            "expense" -> {
                if (fromAccountId == null) {
                    throw ApiException(ErrorCode.BAD_REQUEST, "支出交易必须指定转出账户")
                }
                // 减少转出账户余额
                accountService.updateAccountBalance(fromAccountId, transaction.amount.negate())
            }

            "transfer" -> {
                if (fromAccountId == null || toAccountId == null) {
                    throw ApiException(ErrorCode.BAD_REQUEST, "转账交易必须指定转出和转入账户")
                }
                if (fromAccountId == toAccountId) {
                    throw ApiException(ErrorCode.BAD_REQUEST, "转出和转入账户不能相同")
                }
                // 减少转出账户余额
                accountService.updateAccountBalance(fromAccountId, transaction.amount.negate())
                // 增加转入账户余额
                accountService.updateAccountBalance(toAccountId, transaction.amount)
            }

            "loan_in" -> {
                if (toAccountId == null) {
                    throw ApiException(ErrorCode.BAD_REQUEST, "借入交易必须指定转入账户")
                }
                // 增加转入账户余额
                accountService.updateAccountBalance(toAccountId, transaction.amount)
            }

            "loan_out" -> {
                if (fromAccountId == null) {
                    throw ApiException(ErrorCode.BAD_REQUEST, "借出交易必须指定转出账户")
                }
                // 减少转出账户余额
                accountService.updateAccountBalance(fromAccountId, transaction.amount.negate())
            }

            "repayment" -> {
                if (fromAccountId == null) {
                    throw ApiException(ErrorCode.BAD_REQUEST, "还款交易必须指定转出账户")
                }
                // 减少转出账户余额
                accountService.updateAccountBalance(fromAccountId, transaction.amount.negate())
            }

            else -> {
                throw ApiException(ErrorCode.BAD_REQUEST, "无效的交易类型")
            }
        }

        val newTransaction = Transaction(
            userId = userId,
            type = transaction.type,
            amount = transaction.amount,
            fromAccountId = transaction.fromAccountId,
            toAccountId = transaction.toAccountId,
            categoryId = transaction.categoryId,
            transactionDate = transaction.transactionDate,
            notes = transaction.notes,
            location = transaction.location,
            tags = transaction.tags,
            imageCount = transaction.imageCount,
            isActive = true
        )

        return transactionRepository.save(newTransaction)
    }

    @Transactional
    fun updateTransaction(userId: Long, transactionId: Long, updatedTransaction: Transaction): Transaction {
        val existingTransaction = getTransactionById(userId, transactionId)

        val transactionToUpdate = existingTransaction.copy(
            amount = updatedTransaction.amount,
            categoryId = updatedTransaction.categoryId,
            transactionDate = updatedTransaction.transactionDate,
            notes = updatedTransaction.notes,
            location = updatedTransaction.location,
            tags = updatedTransaction.tags
        )

        return transactionRepository.save(transactionToUpdate)
    }

    @Transactional
    fun deleteTransaction(userId: Long, transactionId: Long) {
        val transaction = getTransactionById(userId, transactionId)

        // 软删除
        val transactionToDelete = transaction.copy(isActive = false)
        transactionRepository.save(transactionToDelete)
    }

    fun getTransactionCount(userId: Long): Long {
        return transactionRepository.countByUserId(userId)
    }
}
