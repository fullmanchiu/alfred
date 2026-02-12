package com.colafan.alfred.repository

import com.colafan.alfred.entity.Transaction
import org.springframework.data.domain.Page
import org.springframework.data.domain.Pageable
import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.data.jpa.repository.Query
import org.springframework.data.repository.query.Param
import org.springframework.stereotype.Repository
import java.time.LocalDateTime

@Repository
interface TransactionRepository : JpaRepository<Transaction, Long> {

    // 查找用户的所有交易（按交易日期降序，最新在前）
    @Query("SELECT t FROM Transaction t WHERE t.userId = :userId AND t.isActive = true ORDER BY t.transactionDate DESC, t.id DESC")
    fun findByUserIdAndIsActiveTrueOrderByTransactionDateDesc(@Param("userId") userId: Long): List<Transaction>

    // 根据类型查找交易（按交易日期降序）
    @Query("SELECT t FROM Transaction t WHERE t.userId = :userId AND t.type = :type AND t.isActive = true ORDER BY t.transactionDate DESC, t.id DESC")
    fun findByUserIdAndTypeAndIsActiveTrueOrderByTransactionDateDesc(
        @Param("userId") userId: Long,
        @Param("type") type: String
    ): List<Transaction>

    // 根据账户查找交易（按交易日期降序）
    @Query("SELECT t FROM Transaction t WHERE t.userId = :userId AND t.fromAccountId = :fromAccountId AND t.isActive = true ORDER BY t.transactionDate DESC, t.id DESC")
    fun findByUserIdAndFromAccountIdAndIsActiveTrueOrderByTransactionDateDesc(
        @Param("userId") userId: Long,
        @Param("fromAccountId") fromAccountId: Long
    ): List<Transaction>

    // 兼容旧方法名
    fun findByUserIdAndFromAccountIdAndIsActiveTrueOrderByCreatedAtDesc(userId: Long, fromAccountId: Long): List<Transaction> =
        findByUserIdAndFromAccountIdAndIsActiveTrueOrderByTransactionDateDesc(userId, fromAccountId)

    // 根据账户查找交易（按交易日期降序）
    @Query("SELECT t FROM Transaction t WHERE t.userId = :userId AND t.toAccountId = :toAccountId AND t.isActive = true ORDER BY t.transactionDate DESC, t.id DESC")
    fun findByUserIdAndToAccountIdAndIsActiveTrueOrderByTransactionDateDesc(
        @Param("userId") userId: Long,
        @Param("toAccountId") toAccountId: Long
    ): List<Transaction>

    // 兼容旧方法名
    fun findByUserIdAndToAccountIdAndIsActiveTrueOrderByCreatedAtDesc(userId: Long, toAccountId: Long): List<Transaction> =
        findByUserIdAndToAccountIdAndIsActiveTrueOrderByTransactionDateDesc(userId, toAccountId)

    // 根据分类查找交易（按交易日期降序）
    @Query("SELECT t FROM Transaction t WHERE t.userId = :userId AND t.categoryId = :categoryId AND t.isActive = true ORDER BY t.transactionDate DESC, t.id DESC")
    fun findByUserIdAndCategoryIdAndIsActiveTrueOrderByTransactionDateDesc(
        @Param("userId") userId: Long,
        @Param("categoryId") categoryId: Long
    ): List<Transaction>

    // 兼容旧方法名
    fun findByUserIdAndCategoryIdAndIsActiveTrueOrderByCreatedAtDesc(userId: Long, categoryId: Long): List<Transaction> =
        findByUserIdAndCategoryIdAndIsActiveTrueOrderByTransactionDateDesc(userId, categoryId)

    // 根据日期范围查找交易（按交易日期降序）
    @Query("SELECT t FROM Transaction t WHERE t.userId = :userId AND t.transactionDate BETWEEN :startDate AND :endDate AND t.isActive = true ORDER BY t.transactionDate DESC, t.id DESC")
    fun findByUserIdAndTransactionDateBetweenAndIsActiveTrueOrderByTransactionDateDesc(
        @Param("userId") userId: Long,
        @Param("startDate") startDate: LocalDateTime,
        @Param("endDate") endDate: LocalDateTime
    ): List<Transaction>

    // 兼容旧方法名
    fun findByUserIdAndTransactionDateBetweenAndIsActiveTrueOrderByCreatedAtDesc(
        userId: Long,
        startDate: LocalDateTime,
        endDate: LocalDateTime
    ): List<Transaction> =
        findByUserIdAndTransactionDateBetweenAndIsActiveTrueOrderByTransactionDateDesc(userId, startDate, endDate)

    // 根据分类和日期范围查找交易（按交易日期降序）
    @Query("SELECT t FROM Transaction t WHERE t.userId = :userId AND t.categoryId = :categoryId AND t.transactionDate BETWEEN :startDate AND :endDate AND t.isActive = true ORDER BY t.transactionDate DESC, t.id DESC")
    fun findByUserIdAndCategoryIdAndTransactionDateBetweenAndIsActiveTrueOrderByTransactionDateDesc(
        @Param("userId") userId: Long,
        @Param("categoryId") categoryId: Long,
        @Param("startDate") startDate: LocalDateTime,
        @Param("endDate") endDate: LocalDateTime
    ): List<Transaction>

    // 兼容旧方法名
    fun findByUserIdAndCategoryIdAndTransactionDateBetweenAndIsActiveTrueOrderByCreatedAtDesc(
        userId: Long,
        categoryId: Long,
        startDate: LocalDateTime,
        endDate: LocalDateTime
    ): List<Transaction> =
        findByUserIdAndCategoryIdAndTransactionDateBetweenAndIsActiveTrueOrderByTransactionDateDesc(userId, categoryId, startDate, endDate)

    // 统计用户交易数量
    @Query("SELECT COUNT(t) FROM Transaction t WHERE t.userId = :userId AND t.isActive = true")
    fun countByUserId(@Param("userId") userId: Long): Long

    // 检查分类下是否有交易记录
    @Query("SELECT COUNT(t) > 0 FROM Transaction t WHERE t.categoryId = :categoryId AND t.isActive = true")
    fun existsByCategoryIdAndIsActiveTrue(@Param("categoryId") categoryId: Long): Boolean

    // 根据 account_id 查询所有相关的交易（包括该账户作为 from_account 或 to_account）
    @Query("SELECT t FROM Transaction t WHERE t.fromAccountId = :accountId OR t.toAccountId = :accountId ORDER BY t.id DESC")
    fun findByAccountIdOrderByIdDesc(
        @Param("accountId") accountId: Long,
        pageable: Pageable
    ): Page<Transaction>
}
