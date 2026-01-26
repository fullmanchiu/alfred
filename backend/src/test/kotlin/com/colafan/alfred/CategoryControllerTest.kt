package com.colafan.alfred

import com.fasterxml.jackson.module.kotlin.jacksonObjectMapper
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.DisplayName
import org.junit.jupiter.api.Test
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc
import org.springframework.boot.test.context.SpringBootTest
import org.springframework.http.MediaType
import org.springframework.test.web.servlet.MockMvc
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*
import org.springframework.test.web.servlet.result.MockMvcResultMatchers.*

/**
 * 分类控制器集成测试
 *
 * 测试分类管理相关的API接口：
 * - 创建分类
 * - 更新分类
 * - 删除分类
 * - 系统分类保护机制
 */
@SpringBootTest
@AutoConfigureMockMvc
@DisplayName("分类管理API测试")
class CategoryControllerTest {

    @Autowired
    private lateinit var mockMvc: MockMvc

    private val mapper = jacksonObjectMapper()

    private lateinit var token: String
    private lateinit var testUserId: String

    /**
     * 每个测试前登录获取 token
     */
    @BeforeEach
    fun setup() {
        // 登录获取 token
        val loginRequest = mapOf(
            "username" to "test003",
            "password" to "test003"
        )

        val result = mockMvc.perform(
            post("/api/v1/auth/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content(mapper.writeValueAsString(loginRequest))
        )
            .andExpect(status().isOk)
            .andExpect(jsonPath("$.token").exists())
            .andReturn()

        val response = mapper.readTree(result.response.contentAsString)
        token = response.get("token").asText()
        testUserId = response.path("user").path("id").asText()
    }

    /**
     * 测试1：删除空的自定义分类（应该成功）
     */
    @Test
    @DisplayName("应该成功删除空的自定义分类")
    fun `should delete empty custom category successfully`() {
        // 1. 先创建一个自定义分类
        val createRequest = mapOf(
            "name" to "测试分类",
            "type" to "expense",
            "icon" to "test",
            "color" to "#FF0000"
        )

        val createResult = mockMvc.perform(
            post("/api/v1/categories")
                .contentType(MediaType.APPLICATION_JSON)
                .content(mapper.writeValueAsString(createRequest))
                .header("Authorization", "Bearer $token")
        )
            .andExpect(status().isCreated)
            .andExpect(jsonPath("$.id").exists())
            .andReturn()

        val categoryId = mapper.readTree(createResult.response.contentAsString)
            .get("id").asLong()

        println("创建的分类ID: $categoryId")

        // 2. 删除该分类（应该成功）
        mockMvc.perform(
            delete("/api/v1/categories/$categoryId")
                .header("Authorization", "Bearer $token")
        )
            .andExpect(status().isNoContent)

        println("✅ 成功删除空的自定义分类 ID: $categoryId")
    }

    /**
     * 测试2：验证分类已删除（应该返回404）
     */
    @Test
    @DisplayName("删除后查询应该返回404")
    fun `should return 404 when querying deleted category`() {
        // 1. 创建并删除分类
        val createRequest = mapOf(
            "name" to "临时分类",
            "type" to "expense"
        )

        val createResult = mockMvc.perform(
            post("/api/v1/categories")
                .contentType(MediaType.APPLICATION_JSON)
                .content(mapper.writeValueAsString(createRequest))
                .header("Authorization", "Bearer $token")
        )
            .andExpect(status().isCreated)
            .andReturn()

        val categoryId = mapper.readTree(createResult.response.contentAsString)
            .get("id").asLong()

        // 2. 删除分类
        mockMvc.perform(
            delete("/api/v1/categories/$categoryId")
                .header("Authorization", "Bearer $token")
        )
            .andExpect(status().isNoContent)

        // 3. 验证分类已删除（应该返回404）
        mockMvc.perform(
            get("/api/v1/categories/$categoryId")
                .header("Authorization", "Bearer $token")
        )
            .andExpect(status().isNotFound)
            .andExpect(jsonPath("$.success").value(false))
            .andExpect(jsonPath("$.message").exists())

        println("✅ 验证删除后查询返回404")
    }

    /**
     * 测试3：创建带子分类的分类，然后删除父分类（应该失败）
     */
    @Test
    @DisplayName("删除有子分类的父分类应该返回错误")
    fun `should not delete parent category with subcategories`() {
        // 1. 创建父分类
        val parentRequest = mapOf(
            "name" to "父分类",
            "type" to "expense"
        )

        val parentResult = mockMvc.perform(
            post("/api/v1/categories")
                .contentType(MediaType.APPLICATION_JSON)
                .content(mapper.writeValueAsString(parentRequest))
                .header("Authorization", "Bearer $token")
        )
            .andExpect(status().isCreated)
            .andReturn()

        val parentId = mapper.readTree(parentResult.response.contentAsString)
            .get("id").asLong()

        // 2. 创建子分类
        val childRequest = mapOf(
            "name" to "子分类",
            "type" to "expense",
            "parentId" to parentId
        )

        mockMvc.perform(
            post("/api/v1/categories")
                .contentType(MediaType.APPLICATION_JSON)
                .content(mapper.writeValueAsString(childRequest))
                .header("Authorization", "Bearer $token")
        )
            .andExpect(status().isCreated)

        // 3. 尝试删除父分类（应该失败）
        mockMvc.perform(
            delete("/api/v1/categories/$parentId")
                .header("Authorization", "Bearer $token")
        )
            .andExpect(status().isBadRequest)
            .andExpect(jsonPath("$.success").value(false))
            .andExpect(jsonPath("$.message").value(org.hamcrest.Matchers.containsString("子分类")))

        println("✅ 正确阻止删除有子分类的父分类")

        // 清理：删除子分类后再删除父分类
        mockMvc.perform(
            delete("/api/v1/categories?parentId=$parentId")
                .header("Authorization", "Bearer $token")
        )
        mockMvc.perform(
            delete("/api/v1/categories/$parentId")
                .header("Authorization", "Bearer $token")
        )
    }

    /**
     * 测试4：创建交易记录关联到分类，然后删除分类（应该失败）
     */
    @Test
    @DisplayName("删除有关联交易的分类应该返回错误")
    fun `should not delete category with transactions`() {
        // 1. 创建分类
        val createRequest = mapOf(
            "name" to "测试分类",
            "type" to "expense"
        )

        val createResult = mockMvc.perform(
            post("/api/v1/categories")
                .contentType(MediaType.APPLICATION_JSON)
                .content(mapper.writeValueAsString(createRequest))
                .header("Authorization", "Bearer $token")
        )
            .andExpect(status().isCreated)
            .andReturn()

        val categoryId = mapper.readTree(createResult.response.contentAsString)
            .get("id").asLong()

        // 2. 创建关联的交易记录
        // 先获取账户
        val accountsResult = mockMvc.perform(
            get("/api/v1/accounts")
                .header("Authorization", "Bearer $token")
        )
            .andExpect(status().isOk)
            .andReturn()

        val accountsResponse = mapper.readTree(accountsResult.response.contentAsString)
        val accountsArray = accountsResponse.get("accounts")

        if (accountsArray != null && accountsArray.size() > 0) {
            val accountId = accountsArray[0].get("id").asLong()

            val transactionRequest = mapOf(
                "fromAccountId" to accountId,
                "categoryId" to categoryId,
                "amount" to 100.0,
                "type" to "expense",
                "transactionDate" to "2025-01-14T10:00:00",
                "notes" to "测试交易"
            )

            mockMvc.perform(
                post("/api/v1/transactions")
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(mapper.writeValueAsString(transactionRequest))
                    .header("Authorization", "Bearer $token")
            )
                .andExpect(status().isCreated)

            // 3. 尝试删除分类（应该失败）
            mockMvc.perform(
                delete("/api/v1/categories/$categoryId")
                    .header("Authorization", "Bearer $token")
            )
                .andExpect(status().isBadRequest)
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.message").value(org.hamcrest.Matchers.containsString("交易记录")))

            println("✅ 正确阻止删除有关联交易的分类")
        } else {
            println("⚠️ 跳过测试：没有可用的账户")
        }
    }

    /**
     * 测试5：修改系统分类的 type（应该失败）
     */
    @Test
    @DisplayName("不应该允许修改系统分类的类型")
    fun `should not update system category type`() {
        // 1. 获取系统分类
        val categoriesResult = mockMvc.perform(
            get("/api/v1/categories")
                .header("Authorization", "Bearer $token")
        )
            .andExpect(status().isOk)
            .andReturn()

        val categories = mapper.readTree(categoriesResult.response.contentAsString)
        val systemCategory = categories.find { it.path("isSystem").asBoolean() }

        if (systemCategory != null) {
            val categoryId = systemCategory.get("id").asLong()

            // 2. 尝试修改系统分类的 type
            val updateRequest = mapOf(
                "type" to "income"  // 尝试修改类型
            )

            mockMvc.perform(
                put("/api/v1/categories/$categoryId")
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(mapper.writeValueAsString(updateRequest))
                    .header("Authorization", "Bearer $token")
            )
                .andExpect(status().isBadRequest)
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.message").value(org.hamcrest.Matchers.containsString("系统分类")))

            println("✅ 正确阻止修改系统分类的 type")
        } else {
            println("⚠️ 跳过测试：没有找到系统分类")
        }
    }

    /**
     * 测试6：修改系统分类的 parentId（应该失败）
     */
    @Test
    @DisplayName("不应该允许修改系统分类的父分类")
    fun `should not update system category parentId`() {
        // 1. 获取系统分类
        val categoriesResult = mockMvc.perform(
            get("/api/v1/categories")
                .header("Authorization", "Bearer $token")
        )
            .andExpect(status().isOk)
            .andReturn()

        val categories = mapper.readTree(categoriesResult.response.contentAsString)
        val systemCategory = categories.find { it.path("isSystem").asBoolean() }

        if (systemCategory != null) {
            val categoryId = systemCategory.get("id").asLong()

            // 2. 创建一个自定义分类作为父分类
            val parentRequest = mapOf(
                "name" to "自定义父分类",
                "type" to "expense"
            )

            val parentResult = mockMvc.perform(
                post("/api/v1/categories")
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(mapper.writeValueAsString(parentRequest))
                    .header("Authorization", "Bearer $token")
            )
                .andExpect(status().isCreated)
                .andReturn()

            val parentId = mapper.readTree(parentResult.response.contentAsString)
                .get("id").asLong()

            // 3. 尝试修改系统分类的 parentId
            val updateRequest = mapOf(
                "parentId" to parentId
            )

            mockMvc.perform(
                put("/api/v1/categories/$categoryId")
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(mapper.writeValueAsString(updateRequest))
                    .header("Authorization", "Bearer $token")
            )
                .andExpect(status().isBadRequest)
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.message").value(org.hamcrest.Matchers.containsString("系统分类")))

            println("✅ 正确阻止修改系统分类的 parentId")
        } else {
            println("⚠️ 跳过测试：没有找到系统分类")
        }
    }

    /**
     * 测试7：修改系统分类的图标（应该失败）
     * 系统分类只能通过配置文件版本更新来修改，不允许用户通过API修改
     */
    @Test
    @DisplayName("不应该允许修改系统分类的图标")
    fun `should not update system category icon`() {
        // 1. 获取系统分类
        val categoriesResult = mockMvc.perform(
            get("/api/v1/categories")
                .header("Authorization", "Bearer $token")
        )
            .andExpect(status().isOk)
            .andReturn()

        val categories = mapper.readTree(categoriesResult.response.contentAsString)
        val systemCategory = categories.find { it.path("isSystem").asBoolean() }

        if (systemCategory != null) {
            val categoryId = systemCategory.get("id").asLong()
            val originalIcon = systemCategory.get("icon").asText()
            val newIcon = "new_icon_${System.currentTimeMillis()}"

            // 2. 尝试修改系统分类的图标（应该失败）
            val updateRequest = mapOf(
                "icon" to newIcon
            )

            mockMvc.perform(
                put("/api/v1/categories/$categoryId")
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(mapper.writeValueAsString(updateRequest))
                    .header("Authorization", "Bearer $token")
            )
                .andExpect(status().isBadRequest)
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.message").value(org.hamcrest.Matchers.containsString("系统分类")))

            println("✅ 正确阻止修改系统分类的图标: $originalIcon")
        } else {
            println("⚠️ 跳过测试：没有找到系统分类")
        }
    }

    /**
     * 测试8：允许修改系统分类的排序（拖拽排序功能）
     */
    @Test
    @DisplayName("应该允许修改系统分类的排序")
    fun `should update system category sortOrder`() {
        // 1. 获取系统分类
        val categoriesResult = mockMvc.perform(
            get("/api/v1/categories")
                .header("Authorization", "Bearer $token")
        )
            .andExpect(status().isOk)
            .andReturn()

        val categories = mapper.readTree(categoriesResult.response.contentAsString)
        val systemCategory = categories.find { it.path("isSystem").asBoolean() }

        if (systemCategory != null) {
            val categoryId = systemCategory.get("id").asLong()
            val originalSortOrder = systemCategory.get("sortOrder").asInt()
            val newSortOrder = originalSortOrder + 100

            // 2. 修改系统分类的排序（应该成功）
            val updateRequest = mapOf(
                "sortOrder" to newSortOrder
            )

            mockMvc.perform(
                put("/api/v1/categories/$categoryId")
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(mapper.writeValueAsString(updateRequest))
                    .header("Authorization", "Bearer $token")
            )
                .andExpect(status().isOk)
                .andExpect(jsonPath("$.sortOrder").value(newSortOrder))

            println("✅ 成功修改系统分类的排序: $originalSortOrder -> $newSortOrder")

            // 恢复原始排序
            val restoreRequest = mapOf(
                "sortOrder" to originalSortOrder
            )
            mockMvc.perform(
                put("/api/v1/categories/$categoryId")
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(mapper.writeValueAsString(restoreRequest))
                    .header("Authorization", "Bearer $token")
            )
        } else {
            println("⚠️ 跳过测试：没有找到系统分类")
        }
    }

    /**
     * 测试9：删除系统分类（应该失败）
     */
    @Test
    @DisplayName("不应该允许删除系统分类")
    fun `should not delete system category`() {
        // 1. 获取系统分类
        val categoriesResult = mockMvc.perform(
            get("/api/v1/categories")
                .header("Authorization", "Bearer $token")
        )
            .andExpect(status().isOk)
            .andReturn()

        val categories = mapper.readTree(categoriesResult.response.contentAsString)
        val systemCategory = categories.find { it.path("isSystem").asBoolean() }

        if (systemCategory != null) {
            val categoryId = systemCategory.get("id").asLong()
            val categoryName = systemCategory.get("name").asText()

            // 2. 尝试删除系统分类（应该失败）
            mockMvc.perform(
                delete("/api/v1/categories/$categoryId")
                    .header("Authorization", "Bearer $token")
            )
                .andExpect(status().isBadRequest)
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.message").value(org.hamcrest.Matchers.containsString("系统分类")))

            println("✅ 正确阻止删除系统分类: $categoryName (ID: $categoryId)")
        } else {
            println("⚠️ 跳过测试：没有找到系统分类")
        }
    }
}
