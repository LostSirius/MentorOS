# Skills：面向读者的技能导读

[English](README.en.md) · 中文

你点进这个目录，大概是想搞清楚 Supervisor-Skills 的"可执行核心"到底是什么。这份 README 就是为你准备的：**不装插件也能当做科研思考清单用，装了插件之后也知道怎么用、什么时候用、用哪一个。**

## 这份 README 在项目里的位置

Supervisor-Skills 的内容被分成三层，各有各的读者：

| 入口 | 读者 | 作用 |
|---|---|---|
| 顶层 [`README.md`](../../../README.md) | 第一次打开项目的人 | 为什么做这个项目、教程结构、怎么装 |
| [`handbook/`](../../../handbook/) | 想系统学方法论的人 | 六章科研与写作系统指南（理论主轴） |
| **本文件** | 想直接上手技能的人 | 7 个技能**分别是什么、什么时候用、怎么接龙** |
| `SKILL.md`（每个技能目录内） | 插件 / LLM | 可执行规范：完整性核查、输出格式、模式选项（机器可读，人看有点累） |

一句话：**handbook 教"道"，SKILL.md 跑"器"，本 README 是"道器之间的桥"。**

## 两条主线：技术论文 vs Benchmark 论文

7 个技能不是一堆孤立工具，它们对应两条完整的论文生命周期。先定位自己在写哪种论文，再决定从哪个技能入手。

### 主线一：技术类 / 立场类论文（新方法解决已有问题）

按博士生写第一篇顶会论文的自然节奏，推荐顺序：

1. **[idea-evaluator](idea-evaluator/SKILL.md)** — 在把一个 idea 立项前做体检，淘汰弱 idea、打磨有潜力的
2. **[tech-paper-template](tech-paper-template/SKILL.md)** — 动笔写任何段落之前，先锁住完整的论文逻辑骨架
3. **[intro-drafter](intro-drafter/SKILL.md)** — 把骨架拆成六段式 Introduction 大纲
4. **[figure-designer](figure-designer/SKILL.md)** — 规划 Motivated Example、Solution Overview、Experiment 三张承重图
5. **[pre-submission-reviewer](pre-submission-reviewer/SKILL.md)** — 投稿截止前 3 到 5 天的最终审核

**横向工具**：[vibe-research-workflow](vibe-research-workflow/SKILL.md) 和上面五步**正交**，不是第 6 步。无论你正在写代码、画图还是写文字，它都会给你 AI 协作的行为规则与工具选择建议。

### 主线二：Benchmark / Evaluation 类论文

Benchmark 管线比技术论文更强调阶段先后，每个环节都要先于下一个完成。**[benchmark-paper-template](benchmark-paper-template/SKILL.md)** 是这条主线上的编排器：一份技能内置了"Gap → Design → Construction → Experiments → Paper Structure → Checklist"六阶段的完整思考支撑，按当前阶段自动定位并输出对应的五大支柱（Research Gap / Construction Pipeline / Evaluation Framework / Empirical Findings / 可选的 Companion Method）。

写 Benchmark 论文，起点与终点都是这一个技能；只有两张图的设计需要额外调用 figure-designer，投稿前的细节审核仍然落在 pre-submission-reviewer。

### 已经卡在某一环？

遇到具体瓶颈的读者，跳过顺序，直接去对应章节：
- Idea 立项没底气 → **idea-evaluator**
- Introduction 逻辑链断了 → **intro-drafter**
- 方法章节写不顺 → **tech-paper-template**
- 图画得别扭，不知道用什么工具 → **figure-designer**
- 投稿前慌，不知道该查什么 → **pre-submission-reviewer**
- Benchmark 的 gap 说不清、评估维度理不顺 → **benchmark-paper-template**
- AI 辅助科研的规则拿不准 → **vibe-research-workflow**

## 7 张技能卡片

每张卡把 SKILL.md 的严谨定义翻译成"人话"，附带配套的 handbook 章节以及与其它技能的接龙关系。

### idea-evaluator — Idea 的"投稿前体检"

- **定位**：把资深导师评估一个 idea 时的隐式流程，显式化成四层可核查的检查单。
- **什么时候触发**：
  - 学生提出一个 idea，想在投入几个月之前知道"值不值得做"
  - 审稿式自查：现有工作是否已经覆盖、能不能落到 Higher/Faster/Stronger/Cheaper/Broader 某个维度上、学生自身能力与时间窗是否匹配
  - 对一份 idea 列表做粗筛，保留前三，砍掉其余
- **四层检查**：致命缺陷审计（Fatal Flaws，早期闸门）→ Idea 生命周期与学生能力匹配 → 五维打分（更高更快更强更省更广）→ 范式跃迁探测与可行性核查。次序不能换——一个七分的"Higher"分数，在一个 CRITICAL 的 Fatal Flaw 面前毫无意义。
- **产出**：每条证据驱动的打分、CRITICAL / MAJOR / MINOR 的缺陷严重性分级、一份 "Reject and Pivot" 或 "Proceed with Guardrails" 的结论。
- **对应 handbook 章节**：[2.1 Idea 生命周期](../../../handbook/02_Idea_Generation/2.1_Idea的生命周期与能力匹配.md) · [2.2 更高更快更强](../../../handbook/02_Idea_Generation/2.2_想Idea的思路_更高更快更强.md) · [2.3 颠覆式创新](../../../handbook/02_Idea_Generation/2.3_进阶_如何做颠覆式创新.md)
- **下游接龙**：体检通过 → **tech-paper-template** 锁骨架；范式探测信号为"颠覆候选"时，先去看 handbook 2.3。

### tech-paper-template — 下笔前的"逻辑骨架"

- **定位**：用思考模板表格，把论文的 Background、Limitations、Key Idea/Goal、Challenges、Methodology Modules、Contributions 强制对齐。
- **什么时候触发**：
  - idea 已通过评估，动笔前想先把故事线理清楚
  - 合作者对"要不要加一个模块 X"意见不一致——让表格仲裁
  - 写到一半发现方法与 Motivation 接不上——回表格重排
- **关键纪律**：技术类论文 vs 新问题/设定类论文的**论文定位**必须先选一次；挑战与模块一一对应，数量不超过三；贡献点必须指向具体章节编号。
- **产出**：一张完整的 thinking-template 表 + 自洽性核查（"挑战—模块—贡献"三路互锁）+ 下游 intro-drafter 直接可用的结构化输入。
- **对应 handbook 章节**：[3.1 完成一篇科研论文你需要做几件事情](../../../handbook/03_Paper_Writing/3.1_完成一篇科研论文你需要做几件事情.md) · [3.3 技术类 Full Paper 思考模板](../../../handbook/03_Paper_Writing/3.3_技术类Full_Paper思考模板.md)
- **上下游**：上游 **idea-evaluator**；下游 **intro-drafter**（把骨架翻译成六段式 Intro）和 **figure-designer**（锁定 Solution Overview 图）。

### intro-drafter — 六段式 Introduction 大纲

- **定位**：把 Background、Limitations、Goal、Challenges、Solution Overview、Contributions 六段之间的五条逻辑链明确化、可核查化。
- **什么时候触发**：
  - tech-paper-template 的骨架做完，开始写 Intro
  - 合作者反馈"Intro 读起来一组主张散落"——通常是某条跨段落链断了
  - 自查 contributions 是否每条都对应到一个具体章节编号
- **六段要点**：研究背景与 Running Example · 现有局限（不超过三条）· 问题本质与目标 · 关键挑战（不超过三条）· 方案总览（模块与挑战一一对应）· 编号的贡献点（引用兑现章节）。
- **产出**：带逻辑链标注的大纲 + Flowchart 一致性报告 + 类型定位（技术类 vs 新问题类）说明第三段是桥接段还是承重段。
- **对应 handbook 章节**：[3.2 Introduction 写作的思考模型](../../../handbook/03_Paper_Writing/3.2_Introduction写作的思考模型.md)
- **上下游**：上游 **tech-paper-template**；下游 **figure-designer**（第一段的 Running Example 要变成 Motivated Example 图）。

### benchmark-paper-template — Benchmark 论文的一站式编排器

- **定位**：专为 Benchmark / Evaluation 类论文设计，把五大支柱（Research Gap、Construction Pipeline、Evaluation Framework、Empirical Findings、可选的 Companion Method）和六阶段工作流打包为一个技能。
- **什么时候触发**：
  - 开始一个 Benchmark 项目，从"为什么需要这个 Benchmark"开始思考
  - 已经收了数据，但 evaluation 维度定义模糊
  - 实验做完，不确定 Finding-X 是否"够深"
  - 投稿前对照 Benchmark Paper Checklist 走一遍
- **六阶段**：Gap Analysis → Design → Construction Pipeline → Experiments → Paper Structure → Checklist。技能会**先识别当前所处阶段**，再路由到对应的思考支撑。
- **产出**：阶段性交付物 + 六段式 Introduction 逻辑链 + Section 2-7 骨架 + 投稿前检查单。
- **对应 handbook 章节**：[3.4 Benchmark 与 Evaluation 类论文思考模板](../../../handbook/03_Paper_Writing/3.4_Benchmark与Evaluation类论文思考模板.md) · [6.3 LEAD 写作剖析](../../../handbook/06_Case_Studies/6.3_VLDB_2026_LEAD写作剖析.md)
- **横向接龙**：figure-designer（两张核心图）· pre-submission-reviewer（细节审核）。

### figure-designer — 三张承重图的设计顾问

- **定位**：围绕技术论文中三张决定叙事重量的图——Motivated Example（Figure 1）、Solution Overview（方法章节）、Experimental Results——给出设计范式、排版规则、工具选型建议。
- **什么时候触发**：
  - Intro 大纲锁定后，要把第一段的 Running Example 翻成 Motivated Example 图
  - 方法章节写之前，要决定 Solution Overview 图按什么逻辑切分
  - 实验做完，主表太挤、想把主结果用图呈现
  - 纠结"用 PPT 还是 TikZ 还是 Inkscape"
- **关键原则**：一张图只讲一件事；坐标轴、图例、配色的顶会审美；实验图必须直接回应 Introduction 里的 Motivation。
- **产出**：针对每张图的设计要点、常见反例、工具选择、可复用的布局模板。
- **对应 handbook 章节**：[4.1 Motivated Example Figure](../../../handbook/04_Scientific_Plotting/4.1_Motivated_Example_Figure.md) · [4.2 Solution Overview Figure](../../../handbook/04_Scientific_Plotting/4.2_Solution_Overview_Figure.md) · [4.3 Experimental Results Figure](../../../handbook/04_Scientific_Plotting/4.3_Experimental_Results_Figure.md) · [4.4 绘图 Checklist](../../../handbook/04_Scientific_Plotting/4.4_绘图Checklist与工具速查表.md)
- **上下游**：上游 **intro-drafter**（Running Example 定了图才好画）和 **tech-paper-template**（模块结构定了 Solution Overview 的骨架）；下游 **pre-submission-reviewer**（图的质量进入最终审核）。

### pre-submission-reviewer — 顶会审稿人视角的最终审核

- **定位**：模拟顶会审稿人，从宏观逻辑、写作细节、英语语法、LaTeX 排版、图表质量五个维度批改草稿。
- **什么时候触发**：
  - 投稿截止前 3 到 5 天的 final pass
  - 合作者改不动了，需要一个"冷眼"的完整体检
  - Rebuttal 写完，想对照常见的"审稿人会挑什么毛病"再扫一遍
- **方法论**：严重性分级（CRITICAL / MAJOR / MINOR）+ 审稿人视角写作 checklist + 英语语法高频坑位表 + LaTeX 常见格式问题。
- **产出**：按严重性排序的缺陷清单、每条配可行的修复建议，并明确**能在 72 小时内修完的子集**。
- **对应 handbook 章节**：[3.5 写作细节与 Checklist](../../../handbook/03_Paper_Writing/3.5_写作细节与Checklist.md) · [1.1 如何评价一篇论文的质量](../../../handbook/01_Preliminary/1.1_如何评价一篇论文的质量.md)
- **上游**：技术论文主线的终点；Benchmark 论文主线的终点。

### vibe-research-workflow — 贯穿始终的 AI 协作行为守则

- **定位**：AI 辅助科研的全流程指南，覆盖三条子流水线——Vibe Coding、Vibe Figure、Vibe Writing。
- **什么时候触发**：
  - 第一次用 Claude / Cursor / Codex 辅助写研究代码，不知道分工边界
  - 要画图，纠结"用 AI 生成还是自己画"
  - 写作时担心 LLM 代笔稀释了学术品味
  - 总觉得"AI 在瞎写"——通常是行为守则没对齐
- **核心原则**：**学术判断保留在人手里，把机械劳动交给 AI**；每次 AI 产出都要有明确的可复核证据；工具选型按任务类型落到具体清单。
- **产出**：当前场景的推荐工具链、人机分工示意、常见失败模式对照表。
- **对应 handbook 章节**：[5.1 Vibe Research 与 Vibe Coding 入门](../../../handbook/05_Vibe_Research/5.1_Vibe_Research与Vibe_Coding入门.md) · [5.2 实战经验分享](../../../handbook/05_Vibe_Research/5.2_李伯岩实战经验分享与会议纪要.md)
- **用法特点**：与其它六个技能**正交**。不是第 N 步，而是你走每一步时都可以随时调用的协作规则。

## 怎么用这些技能

### 装了 Claude 插件（推荐）

按顶层 README 的[快速开始](../../../README.md#快速开始-quick-start)装好之后，自然语言即可触发，不需要记任何命令。下面这类短语会自动命中对应技能：

- "帮我评估一下这个 idea" → `idea-evaluator`
- "先帮我把论文的逻辑骨架搭出来" → `tech-paper-template`
- "起草 Introduction / 我想写一下 Intro" → `intro-drafter`
- "这张图应该怎么画 / 用什么工具画" → `figure-designer`
- "投稿前帮我审一遍 / 做最后的 final pass" → `pre-submission-reviewer`
- "我想写一个 Benchmark 论文 / 我在做 evaluation" → `benchmark-paper-template`
- "怎么用 AI 辅助我做研究" → `vibe-research-workflow`

### 没装插件也能用

每个技能目录下的 `SKILL.md`，本身就是一份可读的"结构化思考清单"。你可以：
- 直接把 SKILL.md 贴到你用的任何 AI 助手里（Claude、GPT、DeepSeek、Kimi 等），当 system prompt 使用
- 或者把它当成**一份静态 checklist**——不必借助任何 AI，拿笔和纸也能照着每一节逐项自查

`references/` 目录里还有更细的按需加载参考资料（比如 `idea-evaluator/references/five-dimensions.md` 是"更高更快更强"五维度的深度展开）。

## 与 handbook 的对应关系总表

| Skill | 主要对应 handbook 章节 |
|---|---|
| idea-evaluator | 2.1 / 2.2 / 2.3 |
| tech-paper-template | 3.1 / 3.3 |
| intro-drafter | 3.2 |
| benchmark-paper-template | 3.4 / 6.3 |
| figure-designer | 4.1 / 4.2 / 4.3 / 4.4 |
| pre-submission-reviewer | 3.5 / 1.1 |
| vibe-research-workflow | 5.1 / 5.2 |

**阅读顺序建议：handbook 先读一遍建立"道"的直觉，再回到本 README 按技能挑场景使用；具体执行交给 SKILL.md。**

## 贡献与反馈

新增技能、修订 SKILL.md、补 references，或者想把你用这些技能写出的顶会论文分享回来——都欢迎。请先阅读顶层 [CONTRIBUTING.md](../../../CONTRIBUTING.md)；新技能的硬性约定写在那里。

有问题、建议、或想在自己的实验室推广 Supervisor-Skills，请发邮件给 Yuyu Luo (yuyuluo [AT] hkust-gz.edu.cn)。

---

[English](README.en.md) | [中文]
