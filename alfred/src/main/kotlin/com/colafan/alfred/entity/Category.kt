package com.colafan.alfred.entity

import jakarta.persistence.*
import java.time.LocalDateTime

@Entity
@Table(name = "categories")
data class Category(
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    val id: Long? = null,

    @Column(name = "user_id", nullable = false)
    val userId: Long,

    @Column(nullable = false, length = 50)
    val name: String,

    @Column(nullable = false, length = 10)
    val type: String,

    @Column(name = "parent_id")
    val parentId: Long? = null,

    @Column(length = 50)
    val icon: String? = null,

    @Column(length = 20)
    val color: String? = null,

    @Column(nullable = false)
    val isSystem: Boolean = false,

    @Column(name = "sort_order")
    val sortOrder: Int? = null,

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
