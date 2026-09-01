# Module · Paper Drafting（撰写）

## 目标
在证据门控下**从零起草**论文结构与章节，而不是自由发挥。

## 输入
`LiteraturePacket` + `IdeaCard` + 可选 `ExperimentRecord` + 用户章节材料。

## 静默 Skill（蒸馏进本模块）

| Skill | 作用 |
|-------|------|
| `paper-writer` | 证据门控分节起草 |
| `intro-drafter` | 引言六段式 |
| `tech-paper-template` | outline / 结构辅助 |
| `scientific-feedback` | 起草时的质量约束（辅助） |
| injectable | `../injectable/writing.system.md` |

运行时：`loadSkillForMode(outline|draft_section|intro|nature_style)`；  
API：`/api/writing` 注入 `writing.system.md`。

> 润色 / 按意见改稿 / 局部改稿见 [`polish.md`](./polish.md)。会话数据 `WritingSession` 共享。

## 模式（本模块 UI）

| Mode | 行为 |
|------|------|
| outline | 只出结构与每段证据需求 |
| draft_section | 证据门控起草单节 |
| intro | Intro flowchart 六段式 |
| nature_style | Nature-like 摘要/引言/讨论档 |

## 流程
1. 建 Evidence Map（共享纪律）  
2. 检查实验声称是否有 provenance  
3. 生成（禁止 L4）  
4. 跑 G1/G2/G7  

## UI 必备
- 独立「撰写」导航（与「润色」分离）  
- 章节选择器、证据侧栏、Draft vs Final、风格档位  
- **字数上限**（预设 / 自定义）+ 实时计数；超限进 G-Length 门禁 

## 输出契约
`WritingBundle`（mode ∈ outline | draft_section | intro | nature_style）  
见 `../schemas/handoff.ts`

## 验收
- [ ] 正文无假引用、无占位括号  
- [ ] Final 模式无“计划结果”冒充已完成  
- [ ] locale 遵循（投稿英文章节可强制 en）  
- [ ] injectable 为 `writing.system.md`；不含润色主流程  
- [ ] 与润色模块 UI/模式不混用
