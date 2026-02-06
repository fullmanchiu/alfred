package com.colafan.alfred.entity

import jakarta.persistence.*
import java.time.LocalDateTime

/**
 * 账户组实体
 * 用户感知的"账户"，可以包含多个货币子账户
 */
@Entity
@Table(name = "account_groups")
data class AccountGroup(
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    val id: Long? = null,

    @Column(name = "user_id", nullable = false)
    val userId: Long,

    /**
     * 所属金融机构ID
     */
    @Column(name = "institution_id", nullable = false)
    val institutionId: Long,

    @Column(nullable = false, length = 100)
    val name: String,

    @Column(name = "account_number", length = 100)
    val accountNumber: String? = null,

    @Column(columnDefinition = "TEXT")
    val description: String? = null,

    @Column(nullable = false)
    val isDefault: Boolean = false,

    /**
     * 显示顺序，用于自定义排序
     */
    @Column(name = "display_order")
    val displayOrder: Int = 0,

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
