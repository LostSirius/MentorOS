/**
 * Local figure image persistence via IndexedDB (no Supabase).
 * Archives keep a short `idb:figure-img:{key}` ref in imageUrl;
 * bulky data URLs / blobs live here.
 */

export const FIGURE_IMAGE_IDB_PREFIX = "idb:figure-img:"

const DB_NAME = "mentoros-figure-images-v1"
const LEGACY_DB_NAME = "scholar-canvas-figure-images-v1"
const DB_VERSION = 1
const STORE = "images"

export type FigureImageRecord = {
  key: string
  blob: Blob
  mime: string
  createdAt: string
}

function openNamedDb(name: string): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") {
      reject(new Error("IndexedDB unavailable"))
      return
    }
    const req = indexedDB.open(name, DB_VERSION)
    req.onerror = () => reject(req.error || new Error("IndexedDB open failed"))
    req.onsuccess = () => resolve(req.result)
    req.onupgradeneeded = () => {
      const db = req.result
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: "key" })
      }
    }
  })
}

async function migrateLegacyFigureDb(target: IDBDatabase): Promise<void> {
  let legacy: IDBDatabase | null = null
  try {
    legacy = await openNamedDb(LEGACY_DB_NAME)
  } catch {
    return
  }
  try {
    const rows = await reqToPromise(
      legacy.transaction(STORE, "readonly").objectStore(STORE).getAll()
    )
    if (!rows?.length) return
    const tx = target.transaction(STORE, "readwrite")
    const store = tx.objectStore(STORE)
    for (const row of rows) {
      store.put(row)
    }
    await new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => resolve()
      tx.onerror = () => reject(tx.error || new Error("migrate failed"))
    })
  } catch {
    /* best-effort */
  } finally {
    legacy.close()
  }
}

async function openDb(): Promise<IDBDatabase> {
  const db = await openNamedDb(DB_NAME)
  const count = await reqToPromise(
    db.transaction(STORE, "readonly").objectStore(STORE).count()
  )
  if (count === 0) {
    await migrateLegacyFigureDb(db)
  }
  return db
}

function reqToPromise<T>(req: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error || new Error("IndexedDB request failed"))
  })
}

export function isFigureImageIdbRef(url: string | undefined | null): boolean {
  return Boolean(url && url.startsWith(FIGURE_IMAGE_IDB_PREFIX))
}

export function figureImageIdbKey(
  url: string | undefined | null
): string | null {
  if (!isFigureImageIdbRef(url)) return null
  return url!.slice(FIGURE_IMAGE_IDB_PREFIX.length) || null
}

export function toFigureImageIdbRef(key: string): string {
  return `${FIGURE_IMAGE_IDB_PREFIX}${key}`
}

export function newFigureImageKey(): string {
  return `img_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`
}

export function mimeFromDataUrl(dataUrl: string): string {
  const m = dataUrl.match(/^data:([^;,]+)/)
  return m?.[1] || "image/png"
}

export function dataUrlToBlob(dataUrl: string): Blob {
  const match = dataUrl.match(/^data:([^;,]+)?(;base64)?,(.*)$/s)
  if (!match) throw new Error("Invalid data URL")
  const mime = match[1] || "image/png"
  const isBase64 = Boolean(match[2])
  const data = match[3] || ""
  if (isBase64) {
    const binary = atob(data)
    const bytes = new Uint8Array(binary.length)
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
    return new Blob([bytes], { type: mime })
  }
  return new Blob([decodeURIComponent(data)], { type: mime })
}

export async function putFigureImageBlob(
  blob: Blob,
  mime?: string,
  key?: string
): Promise<string> {
  const id = key || newFigureImageKey()
  const record: FigureImageRecord = {
    key: id,
    blob,
    mime: mime || blob.type || "image/png",
    createdAt: new Date().toISOString()
  }
  const db = await openDb()
  try {
    const tx = db.transaction(STORE, "readwrite")
    await reqToPromise(tx.objectStore(STORE).put(record))
  } finally {
    db.close()
  }
  return id
}

export async function putFigureImageFromDataUrl(
  dataUrl: string,
  mime?: string,
  key?: string
): Promise<string> {
  const blob = dataUrlToBlob(dataUrl)
  return putFigureImageBlob(blob, mime || mimeFromDataUrl(dataUrl), key)
}

export async function getFigureImageRecord(
  key: string
): Promise<FigureImageRecord | null> {
  const db = await openDb()
  try {
    const tx = db.transaction(STORE, "readonly")
    const row = await reqToPromise(
      tx.objectStore(STORE).get(key) as IDBRequest<FigureImageRecord | undefined>
    )
    return row || null
  } finally {
    db.close()
  }
}

/** Resolve an idb: ref (or raw key) to a temporary object URL. Caller should revoke. */
export async function getFigureImageObjectUrl(
  refOrKey: string
): Promise<string | null> {
  const key = figureImageIdbKey(refOrKey) || refOrKey
  if (!key) return null
  const row = await getFigureImageRecord(key)
  if (!row?.blob) return null
  return URL.createObjectURL(row.blob)
}

export async function deleteFigureImage(key: string): Promise<void> {
  const db = await openDb()
  try {
    const tx = db.transaction(STORE, "readwrite")
    await reqToPromise(tx.objectStore(STORE).delete(key))
  } finally {
    db.close()
  }
}

export async function deleteFigureImages(keys: string[]): Promise<void> {
  const unique = [...new Set(keys.filter(Boolean))]
  if (!unique.length) return
  const db = await openDb()
  try {
    const tx = db.transaction(STORE, "readwrite")
    const store = tx.objectStore(STORE)
    await Promise.all(unique.map(k => reqToPromise(store.delete(k))))
  } finally {
    db.close()
  }
}

export function collectFigureImageKeys(
  session: { figures: { imageUrl?: string }[] } | null | undefined
): string[] {
  if (!session?.figures?.length) return []
  const keys: string[] = []
  for (const fig of session.figures) {
    const k = figureImageIdbKey(fig.imageUrl)
    if (k) keys.push(k)
  }
  return keys
}
