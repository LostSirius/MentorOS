# References and provenance

本页说明 MentorOS 与外部项目之间的实际关系。链接出现在本页不表示相关作者
认可或参与 MentorOS，也不表示其代码已经被纳入本仓库。

## 分类标准

- **直接集成 / 改编**：仓库中存在复制或改写后的实现，必须遵守对应上游许可证。
- **方法论参考**：仅吸收工作流、研究阶段或风险模式，没有移植上游源码或素材。
- **背景资料**：用于了解领域背景，不作为代码或文档实现来源。
- **未采用**：审阅过，但当前仓库没有可识别的实现或内容来源关系。

## 用户列出的来源

| # | 来源 | MentorOS 中的关系 | 边界 |
| --- | --- | --- | --- |
| 1 | [HKUSTDial/Supervisor-Skills](https://github.com/HKUSTDial/Supervisor-Skills) | **直接集成 / 改编** | 研究技能位于 `src/backend/plugins/phd-research/skills/`；详细归属见该目录的 `ATTRIBUTION.md`。 |
| 2 | [Heisenbear-Rebirth/Academic-MCP](https://github.com/Heisenbear-Rebirth/Academic-MCP) | **未采用** | 当前没有代码、提示词或模块规范可追溯到该仓库；其仓库目前也未声明许可证，因此不得复制内容。 |
| 3 | [Weixin-Liang/LLM-scientific-feedback](https://github.com/Weixin-Liang/LLM-scientific-feedback) | **直接改编** | 审稿大纲方法与提示词用于 `scientific-feedback` skill 和 `src/frontend/lib/scientific-feedback.ts`。 |
| 4 | [Yuan1z0825/nature-skills](https://github.com/Yuan1z0825/nature-skills) | **方法论参考** | 参考可验证工作流、引用核验、图表与实验日志思路；没有整体移植仓库。 |
| 5 | [SkillsMP](https://skillsmp.com/skills) | **发现索引，不是内容来源** | 仅可用于发现公开 skill；具体内容必须回到原仓库逐项核对作者与许可证。 |
| 6 | [Orchestra-Research/AI-Research-SKILLs](https://github.com/Orchestra-Research/AI-Research-SKILLs) | **方法论参考** | 参考双循环研究、发散/收敛和严谨性评审思路；没有移植其 skill 集合。 |
| 7 | [Auto-Empirical-Research-Skills](https://github.com/brycewang-stanford/Auto-Empirical-Research-Skills) | **方法论参考** | 参考阶段化、可恢复产物和稳健性检查；没有移植社区 skill 或统计软件栈。 |
| 8 | [SakanaAI/AI-Scientist](https://github.com/SakanaAI/AI-Scientist) | **方法论与反模式参考** | 参考研究流水线、产物契约及已公开的失败模式；没有复制其源码。 |
| 9 | [academic-research-skills](https://github.com/imbad0202/academic-research-skills) | **方法论参考** | 参考 HITL、完整性门禁、Material Passport 和多视角审查；没有移植 agent swarm。 |
| 10 | [The AI Scientist: Nature announcement](https://sakana.ai/ai-scientist-nature/) | **背景资料** | 是第 8 项的项目进展与局限说明，不是独立代码来源；没有复制网页素材。 |
| 11 | [rullerzhou-afk/clawd-on-desk](https://github.com/rullerzhou-afk/clawd-on-desk) | **审阅后未采用** | 曾评估其桌宠交互；上游 Clawd 美术为 All Rights Reserved，因此 MentorOS 不提交其素材、下载器或桥接实现。 |

## 其他已识别的直接上游

- [mckaywrigley/chatbot-ui](https://github.com/mckaywrigley/chatbot-ui)：
  MentorOS 前端的历史基础，已进行产品化改造；上游采用 MIT License。
- [VCG-Bench](https://github.com/sxy1499894281/VCG-Bench)：
  `drawio-reconstruction` skill 携带的 MIT 许可来源，完整文本保存在
  `src/backend/plugins/phd-research/skills/drawio-reconstruction/LICENSE`。

## 详细映射

六个研究方法来源的吸收边界记录在
[`docs/distill/sources/`](distill/sources/)；法律与许可证说明见
[`THIRD_PARTY_NOTICES.md`](THIRD_PARTY_NOTICES.md)。

最后核对日期：2026-09-01。上游许可证可能变化；升级或重新吸收内容前必须再次核对。
