package com.colafan.alfred.repository

import com.colafan.alfred.entity.UserStock
import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.stereotype.Repository

/**
 * 用户自选股Repository
 */
@Repository
interface UserStockRepository : JpaRepository<UserStock, Long> {
    fun findByUserId(userId: Long): List<UserStock>
    fun findByUserIdAndStockId(userId: Long, stockId: Long): UserStock?
    fun deleteByUserIdAndStockId(userId: Long, stockId: Long)
}
