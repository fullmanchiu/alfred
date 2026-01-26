# Python后端剩余模块迁移计划

## 概述

将Python FastAPI后端的剩余功能迁移到Spring Boot (Kotlin)，完成后可删除Python后端。

**迁移日期**：2025-01-22
**目标**：统一到Spring Boot后端，简化架构

---

## 迁移范围

### ✅ 需要迁移的模块

| 模块 | 功能 | 复杂度 | 优先级 |
|------|------|--------|--------|
| 健康档案 | 身高、体重、体脂率等健康数据管理 | ⭐ 简单 | P1 |
| 运动记录 | GPS轨迹、心率、功率等运动数据 | ⭐⭐⭐ 复杂 | P1 |
| FIT文件上传 | 上传并解析运动数据文件 | ⭐⭐⭐⭐ 复杂 | P1 |

### ❌ 不迁移的模块

| 模块 | 原因 |
|------|------|
| 交易图片 | 前端已废弃，后期需要时单独加 |

---

## 模块1：健康档案 (Health Profile)

### 数据模型

```kotlin
@Entity
@Table(name = "health_profiles")
data class HealthProfile(
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    val id: Long? = null,

    @Column(name = "user_id")
    val userId: Long,

    val height: Float? = null,        // 身高(cm)
    val weight: Float? = null,        // 体重(kg)
    val bodyFat: Float? = null,       // 体脂率(%)
    val muscleRate: Float? = null,    // 肌肉率(%)
    val waterRate: Float? = null,     // 水分率(%)
    val boneMass: Float? = null,      // 骨量(kg)
    val proteinRate: Float? = null,   // 蛋白质率(%)
    val bmr: Int? = null,             // 基础代谢(kcal)
    val visceralFat: Int? = null,     // 内脏脂肪等级
    val bmi: Float? = null,           // 体质指数

    @CreatedAt
    @Column(name = "created_at", updatable = false)
    val createdAt: LocalDateTime = LocalDateTime.now(),

    @UpdatedAt
    @Column(name = "updated_at")
    val updatedAt: LocalDateTime = LocalDateTime.now()
)
```

### API端点

| 方法 | 路径 | 功能 |
|------|------|------|
| GET | `/api/v1/health/profile` | 获取最新健康数据 |
| POST | `/api/v1/health/profile` | 创建健康记录 |
| PUT | `/api/v1/health/profile` | 更新健康记录（创建新记录） |
| DELETE | `/api/v1/health/profile` | 删除最新记录 |
| GET | `/api/v1/health/history` | 获取历史记录列表 |

### 业务逻辑

- **BMI计算**：`weight(kg) / (height(m) * height(m))`
- **历史身高保留**：更新时使用最近一次有身高的记录计算BMI
- **返回最新**：`profile`端点返回最新一条记录

---

## 模块2：运动记录 (Activity)

### 数据模型

#### 2.1 Activity（主表）

```kotlin
@Entity
@Table(name = "activities")
data class Activity(
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    val id: Long? = null,

    @Column(name = "user_id")
    val userId: Long,

    @Column(name = "name")
    val name: String,

    @Column(name = "type")
    val type: String,  // running, cycling, swimming等

    // 汇总数据
    val distance: Int? = null,         // 距离(米)
    val duration: Int? = null,         // 时长(秒)
    val avgSpeed: Float? = null,       // 平均速度(m/s)
    val maxSpeed: Float? = null,       // 最大速度(m/s)
    val totalElevation: Int? = null,   // 总爬升(米)

    // 生理数据
    val avgHeartRate: Int? = null,     // 平均心率
    val maxHeartRate: Int? = null,     // 最大心率
    val avgPower: Int? = null,         // 平均功率
    val maxPower: Int? = null,         // 最大功率
    val avgCadence: Int? = null,       // 平均踏频

    val calories: Int? = null,         // 消耗卡路里

    @Column(name = "start_time")
    val startTime: LocalDateTime? = null,

    @Column(name = "end_time")
    val endTime: LocalDateTime? = null,

    @Column(name = "created_at", updatable = false)
    val createdAt: LocalDateTime = LocalDateTime.now()
)
```

#### 2.2 ActivityPoint（GPS轨迹点）

```kotlin
@Entity
@Table(name = "activity_points")
data class ActivityPoint(
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    val id: Long? = null,

    @Column(name = "activity_id")
    val activityId: Long,

    val time: LocalDateTime? = null,
    val latitude: Double? = null,     // 纬度
    val longitude: Double? = null,    // 经度
    val speed: Float? = null,         // 速度(m/s)
    val heartRate: Int? = null,       // 心率
    val power: Int? = null,           // 功率
    val cadence: Int? = null,         // 踏频
    val elevation: Float? = null      // 海拔(米)
)
```

#### 2.3 ActivityLap（分段数据）

```kotlin
@Entity
@Table(name = "activity_laps")
data class ActivityLap(
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    val id: Long? = null,

    @Column(name = "activity_id")
    val activityId: Long,

    @Column(name = "lap_index")
    val lapIndex: Int,

    @Column(name = "start_time")
    val startTime: LocalDateTime? = null,

    @Column(name = "elapsed_time")
    val elapsedTime: Int? = null,     // 经过时间(秒)

    val distance: Int? = null,        // 距离(米)
    @Column(name = "avg_heart_rate")
    val avgHeartRate: Int? = null,
    @Column(name = "avg_power")
    val avgPower: Int? = null,
    @Column(name = "avg_speed")
    val avgSpeed: Float? = null
)
```

### API端点

| 方法 | 路径 | 功能 |
|------|------|------|
| GET | `/api/v1/activities` | 获取运动记录列表（分页） |
| GET | `/api/v1/activities/{id}` | 获取运动记录详情（含轨迹点、分段） |

### 技术挑战

1. **一对多关联**：一个Activity可能有几百个GPS点
2. **性能优化**：详情查询需要分3次查询或使用JOIN FETCH
3. **数据汇总**：从GPS点计算平均心率、最大心率等

---

## 模块3：FIT文件上传

### 数据模型

使用运动记录模块的3张表，无需额外表。

文件存储路径：
```
data/update/fit/{username}/{YYYY_MM_DD}/{uuid}.fit
```

### API端点

| 方法 | 路径 | 功能 |
|------|------|------|
| POST | `/api/v1/upload` | 上传FIT文件并解析 |
| POST | `/api/v1/upload/batch` | 批量上传（可选合并） |

### FIT解析库

**Java库选择**：
- [fit](https://github.com/garmin/fit-sdk) - Garmin官方SDK
- 需要添加Maven依赖

### 业务流程

```
1. 接收multipart/form-data文件
2. 验证文件类型（.fit扩展名）
3. 保存文件到指定目录
4. 解析FIT文件内容
5. 创建Activity记录
6. 批量插入ActivityPoint（可能几百条）
7. 批量插入ActivityLap
8. 根据GPS点计算汇总数据并更新Activity
```

### 技术挑战

1. **文件上传**：Spring Boot `MultipartFile`处理
2. **FIT解析**：集成Java FIT SDK
3. **批量插入**：使用`saveAll()`提高性能
4. **事务管理**：解析失败时回滚，但保留文件
5. **路径安全**：防止路径穿越攻击

---

## 实施步骤

### Phase 1: 健康档案（1-2天）

1. ✅ 创建 `HealthProfile` entity
2. ✅ 创建 `HealthProfileRepository`
3. ✅ 创建 `HealthProfileService`（含BMI计算）
4. ✅ 创建 `HealthController`
5. ✅ 编写集成测试 `HealthControllerTest`
6. ✅ 验证前端对接

### Phase 2: 运动记录（2-3天）

1. ✅ 创建 `Activity`, `ActivityPoint`, `ActivityLap` entities
2. ✅ 创建对应的Repositories
3. ✅ 创建 `ActivityService`（含汇总计算）
4. ✅ 创建 `ActivityController`
5. ✅ 编写集成测试 `ActivityControllerTest`
6. ✅ 验证前端对接

### Phase 3: FIT文件上传（3-4天）

1. ✅ 添加FIT SDK依赖
2. ✅ 配置文件上传目录
3. ✅ 创建FIT解析服务
4. ✅ 创建 `FileUploadController`
5. ✅ 编写集成测试（需要mock FIT文件）
6. ✅ 验证前端对接

### Phase 4: 验证与清理（1天）

1. ✅ 运行 `test_basic_functionality.sh` 验证所有功能
2. ✅ 检查前端所有功能正常
3. ✅ 停止Python后端
4. ✅ 确认无问题后删除 `backend/` 目录

---

## 技术选型

### FIT文件解析库

**选项1**: Garmin FIT SDK (Java)
- 官方支持，最可靠
- Maven: `com.garmin.fit:fit:21.140.0`

**选项2**: fit4j
- 第三方库，API更友好
- 可能维护不及时

**决定**：使用Garmin官方FIT SDK

### 文件上传配置

```yaml
# application.yml
spring:
  servlet:
    multipart:
      enabled: true
      max-file-size: 50MB
      max-request-size: 100MB

file:
  upload:
    base-dir: data/update/fit
```

---

## 测试策略

### 单元测试
- Service层业务逻辑（BMI计算、汇总计算）

### 集成测试
- Controller API端点
- 使用真实数据库（H2或PostgreSQL）

### 测试数据
- 准备样例FIT文件：`src/test/resources/sample.fit`

---

## 前端变更

**无需修改**：前端API调用路径已经兼容：
- `/api/v1/health/*` ✅
- `/api/v1/activities` ✅
- `/api/v1/upload` ✅

---

## 风险与应对

| 风险 | 应对 |
|------|------|
| FIT解析库API不熟悉 | 先写POC验证 |
| 大量GPS点插入性能差 | 使用`saveAll()`批量插入 |
| 文件上传路径安全问题 | 严格验证文件名，使用UUID |
| 前端已有功能不可用 | 分模块验证，及时回滚 |

---

## 完成标准

- [ ] 所有3个模块的API正常工作
- [ ] 前端所有功能正常使用
- [ ] 集成测试通过率100%
- [ ] Python后端已停止且无影响
- [ ] 代码已提交到git

---

## 附录：Python代码参考

迁移时参考以下文件：
- `backend/app/api/v1/health.py` - 健康档案API
- `backend/app/api/v1/activities.py` - 运动记录API
- `backend/app/api/v1/upload.py` - FIT上传API
- `backend/app/models/health.py` - 健康档案模型
- `backend/app/models/activity.py` - 运动记录模型
