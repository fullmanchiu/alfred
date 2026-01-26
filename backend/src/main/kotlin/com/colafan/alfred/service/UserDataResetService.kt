package com.colafan.alfred.service

import com.colafan.alfred.repository.TransactionRepository
import com.colafan.alfred.repository.BudgetRepository
import com.colafan.alfred.repository.CategoryRepository
import org.slf4j.LoggerFactory
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional

@Service
class UserDataResetService(
    private val transactionRepository: TransactionRepository,
    private val budgetRepository: BudgetRepository,
    private val categoryRepository: CategoryRepository,
    private val categoryService: CategoryService
) {
    private val logger = LoggerFactory.getLogger(UserDataResetService::class.java)

    @Transactional
    fun resetUserData(userId: Long): Map<String, Int> {
        logger.info("开始重置用户数据，用户ID: {}", userId)

        // 1. 物理删除所有交易记录
        val transactions = transactionRepository.findByUserIdAndIsActiveTrueOrderByTransactionDateDesc(userId)
        transactions.forEach { transaction ->
            transactionRepository.deleteById(transaction.id!!)
        }
        val deletedTransactionsCount = transactions.size

        // 2. 物理删除所有预算
        val budgets = budgetRepository.findByUserIdAndIsActiveTrueOrderByCreatedAtDesc(userId)
        budgets.forEach { budget ->
            budgetRepository.deleteById(budget.id!!)
        }
        val deletedBudgetsCount = budgets.size

        // 3. 物理删除所有分类
        val categories = categoryRepository.findByUserIdAndIsActiveTrueOrderByTypeAscSortOrderAscNameAsc(userId)
        categories.forEach { category ->
            categoryRepository.deleteById(category.id!!)
        }
        val deletedCategoriesCount = categories.size

        // 4. 初始化默认分类
        val newCategories = categoryService.initDefaultCategories(userId)

        logger.info("用户数据重置完成 - 删除交易: {}, 删除预算: {}, 删除分类: {}, 初始化分类: {}",
            deletedTransactionsCount, deletedBudgetsCount, deletedCategoriesCount, newCategories.size)

        return mapOf(
            "deletedTransactions" to deletedTransactionsCount,
            "deletedBudgets" to deletedBudgetsCount,
            "deletedCategories" to deletedCategoriesCount,
            "initializedCategories" to newCategories.size
        )
    }

    /**
     * 恢复用户被软删除的系统分类
     * 将 is_active=false 的系统分类恢复为 is_active=true
     */
    @Transactional
    fun restoreSystemCategories(userId: Long): Int {
        logger.info("开始恢复用户的系统分类，用户ID: {}", userId)

        // 获取用户所有分类（包括软删除的）
        val allCategories = categoryRepository.findByUserId(userId)

        // 找出被软删除的系统分类
        val inactiveSystemCategories = allCategories.filter {
            !it.isActive && it.isSystem
        }

        logger.info("找到 {} 个被软删除的系统分类", inactiveSystemCategories.size)

        if (inactiveSystemCategories.isEmpty()) {
            logger.info("没有需要恢复的分类")
            return 0
        }

        // 使用批量更新恢复这些分类
        categoryRepository.reactivateSystemCategories(userId, true)

        logger.info("成功恢复 {} 个系统分类", inactiveSystemCategories.size)

        return inactiveSystemCategories.size
    }
}
