package com.colafan.alfred.service

import com.colafan.alfred.dto.response.BudgetUsageResponse
import com.colafan.alfred.entity.Budget
import com.colafan.alfred.entity.Category
import com.colafan.alfred.entity.Transaction
import com.colafan.alfred.exception.ApiException
import com.colafan.alfred.exception.ErrorCode
import com.colafan.alfred.repository.BudgetRepository
import com.colafan.alfred.repository.CategoryRepository
import com.colafan.alfred.repository.TransactionRepository
import org.springframework.data.repository.findByIdOrNull
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.math.BigDecimal

@Service
class BudgetService(
    private val budgetRepository: BudgetRepository,
    private val transactionRepository: TransactionRepository,
    private val categoryRepository: CategoryRepository
) {

    fun getBudgetsByUserId(userId: Long): List<Budget> {
        return budgetRepository.findByUserIdAndIsActiveTrueOrderByCreatedAtDesc(userId)
    }

    fun getBudgetById(userId: Long, budgetId: Long): Budget {
        val budget = budgetRepository.findByIdOrNull(budgetId)
            ?: throw ApiException(ErrorCode.NOT_FOUND, "预算不存在")

        if (budget.userId != userId) {
            throw ApiException(ErrorCode.FORBIDDEN, "无权访问此预算")
        }

        return budget
    }

    fun getBudgetByCategory(userId: Long, categoryId: Long): Budget? {
        return budgetRepository.findByUserIdAndCategoryIdAndIsActiveTrue(userId, categoryId)
    }

    @Transactional
    fun createBudget(userId: Long, budget: Budget): Budget {
        // 检查是否已存在该分类的预算
        val existingBudget = budgetRepository.findByUserIdAndCategoryIdAndIsActiveTrue(
            userId,
            budget.categoryId
        )

        if (existingBudget != null) {
            throw ApiException(ErrorCode.CONFLICT, "该分类已有预算设置")
        }

        val newBudget = budget.copy(
            userId = userId,
            isActive = true
        )

        return budgetRepository.save(newBudget)
    }

    @Transactional
    fun updateBudget(userId: Long, budgetId: Long, updatedBudget: Budget): Budget {
        val existingBudget = getBudgetById(userId, budgetId)

        val budgetToUpdate = existingBudget.copy(
            amount = updatedBudget.amount,
            period = updatedBudget.period,
            alertThreshold = updatedBudget.alertThreshold,
            startDate = updatedBudget.startDate,
            endDate = updatedBudget.endDate
        )

        return budgetRepository.save(budgetToUpdate)
    }

    @Transactional
    fun deleteBudget(userId: Long, budgetId: Long) {
        val budget = getBudgetById(userId, budgetId)

        // 先物理删除相同 (user_id, category_id) 的已软删除记录，避免唯一约束冲突
        val inactiveBudgets = budgetRepository.findByUserIdAndCategoryId(userId, budget.categoryId)
            .filter { !it.isActive }
        if (inactiveBudgets.isNotEmpty()) {
            inactiveBudgets.forEach { budgetRepository.delete(it) }
            budgetRepository.flush()  // 立即生效
        }

        // 软删除当前预算
        val budgetToDelete = budget.copy(isActive = false)
        budgetRepository.save(budgetToDelete)
    }

    fun getBudgetCount(userId: Long): Long {
        return budgetRepository.countByUserId(userId)
    }

    /**
     * 获取预算使用情况
     * 计算每个预算的实际使用金额和百分比
     */
    fun getBudgetUsage(userId: Long): List<BudgetUsageResponse> {
        val budgets = getBudgetsByUserId(userId)

        return budgets.map { budget ->
            // 获取分类信息
            val category: Category? = categoryRepository.findByIdOrNull(budget.categoryId)

            // 使用局部变量避免智能转换问题
            val startDate = budget.startDate
            val endDate = budget.endDate

            // 查询该分类下在预算时间范围内的所有支出交易
            val transactions: List<Transaction> = if (endDate != null) {
                transactionRepository.findByUserIdAndCategoryIdAndTransactionDateBetweenAndIsActiveTrueOrderByTransactionDateDesc(
                    userId = userId,
                    categoryId = budget.categoryId,
                    startDate = startDate,
                    endDate = endDate
                )
            } else {
                // 如果没有设置结束日期，查询该分类下的所有支出
                transactionRepository.findByUserIdAndCategoryIdAndIsActiveTrueOrderByTransactionDateDesc(
                    userId = userId,
                    categoryId = budget.categoryId
                ).filter { it.type == "expense" }
            }

            // 计算已使用金额（只计算支出）
            val usedAmount = transactions
                .filter { it.type == "expense" }
                .fold(BigDecimal.ZERO) { acc, transaction ->
                    acc.add(transaction.amount)
                }

            val categoryName = category?.name

            BudgetUsageResponse.fromEntity(budget, categoryName, usedAmount)
        }
    }
}
