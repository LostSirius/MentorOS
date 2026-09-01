import { createLocalClient } from "@/lib/local/client"

/** Server helper previously backed by Supabase browser SSR client */
export const createClient = () => createLocalClient()
