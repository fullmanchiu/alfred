package com.colafan.alfred

import com.colafan.alfred.controller.UserDataController
import com.colafan.alfred.dto.request.LoginRequest
import com.colafan.alfred.entity.Category
import com.colafan.alfred.repository.CategoryRepository
import com.colafan.alfred.repository.UserRepository
import com.colafan.alfred.service.CategoryService
import com.colafan.alfred.service.UserDataResetService
import com.fasterxml.jackson.databind.ObjectMapper
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.Test
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc
import org.springframework.boot.test.context.SpringBootTest
import org.springframework.http.MediaType
import org.springframework.security.crypto.password.PasswordEncoder
import org.springframework.test.web.servlet.MockMvc
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders
import org.springframework.test.web.servlet.result.MockMvcResultMatchers
import org.springframework.transaction.annotation.Transactional

/**
 * 用户数据恢复集成测试
 */
@SpringBootTest
@AutoConfigureMockMvc
class UserDataRestoreTest {

    @Autowired
    private lateinit var mockMvc: MockMvc

    @Autowired
    private lateinit var objectMapper: ObjectMapper

    @Autowired
    private lateinit var userRepository: UserRepository

    @Autowired
    private lateinit var categoryRepository: CategoryRepository

    @Autowired
    private lateinit var userDataResetService: UserDataResetService

    @Autowired
    private lateinit var categoryService: CategoryService

    @Autowired
    private lateinit var passwordEncoder: PasswordEncoder

    @Test
    @Transactional
    fun `should restore lance categories successfully`() {
        val userId = 2L  // lance 的用户 ID

        println("=== 测试开始：恢复 lance 的分类 ===")
        println("用户 ID: $userId")

        // 1. 检查恢复前的分类数量
        val allCategoriesBefore = categoryRepository.findByUserId(userId)
        val activeCategoriesBefore = categoryRepository.findByUserIdAndIsActiveTrueOrderByTypeAscSortOrderAscNameAsc(userId)
        val inactiveSystemCategories = allCategoriesBefore.filter { !it.isActive && it.isSystem }

        println("恢复前：")
        println("  - 总分类数：${allCategoriesBefore.size}")
        println("  - 活跃分类数：${activeCategoriesBefore.size}")
        println("  - 软删除的系统分类数：${inactiveSystemCategories.size}")

        // 2. 调用恢复接口
        println("\n开始恢复...")
        val restoredCount = userDataResetService.restoreSystemCategories(userId)
        println("恢复数量：$restoredCount")

        // 3. 检查恢复后的分类数量
        val allCategoriesAfter = categoryRepository.findByUserId(userId)
        val activeCategoriesAfter = categoryRepository.findByUserIdAndIsActiveTrueOrderByTypeAscSortOrderAscNameAsc(userId)
        val stillInactive = allCategoriesAfter.filter { !it.isActive && it.isSystem }

        println("\n恢复后：")
        println("  - 总分类数：${allCategoriesAfter.size}")
        println("  - 活跃分类数：${activeCategoriesAfter.size}")
        println("  - 仍软删除的系统分类数：${stillInactive.size}")

        // 4. 按类型统计
        val incomeCategories = activeCategoriesAfter.filter { it.type == "income" }
        val expenseCategories = activeCategoriesAfter.filter { it.type == "expense" }

        println("\n按类型统计：")
        println("  - 收入分类：${incomeCategories.size}")
        println("  - 支出分类：${expenseCategories.size}")

        // 5. 显示部分分类名称
        println("\n部分分类名称：")
        activeCategoriesAfter.take(10).forEach {
            println("  - ${it.name} (${it.type})" + if (it.parentId != null) " [子分类]" else " [父分类]")
        }

        println("\n=== 测试完成 ===")

        // 验证恢复成功
        assert(activeCategoriesAfter.size > activeCategoriesBefore.size) {
            "恢复后的活跃分类数量应该增加"
        }

        assert(activeCategoriesAfter.size >= 16) {
            "至少应该有 16 个活跃分类（10个支出 + 6个收入父分类）"
        }
    }

    @Test
    fun `should login and access categories via API`() {
        val loginRequest = LoginRequest(
            username = "lance",
            password = "921217qL"
        )

        // 1. 登录
        println("=== 测试登录并访问分类 API ===")
        println("用户名：${loginRequest.username}")

        val loginResult = mockMvc.perform(
            MockMvcRequestBuilders.post("/api/v1/auth/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(loginRequest))
        )
            .andExpect(MockMvcResultMatchers.status().isOk)
            .andReturn()

        val responseContent = loginResult.response.contentAsString
        val jsonNode = objectMapper.readTree(responseContent)
        val token = jsonNode.path("token").asText()

        println("登录成功，Token: ${token.take(50)}...")

        // 2. 访问分类 API
        val categoriesResult = mockMvc.perform(
            MockMvcRequestBuilders.get("/api/v1/categories")
                .header("Authorization", "Bearer $token")
        )
            .andExpect(MockMvcResultMatchers.status().isOk)
            .andReturn()

        val categoriesContent = categoriesResult.response.contentAsString
        val categoriesJson = objectMapper.readTree(categoriesContent)
        val categoriesCount = categoriesJson.size()

        println("\n获取到的分类数量：$categoriesCount")

        // 3. 按类型统计
        val incomeResult = mockMvc.perform(
            MockMvcRequestBuilders.get("/api/v1/categories?type=income")
                .header("Authorization", "Bearer $token")
        )
            .andExpect(MockMvcResultMatchers.status().isOk)
            .andReturn()

        val incomeJson = objectMapper.readTree(incomeResult.response.contentAsString)
        println("收入分类数量：${incomeJson.size()}")

        val expenseResult = mockMvc.perform(
            MockMvcRequestBuilders.get("/api/v1/categories?type=expense")
                .header("Authorization", "Bearer $token")
        )
            .andExpect(MockMvcResultMatchers.status().isOk)
            .andReturn()

        val expenseJson = objectMapper.readTree(expenseResult.response.contentAsString)
        println("支出分类数量：${expenseJson.size()}")

        println("\n=== API 测试完成 ===")

        // 验证
        assert(categoriesCount > 0) { "应该能获取到分类数据" }
    }
}
