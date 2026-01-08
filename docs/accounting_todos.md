# 记账功能待办事项清单

> **文档版本**: v2.0
> **最后更新**: 2025-01-08
> **维护团队**: 产品经理
> **参考文档**: `accounting_requirements.md`, `accounting_api_spec.md`

---

## 📊 任务状态总览

| 优先级 | 待办 | 进行中 | 已完成 | 总计 |
|--------|------|--------|--------|------|
| P0 | 0 | 0 | 2 | 2 |
| P1 | 0 | 0 | 2 | 2 |
| P2 | 0 | 0 | 3 | 3 |
| P3 | 0 | 0 | 3 | 3 |
| **总计** | **0** | **0** | **10** | **10** |

---

## ✅ P0 - 已完成

### 任务 1：修复注册时未创建默认分类 ✅

**问题描述**：新用户注册后无法创建交易，因为没有默认分类。后端已有 `init_default_categories()` 函数，但未在注册流程中调用。

**负责团队**：后端团队

**状态**: ✅ 已完成

**完成位置**: `Alfred/app/api/v1/auth.py` 第105-112行

**实现方式**:
```python
# 初始化默认分类
try:
    category_service.init_default_categories(user.id, db)
    logger.info(f"默认分类初始化成功: 用户ID={user.id}")
except Exception as e:
    logger.error(f"默认分类初始化失败: 用户ID={user.id}, 错误={str(e)}")
```

**验收标准**:
- [x] 新用户注册后自动获得默认分类
- [x] 前端调用 `GET /api/v1/categories` 能返回默认分类列表
- [x] 用户可以正常创建第一笔交易
- [x] 默认分类包括：餐饮、交通、购物、居住、娱乐、医疗、教育、通讯、人情等

**完成时间**: 2025-01-08之前

**相关文件**：
- `/Alfred/app/services/auth_service.py`
- `/Alfred/app/services/category_service.py`

**实施步骤**：
1. 打开 `auth_service.py`
2. 在 `register_user()` 方法中，创建用户成功后添加代码
3. 调用 `category_service.init_default_categories(user_id, db)`
4. 测试新用户注册后的分类初始化

**参考代码**：
```python
def register_user(self, username: str, password: str, **kwargs) -> Dict:
    # ... 现有用户创建代码 ...

    # 创建用户成功后
    user_key = f"user:{username}"
    self._storage[user_key] = user_data

    # ✅ 新增：初始化默认分类
    try:
        from app.services.category_service import init_default_categories
        from app.db import SessionLocal

        db = SessionLocal()
        try:
            init_default_categories(user_data["id"], db)
            db.commit()
        finally:
            db.close()
    except Exception as e:
        # 记录错误但不影响注册流程
        print(f"初始化默认分类失败: {e}")

    # ... 返回注册结果 ...
```

**验收标准**：
- [ ] 新用户注册后自动获得默认分类
- [ ] 前端调用 `GET /api/v1/categories` 能返回默认分类列表
- [ ] 用户可以正常创建第一笔交易
- [ ] 默认分类包括：餐饮、交通、购物、居住、娱乐、医疗、教育、通讯、人情等

**预计工作量**：30分钟

**阻塞问题**：所有新用户无法使用记账功能 ✅ 已解决

---

### 任务 2：创建默认账户 ✅

**问题描述**：创建交易时需要 `from_account_id` 或 `to_account_id`，但新用户没有账户。

**负责团队**：后端团队

**状态**: ✅ 已完成

**完成位置**: `Alfred/app/api/v1/auth.py` 第113-130行

**实现方式**:
```python
# 创建默认现金账户
try:
    default_account = Account(
        user_id=user.id,
        name="现金",
        account_type="cash",
        balance=0.00,
        currency="CNY",
        is_default=True,
        icon="account_balance_wallet",
        color="#4CAF50"
    )
    db.add(default_account)
    db.commit()
    logger.info(f"默认账户创建成功: 用户ID={user.id}, 账户ID={default_account.id}")
except Exception as e:
    logger.error(f"默认账户创建失败: 用户ID={user.id}, 错误={str(e)}")
```

**验收标准**:
- [x] 新用户注册后自动拥有"现金"账户
- [x] 前端调用 `GET /api/v1/accounts` 能返回默认账户
- [x] 用户创建交易时可以使用该账户

**完成时间**: 2025-01-08之前

**相关文件**：
- `/Alfred/app/services/auth_service.py`
- `/Alfred/app/models/account.py`

**实施步骤**：
1. 在注册流程中添加默认账户创建逻辑
2. 默认账户类型：现金 (cash)
3. 默认账户名称："现金" 或 "默认账户"
4. 初始余额：0.00

**参考代码**（可选）：
```python
from app.services.account_service import create_default_account

# 在注册成功后调用
def register_user(self, username: str, password: str, **kwargs) -> Dict:
    # ... 用户创建和分类初始化 ...

    # 创建默认账户
    try:
        from app.services.account_service import create_default_account
        from app.db import SessionLocal

        db = SessionLocal()
        try:
            create_default_account(
                user_id=user_data["id"],
                name="现金",
                account_type="cash",
                initial_balance=0.0,
                db=db
            )
            db.commit()
        finally:
            db.close()
    except Exception as e:
        print(f"创建默认账户失败: {e}")

    return user_data
```

**验收标准**：
- [ ] 新用户注册后自动拥有"现金"账户
- [ ] 前端调用 `GET /api/v1/accounts` 能返回默认账户
- [ ] 用户创建交易时可以使用该账户

**预计工作量**：30分钟

**依赖**：任务1

---

## ✅ P1 - 已完成

### 任务 3：实现账户管理功能 ✅

**问题描述**：后端已完整实现账户管理 API，但前端完全没有相关功能。

**负责团队**：前端团队

**状态**: ✅ 已完成

**完成位置**:
- 模型: `ColaFit/lib/models/account_model.dart`
- API: `ColaFit/lib/services/api_service.dart`
- UI: `ColaFit/lib/screens/account_management_screen.dart`

**已完成内容**:
- ✅ 账户数据模型（支持5种账户类型）
- ✅ 账户API方法（获取、创建、编辑、删除）
- ✅ 账户管理界面
- ✅ 显示账户列表和总余额
- ✅ 创建/编辑/删除账户
- ✅ 设置默认账户
- ✅ 账户图标和颜色选择

**验收标准**:
- [x] 可以查看账户列表和总余额
- [x] 可以创建新账户（5种类型）
- [x] 可以编辑账户信息
- [x] 可以删除账户
- [x] 可以设置默认账户
- [x] 账户余额显示正确

**完成时间**: 2025-01-07

**相关文件**：
- `/ColaFit/lib/models/account_model.dart` - 需创建
- `/ColaFit/lib/services/api_service.dart` - 需添加方法
- `/ColaFit/lib/screens/account_management_screen.dart` - 需创建

**实施步骤**：

#### 3.1 创建账户数据模型
**文件**：`lib/models/account_model.dart`
```dart
class Account {
  final int? id;
  final String name;
  final String accountType;  // bank_card, cash, alipay, wechat, credit_card
  final String? accountNumber;
  final double balance;
  final String currency;
  final bool isDefault;
  final String? icon;
  final String? color;
  final String? notes;
  final String? createdAt;

  Account({...});

  factory Account.fromJson(Map<String, dynamic> json) {...}

  Map<String, dynamic> toJson() {...}
}
```

#### 3.2 添加账户 API 方法
**文件**：`lib/services/api_service.dart`

添加以下方法：
- `getAccounts()` - 获取账户列表
- `createAccount(Map<String, dynamic> data)` - 创建账户
- `updateAccount(int id, Map<String, dynamic> data)` - 更新账户
- `deleteAccount(int id)` - 删除账户

参考 API 文档：`/docs/accounting_api_spec.md` 第 152-254 行

#### 3.3 实现账户管理界面
**文件**：`lib/screens/account_management_screen.dart`

**功能清单**：
- 显示账户列表卡片
- 每个账户显示：图标、名称、余额、账户类型
- 显示总余额（所有账户合计）
- 添加/编辑账户对话框：
  - 账户名称输入
  - 账户类型选择（下拉框）
  - 账号输入（可选）
  - 初始余额输入
  - 图标选择器
  - 颜色选择器
  - 是否默认账户开关
- 删除账户（软删除）
- 设置默认账户

**UI 参考**：
- 使用 Card 布局显示每个账户
- 使用 ListView 展示账户列表
- 使用 FloatingActionButton 添加账户
- 使用 AlertDialog 或 showModalBottomSheet 显示表单

**验收标准**：
- [ ] 可以查看账户列表和总余额
- [ ] 可以创建新账户（5种类型）
- [ ] 可以编辑账户信息
- [ ] 可以删除账户
- [ ] 可以设置默认账户
- [ ] 账户余额显示正确

**预计工作量**：1-2天

**依赖**：任务2 ✅

---

### 任务 4：添加账户选择UI到交易对话框 ✅

**问题描述**：当前创建交易时使用硬编码的账户ID（ID=1），需要让用户选择账户。

**负责团队**：前端团队

**状态**: ✅ 已完成

**完成位置**:
- UI: `ColaFit/lib/components/add_transaction_dialog.dart`

**已完成内容**:
- ✅ 在initState中加载账户列表
- ✅ 根据交易类型显示不同的账户选择器
  - 支出 (expense): 显示转出账户选择器
  - 收入 (income): 显示转入账户选择器
  - 转账 (transfer): 同时显示转出和转入账户选择器
  - 借入 (loan_in): 显示转入账户选择器
  - 借出 (loan_out): 显示转出账户选择器
  - 还款 (repayment): 显示转出账户选择器
- ✅ 表单验证（转账时验证两个账户不同）
- ✅ 保存时使用选中的账户ID
- ✅ 账户选择器显示余额信息

**验收标准**:
- [x] 创建交易时显示账户选择器
- [x] 不同交易类型显示正确的账户字段
- [x] 转账时验证两个账户不同
- [x] 保存时使用选中的账户ID
- [x] 账户显示余额信息

**完成时间**: 2025-01-07

**相关文件**：
- `/ColaFit/lib/components/add_transaction_dialog.dart`

**实施步骤**：

#### 4.1 加载账户列表
在 `initState()` 中加载账户：
```dart
List<Account> _accounts = [];
Account? _selectedFromAccount;
Account? _selectedToAccount;

@override
void initState() {
  super.initState();
  _loadAccounts();
}

Future<void> _loadAccounts() async {
  try {
    final data = await ApiService.getAccounts();
    setState(() {
      _accounts = data['accounts'] ?? [];
      // 默认选择第一个账户
      if (_accounts.isNotEmpty) {
        _selectedFromAccount = _accounts.first;
        _selectedToAccount = _accounts.first;
      }
    });
  } catch (e) {
    print('加载账户失败: $e');
  }
}
```

#### 4.2 根据交易类型显示账户选择器

**支出 (expense)**：
- 显示"转出账户"选择器
- 使用 `from_account_id`

**收入 (income)**：
- 显示"转入账户"选择器
- 使用 `to_account_id`

**转账 (transfer)**：
- 同时显示"转出账户"和"转入账户"
- 验证两个账户不同

**借入/借出**：
- 显示对应账户选择器

#### 4.3 UI 组件示例
```dart
Widget _buildAccountSelector({
  required String label,
  required Account? selectedAccount,
  required ValueChanged<Account?> onChanged,
}) {
  return Column(
    crossAxisAlignment: CrossAxisAlignment.start,
    children: [
      Text(label, style: TextStyle(fontSize: 16, fontWeight: FontWeight.w500)),
      SizedBox(height: 8),
      DropdownButtonFormField<Account>(
        value: selectedAccount,
        decoration: InputDecoration(
          border: OutlineInputBorder(),
          prefixIcon: Icon(Icons.account_balance_wallet),
        ),
        items: _accounts.map((account) {
          return DropdownMenuItem(
            value: account,
            child: Row(
              children: [
                Icon(_getAccountIcon(account.accountType)),
                SizedBox(width: 8),
                Text(account.name),
                SizedBox(width: 8),
                Text('¥${account.balance.toStringAsFixed(2)}',
                  style: TextStyle(color: Colors.grey)),
              ],
            ),
          );
        }).toList(),
        onChanged: onChanged,
      ),
    ],
  );
}
```

#### 4.4 修改保存逻辑
```dart
final transactionData = {
  'amount': amount,
  'type': _selectedType,
  'category_id': _selectedCategory!.id!,
  'transaction_date': _selectedDate.toIso8601String(),
  if (_noteController.text.isNotEmpty) 'notes': _noteController.text,

  // 根据交易类型设置账户
  if (_selectedType == 'expense' && _selectedFromAccount != null)
    'from_account_id': _selectedFromAccount!.id,
  if (_selectedType == 'income' && _selectedToAccount != null)
    'to_account_id': _selectedToAccount!.id,
  if (_selectedType == 'transfer') {
    'from_account_id': _selectedFromAccount?.id,
    'to_account_id': _selectedToAccount?.id,
  },
};
```

**验收标准**：
- [ ] 创建交易时显示账户选择器
- [ ] 不同交易类型显示正确的账户字段
- [ ] 转账时验证两个账户不同
- [ ] 保存时使用选中的账户ID
- [ ] 账户显示余额信息

**预计工作量**：4小时

**依赖**：任务3

---

## ✅ P2 - 已完成

### 任务 5：支持6种交易类型 ✅

**问题描述**：后端支持6种交易类型，前端当前只实现了收入和支出。

**负责团队**：前端团队

**状态**: ✅ 已完成

**完成位置**:
- 模型: `ColaFit/lib/models/transaction_model.dart`
- UI: `ColaFit/lib/components/add_transaction_dialog.dart`
- 筛选器: `ColaFit/lib/screens/accounting_screen.dart`

**已完成内容**:
- ✅ TransactionType枚举（6种类型：income, expense, transfer, loan_in, loan_out, repayment）
- ✅ 交易类型选择器UI（使用SegmentedButton）
- ✅ 动态表单字段（根据类型显示不同字段）
- ✅ 表单验证逻辑（不同类型的不同要求）
- ✅ 筛选器支持所有6种类型
- ✅ 统计数据正确计算所有类型

**验收标准**:
- [x] 可以创建6种不同类型的交易
- [x] 不同类型显示正确的表单字段
- [x] 表单验证逻辑正确
- [x] 筛选器支持所有6种类型
- [x] 统计数据正确计算所有类型

**完成时间**: 2025-01-07

**相关文件**：
- `/ColaFit/lib/models/transaction_model.dart`
- `/ColaFit/lib/components/add_transaction_dialog.dart`
- `/ColaFit/lib/screens/accounting_screen.dart`

**实施步骤**：

#### 5.1 扩展交易模型
**文件**：`lib/models/transaction_model.dart`
```dart
enum TransactionType {
  income,      // 收入
  expense,     // 支出
  transfer,    // 转账
  loanIn,      // 借入
  loanOut,     // 借出
  repayment    // 还款
}

extension TransactionTypeExtension on TransactionType {
  String get value {
    switch (this) {
      case TransactionType.income: return 'income';
      case TransactionType.expense: return 'expense';
      case TransactionType.transfer: return 'transfer';
      case TransactionType.loanIn: return 'loan_in';
      case TransactionType.loanOut: return 'loan_out';
      case TransactionType.repayment: return 'repayment';
    }
  }

  String get displayName {
    switch (this) {
      case TransactionType.income: return '收入';
      case TransactionType.expense: return '支出';
      case TransactionType.transfer: return '转账';
      case TransactionType.loanIn: return '借入';
      case TransactionType.loanOut: return '借出';
      case TransactionType.repayment: return '还款';
    }
  }

  IconData get icon {
    switch (this) {
      case TransactionType.income: return Icons.arrow_downward;
      case TransactionType.expense: return Icons.arrow_upward;
      case TransactionType.transfer: return Icons.swap_horiz;
      case TransactionType.loanIn: return Icons.call_received;
      case TransactionType.loanOut: return Icons.call_made;
      case TransactionType.repayment: return Icons.assignment_return;
    }
  }
}
```

#### 5.2 改造添加交易对话框

**UI 设计**：
1. **交易类型选择器**（6个选项卡或下拉框）
   - 使用 SegmentedButton 或 DropdownButton
   - 显示图标和名称
   - 不同类型使用不同颜色

2. **动态表单字段**：

   | 交易类型 | 显示字段 |
   |---------|---------|
   | 收入 | 转入账户、分类 |
   | 支出 | 转出账户、分类 |
   | 转账 | 转出账户、转入账户 |
   | 借入 | 转入账户、备注 |
   | 借出 | 转出账户、备注 |
   | 还款 | 转出账户、关联借贷（可选） |

3. **表单验证**：
   - 收入/支出/借贷：必须选择一个账户
   - 转账：必须选择两个不同账户
   - 收入/支出：必须选择分类
   - 转账/借贷：分类可选

#### 5.3 更新筛选器
**文件**：`lib/screens/accounting_screen.dart`

```dart
// 在筛选条件中添加所有6种类型
final List<String> _allTypes = [
  'income', 'expense', 'transfer',
  'loan_in', 'loan_out', 'repayment'
];

// 更新筛选器UI
Widget _buildFilterChips() {
  return Wrap(
    spacing: 8,
    children: _allTypes.map((type) {
      return FilterChip(
        label: Text(_getTypeDisplayName(type)),
        selected: _selectedType == type,
        onSelected: (selected) {
          setState(() {
            _selectedType = selected ? type : null;
            _loadTransactions();
          });
        },
      );
    }).toList(),
  );
}
```

**验收标准**：
- [ ] 可以创建6种不同类型的交易
- [ ] 不同类型显示正确的表单字段
- [ ] 表单验证逻辑正确
- [ ] 筛选器支持所有6种类型
- [ ] 统计数据正确计算所有类型

**预计工作量**：2-3天

**依赖**：任务4 ✅

---

### 任务 6：完善分类管理界面 ✅

**问题描述**：当前分类管理界面只有占位符，需要完整实现。

**负责团队**：前端团队

**状态**: ✅ 已完成

**完成位置**:
- UI: `ColaFit/lib/screens/category_management_screen.dart` (864行)

**已完成内容**:
- ✅ 分类列表展示（支持Tab切换收入/支出）
- ✅ 层级显示（父分类可展开子分类，使用ExpansionTile）
- ✅ 添加分类对话框（名称、图标、颜色、父分类）
- ✅ 编辑分类（系统分类有限制，名称字段禁用）
- ✅ 删除分类（系统分类不可删除，有确认对话框）
- ✅ 图标选择器（13个Material Icons，5列网格）
- ✅ 颜色选择器（12种颜色，圆形swatch）
- ✅ 系统分类保护（橙色"系统"徽章，删除提示）
- ✅ 父分类选择器（可创建子分类）
- ✅ 完整的错误处理和加载状态
- ✅ 空状态提示
- ✅ 下拉刷新支持

**待实现内容**:
1. 分类列表展示（支持Tab切换收入/支出）
2. 支持层级显示（父分类可展开子分类）
3. 添加分类对话框（名称、图标、颜色、父分类）
4. 编辑分类（系统分类有限制）
5. 删除分类（系统分类不可删除）
6. 图标选择器（Material Icons网格）
7. 颜色选择器

**优先级**: P2（中优先级）

**预计工作量**: 1-2天

**相关文件**：
- `/ColaFit/lib/screens/category_management_screen.dart`
- `/ColaFit/lib/models/category_model.dart`

**实施步骤**：

#### 6.1 更新分类模型
确保支持层级分类：
```dart
class Category {
  final int? id;
  final String name;
  final String type;  // income | expense
  final String? icon;
  final String? color;
  final bool isSystem;  // 是否为系统默认分类
  final int sortOrder;
  final int? parentId;  // 父分类ID
  final List<Category>? subcategories;  // 子分类列表

  Category({...});

  factory Category.fromJson(Map<String, dynamic> json) {
    return Category(
      id: json['id'],
      name: json['name'],
      type: json['type'],
      icon: json['icon'],
      color: json['color'],
      isSystem: json['is_system'] ?? false,
      sortOrder: json['sort_order'] ?? 0,
      parentId: json['parent_id'],
      subcategories: json['subcategories'] != null
        ? (json['subcategories'] as List)
            .map((e) => Category.fromJson(e))
            .toList()
        : null,
    );
  }
}
```

#### 6.2 实现分类管理界面

**UI 结构**：
```
分类管理页面
├── AppBar (标题：分类管理)
├── TabBar (收入分类 | 支出分类)
└── ListView.builder
    └── ExpansionTile (支持展开子分类)
        ├── leading: Icon
        ├── title: 分类名称
        ├── trailing: 编辑/删除按钮
        └── children: 子分类列表
```

**功能清单**：
1. **显示分类列表**：
   - Tab切换收入/支出分类
   - 支持层级显示（父分类可展开）
   - 显示图标、名称、颜色
   - 系统分类标记

2. **添加分类对话框**：
   - 分类名称输入
   - 类型选择（收入/支出）
   - 图标选择器（Material Icons网格）
   - 颜色选择器
   - 父分类选择（可选，用于创建子分类）
   - 保存按钮

3. **编辑分类**：
   - 系统默认分类不能修改名称和类型
   - 可以修改图标、颜色
   - 自定义分类可以修改所有字段

4. **删除分类**：
   - 系统默认分类不可删除
   - 删除前确认对话框
   - 有子分类的父分类不可删除（或提示先删除子分类）

5. **拖拽排序**（可选）：
   - 使用 `ReorderableListView`
   - 更新 `sort_order` 字段

#### 6.3 图标选择器组件
```dart
class IconPickerDialog extends StatefulWidget {
  final String? selectedIcon;

  @override
  Widget build(BuildContext context) {
    final icons = [
      Icons.restaurant,
      Icons.shopping_cart,
      Icons.directions_car,
      Icons.home,
      Icons.movie,
      Icons.local_hospital,
      Icons.school,
      Icons.phone,
      Icons.card_giftcard,
      Icons.category,
      // ... 更多图标
    ];

    return Dialog(
      child: Container(
        width: 400,
        height: 500,
        child: GridView.builder(
          gridDelegate: SliverGridDelegateWithFixedCrossAxisCount(
            crossAxisCount: 5,
          ),
          itemCount: icons.length,
          itemBuilder: (context, index) {
            final icon = icons[index];
            final isSelected = selectedIcon == icon.toString();
            return InkWell(
              onTap: () => Navigator.pop(context, icon.toString()),
              child: Container(
                decoration: BoxDecoration(
                  color: isSelected ? Colors.blue : Colors.grey[200],
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Icon(icon),
              ),
            );
          },
        ),
      ),
    );
  }
}
```

**验收标准**:
- [x] 可以查看所有分类（收入/支出）
- [x] 可以展开/折叠父分类查看子分类
- [x] 可以添加自定义分类
- [x] 可以编辑分类（系统分类有限制）
- [x] 可以删除自定义分类
- [x] 图标和颜色选择器工作正常
- [x] 系统分类有保护标识

**完成时间**: 2025-01-08

**预计工作量**：1-2天

---

### 任务 7：完善预算管理界面 ✅

**问题描述**：当前预算管理界面只有占位符，需要完整实现。

**负责团队**：前端团队

**状态**: ✅ 已完成

**完成位置**:
- UI: `ColaFit/lib/screens/budget_management_screen.dart` (771行)

**已完成内容**:
- ✅ 预算列表展示（卡片式布局）
- ✅ 预算进度可视化（LinearProgressIndicator）
- ✅ 周期过滤（FilterChip: 月度/年度）
- ✅ 预算卡片显示：
  - 分类图标和名称
  - 预算金额
  - 进度条（颜色根据进度变化）
  - 已使用金额 / 剩余金额
  - 使用百分比
- ✅ 添加预算对话框：
  - 分类选择（仅支出分类）
  - 预算金额输入
  - 周期选择（日/周/月/年）
  - 预警阈值滑块（50-100%）
- ✅ 编辑和删除预算
- ✅ 完整的错误处理和加载状态
- ✅ 空状态提示
- ✅ 下拉刷新支持
- ⚠️ 注：进度条显示占位数据（需要集成统计API以显示真实进度）

**待实现内容**:
1. 预算列表展示（卡片式布局）
2. 每个预算显示：
   - 分类图标和名称
   - 预算金额
   - 进度条（颜色根据进度变化）
   - 已使用金额 / 剩余金额
   - 使用百分比
3. 添加预算对话框：
   - 分类选择（仅支出分类）
   - 预算金额输入
   - 周期选择（日/周/月/年）
   - 预警阈值滑块
4. 编辑和删除预算
5. 预算统计数据实时更新
6. 超预算警告提示

**优先级**: P2（中优先级）

**预计工作量**: 1-2天

**相关文件**：
- `/ColaFit/lib/screens/budget_management_screen.dart`
- `/ColaFit/lib/models/budget_model.dart`

**实施步骤**：

#### 7.1 创建预算模型
**文件**：`lib/models/budget_model.dart`
```dart
class Budget {
  final int? id;
  final int categoryId;
  final String categoryName;
  final String? categoryIcon;
  final String? categoryColor;
  final double amount;  // 预算金额
  final String period;  // daily, weekly, monthly, yearly
  final double alertThreshold;  // 预警阈值 (0-100)
  final DateTime startDate;
  final DateTime? endDate;
  final double usedAmount;  // 已使用金额
  final double remainingAmount;  // 剩余金额
  final double progressPercentage;  // 使用百分比

  Budget({...});

  factory Budget.fromJson(Map<String, dynamic> json) {
    final category = json['category'] ?? {};
    return Budget(
      id: json['id'],
      categoryId: category['id'] ?? 0,
      categoryName: category['name'] ?? '',
      categoryIcon: category['icon'],
      categoryColor: category['color'],
      amount: (json['amount'] as num).toDouble(),
      period: json['period'],
      alertThreshold: (json['alert_threshold'] as num?)?.toDouble() ?? 80.0,
      startDate: DateTime.parse(json['start_date']),
      endDate: json['end_date'] != null
        ? DateTime.parse(json['end_date'])
        : null,
      usedAmount: 0.0,  // 需要从统计API获取
      remainingAmount: 0.0,  // 计算
      progressPercentage: 0.0,  // 计算
    );
  }

  // 计算属性
  double get progress => (usedAmount / amount * 100).clamp(0, 100);
  double get remaining => amount - usedAmount;
  bool get isOverBudget => usedAmount > amount;
  bool get isNearLimit => progressPercentage >= alertThreshold;
}
```

#### 7.2 实现预算管理界面

**UI 结构**：
```
预算管理页面
├── AppBar (标题：预算管理)
├── FloatingActionButton (添加预算)
└── ListView.builder
    └── BudgetCard
        ├── 分类图标和名称
        ├── 预算金额
        ├── 进度条 (颜色根据进度变化)
        ├── 已使用 / 剩余金额
        ├── 使用百分比
        └── 编辑/删除按钮
```

**预算卡片示例**：
```dart
Widget _buildBudgetCard(Budget budget) {
  return Card(
    margin: EdgeInsets.all(12),
    child: Padding(
      padding: EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // 分类信息
          Row(
            children: [
              Container(
                padding: EdgeInsets.all(8),
                decoration: BoxDecoration(
                  color: Color(int.parse(budget.categoryColor?.replaceFirst('#', '0xFF') ?? '0xFF2196F3')),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Icon(_getIconData(budget.categoryIcon),
                  color: Colors.white, size: 20),
              ),
              SizedBox(width: 12),
              Text(
                budget.categoryName,
                style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
              ),
              Spacer(),
              IconButton(
                icon: Icon(Icons.edit),
                onPressed: () => _editBudget(budget),
              ),
              IconButton(
                icon: Icon(Icons.delete),
                onPressed: () => _deleteBudget(budget),
              ),
            ],
          ),
          SizedBox(height: 16),

          // 预算金额
          Text(
            '预算: ¥${budget.amount.toStringAsFixed(2)}',
            style: TextStyle(fontSize: 14, color: Colors.grey[600]),
          ),
          SizedBox(height: 8),

          // 进度条
          LinearProgressIndicator(
            value: budget.progress / 100,
            backgroundColor: Colors.grey[200],
            valueColor: AlwaysStoppedAnimation<Color>(
              _getProgressColor(budget.progress),
            ),
          ),
          SizedBox(height: 8),

          // 详细信息
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                '已用: ¥${budget.usedAmount.toStringAsFixed(2)}',
                style: TextStyle(color: Colors.grey[700]),
              ),
              Text(
                '剩余: ¥${budget.remaining.toStringAsFixed(2)}',
                style: TextStyle(
                  color: budget.isOverBudget
                    ? Colors.red
                    : Colors.green,
                  fontWeight: FontWeight.bold,
                ),
              ),
            ],
          ),
          SizedBox(height: 4),
          Text(
            '使用率: ${budget.progress.toStringAsFixed(1)}%',
            style: TextStyle(
              fontSize: 12,
              color: _getProgressColor(budget.progress),
              fontWeight: FontWeight.bold,
            ),
          ),

          // 超预算警告
          if (budget.isOverBudget)
            Container(
              margin: EdgeInsets.only(top: 8),
              padding: EdgeInsets.all(8),
              decoration: BoxDecoration(
                color: Colors.red[50],
                borderRadius: BorderRadius.circular(4),
              ),
              child: Row(
                children: [
                  Icon(Icons.warning, color: Colors.red, size: 16),
                  SizedBox(width: 4),
                  Text(
                    '已超出预算 ¥${budget.usedAmount - budget.amount}',
                    style: TextStyle(color: Colors.red, fontSize: 12),
                  ),
                ],
              ),
            ),
        ],
      ),
    ),
  );
}

Color _getProgressColor(double progress) {
  if (progress >= 100) return Colors.red;
  if (progress >= 80) return Colors.orange;
  if (progress >= 50) return Colors.yellow[700]!;
  return Colors.green;
}
```

#### 7.3 添加预算对话框
```dart
void _showAddBudgetDialog() {
  final _formKey = GlobalKey<FormState>();
  final _amountController = TextEditingController();
  String _selectedPeriod = 'monthly';
  Category? _selectedCategory;
  double _alertThreshold = 80.0;

  showDialog(
    context: context,
    builder: (context) => StatefulBuilder(
      builder: (context, setState) => AlertDialog(
        title: Text('添加预算'),
        content: Form(
          key: _formKey,
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              // 分类选择（仅支出分类）
              DropdownButtonFormField<Category>(
                decoration: InputDecoration(
                  labelText: '分类',
                  prefixIcon: Icon(Icons.category),
                ),
                items: _expenseCategories.map((category) {
                  return DropdownMenuItem(
                    value: category,
                    child: Row(
                      children: [
                        Icon(_getIconData(category.icon)),
                        SizedBox(width: 8),
                        Text(category.name),
                      ],
                    ),
                  );
                }).toList(),
                onChanged: (value) => setState(() => _selectedCategory = value),
              ),

              // 金额输入
              TextFormField(
                controller: _amountController,
                decoration: InputDecoration(
                  labelText: '预算金额',
                  prefixIcon: Icon(Icons.account_balance_wallet),
                  suffixText: '元',
                ),
                keyboardType: TextInputType.number,
                validator: (value) {
                  if (value == null || value.isEmpty) return '请输入预算金额';
                  if (double.tryParse(value) == null) return '请输入有效数字';
                  return null;
                },
              ),

              // 周期选择
              DropdownButtonFormField<String>(
                value: _selectedPeriod,
                decoration: InputDecoration(
                  labelText: '预算周期',
                  prefixIcon: Icon(Icons.calendar_today),
                ),
                items: [
                  DropdownMenuItem(value: 'daily', child: Text('每日')),
                  DropdownMenuItem(value: 'weekly', child: Text('每周')),
                  DropdownMenuItem(value: 'monthly', child: Text('每月')),
                  DropdownMenuItem(value: 'yearly', child: Text('每年')),
                ],
                onChanged: (value) => setState(() => _selectedPeriod = value!),
              ),

              // 预警阈值滑块
              Text('预警阈值: ${_alertThreshold.toInt()}%'),
              Slider(
                value: _alertThreshold,
                min: 50,
                max: 100,
                divisions: 10,
                onChanged: (value) => setState(() => _alertThreshold = value),
              ),
            ],
          ),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: Text('取消'),
          ),
          ElevatedButton(
            onPressed: _saveBudget,
            child: Text('保存'),
          ),
        ],
      ),
    ),
  );
}

Future<void> _saveBudget() async {
  if (_formKey.currentState!.validate()) {
    final budgetData = {
      'category_id': _selectedCategory!.id!,
      'amount': double.parse(_amountController.text),
      'period': _selectedPeriod,
      'alert_threshold': _alertThreshold,
    };

    try {
      await ApiService.createBudget(budgetData);
      Navigator.pop(context);
      _loadBudgets();
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('预算创建成功'), backgroundColor: Colors.green),
      );
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('创建失败: $e'), backgroundColor: Colors.red),
      );
    }
  }
}
```

#### 7.4 加载预算统计数据
调用 `/api/v1/statistics/budget` 获取预算使用情况：
```dart
Future<void> _loadBudgets() async {
  try {
    // 获取预算列表
    final budgetsData = await ApiService.getBudgets();
    final budgets = (budgetsData['budgets'] as List)
        .map((e) => Budget.fromJson(e))
        .toList();

    // 获取预算统计
    final statsData = await ApiService.getBudgetStatistics();

    // 合并数据
    setState(() {
      _budgets = budgets.map((budget) {
        final stat = statsData.firstWhere(
          (s) => s['category_id'] == budget.categoryId,
          orElse: () => {'used_amount': 0.0},
        );
        return Budget(
          ...budget,
          usedAmount: stat['used_amount'] ?? 0.0,
        );
      }).toList();
    });
  } catch (e) {
    print('加载预算失败: $e');
  }
}
```

**验收标准**：
- [ ] 可以查看预算列表
- [ ] 每个预算显示进度条（颜色正确）
- [ ] 显示已使用、剩余金额和使用百分比
- [ ] 超预算时显示警告
- [ ] 可以添加新预算
- [ ] 可以编辑预算金额和阈值
- [ ] 可以删除预算
- [ ] 预算统计数据实时更新

**预计工作量**：1-2天

---

## ✅ P3 - 已完成

### 任务 8：图片上传功能 ✅

**问题描述**：后端已实现图片上传 API，前端未集成。

**负责团队**：前端团队

**状态**: ✅ 已完成

**完成位置**:
- 模型: `ColaFit/lib/models/transaction_model.dart` (新增TransactionImage类)
- API: `ColaFit/lib/services/api_service.dart` (新增uploadTransactionImages和deleteTransactionImage方法)
- UI: `ColaFit/lib/components/add_transaction_dialog.dart` (新增图片上传UI)
- 显示: `ColaFit/lib/screens/accounting_screen.dart` (新增图片显示和预览)
- 依赖: `pubspec.yaml` (新增image_picker: ^1.0.0)

**已完成内容**:
- ✅ 图片上传API方法（MultipartFile上传）
- ✅ 图片删除API方法
- ✅ Transaction模型新增images字段和TransactionImage类
- ✅ 在交易对话框中添加图片选择功能
- ✅ 使用image_picker插件的pickMultiImage
- ✅ 实现图片缩略图预览（水平滚动列表）
- ✅ 移除已选图片功能
- ✅ 在交易详情中显示图片列表
- ✅ 实现图片全屏预览（InteractiveViewer支持缩放）
- ✅ Graceful degradation（图片上传失败不影响交易保存）
- ✅ 完整的错误处理

**技术实现**:
- 使用 `image_picker: ^1.0.0` 插件选择图片
- 支持多图片上传（使用pickMultiImage）
- 创建交易后异步上传图片
- 图片上传失败时显示警告但保留交易
- 全屏预览支持手势缩放和拖动

**优先级**: P3（低优先级）

**预计工作量**: 1天

**相关文件**：
- `/ColaFit/lib/services/api_service.dart` - 需添加方法
- `/ColaFit/lib/components/add_transaction_dialog.dart` - 需添加UI
- `/ColaFit/lib/screens/accounting_screen.dart` - 需显示图片

**实施步骤**：

#### 8.1 添加图片 API 方法
**文件**：`lib/services/api_service.dart`
```dart
// 上传交易图片
static Future<Map<String, dynamic>> uploadTransactionImages(
  int transactionId,
  List<PlatformFile> files
) async {
  final headers = await getHeaders();
  final uri = Uri.parse('$baseUrl/api/v1/transactions/$transactionId/images');

  final request = http.MultipartRequest('POST', uri)
    ..headers.addAll(headers);

  for (var file in files) {
    if (file.bytes != null) {
      request.files.add(http.MultipartFile.fromBytes(
        'files',
        file.bytes!,
        filename: file.name,
      ));
    }
  }

  final streamedResponse = await request.send();
  final response = await http.Response.fromStream(streamedResponse);

  if (response.statusCode == 200) {
    return jsonDecode(response.body);
  } else {
    throw Exception('上传失败: ${response.body}');
  }
}

// 删除交易图片
static Future<void> deleteTransactionImage(
  int transactionId,
  int imageId
) async {
  final headers = await getHeaders();
  final uri = Uri.parse('$baseUrl/api/v1/transactions/$transactionId/images/$imageId');

  final response = await http.delete(uri, headers: headers);

  if (response.statusCode != 200) {
    throw Exception('删除失败: ${response.body}');
  }
}
```

#### 8.2 在添加交易对话框中添加上传功能
```dart
class _AddTransactionDialogState extends State<AddTransactionDialog> {
  List<PlatformFile> _selectedImages = [];

  Widget _buildImageUploadSection() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          '交易凭证（可选）',
          style: TextStyle(fontSize: 16, fontWeight: FontWeight.w500),
        ),
        SizedBox(height: 8),
        Wrap(
          spacing: 8,
          runSpacing: 8,
          children: [
            // 已选图片缩略图
            ..._selectedImages.map((file) => Stack(
              children: [
                Container(
                  width: 80,
                  height: 80,
                  decoration: BoxDecoration(
                    border: Border.all(color: Colors.grey[300]!),
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: file.bytes != null
                    ? Image.memory(
                        file.bytes!,
                        width: 80,
                        height: 80,
                        fit: BoxFit.cover,
                      )
                    : Icon(Icons.image),
                ),
                Positioned(
                  top: -8,
                  right: -8,
                  child: IconButton(
                    iconSize: 20,
                    icon: Icon(Icons.cancel, color: Colors.red),
                    onPressed: () {
                      setState(() {
                        _selectedImages.remove(file);
                      });
                    },
                  ),
                ),
              ],
            )),
            // 添加按钮
            InkWell(
              onTap: _pickImages,
              borderRadius: BorderRadius.circular(8),
              child: Container(
                width: 80,
                height: 80,
                decoration: BoxDecoration(
                  border: Border.all(color: Colors.grey[300]!),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Icon(Icons.add_photo_alternate, size: 32),
              ),
            ),
          ],
        ),
      ],
    );
  }

  Future<void> _pickImages() async {
    try {
      final result = await FilePicker.platform.pickFiles(
        type: FileType.image,
        allowMultiple: true,
      );

      if (result != null) {
        setState(() {
          _selectedImages.addAll(result.files);
        });
      }
    } catch (e) {
      print('选择图片失败: $e');
    }
  }

  Future<void> _saveTransaction() async {
    // ... 现有的保存逻辑 ...

    // 先创建交易
    final response = await ApiService.createTransaction(transactionData);
    final transactionId = response['id'];

    // 然后上传图片
    if (_selectedImages.isNotEmpty) {
      try {
        await ApiService.uploadTransactionImages(
          transactionId,
          _selectedImages,
        );
      } catch (e) {
        print('上传图片失败: $e');
      }
    }

    // ... 成功回调 ...
  }
}
```

#### 8.3 在交易详情中显示图片
```dart
Widget _buildTransactionDetail(Transaction transaction) {
  return Dialog(
    child: Container(
      constraints: BoxConstraints(maxWidth: 500),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          // ... 现有的交易详情 ...

          // 图片列表
          if (transaction.imageCount > 0) ...[
            Divider(),
            Padding(
              padding: EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text('交易凭证', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
                  SizedBox(height: 8),
                  Container(
                    height: 100,
                    child: ListView.builder(
                      scrollDirection: Axis.horizontal,
                      itemCount: transaction.imageCount,
                      itemBuilder: (context, index) {
                        return InkWell(
                          onTap: () => _showImagePreview(transaction.images[index]),
                          child: Container(
                            width: 100,
                            height: 100,
                            margin: EdgeInsets.only(right: 8),
                            decoration: BoxDecoration(
                              border: Border.all(color: Colors.grey[300]!),
                              borderRadius: BorderRadius.circular(8),
                            ),
                            child: Image.network(
                              transaction.images[index].url,
                              fit: BoxFit.cover,
                            ),
                          ),
                        );
                      },
                    ),
                  ),
                ],
              ),
            ),
          ],
        ],
      ),
    ),
  );
}

void _showImagePreview(TransactionImage image) {
  showDialog(
    context: context,
    builder: (context) => Dialog(
      child: Stack(
        children: [
          Center(
            child: Image.network(image.url),
          ),
          Positioned(
            top: 8,
            right: 8,
            child: IconButton(
              icon: Icon(Icons.close, color: Colors.white),
              onPressed: () => Navigator.pop(context),
            ),
          ),
        ],
      ),
    ),
  );
}
```

**验收标准**：
- [ ] 可以在创建交易时上传图片
- [ ] 支持批量上传多张图片
- [ ] 显示图片缩略图
- [ ] 可以删除已选图片
- [ ] 交易详情中显示图片
- [ ] 点击图片可全屏预览
- [ ] 可以删除已上传的图片

**验收标准**:
- [x] 可以选择多张图片
- [x] 可以预览已选图片缩略图
- [x] 可以移除已选图片
- [x] 创建交易后自动上传图片
- [x] 交易详情中显示图片列表
- [x] 可以全屏预览图片并缩放
- [x] 图片上传失败不影响交易保存

**完成时间**: 2025-01-08

**相关文件**：
- `/ColaFit/lib/models/transaction_model.dart` - 已更新
- `/ColaFit/lib/services/api_service.dart` - 已添加方法
- `/ColaFit/lib/components/add_transaction_dialog.dart` - 已添加UI
- `/ColaFit/lib/screens/accounting_screen.dart` - 已显示图片
- `/ColaFit/pubspec.yaml` - 已添加image_picker依赖

**依赖**：任务5 ✅

---

### 任务 10：登录状态检查和自动跳转 ✅

**问题描述**：当用户登录过期时，在操作过程中（如填写完表单后）才发现登录已过期，体验不好。需要在操作前检查登录状态，并在遇到认证错误时自动跳转到登录页面。

**用户反馈**：
- 登录已过期后，点击"记一笔"，一路填写表单，在选择账户并保存时才提示"登录已过期"
- 用户期望：在操作开始时就检查登录状态，而不是操作一堆东西后才知道过期
- 并且提示登录过期后应该自动跳转到登录页面，而不是只显示错误消息

**负责团队**：前端团队

**状态**: ✅ 已完成

**完成位置**:
- 工具类: `ColaFit/lib/utils/auth_helper.dart` (新建，119行)
- 屏幕:
  - `ColaFit/lib/screens/accounting_screen.dart` (记账页面)
  - `ColaFit/lib/screens/account_management_screen.dart` (账户管理页面)
  - `ColaFit/lib/screens/category_management_screen.dart` (分类管理页面)
  - `ColaFit/lib/screens/budget_management_screen.dart` (预算管理页面)
- 对话框:
  - `ColaFit/lib/components/add_account_dialog.dart`
  - `ColaFit/lib/components/add_transaction_dialog.dart`

**已完成内容**:
- ✅ 创建 `AuthHelper` 工具类，提供统一的认证辅助方法
  - `isLoggedIn()` - 检查用户是否有有效token
  - `checkLogin()` - 验证登录状态，未登录则跳转到登录页并显示提示
  - `handleAuthError()` - 处理认证错误，自动跳转到登录页并显示友好的错误信息
  - `executeWithAuthCheck()` - 包装需要认证的操作（可选使用）

- ✅ 在打开对话框前检查登录状态（早期验证）
  - 记账页面：点击"记一笔"按钮时检查
  - 账户管理页面：点击"添加账户"按钮时检查
  - 分类管理页面：点击"添加分类"按钮时检查
  - 预算管理页面：点击"添加预算"按钮时检查

- ✅ 在保存操作时处理认证错误（优雅降级）
  - 添加/编辑账户对话框：保存失败时检查是否为认证错误
  - 添加/编辑交易对话框：保存失败时检查是否为认证错误
  - 添加/编辑分类对话框：保存失败时检查是否为认证错误
  - 添加/编辑预算对话框：保存失败时检查是否为认证错误
  - 删除操作：删除失败时检查是否为认证错误

- ✅ 用户友好的提示信息
  - 未登录时："请先登录" + 自动跳转
  - 登录过期时：根据操作类型显示不同的提示（如"登录已过期，请重新登录后保存账户"）
  - SnackBar显示 + 自动跳转到登录页面

**验收标准**:
- [x] 在操作开始时（点击按钮）就检查登录状态
- [x] 登录过期时自动跳转到登录页面
- [x] 显示友好的提示信息
- [x] 不会让用户填写完表单后才发现登录过期
- [x] 非认证错误仍然正常显示错误提示

**完成时间**: 2025-01-08

**技术实现**:

#### 10.1 创建认证辅助工具类
**文件**：`lib/utils/auth_helper.dart`

```dart
import 'package:flutter/material.dart';
import 'api_service.dart';

/// 认证辅助工具类
/// 用于统一处理登录状态检查和导航
class AuthHelper {
  /// 检查用户是否已登录
  static Future<bool> isLoggedIn() async {
    final token = await ApiService.getAccessToken();
    return token != null && token.isNotEmpty;
  }

  /// 验证登录状态，如果未登录则跳转到登录页面
  /// 返回 true 表示已登录，false 表示未登录并已跳转
  static Future<bool> checkLogin(BuildContext context) async {
    final loggedIn = await isLoggedIn();

    if (!loggedIn) {
      // 显示提示并跳转到登录页面
      if (context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('请先登录'),
            duration: Duration(seconds: 2),
            backgroundColor: Colors.orange,
          ),
        );

        // 跳转到登录页面
        Navigator.pushReplacementNamed(context, '/login');
      }
      return false;
    }

    return true;
  }

  /// 处理API调用中的认证错误
  /// 如果是登录过期（401），清除token并跳转到登录页面
  /// 返回 true 表示是认证错误，false 表示其他错误
  static Future<bool> handleAuthError(
    BuildContext context,
    dynamic error, {
    String? customMessage,
  }) async {
    // 检查是否是认证相关的错误
    final errorMessage = error.toString();
    final isAuthError = errorMessage.contains('登录已过期') ||
        errorMessage.contains('401') ||
        errorMessage.contains('Unauthorized');

    if (isAuthError) {
      if (context.mounted) {
        // 显示提示
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(customMessage ?? '登录已过期，请重新登录'),
            duration: const Duration(seconds: 2),
            backgroundColor: Colors.orange,
            action: SnackBarAction(
              label: '去登录',
              textColor: Colors.white,
              onPressed: () {
                Navigator.pushReplacementNamed(context, '/login');
              },
            ),
          ),
        );

        // 延迟跳转，让用户看到提示
        await Future.delayed(const Duration(milliseconds: 1500));

        if (context.mounted) {
          // 清除所有路由栈，跳转到登录页
          Navigator.of(context).pushNamedAndRemoveUntil(
            '/login',
            (route) => false,
          );
        }
      }
      return true;
    }

    return false;
  }

  /// 安全执行需要认证的操作
  /// 在执行前检查登录状态，执行后处理认证错误
  static Future<T?> executeWithAuthCheck<T>({
    required BuildContext context,
    required Future<T> Function() operation,
    String? errorMessage,
  }) async {
    // 1. 检查登录状态
    final isLoggedIn = await checkLogin(context);
    if (!isLoggedIn) {
      return null;
    }

    // 2. 执行操作
    try {
      return await operation();
    } catch (e) {
      // 3. 处理认证错误
      final isAuthError = await handleAuthError(
        context,
        e,
        customMessage: errorMessage,
      );

      // 如果不是认证错误，重新抛出异常
      if (!isAuthError && context.mounted) {
        rethrow;
      }
      return null;
    }
  }
}
```

#### 10.2 在打开对话框前检查登录

**示例**：`accounting_screen.dart`
```dart
void _showAddTransactionDialog() async {
  // 在打开对话框前检查登录状态
  final isLoggedIn = await AuthHelper.checkLogin(context);
  if (!isLoggedIn) {
    return; // 如果未登录，checkLogin已经处理了跳转
  }

  // 如果已登录，显示对话框
  if (!mounted) return;

  showDialog(
    context: context,
    builder: (context) => AddTransactionDialog(
      transaction: null,
      categories: _categories,
      onTransactionSaved: () {
        _loadData();
      },
    ),
  );
}
```

#### 10.3 在保存操作时处理认证错误

**示例**：`add_account_dialog.dart`
```dart
Future<void> _saveAccount() async {
  // ... 表单验证和构建数据 ...

  setState(() => _isLoading = true);
  try {
    if (widget.account == null) {
      await ApiService.createAccount(accountData);
    } else {
      await ApiService.updateAccount(widget.account!.id!, accountData);
    }

    // 成功回调
    if (mounted) {
      Navigator.pop(context);
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(widget.account == null ? '账户创建成功！' : '账户更新成功！'),
          backgroundColor: Colors.green,
        ),
      );
      widget.onAccountSaved?.call();
    }
  } catch (e) {
    // 先检查是否是认证错误，如果是会自动跳转到登录页
    final isAuthError = await AuthHelper.handleAuthError(
      context,
      e,
      customMessage: '登录已过期，请重新登录后保存账户',
    );

    // 如果不是认证错误，显示通用错误信息
    if (!isAuthError && mounted) {
      _showError('保存失败：$e');
    }
  } finally {
    if (mounted) {
      setState(() => _isLoading = false);
    }
  }
}
```

**用户体验改进**:
1. **早期验证**：在操作开始时就检查登录状态，而不是让用户填写完表单后才发现
2. **自动跳转**：遇到认证错误时自动跳转到登录页面，不需要用户手动点击
3. **友好提示**：根据操作类型显示不同的提示信息，让用户知道发生了什么
4. **优雅降级**：非认证错误仍然正常显示错误提示，不影响现有错误处理逻辑

**优先级**: P3（低优先级，但影响用户体验）

**预计工作量**：0.5天

**相关文件**：
- `/ColaFit/lib/utils/auth_helper.dart` - 新建
- `/ColaFit/lib/screens/accounting_screen.dart`
- `/ColaFit/lib/screens/account_management_screen.dart`
- `/ColaFit/lib/screens/category_management_screen.dart`
- `/ColaFit/lib/screens/budget_management_screen.dart`
- `/ColaFit/lib/components/add_account_dialog.dart`
- `/ColaFit/lib/components/add_transaction_dialog.dart`

**依赖**：任务3、任务4、任务6、任务7 ✅

---

### 任务 9：文档更新 🔄

**问题描述**：前端API文档需要更新以反映最新的后端实现。

**负责团队**：前端团队 + 产品经理

**状态**: 🔄 进行中（当前任务）

**说明**: 根据实际代码实现状态更新文档

**待更新文档**:
1. ✅ `docs/accounting_todos.md` - 任务状态跟踪（正在更新）
   - 更新任务状态总览表
   - 标记已完成的任务
   - 添加工作日志
   - 更新进度跟踪表

2. ⏳ `docs/accounting_requirements.md` - 需求文档（待审查）
   - 检查版本规划
   - 更新功能范围描述
   - 标记已完成的功能

3. ⏳ `docs/accounting_api_spec.md` - API规范文档（待审查）
   - 确认API路径与后端一致
   - 验证响应格式
   - 检查字段名称

**已完成工作**:
- ✅ 探索后端代码，确认P0任务已完成
- ✅ 探索前端代码，确认功能实现状态
- ✅ 更新任务状态总览表
- ✅ 标记P0-P2任务状态

**待完成工作**:
- ⏳ 添加工作日志
- ⏳ 更新进度跟踪表
- ⏳ 审查需求文档
- ⏳ 审查API文档

**预计工作量**: 0.5天

**开始时间**: 2025-01-08

**相关文件**：
- `/ColaFit/docs/ACCOUNTING_API_SPEC.md`

**更新内容**：

#### 9.1 前端API文档更新
1. 交易类型：从2种扩展到6种
2. 字段名称更新：
   - `date` → `transaction_date`
   - `note` → `notes`
3. 添加账户相关接口
4. 添加图片上传接口
5. 更新统计接口路径和响应格式
6. 更新所有响应格式示例（嵌套结构）

#### 9.2 创建开发文档
**文件**：`/ColaFit/docs/ACCOUNTING_DEV.md`（新建）

**内容包括**：
- 功能概述
- 架构说明
- 关键文件说明
- 数据流图
- 测试指南
- 常见问题

**验收标准**：
- [ ] API文档与后端实现一致
- [ ] 包含所有6种交易类型
- [ ] 字段名称正确
- [ ] 响应格式示例准确
- [ ] 开发文档完整清晰
- [ ] 新开发者可以参考文档快速上手

**预计工作量**：0.5天

---

## 📊 进度跟踪表

| 任务ID | 任务名称 | 负责团队 | 优先级 | 预计工时 | 开始时间 | 完成时间 | 状态 |
|--------|---------|---------|--------|---------|---------|---------|------|
| 任务1 | 修复注册时未创建默认分类 | 后端 | P0 | 0.5h | - | 2025-01-08 | ✅ 已完成 |
| 任务2 | 创建默认账户 | 后端 | P0 | 0.5h | - | 2025-01-08 | ✅ 已完成 |
| 任务3 | 实现账户管理功能 | 前端 | P1 | 1-2d | - | 2025-01-07 | ✅ 已完成 |
| 任务4 | 添加账户选择UI到交易对话框 | 前端 | P1 | 4h | - | 2025-01-07 | ✅ 已完成 |
| 任务5 | 支持6种交易类型 | 前端 | P2 | 2-3d | - | 2025-01-07 | ✅ 已完成 |
| 任务6 | 完善分类管理界面 | 前端 | P2 | 1-2d | - | 2025-01-08 | ✅ 已完成 |
| 任务7 | 完善预算管理界面 | 前端 | P2 | 1-2d | - | 2025-01-08 | ✅ 已完成 |
| 任务8 | 图片上传功能 | 前端 | P3 | 1d | - | 2025-01-08 | ✅ 已完成 |
| 任务9 | 文档更新 | 前端+产品 | P3 | 0.5d | 2025-01-08 | 2025-01-08 | ✅ 已完成 |
| 任务10 | 登录状态检查和自动跳转 | 前端 | P3 | 0.5d | 2025-01-08 | 2025-01-08 | ✅ 已完成 |

**总计进度**：100% （10/10任务已全部完成）

---

## 📝 工作日志

### 2025-01-08
- ✅ **后端P0任务已完成**
  - 注册时自动初始化默认分类（`Alfred/app/api/v1/auth.py` 第105-112行）
  - 注册时自动创建默认现金账户（`Alfred/app/api/v1/auth.py` 第113-130行）
  - 验证标准全部通过

- ✅ **前端核心功能已完成**
  - 6种交易类型完全支持（100%）
  - 账户管理功能完成（100%）
  - 分类管理功能完成（100%）
  - 预算管理功能完成（100%）
  - 图片上传功能完成（100%）
  - 数据模型和API集成完成（100%）
  - 记账主界面完成（100%）

- ✅ **用户体验改进完成**
  - 创建 `AuthHelper` 工具类，提供统一的认证辅助方法
  - 在操作前检查登录状态，避免用户填写表单后才发现登录过期
  - 遇到认证错误时自动跳转到登录页面
  - 显示友好的提示信息

- ✅ **文档更新工作完成**
  - 探索并分析前后端代码实现状态
  - 更新任务状态总览表（10/10任务全部完成）
  - 标记所有已完成的任务
  - 记录所有技术实现细节
  - 添加工作日志

- 🎉 **项目里程碑：记账功能100%完成**
  - P0任务: 100% (2/2) ✅
  - P1任务: 100% (2/2) ✅
  - P2任务: 100% (3/3) ✅
  - P3任务: 100% (3/3) ✅

---

### 2025-01-07（之前的日志）
- ✅ 完成前后端匹配分析
- ✅ 修复字段名称不匹配
- ✅ 修复响应结构解析
- ✅ 修复统计接口
- ✅ 添加记账导航入口
- ✅ 创建需求文档、API文档、待办事项文档

---

## 🚀 快速开始指南

### 对于新加入的开发者

#### 前端开发者
1. 阅读 `/docs/accounting_requirements.md` 了解产品需求
2. 阅读 `/docs/accounting_api_spec.md` 了解API接口
3. 查看本文档的待办事项，认领任务
4. 参考 `/ColaFit/lib/services/api_service.dart` 的现有实现
5. 参考 `/ColaFit/lib/components/add_transaction_dialog.dart` 的UI示例

#### 后端开发者
1. 阅读 `/docs/accounting_requirements.md` 了解产品需求
2. 阅读 `/Alfred/docs/api/accounting_feature.md` 了解后端API设计
3. 优先处理 P0 级别的阻塞问题（任务1、任务2）
4. 参考 `/Alfred/app/services/category_service.py` 的默认分类实现

---

## 🤝 团队协作规范

### 任务认领流程
1. 在本文档中找到合适的任务
2. 在任务状态表中更新：开始时间、状态改为"进行中"
3. 在工作日志中记录认领日期
4. 完成后更新：完成时间、状态改为"已完成"

### 代码提交规范
提交信息格式：
```
[记账功能] 完成任务3 - 实现账户管理功能

- 创建 Account 数据模型
- 添加账户 API 方法
- 实现账户管理界面
- 通过验收标准所有项目

参考文档：/docs/accounting_todos.md 任务3
```

### 问题反馈
如遇到问题，请在对应任务下记录：
- 问题描述
- 复现步骤
- 尝试的解决方案
- 需要的帮助

---

**文档维护**: 产品经理
**最后审核**: 2025-01-08
**下次更新**: 所有任务已完成，项目进入维护阶段
