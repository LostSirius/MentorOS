# Distill Package · README

本目录是 MentorOS 的 **可执行蒸馏包（L4-ready）**。实现任一研究模块时，以这里为准，而不是临时去翻六个上游 GitHub。

## 如何使用（开发者 / Agent）

1. 读本 README + 对应 `modules/<name>.md`  
2. 遵守 `shared/*` 铁律  
3. I/O 对齐 `schemas/handoff.ts`  
4. API/模型侧拼接 `injectable/<name>.system.md` + 已有 `phd-research/skills/*/SKILL.md`  
5. 需要溯源时查 `sources/*`  

## 目录

```
docs/distill/
  README.md                 ← 你在这里
  shared/                   ← 跨模块铁律
  modules/                  ← 八大模块 playbook + 验收
  schemas/handoff.ts        ← 模块交接契约
  injectable/               ← 可静默注入的 system 片段
  sources/                  ← 六库对照附录
```

## 模块一览

| id | Playbook | Injectable | 主 Skill |
|----|----------|------------|----------|
| literature | modules/literature.md | literature.system.md | literature-review · deep-research |
| idea | modules/idea.md | idea.system.md | brainstorm · idea-evaluator |
| experiment | modules/experiment.md | experiment.system.md | benchmark-paper-template |
| writing | modules/writing.md | writing.system.md | paper-writer · intro-drafter |
| figures | modules/figures.md | figures.system.md | figure-designer |
| review | modules/review.md | review.system.md | scientific-feedback · pre-submission |
| polish | modules/polish.md | polish.system.md | paper-polish |
| overview | modules/overview.md | — | 聚合 |

流水线顺序：撰写 → 图表 → 审稿 → **润色**（按意见改稿）。撰写与润色共用 `WritingSession`，但 UI / injectable / API 入口分离（`/api/writing` vs `/api/polish`）。

## “完美可用”定义（完成标准）

- [x] 每个模块有步骤、UI 必备、skill、验收勾选  
- [x] 跨模块 TypeScript 契约  
- [x] 可直接粘贴的 injectable prompts  
- [x] 证据纪律 / 门禁 / 致命缺陷 / 五维 / HITL 成文  
- [x] 六库各自“吸收什么 / 不搬什么”写清  
- [ ] 运行时代码 100% 接好（随模块实现；文献·Idea·实验·撰写·润色已接线）  

## 与主文档关系

`docs/research-skills-distillation.md` 是入口索引；**细节以本目录为准**。
