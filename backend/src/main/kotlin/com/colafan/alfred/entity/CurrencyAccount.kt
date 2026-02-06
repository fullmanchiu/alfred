package com.colafan.alfred.entity

import jakarta.persistence.*
import java.math.BigDecimal
import java.time.LocalDateTime

/**
 * 货币账户实体
 * 实际的账户实体，每个代表"账户组+货币"的组合
 */
@Entity
@Table(name = "currency_accounts")
data class CurrencyAccount(
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    val id: Long? = null,

    @Column(name = "user_id", nullable = false)
    val userId: Long,

    /**
     * 所属账户组ID
     */
    @Column(name = "account_group_id", nullable = false)
    val accountGroupId: Long,

    /**
     * 货币代码：CNY、HKD、USD、EUR、MOP
     */
    @Column(nullable = false, length = 3)
    val currency: String,

    /**
     * 账户余额
     */
    @Column(nullable = false, precision = 15, scale = 2)
    var balance: BigDecimal,

    @Column(nullable = false)
    val isActive: Boolean = true,

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

    /**
     * 增加余额
     */
    fun addBalance(amount: BigDecimal) {
        this.balance = this.balance.add(amount)
    }

    /**
     * 减少余额
     */
    fun subtractBalance(amount: BigDecimal) {
        this.balance = this.balance.subtract(amount)
    }
}
