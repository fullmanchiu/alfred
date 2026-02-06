package com.colafan.alfred.entity

import jakarta.persistence.*
import java.time.LocalDateTime

/**
 * 金融机构实体
 * 代表银行、支付平台等金融机构
 */
@Entity
@Table(name = "institutions")
data class Institution(
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    val id: Long? = null,

    @Column(name = "user_id", nullable = false)
    val userId: Long,

    @Column(nullable = false, length = 100)
    val name: String,

    /**
     * 机构类型：bank(银行)、credit_card(信用卡)、e_wallet(电子钱包)、cash(现金)
     */
    @Column(nullable = false, length = 20)
    val type: String,

    @Column(length = 50)
    val icon: String? = null,

    @Column(length = 20)
    val color: String? = null,

    /**
     * 机构所在国家代码，如 CN、US、HK
     */
    @Column(name = "country_code", length = 3)
    val countryCode: String = "CN",

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
