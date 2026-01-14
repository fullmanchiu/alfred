package com.colafan.alfred.entity

import jakarta.persistence.*
import java.math.BigDecimal
import java.time.LocalDateTime

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

    @Column(name = "from_account_id")
    val fromAccountId: Long? = null,

    @Column(name = "to_account_id")
    val toAccountId: Long? = null,

    @Column(name = "category_id")
    val categoryId: Long? = null,

    @Column(name = "transaction_date", nullable = false)
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
