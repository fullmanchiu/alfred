package com.colafan.alfred.repository

import com.colafan.alfred.entity.Category
import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.data.jpa.repository.Modifying
import org.springframework.data.jpa.repository.Query
import org.springframework.data.repository.query.Param
import org.springframework.stereotype.Repository
import org.springframework.transaction.annotation.Transactional

@Repository
interface CategoryRepository : JpaRepository<Category, Long> {
    fun findByUserId(userId: Long): List<Category>
    fun findByUserIdAndIsActiveTrueOrderByTypeAscSortOrderAscNameAsc(userId: Long): List<Category>
    fun findByUserIdAndTypeAndIsActiveTrueOrderBySortOrderAscNameAsc(userId: Long, type: String): List<Category>
    fun findByUserIdAndIsSystemTrue(userId: Long): List<Category>
    fun findByUserIdAndConfigIdAndIsSystemTrue(userId: Long, configId: Int): List<Category>
    fun findByUserIdAndConfigId(userId: Long, configId: Int): List<Category>

    @Modifying
    @Query("UPDATE Category c SET c.isActive = :isActive WHERE c.userId = :userId AND c.isSystem = true AND c.isActive = false")
    @Transactional
    fun reactivateSystemCategories(@Param("userId") userId: Long, @Param("isActive") isActive: Boolean)

    @Modifying
    @Query("DELETE FROM Category c WHERE c.userId = :userId AND c.isActive = false")
    @Transactional
    fun deleteInactiveCategoriesByUserId(@Param("userId") userId: Long)
}
