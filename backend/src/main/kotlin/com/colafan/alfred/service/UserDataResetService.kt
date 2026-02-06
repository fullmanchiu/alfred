package com.colafan.alfred.service

import com.colafan.alfred.entity.Account
import com.colafan.alfred.entity.AccountBalance
import com.colafan.alfred.repository.AccountBalanceRepository
import com.colafan.alfred.repository.AccountRepository
import com.colafan.alfred.repository.TransactionRepository
import com.colafan.alfred.repository.BudgetRepository
import com.colafan.alfred.repository.CategoryRepository
import com.colafan.alfred.repository.HealthProfileRepository
import com.colafan.alfred.repository.ActivityRepository
import com.colafan.alfred.repository.UserStockRepository
import com.colafan.alfred.repository.InstitutionRepository
import com.colafan.alfred.repository.AccountGroupRepository
import com.colafan.alfred.repository.CurrencyAccountRepository
import org.slf4j.LoggerFactory
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.math.BigDecimal

@Service
class UserDataResetService(
    private val transactionRepository: TransactionRepository,
    private val budgetRepository: BudgetRepository,
    private val categoryRepository: CategoryRepository,
    private val accountRepository: AccountRepository,
    private val accountBalanceRepository: AccountBalanceRepository,
    private val categoryService: CategoryService,
    private val healthProfileRepository: HealthProfileRepository,
    private val activityRepository: ActivityRepository,
    private val userStockRepository: UserStockRepository,
    private val institutionRepository: InstitutionRepository,
    private val accountGroupRepository: AccountGroupRepository,
    private val currencyAccountRepository: CurrencyAccountRepository
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

        // 4. 删除所有账户及其余额
        val allAccounts = accountRepository.findByUserId(userId)
        allAccounts.forEach { account ->
            // 先删除关联的余额
            accountBalanceRepository.deleteByAccountId(account.id!!)
            // 再删除账户
            accountRepository.deleteById(account.id!!)
        }
        val deletedAccountsCount = allAccounts.size

        // 5. 删除健康档案
        val healthProfiles = healthProfileRepository.findByUserId(userId)
        healthProfiles.forEach { profile ->
            healthProfileRepository.deleteById(profile.id!!)
        }
        val deletedHealthProfilesCount = healthProfiles.size

        // 6. 删除运动记录（activity_points和activity_laps会通过ON DELETE CASCADE自动删除）
        val activities = activityRepository.findByUserId(userId)
        activities.forEach { activity ->
            activityRepository.deleteById(activity.id!!)
        }
        val deletedActivitiesCount = activities.size

        // 7. 删除股票自选
        val userStocks = userStockRepository.findByUserId(userId)
        userStocks.forEach { stock ->
            userStockRepository.deleteById(stock.id!!)
        }
        val deletedUserStocksCount = userStocks.size

        // 8. 删除废弃的多货币账户系统数据
        // 按顺序删除：currency_accounts -> account_groups -> institutions
        val currencyAccounts = currencyAccountRepository.findByUserId(userId)
        currencyAccounts.forEach { account ->
            currencyAccountRepository.deleteById(account.id!!)
        }
        val deletedCurrencyAccountsCount = currencyAccounts.size

        val accountGroups = accountGroupRepository.findByUserId(userId)
        accountGroups.forEach { group ->
            accountGroupRepository.deleteById(group.id!!)
        }
        val deletedAccountGroupsCount = accountGroups.size

        val institutions = institutionRepository.findByUserId(userId)
        institutions.forEach { institution ->
            institutionRepository.deleteById(institution.id!!)
        }
        val deletedInstitutionsCount = institutions.size

        // 9. 创建默认现金账户
        val defaultAccount = Account(
            name = "现金",
            userId = userId,
            accountType = "cash",
            balance = BigDecimal.valueOf(0.00),
            currency = "CNY",
            isDefault = true,
            icon = "account_balance_wallet",
            color = "#4CAF50",
            deleted = false
        )
        val savedAccount = accountRepository.save(defaultAccount)

        // 创建默认 CNY balance
        val defaultBalance = AccountBalance(
            accountId = savedAccount.id!!,
            currency = "CNY",
            balance = BigDecimal.valueOf(0.00)
        )
        accountBalanceRepository.save(defaultBalance)

        // 10. 初始化默认分类
        val newCategories = categoryService.initDefaultCategories(userId)

        logger.info("用户数据重置完成 - 删除交易: {}, 删除预算: {}, 删除分类: {}, 删除账户: {}, 删除健康档案: {}, 删除运动记录: {}, 删除股票自选: {}, 删除货币账户: {}, 删除账户组: {}, 删除机构: {}, 初始化分类: {}",
            deletedTransactionsCount, deletedBudgetsCount, deletedCategoriesCount, deletedAccountsCount,
            deletedHealthProfilesCount, deletedActivitiesCount, deletedUserStocksCount,
            deletedCurrencyAccountsCount, deletedAccountGroupsCount, deletedInstitutionsCount,
            newCategories.size)

        return mapOf(
            "deletedTransactions" to deletedTransactionsCount,
            "deletedBudgets" to deletedBudgetsCount,
            "deletedCategories" to deletedCategoriesCount,
            "deletedAccounts" to deletedAccountsCount,
            "deletedHealthProfiles" to deletedHealthProfilesCount,
            "deletedActivities" to deletedActivitiesCount,
            "deletedUserStocks" to deletedUserStocksCount,
            "deletedCurrencyAccounts" to deletedCurrencyAccountsCount,
            "deletedAccountGroups" to deletedAccountGroupsCount,
            "deletedInstitutions" to deletedInstitutionsCount,
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
