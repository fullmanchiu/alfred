package com.colafan.alfred.entity

import jakarta.persistence.*
import java.time.LocalDateTime

/**
 * 用户自选股
 */
@Entity
@Table(name = "user_stocks", uniqueConstraints = [
    (UniqueConstraint(columnNames = ["user_id", "stock_id"]))
])
class UserStock(
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    val id: Long? = null,

    @Column(name = "user_id", nullable = false)
    val userId: Long,

    @Column(name = "stock_id", nullable = false)
    val stockId: Long,

    @Column(columnDefinition = "TEXT")
    var note: String? = null,  // 备注

    @Column(name = "added_at", updatable = false)
    val addedAt: LocalDateTime = LocalDateTime.now()
)
