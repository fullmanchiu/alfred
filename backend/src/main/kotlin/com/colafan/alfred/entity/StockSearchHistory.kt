package com.colafan.alfred.entity

import jakarta.persistence.*
import java.time.LocalDateTime

/**
 * 股票搜索历史
 */
@Entity
@Table(name = "stock_search_history", indexes = [
    Index(name = "idx_user_id", columnList = "user_id"),
    Index(name = "idx_user_created", columnList = "user_id,created_at DESC")
])
class StockSearchHistory(
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    val id: Long? = null,

    @Column(name = "user_id", nullable = false)
    val userId: Long,

    @Column(nullable = false, length = 100)
    val keyword: String,

    @Column(name = "created_at", updatable = false)
    val createdAt: LocalDateTime = LocalDateTime.now()
)
