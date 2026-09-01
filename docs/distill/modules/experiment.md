# Module · Experiment Design & Evaluation（实验）

## 目标
把 IdeaCard 落成可执行/可评测的实验配方，并在有真实结果时做诚实解读。

## 输入
`IdeaCard` + 用户资源约束；可选文献中的数据集/指标线索（L2/L3 仅作候选，需确认）。

## 流程

### Step 1 · 配方起草
字段必填：
- hypotheses[]（可证伪）  
- baselines[]（须含“当前 SOTA 候选”，标来源层级）  
- datasets[]  
- metrics[]（主指标+辅助）  
- ablations[]  
- robustnessChecks[]  
- failureCriteria  
- expectedArtifacts[]（类似 out_dir 产物清单）  
- computePlan（粗算）

### Step 2 · 用户确认配方（人机点）
确认后状态 = `recipe_locked`。

### Step 3 · 执行（产品边界）
- **默认不自动跑训练**；提供清单、脚本骨架、日志模板。  
- 用户上传/粘贴 `runLog` / `resultTable` / 文件 → 进入 `results_attached`。

### Step 4 · 结果解读（仅 results_attached）
- 对照假设：支持 / 拒绝 / 不确定  
- Claim–provenance：ALIGNED / OVERSTATED / …  
- 稳健性是否覆盖  

### Step 5 · 导出 ExperimentRecord

## 硬规则
见 `integrity-gates.md` G5。无结果禁止写“准确率达到…”。

## 吸收来源用法
- AI-Scientist：模板 + out_dir 产物思想  
- AERS：识别/对照/稳健性阶段文化  
- Orchestra：按任务标签路由工程提示（LoRA/评测…）非技能商店  
- nature-statistics / experiment-log：统计报告与日志字段

## UI 必备
- 配方表单 + 检查清单  
- 结果粘贴区  
- 风险条（假基线、不可验证声称）  
- 导出 JSON/Markdown

## Skill
- `benchmark-paper-template`（评测逻辑）  
- injectable: `../injectable/experiment.system.md`

## 验收
- [ ] recipe_locked 前不能标记实验完成  
- [ ] 无结果时 Results 区禁用或仅显示计划  
- [ ] 夸大声称 WARN/BLOCK
