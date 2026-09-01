# Module · Paper Overview（论文总览 · 最后实现）

## 目标
聚合各模块产物与门禁，形成 Material Passport + 进度/评分 + 下一步。

## 输入
任意已存在的 LiteraturePacket / IdeaCard / ExperimentRecord / WritingBundle / FigureSet / ReviewReport。

## 展示
1. **流水线状态机**：八段完成度（文献→Idea→实验→撰写→图表→审稿→润色→总览）  
2. **护照**：产物列表（类型、时间、门禁状态）  
3. **分项分**：Idea 五维、审稿 Overall、文献 Coverage…  
4. **缺口**：缺 RQ、缺结果、CRITICAL 未修…  
5. **下一步 CTA**：跳到对应模块（撰写 vs 润色分开）  
6. **导入**：从模块一键导入或上传 JSON/PDF/MD

## 编排隐喻
Autoresearch 外环 + AERS Paper-WorkFlow + ARS pipeline checkpoints。

## 输出
`OverviewState`（schemas/handoff.ts；含 `modules.writing` 与 `modules.polish`）

## 验收
- [x] 无模块数据时显示空护照与引导  
- [x] 投稿就绪 = 各 BLOCK 门均为 clear  
- [x] 不重新发明证据，只聚合
