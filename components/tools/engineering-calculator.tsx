"use client"

import { useState, useEffect, useCallback } from "react"
import { Delete, RotateCcw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"

// Two mathjs instances — one per angle mode
let mathRad: { evaluate: (e: string, s?: Record<string, unknown>) => unknown; format: (v: unknown, o?: object) => string } | null = null
let mathDeg: { evaluate: (e: string, s?: Record<string, unknown>) => unknown; format: (v: unknown, o?: object) => string } | null = null

type CalcEntry = { expr: string; result: string }

const CONSTANTS: Record<string, { value: number; label: string; desc: string }> = {
  c:   { value: 299792458,   label: "c",   desc: "Speed of light (m/s)" },
  G:   { value: 6.674e-11,   label: "G",   desc: "Gravitational constant" },
  h:   { value: 6.626e-34,   label: "h",   desc: "Planck constant" },
  hbar:{ value: 1.0546e-34,  label: "ℏ",   desc: "Reduced Planck constant" },
  k_B: { value: 1.381e-23,   label: "kB",  desc: "Boltzmann constant" },
  Na:  { value: 6.022e23,    label: "Nₐ",  desc: "Avogadro's number" },
  e_c: { value: 1.602e-19,   label: "e",   desc: "Elementary charge (C)" },
}

type BtnDef = { label: string; action: string; variant?: "primary" | "fn" | "op" | "num" | "eq" | "const" }

const BUTTONS: BtnDef[] = [
  // Row 1 — functions
  { label: "sin",  action: "sin(",    variant: "fn" },
  { label: "cos",  action: "cos(",    variant: "fn" },
  { label: "tan",  action: "tan(",    variant: "fn" },
  { label: "asin", action: "asin(",   variant: "fn" },
  { label: "acos", action: "acos(",   variant: "fn" },
  // Row 2
  { label: "atan", action: "atan(",   variant: "fn" },
  { label: "ln",   action: "log(",    variant: "fn" },
  { label: "log",  action: "log10(",  variant: "fn" },
  { label: "√x",   action: "sqrt(",   variant: "fn" },
  { label: "x!",   action: "factorial(", variant: "fn" },
  // Row 3
  { label: "x²",   action: "^2",      variant: "fn" },
  { label: "xⁿ",   action: "^",       variant: "op" },
  { label: "π",    action: "pi",      variant: "fn" },
  { label: "e",    action: "e",       variant: "fn" },
  { label: "ANS",  action: "ANS",     variant: "fn" },
  // Row 4
  { label: "(", action: "(", variant: "op" },
  { label: ")", action: ")", variant: "op" },
  { label: "%",    action: " mod ",   variant: "op" },
  { label: "C",    action: "__clear", variant: "primary" },
  { label: "⌫",    action: "__back",  variant: "primary" },
  // Row 5 — number pad
  { label: "7", action: "7", variant: "num" },
  { label: "8", action: "8", variant: "num" },
  { label: "9", action: "9", variant: "num" },
  { label: "÷", action: " / ",  variant: "op" },
  { label: "±", action: "(-1)*(",variant: "op" },
  // Row 6
  { label: "4", action: "4", variant: "num" },
  { label: "5", action: "5", variant: "num" },
  { label: "6", action: "6", variant: "num" },
  { label: "×", action: " * ",  variant: "op" },
  { label: "abs", action: "abs(", variant: "fn" },
  // Row 7
  { label: "1", action: "1", variant: "num" },
  { label: "2", action: "2", variant: "num" },
  { label: "3", action: "3", variant: "num" },
  { label: "+", action: " + ",  variant: "op" },
  { label: "−", action: " - ",  variant: "op" },
  // Row 8
  { label: "0", action: "0", variant: "num" },
  { label: ".", action: ".", variant: "num" },
  { label: "EE", action: "e",   variant: "fn" },
  { label: "=",  action: "__eval", variant: "eq" },
  { label: "?",  action: "",    variant: "num" }, // placeholder
]

function formatNum(val: unknown): string {
  if (typeof val === "number") {
    if (!isFinite(val)) return String(val)
    const s = val.toPrecision(12)
    return parseFloat(s).toString()
  }
  return String(val)
}

export default function EngineeringCalculator() {
  const [expr, setExpr]     = useState("")
  const [display, setDisplay] = useState("0")
  const [history, setHistory] = useState<CalcEntry[]>([])
  const [ans, setAns]       = useState(0)
  const [isDeg, setIsDeg]   = useState(true)
  const [ready, setReady]   = useState(false)
  const [error, setError]   = useState(false)
  const [mem, setMem]       = useState(0)

  useEffect(() => {
    import("mathjs").then(m => {
      const { create, all } = m as typeof import("mathjs")
      mathRad = create(all)
      mathDeg = create(all) as typeof mathRad
      // Override trig in degree instance
      ;(mathDeg as unknown as { import: (fns: Record<string, unknown>, opts: object) => void }).import({
        sin:  (x: number) => Math.sin((x * Math.PI) / 180),
        cos:  (x: number) => Math.cos((x * Math.PI) / 180),
        tan:  (x: number) => Math.tan((x * Math.PI) / 180),
        asin: (x: number) => (Math.asin(x) * 180) / Math.PI,
        acos: (x: number) => (Math.acos(x) * 180) / Math.PI,
        atan: (x: number) => (Math.atan(x) * 180) / Math.PI,
        log10: (x: number) => Math.log10(x),
      }, { override: true })
      setReady(true)
    })
  }, [])

  const evalExpr = useCallback((rawExpr: string) => {
    const math = isDeg ? mathDeg : mathRad
    if (!math) return
    const scope: Record<string, unknown> = {
      ANS: ans,
      ...Object.fromEntries(Object.entries(CONSTANTS).map(([k, v]) => [k, v.value])),
    }
    try {
      const result = math.evaluate(rawExpr, scope)
      const resultStr = formatNum(result)
      const numResult = parseFloat(resultStr)
      if (!isNaN(numResult)) setAns(numResult)
      setDisplay(resultStr)
      setHistory(h => [{ expr: rawExpr, result: resultStr }, ...h.slice(0, 29)])
      setError(false)
    } catch {
      setDisplay("Error")
      setError(true)
    }
  }, [isDeg, ans])

  const handleBtn = useCallback((action: string) => {
    if (action === "__clear") { setExpr(""); setDisplay("0"); setError(false); return }
    if (action === "__back")  { setExpr(e => e.slice(0, -1)); return }
    if (action === "__eval")  { if (expr.trim()) evalExpr(expr); return }
    if (action === "")        return
    setExpr(e => e + action)
    setError(false)
  }, [expr, evalExpr])

  const btnClass = (v: BtnDef["variant"]) => {
    const base = "h-10 w-full rounded-lg text-sm font-medium transition-all active:scale-95 select-none border"
    if (v === "eq")      return `${base} bg-primary text-primary-foreground border-primary hover:opacity-90`
    if (v === "primary") return `${base} bg-destructive/80 text-white border-destructive/80 hover:bg-destructive`
    if (v === "fn")      return `${base} bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-900 hover:bg-blue-100 dark:hover:bg-blue-900/40`
    if (v === "op")      return `${base} bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-900 hover:bg-amber-100`
    return `${base} bg-card border-border hover:bg-muted/50`
  }

  return (
    <div className="flex flex-col bg-background md:h-screen">
      {/* Header */}
      <div className="shrink-0 border-b border-border px-6 py-4 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Engineering Calculator</h1>
          <p className="text-sm text-muted-foreground">Scientific calculator with unit support and physical constants.</p>
        </div>
        {!ready && <span className="text-xs text-muted-foreground">Loading…</span>}
      </div>

      <div className="flex-1 flex flex-col md:flex-row overflow-y-auto md:overflow-hidden">
        {/* Calculator column */}
        <div className="flex flex-col border-b md:border-b-0 md:border-r border-border overflow-hidden md:w-80 md:shrink-0">
          {/* Display */}
          <div className="p-4 bg-muted/20 border-b border-border">
            <div className="flex items-center justify-between mb-1">
              <button onClick={() => setIsDeg(d => !d)}
                className={`text-xs px-3 py-1 rounded-full border font-medium transition-colors ${isDeg ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground"}`}>
                {isDeg ? "DEG" : "RAD"}
              </button>
              <div className="flex gap-1">
                <button onClick={() => setMem(m => m + (parseFloat(display) || 0))}
                  className="text-xs px-2 py-0.5 rounded border border-border text-muted-foreground hover:text-foreground">M+</button>
                <button onClick={() => setExpr(e => e + mem.toString())}
                  className="text-xs px-2 py-0.5 rounded border border-border text-muted-foreground hover:text-foreground">MR</button>
                <button onClick={() => setMem(0)}
                  className="text-xs px-2 py-0.5 rounded border border-border text-muted-foreground hover:text-foreground">MC</button>
              </div>
            </div>
            {/* Expression */}
            <div className="text-right font-mono text-sm text-muted-foreground truncate min-h-[1.25rem]">{expr || " "}</div>
            {/* Result */}
            <div className={`text-right font-mono text-2xl font-semibold mt-1 ${error ? "text-destructive" : "text-foreground"}`}>
              {display}
            </div>
          </div>

          {/* Buttons */}
          <div className="flex-1 overflow-y-auto p-3">
            <div className="grid grid-cols-5 gap-1.5">
              {BUTTONS.map((btn, i) =>
                btn.label === "?" ? <div key={i} /> :
                <button key={i} onClick={() => handleBtn(btn.action)}
                  disabled={!ready}
                  className={btnClass(btn.variant)}>
                  {btn.label === "⌫" ? <Delete className="h-4 w-4 mx-auto" /> : btn.label}
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Right: constants + history */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Constants */}
          <div className="shrink-0 p-4 border-b border-border">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Physical Constants — click to insert</p>
            <div className="grid grid-cols-2 gap-1.5">
              {Object.entries(CONSTANTS).map(([key, c]) => (
                <button key={key} onClick={() => setExpr(e => e + key)}
                  disabled={!ready}
                  className="text-left rounded-lg border border-border px-3 py-2 hover:border-primary/50 hover:bg-muted/30 transition-colors">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs font-mono shrink-0">{c.label}</Badge>
                    <span className="text-xs text-muted-foreground truncate">{c.desc}</span>
                  </div>
                  <p className="text-xs font-mono text-primary mt-0.5">{c.value.toExponential(3)}</p>
                </button>
              ))}
            </div>
          </div>

          {/* History */}
          <div className="flex-1 overflow-y-auto p-4">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">History</p>
              {history.length > 0 && (
                <button onClick={() => setHistory([])} className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1">
                  <RotateCcw className="h-3 w-3" />Clear
                </button>
              )}
            </div>
            {history.length === 0
              ? <p className="text-xs text-muted-foreground italic">No calculations yet</p>
              : <div className="space-y-1.5">
                  {history.map((h, i) => (
                    <button key={i} onClick={() => setExpr(h.result)} className="w-full text-left font-mono text-xs rounded border border-border/50 px-3 py-2 hover:border-primary/40 hover:bg-muted/20 transition-colors">
                      <div className="text-muted-foreground truncate">{h.expr}</div>
                      <div className="text-primary font-semibold">= {h.result}</div>
                    </button>
                  ))}
                </div>
            }
          </div>
        </div>
      </div>
    </div>
  )
}
