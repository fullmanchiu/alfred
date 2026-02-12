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
 */
@Entity
@Table(name = "transactions")
data class Transaction(
    /**
     * 交易ID（主键）
     */
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    val id: Long? = null,

    /**
     * 用户ID
     */
    @Column(name = "user_id", nullable = false)
    val userId: Long,

    /**
     * 交易类型：income/expense/transfer/loan_in/loan_out/repayment
     */
    @Column(nullable = false, length = 20)
    val type: String, // income, expense, transfer, loan_in, loan_out, repayment

    /**
     * 交易金额
     */
    @Column(nullable = false, precision = 10, scale = 2)
    val amount: BigDecimal,

    /**
     * 币种代码：CNY, HKD, USD, EUR, MOP
     */
    @Column(name = "currency", nullable = false, length = 3)
    val currency: String = "CNY",

    /**
     * 记账时的汇率（1外币 = X CNY）
     */
    @Column(name = "exchange_rate", precision = 10, scale = 6)
    var exchangeRate: BigDecimal? = null,

    /**
     * 交易金额的CNY等值（用于预算计算）
     * 由后端在保存交易时自动计算
     */
    @Column(name = "cny_amount", precision = 12, scale = 2)
    var cnyAmount: BigDecimal? = null,

    /**
     * 转出账户ID（转账类型）
     */
    @Column(name = "from_account_id")
    val fromAccountId: Long? = null,

    /**
     * 转入账户ID（转账类型）
     */
    @Column(name = "to_account_id")
    val toAccountId: Long? = null,

    /**
     * 分类ID
     */
    @Column(name = "category_id")
    val categoryId: Long? = null,

    /**
     * 交易日期
     */
    @Column(name = "transaction_date", nullable = false)
    @JsonFormat(pattern = "yyyy-MM-dd'T'HH:mm:ss")
    val transactionDate: LocalDateTime,

    /**
     * 备注说明
     */
    @Column(name = "notes", columnDefinition = "TEXT")
    val notes: String? = null,

    /**
     * 交易地点
     */
    @Column(name = "location", columnDefinition = "TEXT")
    val location: String? = null,

    /**
     * 标签（JSON数组）
     */
    @Column(name = "tags", columnDefinition = "TEXT")
    val tags: String? = null, // JSON array stored as string

    /**
     * 关联图片数量
     */
    @Column(name = "image_count")
    val imageCount: Int = 0,

    /**
     * 是否有效（软删除标记）
     */
    @Column(nullable = false)
    val isActive: Boolean = true,

    /**
     * 余额校准类型（仅当 type=adjustment 时有值）
     */
    @Column(name = "adjustment_type", length = 20)
    val adjustmentType: String? = null, // 'adjustment' - 用于余额校准

    /**
     * 余额校准原因说明
     */
    @Column(name = "adjustment_reason", columnDefinition = "TEXT")
    val adjustmentReason: String? = null, // 余额校准的原因说明

    /**
     * 创建时间
     */
    @Column(name = "created_at", nullable = false, updatable = false)
    @JsonFormat(pattern = "yyyy-MM-dd'T'HH:mm:ss")
    var createdAt: LocalDateTime? = null,

    /**
     * 更新时间
     */
    @Column(name = "updated_at", nullable = false)
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
        updatedAt = LocalDateTime.now()
    }
}
