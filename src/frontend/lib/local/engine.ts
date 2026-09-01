import { randomUUID } from "crypto"
import { RELATION_MAP, LocalTable } from "./constants"
import { LocalDatabase, LocalRow, readDb, writeDb } from "./store"

export type QueryFilter = { column: string; value: any; op?: "eq" | "neq" | "gte" }

export type QueryRequest = {
  table: LocalTable
  action: "select" | "insert" | "update" | "delete" | "rpc" | "upsert"
  filters?: QueryFilter[]
  data?: any
  select?: string
  order?: { column: string; ascending: boolean }
  single?: boolean
  maybeSingle?: boolean
  rpcName?: string
  rpcArgs?: Record<string, any>
  onConflict?: string
}

function parseNestedRelations(select?: string): string[] {
  if (!select || select.trim() === "*") return []
  const relations: string[] = []
  const re = /(\w+)\s*\(\s*\*\s*\)/g
  let match: RegExpExecArray | null
  while ((match = re.exec(select))) {
    relations.push(match[1])
  }
  return relations
}

function applyFilters(rows: LocalRow[], filters: QueryFilter[] = []) {
  return rows.filter(row =>
    filters.every(f => {
      const v = row[f.column]
      if (f.op === "neq") return v !== f.value
      if (f.op === "gte") return v >= f.value
      return v === f.value
    })
  )
}

function attachRelations(
  db: LocalDatabase,
  table: LocalTable,
  rows: LocalRow[],
  relations: string[]
) {
  if (!relations.length) return rows
  const tableMap = RELATION_MAP[table] || {}

  return rows.map(row => {
    const enriched = { ...row }
    for (const rel of relations) {
      const cfg = tableMap[rel]
      if (!cfg) {
        enriched[rel] = []
        continue
      }
      const junctions = db[cfg.junction].filter(j => j[cfg.localKey] === row.id)
      const foreignIds = new Set(junctions.map(j => j[cfg.foreignKey]))
      enriched[rel] = db[cfg.foreignTable].filter(r => foreignIds.has(r.id))
    }
    return enriched
  })
}

function runRpc(db: LocalDatabase, name: string, args: Record<string, any>) {
  if (name === "delete_messages_including_and_after") {
    const { p_user_id, p_chat_id, p_sequence_number } = args
    db.messages = db.messages.filter(
      m =>
        !(
          m.user_id === p_user_id &&
          m.chat_id === p_chat_id &&
          m.sequence_number >= p_sequence_number
        )
    )
    writeDb(db)
    return { data: null, error: null }
  }
  return { data: null, error: { message: `Unknown RPC: ${name}` } }
}

export function executeQuery(req: QueryRequest): { data: any; error: any } {
  const db = readDb()

  if (req.action === "rpc") {
    return runRpc(db, req.rpcName || "", req.rpcArgs || {})
  }

  const table = req.table
  if (!db[table]) {
    return { data: null, error: { message: `Unknown table: ${table}` } }
  }

  try {
    if (req.action === "select") {
      let rows = applyFilters(db[table], req.filters)
      if (req.order) {
        const { column, ascending } = req.order
        rows = [...rows].sort((a, b) => {
          const av = a[column]
          const bv = b[column]
          if (av === bv) return 0
          if (av == null) return 1
          if (bv == null) return -1
          return ascending ? (av > bv ? 1 : -1) : av < bv ? 1 : -1
        })
      }
      const relations = parseNestedRelations(req.select)
      rows = attachRelations(db, table, rows, relations)

      if (req.single || req.maybeSingle) {
        if (!rows.length) {
          if (req.maybeSingle) return { data: null, error: null }
          return { data: null, error: { message: "Row not found" } }
        }
        return { data: rows[0], error: null }
      }
      return { data: rows, error: null }
    }

    if (req.action === "insert") {
      const items = Array.isArray(req.data) ? req.data : [req.data]
      const created = items.map(item => {
        const row = {
          ...item,
          id: item.id || randomUUID(),
          created_at: item.created_at || new Date().toISOString(),
          updated_at: item.updated_at ?? null
        }
        // Composite PK tables may not have id
        if (
          [
            "chat_files",
            "message_file_items",
            "collection_files",
            "assistant_files",
            "assistant_tools",
            "assistant_collections",
            "file_workspaces",
            "assistant_workspaces",
            "collection_workspaces",
            "prompt_workspaces",
            "preset_workspaces",
            "tool_workspaces",
            "model_workspaces"
          ].includes(table) &&
          !item.id
        ) {
          delete row.id
        }
        db[table].push(row)
        return row
      })
      writeDb(db)
      if (req.single) return { data: created[0], error: null }
      return { data: created, error: null }
    }

    if (req.action === "update") {
      const filters = req.filters || []
      let updated: LocalRow | null = null
      db[table] = db[table].map(row => {
        const match = filters.every(f => row[f.column] === f.value)
        if (!match) return row
        updated = {
          ...row,
          ...req.data,
          updated_at: new Date().toISOString()
        }
        return updated as LocalRow
      })
      writeDb(db)
      if (!updated) return { data: null, error: { message: "Row not found" } }
      return { data: updated, error: null }
    }

    if (req.action === "delete") {
      const filters = req.filters || []
      db[table] = db[table].filter(
        row => !filters.every(f => row[f.column] === f.value)
      )
      writeDb(db)
      return { data: null, error: null }
    }

    if (req.action === "upsert") {
      const items = Array.isArray(req.data) ? req.data : [req.data]
      const conflictKeys = (req.onConflict || "id")
        .split(",")
        .map(s => s.trim())
        .filter(Boolean)
      const results: LocalRow[] = []

      for (const item of items) {
        const idx = db[table].findIndex(row =>
          conflictKeys.every(k => row[k] === item[k])
        )
        if (idx >= 0) {
          const updated = {
            ...db[table][idx],
            ...item,
            updated_at: new Date().toISOString()
          }
          db[table][idx] = updated
          results.push(updated)
        } else {
          const row = {
            ...item,
            id: item.id || randomUUID(),
            created_at: item.created_at || new Date().toISOString(),
            updated_at: item.updated_at ?? null
          }
          if (
            [
              "chat_files",
              "message_file_items",
              "collection_files",
              "assistant_files",
              "assistant_tools",
              "assistant_collections",
              "file_workspaces",
              "assistant_workspaces",
              "collection_workspaces",
              "prompt_workspaces",
              "preset_workspaces",
              "tool_workspaces",
              "model_workspaces"
            ].includes(table) &&
            !item.id
          ) {
            delete row.id
          }
          db[table].push(row)
          results.push(row)
        }
      }
      writeDb(db)
      if (req.single) return { data: results[0], error: null }
      return { data: results, error: null }
    }

    return { data: null, error: { message: `Unknown action: ${req.action}` } }
  } catch (e: any) {
    return { data: null, error: { message: e.message || "Query failed" } }
  }
}
