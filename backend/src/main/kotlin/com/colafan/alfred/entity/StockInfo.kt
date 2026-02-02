package com.colafan.alfred.entity

import jakarta.persistence.*
import java.time.LocalDateTime

/**
 * 股票基本信息
 */
@Entity
@Table(name = "stock_info")
class StockInfo(
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    val id: Long? = null,

    @Column(nullable = false, unique = true, length = 20)
    val code: String,  // 股票代码 (如: 600000)

    @Column(nullable = false, length = 100)
    val name: String,  // 股票名称

    @Column(length = 20)
    var market: String? = null,  // 市场 (SH/SZ)

    @Column(length = 100)
    var industry: String? = null,  // 行业

    @Column(name = "created_at", updatable = false)
    val createdAt: LocalDateTime = LocalDateTime.now(),

    @Column(name = "updated_at")
    var updatedAt: LocalDateTime = LocalDateTime.now()
) {
    @PreUpdate
    fun onUpdate() {
        updatedAt = LocalDateTime.now()
    }
}
