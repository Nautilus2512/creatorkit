"use client"

import { useState } from "react"
import { Copy, Check, Clock } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

function getRelative(date: Date): string {
  const diffSec = Math.floor((Date.now() - date.getTime()) / 1000)
  const abs = Math.abs(diffSec)
  const future = diffSec < 0
  const prefix = future ? "in " : ""
  const suffix = future ? "" : " ago"

  if (abs < 10) return "just now"
  if (abs < 60) return `${prefix}${abs}s${suffix}`
  if (abs < 3600) return `${prefix}${Math.floor(abs / 60)}m${suffix}`
  if (abs < 86400) return `${prefix}${Math.floor(abs / 3600)}h${suffix}`
  if (abs < 2592000) return `${prefix}${Math.floor(abs / 86400)}d${suffix}`
  if (abs < 31536000) return `${prefix}${Math.floor(abs / 2592000)}mo${suffix}`
  return `${prefix}${Math.floor(abs / 31536000)}yr${suffix}`
}

function parseInput(value: string): Date | null {
  const s = value.trim()
  if (!s) return null
  if (/^\d+$/.test(s)) {
    const n = parseInt(s)
    return new Date(n > 1e10 ? n : n * 1000)
  }
  const d = new Date(s)
  return isNaN(d.getTime()) ? null : d
}

function buildRows(date: Date) {
  return [
    { label: "Unix timestamp (seconds)", key: "unix", value: String(Math.floor(date.getTime() / 1000)) },
    { label: "Unix timestamp (milliseconds)", key: "unixMs", value: String(date.getTime()) },
    { label: "ISO 8601", key: "iso", value: date.toISOString() },
    { label: "UTC", key: "utc", value: date.toUTCString() },
    { label: "Local date & time", key: "local", value: date.toLocaleString() },
    { label: "Local date", key: "localDate", value: date.toLocaleDateString() },
    { label: "Local time", key: "localTime", value: date.toLocaleTimeString() },
    { label: "Relative", key: "relative", value: getRelative(date) },
  ]
}

export default function TimestampConverter() {
  const [input, setInput] = useState("")
  const [error, setError] = useState("")
  const [copied, setCopied] = useState<string | null>(null)

  const date = input.trim() ? parseInput(input) : null
  const hasError = input.trim() && !date

  const rows = date ? buildRows(date) : []

  const handleChange = (value: string) => {
    setInput(value)
    setError("")
    if (value.trim() && !parseInput(value)) {
      setError("Invalid timestamp or date string")
    }
  }

  const useNow = () => {
    const ts = String(Math.floor(Date.now() / 1000))
    setInput(ts)
    setError("")
  }

  const copy = (value: string, key: string) => {
    navigator.clipboard.writeText(value)
    setCopied(key)
    setTimeout(() => setCopied(null), 2000)
  }

  return (
    <div className="h-screen flex flex-col bg-background">
      {/* Header */}
      <div className="shrink-0 border-b border-border bg-background">
        <div className="flex items-center justify-between px-6 py-4">
          <div>
            <h1 className="text-xl font-semibold">Timestamp Converter</h1>
            <p className="text-sm text-muted-foreground">Convert between Unix timestamps and human-readable date formats</p>
          </div>
          <Button variant="outline" size="sm" onClick={useNow}>
            <Clock className="h-4 w-4 mr-1" />
            Use Current Time
          </Button>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Left Panel — Input */}
        <div className="w-1/2 flex flex-col border-r border-border">
          <div className="p-3 border-b border-border bg-muted/30">
            <h3 className="text-sm font-medium">Input</h3>
          </div>
          <div className="p-6 space-y-4">
            <div className="space-y-1">
              <Input
                value={input}
                onChange={(e) => handleChange(e.target.value)}
                placeholder="1715000000 or 2026-05-06T12:00:00Z"
                className="font-mono text-sm"
              />
              {hasError ? (
                <p className="text-xs text-destructive">{error || "Invalid timestamp or date string"}</p>
              ) : (
                <p className="text-xs text-muted-foreground">
                  Accepts Unix seconds, Unix ms, ISO 8601, or any parseable date string
                </p>
              )}
            </div>

            {date && (
              <div className="rounded-xl border border-border bg-muted/20 p-5 space-y-1">
                <p className="text-3xl font-bold">
                  {date.toLocaleDateString("en-US", { weekday: "long" })}
                </p>
                <p className="text-lg text-muted-foreground">
                  {date.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
                </p>
                <p className="text-sm text-muted-foreground">{date.toLocaleTimeString()}</p>
                <p className="text-xs text-muted-foreground pt-2 border-t border-border mt-2">
                  {getRelative(date)}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Right Panel — All formats */}
        <div className="w-1/2 flex flex-col">
          <div className="p-3 border-b border-border bg-muted/30">
            <h3 className="text-sm font-medium">All Formats</h3>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-2">
            {rows.length === 0 ? (
              <div className="flex items-center justify-center h-full text-sm text-muted-foreground">
                Enter a timestamp or date to see all formats
              </div>
            ) : (
              rows.map(({ label, key, value }) => (
                <div
                  key={key}
                  className="flex items-center justify-between rounded-lg border border-border px-4 py-3 gap-3"
                >
                  <div className="min-w-0">
                    <p className="text-xs text-muted-foreground">{label}</p>
                    <code className="text-sm font-mono truncate block">{value}</code>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => copy(value, key)}
                    className="shrink-0 h-7 text-xs"
                  >
                    {copied === key ? <Check className="h-3 w-3 mr-1" /> : <Copy className="h-3 w-3 mr-1" />}
                    {copied === key ? "Copied!" : "Copy"}
                  </Button>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
