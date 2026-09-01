"use client"

import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useEffect, useState } from "react"

export function ApiKeyLoginInput() {
  const [apiKey, setApiKey] = useState("")

  useEffect(() => {
    const stored = localStorage.getItem("supervisor-skills-api-key")
    if (stored) setApiKey(stored)
  }, [])

  useEffect(() => {
    localStorage.setItem("supervisor-skills-api-key", apiKey)
  }, [apiKey])

  return (
    <>
      <Label className="text-md mt-4" htmlFor="apiKey">
        Anthropic API Key
      </Label>
      <Input
        className="mb-3 rounded-md border bg-inherit px-4 py-2"
        name="apiKey"
        type="password"
        placeholder="sk-ant-... (optional - uses system default if empty)"
        value={apiKey}
        onChange={e => setApiKey(e.target.value)}
      />
      <p className="text-muted-foreground mb-2 text-xs">
        Leave empty to use the system default API key.
      </p>
    </>
  )
}
