package com.colafan.alfred.dto.response

import com.colafan.alfred.entity.Category
import java.time.LocalDateTime

data class CategoryResponse(
    val id: Long,
    val name: String,
    val type: String,
    val parentId: Long?,
    val icon: String = "",
    val color: String = "",
    val isSystem: Boolean,
    val sortOrder: Int = 0,
    val createdAt: LocalDateTime,
    val subcategories: List<CategoryResponse> = emptyList()
) {
    companion object {
        fun fromEntity(category: Category, allCategories: List<Category>? = null): CategoryResponse {
            // If allCategories is provided, build subcategories list
            val subcategories = if (allCategories != null && category.parentId == null) {
                // This is a parent category, find its children
                allCategories
                    .filter { it.parentId == category.id && it.isActive }
                    .map { fromEntity(it, null) }  // Don't recurse further
                    .sortedBy { it.sortOrder }
            } else {
                emptyList()
            }

            return CategoryResponse(
                id = category.id!!,
                name = category.name,
                type = category.type,
                parentId = category.parentId,
                icon = category.icon ?: "",
                color = category.color ?: "",
                isSystem = category.isSystem,
                sortOrder = category.sortOrder ?: 0,
                createdAt = category.createdAt!!,
                subcategories = subcategories
            )
        }
    }
}
