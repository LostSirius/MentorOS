# Module · Review & Submission（审稿与投稿）

## 目标
预投稿审查 + 多视角评审 + 科学反馈大纲 + 返修提纲；含 integrity。

## 流水线
1. **Pre-submission checklist**（五维 CRITICAL/MAJOR/MINOR）+ **dimensionScores 1–10**  
2. **Scientific feedback outline**（Liang et al. arXiv:2310.01783 / `scientific-feedback`）  
   - Significance & novelty  
   - Reasons for acceptance  
   - 4 reject reasons（各 ≥2 子点；偏方法设计深度，避免空泛「加数据集」）  
   - 4 improvement suggestions  
3. **Multi-perspective review**（≥2 视角 + Devil's Advocate）  
4. **Ensemble 汇总**（Overall 1–10、Accept/Reject 倾向、Weaknesses）  
5. **Integrity gate** G1/G2/G6  
6. **Response outline**（点对点：同意/部分/不同意 + 拟改动作）  
7. 用户确认必改项

## UI
- **Score canvas**：总分、倾向条、严重度分布、五维雷达、弱点排序、Liang 大纲卡片  
- 严重度筛选  
- Tabs：Checklist · Feedback outline · Perspectives · Response  
- 投稿就绪灯（绿/黄/红）  
- Response 表格编辑器（确认必改项）  
- 可从撰写模块导入正文，或上传本地稿件（PDF/DOCX/MD 等抽文本）；**不自动改正文**

## Skill
`pre-submission-reviewer` · `scientific-feedback`  
参考实现：[`Weixin-Liang/LLM-scientific-feedback`](https://github.com/Weixin-Liang/LLM-scientific-feedback)（`lib/scientific-feedback.ts`）  
injectable: `../injectable/review.system.md`  
API：`/api/review`

## 验收
- [x] CRITICAL 存在时就绪灯为红  
- [x] 不自动改用户论文正文（只给意见）  
- [x] Response 与意见 id 可追溯  
- [x] 评分区有可视化（非纯文字总分）  
- [x] 输出含 Liang 式 feedbackOutline（或可降级为空）
