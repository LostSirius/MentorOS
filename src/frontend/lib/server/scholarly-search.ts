/**
 * Multi-source scholarly paper search via public academic APIs.
 * Sources: Semantic Scholar, OpenAlex, Crossref, Europe PMC, PubMed, DOAJ, DBLP
 * (+ arXiv via literature-review caller).
 */

import { expandBilingualQueries, type DomainHit } from "@/lib/domain-lexicon"

export type ScholarlySource =
  | "semantic-scholar"
  | "openalex"
  | "crossref"
  | "europe-pmc"
  | "pubmed"
  | "doaj"
  | "dblp"
  | "arxiv"

export type ScholarlyPaper = {
  key: string
  title: string
  authors: string[]
  year: number
  summary: string
  url: string
  published: string
  venue?: string
  citationCount?: number
  source: ScholarlySource
  externalIds?: Record<string, string>
}

function normalizeTitle(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\u4e00-\u9fa5]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
}

const UA = "MentorOS/2.1 (research; mailto:mentoros@local.dev)"

export async function fetchSemanticScholar(
  query: string,
  limit = 15
): Promise<ScholarlyPaper[]> {
  const params = new URLSearchParams({
    query,
    limit: String(limit),
    fields:
      "title,abstract,authors,year,url,venue,citationCount,externalIds,publicationDate"
  })
  const headers: Record<string, string> = { "User-Agent": UA }
  if (process.env.SEMANTIC_SCHOLAR_API_KEY) {
    headers["x-api-key"] = process.env.SEMANTIC_SCHOLAR_API_KEY
  }

  const res = await fetch(
    `https://api.semanticscholar.org/graph/v1/paper/search?${params}`,
    { headers, next: { revalidate: 3600 } }
  )
  if (!res.ok) return []
  const data = await res.json()
  const items = Array.isArray(data?.data) ? data.data : []

  return items
    .map((item: any): ScholarlyPaper | null => {
      const title = String(item.title || "").trim()
      if (!title) return null
      const authors = (item.authors || []).map((a: any) => a.name).filter(Boolean)
      const year = Number(item.year) || new Date().getFullYear()
      const arxiv = item.externalIds?.ArXiv
      const url =
        item.url ||
        (arxiv ? `https://arxiv.org/abs/${arxiv}` : "") ||
        (item.externalIds?.DOI
          ? `https://doi.org/${item.externalIds.DOI}`
          : "")
      if (!url) return null
      return {
        key: `s2:${item.paperId || url}`,
        title,
        authors,
        year,
        summary: String(item.abstract || "").trim(),
        url,
        published: item.publicationDate || `${year}-01-01`,
        venue: item.venue || "",
        citationCount: item.citationCount,
        source: "semantic-scholar",
        externalIds: item.externalIds || {}
      }
    })
    .filter(Boolean) as ScholarlyPaper[]
}

export async function fetchOpenAlex(
  query: string,
  limit = 15
): Promise<ScholarlyPaper[]> {
  const params = new URLSearchParams({
    search: query,
    per_page: String(limit),
    sort: "relevance_score:desc",
    mailto: "mentoros@local.dev"
  })
  const res = await fetch(`https://api.openalex.org/works?${params}`, {
    headers: { "User-Agent": UA },
    next: { revalidate: 3600 }
  })
  if (!res.ok) return []
  const data = await res.json()
  const items = Array.isArray(data?.results) ? data.results : []

  return items
    .map((item: any): ScholarlyPaper | null => {
      const title = String(item.display_name || item.title || "").trim()
      if (!title) return null
      const authors = (item.authorships || [])
        .map((a: any) => a?.author?.display_name)
        .filter(Boolean)
      const year =
        Number(item.publication_year) ||
        Number(String(item.publication_date || "").slice(0, 4)) ||
        new Date().getFullYear()
      const doi = item.doi?.replace(/^https?:\/\/doi\.org\//, "")
      const landing =
        item.primary_location?.landing_page_url ||
        (doi ? `https://doi.org/${doi}` : "") ||
        item.id
      if (!landing) return null
      const abstract =
        item.abstract_inverted_index
          ? reconstructOpenAlexAbstract(item.abstract_inverted_index)
          : ""
      return {
        key: `oa:${item.id || landing}`,
        title,
        authors,
        year,
        summary: abstract,
        url: landing,
        published: item.publication_date || `${year}-01-01`,
        venue: item.primary_location?.source?.display_name || "",
        citationCount: item.cited_by_count,
        source: "openalex",
        externalIds: { DOI: doi || "", OpenAlex: item.id || "" }
      }
    })
    .filter(Boolean) as ScholarlyPaper[]
}

function reconstructOpenAlexAbstract(
  inverted: Record<string, number[]>
): string {
  const positions: { word: string; pos: number }[] = []
  for (const [word, idxs] of Object.entries(inverted)) {
    for (const pos of idxs) positions.push({ word, pos })
  }
  positions.sort((a, b) => a.pos - b.pos)
  return positions
    .map(p => p.word)
    .join(" ")
    .slice(0, 2000)
}

export async function fetchCrossref(
  query: string,
  limit = 15
): Promise<ScholarlyPaper[]> {
  const params = new URLSearchParams({
    query,
    rows: String(limit),
    mailto: "mentoros@local.dev",
    select: "DOI,title,author,published-print,published-online,container-title,abstract,is-referenced-by-count,URL"
  })
  const res = await fetch(`https://api.crossref.org/works?${params}`, {
    headers: { "User-Agent": UA },
    next: { revalidate: 3600 }
  })
  if (!res.ok) return []
  const data = await res.json()
  const items = Array.isArray(data?.message?.items) ? data.message.items : []

  return items
    .map((item: any): ScholarlyPaper | null => {
      const title = String(
        Array.isArray(item.title) ? item.title[0] : item.title || ""
      ).trim()
      if (!title) return null
      const authors = (item.author || [])
        .map((a: any) => [a.given, a.family].filter(Boolean).join(" "))
        .filter(Boolean)
      const dateParts =
        item["published-print"]?.["date-parts"]?.[0] ||
        item["published-online"]?.["date-parts"]?.[0] ||
        []
      const year = Number(dateParts[0]) || new Date().getFullYear()
      const doi = item.DOI
      const url = item.URL || (doi ? `https://doi.org/${doi}` : "")
      if (!url) return null
      const abstract = String(item.abstract || "")
        .replace(/<[^>]+>/g, " ")
        .replace(/\s+/g, " ")
        .trim()
      return {
        key: `cr:${doi || url}`,
        title,
        authors,
        year,
        summary: abstract,
        url,
        published: dateParts.filter(Boolean).join("-") || `${year}-01-01`,
        venue: Array.isArray(item["container-title"])
          ? item["container-title"][0]
          : "",
        citationCount: item["is-referenced-by-count"],
        source: "crossref",
        externalIds: { DOI: doi || "" }
      }
    })
    .filter(Boolean) as ScholarlyPaper[]
}

export async function fetchEuropePmc(
  query: string,
  limit = 15
): Promise<ScholarlyPaper[]> {
  const params = new URLSearchParams({
    query,
    format: "json",
    pageSize: String(limit),
    resultType: "core"
  })
  const res = await fetch(
    `https://www.ebi.ac.uk/europepmc/webservices/rest/search?${params}`,
    { headers: { "User-Agent": UA }, next: { revalidate: 3600 } }
  )
  if (!res.ok) return []
  const data = await res.json()
  const items = Array.isArray(data?.resultList?.result)
    ? data.resultList.result
    : []

  return items
    .map((item: any): ScholarlyPaper | null => {
      const title = String(item.title || "").trim()
      if (!title) return null
      const authors = String(item.authorString || "")
        .split(",")
        .map((s: string) => s.trim())
        .filter(Boolean)
      const year = Number(item.pubYear) || new Date().getFullYear()
      const pmid = item.pmid
      const doi = item.doi
      const url = doi
        ? `https://doi.org/${doi}`
        : pmid
          ? `https://pubmed.ncbi.nlm.nih.gov/${pmid}/`
          : item.fullTextUrlList?.fullTextUrl?.[0]?.url || ""
      if (!url) return null
      return {
        key: `epmc:${item.id || pmid || doi || url}`,
        title,
        authors,
        year,
        summary: String(item.abstractText || "").trim(),
        url,
        published: item.firstPublicationDate || `${year}-01-01`,
        venue: item.journalTitle || item.bookOrReportDetails?.publisher || "",
        citationCount: Number(item.citedByCount) || undefined,
        source: "europe-pmc",
        externalIds: {
          DOI: doi || "",
          PMID: pmid || "",
          PMCID: item.pmcid || ""
        }
      }
    })
    .filter(Boolean) as ScholarlyPaper[]
}

/** NCBI PubMed via E-utilities (esearch + esummary). */
export async function fetchPubmed(
  query: string,
  limit = 12
): Promise<ScholarlyPaper[]> {
  const searchParams = new URLSearchParams({
    db: "pubmed",
    term: query,
    retmax: String(limit),
    retmode: "json",
    sort: "relevance",
    tool: "MentorOS",
    email: "mentoros@local.dev"
  })
  const searchRes = await fetch(
    `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi?${searchParams}`,
    { headers: { "User-Agent": UA }, next: { revalidate: 3600 } }
  )
  if (!searchRes.ok) return []
  const searchData = await searchRes.json()
  const ids: string[] = Array.isArray(searchData?.esearchresult?.idlist)
    ? searchData.esearchresult.idlist
    : []
  if (!ids.length) return []

  const summaryParams = new URLSearchParams({
    db: "pubmed",
    id: ids.join(","),
    retmode: "json",
    tool: "MentorOS",
    email: "mentoros@local.dev"
  })
  const summaryRes = await fetch(
    `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esummary.fcgi?${summaryParams}`,
    { headers: { "User-Agent": UA }, next: { revalidate: 3600 } }
  )
  if (!summaryRes.ok) return []
  const summaryData = await summaryRes.json()
  const result = summaryData?.result || {}

  return ids
    .map((id): ScholarlyPaper | null => {
      const item = result[id]
      if (!item) return null
      const title = String(item.title || "")
        .replace(/\.$/, "")
        .trim()
      if (!title) return null
      const authors = (item.authors || [])
        .map((a: any) => a.name)
        .filter(Boolean)
      const year =
        Number(String(item.pubdate || item.sortpubdate || "").slice(0, 4)) ||
        new Date().getFullYear()
      const doi = (item.articleids || []).find((a: any) => a.idtype === "doi")?.value
      const url = doi
        ? `https://doi.org/${doi}`
        : `https://pubmed.ncbi.nlm.nih.gov/${id}/`
      return {
        key: `pmid:${id}`,
        title,
        authors,
        year,
        summary: "",
        url,
        published: String(item.pubdate || `${year}-01-01`),
        venue: item.fulljournalname || item.source || "",
        source: "pubmed",
        externalIds: { PMID: id, DOI: doi || "" }
      }
    })
    .filter(Boolean) as ScholarlyPaper[]
}

/** Directory of Open Access Journals article search. */
export async function fetchDoaj(
  query: string,
  limit = 12
): Promise<ScholarlyPaper[]> {
  const encoded = encodeURIComponent(query)
  const res = await fetch(
    `https://doaj.org/api/search/articles/${encoded}?pageSize=${limit}`,
    { headers: { "User-Agent": UA }, next: { revalidate: 3600 } }
  )
  if (!res.ok) return []
  const data = await res.json()
  const items = Array.isArray(data?.results) ? data.results : []

  return items
    .map((row: any): ScholarlyPaper | null => {
      const bib = row?.bibjson || {}
      const title = String(bib.title || "").trim()
      if (!title) return null
      const authors = (bib.author || [])
        .map((a: any) => a.name)
        .filter(Boolean)
      const year = Number(bib.year) || new Date().getFullYear()
      const doi =
        (bib.identifier || []).find((i: any) => i.type === "doi")?.id || ""
      const link =
        (bib.link || []).find((l: any) => l.type === "fulltext")?.url ||
        (bib.link || [])[0]?.url ||
        ""
      const url = doi ? `https://doi.org/${doi}` : link
      if (!url) return null
      const abstract = String(bib.abstract || "")
        .replace(/<[^>]+>/g, " ")
        .replace(/\s+/g, " ")
        .trim()
      return {
        key: `doaj:${row.id || doi || url}`,
        title,
        authors,
        year,
        summary: abstract,
        url,
        published: `${year}-01-01`,
        venue: bib.journal?.title || "",
        source: "doaj",
        externalIds: { DOI: doi, DOAJ: String(row.id || "") }
      }
    })
    .filter(Boolean) as ScholarlyPaper[]
}

export async function fetchDblp(
  query: string,
  limit = 15
): Promise<ScholarlyPaper[]> {
  const params = new URLSearchParams({
    q: query,
    format: "json",
    h: String(limit)
  })
  const res = await fetch(`https://dblp.org/search/publ/api?${params}`, {
    headers: { "User-Agent": UA },
    next: { revalidate: 3600 }
  })
  if (!res.ok) return []
  const data = await res.json()
  const hits = Array.isArray(data?.result?.hits?.hit)
    ? data.result.hits.hit
    : []

  return hits
    .map((hit: any): ScholarlyPaper | null => {
      const info = hit?.info || {}
      const title = String(info.title || "").trim()
      if (!title) return null
      const authorsRaw = info.authors?.author
      const authors = Array.isArray(authorsRaw)
        ? authorsRaw.map((a: any) => (typeof a === "string" ? a : a.text)).filter(Boolean)
        : authorsRaw
          ? [typeof authorsRaw === "string" ? authorsRaw : authorsRaw.text]
          : []
      const year = Number(info.year) || new Date().getFullYear()
      const url = info.ee || info.url || ""
      if (!url) return null
      return {
        key: `dblp:${hit["@id"] || url}`,
        title,
        authors,
        year,
        summary: "",
        url,
        published: `${year}-01-01`,
        venue: info.venue || info.journal || "",
        source: "dblp",
        externalIds: { DBLP: String(hit["@id"] || "") }
      }
    })
    .filter(Boolean) as ScholarlyPaper[]
}

export function mergeScholarlyPapers(
  groups: ScholarlyPaper[][],
  limit: number
): ScholarlyPaper[] {
  const byTitle = new Map<string, ScholarlyPaper & { sources?: string[] }>()

  for (const group of groups) {
    for (const paper of group) {
      const key = normalizeTitle(paper.title)
      if (!key) continue
      const existing = byTitle.get(key)
      if (!existing) {
        byTitle.set(key, {
          ...paper,
          sources: [paper.source]
        } as any)
        continue
      }
      const sources = Array.from(
        new Set([...(existing as any).sources || [existing.source], paper.source])
      )
      const preferNew =
        (paper.summary?.length || 0) > (existing.summary?.length || 0) ||
        (paper.citationCount || 0) > (existing.citationCount || 0)
      const merged = preferNew
        ? { ...existing, ...paper, url: paper.url || existing.url }
        : {
            ...paper,
            ...existing,
            summary: existing.summary || paper.summary,
            citationCount: Math.max(
              existing.citationCount || 0,
              paper.citationCount || 0
            )
          }
      byTitle.set(key, { ...merged, sources } as any)
    }
  }

  return Array.from(byTitle.values())
    .sort((a, b) => {
      const c = (b.citationCount || 0) - (a.citationCount || 0)
      if (c !== 0) return c
      return b.year - a.year
    })
    .slice(0, limit)
}

export async function searchMultiSource(
  topic: string,
  limit = 60
): Promise<{
  papers: ScholarlyPaper[]
  sourcesUsed: string[]
  domains: DomainHit[]
  queryPlan: {
    phrases: string[]
    primaryEn: string
    backgroundZh: string
    backgroundEn: string
  }
}> {
  const { phrases, domains, primaryEn, backgroundZh, backgroundEn } =
    expandBilingualQueries(topic)
  const secondary = phrases.find(
    p => p !== primaryEn && !/[\u4e00-\u9fa5]/.test(p)
  )
  const tertiary = phrases.find(
    p =>
      p !== primaryEn &&
      p !== secondary &&
      !/[\u4e00-\u9fa5]/.test(p)
  )
  const bioHeavy = domains.some(d => d.id === "bio")
  const perSource = Math.min(Math.max(Math.ceil(limit / 3), 12), 25)

  const tasks: { label: string; promise: Promise<ScholarlyPaper[]> }[] = [
    { label: "Semantic Scholar", promise: fetchSemanticScholar(primaryEn, perSource) },
    { label: "OpenAlex", promise: fetchOpenAlex(primaryEn, perSource) },
    { label: "Crossref", promise: fetchCrossref(primaryEn, perSource) },
    {
      label: "Europe PMC",
      promise: fetchEuropePmc(primaryEn, bioHeavy ? perSource : Math.max(8, Math.floor(perSource * 0.7)))
    },
    {
      label: "PubMed",
      promise: fetchPubmed(primaryEn, bioHeavy ? perSource : Math.max(6, Math.floor(perSource * 0.5)))
    },
    { label: "DOAJ", promise: fetchDoaj(primaryEn, Math.max(8, Math.floor(perSource * 0.6))) },
    { label: "DBLP", promise: fetchDblp(primaryEn, perSource) }
  ]
  if (secondary) {
    tasks.push(
      { label: "Semantic Scholar", promise: fetchSemanticScholar(secondary, 12) },
      { label: "OpenAlex", promise: fetchOpenAlex(secondary, 12) },
      { label: "Crossref", promise: fetchCrossref(secondary, 10) },
      { label: "DBLP", promise: fetchDblp(secondary, 10) }
    )
  }
  if (tertiary) {
    tasks.push(
      { label: "Semantic Scholar", promise: fetchSemanticScholar(tertiary, 8) },
      { label: "OpenAlex", promise: fetchOpenAlex(tertiary, 8) }
    )
  }

  const settled = await Promise.allSettled(tasks.map(t => t.promise))
  const sourcesUsed = new Set<string>()
  const groups: ScholarlyPaper[][] = []

  settled.forEach((result, i) => {
    if (result.status === "fulfilled" && result.value.length) {
      groups.push(result.value)
      sourcesUsed.add(tasks[i].label)
    }
  })

  return {
    papers: mergeScholarlyPapers(groups, limit),
    sourcesUsed: Array.from(sourcesUsed),
    domains,
    queryPlan: { phrases, primaryEn, backgroundZh, backgroundEn }
  }
}
