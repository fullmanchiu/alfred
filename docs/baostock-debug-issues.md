# Baostock K线获取调试记录

**日期**: 2026-02-26
**状态**: ✅ 已解决 - 性能优化完成

---

## 问题描述

使用 baostock 获取沪深300成分股 K线数据时，`rs.next()` 方法在大日期范围下会卡住，无任何错误输出。

### 测试场景
- 股票：沪深300成分股
- 日期范围：2026-01-01 ~ 2026-01-31（31天）
- 字段：date, code, close

### 症状
- 小日期范围（5天）：正常工作
- 大日期范围（31天）：`rs.next()` 遍历过程中卡住
- 无错误抛出，程序挂起

---

## 已排除的问题

### 1. ✅ 代理问题
- 原因：系统代理 127.0.0.1 阻止连接
- 解决：用户关闭代理后恢复

### 2. ✅ 日期值问题
- 2026-01-01 ~ 2026-01-31 是有效日期（当前日期 2026-02-25）
- baostock 支持历史数据查询

### 3. ✅ 错误方法调用
- 曾调用不存在的 `rs.get_fields()` 方法
- 已改用 `rs.get_row_data()`

### 4. ✅ 数据列索引错误
- `row[0]` 是日期，`row[1]` 是代码
- 已修正为 `row[1]`

---

## 核心发现

### baostock 行为特征

| 日期范围 | 行为 |
|---------|------|
| 5天 | 正常遍历完成 |
| 31天 | `rs.next()` 中途卡住 |

**关键差异**：不是日期值的问题，是**数据量**的问题。

### 登录策略对比

| 策略 | 结果 |
|------|------|
| 全局登录 + 单线程 | 卡住 |
| 全局登录 + 多线程 | 更容易超时 |
| 每次登录 + 延迟 | 待验证 |

---

## 已尝试的方案

### 方案1：全局登录 + 单线程
```python
lg = bs.login()
for code in codes:
    rs = bs.query_history_k_data_plus(...)
    while rs.next():  # 卡在这里
        ...
```
**结果**: 卡住

### 方案2：添加详细日志
```python
while rs.next():
    count += 1
    if count <= 3:
        print(f"记录{count}: {rs.get_row_data()}")
```
**结果**: 仍然卡住，日志无法实时输出

### 方案3：小范围测试
**结果**: 5天数据正常工作

---

## 当前测试脚本

`py-service/test_hs300_final.py`

**当前配置**:
- 测试前3只股票
- 日期: 2026-01-01 ~ 2026-01-31
- 详细日志 + flush=True

**运行命令**:
```bash
cd /Users/qiuliang/code/alfred/py-service
./venv/bin/python test_hs300_final.py
```

---

## 下一步调试方向

### 1. 分批获取（最可能有效）
```python
# 将31天分成多个小批次
def fetch_in_batches(code, start, end, batch_days=7):
    result = []
    current_start = start
    while current_start < end:
        current_end = min(current_start + timedelta(days=batch_days), end)
        batch = fetch_batch(code, current_start, current_end)
        result.extend(batch)
        time.sleep(0.5)
    return result
```

### 2. 检查网络稳定性
- 可能是长连接超时
- 尝试缩短单次连接时间

### 3. 使用 akshare（备选）
- 用户明确表示不想切换
- 仅作为最后备选方案

---

## 已优化的代码

### `kline_fetcher.py`
- ✅ 改为每次请求 login/logout
- ✅ 添加延迟参数
- ✅ 强制单线程模式

---

## 参考资料

- baostock 官方文档：http://baostock.com/baostock/index.html
- 限流问题：非官方文档，无明确限制值
- 建议策略：每次登录 + 延迟 + 分批获取

---

---

## 根本原因（2026-02-25 发现）

### baostock `rs.next()` Bug

**触发条件**：
1. `while rs.next() and count < N` - 在 while 条件中限制
2. 使用 break 提前退出后，继续调用 `rs.next()`

**症状**：
- `rs.next()` 永远返回 True
- 返回重复的数据（循环重复已有记录）
- 导致无限循环，内存溢出

**验证测试**：
```python
# 错误写法 - 触发 bug
while rs.next() and count < 100:
    count += 1

# 错误写法 - 触发 bug
while rs.next():
    count += 1
    if count >= 3:
        break
while rs.next():  # 这里会无限循环！
    count += 1
```

**正确写法**：
```python
# 方案1：一次性读完
count = 0
while rs.next():
    count += 1
    # 处理数据
# 不提前退出，保证 rs.next() 正常结束

# 方案2：分批获取（推荐）
def fetch_in_batches(code, start, end, batch_days=7):
    batches = split_date_range(start, end, batch_days)
    for batch_start, batch_end in batches:
        lg = bs.login()
        rs = bs.query_history_k_data_plus(...)
        while rs.next():  # 每批次完整读取
            # 处理数据
        bs.logout()
```

---

## 解决方案

### 推荐方案：分批获取

```python
def split_date_range(start_date, end_date, batch_days=7):
    """将日期范围分割成小批次"""
    batches = []
    current = parse_date(start_date)
    end = parse_date(end_date)

    while current <= end:
        batch_end = min(current + timedelta(days=batch_days-1), end)
        batches.append((format_date(current), format_date(batch_end)))
        current = batch_end + timedelta(days=1)

    return batches

def fetch_kline(code, start_date, end_date, batch_days=7, delay=0.3):
    """分批获取K线数据"""
    batches = split_date_range(start_date, end_date, batch_days)
    all_data = []

    for batch_start, batch_end in batches:
        lg = bs.login()
        try:
            rs = bs.query_history_k_data_plus(
                code, "date,code,close",
                start_date=batch_start, end_date=batch_end,
                frequency="d", adjustflag="3"
            )

            # 一次性读完该批次所有数据
            while rs.next():
                row = rs.get_row_data()
                all_data.append(row)

        finally:
            bs.logout()

        # 批次间延迟
        time.sleep(delay)

    return all_data
```

**优势**：
- 避开 baostock 的 rs.next() bug
- 每批次数据量小，稳定性高
- 失败后可以单独重试该批次

---

## 会话状态

**状态**: ✅ 已解决 - 性能优化完成

## 最终结论 (2026-02-26)

经过性能测试验证，得出以下结论：

### 性能测试结果

| 批次大小 | API调用次数 | 平均耗时/股 | 相对性能 |
|---------|-----------|------------|---------|
| 周批次 (7天) | 1 login + 52 query + 1 logout | 11.690秒 | 1.0x |
| 月批次 (30天) | 1 login + 12 query + 1 logout | 2.509秒 | 4.7x |
| 年批次 (365天) | 1 login + 1 query + 1 logout | **0.862秒** | **13.6x** ✅ |

**测试条件**: 20只股票，2024年全年数据，单次登录

### 核心结论

1. **单只股票尽量一次获取完整数据** - 避免分批
2. **速度取决于API调用次数** - 每次query都有开销
3. **分批次不能加速** - 反而因为多次API调用变慢

### 推荐实现

```python
def fetch_kline_optimal(code, start_date, end_date):
    """最优K线获取方案"""
    if code.startswith('6'):
        bs_code = f"sh.{code}"
    else:
        bs_code = f"sz.{code}"

    lg = bs.login()
    try:
        rs = bs.query_history_k_data_plus(
            bs_code,
            "date,code,open,high,low,close,volume,amount",
            start_date=start_date,
            end_date=end_date,
            frequency="d",
            adjustflag="3"
        )

        data = []
        while rs.next():
            row = rs.get_row_data()  # 必须消费数据
            data.append(row)

        return data
    finally:
        bs.logout()
```

### 文档参考

详细使用经验见: `docs/baostock-best-practices.md`
