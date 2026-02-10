# Git Hooks 自动更新方案对比

## 问题

GitHub不像Gerrit那样支持服务器自动推送hook到客户端，需要其他方案实现hooks的自动同步。

## 方案对比

### 方案1：Post-merge Hook ⭐ 推荐

**原理**：在`git pull`后自动检查并更新hooks

**优点**：
- ✅ 完全自动化，pull后自动生效
- ✅ 不依赖npm/yarn
- ✅ 适用于任何语言项目
- ✅ 用户无感知

**缺点**：
- ❌ 只在pull时检查（不会在clone时）
- ❌ 需要首次手动运行setup.sh

**安装**：
```bash
cp scripts/post-merge .git/hooks/post-merge
chmod +x .git/hooks/post-merge
```

**工作流程**：
```bash
git pull origin master
# → 触发post-merge hook
# → 比较scripts/pre-commit和.git/hooks/pre-commit
# → 如果不同，自动更新
```

---

### 方案2：Husky（Node.js项目）

**原理**：npm包管理git hooks

**优点**：
- ✅ npm install时自动安装
- ✅ 配置简单，版本化管理
- ✅ 业界标准方案

**缺点**：
- ❌ 仅限Node.js项目
- ❌ 需要修改package.json
- ❌ 增加依赖

**安装**：
```bash
npm install husky --save-dev
npx husky install
npx husky add .husky/pre-commit "npm test"
```

**配置**：
```json
{
  "scripts": {
    "prepare": "husky install"
  }
}
```

---

### 方案3：NPM prepare脚本（前端项目）

**原理**：利用npm的prepare生命周期

**优点**：
- ✅ npm install后自动运行
- ✅ 无需额外依赖

**缺点**：
- ❌ 仅限Node.js项目
- ❌ 每次install都运行（可能慢）

**配置**：
```json
{
  "scripts": {
    "prepare": "cp scripts/pre-commit .git/hooks/pre-commit && chmod +x .git/hooks/pre-commit"
  }
}
```

---

### 方案4：Makefile（跨项目）

**原理**：提供make命令管理hooks

**优点**：
- ✅ 明确的命令，易于理解
- ✅ 可以管理多种任务

**缺点**：
- ❌ 需要用户手动运行make
- ❌ Windows需要额外工具

**Makefile**：
```makefile
.PHONY: install-hooks update

install-hooks:
	@echo "安装Git Hooks..."
	cp scripts/pre-commit .git/hooks/pre-commit
	chmod +x .git/hooks/pre-commit

update:
	git pull origin master
	$(MAKE) install-hooks
```

---

## 最佳实践（推荐组合）

### 本项目方案：**setup.sh + post-merge**

**首次使用**：
```bash
git clone https://github.com/fullmanchiu/alfred.git
cd alfred
./scripts/setup.sh  # 安装所有hooks
```

**后续更新**：
```bash
git pull origin master
# post-merge hook自动检测并更新hooks
```

**优势**：
1. **首次手动** - setup.sh确保环境配置正确
2. **后续自动** - post-merge自动保持hooks最新
3. **零依赖** - 不依赖npm/yarn等工具
4. **跨平台** - 适用于后端（Kotlin）、前端（React）、Python服务

---

## 各场景推荐方案

| 场景 | 推荐方案 | 原因 |
|------|---------|------|
| 多语言项目 | setup.sh + post-merge | 零依赖，跨语言 |
| 纯Node.js项目 | Husky | 业界标准，集成好 |
| 快速原型 | 手动README说明 | 最简单，无需配置 |
| 企业团队 | setup.sh + CI检查 | 确保所有人使用相同hooks |

---

## Husky vs Post-merge 对比

| 特性 | Husky | Post-merge |
|------|-------|------------|
| npm install时生效 | ✅ | ❌ |
| git pull时生效 | ❌ | ✅ |
| 跨语言支持 | ❌ | ✅ |
| 需要修改package.json | ✅ | ❌ |
| 首次配置 | 一行命令 | 需要运行setup.sh |
| 维护成本 | 低 | 低 |

---

## 总结

对于Alfred项目（包含Kotlin后端、React前端、Python服务）：

**推荐方案**：`setup.sh + post-merge`

**理由**：
1. 后端是Kotlin（不适合Husky）
2. 前端是React（可以用Husky，但不统一）
3. Python服务（不适合Husky）
4. setup.sh统一配置所有服务
5. post-merge确保hooks自动更新

**使用体验**：
```bash
# 新成员
./scripts/setup.sh  # 一次性配置

# 日常开发
git pull  # 自动更新hooks
git commit  # 自动运行检查
```
