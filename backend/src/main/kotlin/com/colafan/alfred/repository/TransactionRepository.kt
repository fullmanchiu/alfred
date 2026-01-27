package com.colafan.alfred.repository

import com.colafan.alfred.entity.Transaction
import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.data.jpa.repository.Query
import org.springframework.data.repository.query.Param
import org.springframework.stereotype.Repository
import java.time.LocalDateTime

@Repository
interface TransactionRepository : JpaRepository<Transaction, Long> {

    // 查找用户的所有交易
    fun findByUserIdAndIsActiveTrueOrderByTransactionDateDesc(userId: Long): List<Transaction>

    // 根据类型查找交易
    fun findByUserIdAndTypeAndIsActiveTrueOrderByTransactionDateDesc(userId: Long, type: String): List<Transaction>

    // 根据账户查找交易
    fun findByUserIdAndFromAccountIdAndIsActiveTrueOrderByTransactionDateDesc(userId: Long, fromAccountId: Long): List<Transaction>

    fun findByUserIdAndToAccountIdAndIsActiveTrueOrderByTransactionDateDesc(userId: Long, toAccountId: Long): List<Transaction>

    // 根据分类查找交易
    fun findByUserIdAndCategoryIdAndIsActiveTrueOrderByTransactionDateDesc(userId: Long, categoryId: Long): List<Transaction>

    // 根据日期范围查找交易
    fun findByUserIdAndTransactionDateBetweenAndIsActiveTrueOrderByTransactionDateDesc(
        userId: Long,
        startDate: LocalDateTime,
        endDate: LocalDateTime
    ): List<Transaction>

    // 根据分类和日期范围查找交易
    fun findByUserIdAndCategoryIdAndTransactionDateBetweenAndIsActiveTrueOrderByTransactionDateDesc(
        userId: Long,
        categoryId: Long,
        startDate: LocalDateTime,
        endDate: LocalDateTime
    ): List<Transaction>

    // 统计用户交易数量
    @Query("SELECT COUNT(t) FROM Transaction t WHERE t.userId = :userId AND t.isActive = true")
    fun countByUserId(@Param("userId") userId: Long): Long

    // 检查分类下是否有交易记录
    @Query("SELECT COUNT(t) > 0 FROM Transaction t WHERE t.categoryId = :categoryId AND t.isActive = true")
    fun existsByCategoryIdAndIsActiveTrue(@Param("categoryId") categoryId: Long): Boolean
}
