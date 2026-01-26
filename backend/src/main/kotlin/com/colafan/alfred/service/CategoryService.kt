package com.colafan.alfred.service

import com.colafan.alfred.config.CategoryConfig
import com.colafan.alfred.config.CategoryConfigItem
import com.colafan.alfred.config.SubcategoryConfigItem
import com.colafan.alfred.entity.Category
import com.colafan.alfred.entity.SystemConfig
import com.colafan.alfred.exception.ApiException
import com.colafan.alfred.exception.ErrorCode
import com.colafan.alfred.repository.CategoryRepository
import com.colafan.alfred.repository.SystemConfigRepository
import com.colafan.alfred.repository.TransactionRepository
import org.slf4j.LoggerFactory
import org.springframework.dao.DataIntegrityViolationException
import org.springframework.data.repository.findByIdOrNull
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional

@Service
class CategoryService(
    private val categoryRepository: CategoryRepository,
    private val categoryConfig: CategoryConfig,
    private val transactionRepository: TransactionRepository,
    private val systemConfigRepository: SystemConfigRepository
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

        // 检查分类是否已被软删除
        if (!category.isActive) {
            throw ApiException(ErrorCode.NOT_FOUND, "分类不存在")
        }

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

        // 系统分类约束：不允许用户通过 API 修改系统分类
        // 系统分类只能通过 syncSystemCategories() 方法（配置文件版本更新）来修改
        if (existingCategory.isSystem) {
            // 仅允许更新 sortOrder（拖拽排序）
            if (existingCategory.sortOrder != updatedCategory.sortOrder) {
                val categoryToUpdate = existingCategory.copy(sortOrder = updatedCategory.sortOrder)
                return categoryRepository.save(categoryToUpdate)
            }
            // 其他字段有任何修改都拒绝
            if (existingCategory.name != updatedCategory.name ||
                existingCategory.icon != updatedCategory.icon ||
                existingCategory.color != updatedCategory.color ||
                existingCategory.type != updatedCategory.type ||
                existingCategory.parentId != updatedCategory.parentId) {
                throw ApiException(ErrorCode.BAD_REQUEST, "系统分类不能修改，只能通过配置文件版本更新")
            }
            // 没有任何修改，直接返回
            return existingCategory
        }

        // 用户自定义分类的修改逻辑
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

        // 检查是否有关联的交易记录
        val hasTransactions = transactionRepository.existsByCategoryIdAndIsActiveTrue(categoryId)
        if (hasTransactions) {
            throw ApiException(ErrorCode.BAD_REQUEST, "该分类下有交易记录，无法删除")
        }

        // 软删除
        val categoryToDelete = category.copy(isActive = false)
        categoryRepository.save(categoryToDelete)
    }

    @Transactional
    fun initDefaultCategories(userId: Long): List<Category> {
        logger.info("开始初始化默认分类（恢复到初始状态），用户ID: {}", userId)

        // 1. 软删除用户的所有活跃分类（保留历史记录）
        val existingCategories = categoryRepository.findByUserIdAndIsActiveTrueOrderByTypeAscSortOrderAscNameAsc(userId)
        existingCategories.forEach { category ->
            val deletedCategory = category.copy(isActive = false)
            categoryRepository.save(deletedCategory)
        }
        logger.info("已软删除用户 {} 的 {} 个现有分类", userId, existingCategories.size)

        // 2. 从配置文件重新创建或激活分类
        val categories = mutableListOf<Category>()

        // 处理支出分类
        val expenseCategories = categoryConfig.getAllCategories("expense")
        expenseCategories.forEach { config ->
            val savedParent = createOrUpdateParentCategory(userId, config, "expense", null)
            categories.add(savedParent)

            // 处理子分类
            config.subcategories.forEach { subConfig ->
                val savedSub = createOrUpdateSubcategory(userId, subConfig, "expense", savedParent.id)
                categories.add(savedSub)
            }
        }

        // 处理收入分类
        val incomeCategories = categoryConfig.getAllCategories("income")
        incomeCategories.forEach { config ->
            val savedParent = createOrUpdateParentCategory(userId, config, "income", null)
            categories.add(savedParent)

            // 处理子分类
            config.subcategories.forEach { subConfig ->
                val savedSub = createOrUpdateSubcategory(userId, subConfig, "income", savedParent.id)
                categories.add(savedSub)
            }
        }

        logger.info("成功初始化默认分类，总共 {} 个", categories.size)
        return categories
    }

    /**
     * 创建或更新父分类（如果存在则重新激活，否则创建新记录）
     */
    private fun createOrUpdateParentCategory(
        userId: Long,
        config: CategoryConfigItem,
        type: String,
        parentId: Long?
    ): Category {
        // 查找是否已存在相同 config_id 的记录（包括软删除的）
        val existing = categoryRepository.findByUserIdAndConfigId(userId, config.id).firstOrNull()

        return if (existing != null) {
            // 存在：更新并重新激活
            val updated = existing.copy(
                name = config.name,
                icon = config.icon,
                color = config.color,
                sortOrder = config.sortOrder,
                isActive = true,
                parentId = parentId
            )
            categoryRepository.save(updated)
            logger.debug("重新激活父分类: configId={}, 名称={}", config.id, config.name)
            updated
        } else {
            // 不存在：创建新分类
            val newCategory = Category(
                userId = userId,
                name = config.name,
                type = type,
                icon = config.icon,
                color = config.color,
                sortOrder = config.sortOrder,
                isSystem = true,
                configId = config.id,
                isActive = true,
                parentId = parentId
            )
            val saved = categoryRepository.save(newCategory)
            logger.debug("创建新父分类: configId={}, 名称={}", config.id, config.name)
            saved
        }
    }

    /**
     * 创建或更新子分类（如果存在则重新激活，否则创建新记录）
     */
    private fun createOrUpdateSubcategory(
        userId: Long,
        config: SubcategoryConfigItem,
        type: String,
        parentId: Long?
    ): Category {
        // 查找是否已存在相同 config_id 的记录（包括软删除的）
        val existing = categoryRepository.findByUserIdAndConfigId(userId, config.id).firstOrNull()

        return if (existing != null) {
            // 存在：更新并重新激活
            val updated = existing.copy(
                name = config.name,
                icon = config.icon,
                color = config.color,
                sortOrder = 0, // 子分类使用固定排序
                isActive = true,
                parentId = parentId
            )
            categoryRepository.save(updated)
            logger.debug("重新激活子分类: configId={}, 名称={}", config.id, config.name)
            updated
        } else {
            // 不存在：创建新分类
            val newCategory = Category(
                userId = userId,
                name = config.name,
                type = type,
                icon = config.icon,
                color = config.color,
                sortOrder = 0, // 子分类使用固定排序
                isSystem = true,
                configId = config.id,
                isActive = true,
                parentId = parentId
            )
            val saved = categoryRepository.save(newCategory)
            logger.debug("创建新子分类: configId={}, 名称={}", config.id, config.name)
            saved
        }
    }

    /**
     * 同步系统分类（版本控制）
     *
     * 对比配置文件版本和数据库版本，如果版本不同则更新系统分类。
     * 更新策略：
     * 1. 更新现有系统分类的 name, icon, color, sortOrder（ID不变）
     * 2. 添加新增的系统分类
     * 3. 软删除配置文件中不存在的系统分类（如果没有被交易使用）
     *
     * @return 是否执行了同步操作
     */
    @Transactional
    fun syncSystemCategories(userId: Long): Boolean {
        // 0. 预防性清理：删除重复的 (user_id, config_id) 记录
        try {
            val allUserCategories = categoryRepository.findByUserId(userId)
            val groupedByConfig = allUserCategories
                .filter { it.configId != null }
                .groupBy { it.configId }

            var cleanedCount = 0
            groupedByConfig.forEach { (configId, categories) ->
                if (categories.size > 1) {
                    val toKeep = categories.minByOrNull { it.id!! }!!
                    val toDelete = categories.filter { it.id != toKeep.id }
                    toDelete.forEach { duplicate ->
                        logger.warn("清理重复的系统分类: userId={}, configId={}, id={}, name={}",
                            userId, configId, duplicate.id, duplicate.name)
                        categoryRepository.delete(duplicate)
                        cleanedCount++
                    }
                }
            }

            if (cleanedCount > 0) {
                categoryRepository.flush()
                logger.warn("已清理用户 {} 的 {} 个重复分类记录", userId, cleanedCount)
            }
        } catch (e: Exception) {
            logger.error("清理重复分类记录时发生错误: {}", e.message, e)
        }

        val configVersion = categoryConfig.version
        logger.info("开始同步系统分类，配置版本: {}", configVersion)

        val expenseCategories = categoryConfig.getAllCategories("expense")
        val incomeCategories = categoryConfig.getAllCategories("income")
        val allCategories = expenseCategories + incomeCategories

        // 1. 更新或创建主分类
        allCategories.forEach { config ->
            // 通过 configId 查找现有分类
            val existingCategories = categoryRepository.findByUserIdAndConfigIdAndIsSystemTrue(userId, config.id)

            if (existingCategories.isNotEmpty()) {
                // 处理重复记录：只保留第一条，删除其余的
                val toKeep = existingCategories.first()
                existingCategories.drop(1).forEach { duplicate ->
                    logger.warn("发现重复的系统分类: id={}, configId={}, 将删除", duplicate.id, duplicate.configId)
                    categoryRepository.delete(duplicate)
                }

                // 更新保留的系统分类（保持原有 ID，执行 UPDATE 而不是 INSERT）
                val updatedCategory = toKeep.copy(
                    id = toKeep.id,  // 关键：保持原有 ID，确保是更新而不是新建
                    name = config.name,
                    icon = config.icon,
                    color = config.color,
                    sortOrder = config.sortOrder,
                    isActive = true
                )
                categoryRepository.save(updatedCategory)
                logger.debug("更新系统分类: configId={}, 名称={}", config.id, config.name)
            } else {
                // 创建新的系统分类前，先检查并清理可能存在的重复记录（包括 is_system=false 的记录）
                val allDuplicates = categoryRepository.findByUserIdAndConfigId(userId, config.id)
                if (allDuplicates.isNotEmpty()) {
                    logger.warn("发现非系统分类记录与系统分类冲突: userId={}, configId={}, 删除 {} 条记录",
                        userId, config.id, allDuplicates.size)
                    allDuplicates.forEach { categoryRepository.delete(it) }
                    categoryRepository.flush()  // 立即生效
                }

                // 创建新的系统分类
                val newCategory = Category(
                    userId = userId,
                    name = config.name,
                    type = if (expenseCategories.contains(config)) "expense" else "income",
                    icon = config.icon,
                    color = config.color,
                    sortOrder = config.sortOrder,
                    isSystem = true,
                    configId = config.id,
                    isActive = true,
                    parentId = null
                )
                val savedCategory = categoryRepository.save(newCategory)
                logger.debug("创建系统分类: configId={}, 名称={}", config.id, config.name)

                // 创建该主分类的子分类
                config.subcategories.forEach { subConfig ->
                    // 同样，在创建子分类前也检查并清理重复记录
                    val allSubDuplicates = categoryRepository.findByUserIdAndConfigId(userId, subConfig.id)
                    if (allSubDuplicates.isNotEmpty()) {
                        logger.warn("发现非系统子分类记录与系统子分类冲突: userId={}, configId={}, 删除 {} 条记录",
                            userId, subConfig.id, allSubDuplicates.size)
                        allSubDuplicates.forEach { categoryRepository.delete(it) }
                        categoryRepository.flush()  // 立即生效
                    }

                    val newSub = Category(
                        userId = userId,
                        name = subConfig.name,
                        type = if (expenseCategories.contains(config)) "expense" else "income",
                        icon = subConfig.icon,
                        color = subConfig.color,
                        sortOrder = 0,
                        isSystem = true,
                        configId = subConfig.id,
                        isActive = true,
                        parentId = savedCategory.id
                    )
                    categoryRepository.save(newSub)
                    logger.debug("创建系统子分类: configId={}, 名称={}", subConfig.id, subConfig.name)
                }
            }
        }

        // 2. 更新子分类（针对已存在的父分类）
        val userSystemCategories = categoryRepository.findByUserIdAndIsSystemTrue(userId)
        allCategories.forEach { config ->
            val parentCategory = userSystemCategories.find { it.configId == config.id && it.parentId == null }

            config.subcategories.forEach { subConfig ->
                val existingSubs = categoryRepository.findByUserIdAndConfigIdAndIsSystemTrue(userId, subConfig.id)

                if (existingSubs.isNotEmpty()) {
                    // 处理重复记录：只保留第一条，删除其余的
                    val toKeep = existingSubs.first()
                    existingSubs.drop(1).forEach { duplicate ->
                        logger.warn("发现重复的系统子分类: id={}, configId={}, 将删除", duplicate.id, duplicate.configId)
                        categoryRepository.delete(duplicate)
                    }

                    // 更新保留的系统子分类（保持原有 ID，执行 UPDATE 而不是 INSERT）
                    val updatedSub = toKeep.copy(
                        id = toKeep.id,  // 关键：保持原有 ID，确保是更新而不是新建
                        name = subConfig.name,
                        icon = subConfig.icon,
                        color = subConfig.color,
                        isActive = true
                    )
                    categoryRepository.save(updatedSub)
                    categoryRepository.flush()  // 立即保存
                    logger.info("更新子分类: {}", subConfig.name)
                } else if (parentCategory != null) {
                    logger.info("创建子分类: {} (父分类: {})", subConfig.name, parentCategory.name)

                    // 创建新的子分类前，先检查并清理可能存在的重复记录
                    val allSubDuplicates2 = categoryRepository.findByUserIdAndConfigId(userId, subConfig.id)
                    if (allSubDuplicates2.isNotEmpty()) {
                        logger.warn("发现非系统子分类记录与系统子分类冲突: userId={}, configId={}, 删除 {} 条记录",
                            userId, subConfig.id, allSubDuplicates2.size)
                        allSubDuplicates2.forEach { categoryRepository.delete(it) }
                        categoryRepository.flush()  // 立即生效
                    }

                    // 创建新的子分类（父分类已存在）
                    val newSub = Category(
                        userId = userId,
                        name = subConfig.name,
                        type = if (expenseCategories.contains(config)) "expense" else "income",
                        icon = subConfig.icon,
                        color = subConfig.color,
                        sortOrder = 0,
                        isSystem = true,
                        configId = subConfig.id,
                        isActive = true,
                        parentId = parentCategory.id
                    )
                    categoryRepository.save(newSub)
                    categoryRepository.flush()  // 立即保存
                } else {
                    logger.warn("无法创建子分类 {}：父分类不存在 (configId={})", subConfig.name, config.id)
                }
            }
        }

        // 2.5. 修复子分类的parentId：检查子分类的父分类是否正确
        logger.info("开始检查和修复子分类的parentId...")
        val allSubcategories = userSystemCategories.filter { it.parentId != null }
        var fixedParentCount = 0

        allSubcategories.forEach { subcategory ->
            val subConfigId = subcategory.configId ?: return@forEach

            // 找到这个子分类应该属于哪个主分类
            val correctParentConfig = allCategories.find { config ->
                config.subcategories.any { it.id == subConfigId }
            }

            if (correctParentConfig != null) {
                // 找到正确的父分类实体
                val correctParent = userSystemCategories.find {
                    it.configId == correctParentConfig.id && it.parentId == null
                }

                if (correctParent != null && subcategory.parentId != correctParent.id) {
                    logger.warn("修复子分类parentId: {} (当前parentId={}, 正确parentId={})",
                        subcategory.name, subcategory.parentId, correctParent.id)
                    categoryRepository.save(subcategory.copy(parentId = correctParent.id))
                    fixedParentCount++
                }
            }
        }

        if (fixedParentCount > 0) {
            categoryRepository.flush()
            logger.info("已修复 {} 个子分类的parentId", fixedParentCount)
        }

        // 3. 软删除配置文件中不存在的系统分类（如果没有被交易使用）
        val configCategoryIds = allCategories.flatMap { config ->
            listOf(config.id) + config.subcategories.map { it.id }
        }.toSet()

        userSystemCategories.forEach { category ->
            val categoryConfigId = category.configId ?: return@forEach
            if (!configCategoryIds.contains(categoryConfigId)) {
                // 检查是否被交易使用
                val hasTransactions = transactionRepository.existsByCategoryIdAndIsActiveTrue(category.id!!)
                if (!hasTransactions) {
                    // 软删除
                    categoryRepository.save(category.copy(isActive = false))
                    logger.info("软删除废弃的系统分类: configId={}, 名称={}", categoryConfigId, category.name)
                } else {
                    logger.warn("保留废弃的系统分类（被交易使用）: configId={}, 名称={}", categoryConfigId, category.name)
                }
            }
        }

        // 4. 更新版本号
        val versionConfig = SystemConfig(
            key = SystemConfig.CATEGORY_VERSION_KEY,
            value = configVersion,
            description = "分类配置文件版本号"
        )
        systemConfigRepository.save(versionConfig)

        logger.info("系统分类同步完成，版本更新为: {}", configVersion)
        return true
    }

    /**
     * 强制同步系统分类（忽略版本号检查）
     * 用于修复数据库中配置数据不正确的问题
     *
     * @return 是否执行了同步操作
     */
    @Transactional
    fun forceSyncSystemCategories(userId: Long): Boolean {
        logger.info("强制同步系统分类，用户ID: {} (忽略版本号检查)", userId)

        val configVersion = categoryConfig.version
        val expenseCategories = categoryConfig.getAllCategories("expense")
        val incomeCategories = categoryConfig.getAllCategories("income")
        val allCategories = expenseCategories + incomeCategories

        var updatedCount = 0

        // 更新或创建主分类
        allCategories.forEach { config ->
            val existingCategories = categoryRepository.findByUserIdAndConfigIdAndIsSystemTrue(userId, config.id)

            if (existingCategories.isNotEmpty()) {
                // 更新现有分类
                val toKeep = existingCategories.first()
                existingCategories.drop(1).forEach { duplicate ->
                    logger.warn("发现重复的系统分类: id={}, configId={}, 将删除", duplicate.id, duplicate.configId)
                    categoryRepository.delete(duplicate)
                }

                val updatedCategory = toKeep.copy(
                    id = toKeep.id,
                    name = config.name,
                    icon = config.icon,
                    color = config.color,
                    sortOrder = config.sortOrder,
                    isActive = true
                )
                categoryRepository.save(updatedCategory)
                updatedCount++
                logger.debug("强制更新系统分类: configId={}, 名称={}, icon={}", config.id, config.name, config.icon)
            } else {
                // 创建新分类
                val newCategory = Category(
                    userId = userId,
                    name = config.name,
                    type = if (expenseCategories.contains(config)) "expense" else "income",
                    icon = config.icon,
                    color = config.color,
                    sortOrder = config.sortOrder,
                    isSystem = true,
                    configId = config.id,
                    isActive = true,
                    parentId = null
                )
                val savedCategory = categoryRepository.save(newCategory)
                logger.debug("强制创建系统分类: configId={}, 名称={}, icon={}", config.id, config.name, config.icon)
                updatedCount++
            }
        }

        logger.info("强制同步完成，更新了 {} 个主分类", updatedCount)
        return true
    }
}
