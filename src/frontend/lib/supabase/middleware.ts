import { NextResponse, type NextRequest } from "next/server"
import { createLocalClient } from "@/lib/local/client"

/** Local-mode middleware helper (no cookies / auth refresh) */
export const createClient = (request: NextRequest) => {
  const response = NextResponse.next({
    request: {
      headers: request.headers
    }
  })
  return { supabase: createLocalClient(), response }
}
