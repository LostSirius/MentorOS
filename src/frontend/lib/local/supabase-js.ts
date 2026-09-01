import { createLocalClient } from "@/lib/local/client"

/**
 * Drop-in replacement for `createClient` from `@supabase/supabase-js`.
 * Args are ignored — always returns the local single-user client.
 */
export function createClient<T = any>(..._args: any[]) {
  return createLocalClient()
}
