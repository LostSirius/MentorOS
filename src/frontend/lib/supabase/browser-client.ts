"use client"

import { getLocalSession, getLocalUser } from "@/lib/local/auth"
import { LOCAL_USER_EMAIL, LOCAL_USER_ID, LocalTable } from "@/lib/local/constants"

type Filter = { column: string; value: any; op?: "eq" | "neq" | "gte" }

async function callLocalDb(body: any) {
  const res = await fetch("/api/local-db", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  })
  if (!res.ok) {
    const text = await res.text()
    return { data: null, error: { message: text || "local-db request failed" } }
  }
  return res.json()
}

function createBrowserBuilder(base: {
  table: string
  action: "select" | "insert" | "update" | "delete"
  data?: any
  select?: string
}) {
  const state = {
    table: base.table,
    action: base.action,
    data: base.data,
    select: base.select ?? "*",
    filters: [] as Filter[],
    order: undefined as { column: string; ascending: boolean } | undefined,
    single: false,
    maybeSingle: false
  }

  const run = () => callLocalDb(state)

  const api: any = {
    eq(column: string, value: any) {
      state.filters.push({ column, value, op: "eq" })
      return api
    },
    neq(column: string, value: any) {
      state.filters.push({ column, value, op: "neq" })
      return api
    },
    gte(column: string, value: any) {
      state.filters.push({ column, value, op: "gte" })
      return api
    },
    order(column: string, opts?: { ascending?: boolean }) {
      state.order = { column, ascending: opts?.ascending !== false }
      return api
    },
    select(columns?: string) {
      state.select = columns || "*"
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

function createBrowserStorage(bucket: string) {
  return {
    async upload(filePath: string, file: File | Blob, _opts?: any) {
      const form = new FormData()
      form.append("bucket", bucket)
      form.append("path", filePath)
      form.append("file", file)
      const res = await fetch("/api/local-storage", { method: "POST", body: form })
      if (!res.ok) {
        return { data: null, error: { message: await res.text() } }
      }
      return { data: { path: filePath }, error: null }
    },
    async remove(paths: string[]) {
      const res = await fetch("/api/local-storage", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bucket, paths })
      })
      if (!res.ok) {
        return { data: null, error: { message: await res.text() } }
      }
      return { data: paths, error: null }
    },
    getPublicUrl(filePath: string) {
      const url = `/api/local-storage?bucket=${encodeURIComponent(bucket)}&path=${encodeURIComponent(filePath)}`
      return { data: { publicUrl: url } }
    },
    async createSignedUrl(filePath: string, _expiresIn?: number) {
      const url = `/api/local-storage?bucket=${encodeURIComponent(bucket)}&path=${encodeURIComponent(filePath)}`
      return { data: { signedUrl: url }, error: null }
    },
    async download(filePath: string) {
      const url = `/api/local-storage?bucket=${encodeURIComponent(bucket)}&path=${encodeURIComponent(filePath)}`
      const res = await fetch(url)
      if (!res.ok) {
        return { data: null, error: { message: "File not found" } }
      }
      const blob = await res.blob()
      return { data: blob, error: null }
    }
  }
}

/** Drop-in browser client replacing Supabase */
export const supabase = {
  from(table: string) {
    return {
      select(columns?: string) {
        return createBrowserBuilder({
          table,
          action: "select",
          select: columns || "*"
        })
      },
      insert(data: any) {
        return createBrowserBuilder({ table, action: "insert", data })
      },
      update(data: any) {
        return createBrowserBuilder({ table, action: "update", data })
      },
      delete() {
        return createBrowserBuilder({ table, action: "delete" })
      },
      upsert(data: any, opts?: { onConflict?: string }) {
        const api: any = {
          select(_columns?: string) {
            return api
          },
          then(onFulfilled: any, onRejected: any) {
            return callLocalDb({
              table,
              action: "upsert",
              data,
              onConflict: opts?.onConflict,
              select: "*"
            }).then(onFulfilled, onRejected)
          }
        }
        return api
      }
    }
  },
  rpc(fn: string, args?: Record<string, any>) {
    return callLocalDb({
      table: "messages" as LocalTable,
      action: "rpc",
      rpcName: fn,
      rpcArgs: args
    })
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
    async signInWithPassword() {
      return {
        data: { session: getLocalSession(), user: getLocalUser() },
        error: null
      }
    },
    async signUp() {
      return {
        data: { session: getLocalSession(), user: getLocalUser() },
        error: null
      }
    },
    async resetPasswordForEmail() {
      return { data: {}, error: null }
    },
    async updateUser(_attrs?: any) {
      return { data: { user: getLocalUser() }, error: null }
    },
    async exchangeCodeForSession() {
      return { data: { session: getLocalSession() }, error: null }
    }
  },
  storage: {
    from(bucket: string) {
      return createBrowserStorage(bucket)
    }
  }
}

export const LOCAL_IDS = {
  userId: LOCAL_USER_ID,
  email: LOCAL_USER_EMAIL
}
