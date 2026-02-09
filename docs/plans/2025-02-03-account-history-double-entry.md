# 账户历史功能实现计划（复式记账）

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**目标:** 实现账户历史查询功能，使用标准复式记账原则记录所有资金流动，确保可对账、可审计。

**架构:** 引入 postings 表记录每笔交易的借贷分录，新增 system_accounts 表处理权益类科目（余额校准），保持现有业务逻辑不变。

**技术栈:** Spring Boot (Kotlin), PostgreSQL, JPA, React (TypeScript), Ant Design

**状态**: ✅ 已完成 (2026-02-09)

---

## 概述

本功能将为系统引入标准复式记账（Double-Entry Bookkeeping）机制，实现：
1. **Postings 表**：记录每笔交易的借方和贷方分录
2. **System Accounts 表**：管理权益类科目（用于余额校准）
3. **Account History API**：查询账户的完整交易历史
4. **前端展示**：在账户页面添加"历史"按钮，展示该账户的所有操作记录

---

## Task 1: 数据库迁移脚本

**文件:**
- 创建: `backend/src/main/resources/db/migration/V11__create_postings_table.sql`
- 创建: `backend/src/main/resources/db/migration/V12__create_system_accounts_table.sql`
- 创建: `backend/src/main/resources/db/migration/V13__alter_transactions_add_adjustment.sql`

### Step 1: 创建 Postings 表

**文件:** `backend/src/main/resources/db/migration/V11__create_postings_table.sql`

```sql
-- Postings 表：复式记账的核心，记录每笔交易的借贷分录
CREATE TABLE postings (
    id BIGSERIAL PRIMARY KEY,
    transaction_id BIGINT NOT NULL,
    account_id BIGINT NOT NULL,
    account_type VARCHAR(20) NOT NULL, -- 'user' 或 'system'
    entry_type VARCHAR(10) NOT NULL, -- 'DEBIT' 或 'CREDIT'
    amount DECIMAL(15,2) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_postings_transaction FOREIGN KEY (transaction_id)
        REFERENCES transactions(id) ON DELETE CASCADE,
    CONSTRAINT fk_postings_account FOREIGN KEY (account_id)
        REFERENCES accounts(id) ON DELETE CASCADE,
    CONSTRAINT chk_entry_type CHECK (entry_type IN ('DEBIT', 'CREDIT')),
    CONSTRAINT chk_account_type CHECK (account_type IN ('user', 'system'))
);

-- 索引
CREATE INDEX idx_postings_transaction ON postings(transaction_id);
CREATE INDEX idx_postings_account ON postings(account_id);
CREATE INDEX idx_postings_account_type ON postings(account_type);

-- 确保每笔交易的借贷平衡
CREATE OR REPLACE FUNCTION check_double_entry_balance()
RETURNS TRIGGER AS $$
DECLARE
    debit_sum DECIMAL(15,2);
    credit_sum DECIMAL(15,2);
BEGIN
    SELECT COALESCE(SUM(amount), 0) INTO debit_sum
    FROM postings
    WHERE transaction_id = NEW.transaction_id AND entry_type = 'DEBIT';

    SELECT COALESCE(SUM(amount), 0) INTO credit_sum
    FROM postings
    WHERE transaction_id = NEW.transaction_id AND entry_type = 'CREDIT';

    IF debit_sum != credit_sum THEN
        RAISE EXCEPTION 'Double entry balance violated: debits (%) must equal credits (%)',
            debit_sum, credit_sum;
    END IF;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_check_double_entry_balance
    AFTER INSERT OR UPDATE ON postings
    FOR EACH ROW
    EXECUTE FUNCTION check_double_entry_balance();
```

### Step 2: 创建 System Accounts 表

**文件:** `backend/src/main/resources/db/migration/V12__create_system_accounts_table.sql`

```sql
-- System Accounts 表：系统科目账户（主要是权益类）
CREATE TABLE system_accounts (
    id BIGSERIAL PRIMARY KEY,
    code VARCHAR(50) NOT NULL UNIQUE,
    name VARCHAR(100) NOT NULL,
    account_type VARCHAR(20) NOT NULL, -- 'EQUITY', 'INCOME', 'EXPENSE'
    description TEXT,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 初始化权益类账户数据
INSERT INTO system_accounts (code, name, account_type, description) VALUES
('EQUITY_INITIAL', '初始投入', 'EQUITY', '创建账户时的初始余额'),
('EQUITY_ADD', '追加投入', 'EQUITY', '通过余额校准增加的资金'),
('EQUITY_WITHDRAW', '撤回投入', 'EQUITY', '通过余额校准减少的资金');
```

### Step 3: 扩展 Transactions 表

**文件:** `backend/src/main/resources/db/migration/V13__alter_transactions_add_adjustment.sql`

```sql
-- 为 Transactions 表添加余额校准相关字段
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS adjustment_type VARCHAR(20);
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS adjustment_reason TEXT;

-- 添加注释
COMMENT ON COLUMN transactions.adjustment_type IS 'adjustment - 用于余额校准';
COMMENT ON COLUMN transactions.adjustment_reason IS '余额校准的原因说明';
```

### Step 4: 验证迁移

```bash
cd backend
./gradlew clean
./gradlew flywayMigrate
```

预期输出：成功应用 3 个迁移脚本

---

## Task 2: 后端 Entity 层

**文件:**
- 创建: `backend/src/main/kotlin/com/colafan/alfred/entity/Posting.kt`
- 创建: `backend/src/main/kotlin/com/colafan/alfred/entity/SystemAccount.kt`
- 修改: `backend/src/main/kotlin/com/colafan/alfred/entity/Transaction.kt`

### Step 1: 创建 Posting Entity

**文件:** `backend/src/main/kotlin/com/colafan/alfred/entity/Posting.kt`

```kotlin
package com.colafan.alfred.entity

import jakarta.persistence.*
import java.math.BigDecimal
import java.time.LocalDateTime

@Entity
@Table(name = "postings")
data class Posting(
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    val id: Long? = null,

    @Column(name = "transaction_id", nullable = false)
    val transactionId: Long,

    @Column(name = "account_id", nullable = false)
    val accountId: Long,

    @Column(name = "account_type", nullable = false, length = 20)
    val accountType: String, // 'user' 或 'system'

    @Column(name = "entry_type", nullable = false, length = 10)
    val entryType: String, // 'DEBIT' 或 'CREDIT'

    @Column(nullable = false, precision = 15, scale = 2)
    val amount: BigDecimal,

    @Column(name = "created_at", nullable = false)
    val createdAt: LocalDateTime = LocalDateTime.now()
)
```

### Step 2: 创建 SystemAccount Entity

**文件:** `backend/src/main/kotlin/com/colafan/alfred/entity/SystemAccount.kt`

```kotlin
package com.colafan.alfred.entity

import jakarta.persistence.*
import java.time.LocalDateTime

@Entity
@Table(name = "system_accounts")
data class SystemAccount(
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    val id: Long? = null,

    @Column(nullable = false, unique = true, length = 50)
    val code: String,

    @Column(nullable = false, length = 100)
    val name: String,

    @Column(name = "account_type", nullable = false, length = 20)
    val accountType: String, // 'EQUITY', 'INCOME', 'EXPENSE'

    @Column(columnDefinition = "TEXT")
    val description: String? = null,

    @Column(name = "is_active", nullable = false)
    val isActive: Boolean = true,

    @Column(name = "created_at", nullable = false)
    val createdAt: LocalDateTime = LocalDateTime.now(),

    @Column(name = "updated_at")
    val updatedAt: LocalDateTime? = null
)
```

### Step 3: 扩展 Transaction Entity

**文件:** `backend/src/main/kotlin/com/colafan/alfred/entity/Transaction.kt`

在现有 data class 中添加：

```kotlin
    @Column(name = "adjustment_type", length = 20)
    val adjustmentType: String? = null, // 'adjustment' - 用于余额校准

    @Column(name = "adjustment_reason", columnDefinition = "TEXT")
    val adjustmentReason: String? = null, // 余额校准的原因说明
```

---

## Task 3: 后端 Repository 层

**文件:**
- 创建: `backend/src/main/kotlin/com/colafan/alfred/repository/PostingRepository.kt`
- 创建: `backend/src/main/kotlin/com/colafan/alfred/repository/SystemAccountRepository.kt`
- 修改: `backend/src/main/kotlin/com/colafan/alfred/repository/TransactionRepository.kt`

### Step 1: 创建 PostingRepository

**文件:** `backend/src/main/kotlin/com/colafan/alfred/repository/PostingRepository.kt`

```kotlin
package com.colafan.alfred.repository

import com.colafan.alfred.entity.Posting
import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.stereotype.Repository

@Repository
interface PostingRepository : JpaRepository<Posting, Long>
```

### Step 2: 创建 SystemAccountRepository

**文件:** `backend/src/main/kotlin/com/colafan/alfred/repository/SystemAccountRepository.kt`

```kotlin
package com.colafan.alfred.repository

import com.colafan.alfred.entity.SystemAccount
import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.stereotype.Repository

@Repository
interface SystemAccountRepository : JpaRepository<SystemAccount, Long> {
    fun findByCode(code: String): SystemAccount?
    fun findByIsActiveTrue(): List<SystemAccount>
}
```

### Step 3: 扩展 TransactionRepository

**文件:** `backend/src/main/kotlin/com/colafan/alfred/repository/TransactionRepository.kt`

添加查询方法：

```kotlin
// 根据 account_id 查询所有相关的交易（包括该账户作为 from_account 或 to_account）
fun findByFromAccountIdOrToAccountIdOrderByIdDesc(
    fromAccountId: Long,
    toAccountId: Long,
    pageable: Pageable
): Page<Transaction>
```

---

## Task 4: 后端 Service 层

**文件:**
- 创建: `backend/src/main/kotlin/com/colafan/alfred/service/PostingService.kt`
- 创建: `backend/src/main/kotlin/com/colafan/alfred/service/AccountHistoryService.kt`
- 修改: `backend/src/main/kotlin/com/colafan/alfred/service/AccountService.kt`

### Step 1: 创建 PostingService

**文件:** `backend/src/main/kotlin/com/colafan/alfred/service/PostingService.kt`

```kotlin
package com.colafan.alfred.service

import com.colafan.alfred.entity.Posting
import com.colafan.alfred.repository.PostingRepository
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional

@Service
class PostingService(
    private val postingRepository: PostingRepository
) {

    /**
     * 创建复式记账分录
     * 自动创建借贷双方的分录
     */
    @Transactional
    fun createPostings(
        transactionId: Long,
        debitAccountId: Long,
        creditAccountId: Long,
        amount: java.math.BigDecimal,
        debitAccountType: String = "user",
        creditAccountType: String = "user"
    ) {
        val debitPosting = Posting(
            transactionId = transactionId,
            accountId = debitAccountId,
            accountType = debitAccountType,
            entryType = "DEBIT",
            amount = amount
        )

        val creditPosting = Posting(
            transactionId = transactionId,
            accountId = creditAccountId,
            accountType = creditAccountType,
            entryType = "CREDIT",
            amount = amount
        )

        postingRepository.saveAll(listOf(debitPosting, creditPosting))
    }

    /**
     * 为余额校准创建分录
     */
    @Transactional
    fun createAdjustmentPostings(
        transactionId: Long,
        accountId: Long,
        amount: java.math.BigDecimal,
        isIncrease: Boolean  // true=增加, false=减少
    ) {
        // 从 system_accounts 获取权益账户
        val equityCode = if (isIncrease) "EQUITY_ADD" else "EQUITY_WITHDRAW"
        // TODO: 从数据库查询权益账户的 ID

        if (isIncrease) {
            // 借：用户账户，贷：权益账户
            val debitPosting = Posting(
                transactionId = transactionId,
                accountId = accountId,
                accountType = "user",
                entryType = "DEBIT",
                amount = amount
            )

            val creditPosting = Posting(
                transactionId = transactionId,
                accountId = 1, // 权益账户 ID，需要动态查询
                accountType = "system",
                entryType = "CREDIT",
                amount = amount
            )

            postingRepository.saveAll(listOf(debitPosting, creditPosting))
        } else {
            // 借：权益账户，贷：用户账户
            val debitPosting = Posting(
                transactionId = transactionId,
                accountId = 1, // 权益账户 ID
                accountType = "system",
                entryType = "DEBIT",
                amount = amount
            )

            val creditPosting = Posting(
                transactionId = transactionId,
                accountId = accountId,
                accountType = "user",
                entryType = "CREDIT",
                amount = amount
            )

            postingRepository.saveAll(listOf(debitPosting, creditPosting))
        }
    }
}
```

### Step 2: 创建 AccountHistoryService

**文件:** `backend/src/main/kotlin/com/colafan/alfred/service/AccountHistoryService.kt`

```kotlin
package com.colafan.alfred.service

import com.colafan.alfred.dto.response.AccountHistoryResponse
import com.colafan.alfred.entity.Transaction
import com.colafan.alfred.repository.PostingRepository
import com.colafan.alfred.repository.TransactionRepository
import org.springframework.data.domain.Page
import org.springframework.data.domain.Pageable
import org.springframework.stereotype.Service
import java.math.BigDecimal

@Service
class AccountHistoryService(
    private val transactionRepository: TransactionRepository,
    private val postingRepository: PostingRepository
) {

    /**
     * 获取账户的历史记录
     */
    fun getAccountHistory(
        accountId: Long,
        currency: String?,
        pageable: Pageable
    ): Page<AccountHistoryResponse> {
        // 查询该账户相关的所有交易
        val transactions = transactionRepository
            .findByFromAccountIdOrToAccountIdOrderByIdDesc(accountId, accountId, pageable)

        // 转换为响应格式
        return transactions.map { transaction ->
            val isInflow = transaction.toAccountId == accountId
            val amount = transaction.amount
            val posting = postingRepository
                .findByTransactionIdAndAccountId(transaction.id!!, accountId)
                .firstOrNull()

            AccountHistoryResponse(
                id = transaction.id!!,
                type = when {
                    transaction.type == "transfer" -> if (isInflow) "转入" else "转出"
                    transaction.type == "adjustment" -> if (isInflow) "余额校准(增加)" else "余额校准(减少)"
                    transaction.type -> transaction.type
                    else -> "未知"
                },
                amount = amount.toDouble(),
                currency = transaction.currency,
                isInflow = isInflow,
                entryType = posting?.entryType, // 'DEBIT' 或 'CREDIT'
                transactionDate = transaction.transactionDate,
                relatedAccount = if (transaction.type == "transfer") {
                    if (isInflow) transaction.fromAccountId else transaction.toAccountId
                } else null,
                notes = transaction.notes ?: transaction.adjustmentReason,
                categoryName = transaction.categoryId?.let { /* 查询分类名称 */ } ?: "-"
            )
        }
    }
}
```

### Step 3: 修改 AccountService 集成 Posting

**文件:** `backend/src/main/kotlin/com/colafan/alfred/service/AccountService.kt`

在 `createAccountWithCurrencies` 和 `updateBalanceByCurrency` 方法中调用 PostingService：

```kotlin
@Autowired
private lateinit var postingService: PostingService

// 创建账户后创建 postings
fun createAccountWithCurrencies(userId: Long, account: Account, currencies: List<String>): Account {
    val createdAccount = save(account)

    // TODO: 创建初始余额的 postings（如果有初始余额）
    // 借：账户，贷：EQUITY_INITIAL

    return createdAccount
}
```

---

## Task 5: 后端 DTO 层

**文件:**
- 创建: `backend/src/main/kotlin/com/colafan/alfred/dto/response/AccountHistoryResponse.kt`

### Step 1: 创建 AccountHistoryResponse

**文件:** `backend/src/main/kotlin/com/colafan/alfred/dto/response/AccountHistoryResponse.kt`

```kotlin
package com.colafan.alfred.dto.response

import java.time.LocalDateTime

data class AccountHistoryResponse(
    val id: Long,
    val type: String, // '收入', '支出', '转入', '转出', '余额校准(增加)', '余额校准(减少)'
    val amount: Double,
    val currency: String,
    val isInflow: Boolean, // true=流入, false=流出
    val entryType: String?, // 'DEBIT' 或 'CREDIT'
    val transactionDate: LocalDateTime,
    val relatedAccount: Long?, // 转账时的对方账户
    val notes: String?,
    val categoryName: String?
)
```

---

## Task 6: 后端 Controller 层

**文件:**
- 创建: `backend/src/main/kotlin/com/colafan/alfred/controller/AccountHistoryController.kt`

### Step 1: 创建 AccountHistoryController

**文件:** `backend/src/main/kotlin/com/colafan/alfred/controller/AccountHistoryController.kt`

```kotlin
package com.colafan.alfred.controller

import com.colafan.alfred.dto.response.AccountHistoryResponse
import com.colafan.alfred.service.AccountHistoryService
import com.colafan.alfred.service.AuthService
import org.springframework.data.domain.Page
import org.springframework.data.domain.PageRequest
import org.springframework.data.domain.Sort
import org.springframework.http.ResponseEntity
import org.springframework.security.core.Authentication
import org.springframework.web.bind.annotation.*

@RestController
@RequestMapping("/api/v1/accounts/{id}")
class AccountHistoryController(
    private val accountHistoryService: AccountHistoryService,
    private val authService: AuthService
) {

    @GetMapping("/history")
    fun getAccountHistory(
        @PathVariable id: Long,
        @RequestParam(required = false) currency: String?,
        @RequestParam(defaultValue = "0") page: Int,
        @RequestParam(defaultValue = "20") size: Int,
        authentication: Authentication
    ): ResponseEntity<Page<AccountHistoryResponse>> {
        val userId = authService.getCurrentUserId(authentication)

        val pageable = PageRequest.of(
            page,
            size,
            Sort.by(Sort.Direction.DESC, "transactionDate")
        )

        val history = accountHistoryService.getAccountHistory(id, currency, pageable)

        return ResponseEntity.ok(history)
    }
}
```

---

## Task 7: 前端类型定义

**文件:**
- 修改: `frontend/src/types/index.ts`

### Step 1: 添加 AccountHistory 类型

**文件:** `frontend/src/types/index.ts`

```typescript
export interface AccountHistory {
  id: number;
  type: string; // '收入', '支出', '转入', '转出', '余额校准(增加)', '余额校准(减少)'
  amount: number;
  currency: string;
  isInflow: boolean;
  entryType: 'DEBIT' | 'CREDIT' | null;
  transactionDate: string;
  relatedAccount?: number;
  notes?: string;
  categoryName?: string;
}

export interface AccountHistoryResponse {
  content: AccountHistory[];
  totalElements: number;
  totalPages: number;
  size: number;
  number: number;
}
```

---

## Task 8: 前端 API 调用

**文件:**
- 修改: `frontend/src/services/api.ts`

### Step 1: 添加 getAccountHistory 方法

**文件:** `frontend/src/services/api.ts`

```typescript
async getAccountHistory(
  accountId: number,
  params: {
    currency?: string;
    page?: number;
    size?: number;
  } = {}
): Promise<AccountHistoryResponse> {
  const queryParams = new URLSearchParams();
  if (params.currency) queryParams.append('currency', params.currency);
  if (params.page !== undefined) queryParams.append('page', params.page.toString());
  if (params.size !== undefined) queryParams.append('size', params.size.toString());

  const response = await this.axiosInstance.get<AccountHistoryResponse>(
    `/api/v1/accounts/${accountId}/history?${queryParams.toString()}`
  );
  return response.data;
}
```

---

## Task 9: 前端 UI 组件

**文件:**
- 修改: `frontend/src/pages/Accounts.tsx`

### Step 1: 在账户卡片上添加"历史"按钮

在 `SortableAccountCard` 组件的操作按钮中添加历史按钮：

```tsx
// 在现有的 <Menu> 中添加历史按钮
<Menu.Item key="history" icon={<HistoryOutlined />}>
  历史记录
</Menu.Item>
```

添加对应的处理函数：

```tsx
const handleHistory = (account: Account) => {
  setSelectedAccountForHistory(account);
  setHistoryVisible(true);
};
```

### Step 2: 创建历史记录弹窗组件

**文件:** `frontend/src/pages/Accounts.tsx`

在 CalculatorModal 组件后添加：

```tsx
// ==================== 账户历史弹窗组件 ====================
interface AccountHistoryModalProps {
  account: Account;
  onClose: () => void;
}

function AccountHistoryModal({ account, onClose }: AccountHistoryModalProps) {
  const [history, setHistory] = useState<AccountHistory[]>([]);
  const [loading, setLoading] = useState(false);
  const [pagination, setPagination] = useState({
    current: 0,
    pageSize: 20,
    total: 0,
  });
  const [selectedCurrency, setSelectedCurrency] = useState(account.balances[0]?.currency || 'CNY');

  useEffect(() => {
    loadHistory();
  }, [account.id, selectedCurrency, pagination.current]);

  const loadHistory = async () => {
    setLoading(true);
    try {
      const response = await api.getAccountHistory(account.id, {
        currency: selectedCurrency,
        page: pagination.current,
        size: pagination.pageSize,
      });

      setHistory(response.content);
      setPagination({
        current: response.number,
        pageSize: response.size,
        total: response.totalElements,
      });
    } catch (error) {
      message.error('加载历史记录失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: '1rem' }}>
      {/* 头部 */}
      <div style={{ marginBottom: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h3 style={{ margin: 0 }}>账户历史</h3>
        <Button onClick={onClose} type="text">关闭</Button>
      </div>

      {/* 账户信息 */}
      <div style={{ marginBottom: '1rem', textAlign: 'center' }}>
        <div style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: '0.25rem' }}>
          {account.name}
        </div>
        <div style={{ fontSize: '0.875rem', color: '#666' }}>
          选择货币：
          {account.balances.map(b => (
            <Button
              key={b.currency}
              size="small"
              type={selectedCurrency === b.currency ? 'primary' : 'default'}
              onClick={() => setSelectedCurrency(b.currency)}
              style={{ marginLeft: '0.25rem' }}
            >
              {getCurrencyInfo(b.currency as any).flag} {b.currency}
            </Button>
          ))}
        </div>
      </div>

      {/* 历史记录列表 */}
      <Spin spinning={loading}>
        <List
          dataSource={history}
          renderItem={(item) => (
            <List.Item
              style={{
                borderLeft: `3px solid ${item.isInflow ? '#52c41a' : '#ff4d4f'}`,
                paddingLeft: '1rem',
              }}
            >
              <div style={{ width: '100%' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                  <span style={{ fontWeight: 600 }}>{item.type}</span>
                  <span style={{
                    color: item.isInflow ? '#52c41a' : '#ff4d4f',
                    fontWeight: 600
                  }}>
                    {item.isInflow ? '+' : '-'} {getCurrencyInfo(item.currency as any).symbol} {item.amount.toFixed(2)}
                  </span>
                </div>
                <div style={{ fontSize: '0.75rem', color: '#999' }}>
                  {item.transactionDate} • {item.notes || item.categoryName || '-'}
                </div>
              </div>
            </List.Item>
          )}
        />
      </Spin>

      {/* 分页 */}
      {pagination.total > 0 && (
        <div style={{ marginTop: '1rem', textAlign: 'center' }}>
          <Pagination
            current={pagination.current + 1}
            pageSize={pagination.pageSize}
            total={pagination.total}
            onChange={(page) => setPagination({ ...pagination, current: page - 1 })}
          />
        </div>
      )}
    </div>
  );
}
```

### Step 3: 添加 Modal

在返回的 JSX 中添加历史弹窗：

```tsx
{/* 账户历史弹窗 */}
{selectedAccountForHistory && (
  <Modal
    open={historyVisible}
    onCancel={() => setHistoryVisible(false)}
    footer={null}
    width={600}
    title={null}
  >
    <AccountHistoryModal
      account={selectedAccountForHistory}
      onClose={() => setHistoryVisible(false)}
    />
  </Modal>
)}
```

---

## Task 10: 测试

**文件:**
- 创建: `scripts/test_account_history.sh`

### Step 1: 创建测试脚本

**文件:** `scripts/test_account_history.sh`

```bash
#!/bin/bash

BASE_URL="http://localhost:8080/api/v1"
TOKEN="your_test_token"

echo "=== 测试账户历史功能 ==="

# 1. 获取账户历史
echo -e "\n1. 获取账户历史（默认货币）"
curl -X GET "$BASE_URL/accounts/421/history?page=0&size=10" \
  -H "Authorization: Bearer $TOKEN" | jq

# 2. 获取指定货币的历史
echo -e "\n2. 获取USD历史记录"
curl -X GET "$BASE_URL/accounts/421/history?currency=USD&page=0&size=10" \
  -H "Authorization: Bearer $TOKEN" | jq

echo -e "\n=== 测试完成 ==="
```

### Step 2: 运行测试

```bash
chmod +x scripts/test_account_history.sh
./scripts/test_account_history.sh
```

---

## 总结

本实现计划引入标准复式记账机制，确保：
1. ✅ 每笔资金流动都有完整的借贷记录
2. ✅ 借贷必相等，可自我验证
3. ✅ 账户历史可查询、可对账
4. ✅ 余额校准记录明确，方便后期核对
5. ✅ 保留现有功能，平滑升级

**关键设计决策：**
- Postings 表记录借贷分录（核心）
- System Accounts 只需权益类账户（简化）
- 收入/支出分类不单独建账户（用 category）
- 支持多币种账户历史查询

**下一步：** 准备开始实现了吗？
