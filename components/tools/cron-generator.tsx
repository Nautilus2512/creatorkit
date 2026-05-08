"use client"

import { useState } from "react"
import { Copy, Check } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

const PRESETS = [
  { label: "Every minute", expr: "* * * * *" },
  { label: "Every hour", expr: "0 * * * *" },
  { label: "Every 5 min", expr: "*/5 * * * *" },
  { label: "Every 15 min", expr: "*/15 * * * *" },
  { label: "Every 30 min", expr: "*/30 * * * *" },
  { label: "Daily midnight", expr: "0 0 * * *" },
  { label: "Daily noon", expr: "0 12 * * *" },
  { label: "Every Monday", expr: "0 0 * * 1" },
  { label: "Weekdays only", expr: "0 0 * * 1-5" },
  { label: "Weekends only", expr: "0 0 * * 0,6" },
  { label: "Every month", expr: "0 0 1 * *" },
  { label: "Every 6 hours", expr: "0 */6 * * *" },
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

export default function CronGenerator() {
  const [expr, setExpr] = useState("0 0 * * *")
  const [copied, setCopied] = useState(false)

  const fields = expr.trim().split(/\s+/)
  const isValid = fields.length === 5
  const description = isValid ? describeCron(expr) : "Enter a valid 5-field cron expression"
  const nextRuns = isValid ? getNextRuns(expr) : []

  const copy = () => { navigator.clipboard.writeText(expr); setCopied(true); setTimeout(() => setCopied(false), 2000) }

  return (
    <div className="flex h-full flex-col gap-3 p-4">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">Cron Expression Generator</h2>
        <p className="text-muted-foreground">Build cron expressions with a human-readable preview and next-run times</p>
      </div>

      <div className="flex flex-wrap gap-2">
        {PRESETS.map(({ label, expr: e }) => (
          <button
            key={e}
            onClick={() => setExpr(e)}
            className={`text-xs px-3 py-1 rounded-full border transition-colors ${expr === e ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground hover:border-primary/50"}`}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-2 flex-1 min-h-0">
        {/* Left — Editor */}
        <div className="flex flex-col overflow-hidden rounded-xl border border-border bg-card">
          <div className="shrink-0 border-b border-border px-4 py-3">
            <span className="text-sm font-medium">Expression</span>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-5">
            <div className="space-y-2">
              <Input
                value={expr}
                onChange={(e) => setExpr(e.target.value)}
                className="font-mono text-2xl tracking-[0.3em] text-center h-12"
                placeholder="* * * * *"
              />
              <div className="grid grid-cols-5 gap-1 text-center text-xs text-muted-foreground">
                {["Minute", "Hour", "Day", "Month", "Weekday"].map(l => <div key={l}>{l}</div>)}
              </div>
            </div>

            {isValid && (
              <div className="space-y-2">
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
                    <code className="font-mono text-sm bg-muted px-2 py-0.5 rounded">{value}</code>
                  </div>
                ))}
              </div>
            )}

            <div className="rounded-lg border border-primary/20 bg-primary/5 p-4">
              <p className="text-xs font-medium text-primary uppercase tracking-wider mb-1">Meaning</p>
              <p className="text-sm">{description}</p>
            </div>
          </div>
          <div className="shrink-0 border-t border-border bg-card/95 backdrop-blur-sm px-4 py-3">
            <Button onClick={copy} variant="outline" size="sm" className="w-full">
              {copied ? <Check className="h-4 w-4 mr-1" /> : <Copy className="h-4 w-4 mr-1" />}
              {copied ? "Copied!" : "Copy Expression"}
            </Button>
          </div>
        </div>

        {/* Right — Next runs */}
        <div className="flex flex-col overflow-hidden rounded-xl border border-border bg-card">
          <div className="shrink-0 border-b border-border px-4 py-3">
            <span className="text-sm font-medium">Next 5 Runs</span>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-2">
            {nextRuns.length === 0 ? (
              <div className="flex items-center justify-center h-full text-sm text-muted-foreground">No upcoming runs found</div>
            ) : (
              nextRuns.map((date, i) => (
                <div key={i} className="rounded-lg border border-border px-4 py-3">
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
            <p className="text-xs font-medium mb-2">Quick Reference</p>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-muted-foreground font-mono">
              {[["*", "any value"], ["*/n", "every n units"], ["a-b", "range a to b"], ["a,b,c", "list of values"], ["a/n", "every n from a"]].map(([sym, desc]) => (
                <div key={sym} className="flex gap-2">
                  <span className="text-foreground">{sym}</span>
                  <span>{desc}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
