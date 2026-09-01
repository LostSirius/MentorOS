# Module · Literature Research（文献调研）

## 目标
产出可溯源的调研包：RQ、多源论文、脉络/综述、空白，并交给 Idea/写作。

## 输入
- `topic`（必填）、`locale`、`notes`、上传材料  
- 可选：上一轮 `researchQuestions`

## 标准流程（必须按序）

### Step 0 · 冻结 Brief
- 将 topic 转为 **2–3 条可回答 RQ**（用户可编辑后锁定）。  
- 记录 angle + intended reader。  
- 未锁定 RQ 也可检索，但综述结论须提示“RQ 未冻结”。

### Step 1 · 多视角检索计划
视角（至少尝试覆盖）：主流 · 批评/反例 · 相邻领域 · 方法论质疑 · 应用/部署。  
中英查询扩展 + 领域背景芯片（已有能力保留）。

### Step 2 · 多源检索与合并
权威源：arXiv, Semantic Scholar, OpenAlex, Crossref, Europe PMC, PubMed, DOAJ, DBLP。  
去重（题名归一）· 相关度+引用排序 · 保留 `sources[]`。

### Step 3 · 引用核验
每条入选论文必须有 URL；优先 DOI。元数据冲突标记 WARN。

### Step 4 · 综合
- MECE 主题 / 脉络线程  
- 句内交叉对比  
- 空白与未来方向  
- **结论逐条回答 RQ**

### Step 5 · 门禁
跑 `integrity-gates.md` 的 G3+G1。

## 输出契约
见 `../schemas/handoff.ts` → `LiteraturePacket`

## UI 必备
1. RQ 编辑/锁定  
2. 领域背景 + CN→EN  
3. 多源徽章  
4. 视图：脉络 / 综述 / 卡片 / 时间线  
5. 门禁结果条（Coverage/Citation…）  
6. 导出 Markdown/JSON  
7. locale 全文案

## 静默 Skill
- `deep-research`（主）  
- `literature-review`  
- injectable: `../injectable/literature.system.md`

## 验收标准
- [ ] 无检索结果时 404/明确错误，不编造综述  
- [ ] 每条论文 claim 带 `[P#]`  
- [ ] L2 证据不写具体未出现数字  
- [ ] en/zh 叙述跟随 locale  
- [ ] 可导出 `LiteraturePacket` JSON
