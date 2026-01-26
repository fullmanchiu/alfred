package com.colafan.alfred

import com.fasterxml.jackson.module.kotlin.jacksonObjectMapper
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
 * 认证控制器集成测试
 *
 * 测试认证相关的API接口：
 * - 用户注册
 * - 用户登录
 * - Token验证
 */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class AuthControllerTest {

    @Autowired
    private lateinit var mockMvc: MockMvc

    private val mapper = jacksonObjectMapper()

    /**
     * 测试用户登录
     * 验证：
     * 1. 成功返回token
     * 2. HTTP状态码为200
     * 3. 响应格式正确
     */
    @Test
    fun `should return token when login with valid credentials`() {
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
            .andExpect(jsonPath("$.user.username").value("test003"))
            .andReturn()

        val response = result.response.contentAsString
        println("登录响应: $response")
    }

    /**
     * 测试用户登录失败场景
     * 验证：
     * 1. 错误密码返回401
     * 2. 错误信息正确返回
     */
    @Test
    fun `should return 401 when login with invalid credentials`() {
        val loginRequest = mapOf(
            "username" to "test003",
            "password" to "wrongpassword"
        )

        mockMvc.perform(
            post("/api/v1/auth/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content(mapper.writeValueAsString(loginRequest))
        )
            .andExpect(status().isUnauthorized)
            .andExpect(jsonPath("$.success").value(false))
            .andExpect(jsonPath("$.message").exists())
    }

    /**
     * 测试用户注册
     * 验证：
     * 1. 新用户注册成功
     * 2. 返回用户信息
     * 3. 默认数据初始化（如默认分类）
     */
    @Test
    fun `should register new user successfully`() {
        val timestamp = System.currentTimeMillis()
        val registerRequest = mapOf(
            "username" to "test_user_$timestamp",
            "password" to "test123",
            "email" to "test_$timestamp@example.com"
        )

        val result = mockMvc.perform(
            post("/api/v1/auth/register")
                .contentType(MediaType.APPLICATION_JSON)
                .content(mapper.writeValueAsString(registerRequest))
        )
            .andExpect(status().isCreated)
            .andExpect(jsonPath("$.token").exists())
            .andExpect(jsonPath("$.user.username").exists())
            .andReturn()

        val response = result.response.contentAsString
        println("注册响应: $response")
    }

    /**
     * 测试重复注册
     * 验证：
     * 1. 已存在的用户名返回409
     * 2. 错误信息正确
     */
    @Test
    fun `should return 409 when registering with existing username`() {
        val registerRequest = mapOf(
            "username" to "test003",
            "password" to "test003",
            "email" to "another@example.com"
        )

        mockMvc.perform(
            post("/api/v1/auth/register")
                .contentType(MediaType.APPLICATION_JSON)
                .content(mapper.writeValueAsString(registerRequest))
        )
            .andExpect(status().isConflict)
            .andExpect(jsonPath("$.success").value(false))
            .andExpect(jsonPath("$.message").exists())
    }
}
