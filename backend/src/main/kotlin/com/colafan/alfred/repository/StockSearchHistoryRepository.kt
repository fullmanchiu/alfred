package com.colafan.alfred.repository

import com.colafan.alfred.entity.StockSearchHistory
import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.data.jpa.repository.Modifying
import org.springframework.data.jpa.repository.Query
import org.springframework.transaction.annotation.Transactional
import java.time.LocalDateTime

interface StockSearchHistoryRepository : JpaRepository<StockSearchHistory, Long> {

    /**
     * 查询用户的搜索历史，按时间倒序
     */
    fun findByUserIdOrderByCreatedAtDesc(userId: Long): List<StockSearchHistory>

    /**
     * 查询用户最近的搜索历史（限制数量）
     */
    @Query("""
        SELECT s FROM StockSearchHistory s
        WHERE s.userId = :userId
        ORDER BY s.createdAt DESC
        LIMIT :limit
    """)
    fun findRecentByUserId(userId: Long, limit: Int = 10): List<StockSearchHistory>

    /**
     * 查找用户是否已搜索过某关键词
     */
    fun findByUserIdAndKeyword(userId: Long, keyword: String): StockSearchHistory?

    /**
     * 更新关键词的搜索时间
     */
    @Modifying
    @Transactional
    @Query("UPDATE StockSearchHistory s SET s.createdAt = :createdAt WHERE s.id = :id")
    fun updateCreatedAt(id: Long, createdAt: LocalDateTime): Int

    /**
     * 删除用户的所有搜索历史
     */
    @Transactional
    fun deleteByUserId(userId: Long)

    /**
     * 删除指定时间之前的记录
     */
    @Transactional
    @Query("DELETE FROM StockSearchHistory s WHERE s.userId = :userId AND s.createdAt < :beforeDate")
    fun deleteOldHistories(userId: Long, beforeDate: LocalDateTime): Int
}
