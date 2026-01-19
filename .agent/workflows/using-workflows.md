---
description: 在任何任务开始时使用 - 确定如何找到和使用 workflow，要求在任何响应之前检查是否有适用的 workflow
---

# 使用 Workflow

## 第一性原理

**为什么要先检查 workflow？** Workflow 是经过验证的方法。重新发明轮子浪费时间，还可能犯已知错误。

**核心公理：**
1. 站在巨人肩膀上 - 已验证的方法 > 即兴发挥
2. 1% 可能性也值得检查 - 误报成本低，漏报成本高
3. 知道概念 ≠ 使用 workflow - 每次都要读最新版本

## 规则

**在任何响应或行动之前，调用相关 workflow。** 哪怕只有 1% 可能性适用，也应该检查。

```
用户消息收到
    ↓
有任何 workflow 可能适用吗？
    ↓ 是，哪怕 1%
查看 workflow 文件
    ↓
宣布："使用 [workflow] 来 [目的]"
    ↓
严格遵循 workflow
    ↓
响应（包括澄清）
```

## 危险信号

这些想法意味着停止——你在为自己找借口：

| 想法 | 现实 |
|------|------|
| "这只是个简单问题" | 问题也是任务。检查 workflow。 |
| "我需要先了解更多上下文" | Workflow 检查在澄清问题之前。先检查。 |
| "让我先探索一下代码库" | Workflow 告诉你如何探索。先检查。 |
| "这不需要正式的 workflow" | 如果 workflow 存在，就用它。 |
| "我记得这个 workflow" | Workflow 会更新。读当前版本。 |
| "这不算是任务" | 行动 = 任务。检查 workflow。 |
| "Workflow 太重了" | 简单的事会变复杂。用它。 |
| "我先做这一件事" | 做任何事之前先检查。 |
| "我知道那是什么意思" | 知道概念 ≠ 使用 workflow。调用它。 |

## Workflow 优先级

当多个 workflow 可能适用时，使用此顺序：

1. **流程 workflow 优先**（brainstorming, debugging）- 这些决定如何接近任务
2. **实施 workflow 其次**（前端设计, MCP builder）- 这些指导执行

"让我们构建 X" → 先 brainstorming，然后实施 workflow。
"修复这个 bug" → 先 debugging，然后领域特定 workflow。

## Workflow 类型

**严格型**（TDD, debugging）：严格遵循。不要为了"灵活"而绕过纪律。

**灵活型**（模式）：根据上下文调整原则。

Workflow 本身会告诉你它是哪种类型。

## 用户指令

指令说的是做什么，不是如何做。"添加 X"或"修复 Y"不意味着跳过 workflow。
