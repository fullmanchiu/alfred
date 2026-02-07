# 代码审查指南

> **核心原则：双重审查机制，确保代码质量**
>
> - **第一轮**：代码完成后立即审查
> - **第二轮**：提交前最终审查

---

## 双重审查机制

```
┌─────────────────────────────────────────────────────────┐
│  审查流程                                                │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  编写代码 + 单元测试                                     │
│     ↓                                                  │
│  【第一轮：代码自我审查】                                │
│     - 审查时机：代码刚写完                               │
│     - 审查重点：代码质量、规范、安全、性能                │
│     - 发现问题：立即修复                                 │
│     ↓                                                  │
│  运行单元测试                                            │
│     ↓                                                  │
│  Chrome MCP 集成验证                                     │
│     ↓                                                  │
│  【第二轮：提交前二次审查】                              │
│     - 审查时机：准备提交前                               │
│     - 审查重点：遗漏问题、完整性、最终确认                │
│     - 发现问题：修复并重新验证                           │
│     ↓                                                  │
│  提交代码                                               │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

---

## 第一轮：代码自我审查

### 审查时机
- 代码刚写完
- 单元测试编写完成
- 准备运行测试之前

### 审查清单

#### 1. 代码质量

**逻辑清晰**
```kotlin
// ✅ 好的代码：逻辑清晰
fun calculateTotalAmount(transactions: List<Transaction>): Double {
    return transactions.sumOf { it.amount }
}

// ❌ 不好的代码：逻辑混乱
fun calc(t: List<Transaction>): Double {
    var a = 0.0
    for (i in t) {
        a = a + i.amount
    }
    return a
}
```

**职责单一**
```kotlin
// ✅ 好的代码：函数职责单一
fun validateTransaction(transaction: Transaction): Boolean { }
fun saveTransaction(transaction: Transaction): Transaction { }
fun notifyUser(transaction: Transaction): Unit { }

// ❌ 不好的代码：一个函数做太多事
fun processTransaction(transaction: Transaction): Transaction {
    // 验证
    if (transaction.amount <= 0) throw Exception()
    // 保存
    val saved = repository.save(transaction)
    // 发送通知
    emailService.send(saved)
    return saved
}
```

**DRY 原则（Don't Repeat Yourself）**
```kotlin
// ✅ 好的代码：提取公共逻辑
private fun formatAmount(amount: Double): String {
    return "¥%.2f".format(amount)
}

fun displayTransaction(transaction: Transaction) {
    println(formatAmount(transaction.amount))
}

fun displayAccountBalance(balance: Double) {
    println(formatAmount(balance))
}

// ❌ 不好的代码：重复逻辑
fun displayTransaction(transaction: Transaction) {
    println("¥" + String.format("%.2f", transaction.amount))
}

fun displayAccountBalance(balance: Double) {
    println("¥" + String.format("%.2f", balance))
}
```

**命名清晰**
```kotlin
// ✅ 好的命名
val userAccountList: List<Account>
fun calculateTransactionTotal(amount: Double, fee: Double): Double
const val MAX_RETRY_COUNT = 3

// ❌ 不好的命名
val list: List<Account>
fun calc(a: Double, b: Double): Double
const val n = 3
```

#### 2. 代码规范

**Kotlin 风格**
```kotlin
// ✅ 好的代码：符合 Kotlin 风格
data class User(val name: String, val age: Int)

fun getUser(id: Long): User? {
    return userRepository.findById(id)
}

// ❌ 不好的代码：Java 风格
class User {
    private var name: String? = null
    private var age: Int = 0

    fun getName(): String? {
        return name
    }

    fun setName(name: String?) {
        this.name = name
    }
}
```

**注释充分且准确**
```kotlin
// ✅ 好的注释：解释"为什么"而不是"是什么"
// 使用递归实现，因为层级深度不确定
fun getCategoryTree(categoryId: Long): CategoryNode {
    val category = categoryRepository.findById(categoryId)
    val children = categoryRepository.findChildren(categoryId)
    return CategoryNode(
        category = category,
        children = children.map { getCategoryTree(it.id) }
    )
}

// ❌ 不好的注释：重复代码逻辑
// 获取类别
val category = categoryRepository.findById(id)
// 返回类别
return category
```

**没有调试代码**
```kotlin
// ❌ 遗留的调试代码
fun processTransaction(transaction: Transaction) {
    println("DEBUG: transaction = $transaction")  // 删除
    log.info("Starting process")                   // 删除
    val result = repository.save(transaction)
    print(result)                                  // 删除
}
```

#### 3. 安全性

**输入验证**
```kotlin
// ✅ 好的代码：完善的输入验证
fun createTransaction(request: CreateTransactionRequest): Transaction {
    require(request.amount > 0) { "金额必须大于0" }
    require(request.amount <= 1_000_000) { "金额超出限制" }
    require(request.categoryId > 0) { "分类ID无效" }

    return transactionRepository.save(request.toEntity())
}

// ❌ 不好的代码：没有输入验证
fun createTransaction(request: CreateTransactionRequest): Transaction {
    return transactionRepository.save(request.toEntity())
}
```

**敏感信息**
```kotlin
// ❌ 硬编码敏感信息
const val DB_PASSWORD = "password123"  // 删除
const val API_KEY = "sk-1234567890"    // 删除

// ✅ 使用环境变量
val dbPassword = System.getenv("DB_PASSWORD")
val apiKey = System.getenv("API_KEY")
```

**SQL 注入防护**
```kotlin
// ✅ 好的代码：使用参数化查询
@Query("SELECT t FROM Transaction t WHERE t.userId = :userId")
fun findByUserId(@Param("userId") userId: Long): List<Transaction>

// ❌ 不好的代码：字符串拼接（SQL 注入风险）
fun findByUserId(userId: Long): List<Transaction> {
    val query = "SELECT * FROM transactions WHERE user_id = $userId"
    return jdbcTemplate.query(query, rowMapper)
}
```

**XSS 防护**
```kotlin
// ✅ 好的代码：输出转义
<div>{HtmlUtils.htmlEscape(userInput)}</div>

// ❌ 不好的代码：直接输出（XSS 风险）
<div>{userInput}</div>
```

#### 4. 性能

**N+1 查询问题**
```kotlin
// ❌ N+1 查询问题
fun getUsersWithTransactions(): List<UserWithTransactions> {
    val users = userRepository.findAll()
    return users.map { user ->
        val transactions = transactionRepository.findByUserId(user.id)  // N 次查询
        UserWithTransactions(user, transactions)
    }
}

// ✅ 使用 JOIN FETCH
@Query("SELECT u FROM User u LEFT JOIN FETCH u.transactions")
fun findAllWithTransactions(): List<User>
```

**缓存使用**
```kotlin
// ✅ 好的代码：合理使用缓存
@Cacheable("categories")
fun getAllCategories(): List<Category> {
    return categoryRepository.findAll()
}

@CacheEvict("categories")
fun clearCategoryCache() {
    // 清除缓存
}
```

**资源释放**
```kotlin
// ✅ 好的代码：使用 use 自动释放资源
fun readFile(path: String): String {
    return File(path).bufferedReader().use { reader ->
        reader.readText()
    }
}

// ❌ 不好的代码：没有释放资源
fun readFile(path: String): String {
    val reader = File(path).bufferedReader()
    return reader.readText()
    // reader 没有关闭
}
```

**不必要的循环嵌套**
```kotlin
// ❌ 不好的代码：嵌套循环 O(n²)
fun findCommonElements(list1: List<Int>, list2: List<Int>): List<Int> {
    val result = mutableListOf<Int>()
    for (item1 in list1) {
        for (item2 in list2) {
            if (item1 == item2) {
                result.add(item1)
            }
        }
    }
    return result
}

// ✅ 好的代码：使用 HashSet O(n)
fun findCommonElements(list1: List<Int>, list2: List<Int>): List<Int> {
    val set2 = list2.toSet()
    return list1.filter { it in set2 }
}
```

---

## 第二轮：提交前二次审查

### 审查时机
- 代码审查通过
- 单元测试通过
- Chrome MCP 验证通过
- 准备执行 `git commit` 之前

### 审查清单

#### 1. 最终代码审查

**重新审视代码**
```markdown
检查项：
- [ ] 再次阅读所有代码
- [ ] 从新人的角度看是否容易理解
- [ ] 是否有更好的实现方式
- [ ] 是否过度设计
```

**确认改动范围**
```markdown
检查项：
- [ ] 所有改动都在本次提交范围内
- [ ] 没有把不相关的改动混在一起
- [ ] Git diff 看起来合理
```

**清理无用代码**
```kotlin
// ❌ 删除这些
// TODO: 需要优化
// FIXME: 这里有问题
// 注释掉的代码
/*
private fun oldMethod() {
    // ...
}
*/

// ❌ 删除这些
import java.util.*  // 未使用的 import
private val unusedVariable = "test"  // 未使用的变量

// ❌ 删除这些调试代码
Log.d("TAG", "debug message")
System.out.println("debug")
```

#### 2. 验证结果确认

**所有验证都通过**
```markdown
- [ ] 代码审查：通过
- [ ] 单元测试：通过（X 个测试用例，Y% 覆盖率）
- [ ] Chrome MCP 验证：通过
- [ ] 接口测试：通过
```

#### 3. 提交前检查

**Commit Message**
```bash
# ✅ 好的 Commit Message
feat: 添加交易分类排序功能

- 新增 sort_order 字段
- 支持拖拽排序
- 更新 API 和前端

# ❌ 不好的 Commit Message
fix bug
update
xxx
```

**没有提交敏感信息**
```markdown
检查项：
- [ ] 没有密码、token
- [ ] 没有 API key
- [ ] 没有个人隐私信息
```

**没有提交测试数据**
```markdown
检查项：
- [ ] 没有 test 数据
- [ ] 没有 debug 日志
- [ ] 没有临时文件
```

**.gitignore 规则正确**
```gitignore
# 确认这些规则存在
*.log
*.tmp
.DS_Store
node_modules/
build/
.venv/
.env
```

#### 4. 最终确认

**完整检查清单**
```markdown
代码质量
- [ ] 逻辑清晰
- [ ] 没有重复代码
- [ ] 命名准确
- [ ] 注释充分

代码规范
- [ ] 符合项目规范
- [ ] 没有调试代码
- [ ] 格式正确

安全性
- [ ] 输入验证完善
- [ ] 没有安全漏洞
- [ ] 没有敏感信息

性能
- [ ] 没有 N+1 查询
- [ ] 没有性能问题
- [ ] 资源正确释放

测试
- [ ] 单元测试通过
- [ ] 测试覆盖率符合要求

验证
- [ ] Chrome MCP 验证通过
- [ ] 功能正常工作
- [ ] 没有 bug

提交
- [ ] Commit message 清晰
- [ ] 改动范围合理
- [ ] 准备提交
```

---

## 审查工具

### Kotlin 代码检查

```bash
# 编译检查
./gradlew compileKotlin

# 静态代码分析
./gradlew ktlintCheck
./gradlew detekt

# 格式化代码
./gradlew ktlintFormat
```

### Git 检查

```bash
# 查看改动
git diff

# 查看暂存的改动
git diff --staged

# 查看提交历史
git log --oneline -5

# 检查是否有敏感信息
git diff --grep="password\|token\|api_key\|secret"
```

### 测试覆盖率

```bash
# 运行测试并生成覆盖率报告
./gradlew test jacocoTestReport

# 查看报告
open build/reports/jacoco/test/html/index.html
```

---

## 审查记录模板

### 第一轮审查记录

```markdown
## 代码审查记录 - 第一轮

**功能**: XXX 功能
**时间**: 2026-02-07 xx:xx
**审查人**: Claude

### 审查结果

**代码质量**: ✅ 通过
- 逻辑清晰
- 没有重复代码
- 命名准确

**代码规范**: ✅ 通过
- 符合 Kotlin 风格
- 注释充分

**安全性**: ✅ 通过
- 输入验证完善
- 没有安全漏洞

**性能**: ✅ 通过
- 没有 N+1 查询
- 资源正确释放

### 发现的问题
（无）

### 后续步骤
- 运行单元测试
```

### 第二轮审查记录

```markdown
## 代码审查记录 - 第二轮（最终）

**功能**: XXX 功能
**时间**: 2026-02-07 xx:xx
**审查人**: Claude

### 验证结果
- ✅ 代码审查：通过
- ✅ 单元测试：通过（5 个测试用例，85% 覆盖率）
- ✅ Chrome MCP 验证：通过
- ✅ 接口测试：通过

### 最终检查
- ✅ Commit message 清晰
- ✅ 没有敏感信息
- ✅ 没有测试数据
- ✅ 改动范围合理

### 提交信息
Commit: feat: 实现 XXX 功能
Hash: abc123def456

### 准备提交
✅ 所有检查通过，可以提交
```

---

## 最佳实践

### 审查原则

1. **严格但合理**
   - 遵循规范，但不过度教条
   - 关注重点，不拘小节

2. **发现问题立即修复**
   - 不要积累问题
   - 不要说"以后再改"

3. **双重审查严格执行**
   - 第一轮：代码完成后
   - 第二轮：提交前

4. **记录审查过程**
   - 记录发现的问题
   - 记录修复方案

### 常见问题

**Q: 审查太浪费时间？**
A: 审查是为了节省更多时间。早期发现问题比后期修复成本低 10 倍。

**Q: 小改动也需要审查吗？**
A: 需要。哪怕只改一行代码，也要经过审查流程。

**Q: 自己审查自己有效吗？**
A: 有效。按照检查清单系统性地审查，比随意检查可靠得多。

---

## 总结

**双重审查机制的价值：**

1. **第一轮审查**：确保代码质量
2. **第二轮审查**：确保完整性
3. **系统性检查**：避免遗漏
4. **记录可追溯**：便于改进

**记住：**
- 审查不是负担，是责任
- 未审查的代码 = 不完整的代码
- 双重审查 = 双重保障

---

*最后更新：2026-02-07*
