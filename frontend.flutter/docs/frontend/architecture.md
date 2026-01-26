# 前端架构文档

## 1. 项目概述

ColaFit 前端是一个基于 Flutter 开发的跨平台应用，用于记录体重、分析骑行 FIT 文件并提供 AI 洞察。

### 1.1 技术栈
- **框架**: Flutter 3.0+
- **状态管理**: Provider
- **HTTP 客户端**: http 包
- **本地存储**: shared_preferences
- **文件选择**: file_picker
- **WebView**: webview_flutter
- **URL 启动器**: url_launcher

## 2. 架构设计

### 2.1 整体架构

ColaFit 前端采用清晰的分层架构，从下到上分为：

```
┌─────────────────┐
│   屏幕层 (Screens)  │  # lib/screens/
└─────────┬───────┘
         │
┌────────▼────────┐
│   组件层 (Components) │ # lib/components/
└─────────┬───────┘
         │
┌────────▼────────┐
│   服务层 (Services)   │ # lib/services/
└─────────┬───────┘
         │
┌────────▼────────┐
│   配置层 (Config)     │ # lib/config/
└─────────────────┘
```

### 2.2 核心模块

#### 2.2.1 应用入口
- `main.dart`: 应用入口点，初始化 API 服务并启动应用
- `app.dart`: 根组件，配置路由和主题

#### 2.2.2 屏幕模块
- 包含所有应用屏幕，如登录、主页、活动列表等
- 每个屏幕负责特定功能的 UI 展示和用户交互

#### 2.2.3 组件模块
- 包含可复用的 UI 组件
- 如地图组件、对话框、响应式布局等

#### 2.2.4 服务模块
- `api_service.dart`: 处理与后端 API 的通信
- 封装了所有 API 请求和响应处理

#### 2.2.5 配置模块
- `app_config.dart`: 应用配置，如 API 基础 URL、地图 HTML URL 等

## 3. 路由设计

### 3.1 路由配置

应用使用 Flutter 的 `MaterialApp` 路由系统，在 `app.dart` 中定义：

| 路由路径 | 屏幕组件 | 描述 |
|----------|----------|------|
| `/` | `SplashScreen` | 启动屏幕 |
| `/home` | `HomeScreen` | 主页 |
| `/dashboard` | `DashboardScreen` | 仪表盘 |
| `/activities` | `ActivitiesScreen` | 活动列表 |
| `/activity_detail` | `ActivityDetailScreen` | 活动详情 |
| `/login` | `LoginScreen` | 登录 |
| `/profile` | `ProfileScreen` | 个人资料 |
| `/settings` | `SettingsScreen` | 设置 |
| `/upload` | `UploadScreen` | 上传 FIT 文件 |
| `/records` | `RecordsScreen` | 健康记录 |
| `/body_settings` | `BodySettingsScreen` | 身体设置 |

### 3.2 路由导航

- 使用 `Navigator.pushNamed()` 进行页面跳转
- 使用 `ModalRoute.of(context)?.settings.arguments` 传递参数

## 4. 服务层设计

### 4.1 API 服务

`ApiService` 类封装了所有与后端的通信逻辑：

#### 4.1.1 核心功能
- 认证管理（令牌获取、存储和刷新）
- API 请求封装（GET、POST、PUT、DELETE）
- 错误处理和重试机制
- 响应解析和转换

#### 4.1.2 认证流程

```
1. 应用启动时，从本地存储加载令牌
2. 发送请求时，自动在请求头中添加令牌
3. 如果收到 401 错误，清除本地令牌并通知调用者
4. 调用者处理登录过期逻辑，通常是跳转到登录页
```

#### 4.1.3 主要方法

| 方法 | 描述 |
|------|------|
| `initialize()` | 初始化 API 服务，加载本地令牌 |
| `login()` | 用户登录，获取并存储令牌 |
| `register()` | 用户注册 |
| `getActivities()` | 获取活动列表 |
| `getActivityDetail()` | 获取活动详情 |
| `uploadFitFiles()` | 上传 FIT 文件（移动端） |
| `uploadFitFilesFromBytes()` | 上传 FIT 文件（Web 端） |
| `getHealthProfile()` | 获取健康资料 |
| `createHealthProfile()` | 创建健康资料 |
| `updateHealthProfile()` | 更新健康资料 |

## 5. 组件设计

### 5.1 核心组件

#### 5.1.1 地图组件 (`ActivityMap`)
- 支持 Web 和移动端
- Web 端使用 iframe 加载高德地图
- 移动端使用 WebView（待完善）
- 支持动态更新路线数据

#### 5.1.2 对话框组件
- `AddHealthRecordDialog`: 添加健康记录对话框
- `AddRecordMenuDialog`: 添加记录菜单对话框
- `ProfileSetupDialog`: 个人资料设置对话框
- `WeightRecordDialog`: 体重记录对话框

#### 5.1.3 其他组件
- `AppHeader`: 应用头部组件
- `ResponsiveLayout`: 响应式布局组件

### 5.2 组件设计原则

1. **可复用性**: 组件应设计为可在多个屏幕中复用
2. **单一职责**: 每个组件只负责一个特定功能
3. **响应式设计**: 适应不同屏幕尺寸
4. **跨平台兼容**: 支持 Web、iOS、Android 等多个平台

## 6. 状态管理

### 6.1 状态管理策略

ColaFit 前端使用 Provider 进行状态管理：
- 全局状态：如用户认证状态
- 局部状态：如屏幕级别的表单状态

### 6.2 状态管理实现

- 每个需要状态管理的组件创建对应的 Provider
- 使用 `Consumer` 或 `Provider.of()` 访问状态
- 状态变化时自动更新 UI

## 7. 数据流程

### 7.1 API 请求流程

```
1. 屏幕组件调用 ApiService 方法
2. ApiService 构建请求，添加认证头
3. 发送 HTTP 请求到后端
4. 后端处理请求并返回响应
5. ApiService 解析响应，处理错误
6. 返回结果给调用组件
7. 组件更新 UI
```

### 7.2 本地存储

使用 `shared_preferences` 存储：
- 认证令牌
- 用户偏好设置
- 缓存数据（可选）

## 8. 跨平台兼容

### 8.1 平台支持

- **Android**: 支持
- **iOS**: 支持
- **Web**: 支持
- **Linux**: 支持（理论上）
- **macOS**: 支持（理论上）
- **Windows**: 支持（理论上）

### 8.2 平台特定代码

- 使用 `kIsWeb` 检测 Web 平台
- 使用条件导入处理平台特定依赖
- 如 WebView 在 Web 端使用 iframe，移动端使用 WebView

## 9. 性能优化

### 9.1 代码优化
- 组件懒加载
- 避免不必要的重建
- 使用 const 构造函数

### 9.2 网络优化
- API 请求缓存
- 合理使用 HTTP 方法
- 减少不必要的请求

### 9.3 资源优化
- 图片优化
- 资源压缩
- 按需加载

## 10. 安全性

### 10.1 认证安全
- 令牌存储在安全的地方
- 令牌过期自动处理
- HTTPS 传输（生产环境）

### 10.2 数据安全
- 敏感数据加密
- 输入验证
- 防止 SQL 注入和 XSS 攻击

## 11. 测试策略

### 11.1 单元测试
- 测试服务层和工具函数
- 使用 Flutter Test 框架

### 11.2 集成测试
- 测试组件之间的交互
- 测试 API 调用流程

### 11.3 UI 测试
- 测试屏幕和组件的 UI 展示
- 测试用户交互

## 12. 开发流程

### 12.1 开发环境
- Flutter SDK 3.0+
- Dart SDK 3.0+
- IDE: Android Studio 或 VS Code

### 12.2 构建流程

```bash
# 获取依赖
flutter pub get

# 运行测试
flutter test

# 构建 APK（Android）
flutter build apk

# 构建 IPA（iOS）
flutter build ios

# 构建 Web 应用
flutter build web
```

### 12.3 代码规范
- 使用 Flutter Lints
- 遵循 Dart 官方代码风格
- 定期运行 `flutter analyze` 检查代码质量

## 13. 未来规划

### 13.1 功能扩展
- 添加更多活动类型支持
- 增强 AI 分析功能
- 添加社交分享功能

### 13.2 技术优化
- 完善移动端 WebView 实现
- 优化地图组件性能
- 增强状态管理

### 13.3 平台支持
- 优化各平台体验
- 添加更多平台特定功能

## 14. 目录结构

```
lib/
├── components/       # 可复用组件
├── config/           # 配置文件
├── screens/          # 屏幕组件
├── services/         # 服务层
├── app.dart          # 根组件
└── main.dart         # 应用入口
```

## 15. 核心文件说明

### 15.1 入口文件
- `main.dart`: 应用入口，初始化 API 服务
- `app.dart`: 根组件，配置路由和主题

### 15.2 服务文件
- `api_service.dart`: API 通信服务

### 15.3 配置文件
- `app_config.dart`: 应用配置，包含 API 地址等

### 15.4 主要屏幕
- `splash_screen.dart`: 启动屏幕
- `login_screen.dart`: 登录屏幕
- `home_screen.dart`: 主页
- `activities_screen.dart`: 活动列表
- `activity_detail_screen.dart`: 活动详情
- `upload_screen.dart`: 上传屏幕
- `profile_screen.dart`: 个人资料
- `settings_screen.dart`: 设置
- `records_screen.dart`: 健康记录
- `body_settings_screen.dart`: 身体设置

### 15.5 主要组件
- `activity_map.dart`: 地图组件
- `app_header.dart`: 应用头部
- `responsive_layout.dart`: 响应式布局

## 16. 依赖管理

所有依赖在 `pubspec.yaml` 文件中定义，主要依赖包括：

```yaml
dependencies:
  flutter: sdk: flutter
  cupertino_icons: ^1.0.6
  http: ^1.2.1
  provider: ^6.1.2
  intl: ^0.19.0
  shared_preferences: ^2.5.4
  file_picker: ^6.1.1
  webview_flutter: ^4.4.2
  url_launcher: ^6.2.5
```

## 17. 主题设计

应用使用 Material 3 设计，主题配置在 `app.dart` 中：

```dart
theme: ThemeData(
  primarySwatch: Colors.blue,
  useMaterial3: true,
),
```

## 18. 国际化

当前应用仅支持中文，未来计划添加国际化支持：
- 使用 `intl` 包
- 支持多语言切换
- 资源本地化

## 19. 总结

ColaFit 前端采用了清晰的分层架构，便于维护和扩展。通过 Flutter 的跨平台特性，实现了一套代码多端运行。未来将继续完善功能，优化性能，提升用户体验。