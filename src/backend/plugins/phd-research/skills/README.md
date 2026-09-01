# MentorOS 运行时研究技能

本目录是 MentorOS 后端静默加载的研究技能集合，不是
Supervisor-Skills 上游仓库的镜像或独立发行版。

> 多许可证目录：部分技能直接改编自
> [HKUSTDial/Supervisor-Skills](https://github.com/HKUSTDial/Supervisor-Skills)，
> 科学反馈流程改编自
> [LLM-scientific-feedback](https://github.com/Weixin-Liang/LLM-scientific-feedback)。
> 使用或分发前请阅读 [`ATTRIBUTION.md`](ATTRIBUTION.md)。

## 技能映射

| MentorOS 模块 | 运行时技能 |
| --- | --- |
| 文献 | `literature-review` · `deep-research` |
| Idea | `brainstorm` · `idea-evaluator` |
| 实验 | `benchmark-paper-template` |
| 撰写 | `paper-writer` · `intro-drafter` · `tech-paper-template` |
| 图表 | `figure-designer` · `drawio-reconstruction` |
| 审稿 | `pre-submission-reviewer` · `scientific-feedback` |
| 润色 | `paper-polish` |
| 跨模块 | `vibe-research-workflow` |

技能由前后端 resolver 根据研究模块和用户意图静默选择，产品 UI 不展示
skill 名称或技能市场。模块行为以
[`docs/distill/`](../../../../../docs/distill/README.md) 为实现真源。

## 许可证与来源

- 完整技能级映射：[`ATTRIBUTION.md`](ATTRIBUTION.md)
- 项目参考分类：[`docs/REFERENCES.md`](../../../../../docs/REFERENCES.md)
- 第三方声明：[`docs/THIRD_PARTY_NOTICES.md`](../../../../../docs/THIRD_PARTY_NOTICES.md)
- MentorOS 原创部分：[`LICENSE`](../../../../../LICENSE)

新增或修改技能前，请阅读
[贡献指南](../../../../../.github/CONTRIBUTING.md)，并保留上游来源、许可证和
修改说明。

[English](README.en.md)
