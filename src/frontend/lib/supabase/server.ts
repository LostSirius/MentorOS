import { createLocalClient } from "@/lib/local/client"

/** Server-side local client (replaces Supabase SSR client) */
export const createClient = (_cookieStore?: any) => createLocalClient()
