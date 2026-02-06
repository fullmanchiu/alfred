package com.colafan.alfred.entity

import jakarta.persistence.*
import java.time.LocalDateTime

/**
 * 系统账户（SystemAccount）- 权益类科目
 *
 * 管理复式记账中的权益、收入、支出等系统账户：
 * - EQUITY: 权益类（如所有者权益、累计盈余）
 * - INCOME: 收入类（如投资收益）
 * - EXPENSE: 支出类（如手续费支出）
 *
 * 用于支持余额校准和历史记录查询功能
 */
@Entity
@Table(name = "system_accounts")
data class SystemAccount(
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    val id: Long? = null,

    @Column(nullable = false, unique = true, length = 50)
    val code: String,

    @Column(nullable = false, length = 100)
    val name: String,

    @Column(name = "account_type", nullable = false, length = 20)
    val accountType: String, // 'EQUITY', 'INCOME', 'EXPENSE'

    @Column(name = "is_active", nullable = false)
    val isActive: Boolean = true,

    @Column(columnDefinition = "TEXT")
    val description: String? = null,

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
