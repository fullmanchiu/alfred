package com.colafan.alfred.service

import com.colafan.alfred.config.CategoryConfig
import com.colafan.alfred.entity.Category
import com.colafan.alfred.exception.ApiException
import com.colafan.alfred.exception.ErrorCode
import com.colafan.alfred.repository.CategoryRepository
import org.slf4j.LoggerFactory
import org.springframework.data.repository.findByIdOrNull
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional

@Service
class CategoryService(
    private val categoryRepository: CategoryRepository,
    private val categoryConfig: CategoryConfig
) {
    private val logger = LoggerFactory.getLogger(CategoryService::class.java)

    fun getCategoriesByUserId(userId: Long): List<Category> {
        return categoryRepository.findByUserIdAndIsActiveTrueOrderByTypeAscSortOrderAscNameAsc(userId)
    }

    fun getCategoriesByType(userId: Long, type: String): List<Category> {
        return categoryRepository.findByUserIdAndTypeAndIsActiveTrueOrderBySortOrderAscNameAsc(userId, type)
    }

    fun getCategoryById(userId: Long, categoryId: Long): Category {
        val category = categoryRepository.findByIdOrNull(categoryId)
            ?: throw ApiException(ErrorCode.NOT_FOUND, "分类不存在")

        if (category.userId != userId) {
            throw ApiException(ErrorCode.FORBIDDEN, "无权访问此分类")
        }

        return category
    }

    @Transactional
    fun createCategory(userId: Long, category: Category): Category {
        // 如果设置了父分类，验证父分类存在
        category.parentId?.let { parentId ->
            val parentCategory = categoryRepository.findByIdOrNull(parentId)
                ?: throw ApiException(ErrorCode.NOT_FOUND, "父分类不存在")

            if (parentCategory.userId != userId) {
                throw ApiException(ErrorCode.FORBIDDEN, "无权使用此父分类")
            }
        }

        val newCategory = category.copy(
            userId = userId,
            isSystem = false,
            isActive = true
        )

        return categoryRepository.save(newCategory)
    }

    @Transactional
    fun updateCategory(userId: Long, categoryId: Long, updatedCategory: Category): Category {
        val existingCategory = getCategoryById(userId, categoryId)

        // 系统分类不能修改类型和父分类
        if (existingCategory.isSystem) {
            if (existingCategory.type != updatedCategory.type) {
                throw ApiException(ErrorCode.BAD_REQUEST, "系统分类不能修改类型")
            }
            if (existingCategory.parentId != updatedCategory.parentId) {
                throw ApiException(ErrorCode.BAD_REQUEST, "系统分类不能修改父分类")
            }
        }

        // 如果设置了父分类，验证父分类存在
        updatedCategory.parentId?.let { parentId ->
            if (parentId != existingCategory.parentId) {
                val parentCategory = categoryRepository.findByIdOrNull(parentId)
                    ?: throw ApiException(ErrorCode.NOT_FOUND, "父分类不存在")

                if (parentCategory.userId != userId || parentCategory.id == categoryId) {
                    throw ApiException(ErrorCode.BAD_REQUEST, "无效的父分类")
                }
            }
        }

        val categoryToUpdate = existingCategory.copy(
            name = updatedCategory.name,
            parentId = updatedCategory.parentId,
            icon = updatedCategory.icon,
            color = updatedCategory.color,
            sortOrder = updatedCategory.sortOrder
        )

        return categoryRepository.save(categoryToUpdate)
    }

    @Transactional
    fun deleteCategory(userId: Long, categoryId: Long) {
        val category = getCategoryById(userId, categoryId)

        // 系统分类不能删除
        if (category.isSystem) {
            throw ApiException(ErrorCode.BAD_REQUEST, "系统分类不能删除")
        }

        // 检查是否有子分类
        val hasChildren = categoryRepository.findByUserIdAndIsActiveTrueOrderByTypeAscSortOrderAscNameAsc(userId)
            .any { it.parentId == categoryId }

        if (hasChildren) {
            throw ApiException(ErrorCode.BAD_REQUEST, "该分类下有子分类，无法删除")
        }

        // 软删除
        val categoryToDelete = category.copy(isActive = false)
        categoryRepository.save(categoryToDelete)
    }

    @Transactional
    fun initDefaultCategories(userId: Long): List<Category> {
        logger.info("开始从配置文件初始化默认分类，用户ID: {}", userId)
        val categories = mutableListOf<Category>()

        // 从配置文件加载支出分类
        val expenseCategories = categoryConfig.getAllCategories("expense")
        expenseCategories.forEach { config ->
            // 创建父分类
            val parentCategory = Category(
                userId = userId,
                name = config.name,
                type = "expense",
                icon = config.icon,
                color = config.color,
                sortOrder = config.sortOrder,
                isSystem = true,
                parentId = null
            )
            val savedParent = categoryRepository.save(parentCategory)
            categories.add(savedParent)

            // 创建子分类
            config.subcategories.forEach { subConfig ->
                val subcategory = Category(
                    userId = userId,
                    name = subConfig.name,
                    type = "expense",
                    icon = subConfig.icon,
                    color = subConfig.color,
                    sortOrder = 0, // 子分类使用固定排序
                    isSystem = true,
                    parentId = savedParent.id
                )
                val savedSub = categoryRepository.save(subcategory)
                categories.add(savedSub)
            }

            logger.debug("创建支出分类: {} (子分类 {} 个)", config.name, config.subcategories.size)
        }

        // 从配置文件加载收入分类
        val incomeCategories = categoryConfig.getAllCategories("income")
        incomeCategories.forEach { config ->
            // 创建父分类
            val parentCategory = Category(
                userId = userId,
                name = config.name,
                type = "income",
                icon = config.icon,
                color = config.color,
                sortOrder = config.sortOrder,
                isSystem = true,
                parentId = null
            )
            val savedParent = categoryRepository.save(parentCategory)
            categories.add(savedParent)

            // 创建子分类
            config.subcategories.forEach { subConfig ->
                val subcategory = Category(
                    userId = userId,
                    name = subConfig.name,
                    type = "income",
                    icon = subConfig.icon,
                    color = subConfig.color,
                    sortOrder = 0, // 子分类使用固定排序
                    isSystem = true,
                    parentId = savedParent.id
                )
                val savedSub = categoryRepository.save(subcategory)
                categories.add(savedSub)
            }

            logger.debug("创建收入分类: {} (子分类 {} 个)", config.name, config.subcategories.size)
        }

        logger.info("成功初始化默认分类，总共 {} 个（父分类 {} 个，子分类 {} 个）",
            categories.size,
            expenseCategories.size + incomeCategories.size,
            categories.size - (expenseCategories.size + incomeCategories.size)
        )

        return categories
    }
}
