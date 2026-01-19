---
description: 当你有规格或需求要做多步骤任务时使用，在动代码之前
---

# 编写计划

## 第一性原理

**为什么要写计划？** 计划是思考的外化。写下来才能发现漏洞，才能与他人对齐。

**核心公理：**
1. 明确 > 模糊 - 精确的文件路径、命令比"大概这样"有用
2. 小步骤减少认知负担 - 每步 2-5 分钟可控
3. TDD 嵌入计划 - 每个功能先写测试

## 概述

写全面的实施计划，假设执行者对代码库零上下文。记录所有需要知道的：每个任务需要改哪些文件、代码、测试、可能需要查的文档、如何测试。把完整计划拆成一口大小的任务。

**保存位置：** `docs/plans/YYYY-MM-DD-<功能名>.md`

## 一口大小的任务粒度

**每一步是一个动作（2-5 分钟）：**
- "写失败测试" - 一步
- "运行确认它失败" - 一步
- "实现最小代码让测试通过" - 一步
- "运行测试确认通过" - 一步
- "提交" - 一步

## 计划文档头部

**每个计划必须以此头部开始：**

```markdown
# [功能名称] 实施计划

**目标：** [一句话描述构建什么]

**架构：** [2-3 句话描述方法]

**技术栈：** [关键技术/库]

---
```

## 任务结构

```markdown
### 任务 N: [组件名称]

**文件：**
- 创建：`exact/path/to/file.py`
- 修改：`exact/path/to/existing.py:123-145`
- 测试：`tests/exact/path/to/test.py`

**步骤 1：写失败测试**

```python
def test_specific_behavior():
    result = function(input)
    assert result == expected
```

**步骤 2：运行测试验证它失败**

运行：`pytest tests/path/test.py::test_name -v`
预期：FAIL with "function not defined"

**步骤 3：写最小实现**

```python
def function(input):
    return expected
```

**步骤 4：运行测试验证它通过**

运行：`pytest tests/path/test.py::test_name -v`
预期：PASS

**步骤 5：提交**

```bash
git add tests/path/test.py src/path/file.py
git commit -m "feat: add specific feature"
```
```

## 记住

- 总是使用精确文件路径
- 计划中包含完整代码（不是"添加验证"）
- 写精确命令和预期输出
- DRY、YAGNI、TDD、频繁提交

## 执行交接

保存计划后，提供执行选择：

**"计划完成并保存到 `docs/plans/<文件名>.md`。两种执行选项：**

**1. 子代理驱动（本会话）** - 每个任务派发新子代理，任务间审查，快速迭代

**2. 并行会话（另开）** - 新会话用 executing-plans，批次执行带检查点

**选哪种？"**
