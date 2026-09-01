# MentorOS · 科研 Skills 蒸馏（入口）

> **状态：已蒸馏到可执行使用（L4-ready 文档包）**  
> 细节不在本文件堆长文，而在 **`docs/distill/`** 蒸馏包。实现模块时以该目录为准。

## 1. 六库来源与采用边界

| 库 | 关系 | 上游许可证 | 附录 |
|----|------|------------|------|
| [Supervisor-Skills](https://github.com/HKUSTDial/Supervisor-Skills) | 直接集成 / 改编 | CC BY-NC-SA 4.0；部分 skill 另有文件级许可 | [sources/supervisor.md](distill/sources/supervisor.md) |
| [AI-Research-SKILLs](https://github.com/Orchestra-Research/AI-Research-SKILLs) | 方法论参考 | MIT | [sources/orchestra.md](distill/sources/orchestra.md) |
| [Auto-Empirical-Research-Skills](https://github.com/brycewang-stanford/Auto-Empirical-Research-Skills) | 方法论参考 | CC BY-SA 4.0 | [sources/aers.md](distill/sources/aers.md) |
| [AI-Scientist](https://github.com/SakanaAI/AI-Scientist) | 方法论与反模式参考 | AI Scientist Source Code License 1.0 | [sources/ai-scientist.md](distill/sources/ai-scientist.md) |
| [academic-research-skills](https://github.com/imbad0202/academic-research-skills) | 方法论参考 | CC BY-NC 4.0 | [sources/ars.md](distill/sources/ars.md) |
| [nature-skills](https://github.com/Yuan1z0825/nature-skills) | 方法论参考 | Apache-2.0 | [sources/nature.md](distill/sources/nature.md) |

其余候选链接、未采用项目及法律说明见
[`REFERENCES.md`](REFERENCES.md) 和
[`THIRD_PARTY_NOTICES.md`](THIRD_PARTY_NOTICES.md)。

## 2. 蒸馏包导航（请从这里用）

| 路径 | 用途 |
|------|------|
| [distill/README.md](distill/README.md) | 包说明与完成标准 |
| [distill/shared/](distill/shared/) | 证据纪律、门禁、致命缺陷、五维、人在回路 |
| [distill/modules/](distill/modules/) | 八大模块步骤 / UI / 验收 |
| [distill/schemas/handoff.ts](distill/schemas/handoff.ts) | 模块间 TypeScript 契约 |
| [distill/injectable/](distill/injectable/) | 可静默注入的 system 片段 |
| [distill/sources/](distill/sources/) | 分库吸收边界 |

## 3. 八条铁律（压缩）

1. 人在回路（可中断、可导出、人拥有科学判断）  
2. 证据纪律（禁模型记忆当出处）  
3. 阶段结构化交接（见 handoff.ts）  
4. 可证伪 RQ / 假设 / 指标  
5. 完整性门禁（BLOCK/WARN）  
6. 静默 skill，无技能商店  
7. 投稿级表达与图注下限  
8. 编排优先于堆砌工具  

全文见 `distill/shared/*`。

## 4. 模块 → 文档

| 模块 | Playbook | Injectable |
|------|----------|------------|
| 文献 | [modules/literature.md](distill/modules/literature.md) | [literature.system.md](distill/injectable/literature.system.md) |
| Idea | [modules/idea.md](distill/modules/idea.md) | [idea.system.md](distill/injectable/idea.system.md) |
| 实验 | [modules/experiment.md](distill/modules/experiment.md) | [experiment.system.md](distill/injectable/experiment.system.md) |
| 撰写 | [modules/writing.md](distill/modules/writing.md) | [writing.system.md](distill/injectable/writing.system.md) |
| 润色 | [modules/polish.md](distill/modules/polish.md) | [polish.system.md](distill/injectable/polish.system.md) |
| 图表 | [modules/figures.md](distill/modules/figures.md) | [figures.system.md](distill/injectable/figures.system.md) |
| 审稿 | [modules/review.md](distill/modules/review.md) | [review.system.md](distill/injectable/review.system.md) |
| 总览 | [modules/overview.md](distill/modules/overview.md) | （聚合，无单独生成器） |

## 5. 运行时 skill（已同步的 Supervisor 系）

`src/backend/plugins/phd-research/skills/` — 由 resolver 静默注入；与 `distill/injectable` 叠加使用。

| 模块 | 主 Skill |
|------|----------|
| 撰写 | `paper-writer` · `intro-drafter` · `tech-paper-template` |
| 润色 | `paper-polish`（+ `scientific-feedback` 辅助） |

## 6. 覆盖度（诚实）

| 层级 | 状态 |
|------|------|
| L1 原则 | ✅ |
| L2 分库精炼 + 吸收边界 | ✅ |
| L3 模块 playbook + 验收 | ✅ |
| L4 文档：契约 + injectable | ✅ |
| L4 代码：八模块全部接线 | ✅ 文献 / Idea / 实验 / 撰写 / 图表 / 审稿 / 润色 / 总览 |

**“完美使用”指：不查上游也能按包实现模块。**  
不是把六个仓库每个文件拷进本仓库。

## 7. Agent 强制规则

`.cursor/rules/mentoros-modules.mdc` → 实现时必须打开对应 `docs/distill/modules/*.md`。

