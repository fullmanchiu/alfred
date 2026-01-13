package com.colafan.alfred.repository

import com.colafan.alfred.entity.Category
import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.stereotype.Repository
import java.util.List

@Repository
interface CategoryRepository : JpaRepository<Category, Long> {
    fun findByUserIdAndIsActiveTrue(userId: Long): List<Category>
    fun findByUserIdAndTypeAndIsActiveTrue(userId: Long, type: String): List<Category>
}
