# 自我验证规范

> **核心原则：代码必须经过验证才能交付**
>
> 写完代码后，必须使用 Chrome MCP 进行完整的自我验证，确保功能正常工作。

---

## 工作流程

```
┌─────────────────────────────────────────────────────────┐
│  开发流程（严格执行）                                    │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  1. 接收任务                                             │
│     "实现 XXX 功能"                                      │
│     ↓                                                  │
│  2. 编写代码 + 单元测试（同步进行）                      │
│     - 分析需求                                          │
│     - 先编写测试用例                                     │
│     - 编写实现代码                                       │
│     ↓                                                  │
│  3. 【第一步】代码自我审查（第一轮）                     │
│     - 检查代码质量                                      │
│     - 检查代码规范                                      │
│     - 检查安全性                                        │
│     - 检查性能问题                                      │
│     ↓                                                  │
│  4. 如果审查发现问题                                     │
│     - 修复代码                                          │
│     - 重新审查                                          │
│     - 直到通过                                          │
│     ↓                                                  │
│  5. 【第二步】运行单元测试                               │
│     ./gradlew test                                      │
│     ↓                                                  │
│  6. 如果单元测试失败                                     │
│     - 修复代码                                          │
│     - 重新运行单元测试                                  │
│     - 直到通过                                          │
│     ↓                                                  │
│  7. 【第三步】Chrome MCP 集成验证                        │
│     使用 Chrome MCP 验证功能                            │
│     ↓                                                  │
│  8. 如果集成验证失败                                     │
│     - 修复问题                                          │
│     - 重新验证                                          │
│     - 直到通过                                          │
│     ↓                                                  │
│  9. 【第四步】提交前二次审查（最终检查）                 │
│     - 最终代码审查                                      │
│     - 检查是否有遗漏                                    │
│     - 确认所有验证通过                                  │
│     ↓                                                  │
│  10. 提交代码                                           │
│      git add, commit, push                             │
│      ↓                                                  │
│  11. 报告完成                                           │
│      "✅ 已实现并验证通过 XXX 功能"                      │
│      - 代码审查：通过                                    │
│      - 单元测试：通过                                    │
│      - 集成验证：通过                                    │
│      ↓                                                  │
│  12. 你看到代码（已经是三重验证过的）                    │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

---

## 验证检查清单

### 第一阶段：代码自我审查（第一轮）

**代码质量**
- [ ] 代码逻辑清晰，易于理解
- [ ] 没有重复代码（DRY 原则）
- [ ] 函数/方法职责单一
- [ ] 命名清晰准确

**代码规范**
- [ ] 遵循项目编码规范
- [ ] Kotlin 代码符合 Kotlin 风格
- [ ] 注释充分且准确
- [ ] 没有调试用的 console.log/print

**安全性**
- [ ] 输入验证完善
- [ ] 没有硬编码的敏感信息
- [ ] SQL 使用参数化查询
- [ ] 没有 XSS 风险

**性能**
- [ ] 没有 N+1 查询问题
- [ ] 合理使用缓存
- [ ] 没有不必要的循环嵌套
- [ ] 资源正确释放

### 第二阶段：单元测试验证

- [ ] 编写了对应的单元测试
- [ ] 运行 `./gradlew test`
- [ ] 所有测试用例通过
- [ ] 测试覆盖率符合要求

### 第三阶段：Chrome MCP 集成验证

#### 前置条件

- [ ] 后端服务运行在 `http://localhost:8080`
- [ ] 前端服务运行在 `http://localhost:3000`
- [ ] 数据库连接正常
- [ ] **单元测试已通过**

#### 验证步骤

#### 1. 页面加载验证
```javascript
// 打开目标页面
await chrome.navigate_page('http://localhost:3000/xxx');

// 等待页面加载
await chrome.wait_for('关键文字');

// 检查页面结构
const snapshot = await chrome.take_snapshot();
// ✅ 验证：看到预期的元素
```

#### 2. 功能操作验证
```javascript
// 执行关键操作
await chrome.click(elementUid);

// 如果是输入框
await chrome.fill(inputUid, 'test value');

// 如果是自定义控件（如数字键盘）
await chrome.click(button5Uid);
await chrome.click(button0Uid);
// ...
```

#### 3. 状态验证
```javascript
// 使用 evaluate_script 检查状态
const state = await chrome.evaluate_script(`
  () => {
    return {
      value: document.querySelector('.xxx')?.textContent,
      // ...
    };
  }
`);
// ✅ 验证：state 符合预期
```

#### 4. 控制台检查
```javascript
// 检查是否有错误
const messages = await chrome.list_console_messages({
  types: ['error']
});
// ✅ 验证：没有错误消息
```

#### 5. 网络请求检查
```javascript
// 检查 API 调用
const requests = await chrome.list_network_requests({
  resourceTypes: ['fetch', 'xhr']
});
// ✅ 验证：API 请求成功
```

#### 6. 视觉验证（可选）
```javascript
// 截图保存
await chrome.take_screenshot({
  filePath: 'verification-screenshot.png'
});
```

---

## 常见场景验证

### 场景 1：表单提交

```javascript
// 1. 打开页面
await chrome.navigate_page('http://localhost:3000/transactions');
await chrome.wait_for('记一笔');

// 2. 打开表单
const snap1 = await chrome.take_snapshot();
const addBtn = snap1.find(el => el.text === '记一笔');
await chrome.click(addBtn.uid);

// 3. 填写表单
const snap2 = await chrome.take_snapshot();
// 选择分类
await chrome.click(findCategory(snap2, '餐饮').uid);
// 输入金额（通过数字键盘）
await chrome.click(findButton(snap2, '5').uid);
await chrome.click(findButton(snap2, '0').uid);

// 4. 提交
await chrome.click(findButton(snap2, '保存').uid);

// 5. 验证成功
const snap3 = await chrome.take_snapshot();
const successMsg = snap3.find(el => el.text.includes('成功'));
assert(successMsg, '应该看到成功消息');

// 6. 检查网络请求
const requests = await chrome.list_network_requests();
const createRequest = requests.find(r => r.url.includes('/transactions'));
assert(createRequest?.method === 'POST', '应该有 POST 请求');

// 7. 检查控制台
const errors = await chrome.list_console_messages({ types: ['error'] });
assert(errors.length === 0, '不应该有错误');
```

### 场景 2：API 集成

```javascript
// 1. 触发操作
await chrome.click(buttonUid);

// 2. 等待响应
await chrome.wait_for('加载完成');

// 3. 检查网络请求
const requests = await chrome.list_network_requests();
const apiRequest = requests.find(r => r.url.includes('/api/v1/xxx'));

assert(apiRequest, '应该有 API 请求');

// 4. 检查响应
const response = await chrome.get_network_request({
  reqid: apiRequest.id
});
assert(response.statusCode === 200, 'API 应该返回 200');
```

### 场景 3：状态更新

```javascript
// 1. 获取初始状态
const before = await chrome.evaluate_script(`
  () => document.querySelector('.balance')?.textContent
`);

// 2. 执行操作
await chrome.click(buttonUid);
await chrome.wait_for('更新成功');

// 3. 获取更新后状态
const after = await chrome.evaluate_script(`
  () => document.querySelector('.balance')?.textContent
`);

// 4. 验证变化
assert(after !== before, '状态应该发生变化');
```

### 第四阶段：提交前二次审查（最终检查）

**最终代码审查**
- [ ] 重新审视代码，发现遗漏问题
- [ ] 确认所有改动都在本次提交范围内
- [ ] 检查是否有无用的代码或注释
- [ ] 确认没有 TODO 或 FIXME 留在代码中

**验证结果确认**
- [ ] 代码审查：通过
- [ ] 单元测试：通过（XX 个测试用例）
- [ ] Chrome MCP 验证：通过
- [ ] 接口测试：通过

**提交前检查**
- [ ] Commit message 清晰准确
- [ ] 没有提交敏感信息
- [ ] 没有提交测试数据
- [ ] .gitignore 规则正确

**最终确认**
- [ ] 所有检查项都已完成
- [ ] 准备提交代码

---

## 问题处理

### 发现问题时

```
┌────────────────────────────────────────┐
│  验证失败                               │
├────────────────────────────────────────┤
│                                        │
│  1. 记录问题                            │
│     "点击按钮后没有反应"                │
│                                        │
│  2. 收集证据                            │
│     - take_snapshot 查看页面状态       │
│     - list_console_messages 查看错误   │
│     - list_network_requests 查看请求   │
│                                        │
│  3. 分析原因                            │
│     - 检查元素是否找到                 │
│     - 检查是否有 JS 错误               │
│     - 检查 API 是否成功                │
│                                        │
│  4. 修复代码                            │
│     - 修改实现                         │
│     - 或调整验证方法                   │
│                                        │
│  5. 重新验证                            │
│     - 重复验证步骤                     │
│     - 直到通过                         │
│                                        │
└────────────────────────────────────────┘
```

### 常见问题排查

| 问题 | 排查步骤 |
|------|---------|
| 找不到元素 | take_snapshot 检查页面结构，确认元素存在 |
| 点击无反应 | list_console_messages 查看是否有 JS 错误 |
| API 失败 | list_network_requests 查看请求状态码 |
| 状态不对 | evaluate_script 检查实际状态值 |
| 时机问题 | wait_for 等待元素出现 |

---

## 完成报告格式

### ✅ 验证通过

```
✅ 已实现并验证通过：[功能名称]

【第一轮：代码审查】
- ✅ 代码质量：逻辑清晰，符合规范
- ✅ 安全性：输入验证完善，无安全风险
- ✅ 性能：无明显性能问题

【第二轮：单元测试】
- ✅ 已编写单元测试（XXX 个测试用例）
- ✅ 所有测试通过
- ✅ 测试覆盖率：XX%

【第三轮：集成验证】
- ✅ 页面加载正常
- ✅ 可以打开表单
- ✅ 输入金额 50，显示正确
- ✅ 提交成功，看到成功消息
- ✅ API 请求成功（POST /transactions, 200）
- ✅ 控制台无错误

【第四轮：最终审查】
- ✅ 代码审查通过
- ✅ 所有验证通过
- ✅ 准备提交

代码已提交：commit hash
```

### ⚠️ 发现问题

```
⚠️ 发现问题：[问题描述]

【代码审查】
- ❌ 发现问题：[具体问题描述]
- 位置：[文件名:行号]
- 原因：[问题原因]

【单元测试】
- ❌ 测试失败：[测试用例名称]
- 错误信息：[错误详情]

当前情况：
- 页面：[截图/状态]
- 控制台：[错误信息]
- 网络：[请求状态]

正在修复...
```

---

## 记录和追溯

### 验证日志

每次验证都应该记录：

```markdown
## 验证日志 - [功能名称]

**时间**: 2026-02-07 xx:xx
**功能**: XXX 功能
**验证人**: Claude (Self-Verification)

### 验证步骤
1. 打开页面
2. 点击 XXX
3. 输入 YYY
4. 提交

### 验证结果
- ✅ 步骤1通过
- ✅ 步骤2通过
- ⚠️ 步骤3发现问题：输入值不正确
- 修复：需要点击数字按钮，不能使用 fill
- ✅ 步骤3通过（重新验证）
- ✅ 步骤4通过

### 最终结果
✅ 验证通过，功能正常

### 证据
- Snapshot: [保存的快照]
- Console: 无错误
- Network: [请求记录]
```

---

## 工具使用参考

### Chrome MCP 关键命令

| 命令 | 用途 | 使用场景 |
|------|------|---------|
| `navigate_page` | 打开页面 | 验证开始 |
| `take_snapshot` | 获取页面结构 | 查找元素 |
| `click` | 点击元素 | 触发操作 |
| `fill` | 填写表单 | 输入文本 |
| `wait_for` | 等待元素 | 异步加载 |
| `evaluate_script` | 执行 JS | 检查状态 |
| `list_console_messages` | 查看控制台 | 排查错误 |
| `list_network_requests` | 查看网络 | 检查 API |
| `take_screenshot` | 截图 | 保存证据 |

---

## 最佳实践

### 1. 验证的完整性
- 不要只验证"能跑通"
- 要验证"功能正确"
- 要检查边界情况

### 2. 问题的及时性
- 发现问题立即修复
- 不要积累问题
- 不要把问题留给用户

### 3. 验证的可追溯性
- 记录验证过程
- 保存关键证据
- 便于后续排查

### 4. 工具的正确使用
- 优先使用 Chrome MCP
- 不要依赖人工描述
- 用数据和截图说话

---

## 违反规范的后果

### ❌ 不验证直接交付
```
你："实现 XXX 功能"
我："好的" [直接给代码]
你：[测试发现很多问题]
我："我再看看..."
```
**后果**：
- 浪费你的时间
- 降低信任度
- 增加返工成本

### ✅ 严格验证后交付
```
你："实现 XXX 功能"
我：[写代码] [验证] [修复] [再验证] "✅ 已实现并验证通过"
你：[直接使用，没有问题]
```
**效果**：
- 节省你的时间
- 提高代码质量
- 建立信任

---

## 总结

**自我验证不是负担，是责任。**

- 验证是我对代码负责
- 验证是我对你负责
- 验证是对项目负责

**记住：未验证的代码 = 不完整的代码**

---

*最后更新：2026-02-07*
*维护者：Claude*
