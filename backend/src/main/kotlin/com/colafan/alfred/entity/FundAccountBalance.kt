package com.colafan.alfred.entity

import jakarta.persistence.*
import java.math.BigDecimal
import java.time.LocalDateTime

@Entity
@Table(name = "fund_account_balances")
data class FundAccountBalance(
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    val id: Long? = null,

    @Column(name = "account_id", nullable = false)
    val accountId: Long,

    @Column(nullable = false, length = 3)
    val currency: String,

    @Column(nullable = false, precision = 15, scale = 2)
    var balance: BigDecimal,

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
