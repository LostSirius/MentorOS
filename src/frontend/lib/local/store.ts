import fs from "fs"
import path from "path"
import { LOCAL_TABLES, LocalTable } from "./constants"
import { ensureSeedData } from "./seed"

export type LocalRow = Record<string, any>
export type LocalDatabase = Record<LocalTable, LocalRow[]>

const DATA_DIR = path.join(process.cwd(), "data")
const DB_PATH = path.join(DATA_DIR, "local-db.json")

function emptyDb(): LocalDatabase {
  return Object.fromEntries(LOCAL_TABLES.map(t => [t, []])) as unknown as LocalDatabase
}

export function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true })
  }
  const uploads = path.join(DATA_DIR, "uploads")
  if (!fs.existsSync(uploads)) {
    fs.mkdirSync(uploads, { recursive: true })
  }
}

export function readDb(): LocalDatabase {
  ensureDataDir()
  if (!fs.existsSync(DB_PATH)) {
    const seeded = ensureSeedData(emptyDb())
    writeDb(seeded)
    return seeded
  }
  try {
    const raw = fs.readFileSync(DB_PATH, "utf-8")
    const parsed = JSON.parse(raw) as LocalDatabase
    for (const table of LOCAL_TABLES) {
      if (!Array.isArray(parsed[table])) parsed[table] = []
    }
    return ensureSeedData(parsed)
  } catch {
    const seeded = ensureSeedData(emptyDb())
    writeDb(seeded)
    return seeded
  }
}

export function writeDb(db: LocalDatabase) {
  ensureDataDir()
  fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2), "utf-8")
}

export function getUploadsRoot() {
  ensureDataDir()
  return path.join(DATA_DIR, "uploads")
}
