# 国际化 (i18n) 使用指南

## 📚 概述

Alfred 使用 `react-i18next` 实现国际化，支持中英文切换。

## 🎯 基础用法

### 1. 在组件中使用翻译

```tsx
import { useTranslation } from 'react-i18next';

const MyComponent = () => {
  const { t } = useTranslation();

  return (
    <div>
      <h1>{t('app.name')}</h1>
      <p>{t('common.loading')}</p>
    </div>
  );
};
```

### 2. 带参数的翻译

```tsx
// 翻译文件
{
  "errors": {
    "required": "请输入{{field}}"
  }
}

// 组件中使用
const { t } = useTranslation();
const message = t('errors.required', { field: '用户名' });
// 结果: "请输入用户名"
```

### 3. 切换语言

```tsx
import { useTranslation } from 'react-i18next';

const LanguageSwitcher = () => {
  const { i18n } = useTranslation();

  const changeLanguage = (lng: string) => {
    i18n.changeLanguage(lng);
  };

  return (
    <select
      value={i18n.language}
      onChange={(e) => changeLanguage(e.target.value)}
    >
      <option value="zh-CN">中文</option>
      <option value="en-US">English</option>
    </select>
  );
};
```

## 📂 翻译文件结构

```
src/i18n/
├── config.ts           # i18n 配置
└── locales/
    ├── zh-CN.json      # 中文翻译
    └── en-US.json      # 英文翻译
```

## 🔄 添加新翻译

### 步骤 1: 在翻译文件中添加 key

**zh-CN.json**
```json
{
  "myModule": {
    "myText": "我的文本"
  }
}
```

**en-US.json**
```json
{
  "myModule": {
    "myText": "My Text"
  }
}
```

### 步骤 2: 在组件中使用

```tsx
const { t } = useTranslation();
const text = t('myModule.myText');
```

## 💡 最佳实践

### 1. 使用命名空间

按模块组织翻译，避免冲突：

```json
{
  "accounts": { ... },
  "transactions": { ... },
  "categories": { ... }
}
```

### 2. 复用通用文本

```json
{
  "common": {
    "submit": "提交",
    "cancel": "取消"
  }
}
```

使用: `t('common.submit')`

### 3. TypeScript 类型支持

创建类型定义文件：

```typescript
// src/i18n/types.ts
interface TranslationResources {
  app: {
    name: string;
    shortName: string;
  };
  // ... 其他类型
}

declare module 'i18next' {
  interface CustomTypeOptions {
    resources: TranslationResources;
  }
}
```

### 4. 在 Ant Design 组件中使用

```tsx
import { Modal } from 'antd';
import { useTranslation } from 'react-i18next';

const { t } = useTranslation();

Modal.confirm({
  title: t('accounts.deleteConfirm'),
  okText: t('common.confirm'),
  cancelText: t('common.cancel'),
});
```

## 🎨 完整示例

### 登录页面改造示例

**Before (硬编码):**
```tsx
<Card title="Alfred - 智能生活管家">
  <Button>登录</Button>
</Card>
```

**After (国际化):**
```tsx
import { useTranslation } from 'react-i18next';

const Login = () => {
  const { t } = useTranslation();

  return (
    <Card title={t('auth.loginTitle')}>
      <Button>{t('auth.login')}</Button>
    </Card>
  );
};
```

## 🌐 支持的语言

- `zh-CN` - 简体中文（默认）
- `en-US` - 英语

## 🔧 配置说明

i18n 配置在 `src/i18n/config.ts`：

- `fallbackLng`: 默认语言（zh-CN）
- `detection.order`: 语言检测顺序
- `detection.caches`: 语言缓存位置（localStorage）

## 📌 注意事项

1. **避免嵌套过深**: 保持翻译 key 扁平化，不超过 3 层
2. **使用语义化 key**: 使用有意义的命名，如 `user.login` 而非 `text1`
3. **保持同步**: 添加新翻译时，确保所有语言文件都包含对应的 key
4. **复用优先**: 相同文本使用同一个 key，不要重复定义
