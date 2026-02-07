package com.colafan.alfred.service

import com.colafan.alfred.entity.Transaction
import com.colafan.alfred.exception.ApiException
import com.colafan.alfred.exception.ErrorCode
import com.colafan.alfred.repository.TransactionRepository
import com.colafan.alfred.repository.CategoryRepository
import com.colafan.alfred.dto.response.TransactionResponse
import com.colafan.alfred.util.IconMapper
import org.springframework.data.repository.findByIdOrNull
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.math.BigDecimal
import java.time.LocalDateTime

@Service
class TransactionService(
    private val transactionRepository: TransactionRepository,
    private val accountService: FundAccountService,
    private val categoryRepository: CategoryRepository
) {

    fun getTransactionsByUserId(userId: Long): List<Transaction> {
        return transactionRepository.findByUserIdAndIsActiveTrueOrderByTransactionDateDesc(userId)
    }

    /**
     * 获取用户的交易列表（包含显示信息）
     */
    fun getTransactionsWithDisplayInfo(userId: Long): List<TransactionResponse> {
        val transactions = transactionRepository.findByUserIdAndIsActiveTrueOrderByTransactionDateDesc(userId)

        // 批量查询所有分类
        val categoryIds = transactions.mapNotNull { it.categoryId }.toSet()
        val categories = if (categoryIds.isNotEmpty()) {
            categoryRepository.findAllById(categoryIds).associateBy { it.id }
        } else {
            emptyMap()
        }

        // 转换为响应并填充显示信息
        return transactions.map { transaction ->
            toDisplayResponse(transaction, categories[transaction.categoryId])
        }
    }

    /**
     * 将 Transaction 转换为包含显示信息的 Response
     */
    private fun toDisplayResponse(transaction: Transaction, category: com.colafan.alfred.entity.Category?): TransactionResponse {
        // 判断是否为流入
        val isInflow = transaction.toAccountId != null

        // 获取显示信息
        val displayIcon: String
        val displayColor: String
        val displayName: String
        val categoryName: String?

        if (category != null && (transaction.type == "income" || transaction.type == "expense")) {
            // 使用分类信息（数据库中的 icon 字段已经是 Material Icon 名称）
            displayIcon = category.icon!!
            displayColor = category.color!!
            displayName = category.name
            categoryName = category.name
        } else {
            // 使用交易类型信息
            displayIcon = IconMapper.getTransactionTypeIcon(transaction.type, isInflow)
            displayColor = IconMapper.getTransactionTypeColor(transaction.type, isInflow)
            displayName = IconMapper.getTransactionTypeDisplayName(transaction.type, isInflow)
            categoryName = null
        }

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
            displayIcon = displayIcon,
            displayColor = displayColor,
            displayName = displayName,
            categoryName = categoryName
        )
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

        if (!transaction.isActive) {
            throw ApiException(ErrorCode.NOT_FOUND, "交易记录不存在")
        }

        return transaction
    }

    @Transactional
    fun createTransaction(userId: Long, transaction: Transaction): Transaction {
        val toAccountId = transaction.toAccountId
        val fromAccountId = transaction.fromAccountId
        val currency = transaction.currency

        // 验证交易类型和账户
        when (transaction.type) {
            "income" -> {
                if (toAccountId == null) {
                    throw ApiException(ErrorCode.BAD_REQUEST, "收入交易必须指定转入账户")
                }
                // 增加转入账户余额
                accountService.updateAccountBalance(toAccountId, transaction.amount, currency)
            }

            "expense" -> {
                if (fromAccountId == null) {
                    throw ApiException(ErrorCode.BAD_REQUEST, "支出交易必须指定转出账户")
                }
                // 减少转出账户余额
                accountService.updateAccountBalance(fromAccountId, transaction.amount.negate(), currency)
            }

            "transfer" -> {
                if (fromAccountId == null || toAccountId == null) {
                    throw ApiException(ErrorCode.BAD_REQUEST, "转账交易必须指定转出和转入账户")
                }
                if (fromAccountId == toAccountId) {
                    throw ApiException(ErrorCode.BAD_REQUEST, "转出和转入账户不能相同")
                }
                // 减少转出账户余额
                accountService.updateAccountBalance(fromAccountId, transaction.amount.negate(), currency)
                // 增加转入账户余额
                accountService.updateAccountBalance(toAccountId, transaction.amount, currency)
            }

            "loan_in" -> {
                if (toAccountId == null) {
                    throw ApiException(ErrorCode.BAD_REQUEST, "借入交易必须指定转入账户")
                }
                // 增加转入账户余额
                accountService.updateAccountBalance(toAccountId, transaction.amount, currency)
            }

            "loan_out" -> {
                if (fromAccountId == null) {
                    throw ApiException(ErrorCode.BAD_REQUEST, "借出交易必须指定转出账户")
                }
                // 减少转出账户余额
                accountService.updateAccountBalance(fromAccountId, transaction.amount.negate(), currency)
            }

            "repayment" -> {
                if (fromAccountId == null) {
                    throw ApiException(ErrorCode.BAD_REQUEST, "还款交易必须指定转出账户")
                }
                // 减少转出账户余额
                accountService.updateAccountBalance(fromAccountId, transaction.amount.negate(), currency)
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

        // 1. 回退原始交易对账户余额的影响（使用原始币种）
        val originalCurrency = existingTransaction.currency
        when (existingTransaction.type) {
            "income" -> {
                existingTransaction.toAccountId?.let {
                    accountService.updateAccountBalance(it, existingTransaction.amount.negate(), originalCurrency)
                }
            }
            "expense" -> {
                existingTransaction.fromAccountId?.let {
                    accountService.updateAccountBalance(it, existingTransaction.amount, originalCurrency)
                }
            }
            "transfer" -> {
                existingTransaction.fromAccountId?.let {
                    accountService.updateAccountBalance(it, existingTransaction.amount, originalCurrency)
                }
                existingTransaction.toAccountId?.let {
                    accountService.updateAccountBalance(it, existingTransaction.amount.negate(), originalCurrency)
                }
            }
            "loan_in" -> {
                existingTransaction.toAccountId?.let {
                    accountService.updateAccountBalance(it, existingTransaction.amount.negate(), originalCurrency)
                }
            }
            "loan_out" -> {
                existingTransaction.fromAccountId?.let {
                    accountService.updateAccountBalance(it, existingTransaction.amount, originalCurrency)
                }
            }
            "repayment" -> {
                existingTransaction.fromAccountId?.let {
                    accountService.updateAccountBalance(it, existingTransaction.amount, originalCurrency)
                }
            }
        }

        // 2. 应用新交易对账户余额的影响（使用新币种）
        val newCurrency = updatedTransaction.currency
        when (updatedTransaction.type) {
            "income" -> {
                val toAccountId = updatedTransaction.toAccountId
                if (toAccountId == null) {
                    throw ApiException(ErrorCode.BAD_REQUEST, "收入交易必须指定转入账户")
                }
                accountService.updateAccountBalance(toAccountId, updatedTransaction.amount, newCurrency)
            }
            "expense" -> {
                val fromAccountId = updatedTransaction.fromAccountId
                if (fromAccountId == null) {
                    throw ApiException(ErrorCode.BAD_REQUEST, "支出交易必须指定转出账户")
                }
                accountService.updateAccountBalance(fromAccountId, updatedTransaction.amount.negate(), newCurrency)
            }
            "transfer" -> {
                val fromAccountId = updatedTransaction.fromAccountId
                val toAccountId = updatedTransaction.toAccountId
                if (fromAccountId == null || toAccountId == null) {
                    throw ApiException(ErrorCode.BAD_REQUEST, "转账交易必须指定转出和转入账户")
                }
                if (fromAccountId == toAccountId) {
                    throw ApiException(ErrorCode.BAD_REQUEST, "转出和转入账户不能相同")
                }
                accountService.updateAccountBalance(fromAccountId, updatedTransaction.amount.negate(), newCurrency)
                accountService.updateAccountBalance(toAccountId, updatedTransaction.amount, newCurrency)
            }
            "loan_in" -> {
                val toAccountId = updatedTransaction.toAccountId
                if (toAccountId == null) {
                    throw ApiException(ErrorCode.BAD_REQUEST, "借入交易必须指定转入账户")
                }
                accountService.updateAccountBalance(toAccountId, updatedTransaction.amount, newCurrency)
            }
            "loan_out" -> {
                val fromAccountId = updatedTransaction.fromAccountId
                if (fromAccountId == null) {
                    throw ApiException(ErrorCode.BAD_REQUEST, "借出交易必须指定转出账户")
                }
                accountService.updateAccountBalance(fromAccountId, updatedTransaction.amount.negate(), newCurrency)
            }
            "repayment" -> {
                val fromAccountId = updatedTransaction.fromAccountId
                if (fromAccountId == null) {
                    throw ApiException(ErrorCode.BAD_REQUEST, "还款交易必须指定转出账户")
                }
                accountService.updateAccountBalance(fromAccountId, updatedTransaction.amount.negate(), newCurrency)
            }
            else -> {
                throw ApiException(ErrorCode.BAD_REQUEST, "无效的交易类型")
            }
        }

        // 3. 保存更新后的交易
        val transactionToUpdate = existingTransaction.copy(
            type = updatedTransaction.type,
            amount = updatedTransaction.amount,
            currency = updatedTransaction.currency,
            fromAccountId = updatedTransaction.fromAccountId,
            toAccountId = updatedTransaction.toAccountId,
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
