package com.colafan.alfred.dto.response

import com.colafan.alfred.entity.Activity
import com.colafan.alfred.entity.HealthProfile
import com.colafan.alfred.entity.Transaction
import java.math.BigDecimal
import java.time.format.DateTimeFormatter

/**
 * 最近活动响应
 * 返回原始数据，不做任何文本组装
 */
data class RecentActivityResponse(
    val id: Long,
    val transactionType: String? = null,  // income, expense, transfer, loan_in, loan_out, repayment
    val categoryName: String? = null,
    val categoryIcon: String? = null,  // 分类图标（hex代码或Material Icon名称）
    val accountName: String? = null,  // 账户名称
    val institutionName: String? = null,  // 金融机构名称
    val currency: String? = null,  // 币种
    val amount: BigDecimal? = null,
    val notes: String? = null,
    val activityType: String? = null,  // running, cycling, swimming, walking
    val activityName: String? = null,
    val distance: Int? = null,
    val duration: Int? = null,
    val weight: Float? = null,
    val timestamp: String,
    val isBalanceAdjustment: Boolean = false
) {
    companion object {
        private val formatter = DateTimeFormatter.ofPattern("yyyy-MM-dd'T'HH:mm:ss")

        fun fromTransaction(
            transaction: Transaction,
            categoryName: String? = null,
            categoryIcon: String? = null,
            accountName: String? = null,
            institutionName: String? = null,
            currency: String? = null
        ): RecentActivityResponse {
            return RecentActivityResponse(
                id = transaction.id!!,
                transactionType = transaction.type,
                categoryName = categoryName,
                categoryIcon = categoryIcon,
                accountName = accountName,
                institutionName = institutionName,
                currency = currency,
                amount = transaction.amount,
                notes = transaction.notes,
                // 使用 transactionDate 作为时间戳，反映实际交易日期而不是创建时间
                timestamp = transaction.transactionDate?.format(formatter) ?: (transaction.createdAt?.format(formatter) ?: ""),
                isBalanceAdjustment = transaction.categoryId == null
            )
        }

        fun fromActivity(activity: Activity): RecentActivityResponse {
            return RecentActivityResponse(
                id = activity.id!!,
                activityType = activity.type,
                activityName = activity.name,
                distance = activity.distance,
                duration = activity.duration,
                timestamp = activity.createdAt?.format(formatter) ?: ""
            )
        }

        fun fromHealthProfile(profile: HealthProfile): RecentActivityResponse {
            return RecentActivityResponse(
                id = profile.id!!,
                weight = profile.weight,
                timestamp = profile.createdAt?.format(formatter) ?: ""
            )
        }
    }
}
