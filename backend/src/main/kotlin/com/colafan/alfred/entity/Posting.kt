package com.colafan.alfred.entity

import jakarta.persistence.*
import java.math.BigDecimal
import java.time.LocalDateTime

/**
 * 分录（Posting）- 复式记账的核心概念
 *
 * 记录每笔交易的借贷分录，遵循复式记账原则：
 * - 每笔交易产生至少两条分录（一借一贷）
 * - 借方总额 = 贷方总额
 * - 一个分录要么引用用户账户（userAccountId），要么引用系统账户（systemAccountId）
 */
@Entity
@Table(name = "postings")
data class Posting(
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    val id: Long? = null,

    @Column(name = "transaction_id", nullable = false)
    val transactionId: Long,

    @Column(name = "user_account_id")
    val userAccountId: Long? = null,

    @Column(name = "system_account_id")
    val systemAccountId: Long? = null,

    @Column(name = "entry_type", nullable = false, length = 10)
    val entryType: String, // 'DEBIT' 或 'CREDIT'

    @Column(nullable = false, precision = 15, scale = 2)
    val amount: BigDecimal,

    @Column(name = "created_at", nullable = false, updatable = false)
    var createdAt: LocalDateTime? = null,

    @Column(name = "updated_at")
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
