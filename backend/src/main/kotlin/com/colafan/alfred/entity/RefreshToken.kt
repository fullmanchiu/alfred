package com.colafan.alfred.entity

import jakarta.persistence.*
import java.time.LocalDateTime

/**
 * Refresh Token 实体
 *
 * 用于实现滑动过期机制：
 * - 初始有效期 30 天
 * - 每次 refresh 时会生成新的 token 并重置过期时间
 * - 只要用户持续使用，就永不过期
 *
 * @property id 主键ID
 * @property userId 用户ID
 * @property token SHA-256 哈希后的 refresh token
 * @property expiresAt 过期时间
 * @property createdAt 创建时间
 * @property updatedAt 更新时间
 */
@Entity
@Table(name = "refresh_tokens")
data class RefreshToken(
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    val id: Long? = null,

    @Column(name = "user_id", nullable = false)
    val userId: Long,

    @Column(nullable = false, unique = true, length = 512)
    val token: String,

    @Column(name = "expires_at", nullable = false)
    val expiresAt: LocalDateTime,

    @Column(name = "created_at", nullable = false, updatable = false)
    val createdAt: LocalDateTime = LocalDateTime.now(),

    @Column(name = "updated_at")
    var updatedAt: LocalDateTime = LocalDateTime.now()
) {
    @PreUpdate
    fun preUpdate() {
        updatedAt = LocalDateTime.now()
    }

    /**
     * 检查 token 是否过期
     */
    fun isExpired(): Boolean {
        return LocalDateTime.now().isAfter(expiresAt)
    }
}
