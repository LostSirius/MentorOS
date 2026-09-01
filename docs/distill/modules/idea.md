# Module · Idea Inspiration & Evaluation（Idea）

## 目标
发散候选 → 收敛评估 → 产出可交给实验的 `IdeaCard`。

## 输入
- 用户想法文本  
- 可选：`LiteraturePacket.gaps` / `researchQuestions` / 精读 Paper Card

## 两阶段 UX（强制）

### Phase A · Brainstorm（发散）
- 从 gaps / “更高更快更强…” 轴生成 3–7 个候选卡片  
- 用户可编辑、删除、合并  
- **此阶段不给最终裁决**

### Phase B · Evaluate（收敛）
对选中卡片执行：
1. 一句话故事 + 类型（Novel Problem/Method/Setting）  
2. Fatal-flaws 早闸（`fatal-flaws.md`）  
3. 五维打分（`five-dimensions.md`）  
4. 能力/时间匹配（询问或表单：周投入、算力、截止日期）  
5. 会场/范式建议  
6. 裁决三档 + 修订建议  
7. 强制产出 **可证伪 RQ + 假设**

## 输出契约
`IdeaCard`（`../schemas/handoff.ts`）

## UI 必备
- 左右或上下：候选列表 | 评估面板（雷达+缺陷+裁决）  
- “送入实验设计”按钮（需 Accept 级裁决或用户强制确认）  
- 对比模式（2–3 卡）

## 静默 Skill
- `brainstorm` → Phase A  
- `idea-evaluator` → Phase B  
- injectable: `../injectable/idea.system.md`

## 验收
- [ ] FATAL 未缓解时默认不可一键进入实验（可强制确认）  
- [ ] 每维有 rationale  
- [ ] 输出含 falsifiable RQ  
- [ ] 不编造“已有实验证明”
