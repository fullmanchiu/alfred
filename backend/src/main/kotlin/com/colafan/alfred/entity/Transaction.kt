package com.colafan.alfred.entity

import com.fasterxml.jackson.annotation.JsonFormat
import com.fasterxml.jackson.annotation.JsonGetter
import jakarta.persistence.*
import java.math.BigDecimal
import java.time.LocalDateTime

/**
 * 交易记录（Transaction）
 *
 * 记录用户的所有财务交易，包括收入、支出、转账、余额校准等类型
 *
 * @property id 交易ID
 * @property userId 用户ID
 * @property type 交易类型：income/expense/transfer/loan_in/loan_out/repayment
 * @property amount 交易金额
 * @property currency 货币代码：CNY, HKD, USD, EUR, MOP
 * @property fromAccountId 转出账户ID（转账类型）
 * @property toAccountId 转入账户ID（转账类型）
 * @property categoryId 分类ID
 * @property transactionDate 交易日期
 * @property notes 备注说明
 * @property location 交易地点
 * @property tags 标签（JSON数组）
 * @property imageCount 图片数量
 * @property isActive 是否有效
 * @property adjustmentType 余额校准类型（仅当 type=adjustment 时有值）
 * @property adjustmentReason 余额校准原因说明
 * @property createdAt 创建时间
 * @property updatedAt 更新时间
 */
@Entity
@Table(name = "transactions")
data class Transaction(
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    val id: Long? = null,

    @Column(name = "user_id", nullable = false)
    val userId: Long,

    @Column(nullable = false, length = 20)
    val type: String, // income, expense, transfer, loan_in, loan_out, repayment

    @Column(nullable = false, precision = 10, scale = 2)
    val amount: BigDecimal,

    @Column(nullable = false, length = 3)
    val currency: String = "CNY",

    @Column(name = "from_account_id")
    val fromAccountId: Long? = null,

    @Column(name = "to_account_id")
    val toAccountId: Long? = null,

    @Column(name = "category_id")
    val categoryId: Long? = null,

    @Column(name = "transaction_date", nullable = false)
    @JsonFormat(pattern = "yyyy-MM-dd'T'HH:mm:ss")
    val transactionDate: LocalDateTime,

    @Column(columnDefinition = "TEXT")
    val notes: String? = null,

    @Column(length = 200)
    val location: String? = null,

    @Column(length = 100)
    val tags: String? = null, // JSON array stored as string

    @Column(name = "image_count")
    val imageCount: Int = 0,

    @Column(nullable = false)
    val isActive: Boolean = true,

    @Column(name = "adjustment_type", length = 20)
    val adjustmentType: String? = null, // 'adjustment' - 用于余额校准

    @Column(name = "adjustment_reason", columnDefinition = "TEXT")
    val adjustmentReason: String? = null, // 余额校准的原因说明

    @Column(name = "created_at", nullable = false, updatable = false)
    @JsonFormat(pattern = "yyyy-MM-dd'T'HH:mm:ss")
    var createdAt: LocalDateTime? = null,

    @Column(name = "updated_at")
    @JsonFormat(pattern = "yyyy-MM-dd'T'HH:mm:ss")
    var updatedAt: LocalDateTime? = null
) {
    @PrePersist
    fun prePersist() {
        val now = LocalDateTime.now()
        createdAt = now
        updatedAt = now
    }

    @PreUpdate
    fun preUpdate() {
        val now = LocalDateTime.now()
        updatedAt = now
    }
}
