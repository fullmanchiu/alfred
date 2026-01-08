# API 配置指南

## 概述

ColaFit Frontend 需要连接到 ColaFit Backend 服务。本文档说明如何配置 API 地址。

## 开发环境配置

### 1. 启动后端服务

确保 ColaFit Backend 服务正在运行：

```bash
cd Alfred
source build/envsetup.sh
cola -s
cola -r
```

后端服务将在 `http://localhost:8000` 运行。

### 2. 配置前端

编辑 `lib/config/app_config.dart`:

```dart
class AppConfig {
  // 开发环境配置
  static const bool _isProduction = false;
  static const String _baseUrl = 'http://localhost:8000';

  // 获取当前环境的base URL
  static String get baseUrl => _isProduction ? _productionBaseUrl : _baseUrl;

  // 地图HTML文件路径
  static String get mapHtmlUrl => '$baseUrl/static/map.html';
}
```

## 生产环境配置

### 1. 部署后端服务

按照 [Alfred 文档](https://github.com/yourusername/Alfred) 部署后端服务。

假设后端部署在：`http://your-server:8000`

### 2. 配置前端

编辑 `lib/config/app_config.dart`:

```dart
class AppConfig {
  // 生产环境配置
  static const bool _isProduction = true;
  static const String _productionBaseUrl = 'http://your-server:8000';

  // 获取当前环境的base URL
  static String get baseUrl => _isProduction ? _productionBaseUrl : _baseUrl;
}
```

### 3. Web 部署特殊配置

如果将 Flutter Web 部署到与后端不同的域名，需要：

#### 后端 CORS 配置

确保后端已配置 CORS 允许前端域名访问。在 `backend/app/main.py` 中：

```python
from fastapi.middleware.cors import CORSMiddleware

app.add_middleware(
    CORSMiddleware,
    allow_origins=["https://your-frontend-domain.com"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

#### 使用环境变量

对于生产环境，建议使用环境变量或构建参数：

```dart
import 'dart:io';

class AppConfig {
  static String get baseUrl {
    // 从环境变量读取，或使用默认值
    const baseUrl = String.fromEnvironment('API_BASE_URL',
      defaultValue: 'http://localhost:8000');
    return baseUrl;
  }
}
```

构建时传入环境变量：

```bash
flutter build web --dart-define=API_BASE_URL=http://your-server:8000
```

## 常见问题

### 1. 连接被拒绝 (Connection Refused)

**问题**: 无法连接到后端服务

**解决方案**:
- 确认后端服务正在运行
- 检查防火墙设置
- 验证 API 地址配置正确

### 2. CORS 错误

**问题**: Web 版本出现 CORS 错误

**解决方案**:
- 配置后端 CORS 允许前端域名
- 或使用代理服务器

### 3. 证书问题

**问题**: HTTPS 证书验证失败

**解决方案**:
- 开发环境可以使用 HTTP
- 生产环境配置有效的 SSL 证书

## API 文档

完整的 API 文档请参考：
- Swagger UI: `http://your-backend:8000/docs`
- ReDoc: `http://your-backend:8000/redoc`
- [后端 API 文档](https://github.com/yourusername/Alfred/blob/main/docs/api/backend_api.md)

## 相关链接

- [Alfred](https://github.com/yourusername/Alfred)
- [前端架构文档](frontend/architecture.md)
