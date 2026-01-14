package com.colafan.alfred.service

import com.colafan.alfred.entity.Budget
import com.colafan.alfred.exception.ApiException
import com.colafan.alfred.exception.ErrorCode
import com.colafan.alfred.repository.BudgetRepository
import org.springframework.data.repository.findByIdOrNull
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional

@Service
class BudgetService(
    private val budgetRepository: BudgetRepository
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

        // 软删除
        val budgetToDelete = budget.copy(isActive = false)
        budgetRepository.save(budgetToDelete)
    }

    fun getBudgetCount(userId: Long): Long {
        return budgetRepository.countByUserId(userId)
    }
}
