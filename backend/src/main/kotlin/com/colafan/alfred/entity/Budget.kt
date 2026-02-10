package com.colafan.alfred.entity

import jakarta.persistence.*
import java.math.BigDecimal
import java.time.LocalDateTime

@Entity
@Table(name = "budgets")
data class Budget(
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    var id: Long? = null,

    @Column(name = "user_id", nullable = false)
    var userId: Long,

    @Column(name = "category_id", nullable = false)
    var categoryId: Long,

    @Column(nullable = false, precision = 15, scale = 2)
    var amount: BigDecimal,

    @Column(nullable = false, length = 20)
    var period: String, // daily, weekly, monthly, yearly

    @Column(length = 50)
    var pattern: String = "all", // all, workday, weekend

    @Column(name = "alert_threshold", nullable = false)
    var alertThreshold: Double = 80.0, // 0-100 percentage

    @Column(name = "is_recurring", nullable = false)
    var isRecurring: Boolean = true, // 是否循环

    @Column(name = "start_date", nullable = false)
    var startDate: LocalDateTime,

    @Column(name = "end_date")
    var endDate: LocalDateTime? = null,

    @Column(nullable = false)
    var isActive: Boolean = true,

    /**
     * 父预算ID，用于关联派生预算
     * 例如：周预算的父预算是对应的日预算
     */
    @Column(name = "parent_budget_id")
    var parentBudgetId: Long? = null,

    /**
     * 是否是派生预算（自动计算的）
     * true = 由父预算自动计算，false = 用户手动设置的独立预算
     */
    @Column(name = "is_derived", nullable = false)
    var isDerived: Boolean = false,

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
