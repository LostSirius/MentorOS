# Module · Draft Polish & Revise（润色）

## 目标
对**已有初稿**做语法/语气润色、审稿意见改稿与局部修改；人工确认语义 diff。  
角色：耐心的资深导师——帮作者把**已经想说的**说得更好，而不是换成导师会写的内容。

导航顺序位于 **审稿之后**（撰写 → 图表 → 审稿 → 润色），以便承接评审意见再改稿。

## 输入
- 共享 `WritingSession`（通常由撰写模块产出；也可粘贴外部初稿）
- 可选：审稿意见列表、局部改稿指令、`preserveClaims`
- 可选：上游 Lit / Idea / Exp 摘要（仅作约束，不发明证据）

## 静默 Skill（蒸馏进本模块）

| Skill | 作用 |
|-------|------|
| `paper-polish` | 主程序：忠实润色、去 AI 腔、主张校准、中译英投稿级 |
| `scientific-feedback` | 辅助：按意见改稿时的审稿响应结构 |
| injectable | `../injectable/polish.system.md` |

运行时：`loadSkillForMode(polish|revise_*)` → `paper-polish` (+ scientific-feedback)；  
API：`/api/polish` 注入 `polish.system.md`（勿用 writing injectable）。

### 铁律（自 SKILL 蒸馏）

1. **忠实于作者原意**高于一切——意义变动必须进 `pendingSemanticDiffs`  
2. **禁止编造**数据 / 引用 / 方程 / 结果 / 方法名  
3. **保守默认**：小改优于大改；结构坏了应回流撰写模块，而非硬润色  
4. **章节语域**不同（Intro 定位 / Methods 可复现 / Results 过去时观察 / Discussion 解释与限定）  
5. **主张校准**：prove / SOTA / first 等与证据强度匹配；只调语言强度，不发明证据  
6. **去 AI 腔**：夸饰框架、营销形容词、高频 AI 词、强迫三元组、空泛归因  
7. **中译英**：先抽命题再写英文；术语稳定；翻译时不抬升主张强度  

参考材料（已在 skill 目录，运行时静默加载）：  
`paper-polish/references/{section-conventions,academic-phrasebank,ai-tone-guardrails}.md`

## 模式（本模块 UI）

| Mode | 行为 |
|------|------|
| polish | 语法/流畅/去 AI 腔/校准；意义变动 → diff |
| revise_feedback | 逐条意见：stance + action + diff(`commentId`) |
| revise_scoped | 选区/指令改稿；可 `preserveClaims` |

> 从零起草见 [`writing.md`](./writing.md)。

## 流程
1. 确认当前稿存在（或粘贴载入）  
2. 改稿前自动版本快照  
3. 注入 polish injectable + paper-polish skill  
4. 生成修订正文 + 语义 diff（禁止偷偷改数字/主张除非用户允许）  
5. 用户 Accept/Reject  
6. A/B 对比与恢复；跑 G1/G2/G7  

## UI 必备
- 独立「润色」导航（与「撰写」分离）  
- 正文优先；无稿时可粘贴初稿或**上传文稿**（多格式）  
- **字数上限** + 实时计数（与撰写共享 `wordLimit`）  
- 润色 / 审稿意见 / 局部改稿面板  
- 语义 diff 确认  
- 版本历史与 A/B  

## 输出契约
`WritingBundle`（mode ∈ polish | revise_feedback | revise_scoped）+ `WritingSession`  
见 `../schemas/handoff.ts`

## 验收
- [ ] 无初稿时明确引导撰写或粘贴  
- [ ] Final 模式不伪造实验结果  
- [ ] 语义改动需确认后才写入正文  
- [ ] injectable 为 `polish.system.md`，skill 为 `paper-polish`  
- [ ] 与撰写模块 UI/模式不混用  
- [ ] 不把「从零起草」当作润色完成
