package com.colafan.alfred.service

import com.colafan.alfred.dto.response.RecentActivityResponse
import com.colafan.alfred.entity.Activity
import com.colafan.alfred.entity.FundAccount
import com.colafan.alfred.entity.Category
import com.colafan.alfred.entity.HealthProfile
import com.colafan.alfred.entity.Transaction
import com.colafan.alfred.repository.ActivityRepository
import com.colafan.alfred.repository.FundAccountRepository
import com.colafan.alfred.repository.CategoryRepository
import com.colafan.alfred.repository.HealthProfileRepository
import com.colafan.alfred.repository.TransactionRepository
import org.springframework.data.domain.PageRequest
import org.springframework.stereotype.Service
import org.springframework.data.repository.findByIdOrNull
import java.time.LocalDateTime

/**
 * 活动聚合服务
 * 整合交易、运动、健康等多种活动数据
 */
@Service
class ActivityAggregatorService(
    private val transactionRepository: TransactionRepository,
    private val activityRepository: ActivityRepository,
    private val healthProfileRepository: HealthProfileRepository,
    private val categoryRepository: CategoryRepository,
    private val accountRepository: FundAccountRepository
) {

    /**
     * 获取最近的活动列表
     * @param userId 用户ID
     * @param limit 返回数量限制，默认20
     * @return 按时间倒序排列的活动列表
     */
    fun getRecentActivities(userId: Long, limit: Int = 20): List<RecentActivityResponse> {
        val activities = mutableListOf<RecentActivityResponse>()

        // 1. 获取最近的交易记录（最近10条）
        val recentTransactions = transactionRepository
            .findByUserIdAndIsActiveTrueOrderByTransactionDateDesc(userId)
            .take(10)

        // 2. 获取分类信息并转换
        val categoryIds = recentTransactions.mapNotNull { it.categoryId }.toSet()
        val categories: Map<Long, Category> = if (categoryIds.isNotEmpty()) {
            categoryRepository.findAllById(categoryIds).associateBy { it.id!! }
        } else {
            emptyMap()
        }

        // 3. 获取账户信息并转换
        val accountIds = recentTransactions
            .map { if (it.type == "expense") it.fromAccountId else it.toAccountId }
            .filterNotNull()
            .toSet()
        val accounts: Map<Long, FundAccount> = if (accountIds.isNotEmpty()) {
            accountRepository.findAllById(accountIds).associateBy { it.id!! }
        } else {
            emptyMap()
        }

        recentTransactions.forEach { transaction ->
            val category = transaction.categoryId?.let { categories[it] }
            val categoryName = category?.name
            val categoryIcon = category?.icon
            val categoryColor = category?.color  // 获取分类颜色
            val accountId = if (transaction.type == "expense") transaction.fromAccountId else transaction.toAccountId
            val account = accountId?.let { accounts[it] }
            val accountName = account?.name
            val institutionName = account?.institutionName
            val currency = transaction.currency ?: "CNY"
            activities.add(RecentActivityResponse.fromTransaction(
                transaction,
                categoryName,
                categoryIcon,
                categoryColor,
                accountName,
                institutionName,
                currency
            ))
        }

        // 3. 获取最近的运动记录（最近10条）
        val recentActivities = activityRepository
            .findByUserIdOrderByCreatedAtDesc(userId, PageRequest.of(0, 10))
            .content

        recentActivities.forEach { activity ->
            activities.add(RecentActivityResponse.fromActivity(activity))
        }

        // 4. 获取最近的健康记录（最近5条）
        val recentHealthProfiles = healthProfileRepository
            .findAllByUserIdOrderByCreatedAtDesc(userId)
            .take(5)

        recentHealthProfiles.forEach { profile ->
            activities.add(RecentActivityResponse.fromHealthProfile(profile))
        }

        // 5. 按时间戳倒序排序并限制数量
        return activities
            .sortedByDescending { it.timestamp }
            .take(limit)
    }
}
