"use client"

import { useState, useCallback, useEffect } from "react"
import { Copy, Check } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ShortcutsModal } from "@/components/shortcuts-modal"

function announceToScreenReader(message: string) {
  const announcement = document.createElement('div')
  announcement.setAttribute('role', 'status')
  announcement.setAttribute('aria-live', 'polite')
  announcement.setAttribute('aria-atomic', 'true')
  announcement.className = 'sr-only'
  announcement.textContent = message
  document.body.appendChild(announcement)
  setTimeout(() => document.body.removeChild(announcement), 1000)
}

const PRESETS = [
  { label: "Every minute", expr: "* * * * *", shortcut: "1" },
  { label: "Every hour", expr: "0 * * * *", shortcut: "2" },
  { label: "Every 5 min", expr: "*/5 * * * *", shortcut: "3" },
  { label: "Every 15 min", expr: "*/15 * * * *", shortcut: "4" },
  { label: "Every 30 min", expr: "*/30 * * * *", shortcut: "5" },
  { label: "Daily midnight", expr: "0 0 * * *", shortcut: "6" },
  { label: "Daily noon", expr: "0 12 * * *", shortcut: "7" },
  { label: "Every Monday", expr: "0 0 * * 1", shortcut: "8" },
  { label: "Weekdays only", expr: "0 0 * * 1-5", shortcut: "9" },
  { label: "Weekends only", expr: "0 0 * * 0,6", shortcut: "0" },
  { label: "Every month", expr: "0 0 1 * *", shortcut: "" },
  { label: "Every 6 hours", expr: "0 */6 * * *", shortcut: "" },
]

const MONTHS = ["", "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]

function describeCron(expr: string): string {
  const parts = expr.trim().split(/\s+/)
  if (parts.length !== 5) return "Invalid expression (need 5 fields)"
  const [min, hour, dom, month, dow] = parts

  const descField = (val: string, unit: string, names?: string[]) => {
    if (val === "*") return `every ${unit}`
    if (/^\*\/\d+$/.test(val)) return `every ${val.slice(2)} ${unit}s`
    if (val.includes("-")) {
      const [a, b] = val.split("-")
      return names ? `${names[+a] || a}–${names[+b] || b}` : `${a}–${b}`
    }
    if (val.includes(",")) {
      const items = val.split(",").map(v => (names ? names[+v] || v : v))
      return items.join(", ")
    }
    if (val.includes("/")) {
      const [base, step] = val.split("/")
      return `every ${step} ${unit}s from ${base === "*" ? "0" : base}`
    }
    return names ? names[+val] || val : val
  }

  const parts2: string[] = []
  if (min === "*" && hour === "*") parts2.push("every minute")
  else if (min !== "*" && hour === "*") parts2.push(`at minute ${descField(min, "minute")} of every hour`)
  else parts2.push(`at ${descField(hour, "hour")}:${min.padStart(2, "0")}`)

  if (dom !== "*") parts2.push(`on day ${dom} of the month`)
  if (month !== "*") parts2.push(`in ${descField(month, "month", MONTHS)}`)
  if (dow !== "*") parts2.push(`on ${descField(dow, "weekday", WEEKDAYS)}`)
  if (dom === "*" && month === "*" && dow === "*") parts2.push("every day")

  return parts2.join(", ")
}

function parseField(val: string, lo: number, hi: number): Set<number> | null {
  const result = new Set<number>()
  for (const part of val.split(",")) {
    if (part === "*") { for (let i = lo; i <= hi; i++) result.add(i); continue }
    if (/^\*\/\d+$/.test(part)) {
      const step = parseInt(part.slice(2))
      for (let i = lo; i <= hi; i += step) result.add(i)
      continue
    }
    if (part.includes("-")) {
      const [a, b] = part.split("-").map(Number)
      for (let i = a; i <= b; i++) result.add(i)
      continue
    }
    if (part.includes("/")) {
      const [base, step] = part.split("/")
      const start = base === "*" ? lo : parseInt(base)
      for (let i = start; i <= hi; i += parseInt(step)) result.add(i)
      continue
    }
    const n = parseInt(part)
    if (!isNaN(n)) result.add(n)
  }
  return result.size > 0 ? result : null
}

function getNextRuns(expr: string, count = 5): Date[] {
  const parts = expr.trim().split(/\s+/)
  if (parts.length !== 5) return []
  const [minF, hourF, domF, monthF, dowF] = parts
  const mins = minF === "*" ? null : parseField(minF, 0, 59)
  const hours = hourF === "*" ? null : parseField(hourF, 0, 23)
  const doms = domF === "*" ? null : parseField(domF, 1, 31)
  const months = monthF === "*" ? null : parseField(monthF, 1, 12)
  const dows = dowF === "*" ? null : parseField(dowF, 0, 6)
  const check = (field: Set<number> | null, val: number) => !field || field.has(val)
  const runs: Date[] = []
  const d = new Date()
  d.setSeconds(0, 0)
  d.setMinutes(d.getMinutes() + 1)
  for (let i = 0; i < 527040 && runs.length < count; i++) {
    if (check(mins, d.getMinutes()) && check(hours, d.getHours()) && check(doms, d.getDate()) && check(months, d.getMonth() + 1) && check(dows, d.getDay())) {
      runs.push(new Date(d))
    }
    d.setMinutes(d.getMinutes() + 1)
  }
  return runs
}

function relativeTime(date: Date): string {
  const diff = Math.floor((date.getTime() - Date.now()) / 60000)
  if (diff < 60) return `in ${diff}m`
  if (diff < 1440) return `in ${Math.floor(diff / 60)}h ${diff % 60}m`
  return `in ${Math.floor(diff / 1440)}d`
}

const shortcuts = [
  { keys: ["1"], description: "Every minute preset" },
  { keys: ["2"], description: "Every hour preset" },
  { keys: ["3"], description: "Every 5 minutes preset" },
  { keys: ["4"], description: "Every 15 minutes preset" },
  { keys: ["5"], description: "Every 30 minutes preset" },
  { keys: ["6"], description: "Daily at midnight preset" },
  { keys: ["7"], description: "Daily at noon preset" },
  { keys: ["8"], description: "Every Monday preset" },
  { keys: ["9"], description: "Weekdays only preset" },
  { keys: ["0"], description: "Weekends only preset" },
  { keys: ["Ctrl", "Shift", "V"], description: "Copy expression" },
  { keys: ["Escape"], description: "Focus expression input" },
  { keys: ["?"], description: "Toggle this shortcuts panel" },
  { keys: ["Tab"], description: "Navigate between controls" },
]

export default function CronGenerator() {
  const [expr, setExpr] = useState("0 0 * * *")
  const [copied, setCopied] = useState(false)
  const [activeTab, setActiveTab] = useState<"input" | "output">("input")

  const fields = expr.trim().split(/\s+/)
  const isValid = fields.length === 5
  const description = isValid ? describeCron(expr) : "Enter a valid 5-field cron expression"
  const nextRuns = isValid ? getNextRuns(expr) : []

  const setExpression = useCallback((newExpr: string, label: string) => {
    setExpr(newExpr)
    announceToScreenReader(`Applied preset: ${label}`)
  }, [])

  const copy = useCallback(() => {
    navigator.clipboard.writeText(expr)
    setCopied(true)
    announceToScreenReader("Cron expression copied")
    setTimeout(() => setCopied(false), 2000)
  }, [expr])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === "v" && expr) {
          e.preventDefault()
          copy()
        }
        return
      }

      if (!e.ctrlKey && !e.metaKey && !e.altKey && /^[0-9]$/.test(e.key)) {
        const preset = PRESETS.find(p => p.shortcut === e.key)
        if (preset) {
          e.preventDefault()
          setExpression(preset.expr, preset.label)
        }
      }

      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === "v" && expr) {
        e.preventDefault()
        copy()
      }

      if (e.key === "Escape") {
        const inputEl = document.getElementById("cron-expression") as HTMLInputElement
        inputEl?.focus()
        inputEl?.select()
      }
    }
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [expr, copy, setExpression])

  return (
    <div className="flex flex-1 flex-col min-h-0">

      {/* DESKTOP: top action bar */}
      <div className="hidden md:flex shrink-0 items-center gap-2 border-b border-border bg-card/95 backdrop-blur-sm px-4 py-2" role="toolbar" aria-label="Cron Generator controls">
        <span className="text-sm font-semibold shrink-0 mr-1">Cron Generator</span>
        <div className="h-4 w-px bg-border mx-1" aria-hidden="true" />
        <div className="flex flex-wrap gap-1" role="radiogroup" aria-label="Cron presets">
          {PRESETS.map(({ label, expr: e, shortcut }) => (
            <button
              key={e}
              onClick={() => setExpression(e, label)}
              className={`text-xs px-3 py-1 rounded-full border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                expr === e
                  ? "bg-primary text-primary-foreground border-primary"
                  : "border-border text-muted-foreground hover:border-primary/50 hover:text-foreground"
              }`}
              role="radio"
              aria-checked={expr === e}
              aria-label={shortcut ? `${label} (press ${shortcut})` : label}
            >
              {label}
              {shortcut && (
                <kbd
                  className={`ml-1 hidden md:inline rounded border px-1 text-[10px] ${
                    expr === e
                      ? "border-primary-foreground/30 bg-primary-foreground/20"
                      : "border-border bg-muted"
                  }`}
                  aria-hidden="true"
                >
                  {shortcut}
                </kbd>
              )}
            </button>
          ))}
        </div>

        <div className="ml-auto flex items-center gap-1.5">
          <ShortcutsModal pageName="Cron Generator" shortcuts={shortcuts} />
          <Button variant="outline" size="sm" onClick={copy} aria-label="Copy cron expression">
            {copied ? <Check className="h-4 w-4 mr-1" aria-hidden="true" /> : <Copy className="h-4 w-4 mr-1" aria-hidden="true" />}
            {copied ? "Copied!" : "Copy Expression"}
            <kbd className="ml-1 hidden md:inline rounded border border-border bg-muted px-1 text-[10px]" aria-hidden="true">Ctrl+Shift+V</kbd>
          </Button>
        </div>
      </div>

      {/* MOBILE: compact header + tab switcher */}
      <div className="flex md:hidden flex-col shrink-0 border-b border-border">
        <div className="flex items-center justify-between px-4 pt-3 pb-2">
          <h2 className="text-base font-semibold">Cron Generator</h2>
          <ShortcutsModal pageName="Cron Generator" shortcuts={shortcuts} />
        </div>
        <div className="flex" role="tablist" aria-label="Panel selection">
          <button
            role="tab"
            aria-selected={activeTab === "input"}
            onClick={() => setActiveTab("input")}
            className={`flex-1 py-2.5 text-sm font-medium border-b-2 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-inset ${
              activeTab === "input" ? "border-primary text-foreground" : "border-transparent text-muted-foreground"
            }`}
          >
            Builder
          </button>
          <button
            role="tab"
            aria-selected={activeTab === "output"}
            onClick={() => setActiveTab("output")}
            className={`flex-1 py-2.5 text-sm font-medium border-b-2 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-inset ${
              activeTab === "output" ? "border-primary text-foreground" : "border-transparent text-muted-foreground"
            }`}
          >
            Schedule
          </button>
        </div>
      </div>

      {/* SCROLLABLE CONTENT AREA */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">

        {/* PANELS CARD */}
        <div className="flex flex-col md:flex-row min-h-[500px] rounded-xl border border-border overflow-hidden">

          {/* Input panel — Expression builder */}
          <div
            className={`${activeTab === "input" ? "flex" : "hidden"} md:flex flex-1 flex-col min-h-0 overflow-hidden md:border-r border-border`}
            role="region"
            aria-label="Cron expression builder"
          >
            <div className="flex-1 overflow-y-auto p-4 space-y-5">

              {/* Mobile presets */}
              <div className="md:hidden flex flex-wrap gap-2" role="radiogroup" aria-label="Cron presets">
                {PRESETS.map(({ label, expr: e, shortcut }) => (
                  <button
                    key={e}
                    onClick={() => setExpression(e, label)}
                    className={`text-xs px-3 py-1 rounded-full border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                      expr === e
                        ? "bg-primary text-primary-foreground border-primary"
                        : "border-border text-muted-foreground hover:border-primary/50 hover:text-foreground"
                    }`}
                    role="radio"
                    aria-checked={expr === e}
                    aria-label={shortcut ? `${label} (press ${shortcut})` : label}
                  >
                    {label}
                  </button>
                ))}
              </div>

              <div className="space-y-2">
                <Input
                  id="cron-expression"
                  value={expr}
                  onChange={(e) => setExpr(e.target.value)}
                  className="font-mono text-2xl tracking-[0.3em] text-center h-12"
                  placeholder="* * * * *"
                  aria-label="Cron expression"
                  aria-describedby="cron-field-labels"
                />
                <div id="cron-field-labels" className="grid grid-cols-5 gap-1 text-center text-xs text-muted-foreground">
                  {["Minute", "Hour", "Day", "Month", "Weekday"].map(l => <div key={l}>{l}</div>)}
                </div>
              </div>

              {isValid && (
                <div className="space-y-2" role="group" aria-label="Cron fields breakdown">
                  {[
                    { label: "Minute", value: fields[0], hint: "0–59, */5, 0-30" },
                    { label: "Hour", value: fields[1], hint: "0–23, */6, 9-17" },
                    { label: "Day of Month", value: fields[2], hint: "1–31, */2" },
                    { label: "Month", value: fields[3], hint: "1–12 (Jan=1)" },
                    { label: "Day of Week", value: fields[4], hint: "0–7 (Sun=0,7)" },
                  ].map(({ label, value, hint }) => (
                    <div key={label} className="flex items-center justify-between rounded-md border border-border px-3 py-2">
                      <div>
                        <span className="text-sm">{label}</span>
                        <span className="text-xs text-muted-foreground ml-2">{hint}</span>
                      </div>
                      <code className="font-mono text-sm bg-muted px-2 py-0.5 rounded" aria-label={`${label} value`}>{value}</code>
                    </div>
                  ))}
                </div>
              )}

              <div className="rounded-lg border border-primary/20 bg-primary/5 p-4" role="region" aria-label="Expression meaning">
                <p className="text-xs font-medium text-primary uppercase tracking-wider mb-1">Meaning</p>
                <p className="text-sm" aria-live="polite">{description}</p>
              </div>
            </div>
          </div>

          {/* Output panel — Next runs */}
          <div
            className={`${activeTab === "output" ? "flex" : "hidden"} md:flex flex-1 flex-col min-h-0 overflow-hidden`}
            role="region"
            aria-label="Next scheduled runs"
          >
            <div className="shrink-0 border-b border-border px-4 py-3">
              <span className="text-sm font-medium">Schedule</span>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-2" role="list" aria-label="Upcoming runs list">
              {nextRuns.length === 0 ? (
                <div className="flex items-center justify-center h-full text-sm text-muted-foreground" role="note">No upcoming runs found</div>
              ) : (
                nextRuns.map((date, i) => (
                  <div key={i} className="rounded-lg border border-border px-4 py-3" role="listitem">
                    <div className="flex items-center justify-between mb-0.5">
                      <span className="text-xs text-muted-foreground">Run {i + 1}</span>
                      <span className="text-xs text-muted-foreground">{relativeTime(date)}</span>
                    </div>
                    <p className="text-sm font-mono">{date.toLocaleString()}</p>
                  </div>
                ))
              )}
            </div>
            <div className="shrink-0 border-t border-border bg-card/95 backdrop-blur-sm px-4 py-3">
              <p className="text-xs font-medium mb-2" id="quick-reference">Quick Reference</p>
              <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-muted-foreground font-mono" role="list" aria-labelledby="quick-reference">
                {[["*", "any value"], ["*/n", "every n units"], ["a-b", "range a to b"], ["a,b,c", "list of values"], ["a/n", "every n from a"]].map(([sym, desc]) => (
                  <div key={sym} className="flex gap-2" role="listitem">
                    <span className="text-foreground font-bold">{sym}</span>
                    <span>{desc}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

        </div>

        {/* USAGE GUIDE */}
        <div className="rounded-xl border border-border bg-card p-4 space-y-4">
          <div className="space-y-1.5">
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">How to use</p>
            <ol className="space-y-1.5 text-xs text-muted-foreground list-decimal list-inside">
              <li>Click a <span className="text-foreground font-medium">preset</span> or type a custom expression in the input field. The 5 fields are: <span className="text-foreground font-medium">minute, hour, day, month, weekday</span>.</li>
              <li>The <span className="text-foreground font-medium">Meaning</span> box instantly translates the expression into plain English so you can verify it is correct.</li>
              <li>Switch to the <span className="text-foreground font-medium">Schedule</span> panel to see the next 5 upcoming run times based on your local clock.</li>
              <li>Click <span className="text-foreground font-medium">Copy Expression</span> to copy the cron string to your clipboard, then paste it into your scheduler.</li>
            </ol>
          </div>

          <div className="space-y-1.5">
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">Keyboard shortcuts</p>
            <ul className="space-y-1 text-xs text-muted-foreground list-disc list-inside">
              <li>Keys <kbd className="rounded border border-border bg-muted px-1 text-[10px]">1</kbd> through <kbd className="rounded border border-border bg-muted px-1 text-[10px]">9</kbd> and <kbd className="rounded border border-border bg-muted px-1 text-[10px]">0</kbd> apply the matching preset (numbered left to right in the top bar).</li>
              <li><kbd className="rounded border border-border bg-muted px-1 text-[10px]">Ctrl+Shift+V</kbd> copies the current expression to your clipboard.</li>
              <li><kbd className="rounded border border-border bg-muted px-1 text-[10px]">Escape</kbd> focuses and selects the expression input so you can start typing immediately.</li>
              <li><kbd className="rounded border border-border bg-muted px-1 text-[10px]">?</kbd> opens and closes the shortcuts reference panel.</li>
            </ul>
          </div>

          <div className="space-y-1.5">
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">Field reference</p>
            <ul className="space-y-1 text-xs text-muted-foreground list-disc list-inside">
              <li>A cron expression has 5 space-separated fields: <span className="text-foreground font-medium">minute (0-59), hour (0-23), day-of-month (1-31), month (1-12), day-of-week (0-6, Sun=0)</span>.</li>
              <li><span className="text-foreground font-medium">*</span> matches every value. <span className="text-foreground font-medium">*/5</span> matches every 5th value. <span className="text-foreground font-medium">1-5</span> matches a range. <span className="text-foreground font-medium">1,3,5</span> matches exact values.</li>
              <li>Both <span className="text-foreground font-medium">0</span> and <span className="text-foreground font-medium">7</span> represent Sunday in the day-of-week field.</li>
            </ul>
          </div>

          <p className="text-xs text-muted-foreground">Everything runs in your browser. Nothing is sent to a server.</p>
        </div>

        {/* Spacer so fixed mobile bar does not cover last content */}
        <div className="md:hidden h-[60px]" aria-hidden="true" />
      </div>

      {/* MOBILE: bottom action bar */}
      <div
        className="md:hidden fixed bottom-0 left-0 right-0 flex items-center gap-1.5 border-t border-border bg-card/95 backdrop-blur-sm px-3 py-2 z-20"
        style={{ paddingBottom: "max(0.5rem, env(safe-area-inset-bottom))" }}
      >
        <div className="flex-1" />
        <Button size="sm" className="h-11 px-3" onClick={copy} aria-label="Copy cron expression">
          {copied ? <Check className="h-4 w-4" aria-hidden="true" /> : <Copy className="h-4 w-4" aria-hidden="true" />}
          <span className="ml-1 text-xs">{copied ? "Copied!" : "Copy Expression"}</span>
        </Button>
      </div>

    </div>
  )
}
