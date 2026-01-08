# AGENTS.md - ColaFit 开发指南

**重要提示：本指南面向 AI Agent（人工智能助手）**

## 🔴 核心原则：中文优先

在与用户交互、分析问题、设计和编码时，**必须使用中文思维和中文表达**。

### 必须遵守的规则：

1. **语言表达**
   - 与用户的所有对话必须使用**中文**
   - 分析问题、解释技术方案必须使用**中文**
   - 代码注释必须使用**中文**
   - 错误消息和提示信息必须使用**中文**

2. **本地化考虑**
   - 日期时间格式：中文格式（如：2025年1月8日 14:30）
   - 货币格式：人民币（¥），小数点后两位
   - 数字格式：使用千位分隔符（如：1,234.56）
   - 文本显示：考虑中文排版，预留足够空间
   - 时间相对表达：使用"今天"、"昨天"、"3天前"等中文表达

3. **代码实践**
   - 数据库字段注释用中文
   - API文档的summary和description用中文
   - 变量命名用英文，但注释用中文解释
   - 用户可见的字符串全部用中文

4. **思维方式**
   - 不要用英文思维框架硬套中文场景
   - 考虑中文用户的使用习惯和表达方式
   - 优先满足中文用户需求，再考虑国际化

---

## 文件编码规范

### 📝 统一编码：UTF-8

**所有源代码文件必须使用 UTF-8 编码（无BOM）。**

### 支持内容
- ✅ 中文字符（Unicode 4E00-9FFF）
- ✅ 英文字符（ASCII 兼容）
- ✅ Emoji 表情符号（😊🚀💪🎯等）
- ✅ 特殊符号（¥、°、±、×、÷等）
- ✅ 各种语言的字符

### Python 文件
```python
# Python 3 默认使用 UTF-8，但建议显式声明（可选）
# -*- coding: utf-8 -*-
# 或者
# coding=utf-8
```

### Dart/Flutter 文件
```dart
// Dart 默认使用 UTF-8，无需显式声明
// 确保编辑器保存时使用 UTF-8 编码
```

### 编辑器配置
推荐在项目根目录创建 `.editorconfig` 文件（可选）：
```ini
root = true

[*]
charset = utf-8
end_of_line = lf
insert_final_newline = true
trim_trailing_whitespace = true

[*.{py,dart}]
indent_style = space
indent_size = 4
```

### 数据库
- 数据库连接字符串：`charset=utf8mb4`（MySQL）或默认 UTF-8（SQLite）
- 存储中文、emoji 时确保数据库支持 UTF-8

### API 响应
```python
# FastAPI 默认返回 UTF-8 编码的 JSON
# 无需额外配置
```

```dart
// HTTP 响应自动处理 UTF-8
// 确保使用 utf8.decode() 处理字节流
```

---

## 仓库结构

这是一个 monorepo，包含两个主要项目：
- **Alfred/** - FastAPI Python 后端（健身数据管理、记账、FIT文件处理）
- **ColaFit/** - Flutter/Dart 前端（跨平台移动应用）

---

## 构建、检查、测试命令

### Alfred (Python 后端)

**环境设置：**
```bash
cd Alfred
source build/envsetup.sh  # 加载 cola 命令到当前 shell
cola -s                  # 设置：创建/更新 venv + 安装依赖
```

**运行服务器：**
```bash
cola -r                  # 运行 uvicorn 自动重载
# 手动运行: uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

**测试：**
```bash
pytest                   # 运行所有测试
pytest --cov=app --cov-report=html  # 运行测试并生成覆盖率报告
pytest tests/test_specific.py        # 运行单个测试文件
pytest tests/test_specific.py::test_function_name  # 运行指定测试函数
pytest -k "test_keyword"             # 运行匹配关键词的测试
pytest -v                          # 详细输出
```

**诊断：**
```bash
cola -d                  # 生成 fastapi_diagnose.txt 系统信息文件
```

**清理：**
```bash
cola -c                  # 删除 venv
```

**Docker：**
```bash
docker build -t colafit-backend .
docker run -d -p 8000:8000 --env-file .env colafit-backend
```

### ColaFit (Flutter/Dart 前端)

**运行：**
```bash
cd ColaFit
flutter run              # 在连接的设备/模拟器上运行
flutter run -d chrome    # 在浏览器上运行
flutter run -d macos     # 在 macOS 上运行
```

**测试：**
```bash
flutter test             # 运行所有测试
flutter test test/widget_test.dart  # 运行单个测试文件
flutter test --name "test_name"    # 按名称运行测试
flutter test --coverage            # 生成覆盖率
```

**构建：**
```bash
flutter build apk         # Android APK
flutter build ios         # iOS (需要 macOS)
flutter build web         # Web
flutter build macos       # macOS
```

**分析：**
```bash
flutter analyze           # 静态分析（使用 analysis_options.yaml）
flutter format .          # 格式化代码
```

---

## 代码风格指南

### Python (Alfred - FastAPI)

**导入顺序：**
```python
# -*- coding: utf-8 -*-  # 可选，Python 3 默认 UTF-8

# 1. 标准库
import os
from datetime import datetime, timedelta
from typing import Optional, Dict, List

# 2. 第三方库
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

# 3. 本地导入
from app.deps import get_db
from app.models.user import User as UserModel
from app.services import category_service
from app.core.config import settings
```

**命名规范：**
- 变量/函数：`snake_case`
- 类：`PascalCase`
- 常量：`UPPER_CASE`
- 私有成员：`_leading_underscore`
- 数据库模型：`PascalCase`（如：`User`, `Activity`）

**API 路由模式：**
```python
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

router = APIRouter(prefix="/auth", tags=["authentication"])

class RegisterRequest(BaseModel):
    username: str = Field(..., min_length=3, max_length=50, description="用户名")

@router.post("/register", summary="用户注册")
async def register(
    payload: RegisterRequest,
    current_user: Dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """注册新用户"""
    # 实现代码
    return {"success": True, "data": result}
```

**数据库模型：**
```python
from sqlalchemy import Column, Integer, String, DateTime
from sqlalchemy.orm import relationship
from app.db import Base

class User(Base):
    """用户模型"""
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True, comment="用户ID")
    username = Column(String(50), unique=True, index=True, nullable=False, comment="用户名")
    created_at = Column(DateTime, default=datetime.utcnow, comment="创建时间")
    
    # 关系
    activities = relationship("Activity", back_populates="user")
```

**错误处理：**
```python
# 自定义异常在 app/core/exceptions.py
class UserNotFoundError(Exception):
    """用户未找到异常"""
    pass

# 在路由中使用
from app.core.exceptions import UserNotFoundError

try:
    user = get_user(user_id)
except UserNotFoundError as e:
    raise HTTPException(status_code=status.HTTP_404_NOT_REQUEST, detail=f"用户不存在：{str(e)}")
except Exception as e:
    logger.error(f"获取用户时发生意外错误: {str(e)}", exc_info=True)
    raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="服务器内部错误")
```

**配置管理：**
```python
# app/core/config.py
from dotenv import load_dotenv
import os

load_dotenv()

class Settings:
    """应用配置"""
    DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./data/data.db")
    SECRET_KEY = os.getenv("SECRET_KEY", "默认密钥")
    
settings = Settings()
```

**依赖注入：**
```python
# app/deps.py
from app.db import SessionLocal

def get_db():
    """获取数据库会话"""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
```

**日志记录：**
```python
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

logger.info("操作成功完成")
logger.warning("警告：配置缺失")
logger.error("发生错误", exc_info=True)
```

### Dart (ColaFit - Flutter)

**导入顺序：**
```dart
// Dart 默认使用 UTF-8

// 1. Dart SDK
import 'dart:async';
import 'dart:convert';

// 2. Flutter
import 'package:flutter/material.dart';

// 3. 第三方包
import 'package:http/http.dart' as http;
import 'package:provider/provider.dart';

// 4. 本地导入
import '../config/app_config.dart';
import '../models/account_model.dart';
import '../services/api_service.dart';
```

**命名规范：**
- 变量/函数：`camelCase`
- 类/类型：`PascalCase`
- 常量/枚举：`camelCase`（私有可用 `lower_snake_case`）
- 私有成员：`_leadingUnderscore`
- 文件：`snake_case.dart`

**Widget 模式：**
```dart
class DashboardScreen extends StatefulWidget {
  const DashboardScreen({super.key});

  @override
  State<DashboardScreen> createState() => _DashboardScreenState();
}

class _DashboardScreenState extends State<DashboardScreen> {
  bool _isLoading = false;
  late List<Account> _accounts;

  @override
  void initState() {
    super.initState();
    _loadAccounts();
  }

  Future<void> _loadAccounts() async {
    try {
      setState(() => _isLoading = true);
      _accounts = await ApiService.getAccounts();
      if (!mounted) return;
      setState(() => _isLoading = false);
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('加载失败：$e')),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('账户列表')),
      body: _isLoading
          ? const CircularProgressIndicator()
          : ListView.builder(...),
    );
  }
}
```

**模型模式：**
```dart
class Account {
  final int? id;
  final String name; // 账户名称
  final double balance; // 账户余额
  final DateTime? createdAt;

  Account({
    this.id,
    required this.name,
    required this.balance,
    this.createdAt,
  });

  factory Account.fromJson(Map<String, dynamic> json) {
    return Account(
      id: json['id'],
      name: json['name'],
      balance: (json['balance'] as num).toDouble(),
      createdAt: json['created_at'] != null
          ? DateTime.parse(json['created_at'])
          : null,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'name': name,
      'balance': balance,
      if (createdAt != null) 'created_at': createdAt!.toIso8601String(),
    };
  }

  Account copyWith({int? id, String? name, double? balance}) {
    return Account(
      id: id ?? this.id,
      name: name ?? this.name,
      balance: balance ?? this.balance,
      createdAt: createdAt,
    );
  }
}
```

**服务层模式：**
```dart
class ApiService {
  static const Duration _timeout = Duration(seconds: 30);
  static const int _maxRetries = 3;

  static Future<Map<String, dynamic>> fetchAccount(int accountId) async {
    try {
      final response = await http.get(
        Uri.parse('${AppConfig.baseUrl}/accounts/$accountId'),
      ).timeout(_timeout);

      if (response.statusCode == 200) {
        return json.decode(response.body);
      } else if (response.statusCode == 401) {
        await _handleUnauthorized();
        throw Exception('登录已过期，请重新登录');
      } else {
        throw Exception('加载账户信息失败');
      }
    } catch (e) {
      rethrow;
    }
  }
}
```

**Provider 模式：**
```dart
class AccountProvider extends ChangeNotifier {
  List<Account> _accounts = [];
  List<Account> get accounts => _accounts;

  Future<void> loadAccounts() async {
    _accounts = await ApiService.getAccounts();
    notifyListeners();
  }

  void addAccount(Account account) {
    _accounts.add(account);
    notifyListeners();
  }
}
```

---

## 通用指南

### 错误消息
- 使用中文描述错误信息
- 记录错误时包含上下文（用户ID、操作、时间戳）
- 返回适当的 HTTP 状态码（400, 401, 404, 500）
- 可以适当使用 Emoji 增强可读性：⚠️ 警告、❌ 错误、✅ 成功

### API 响应
- 标准格式：`{"success": bool, "data": any, "message": string}`
- 使用中文编写路由文档的 summary 和 description
- 使用 Pydantic 模型（Python）或自定义验证器（Dart）验证输入

### 安全
- 不要提交 `.env` 文件
- 使用环境变量存储密钥
- 存储前对密码进行哈希
- 验证和清理所有输入
- 生产环境使用 HTTPS

### Git 工作流
- 编写清晰、描述性的中文提交信息
- 为新工作创建功能分支
- 提交前运行测试
- 为新功能包含测试

### 性能
- 在频繁查询的字段上使用数据库索引
- 为列表端点实现分页
- 缓存昂贵的操作
- 尽可能懒加载 Flutter widgets

---

## 项目特定说明

### Alfred 后端
- 使用 SQLite 数据库（可迁移到 PostgreSQL）
- JWT 认证，30分钟过期
- 使用 `fitparse` 库解析 FIT 文件
- 通过 OpenAI API 提供 AI 洞察
- 通过阿里云 API 提供短信验证

### ColaFit 前端
- 支持 iOS、Android、macOS、Linux、Web、Windows
- 使用 Provider 进行状态管理
- Material Design 3 UI
- 使用 shared_preferences 进行本地存储
- 通过 file_picker 进行文件上传

---

## 测试最佳实践

### Python 测试
- 使用 pytest fixtures 进行通用设置
- 模拟外部依赖（HTTP、数据库）
- 测试成功和失败场景
- 保持测试隔离（无共享状态）

### Flutter 测试
- 使用 widget tests 测试 UI 组件
- 使用 integration tests 测试用户流程
- 使用 `http` 测试工具模拟服务
- 测试错误状态和加载指示器

---

## 本地化检查清单

在编写代码时，确保检查以下本地化要点：

- [ ] 所有用户可见文本都是中文
- [ ] 日期时间使用中文格式（如：2025年1月8日 14:30）
- [ ] 货币显示为人民币格式（¥1,234.56）
- [ ] 数字使用千位分隔符（1,234.56）
- [ ] 错误消息用中文，清晰易懂
- [ ] API 文档的说明用中文
- [ ] 代码注释用中文
- [ ] 考虑中文字符的显示空间（如姓名、地址字段）
- [ ] 相对时间表达用中文（"今天"、"3天前"）
- [ ] 表单验证提示用中文（如"密码至少6位"）
- [ ] 所有源文件使用 UTF-8 编码
- [ ] Emoji 和特殊符号显示正常
- [ ] 编辑器配置为 UTF-8 保存
