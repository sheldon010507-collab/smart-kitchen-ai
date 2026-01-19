---
description: 开始需要与当前工作区隔离的功能开发时，或在执行实施计划之前使用
---

# 使用 Git Worktree

## 第一性原理

**为什么要隔离？** 混在一起的代码变更难以追踪和回滚。隔离工作区让每个功能有独立的生命周期。

**核心公理：**
1. 隔离降低风险 - 一个分支的问题不影响其他
2. 并行工作成为可能 - 多个功能可同时进行
3. 干净基线便于比较 - 明确知道改了什么

## 目录选择流程

### 1. 检查现有目录
```bash
ls -d .worktrees 2>/dev/null     # 首选（隐藏）
ls -d worktrees 2>/dev/null      # 备选
```

**如果找到：** 使用它。两个都存在时 `.worktrees` 优先。

### 2. 询问用户
如果没有目录存在：

```
没有找到 worktree 目录。应该在哪里创建？

1. .worktrees/（项目本地，隐藏）
2. ~/.config/superpowers/worktrees/<项目名>/（全局位置）

你偏好哪个？
```

## 安全验证

### 项目本地目录
**必须验证目录被 gitignore：**

```bash
git check-ignore -q .worktrees 2>/dev/null
```

**如果未被忽略：**
1. 添加到 .gitignore
2. 提交更改
3. 继续创建 worktree

**为什么关键：** 防止意外将 worktree 内容提交到仓库。

## 创建步骤

### 1. 检测项目名
```bash
project=$(basename "$(git rev-parse --show-toplevel)")
```

### 2. 创建 Worktree
```bash
git worktree add "$path" -b "$BRANCH_NAME"
cd "$path"
```

### 3. 运行项目设置
自动检测并运行适当的设置：

```bash
# Node.js
if [ -f package.json ]; then npm install; fi

# Rust
if [ -f Cargo.toml ]; then cargo build; fi

# Python
if [ -f requirements.txt ]; then pip install -r requirements.txt; fi
```

### 4. 验证干净基线
运行测试确保 worktree 起点干净：

```bash
npm test / cargo test / pytest
```

**如果测试失败：** 报告失败，询问是否继续或调查。
**如果测试通过：** 报告就绪。

### 5. 报告位置
```
Worktree 就绪于 <完整路径>
测试通过（N 个测试，0 失败）
准备实现 <功能名称>
```

## 快速参考

| 情况 | 动作 |
|------|------|
| `.worktrees/` 存在 | 使用它（验证被忽略） |
| `worktrees/` 存在 | 使用它（验证被忽略） |
| 两个都存在 | 使用 `.worktrees/` |
| 都不存在 | 询问用户 |
| 目录未被忽略 | 添加到 .gitignore + 提交 |
| 基线测试失败 | 报告失败 + 询问 |

## 危险信号

**绝不要：**
- 项目本地 worktree 未验证被忽略就创建
- 跳过基线测试验证
- 测试失败时不问就继续
- 模糊时假设目录位置
