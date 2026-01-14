package com.colafan.alfred.repository

import com.colafan.alfred.entity.Category
import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.stereotype.Repository

@Repository
interface CategoryRepository : JpaRepository<Category, Long> {
    fun findByUserIdAndIsActiveTrueOrderByTypeAscSortOrderAscNameAsc(userId: Long): List<Category>
    fun findByUserIdAndTypeAndIsActiveTrueOrderBySortOrderAscNameAsc(userId: Long, type: String): List<Category>
}
