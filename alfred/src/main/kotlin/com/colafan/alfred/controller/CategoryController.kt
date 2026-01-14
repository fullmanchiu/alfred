package com.colafan.alfred.controller

import com.colafan.alfred.dto.request.CategoryRequest
import com.colafan.alfred.dto.response.CategoryResponse
import com.colafan.alfred.entity.Category
import com.colafan.alfred.service.AuthService
import com.colafan.alfred.service.CategoryService
import jakarta.validation.Valid
import org.slf4j.LoggerFactory
import org.springframework.http.HttpStatus
import org.springframework.http.ResponseEntity
import org.springframework.security.core.Authentication
import org.springframework.web.bind.annotation.*

@RestController
@RequestMapping("/api/v1/categories")
class CategoryController(
    private val categoryService: CategoryService,
    private val authService: AuthService
) {
    private val logger = LoggerFactory.getLogger(CategoryController::class.java)

    @GetMapping
    fun getCategories(
        @RequestParam(required = false) type: String?,
        @RequestParam(required = false) parentId: Long?,
        authentication: Authentication
    ): ResponseEntity<List<CategoryResponse>> {
        val userId = authService.getCurrentUserId(authentication)

        // Get all categories (needed for building subcategories)
        val allCategories = categoryService.getCategoriesByUserId(userId)

        // Filter based on parameters
        val categories = if (type != null && parentId != null) {
            // 组合过滤：type和parentId
            allCategories.filter {
                it.type == type && it.parentId == parentId
            }
        } else if (type != null) {
            allCategories.filter { it.type == type && it.parentId == null }
        } else if (parentId != null) {
            allCategories.filter { it.parentId == parentId }
        } else {
            allCategories.filter { it.parentId == null }
        }

        // RESTful: 直接返回数组，包含子分类
        return ResponseEntity.ok()
            .header("X-Total-Count", categories.size.toString())
            .body(categories.map { CategoryResponse.fromEntity(it, allCategories) })
    }

    @GetMapping("/{id}")
    fun getCategory(
        @PathVariable id: Long,
        authentication: Authentication
    ): ResponseEntity<CategoryResponse> {
        val userId = authService.getCurrentUserId(authentication)
        val category = categoryService.getCategoryById(userId, id)

        return ResponseEntity.ok(CategoryResponse.fromEntity(category))
    }

    @PostMapping
    fun createCategory(
        @Valid @RequestBody request: CategoryRequest,
        authentication: Authentication
    ): ResponseEntity<CategoryResponse> {
        val userId = authService.getCurrentUserId(authentication)

        // 创建分类时 name 和 type 是必需的
        val categoryName = request.name
            ?: throw IllegalArgumentException("分类名称不能为空")
        val categoryType = request.type
            ?: throw IllegalArgumentException("分类类型不能为空")

        val category = Category(
            userId = userId,
            name = categoryName,
            type = categoryType,
            parentId = request.parentId,
            icon = request.icon,
            color = request.color,
            sortOrder = request.sortOrder
        )

        val createdCategory = categoryService.createCategory(userId, category)

        return ResponseEntity
            .status(HttpStatus.CREATED)
            .body(CategoryResponse.fromEntity(createdCategory))
    }

    @PutMapping("/{id}")
    fun updateCategory(
        @PathVariable id: Long,
        @Valid @RequestBody request: CategoryRequest,
        authentication: Authentication
    ): ResponseEntity<CategoryResponse> {
        val userId = authService.getCurrentUserId(authentication)

        // 获取现有分类（managed entity）
        val existingCategory = categoryService.getCategoryById(userId, id)

        // Debug logging
        logger.info("=== UPDATE CATEGORY ===")
        logger.info("Request: name=${request.name}, icon=${request.icon}, color=${request.color}, sortOrder=${request.sortOrder}")
        logger.info("Existing: name=${existingCategory.name}, icon=${existingCategory.icon}, color=${existingCategory.color}, sortOrder=${existingCategory.sortOrder}")

        // 使用CategoryService的update方法，它会在事务内正确处理
        val updatedCategory = existingCategory.copy(
            name = request.name ?: existingCategory.name,
            type = request.type ?: existingCategory.type,
            parentId = request.parentId,
            icon = request.icon ?: existingCategory.icon,
            color = request.color ?: existingCategory.color,
            sortOrder = request.sortOrder ?: existingCategory.sortOrder
        )

        logger.info("Updated: name=${updatedCategory.name}, icon=${updatedCategory.icon}, color=${updatedCategory.color}, sortOrder=${updatedCategory.sortOrder}")

        val savedCategory = categoryService.updateCategory(userId, id, updatedCategory)

        return ResponseEntity.ok(CategoryResponse.fromEntity(savedCategory))
    }

    @DeleteMapping("/{id}")
    fun deleteCategory(
        @PathVariable id: Long,
        authentication: Authentication
    ): ResponseEntity<Void> {
        val userId = authService.getCurrentUserId(authentication)
        categoryService.deleteCategory(userId, id)

        return ResponseEntity.noContent().build()
    }
}
