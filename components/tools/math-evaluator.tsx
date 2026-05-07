"use client"

import { useState, useRef, useCallback, useEffect } from "react"
import { Copy, Check, Trash2, RotateCcw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"

// mathjs evaluate supports variable scopes natively
let mathEvaluate: ((expr: string, scope: Record<string, unknown>) => unknown) | null = null

type HistoryEntry = { expr: string; result: string; isError?: boolean }

const EXAMPLES = [
  "2 ^ 10",
  "sqrt(144)",
  "sin(pi / 4)",
  "x = 5",
  "x * 3 + 1",
  "log(1000, 10)",
  "factorial(6)",
  "5 inch to cm",
  "100 km/h to mph",
  "matrix([[1,2],[3,4]])",
]

function formatResult(val: unknown): string {
  if (val === undefined || val === null) return "undefined"
  if (typeof val === "number") {
    if (!isFinite(val)) return String(val)
    // Show up to 12 sig figs, strip trailing zeros
    const s = val.toPrecision(12)
    return parseFloat(s).toString()
  }
  try {
    // mathjs objects have a .toString()
    return String(val)
  } catch {
    return "[complex result]"
  }
}

export default function MathEvaluator() {
  const [input, setInput]     = useState("")
  const [history, setHistory] = useState<HistoryEntry[]>([])
  const [vars, setVars]       = useState<Record<string, string>>({})
  const [copied, setCopied]   = useState<string | null>(null)
  const [ready, setReady]     = useState(false)
  const scopeRef  = useRef<Record<string, unknown>>({})
  const inputRef  = useRef<HTMLInputElement>(null)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    import("mathjs").then(m => {
      mathEvaluate = m.evaluate as typeof mathEvaluate
      setReady(true)
    })
  }, [])

  const updateVarsDisplay = useCallback(() => {
    const display: Record<string, string> = {}
    for (const [k, v] of Object.entries(scopeRef.current)) {
      if (typeof v === "function") continue
      display[k] = formatResult(v)
    }
    setVars(display)
  }, [])

  const evaluate = useCallback(() => {
    const expr = input.trim()
    if (!expr || !mathEvaluate) return
    setInput("")
    try {
      const result = mathEvaluate(expr, scopeRef.current)
      const resultStr = formatResult(result)
      setHistory(h => [...h, { expr, result: resultStr }])
      updateVarsDisplay()
    } catch (e) {
      setHistory(h => [...h, { expr, result: String(e).replace("Error: ", ""), isError: true }])
    }
  }, [input, updateVarsDisplay])

  const resetScope = () => {
    scopeRef.current = {}
    setVars({})
    setHistory([])
  }

  const copy = (text: string) => {
    navigator.clipboard.writeText(text)
    setCopied(text)
    setTimeout(() => setCopied(null), 1500)
  }

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [history])

  return (
    <div className="flex flex-col bg-background md:h-screen">
      {/* Header */}
      <div className="shrink-0 border-b border-border bg-background px-6 py-4 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Math Calculator</h1>
          <p className="text-sm text-muted-foreground">
            Evaluate expressions, assign variables, convert units. Powered by mathjs.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={resetScope}>
          <RotateCcw className="h-3.5 w-3.5 mr-1.5" />Reset
        </Button>
      </div>

      <div className="flex-1 flex flex-col md:flex-row overflow-y-auto md:overflow-hidden">
        {/* Left: history + input */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* History */}
          <div className="flex-1 overflow-y-auto p-4 space-y-2 font-mono text-sm">
            {history.length === 0 && (
              <div className="text-center text-muted-foreground pt-16 space-y-2">
                <p className="text-base font-semibold">Start typing an expression below</p>
                <p className="text-xs">Supports variables, units, matrices, and complex numbers</p>
              </div>
            )}
            {history.map((h, i) => (
              <div key={i} className="group rounded-lg border border-border/50 bg-muted/20 px-4 py-2.5 hover:border-border transition-colors">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-muted-foreground text-xs">&gt;&nbsp;</span>
                  <span className="flex-1 text-foreground">{h.expr}</span>
                  <button
                    onClick={() => setHistory(prev => prev.filter((_, j) => j !== i))}
                    className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-opacity"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
                {h.isError
                  ? <p className="text-red-500 dark:text-red-400 text-xs mt-1 pl-4">{h.result}</p>
                  : <div className="flex items-center justify-between pl-4 mt-1">
                      <span className={`text-base font-semibold ${h.isError ? "text-destructive" : "text-primary"}`}>
                        = {h.result}
                      </span>
                      <button onClick={() => copy(h.result)} className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-foreground transition-opacity">
                        {copied === h.result ? <Check className="h-3.5 w-3.5 text-green-500" /> : <Copy className="h-3.5 w-3.5" />}
                      </button>
                    </div>
                }
              </div>
            ))}
            <div ref={bottomRef} />
          </div>

          {/* Input bar */}
          <div className="shrink-0 border-t border-border p-4">
            <div className="flex items-center gap-2">
              <span className="font-mono text-muted-foreground shrink-0">&gt;</span>
              <Input
                ref={inputRef}
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter") evaluate() }}
                placeholder={ready ? "Type an expression and press Enter…" : "Loading mathjs…"}
                disabled={!ready}
                className="font-mono flex-1"
                autoComplete="off"
                spellCheck={false}
              />
              <Button onClick={evaluate} disabled={!ready || !input.trim()}>
                Evaluate
              </Button>
            </div>
          </div>
        </div>

        {/* Right: variables + examples */}
        <div className="border-t md:border-t-0 md:border-l border-border flex flex-col overflow-hidden md:w-56 md:shrink-0">
          {/* Variables */}
          <div className="p-4 border-b border-border">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Variables</p>
            {Object.keys(vars).length === 0
              ? <p className="text-xs text-muted-foreground italic">None yet — try: x = 5</p>
              : <div className="space-y-1 font-mono text-xs">
                  {Object.entries(vars).map(([k, v]) => (
                    <div key={k} className="flex items-center justify-between gap-1">
                      <span className="text-primary font-semibold">{k}</span>
                      <span className="text-muted-foreground truncate text-right">{v}</span>
                    </div>
                  ))}
                </div>
            }
          </div>

          {/* Examples */}
          <div className="flex-1 overflow-y-auto p-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Examples</p>
            <div className="space-y-1.5">
              {EXAMPLES.map(ex => (
                <button
                  key={ex}
                  onClick={() => { setInput(ex); inputRef.current?.focus() }}
                  className="w-full text-left font-mono text-xs rounded border border-border/50 px-2 py-1.5 hover:border-primary/50 hover:bg-muted/30 transition-colors text-muted-foreground hover:text-foreground"
                >
                  {ex}
                </button>
              ))}
            </div>
            <div className="mt-4 space-y-1.5">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Supported</p>
              {["Arithmetic · Algebra", "Trig · Logarithms", "Unit conversions", "Matrices · Stats", "Complex numbers"].map(t => (
                <Badge key={t} variant="outline" className="text-xs w-full justify-start font-normal">{t}</Badge>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
