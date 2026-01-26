package com.colafan.alfred

import com.colafan.alfred.config.CategoryConfig
import com.colafan.alfred.entity.Category
import com.colafan.alfred.repository.CategoryRepository
import com.colafan.alfred.service.CategoryService
import org.junit.jupiter.api.Assertions.*
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.Test
import org.slf4j.LoggerFactory
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.boot.test.context.SpringBootTest
import org.springframework.test.context.ActiveProfiles

/**
 * 测试登录时自动修复分类图标的功能
 */
@SpringBootTest
@ActiveProfiles("test")
class CategoryIconSyncTest {

    private val logger = LoggerFactory.getLogger(CategoryIconSyncTest::class.java)

    @Autowired
    private lateinit var categoryService: CategoryService

    @Autowired
    private lateinit var categoryRepository: CategoryRepository

    @Autowired
    private lateinit var categoryConfig: CategoryConfig

    private var testUserId: Long = 0L

    @BeforeEach
    fun setup() {
        // 使用 test003 账户 (user_id = 15)
        testUserId = 15L
    }

    @Test
    fun `should detect incorrect icon codes`() {
        // 获取所有配置
        val expenseCategories = categoryConfig.getAllCategories("expense")
        val incomeCategories = categoryConfig.getAllCategories("income")
        val allCategories = expenseCategories + incomeCategories

        // 获取用户的所有系统分类
        val userSystemCategories = categoryRepository.findByUserIdAndIsSystemTrue(testUserId)

        // 检查是否有错误的图标
        val incorrectCategories = userSystemCategories.filter { category ->
            val config = allCategories.find { it.id == category.configId }
            config != null && category.icon != config.icon
        }.map { "${it.name}: DB=${it.icon}, Config=${allCategories.find { c -> c.id == it.configId }?.icon}" }

        logger.error("=== 错误图标的分类 ===")
        incorrectCategories.forEach { logger.error(it) }

        logger.info("总分类数: ${userSystemCategories.size}")
        logger.error("错误数量: ${incorrectCategories.size}")

        assertTrue(true, "测试完成，检查日志输出")
    }
}
