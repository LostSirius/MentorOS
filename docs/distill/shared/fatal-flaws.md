# Shared · Idea Fatal Flaws（致命缺陷）

> 来源：Supervisor `idea-evaluator/fatal-flaws`。Idea 模块早闸必用。

## 何为致命

同时满足：在 idea 描述阶段可观察；不能仅靠加基线/改写作修复；顶会首轮几乎必打。  
单 idea **最多报告 2 个 FATAL**；超过 2 → 方向本身错误，必须 Pivot。

## F1–F10

| ID | 名称 | 检测信号 | 缓解方向 |
|----|------|----------|----------|
| F1 | 无新意 | 相对最近工作仅微扰 | 换问题/换设定/换贡献类型 |
| F2 | 会场错配 | 贡献类型与目标 venue 不符 | 换 venue 或改贡献叙事 |
| F3 | 假基线 | 对比过时/过弱方法 | 换成当年 SOTA |
| F4 | 无动机 | 说不清 who cares / why now | 补真实痛点与时机 |
| F5 | 能力不匹配 | 技能/算力/时间不够完成生命周期 | 缩 scope 或延期 |
| F6 | 不可验证 | 声称超出计划实验可检验范围 | 砍声称或加实验 |
| F7 | 伦理/数据墙 | 数据/IRB/隐私不可及 | 换数据或公开子集 |
| F8 | 范围过大 | benchmark+方法+理论+系统全塞一篇 | 拆成一篇主贡献 |
| F9 | 锤子找钉子 | 先定技术再找问题 | 从问题/失败模式重来 |
| F10 | 机制已被证伪 | 核心机制与已知数据冲突 | **最高优先级 Pivot** |

## 裁决映射

| 条件 | 裁决 |
|------|------|
| 0 FATAL 且五维至少一维突出 | Strong Accept / 可推进 |
| 0–1 FATAL 可缓解 | Accept with Revisions |
| ≥1 FATAL 难缓解或 ≥2 FATAL | Reject and Pivot |

## 输出字段（IdeaCard）

```json
{
  "fatalFlaws": [{ "id": "F3", "severity": "FATAL", "detail": "...", "mitigation": "..." }],
  "verdict": "accept_with_revisions"
}
```
