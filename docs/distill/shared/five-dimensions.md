# Shared · Five Dimensions（更高更快更强更省更广）

> 来源：Supervisor idea-evaluator `five-dimensions`。相对**当前最强基线**打分，不是绝对分。

## 维度定义

| 维 | 英文 | 问什么 | 典型切入 |
|----|------|--------|----------|
| Higher | Effectiveness | 准不准、好不好 | 加模态/信息、反馈修正、错误归因 |
| Faster | Efficiency | 更快推理/训练/交互 | 缓存、蒸馏、早停、检索剪枝 |
| Stronger | Robustness | 分布外/噪声/攻击是否稳 | 对抗、OOD、多域 |
| Cheaper | Cost | 数据/标注/算力/人力更省 | 少样本、弱监督、参数高效 |
| Broader | Unification | 是否统一更多任务/模态/领域 | 多任务、统一架构、跨域 |

## 评分建议（1–5）

- **5**：相对强基线有清晰机制 + 可预期的显著增益轴  
- **3**：有道理但增益不确定或仅局部  
- **1**：该轴无贡献或可能变差  

强 idea：通常 **一维突出（≥4）且另一维不崩（≥3）**。四维含糊 = 弱 idea。

## 归因纪律

- 每维分数必须附 **一句机制理由**（不是空话“更创新”）。  
- 禁止把同一实验增益重复计到所有维。  
- 非 STEM 范式改用领域替代框架（社科/人文等），见 Supervisor `domain-evaluation-frameworks`；CS 默认用本五维。

## 输出字段

```json
{
  "scores": {
    "higher": { "score": 4, "rationale": "..." },
    "faster": { "score": 3, "rationale": "..." },
    "stronger": { "score": 2, "rationale": "..." },
    "cheaper": { "score": 4, "rationale": "..." },
    "broader": { "score": 3, "rationale": "..." }
  }
}
```
