"use client"

import { useEffect } from "react"

export default function Error({
  error,
  reset
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <div className="flex h-screen w-full flex-col items-center justify-center gap-4 bg-background text-foreground">
      <h2 className="text-2xl font-bold">Something went wrong</h2>
      <p className="max-w-md text-center text-muted-foreground">
        {error.message || "An unexpected error occurred."}
      </p>
      {error.digest && (
        <p className="text-xs text-muted-foreground">Digest: {error.digest}</p>
      )}
      <button
        onClick={() => reset()}
        className="rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground hover:bg-primary/90"
      >
        Try again
      </button>
    </div>
  )
}
