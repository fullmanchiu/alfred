package com.colafan.alfred.entity

import jakarta.persistence.*
import java.math.BigDecimal
import java.time.LocalDateTime

@Entity
@Table(name = "accounts")
data class Account(
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    val id: Long? = null,

    @Column(name = "user_id", nullable = false)
    val userId: Long,

    @Column(nullable = false, length = 100)
    val name: String,

    @Column(nullable = false, length = 20)
    val accountType: String,

    @Column(length = 100)
    val accountNumber: String? = null,

    @Column(nullable = false, precision = 10, scale = 2)
    val balance: BigDecimal,

    @Column(length = 3, nullable = false)
    val currency: String = "CNY",

    @Column(nullable = false)
    val isDefault: Boolean = false,

    @Column(length = 50)
    val icon: String? = null,

    @Column(length = 20)
    val color: String? = null,

    @Column(columnDefinition = "TEXT")
    val notes: String? = null,

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
