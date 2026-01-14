package com.colafan.alfred.config

import com.fasterxml.jackson.annotation.JsonProperty
import org.springframework.core.io.Resource
import org.springframework.stereotype.Component
import jakarta.annotation.PostConstruct
import com.fasterxml.jackson.databind.ObjectMapper
import org.slf4j.LoggerFactory
import org.springframework.core.io.ResourceLoader

@Component
class CategoryConfig(
    private val objectMapper: ObjectMapper,
    private val resourceLoader: ResourceLoader
) {
    private val logger = LoggerFactory.getLogger(CategoryConfig::class.java)

    var expenseCategories: List<CategoryConfigItem> = emptyList()
    var incomeCategories: List<CategoryConfigItem> = emptyList()

    @PostConstruct
    fun loadCategories() {
        try {
            val resource: Resource = resourceLoader.getResource("classpath:categories.json")
            val content = resource.inputStream.bufferedReader().use { it.readText() }
            val config = objectMapper.readValue(content, CategoryFileConfig::class.java)

            expenseCategories = config.expenseCategories
            incomeCategories = config.incomeCategories

            logger.info("成功加载分类配置: 支出分类 ${expenseCategories.size} 个, 收入分类 ${incomeCategories.size} 个")
        } catch (e: Exception) {
            logger.error("加载分类配置失败", e)
            throw RuntimeException("Failed to load category configuration", e)
        }
    }

    fun getAllCategories(type: String): List<CategoryConfigItem> {
        return when (type) {
            "expense" -> expenseCategories
            "income" -> incomeCategories
            else -> throw IllegalArgumentException("Unknown category type: $type")
        }
    }
}

data class CategoryFileConfig(
    @JsonProperty("expense_categories")
    val expenseCategories: List<CategoryConfigItem>,

    @JsonProperty("income_categories")
    val incomeCategories: List<CategoryConfigItem>
)

data class CategoryConfigItem(
    @JsonProperty("id")
    val id: Int,

    @JsonProperty("name")
    val name: String,

    @JsonProperty("icon")
    val icon: String,

    @JsonProperty("color")
    val color: String,

    @JsonProperty("sort_order")
    val sortOrder: Int,

    @JsonProperty("subcategories")
    val subcategories: List<SubcategoryConfigItem> = emptyList()
)

data class SubcategoryConfigItem(
    @JsonProperty("id")
    val id: Int,

    @JsonProperty("name")
    val name: String,

    @JsonProperty("icon")
    val icon: String,

    @JsonProperty("color")
    val color: String
)
