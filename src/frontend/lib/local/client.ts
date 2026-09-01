import fs from "fs"
import path from "path"
import { LocalTable } from "./constants"
import { QueryFilter, QueryRequest, executeQuery } from "./engine"
import { getLocalSession, getLocalUser } from "./auth"
import { getUploadsRoot } from "./store"

type ThenableResult = PromiseLike<{ data: any; error: any }> & {
  eq: (column: string, value: any) => ThenableResult
  neq: (column: string, value: any) => ThenableResult
  gte: (column: string, value: any) => ThenableResult
  order: (column: string, opts?: { ascending?: boolean }) => ThenableResult
  single: () => Promise<{ data: any; error: any }>
  maybeSingle: () => Promise<{ data: any; error: any }>
  select: (columns?: string) => ThenableResult
}

function createBuilder(base: Partial<QueryRequest>): ThenableResult {
  const state: QueryRequest = {
    table: base.table as LocalTable,
    action: base.action || "select",
    filters: [...(base.filters || [])],
    data: base.data,
    select: base.select ?? "*",
    order: base.order,
    single: base.single,
    maybeSingle: base.maybeSingle
  }

  const run = () => Promise.resolve(executeQuery(state))

  const api: any = {
    eq(column: string, value: any) {
      state.filters = state.filters || []
      state.filters.push({ column, value, op: "eq" })
      return api
    },
    neq(column: string, value: any) {
      state.filters = state.filters || []
      state.filters.push({ column, value, op: "neq" })
      return api
    },
    gte(column: string, value: any) {
      state.filters = state.filters || []
      state.filters.push({ column, value, op: "gte" })
      return api
    },
    order(column: string, opts?: { ascending?: boolean }) {
      state.order = { column, ascending: opts?.ascending !== false }
      return api
    },
    select(columns?: string) {
      state.select = columns || "*"
      // After insert/update, select triggers returning
      return api
    },
    single() {
      state.single = true
      return run()
    },
    maybeSingle() {
      state.maybeSingle = true
      return run()
    },
    then(onFulfilled: any, onRejected: any) {
      return run().then(onFulfilled, onRejected)
    }
  }

  return api
}

function createStorageBucket(bucket: string) {
  const root = path.join(getUploadsRoot(), bucket)

  const ensure = () => {
    if (!fs.existsSync(root)) fs.mkdirSync(root, { recursive: true })
  }

  const resolvePath = (filePath: string) => {
    const safe = filePath.replace(/^[/\\]+/, "").replace(/\.\./g, "")
    return path.join(root, safe)
  }

  return {
    async upload(filePath: string, file: File | Blob | Buffer, _opts?: any) {
      try {
        ensure()
        const full = resolvePath(filePath)
        fs.mkdirSync(path.dirname(full), { recursive: true })
        let buffer: Buffer
        if (Buffer.isBuffer(file)) {
          buffer = file
        } else if (typeof (file as any).arrayBuffer === "function") {
          buffer = Buffer.from(await (file as Blob).arrayBuffer())
        } else {
          buffer = Buffer.from(file as any)
        }
        fs.writeFileSync(full, buffer)
        return { data: { path: filePath }, error: null }
      } catch (e: any) {
        return { data: null, error: { message: e.message } }
      }
    },
    async download(filePath: string) {
      try {
        const full = resolvePath(filePath)
        if (!fs.existsSync(full)) {
          return { data: null, error: { message: "File not found" } }
        }
        const buffer = fs.readFileSync(full)
        const blob = new Blob([buffer])
        return { data: blob, error: null }
      } catch (e: any) {
        return { data: null, error: { message: e.message } }
      }
    },
    async remove(paths: string[]) {
      try {
        for (const p of paths) {
          const full = resolvePath(p)
          if (fs.existsSync(full)) fs.unlinkSync(full)
        }
        return { data: paths, error: null }
      } catch (e: any) {
        return { data: null, error: { message: e.message } }
      }
    },
    getPublicUrl(filePath: string) {
      const url = `/api/local-storage?bucket=${encodeURIComponent(bucket)}&path=${encodeURIComponent(filePath)}`
      return { data: { publicUrl: url } }
    },
    async createSignedUrl(filePath: string, _expiresIn?: number) {
      const url = `/api/local-storage?bucket=${encodeURIComponent(bucket)}&path=${encodeURIComponent(filePath)}`
      return { data: { signedUrl: url }, error: null }
    }
  }
}

export function createLocalClient() {
  return {
    from(table: string) {
      return {
        select(columns?: string) {
          return createBuilder({
            table: table as LocalTable,
            action: "select",
            select: columns || "*"
          })
        },
        insert(data: any) {
          return createBuilder({
            table: table as LocalTable,
            action: "insert",
            data
          })
        },
        update(data: any) {
          return createBuilder({
            table: table as LocalTable,
            action: "update",
            data
          })
        },
        delete() {
          return createBuilder({
            table: table as LocalTable,
            action: "delete"
          })
        },
        upsert(data: any, opts?: { onConflict?: string }) {
          const builder = createBuilder({
            table: table as LocalTable,
            action: "upsert",
            data
          }) as any
          // attach onConflict into the next query via a private field on select/then path
          const originalThen = builder.then.bind(builder)
          builder.then = (onFulfilled: any, onRejected: any) => {
            return Promise.resolve(
              executeQuery({
                table: table as LocalTable,
                action: "upsert",
                data,
                onConflict: opts?.onConflict,
                select: "*"
              })
            ).then(onFulfilled, onRejected)
          }
          builder.select = (_columns?: string) => builder
          return builder
        }
      }
    },
    rpc(fn: string, args?: Record<string, any>) {
      return Promise.resolve(
        executeQuery({
          table: "messages",
          action: "rpc",
          rpcName: fn,
          rpcArgs: args
        })
      )
    },
    auth: {
      async getSession() {
        return { data: { session: getLocalSession() }, error: null }
      },
      async getUser() {
        return { data: { user: getLocalUser() }, error: null }
      },
      async signOut() {
        return { error: null }
      },
      async signInWithPassword(_creds: any) {
        return { data: { session: getLocalSession(), user: getLocalUser() }, error: null }
      },
      async signUp(_creds: any) {
        return { data: { session: getLocalSession(), user: getLocalUser() }, error: null }
      },
      async resetPasswordForEmail(_email: string, _opts?: any) {
        return { data: {}, error: null }
      },
      async updateUser(_attrs?: any) {
        return { data: { user: getLocalUser() }, error: null }
      },
      async exchangeCodeForSession(_code: string) {
        return { data: { session: getLocalSession() }, error: null }
      }
    },
    storage: {
      from(bucket: string) {
        return createStorageBucket(bucket)
      }
    }
  }
}

export type LocalClient = ReturnType<typeof createLocalClient>
