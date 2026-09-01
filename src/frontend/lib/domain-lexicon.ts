/**
 * Chinese ↔ English scholarly domain lexicon for query expansion
 * and UI domain-background chips. Shared by client UI and server search.
 */

export type DomainHit = {
  id: string
  labelZh: string
  labelEn: string
  queries: string[]
}

const DOMAINS: {
  id: string
  labelZh: string
  labelEn: string
  patterns: RegExp[]
  queries: string[]
}[] = [
  {
    id: "llm",
    labelZh: "大语言模型",
    labelEn: "Large Language Models",
    patterns: [/大语言模型|大模型|语言模型|\bllm\b|\blanguage model/i],
    queries: ["large language model", "LLM", "foundation model"]
  },
  {
    id: "rag",
    labelZh: "检索增强生成",
    labelEn: "Retrieval-Augmented Generation",
    patterns: [/检索增强|增强检索|知识增强|\brag\b|retrieval.?augmented/i],
    queries: [
      "retrieval augmented generation",
      "RAG",
      "grounded generation",
      "knowledge-intensive NLP"
    ]
  },
  {
    id: "multimodal",
    labelZh: "多模态 / 视觉语言",
    labelEn: "Multimodal / Vision-Language",
    patterns: [/多模态|跨模态|图文|视觉语言|vision.?language|multimodal/i],
    queries: [
      "multimodal large language model",
      "vision language model",
      "vision-language",
      "cross-modal retrieval"
    ]
  },
  {
    id: "agent",
    labelZh: "智能体 / Agent",
    labelEn: "LLM Agents",
    patterns: [/智能体|代理系统|\bagents?\b|agentic/i],
    queries: ["LLM agent", "agentic workflow", "tool-using language model"]
  },
  {
    id: "kg",
    labelZh: "知识图谱",
    labelEn: "Knowledge Graphs",
    patterns: [/知识图谱|\bkg\b|knowledge graph/i],
    queries: ["knowledge graph", "knowledge base", "graph neural network"]
  },
  {
    id: "recommend",
    labelZh: "推荐系统",
    labelEn: "Recommender Systems",
    patterns: [/推荐系统|个性化推荐|recommender|recommendation system/i],
    queries: ["recommender system", "recommendation", "collaborative filtering"]
  },
  {
    id: "diffusion",
    labelZh: "扩散模型 / 生成式视觉",
    labelEn: "Diffusion / Generative Vision",
    patterns: [/扩散模型|文生图|diffusion|text.to.image/i],
    queries: ["diffusion model", "text-to-image generation", "latent diffusion"]
  },
  {
    id: "hci",
    labelZh: "人机交互",
    labelEn: "Human-Computer Interaction",
    patterns: [/人机交互|\bhci\b|human.computer interaction|交互设计/i],
    queries: ["human-computer interaction", "HCI", "interactive system"]
  },
  {
    id: "cv",
    labelZh: "计算机视觉",
    labelEn: "Computer Vision",
    patterns: [/计算机视觉|目标检测|图像分割|\bcv\b|computer vision|object detection/i],
    queries: ["computer vision", "object detection", "image segmentation"]
  },
  {
    id: "nlp",
    labelZh: "自然语言处理",
    labelEn: "Natural Language Processing",
    patterns: [/自然语言处理|\bnlp\b|文本挖掘|信息抽取/i],
    queries: ["natural language processing", "NLP", "information extraction"]
  },
  {
    id: "rl",
    labelZh: "强化学习",
    labelEn: "Reinforcement Learning",
    patterns: [/强化学习|\brl\b|reinforcement learning|奖励模型|rlhf/i],
    queries: ["reinforcement learning", "RLHF", "reward model"]
  },
  {
    id: "bio",
    labelZh: "生物医学 / 生命科学",
    labelEn: "Biomedical / Life Sciences",
    patterns: [
      /生物医药|生物医学|生命科学|医学|临床|蛋白|基因|drug|clinical|biomedical|genomics|pubmed/i
    ],
    queries: ["biomedical", "clinical study", "computational biology"]
  },
  {
    id: "edu",
    labelZh: "教育技术 / 学习科学",
    labelEn: "Learning Sciences / EdTech",
    patterns: [/教育技术|智能教育|学习分析|education technology|learning science/i],
    queries: ["educational technology", "learning analytics", "intelligent tutoring"]
  },
  {
    id: "security",
    labelZh: "安全 / 隐私",
    labelEn: "Security & Privacy",
    patterns: [/网络安全|隐私|对抗攻击|cybersecurity|privacy|adversarial/i],
    queries: ["cybersecurity", "privacy-preserving", "adversarial attack"]
  },
  {
    id: "systems",
    labelZh: "系统 / 数据库",
    labelEn: "Systems & Databases",
    patterns: [/分布式系统|数据库|操作系统|distributed system|database/i],
    queries: ["distributed systems", "database system", "operating system"]
  },
  {
    id: "graph",
    labelZh: "图学习 / GNN",
    labelEn: "Graph Learning / GNN",
    patterns: [/图神经网络|图学习|\bgnn\b|graph neural|graph learning/i],
    queries: ["graph neural network", "GNN", "graph representation learning"]
  },
  {
    id: "speech",
    labelZh: "语音 / 音频",
    labelEn: "Speech / Audio",
    patterns: [/语音识别|语音合成|语音|speech|asr|tts|audio language/i],
    queries: ["speech recognition", "speech synthesis", "audio language model"]
  },
  {
    id: "robotics",
    labelZh: "机器人 / 具身智能",
    labelEn: "Robotics / Embodied AI",
    patterns: [/机器人|具身|embodied|robotics|manipulation/i],
    queries: ["embodied AI", "robot learning", "vision-language-action"]
  },
  {
    id: "eval",
    labelZh: "评测 / 基准",
    labelEn: "Evaluation / Benchmarks",
    patterns: [/评测|基准测试|benchmark|evaluation|leaderboard/i],
    queries: ["LLM evaluation", "benchmark", "dataset benchmark"]
  },
  {
    id: "alignment",
    labelZh: "对齐 / 安全对齐",
    labelEn: "Alignment / Safety",
    patterns: [/对齐|价值对齐|alignment|jailbreak|safety alignment/i],
    queries: ["AI alignment", "LLM safety", "preference optimization"]
  },
  {
    id: "ir",
    labelZh: "信息检索",
    labelEn: "Information Retrieval",
    patterns: [/信息检索|稠密检索|向量检索|dense retrieval|information retrieval/i],
    queries: ["information retrieval", "dense retrieval", "neural ranking"]
  },
  {
    id: "causal",
    labelZh: "因果推断",
    labelEn: "Causal Inference",
    patterns: [/因果推断|因果发现|causal inference|causality/i],
    queries: ["causal inference", "causal discovery", "treatment effect"]
  },
  {
    id: "time-series",
    labelZh: "时序 / 预测",
    labelEn: "Time Series / Forecasting",
    patterns: [/时序|时间序列|预测模型|time.?series|forecasting/i],
    queries: ["time series forecasting", "temporal modeling", "sequential prediction"]
  },
  {
    id: "federated",
    labelZh: "联邦学习",
    labelEn: "Federated Learning",
    patterns: [/联邦学习|federated learning/i],
    queries: ["federated learning", "distributed learning", "privacy-preserving ML"]
  }
]

/** Common Chinese research phrases → English scholarly equivalents */
const PHRASE_MAP: { pattern: RegExp; en: string }[] = [
  { pattern: /综述|调研|相关工作/, en: "survey review" },
  { pattern: /最新进展|前沿/, en: "recent advances" },
  { pattern: /开源|代码实现/, en: "open source implementation" },
  { pattern: /数据集|基准/, en: "dataset benchmark" },
  { pattern: /微调|指令微调/, en: "instruction fine-tuning" },
  { pattern: /提示工程|提示词/, en: "prompt engineering" },
  { pattern: /幻觉|事实性/, en: "hallucination factuality" },
  { pattern: /长上下文|长文本/, en: "long context" },
  { pattern: /推理|思维链|chain.of.thought/, en: "chain of thought reasoning" },
  { pattern: /多跳|复杂问答/, en: "multi-hop question answering" },
  { pattern: /代码生成|程序合成/, en: "code generation" },
  { pattern: /数学推理/, en: "mathematical reasoning" },
  { pattern: /可解释|可解释性/, en: "explainability interpretability" },
  { pattern: /少样本|零样本/, en: "few-shot zero-shot learning" },
  { pattern: /知识蒸馏/, en: "knowledge distillation" },
  { pattern: /参数高效|lora|adapter/, en: "parameter-efficient fine-tuning LoRA" }
]

export function detectDomains(topic: string): DomainHit[] {
  const text = topic.trim()
  const hits: DomainHit[] = []
  for (const d of DOMAINS) {
    if (d.patterns.some(p => p.test(text))) {
      hits.push({
        id: d.id,
        labelZh: d.labelZh,
        labelEn: d.labelEn,
        queries: d.queries
      })
    }
  }
  return hits
}

function extractPhraseHints(topic: string): string[] {
  const hints: string[] = []
  for (const row of PHRASE_MAP) {
    if (row.pattern.test(topic)) hints.push(row.en)
  }
  return hints
}

/** Expand a user topic into bilingual scholarly search phrases. */
export function expandBilingualQueries(topic: string): {
  phrases: string[]
  domains: DomainHit[]
  primaryEn: string
  backgroundZh: string
  backgroundEn: string
} {
  const trimmed = topic.trim()
  const phrases = new Set<string>()
  if (trimmed) phrases.add(trimmed)

  const domains = detectDomains(trimmed)
  for (const d of domains) {
    d.queries.forEach(q => phrases.add(q))
  }

  const phraseHints = extractPhraseHints(trimmed)
  phraseHints.forEach(h => phrases.add(h))

  // Strip common Chinese wrappers and keep leftover tokens as weak hints
  const zhStripped = trimmed
    .replace(
      /(请帮我|帮我|调研|综述|文献|相关工作|最新进展|研究进展|领域|方向|关于|的|与|和|及)/g,
      " "
    )
    .replace(/\s+/g, " ")
    .trim()
  if (zhStripped && zhStripped !== trimmed) phrases.add(zhStripped)

  const hasZh = /[\u4e00-\u9fa5]/.test(trimmed)
  if (hasZh && domains.length === 0) {
    phrases.add("machine learning")
    phrases.add("artificial intelligence")
  }

  // Compose a focused primary English query from top domains + phrase hints
  const domainCore = domains
    .slice(0, 2)
    .map(d => d.queries[0])
    .filter(Boolean)
  const composed =
    domainCore.length >= 2
      ? `${domainCore[0]} ${domainCore[1]}`
      : domainCore[0] || ""
  if (composed) phrases.add(composed)
  if (composed && phraseHints[0]) {
    phrases.add(`${composed} ${phraseHints[0]}`)
  }

  const list = Array.from(phrases).filter(Boolean)
  const primaryEn =
    (composed && phraseHints[0] ? `${composed} ${phraseHints[0]}` : composed) ||
    domains[0]?.queries[0] ||
    list.find(p => !/[\u4e00-\u9fa5]/.test(p) && p.length > 2) ||
    list[0] ||
    trimmed

  const capped = [
    primaryEn,
    ...list.filter(p => p !== primaryEn && !/[\u4e00-\u9fa5]/.test(p)).slice(0, 6),
    ...list.filter(p => /[\u4e00-\u9fa5]/.test(p)).slice(0, 2)
  ]

  const backgroundZh =
    domains.length > 0
      ? domains.map(d => d.labelZh).join(" · ")
      : hasZh
        ? "通用人工智能 / 机器学习（未命中细分类）"
        : "General AI / ML (no fine-grained domain hit)"

  const backgroundEn =
    domains.length > 0
      ? domains.map(d => d.labelEn).join(" · ")
      : "Artificial Intelligence / Machine Learning"

  return {
    phrases: Array.from(new Set(capped)),
    domains,
    primaryEn,
    backgroundZh,
    backgroundEn
  }
}
