package com.colafan.alfred.repository

import com.colafan.alfred.entity.Budget
import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.data.jpa.repository.Query
import org.springframework.data.repository.query.Param
import org.springframework.stereotype.Repository

@Repository
interface BudgetRepository : JpaRepository<Budget, Long> {

    // 查找用户的所有预算
    fun findByUserIdAndIsActiveTrueOrderByCreatedAtDesc(userId: Long): List<Budget>

    // 根据分类查找预算
    fun findByUserIdAndCategoryIdAndIsActiveTrue(userId: Long, categoryId: Long): Budget?

    // 根据周期查找预算
    fun findByUserIdAndPeriodAndIsActiveTrue(userId: Long, period: String): List<Budget>

    // 统计用户预算数量
    @Query("SELECT COUNT(b) FROM Budget b WHERE b.userId = :userId AND b.isActive = true")
    fun countByUserId(@Param("userId") userId: Long): Long

    // 查找用户和分类的所有预算（包括软删除的）
    fun findByUserIdAndCategoryId(userId: Long, categoryId: Long): List<Budget>

    // 查找用户、分类和周期的预算
    fun findByUserIdAndCategoryIdAndPeriodAndIsActiveTrue(
        userId: Long,
        categoryId: Long,
        period: String
    ): Budget?

    // 查找用户、分类、周期和是否派生的预算
    @Query("SELECT b FROM Budget b WHERE b.userId = :userId AND b.categoryId = :categoryId AND b.period = :period AND b.isDerived = :isDerived AND b.isActive = true")
    fun findByUserIdAndCategoryIdAndPeriodAndIsDerivedAndIsActiveTrue(
        @Param("userId") userId: Long,
        @Param("categoryId") categoryId: Long,
        @Param("period") period: String,
        @Param("isDerived") isDerived: Boolean
    ): List<Budget>

    // 查找用户和父预算ID的预算
    fun findByUserIdAndParentBudgetIdAndIsActiveTrue(
        userId: Long,
        parentBudgetId: Long
    ): List<Budget>
}
