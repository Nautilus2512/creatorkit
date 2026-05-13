"use client"

import { useState, useCallback, useEffect } from "react"
import { Copy, Check, Clock } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ShortcutsModal } from "@/components/shortcuts-modal"

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
  const [announcement, setAnnouncement] = useState("")

  const announceToScreenReader = useCallback((message: string) => {
    setAnnouncement(message)
    setTimeout(() => setAnnouncement(""), 1000)
  }, [])

  const date = input.trim() ? parseInput(input) : null
  const hasError = !!(input.trim() && !date)

  const rows = date ? buildRows(date) : []

  const handleChange = useCallback((value: string) => {
    setInput(value)
    setError("")
    if (value.trim() && !parseInput(value)) setError("Invalid timestamp or date string")
  }, [])

  const useNow = useCallback(() => { 
    const now = Math.floor(Date.now() / 1000)
    setInput(String(now))
    setError("")
    announceToScreenReader(`Set to current timestamp: ${now}`)
  }, [announceToScreenReader])

  const copy = useCallback((value: string, key: string) => {
    navigator.clipboard.writeText(value)
    setCopied(key)
    announceToScreenReader(`${key} value copied to clipboard`)
    setTimeout(() => setCopied(null), 2000)
  }, [announceToScreenReader])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.shiftKey) {
        switch (e.key.toLowerCase()) {
          case "n":
            e.preventDefault()
            useNow()
            break
          case "t":
            e.preventDefault()
            document.getElementById("timestamp-input")?.focus()
            announceToScreenReader("Timestamp input focused")
            break
        }
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [useNow, announceToScreenReader])

  const shortcuts = [
    { keys: ["Ctrl", "Shift", "N"], description: "Use current time" },
    { keys: ["Ctrl", "Shift", "T"], description: "Focus timestamp input" },
  ]

  return (
    <div className="flex h-full flex-col gap-3 p-4">
      <div aria-live="polite" aria-atomic="true" className="sr-only">
        {announcement}
      </div>

      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">Timestamp Converter</h2>
          <p className="text-muted-foreground">Convert between Unix timestamps and human-readable date formats</p>
        </div>
        <div className="flex items-center gap-2">
          <ShortcutsModal pageName="Timestamp Converter" shortcuts={shortcuts} />
          <Button 
            variant="outline" 
            size="sm" 
            onClick={useNow}
            aria-label="Use current timestamp"
            className="focus:outline-none focus:ring-2 focus:ring-primary/50"
          >
            <Clock className="h-4 w-4 mr-1" />
            <span>Use Current Time</span>
            <kbd className="ml-2 pointer-events-none inline-flex h-5 select-none items-center gap-0.5 rounded border bg-background/80 px-1 font-mono text-[10px] font-medium text-foreground shadow-sm">
              <span>Ctrl</span><span>Shift</span><span>N</span>
            </kbd>
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 flex-1 min-h-0">
        {/* Left Panel — Input */}
        <div className="flex flex-col overflow-hidden rounded-xl border border-border bg-card min-w-0" role="region" aria-label="Timestamp input">
          <div className="shrink-0 border-b border-border px-4 py-3">
            <span className="text-sm font-medium">Input</span>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            <div className="space-y-1">
              <Input
                id="timestamp-input"
                value={input}
                onChange={(e) => { handleChange(e.target.value); announceToScreenReader("Input updated") }}
                placeholder="1715000000 or 2026-05-06T12:00:00Z"
                className="font-mono text-sm"
                aria-describedby="input-hint"
              />
              <span id="input-hint" className="sr-only">
                {hasError ? "Error: Invalid timestamp or date string" : "Accepts Unix seconds, Unix ms, ISO 8601, or any parseable date string"}
              </span>
              {hasError ? (
                <p role="alert" className="text-xs text-destructive">{error || "Invalid timestamp or date string"}</p>
              ) : (
                <p className="text-xs text-muted-foreground">Accepts Unix seconds, Unix ms, ISO 8601, or any parseable date string</p>
              )}
            </div>

            {date && (
              <div 
                className="rounded-xl border border-border bg-muted/20 p-5 space-y-1" 
                role="region" 
                aria-label="Parsed date details"
              >
                <p className="text-3xl font-bold" aria-label={`Weekday: ${date.toLocaleDateString("en-US", { weekday: "long" })}`}>
                  {date.toLocaleDateString("en-US", { weekday: "long" })}
                </p>
                <p className="text-lg text-muted-foreground">
                  {date.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
                </p>
                <p className="text-sm text-muted-foreground" aria-label={`Time: ${date.toLocaleTimeString()}`}>
                  {date.toLocaleTimeString()}
                </p>
                <p className="text-xs text-muted-foreground pt-2 border-t border-border mt-2" aria-label={`Relative: ${getRelative(date)}`}>
                  {getRelative(date)}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Right Panel — All Formats */}
        <div className="flex flex-col overflow-hidden rounded-xl border border-border bg-card min-w-0" role="region" aria-label="All timestamp formats">
          <div className="shrink-0 border-b border-border px-4 py-3">
            <span className="text-sm font-medium">All Formats</span>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-2" role="list">
            {rows.length === 0 ? (
              <div className="flex items-center justify-center h-full text-sm text-muted-foreground" role="status">
                Enter a timestamp or date to see all formats
              </div>
            ) : (
              rows.map(({ label, key, value }) => (
                <div 
                  key={key} 
                  className="flex items-center justify-between rounded-lg border border-border px-4 py-3 gap-3"
                  role="listitem"
                  aria-label={`${label}: ${value}`}
                >
                  <div className="min-w-0">
                    <p className="text-xs text-muted-foreground">{label}</p>
                    <code className="text-sm font-mono truncate block" aria-label={`${label} value`}>{value}</code>
                  </div>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => copy(value, key)} 
                    className="shrink-0 h-7 text-xs focus:outline-none focus:ring-2 focus:ring-primary/50"
                    aria-label={copied === key ? `${label} copied to clipboard` : `Copy ${label}`}
                  >
                    {copied === key ? <Check className="h-3 w-3 mr-1" /> : <Copy className="h-3 w-3 mr-1" />}
                    <span>{copied === key ? "Copied!" : "Copy"}</span>
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
