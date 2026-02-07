# 单元测试编写指南

> **原则：测试和代码同步编写，先写测试再写实现**

---

## TDD 工作流程

```
┌─────────────────────────────────────────────────────────┐
│  TDD (Test-Driven Development) 循环                     │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  1. 🔴 Red：编写失败的测试                               │
│     - 先写测试用例                                       │
│     - 运行测试（失败，因为功能还没实现）                  │
│     ↓                                                  │
│  2. 🟢 Green：编写最少代码使测试通过                     │
│     - 编写实现代码                                       │
│     - 运行测试（通过）                                   │
│     ↓                                                  │
│  3. 🔵 Refactor：重构代码                                │
│     - 优化代码结构                                       │
│     - 保持测试通过                                       │
│     ↓                                                  │
│  4. 重复循环                                            │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

---

## Kotlin 单元测试模板

### Service 层测试

```kotlin
package com.colafan.alfred.service

import org.junit.jupiter.api.Test
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.DisplayName
import org.junit.jupiter.api.assertThrows
import io.mockk.*
import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.extension.ExtendWith
import org.springframework.test.context.junit.jupiter.SpringExtension

@ExtendWith(SpringExtension::class)
@DisplayName("TransactionService 测试")
class TransactionServiceTest {

    // Mock 依赖
    private val transactionRepository: TransactionRepository = mockk()
    private val accountRepository: AccountRepository = mockk()
    private val categoryRepository: CategoryRepository = mockk()

    private lateinit var service: TransactionService

    @BeforeEach
    fun setup() {
        service = TransactionService(
            transactionRepository,
            accountRepository,
            categoryRepository
        )
    }

    @Test
    @DisplayName("创建支出交易 - 成功")
    fun `should create expense transaction successfully`() {
        // Given (准备数据)
        val request = CreateTransactionRequest(
            type = TransactionType.EXPENSE,
            amount = 100.0,
            fromAccountId = 1,
            categoryId = 1,
            transactionDate = "2026-02-07T12:00:00"
        )

        val account = Account(id = 1, name = "测试账户")
        val category = Category(id = 1, name = "餐饮")

        every { accountRepository.findById(1) } returns Optional.of(account)
        every { categoryRepository.findById(1) } returns Optional.of(category)
        every { transactionRepository.save(any()) } returnsArgument 0

        // When (执行操作)
        val result = service.createTransaction(request)

        // Then (验证结果)
        assertThat(result).isNotNull
        assertThat(result.amount).isEqualTo(100.0)
        assertThat(result.type).isEqualTo(TransactionType.EXPENSE)

        // 验证依赖调用
        verify(exactly = 1) { transactionRepository.save(any()) }
    }

    @Test
    @DisplayName("创建交易 - 账户不存在抛出异常")
    fun `should throw exception when account not found`() {
        // Given
        val request = CreateTransactionRequest(
            type = TransactionType.EXPENSE,
            amount = 100.0,
            fromAccountId = 999,
            categoryId = 1,
            transactionDate = "2026-02-07T12:00:00"
        )

        every { accountRepository.findById(999) } returns Optional.empty()

        // When & Then
        val exception = assertThrows<NotFoundException> {
            service.createTransaction(request)
        }

        assertThat(exception.message).contains("账户不存在")
        verify(never) { transactionRepository.save(any()) }
    }

    @Test
    @DisplayName("计算账户余额 - 支出减少余额")
    fun `should calculate balance correctly for expense`() {
        // Given
        val transaction = Transaction(
            id = 1,
            type = TransactionType.EXPENSE,
            amount = 50.0,
            fromAccountId = 1
        )

        val currentBalance = AccountBalance(
            currency = "CNY",
            balance = 100.0
        )

        // When
        val newBalance = service.calculateNewBalance(transaction, currentBalance)

        // Then
        assertThat(newBalance).isEqualTo(50.0) // 100 - 50 = 50
    }
}
```

### Controller 层集成测试

```kotlin
package com.colafan.alfred.controller

import org.junit.jupiter.api.Test
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.DisplayName
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc
import org.springframework.boot.test.context.SpringBootTest
import org.springframework.http.MediaType
import org.springframework.test.web.servlet.MockMvc
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*
import org.springframework.test.web.servlet.result.MockMvcResultMatchers.*
import com.fasterxml.jackson.module.kotlin.jacksonObjectMapper
import com.fasterxml.jackson.module.kotlin.readValue

@SpringBootTest
@AutoConfigureMockMvc
@DisplayName("TransactionController 集成测试")
class TransactionControllerTest {

    @Autowired
    private lateinit var mockMvc: MockMvc

    @Autowired
    private lateinit var objectMapper: com.fasterxml.jackson.databind.ObjectMapper

    private var token: String = ""

    @BeforeEach
    fun setup() {
        // 登录获取 token
        val loginResult = mockMvc.perform(post("/api/v1/auth/login")
            .contentType(MediaType.APPLICATION_JSON)
            .content("""{"username":"test003","password":"test003"}"""))
            .andExpect(status().isOk)
            .andReturn()

        val response = objectMapper.readTree(loginResult.response.contentAsString)
        token = response.path("data").path("token").asText()
    }

    @Test
    @DisplayName("创建交易 - 成功")
    fun `should create transaction successfully`() {
        // Given
        val request = mapOf(
            "type" to "expense",
            "amount" to 50.0,
            "fromAccountId" to 1,
            "categoryId" to 1,
            "transactionDate" to "2026-02-07T12:00:00"
        )

        // When & Then
        mockMvc.perform(post("/api/v1/transactions")
            .header("Authorization", "Bearer $token")
            .contentType(MediaType.APPLICATION_JSON)
            .content(objectMapper.writeValueAsString(request)))
            .andExpect(status().isOk)
            .andExpect(jsonPath("$.success").value(true))
            .andExpect(jsonPath("$.data.amount").value(50.0))
    }

    @Test
    @DisplayName("获取交易列表 - 成功")
    fun `should get transactions list successfully`() {
        mockMvc.perform(get("/api/v1/transactions")
            .header("Authorization", "Bearer $token"))
            .andExpect(status().isOk)
            .andExpect(jsonPath("$.success").value(true))
            .andExpect(jsonPath("$.data").isArray())
    }

    @Test
    @DisplayName("创建交易 - 未认证返回 401")
    fun `should return 401 when not authenticated`() {
        val request = mapOf(
            "type" to "expense",
            "amount" to 50.0,
            "fromAccountId" to 1
        )

        mockMvc.perform(post("/api/v1/transactions")
            .contentType(MediaType.APPLICATION_JSON)
            .content(objectMapper.writeValueAsString(request)))
            .andExpect(status().isUnauthorized)
    }
}
```

### Repository 屋试

```kotlin
package com.colafan.alfred.repository

import org.junit.jupiter.api.Test
import org.junit.jupiter.api.DisplayName
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest
import org.springframework.boot.test.autoconfigure.orm.jpa.TestEntityManager
import org.assertj.core.api.Assertions.assertThat
import com.colafan.alfred.entity.Transaction
import com.colafan.alfred.entity.TransactionType

@DataJpaTest
@DisplayName("TransactionRepository 数据层测试")
class TransactionRepositoryTest {

    @Autowired
    private lateinit var repository: TransactionRepository

    @Autowired
    private lateinit var entityManager: TestEntityManager

    @Test
    @DisplayName("查找用户的交易 - 成功")
    fun `should find transactions by user id`() {
        // Given
        val transaction = Transaction(
            type = TransactionType.EXPENSE,
            amount = 100.0,
            userId = 1,
            fromAccountId = 1,
            categoryId = 1
        )
        entityManager.persist(transaction)
        entityManager.flush()

        // When
        val result = repository.findByUserId(1)

        // Then
        assertThat(result).hasSize(1)
        assertThat(result[0].amount).isEqualTo(100.0)
    }

    @Test
    @DisplayName("计算用户总支出 - 正确")
    fun `should calculate total expense correctly`() {
        // Given
        val t1 = Transaction(type = TransactionType.EXPENSE, amount = 50.0, userId = 1)
        val t2 = Transaction(type = TransactionType.EXPENSE, amount = 30.0, userId = 1)
        entityManager.persist(t1)
        entityManager.persist(t2)
        entityManager.flush()

        // When
        val total = repository.sumExpensesByUserId(1)

        // Then
        assertThat(total).isEqualTo(80.0)
    }
}
```

---

## 测试命名规范

### 测试方法命名

使用反引号包裹，用自然语言描述测试场景：

```kotlin
// ✅ 好的命名
@Test
fun `should create transaction successfully`() { }

@Test
fun `should throw exception when account balance is insufficient`() { }

@Test
fun `should return empty list when user has no transactions`() { }

// ❌ 不好的命名
@Test
fun testCreate() { }  // 太模糊
@Test
fun test1() { }       // 没有说明
```

### DisplayName

使用 `@DisplayName` 提供中文描述：

```kotlin
@Test
@DisplayName("创建交易 - 成功")
fun `should create transaction successfully`() { }
```

---

## 测试结构：Given-When-Then

```kotlin
@Test
fun `test name`() {
    // Given：准备测试数据
    val input = ...

    // When：执行被测试的操作
    val result = service.doSomething(input)

    // Then：验证结果
    assertThat(result).isEqualTo(expected)
}
```

---

## Mock 使用规范

### 使用 MockK

```kotlin
// 1. Mock 依赖
private val repository: TransactionRepository = mockk()

// 2. 定义 Mock 行为
every { repository.findById(1) } returns Optional.of(transaction)
every { repository.save(any()) } returnsArgument 0
every { repository.findAll() } throws RuntimeException("DB error")

// 3. 验证调用
verify(exactly = 1) { repository.findById(1) }
verify(never) { repository.delete(any()) }

// 4. 松弛 Mock（可选）
private val service: SomeService = mockk(relaxed = true)
```

---

## 断言使用

### AssertJ（推荐）

```kotlin
import org.assertj.core.api.Assertions.assertThat

// 对象断言
assertThat(result).isNotNull()
assertThat(result.id).isEqualTo(1)
assertThat(result.name).isEqualTo("测试")

// 集合断言
assertThat(list).hasSize(3)
assertThat(list).extracting("name").contains("A", "B")
assertThat(list).allMatch { it.amount > 0 }

// 异常断言
assertThrows<NotFoundException> {
    service.get(999)
}
```

### MockMvc 结果验证

```kotlin
mockMvc.perform(get("/api/v1/transactions"))
    .andExpect(status().isOk)
    .andExpect(jsonPath("$.success").value(true))
    .andExpect(jsonPath("$.data").isArray())
    .andExpect(jsonPath("$.data[0].amount").value(50.0))
```

---

## 运行测试

### 运行所有测试

```bash
cd backend
./gradlew test
```

### 运行单个测试类

```bash
./gradlew test --tests "com.colafan.alfred.service.TransactionServiceTest"
```

### 运行单个测试方法

```bash
./gradlew test --tests "com.colafan.alfred.service.TransactionServiceTest.should create transaction successfully"
```

### 查看测试报告

```bash
# HTML 报告
open build/reports/tests/test/index.html

# 控制台输出
./gradlew test --info
```

---

## 测试覆盖率

### 生成覆盖率报告

```bash
./gradlew test jacocoTestReport
```

### 查看报告

```bash
open build/reports/jacoco/test/html/index.html
```

### 覆盖率目标

- **Service 层**：≥ 80%
- **Controller 层**：≥ 70%
- **Repository 层**：≥ 60%

---

## 最佳实践

### ✅ 应该做的

1. **先写测试，再写代码**（TDD）
2. **一个测试只验证一个功能点**
3. **使用 Given-When-Then 结构**
4. **测试命名清晰描述场景**
5. **使用 Mock 隔离依赖**
6. **测试边界条件和异常情况**
7. **保持测试快速运行**
8. **测试应该是独立的**

### ❌ 不应该做的

1. **不要测试第三方库**（只测试自己的代码）
2. **不要在测试中写复杂逻辑**
3. **不要忽略测试失败**
4. **不要写依赖执行顺序的测试**
5. **不要在测试中访问外部服务**（使用 Mock）
6. **不要测试私有方法**（测试公共接口）

---

## 测试用例设计

### 正常场景

```kotlin
@Test
fun `should create transaction with valid data`() { }
```

### 边界条件

```kotlin
@Test
fun `should reject zero amount`() { }

@Test
fun `should reject negative amount`() { }

@Test
fun `should handle very large amount`() { }
```

### 异常情况

```kotlin
@Test
fun `should throw exception when account not found`() { }

@Test
fun `should throw exception when category not found`() { }

@Test
fun `should handle database error gracefully`() { }
```

### 状态验证

```kotlin
@Test
fun `should update account balance after transaction`() { }

@Test
fun `should set transaction date to current time if not provided`() { }
```

---

## 完整示例：创建交易功能

### 测试文件

```kotlin
// backend/src/test/kotlin/com/colafan/alfred/service/TransactionServiceTest.kt

package com.colafan.alfred.service

import org.junit.jupiter.api.Test
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.DisplayName
import io.mockk.*
import org.assertj.core.api.Assertions.assertThat

@DisplayName("TransactionService 测试")
class TransactionServiceTest {

    private val transactionRepository: TransactionRepository = mockk()
    private val accountRepository: AccountRepository = mockk()
    private lateinit var service: TransactionService

    @BeforeEach
    fun setup() {
        service = TransactionService(transactionRepository, accountRepository)
    }

    @Test
    @DisplayName("创建支出交易 - 成功")
    fun `should create expense transaction successfully`() {
        // Given
        val request = CreateTransactionRequest(
            type = TransactionType.EXPENSE,
            amount = 100.0,
            fromAccountId = 1,
            categoryId = 1,
            transactionDate = "2026-02-07T12:00:00"
        )

        val account = Account(id = 1, name = "测试账户")
        every { accountRepository.findById(1) } returns Optional.of(account)
        every { transactionRepository.save(any()) } returnsArgument 0

        // When
        val result = service.createTransaction(request)

        // Then
        assertThat(result.amount).isEqualTo(100.0)
        verify(exactly = 1) { transactionRepository.save(any()) }
    }

    @Test
    @DisplayName("创建交易 - 账户不存在")
    fun `should throw exception when account not found`() {
        // Given
        val request = CreateTransactionRequest(
            type = TransactionType.EXPENSE,
            amount = 100.0,
            fromAccountId = 999,
            categoryId = 1
        )

        every { accountRepository.findById(999) } returns Optional.empty()

        // When & Then
        assertThrows<NotFoundException> {
            service.createTransaction(request)
        }
    }
}
```

### 运行测试

```bash
cd backend
./gradlew test --tests "TransactionServiceTest"
```

### 验证结果

```bash
# 查看报告
open build/reports/tests/test/index.html

# 应该看到：
# ✅ should create expense transaction successfully
# ✅ should throw exception when account not found
```

---

## 总结

### TDD 的好处

1. **代码质量更高**：有测试保障
2. **设计更好**：可测试的代码设计更好
3. **重构安全**：有测试保护
4. **文档作用**：测试是最好的文档
5. **开发效率**：减少调试时间

### 记住

- **先写测试，再写代码**
- **测试和代码同步提交**
- **运行 `./gradlew test` 确保通过**
- **然后才进行 Chrome MCP 集成验证**

---

*最后更新：2026-02-07*
