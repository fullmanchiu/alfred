# 任务执行器集成测试

## 测试目标

验证任务执行器的以下功能：
1. 任务提交到线程池
2. 执行记录通过 Java API 保存
3. 任务状态正确更新（PENDING -> RUNNING -> COMPLETED/FAILED）
4. 幂等性检查（相同任务不会重复执行）

## 测试步骤

### 1. 启动服务

```bash
# 启动 Spring Boot 后端
cd /Users/qiuliang/code/alfred/backend
./gradlew bootRun

# 启动 Python 微服务
cd /Users/qiuliang/code/alfred/py-service
python3 main.py
```

### 2. 创建测试任务

通过 Java API 创建一个定时任务：

```bash
curl -X POST http://localhost:8080/api/v1/tasks \
  -H "Content-Type: application/json" \
  -d '{
    "name": "测试 Hello 任务",
    "taskType": "hello",
    "scheduleType": "interval",
    "intervalSeconds": 60,
    "enabled": true,
    "params": {"name": "Alfred"}
  }'
```

### 3. 验证执行记录

查询执行记录：

```bash
curl http://localhost:8080/api/v1/tasks/executions?limit=10
```

预期结果：应该看到执行记录，状态为 COMPLETED

### 4. 验证日志

查看 Python 服务日志，应该看到：
```
调度器开始执行任务: 测试 Hello 任务 (type=hello)
开始执行任务: 测试 Hello 任务 (execution_id=xxx)
任务执行成功: 测试 Hello 任务 (execution_id=xxx)
```

## 测试用例

### 用例 1：Hello 任务
- **类型**: hello
- **参数**: {"name": "Traveler"}
- **预期**: 成功，返回 "Hello, Traveler!"

### 用例 2：K 线同步任务
- **类型**: sync_klines
- **参数**: {"stock_code": "601985"}
- **预期**: 成功，返回同步记录数

### 用例 3：幂等性检查
- **操作**: 短时间内提交多个相同任务
- **预期**: 只有第一个任务执行，其他被跳过

## 故障排查

### 执行记录未创建
- 检查 Java 后端是否运行
- 检查 `java_client.py` 配置的 `JAVA_BASE_URL`

### 任务状态未更新
- 检查线程池是否正常工作
- 查看日志中的错误信息

### 幂等性失效
- 检查 `_running_tasks` 字典是否正常维护
- 确认线程锁 `_running_lock` 正常工作
