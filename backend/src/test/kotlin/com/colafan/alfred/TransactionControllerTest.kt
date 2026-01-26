package com.colafan.alfred

import com.fasterxml.jackson.databind.ObjectMapper
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule
import com.fasterxml.jackson.module.kotlin.kotlinModule
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
import java.time.LocalDateTime
import org.hamcrest.Matchers

/**
 * 交易控制器集成测试
 *
 * 测试交易管理相关的API接口：
 * - 创建交易
 * - 获取交易列表（支持筛选）
 * - 获取单个交易
 * - 更新交易
 * - 删除交易
 * - 交易与分类的关联
 * - 交易与账户的关联
 */
@SpringBootTest
@AutoConfigureMockMvc
@DisplayName("交易管理API测试")
class TransactionControllerTest {

    @Autowired
    private lateinit var mockMvc: MockMvc

    private val mapper = ObjectMapper()
        .registerModule(kotlinModule())
        .registerModule(JavaTimeModule())

    private lateinit var token: String
    private lateinit var testUserId: String

    private var testCategoryId: Long = 0
    private var testAccountId: Long = 0
    private var testTransactionId: Long = 0

    /**
     * 每个测试前登录获取 token，并创建测试数据
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

        // 创建测试分类
        val categoryRequest = mapOf(
            "name" to "测试餐饮",
            "type" to "expense",
            "icon" to "e532",
            "color" to "#FF5722"
        )

        val categoryResult = mockMvc.perform(
            post("/api/v1/categories")
                .contentType(MediaType.APPLICATION_JSON)
                .content(mapper.writeValueAsString(categoryRequest))
                .header("Authorization", "Bearer $token")
        )
            .andExpect(status().isCreated)
            .andExpect(jsonPath("$.id").exists())
            .andReturn()

        val categoryResponse = mapper.readTree(categoryResult.response.contentAsString)
        testCategoryId = categoryResponse.get("id").asLong()

        // 创建测试账户
        val accountRequest = mapOf(
            "name" to "测试现金账户",
            "accountType" to "CASH",
            "initialBalance" to 1000.0,
            "icon" to "e8d4",
            "color" to "#4CAF50"
        )

        val accountResult = mockMvc.perform(
            post("/api/v1/accounts")
                .contentType(MediaType.APPLICATION_JSON)
                .content(mapper.writeValueAsString(accountRequest))
                .header("Authorization", "Bearer $token")
        )
            .andExpect(status().isCreated)
            .andExpect(jsonPath("$.id").exists())
            .andReturn()

        val accountResponse = mapper.readTree(accountResult.response.contentAsString)
        testAccountId = accountResponse.get("id").asLong()
    }

    /**
     * 测试1：创建支出交易（应该成功）
     */
    @Test
    @DisplayName("应该成功创建支出交易")
    fun `should create expense transaction successfully`() {
        val transactionRequest = mapOf(
            "type" to "expense",
            "amount" to 50.0,
            "categoryId" to testCategoryId,
            "fromAccountId" to testAccountId,
            "transactionDate" to LocalDateTime.now(),
            "notes" to "测试交易备注",
            "location" to "测试地点",
            "tags" to "[\"午餐\", \"工作\"]",
            "imageCount" to 0
        )

        val result = mockMvc.perform(
            post("/api/v1/transactions")
                .contentType(MediaType.APPLICATION_JSON)
                .content(mapper.writeValueAsString(transactionRequest))
                .header("Authorization", "Bearer $token")
        )
            .andExpect(status().isCreated)
            .andExpect(jsonPath("$.id").exists())
            .andExpect(jsonPath("$.type").value("expense"))
            .andExpect(jsonPath("$.amount").value(50.0))
            .andExpect(jsonPath("$.categoryId").value(testCategoryId))
            .andExpect(jsonPath("$.notes").value("测试交易备注"))
            .andReturn()

        // 保存ID供后续测试使用
        val response = mapper.readTree(result.response.contentAsString)
        testTransactionId = response.get("id").asLong()
    }

    /**
     * 测试2：创建收入交易（应该成功）
     */
    @Test
    @DisplayName("应该成功创建收入交易")
    fun `should create income transaction successfully`() {
        val transactionRequest = mapOf(
            "type" to "income",
            "amount" to 5000.0,
            "categoryId" to testCategoryId,
            "toAccountId" to testAccountId,
            "transactionDate" to LocalDateTime.now(),
            "notes" to "工资收入"
        )

        mockMvc.perform(
            post("/api/v1/transactions")
                .contentType(MediaType.APPLICATION_JSON)
                .content(mapper.writeValueAsString(transactionRequest))
                .header("Authorization", "Bearer $token")
        )
            .andExpect(status().isCreated)
            .andExpect(jsonPath("$.type").value("income"))
            .andExpect(jsonPath("$.amount").value(5000.0))
    }

    /**
     * 测试3：获取交易列表（应该成功）
     */
    @Test
    @DisplayName("应该成功获取交易列表")
    fun `should get transactions list successfully`() {
        // 先创建两个交易
        val transactionRequest1 = mapOf(
            "type" to "expense",
            "amount" to 30.0,
            "categoryId" to testCategoryId,
            "fromAccountId" to testAccountId,
            "transactionDate" to LocalDateTime.now()
        )

        val transactionRequest2 = mapOf(
            "type" to "income",
            "amount" to 100.0,
            "categoryId" to testCategoryId,
            "toAccountId" to testAccountId,
            "transactionDate" to LocalDateTime.now()
        )

        mockMvc.perform(
            post("/api/v1/transactions")
                .contentType(MediaType.APPLICATION_JSON)
                .content(mapper.writeValueAsString(transactionRequest1))
                .header("Authorization", "Bearer $token")
        )
            .andExpect(status().isCreated)

        mockMvc.perform(
            post("/api/v1/transactions")
                .contentType(MediaType.APPLICATION_JSON)
                .content(mapper.writeValueAsString(transactionRequest2))
                .header("Authorization", "Bearer $token")
        )
            .andExpect(status().isCreated)

        // 获取所有交易
        mockMvc.perform(
            get("/api/v1/transactions")
                .header("Authorization", "Bearer $token")
        )
            .andExpect(status().isOk)
            .andExpect(jsonPath("$").isArray)
            .andExpect(jsonPath("$").value(Matchers.hasSize<Any>(Matchers.greaterThanOrEqualTo(2))))
            .andExpect(header().exists("X-Total-Count"))
    }

    /**
     * 测试4：按类型筛选交易（应该成功）
     */
    @Test
    @DisplayName("应该成功按类型筛选交易")
    fun `should filter transactions by type successfully`() {
        // 创建支出和收入交易
        val expenseRequest = mapOf(
            "type" to "expense",
            "amount" to 20.0,
            "categoryId" to testCategoryId,
            "fromAccountId" to testAccountId,
            "transactionDate" to LocalDateTime.now()
        )

        val incomeRequest = mapOf(
            "type" to "income",
            "amount" to 200.0,
            "categoryId" to testCategoryId,
            "toAccountId" to testAccountId,
            "transactionDate" to LocalDateTime.now()
        )

        mockMvc.perform(
            post("/api/v1/transactions")
                .contentType(MediaType.APPLICATION_JSON)
                .content(mapper.writeValueAsString(expenseRequest))
                .header("Authorization", "Bearer $token")
        )

        mockMvc.perform(
            post("/api/v1/transactions")
                .contentType(MediaType.APPLICATION_JSON)
                .content(mapper.writeValueAsString(incomeRequest))
                .header("Authorization", "Bearer $token")
        )

        // 筛选支出交易
        mockMvc.perform(
            get("/api/v1/transactions")
                .param("type", "expense")
                .header("Authorization", "Bearer $token")
        )
            .andExpect(status().isOk)
            .andExpect(jsonPath("$").isArray)
            .andExpect(jsonPath("$[0].type").value("expense"))

        // 筛选收入交易
        mockMvc.perform(
            get("/api/v1/transactions")
                .param("type", "income")
                .header("Authorization", "Bearer $token")
        )
            .andExpect(status().isOk)
            .andExpect(jsonPath("$").isArray())
            .andExpect(jsonPath("$[0].type").value("income"))
    }

    /**
     * 测试5：按分类筛选交易（应该成功）
     */
    @Test
    @DisplayName("应该成功按分类筛选交易")
    fun `should filter transactions by category successfully`() {
        // 创建与测试分类关联的交易
        val transactionRequest = mapOf(
            "type" to "expense",
            "amount" to 40.0,
            "categoryId" to testCategoryId,
            "fromAccountId" to testAccountId,
            "transactionDate" to LocalDateTime.now()
        )

        mockMvc.perform(
            post("/api/v1/transactions")
                .contentType(MediaType.APPLICATION_JSON)
                .content(mapper.writeValueAsString(transactionRequest))
                .header("Authorization", "Bearer $token")
        )

        // 按分类筛选
        mockMvc.perform(
            get("/api/v1/transactions")
                .param("categoryId", testCategoryId.toString())
                .header("Authorization", "Bearer $token")
        )
            .andExpect(status().isOk)
            .andExpect(jsonPath("$").isArray())
            .andExpect(jsonPath("$.length()").value(1))
            .andExpect(jsonPath("$[0].categoryId").value(testCategoryId))
    }

    /**
     * 测试6：按金额范围筛选交易（应该成功）
     */
    @Test
    @DisplayName("应该成功按金额范围筛选交易")
    fun `should filter transactions by amount range successfully`() {
        // 创建不同金额的交易
        val transaction1 = mapOf(
            "type" to "expense",
            "amount" to 25.0,
            "categoryId" to testCategoryId,
            "fromAccountId" to testAccountId,
            "transactionDate" to LocalDateTime.now()
        )

        val transaction2 = mapOf(
            "type" to "expense",
            "amount" to 75.0,
            "categoryId" to testCategoryId,
            "fromAccountId" to testAccountId,
            "transactionDate" to LocalDateTime.now()
        )

        mockMvc.perform(
            post("/api/v1/transactions")
                .contentType(MediaType.APPLICATION_JSON)
                .content(mapper.writeValueAsString(transaction1))
                .header("Authorization", "Bearer $token")
        )

        mockMvc.perform(
            post("/api/v1/transactions")
                .contentType(MediaType.APPLICATION_JSON)
                .content(mapper.writeValueAsString(transaction2))
                .header("Authorization", "Bearer $token")
        )

        // 筛选金额 >= 50 的交易
        mockMvc.perform(
            get("/api/v1/transactions")
                .param("minAmount", "50.0")
                .header("Authorization", "Bearer $token")
        )
            .andExpect(status().isOk)
            .andExpect(jsonPath("$").isArray())
            .andExpect(jsonPath("$[0].amount").value(75.0))
    }

    /**
     * 测试7：获取单个交易（应该成功）
     */
    @Test
    @DisplayName("应该成功获取单个交易")
    fun `should get single transaction successfully`() {
        // 先创建交易
        val transactionRequest = mapOf(
            "type" to "expense",
            "amount" to 60.0,
            "categoryId" to testCategoryId,
            "fromAccountId" to testAccountId,
            "transactionDate" to LocalDateTime.now(),
            "notes" to "获取单个交易测试"
        )

        val createResult = mockMvc.perform(
            post("/api/v1/transactions")
                .contentType(MediaType.APPLICATION_JSON)
                .content(mapper.writeValueAsString(transactionRequest))
                .header("Authorization", "Bearer $token")
        )
            .andExpect(status().isCreated)
            .andReturn()

        val transactionId = mapper.readTree(createResult.response.contentAsString)
            .get("id").asLong()

        // 获取单个交易
        mockMvc.perform(
            get("/api/v1/transactions/$transactionId")
                .header("Authorization", "Bearer $token")
        )
            .andExpect(status().isOk)
            .andExpect(jsonPath("$.id").value(transactionId))
            .andExpect(jsonPath("$.notes").value("获取单个交易测试"))
    }

    /**
     * 测试8：更新交易（应该成功）
     */
    @Test
    @DisplayName("应该成功更新交易")
    fun `should update transaction successfully`() {
        // 先创建交易
        val transactionRequest = mapOf(
            "type" to "expense",
            "amount" to 35.0,
            "categoryId" to testCategoryId,
            "fromAccountId" to testAccountId,
            "transactionDate" to LocalDateTime.now(),
            "notes" to "原始备注"
        )

        val createResult = mockMvc.perform(
            post("/api/v1/transactions")
                .contentType(MediaType.APPLICATION_JSON)
                .content(mapper.writeValueAsString(transactionRequest))
                .header("Authorization", "Bearer $token")
        )
            .andExpect(status().isCreated)
            .andReturn()

        val transactionId = mapper.readTree(createResult.response.contentAsString)
            .get("id").asLong()

        // 更新交易
        val updateRequest = mapOf(
            "type" to "expense",
            "amount" to 45.0,
            "categoryId" to testCategoryId,
            "fromAccountId" to testAccountId,
            "transactionDate" to LocalDateTime.now(),
            "notes" to "更新后的备注"
        )

        mockMvc.perform(
            put("/api/v1/transactions/$transactionId")
                .contentType(MediaType.APPLICATION_JSON)
                .content(mapper.writeValueAsString(updateRequest))
                .header("Authorization", "Bearer $token")
        )
            .andExpect(status().isOk)
            .andExpect(jsonPath("$.id").value(transactionId))
            .andExpect(jsonPath("$.amount").value(45.0))
            .andExpect(jsonPath("$.notes").value("更新后的备注"))
    }

    /**
     * 测试9：删除交易（应该成功）
     */
    @Test
    @DisplayName("应该成功删除交易")
    fun `should delete transaction successfully`() {
        // 先创建交易
        val transactionRequest = mapOf(
            "type" to "expense",
            "amount" to 55.0,
            "categoryId" to testCategoryId,
            "fromAccountId" to testAccountId,
            "transactionDate" to LocalDateTime.now()
        )

        val createResult = mockMvc.perform(
            post("/api/v1/transactions")
                .contentType(MediaType.APPLICATION_JSON)
                .content(mapper.writeValueAsString(transactionRequest))
                .header("Authorization", "Bearer $token")
        )
            .andExpect(status().isCreated)
            .andReturn()

        val transactionId = mapper.readTree(createResult.response.contentAsString)
            .get("id").asLong()

        // 删除交易
        mockMvc.perform(
            delete("/api/v1/transactions/$transactionId")
                .header("Authorization", "Bearer $token")
        )
            .andExpect(status().isNoContent)

        // 验证交易已删除
        mockMvc.perform(
            get("/api/v1/transactions/$transactionId")
                .header("Authorization", "Bearer $token")
        )
            .andExpect(status().isNotFound)
    }

    /**
     * 测试10：未授权访问（应该失败）
     */
    @Test
    @DisplayName("未授权访问应该返回403")
    fun `should return 403 for unauthorized access`() {
        mockMvc.perform(
            get("/api/v1/transactions")
        )
            .andExpect(status().isForbidden)
    }

    /**
     * 测试11：创建交易时金额为负数（应该失败）
     */
    @Test
    @DisplayName("创建交易金额为负数应该返回400")
    fun `should return 400 when creating transaction with negative amount`() {
        // 发送负金额，这会触发@Positive验证失败
        val invalidRequest = mapOf(
            "type" to "expense",
            "amount" to -50.0,
            "categoryId" to testCategoryId,
            "fromAccountId" to testAccountId,
            "transactionDate" to LocalDateTime.now()
        )

        mockMvc.perform(
            post("/api/v1/transactions")
                .contentType(MediaType.APPLICATION_JSON)
                .content(mapper.writeValueAsString(invalidRequest))
                .header("Authorization", "Bearer $token")
        )
            .andExpect(status().isBadRequest)
    }
}
