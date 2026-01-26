package com.colafan.alfred

import com.fasterxml.jackson.module.kotlin.jacksonObjectMapper
import org.hamcrest.Matchers
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.Test
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc
import org.springframework.boot.test.context.SpringBootTest
import org.springframework.http.MediaType
import org.springframework.test.context.ActiveProfiles
import org.springframework.test.web.servlet.MockMvc
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*
import org.springframework.test.web.servlet.result.MockMvcResultMatchers.*

/**
 * 账户控制器集成测试
 *
 * 测试账户管理相关的API接口：
 * - 获取账户列表
 * - 创建账户
 * - 更新账户
 * - 删除账户
 */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class AccountControllerTest {

    @Autowired
    private lateinit var mockMvc: MockMvc

    private val mapper = jacksonObjectMapper()

    private var authToken: String? = null

    /**
     * 每个测试前登录获取token
     */
    @BeforeEach
    fun setup() {
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
            .andReturn()

        val response = result.response.contentAsString
        // 从响应中提取token
        authToken = mapper.readTree(response).path("token").asText()
        println("获取到Token: ${authToken?.take(20)}...")
    }

    /**
     * 测试获取账户列表
     */
    @Test
    fun `should return accounts list when authenticated`() {
        val result = mockMvc.perform(
            get("/api/v1/accounts")
                .header("Authorization", "Bearer $authToken")
        )
            .andExpect(status().isOk)
            .andExpect(jsonPath("$.accounts").isArray)
            .andExpect(jsonPath("$.totalBalance").exists())
            .andReturn()
    }

    /**
     * 测试创建账户
     */
    @Test
    fun `should create account successfully`() {
        val timestamp = System.currentTimeMillis()
        val newAccount = mapOf(
            "name" to "测试账户_$timestamp",
            "accountType" to "SAVINGS",
            "initialBalance" to 1000.00,
            "currency" to "CNY"
        )

        val result = mockMvc.perform(
            post("/api/v1/accounts")
                .header("Authorization", "Bearer $authToken")
                .contentType(MediaType.APPLICATION_JSON)
                .content(mapper.writeValueAsString(newAccount))
        )
            .andExpect(status().isCreated)
            .andExpect(jsonPath("$.id").exists())
            .andExpect(jsonPath("$.name").exists())
            .andReturn()

        println("创建账户响应: ${result.response.contentAsString}")
    }

    /**
     * 测试未授权访问
     */
    @Test
    fun `should return 403 when accessing without token`() {
        mockMvc.perform(
            get("/api/v1/accounts")
        )
            .andExpect(status().isForbidden)
    }

    /**
     * 测试无效token访问
     */
    @Test
    fun `should return 401 when accessing with invalid token`() {
        mockMvc.perform(
            get("/api/v1/accounts")
                .header("Authorization", "Bearer invalid_token_12345")
        )
            .andExpect(status().isUnauthorized)
    }
}
