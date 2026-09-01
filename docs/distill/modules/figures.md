# Module · Figures & Visualization（图表）

## 目标
按论文叙事设计三类核心图，并通过 QC。

## 三类核心图
1. **Motivated Example（Fig.1）** — 问题直觉  
2. **Solution Overview** — 方法总览  
3. **Experimental Results** — 主结果/消融  

## 流程
1. 用户选图类型 + 要证明的 claim  
2. 选择产出：设计方案 / **数据渲染出图** / **生成代码** / **生成提示词**  
3. 推荐范式/布局/工具（matplotlib / draw.io / …）  
4. 生成布局说明、可预览 chartSpec、codeArtifact 或 promptArtifact  
5. QC 对照 `figure-qc`（下）  
6. 导出检查清单 + 可选 drawio 重建

## 产出方式
| Deliverable | 行为 | API |
|-------------|------|-----|
| design | 布局 / 面板 / 图注指引 | 对话模型 `/api/figures` |
| render | 用户 CSV/JSON → `chartSpec` → 页内 Recharts | 对话模型映射列；像素非 AI |
| code | matplotlib / plotly / TikZ / draw.io XML | 对话模型 |
| prompt | 图像工具或重建用提示词 | 对话模型 |
| ai_image | 像素图 | **专用生图 API** `/api/figures/image`（用户自配 Base URL / Key / 模型；不用对话 Key） |

## Figure QC（实现为可勾选）
来自 Supervisor design-rules + nature-figure：
- [ ] 矢量导出（PDF/SVG），正文不嵌糊 PNG  
- [ ] 终稿字号 ≥ 8pt  
- [ ] 色盲安全 + 双通道编码（色+线型/标记）  
- [ ] 色数 ≤ 6；Ours 高亮有节制  
- [ ] 图注自洽；首句说**发现**非仅设置  
- [ ] 轴有名称与单位；尺度诚实  
- [ ] 面板字母 (a)(b)；缩写已定义  
- [ ] 统计：n、误差含义、显著性（若适用）

## Skill
`figure-designer` · `drawio-reconstruction`  
injectable: `../injectable/figures.system.md`  
API：`/api/figures`（mode: design | audit）

## UI
- 图类型切换 + claim 必填  
- **产出方式**：设计 / 数据渲染 / 代码 / 提示词  
- 数据表粘贴 + 从实验模块导入  
- 可勾选 QC；门禁：无 claim=BLOCK，QC 不全=WARN  

## 验收
- [x] 无 claim 不生成“装饰图”建议  
- [x] QC 全过才能标 camera-ready 图（CLEAR）
- [x] 不编造实验结果数字（无 provenance 时 WARN）