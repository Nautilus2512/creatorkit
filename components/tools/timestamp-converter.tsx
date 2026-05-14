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
  const [activeTab, setActiveTab] = useState<"input" | "output">("input")

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
    setActiveTab("output")
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
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [useNow, announceToScreenReader])

  const shortcuts = [
    { keys: ["Ctrl", "Shift", "N"], description: "Use current time" },
    { keys: ["Ctrl", "Shift", "T"], description: "Focus timestamp input" },
  ]

  return (
    <>
      <div aria-live="polite" aria-atomic="true" className="sr-only">{announcement}</div>

      <div className="flex h-full flex-col">

        {/* ── Desktop: top action bar ── */}
        <div className="hidden md:flex shrink-0 items-center gap-2 border-b border-border bg-card/95 backdrop-blur-sm px-4 py-2" role="toolbar" aria-label="Timestamp controls">
          <span className="text-sm font-semibold shrink-0 mr-1">Timestamp Converter</span>
          <div className="ml-auto flex items-center gap-1.5">
            <ShortcutsModal pageName="Timestamp Converter" shortcuts={shortcuts} />
            <Button variant="outline" size="sm" onClick={useNow} aria-label="Use current timestamp">
              <Clock className="h-4 w-4 mr-1" aria-hidden="true" />
              Use Current Time
              <kbd className="ml-1 hidden md:inline rounded border border-border bg-muted px-1 text-[10px]" aria-hidden="true">Ctrl+Shift+N</kbd>
            </Button>
          </div>
        </div>

        {/* ── Mobile: compact header + tab switcher ── */}
        <div className="flex md:hidden flex-col shrink-0 border-b border-border">
          <div className="flex items-center justify-between px-4 pt-3 pb-1">
            <h2 className="text-base font-semibold">Timestamp Converter</h2>
            <ShortcutsModal pageName="Timestamp Converter" shortcuts={shortcuts} />
          </div>
          <div className="flex" role="tablist" aria-label="Panel selection">
            <button
              role="tab"
              aria-selected={activeTab === "input"}
              onClick={() => setActiveTab("input")}
              className={`flex-1 py-2.5 text-sm font-medium border-b-2 transition-colors ${activeTab === "input" ? "border-primary text-foreground" : "border-transparent text-muted-foreground"}`}
            >
              Input
            </button>
            <button
              role="tab"
              aria-selected={activeTab === "output"}
              onClick={() => setActiveTab("output")}
              className={`flex-1 py-2.5 text-sm font-medium border-b-2 transition-colors ${activeTab === "output" ? "border-primary text-foreground" : "border-transparent text-muted-foreground"}`}
            >
              All Formats
            </button>
          </div>
        </div>

        {/* ── Panels ── */}
        <div className="flex-1 min-h-0 flex flex-col md:flex-row overflow-hidden">

          {/* Input panel */}
          <div
            className={`${activeTab === "input" ? "flex" : "hidden"} md:flex flex-1 flex-col min-h-0 overflow-hidden border-b md:border-b-0 md:border-r border-border`}
            role="region"
            aria-label="Timestamp input"
          >
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              <div className="space-y-1">
                <Input
                  id="timestamp-input"
                  value={input}
                  onChange={(e) => { handleChange(e.target.value); if (e.target.value && parseInput(e.target.value)) setActiveTab("output") }}
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
                <div className="rounded-xl border border-border bg-muted/20 p-5 space-y-1" role="region" aria-label="Parsed date details">
                  <p className="text-3xl font-bold">{date.toLocaleDateString("en-US", { weekday: "long" })}</p>
                  <p className="text-lg text-muted-foreground">{date.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}</p>
                  <p className="text-sm text-muted-foreground">{date.toLocaleTimeString()}</p>
                  <p className="text-xs text-muted-foreground pt-2 border-t border-border mt-2">{getRelative(date)}</p>
                </div>
              )}
            </div>
          </div>

          {/* Output panel */}
          <div
            className={`${activeTab === "output" ? "flex" : "hidden"} md:flex flex-1 flex-col min-h-0 overflow-hidden`}
            role="region"
            aria-label="All timestamp formats"
          >
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
                      <code className="text-sm font-mono truncate block">{value}</code>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => copy(value, key)}
                      className="shrink-0 h-9 min-w-[4rem] text-xs focus:outline-none focus:ring-2 focus:ring-primary/50"
                      aria-label={copied === key ? `${label} copied` : `Copy ${label}`}
                    >
                      {copied === key ? <Check className="h-3 w-3 mr-1" aria-hidden="true" /> : <Copy className="h-3 w-3 mr-1" aria-hidden="true" />}
                      {copied === key ? "Copied!" : "Copy"}
                    </Button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* ── Mobile: bottom action bar ── */}
        <div
          className="flex md:hidden shrink-0 items-center gap-2 border-t border-border bg-card/95 px-3 py-2"
          style={{ paddingBottom: "max(0.5rem, env(safe-area-inset-bottom))" }}
        >
          <div className="flex-1" />
          <Button size="sm" className="h-11 px-4" onClick={useNow} aria-label="Use current timestamp">
            <Clock className="h-4 w-4 mr-1.5" aria-hidden="true" />
            Use Current Time
          </Button>
        </div>

      </div>
    </>
  )
}
