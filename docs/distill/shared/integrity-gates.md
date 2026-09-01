# Shared · Integrity Gates（完整性门禁）

> 来源：ARS Stage 2.5/4.5、Supervisor deep-research 六门、nature-ref-verifier、AI-Scientist Limitations 反模式。  
> 用于写作定稿、审稿、总览“投稿就绪”判定。

## Gate 严重度

| Level | 含义 | 产品行为 |
|-------|------|----------|
| **BLOCK** | 不可当作投稿/定稿 | 阻断导出“camera-ready”；强制提示修复 |
| **WARN** | 可继续但需用户确认 | Toast + 清单留档 |
| **INFO** | 改进建议 | 仅展示 |

## G1 · Citation Reality（BLOCK）

- 每条引用须有可打开的 URL 或 DOI，或用户上传全文中的明确书目。  
- 题名/作者/年与检索元数据冲突 → BLOCK 或降级为未引用。  
- 禁止 example.com、John Doe、明显占位作者。

## G2 · Claim–Evidence Fit（BLOCK/WARN）

| 判定 | 条件 |
|------|------|
| ALIGNED | 声称强度 ≤ 证据层级允许范围 |
| OVERSTATED | 用 L2/L3 支撑了 L1 才能支撑的数字/因果 | WARN→用户确认后可留，投稿模式 BLOCK |
| NOT_SUPPORTED | 无对应证据 | BLOCK |
| PROVENANCE_INSUFFICIENT | 有实验声称但无 provenance 记录 | BLOCK（实验相关句） |

## G3 · Literature Survey Gates（文献模块内）

| Gate | 严重度 | 失败动作 |
|------|--------|----------|
| Angle | BLOCK | 回退冻结 RQ |
| Coverage | WARN | 定向补检索 |
| Citation | BLOCK | 删除/重核验 |
| Taxonomy | WARN | 重做 MECE |
| Calibration | WARN | 削弱措辞 |
| Weaving | INFO | 补交叉对比 |

## G4 · Idea Fatal Gate（Idea 模块）

- ≥1 个未缓解的 FATAL → 禁止进入“强推实验”状态；可保留为草稿。  
- 详见 `fatal-flaws.md`。

## G5 · Experiment Honesty（实验模块）

- 无 `runLog`/`resultTable` → 禁止生成 Results 数值叙事。  
- “bug 当 insight”、frame-lock、shortcut 依赖 → WARN 并写入风险清单（AI-Scientist Limitations）。

## G6 · Pre-submission Bundle（审稿模块）

五维全扫：宏观逻辑 · 写作细节 · 语法 · 版式 · 图质量。  
任一 CRITICAL → BLOCK camera-ready。

## G7 · De-AI / Tone（润色模块）

- 禁用套话清单命中过多 → WARN。  
- 语义被润色改动 → 必须 diff 给用户确认（不得静默改主张）。

## G-Length · 字数上限（撰写 / 润色）

- `WritingBundle.wordLimit`：英文按词、中文按非空白字符。  
- 超过上限：Draft → WARN；Final → BLOCK。≥90% → WARN。  
- 生成 prompt 注入 `LENGTH CAP`。

## 模块触发点

| 模块 | 必跑门 |
|------|--------|
| 文献 | G3 + G1 |
| Idea | G4 |
| 实验 | G5 + G2 |
| 撰写 | G1 + G2 + G-Length |
| 图表 | G6 图质量子集 + nature 图注统计项 |
| 审稿 | G6 + G1 + G2 |
| 润色 | G1 + G2 + G7 + G-Length |
| 总览 | 汇总以上门禁状态 = 投稿就绪分 |
