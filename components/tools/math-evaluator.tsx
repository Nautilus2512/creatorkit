"use client"

import { useState, useRef, useCallback, useEffect } from "react"
import { Copy, Check, Trash2, RotateCcw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { ShortcutsModal } from "@/components/shortcuts-modal"

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
  const [announcement, setAnnouncement] = useState("")
  const [panelTab, setPanelTab] = useState<"input" | "output">("input")
  const scopeRef  = useRef<Record<string, unknown>>({})
  const inputRef  = useRef<HTMLInputElement>(null)
  const bottomRef = useRef<HTMLDivElement>(null)

  const announceToScreenReader = useCallback((message: string) => {
    setAnnouncement(message)
    setTimeout(() => setAnnouncement(""), 1000)
  }, [])

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
      announceToScreenReader(`Result: ${resultStr}`)
    } catch (e) {
      setHistory(h => [...h, { expr, result: String(e).replace("Error: ", ""), isError: true }])
      announceToScreenReader("Error evaluating expression")
    }
  }, [input, updateVarsDisplay, announceToScreenReader])

  const resetScope = useCallback(() => {
    scopeRef.current = {}
    setVars({})
    setHistory([])
    announceToScreenReader("Variables and history cleared")
  }, [announceToScreenReader])

  const copy = useCallback((text: string) => {
    navigator.clipboard.writeText(text)
    setCopied(text)
    announceToScreenReader(`Copied: ${text}`)
    setTimeout(() => setCopied(null), 1500)
  }, [announceToScreenReader])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [history])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'r') {
        e.preventDefault()
        resetScope()
      }
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'e') {
        e.preventDefault()
        evaluate()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [resetScope, evaluate])

return (
  <>
    <div aria-live="polite" aria-atomic="true" className="sr-only">{announcement}</div>

    <div className="flex flex-1 flex-col min-h-0">

      {/* Desktop: top action bar */}
      <div className="hidden md:flex shrink-0 items-center gap-2 border-b border-border bg-card/95 backdrop-blur-sm px-4 py-2">
        <span className="text-sm font-semibold shrink-0 mr-1">Math Calculator</span>
        {!ready && <span className="text-xs text-muted-foreground">Loading…</span>}
        <div className="ml-auto flex items-center gap-1.5">
          <ShortcutsModal pageName="Math Calculator" shortcuts={[
            { keys: ["Ctrl", "Shift", "Enter"], description: "Evaluate expression" },
            { keys: ["Ctrl", "Shift", "R"], description: "Reset variables and history" },
            { keys: ["Ctrl", "Shift", "E"], description: "Evaluate (same as Enter)" },
          ]} />
          <Button variant="outline" size="sm" onClick={resetScope} aria-label="Reset variables and history">
            <RotateCcw className="h-3.5 w-3.5 mr-1.5" aria-hidden="true" />Reset
            <kbd className="ml-1 hidden md:inline rounded border border-border bg-muted px-1 text-[10px]" aria-hidden="true">Ctrl+Shift+R</kbd>
          </Button>
        </div>
      </div>

      {/* Mobile: compact header + tab switcher */}
      <div className="flex md:hidden flex-col shrink-0 border-b border-border">
        <div className="flex items-center justify-between px-4 pt-3 pb-1">
          <h2 className="text-base font-semibold">Math Calculator</h2>
          <ShortcutsModal pageName="Math Calculator" shortcuts={[
            { keys: ["Ctrl", "Shift", "Enter"], description: "Evaluate expression" },
            { keys: ["Ctrl", "Shift", "R"], description: "Reset" },
          ]} />
        </div>
        <div className="flex" role="tablist" aria-label="Panel selection">
          <button role="tab" aria-selected={panelTab === "input"} onClick={() => setPanelTab("input")}
            className={`flex-1 py-2.5 text-sm font-medium border-b-2 transition-colors ${panelTab === "input" ? "border-primary text-foreground" : "border-transparent text-muted-foreground"}`}>
            Calculator
          </button>
          <button role="tab" aria-selected={panelTab === "output"} onClick={() => setPanelTab("output")}
            className={`flex-1 py-2.5 text-sm font-medium border-b-2 transition-colors ${panelTab === "output" ? "border-primary text-foreground" : "border-transparent text-muted-foreground"}`}>
            Variables & Examples
          </button>
        </div>
      </div>

      <div className="flex-1 min-h-0 flex flex-col md:flex-row overflow-hidden">
        {/* Left: history + input */}
        <div className={`${panelTab === "input" ? "flex" : "hidden"} md:flex flex-col flex-1 min-h-0 overflow-hidden border-b md:border-b-0 md:border-r border-border bg-card`}>
          {/* History */}
          <div className="flex-1 overflow-y-auto p-4 space-y-2 font-mono text-sm" role="log" aria-label="Calculation history" aria-live="polite">
            {history.length === 0 && (
              <div className="text-center text-muted-foreground pt-16 space-y-2" role="status">
                <p className="text-base font-semibold">Start typing an expression below</p>
                <p className="text-xs">Supports variables, units, matrices, and complex numbers</p>
              </div>
            )}
            {history.map((h, i) => (
              <div key={i} className="group rounded-lg border border-border/50 bg-muted/20 px-4 py-2.5 hover:border-border transition-colors" role="article" aria-label={`Expression ${i + 1}: ${h.expr}`}>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-muted-foreground text-xs" aria-hidden="true">&gt;&nbsp;</span>
                  <span className="flex-1 text-foreground">{h.expr}</span>
                  <button
                    onClick={() => { setHistory(prev => prev.filter((_, j) => j !== i)); announceToScreenReader(`Expression ${i + 1} deleted`) }}
                    className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-opacity focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1"
                    aria-label={`Delete expression ${i + 1}`}
                  >
                    <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                  </button>
                </div>
                {h.isError
                  ? <p className="text-red-500 dark:text-red-400 text-xs mt-1 pl-4" role="alert">{h.result}</p>
                  : <div className="flex items-center justify-between pl-4 mt-1">
                      <span className={`text-base font-semibold ${h.isError ? "text-destructive" : "text-primary"}`}>
                        = {h.result}
                      </span>
                      <button onClick={() => copy(h.result)} className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-foreground transition-opacity focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1" aria-label={`Copy result: ${h.result}`}>
                        {copied === h.result ? <Check className="h-3.5 w-3.5 text-green-500" aria-hidden="true" /> : <Copy className="h-3.5 w-3.5" aria-hidden="true" />}
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
              <span className="font-mono text-muted-foreground shrink-0" aria-hidden="true">&gt;</span>
              <Input
                ref={inputRef}
                value={input}
                onChange={e => { setInput(e.target.value); announceToScreenReader("Input updated") }}
                onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); evaluate() } }}
                placeholder={ready ? "Type an expression and press Enter…" : "Loading mathjs…"}
                disabled={!ready}
                className="font-mono flex-1"
                autoComplete="off"
                spellCheck={false}
                aria-label="Math expression input"
              />
              <Button 
                onClick={evaluate} 
                disabled={!ready || !input.trim()}
                className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                aria-label="Evaluate expression"
              >
                Evaluate
                <kbd className="ml-2 hidden md:inline rounded border border-muted-foreground/30 bg-muted/20 px-1 text-[10px] opacity-60" aria-hidden="true">Enter</kbd>
              </Button>
            </div>
          </div>
        </div>

        {/* Right: variables + examples */}
        <div className={`${panelTab === "output" ? "flex" : "hidden"} md:flex flex-col flex-1 min-h-0 overflow-hidden bg-card`} role="region" aria-labelledby="variables-label">
          {/* Variables */}
          <div className="p-4 border-b border-border">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3" id="variables-label">Variables</p>
            {Object.keys(vars).length === 0
              ? <p className="text-xs text-muted-foreground italic" role="status">None yet — try: x = 5</p>
              : <div className="space-y-1 font-mono text-xs" role="list" aria-label="Current variables">
                  {Object.entries(vars).map(([k, v]) => (
                    <div key={k} className="flex items-center justify-between gap-1" role="listitem">
                      <span className="text-primary font-semibold">{k}</span>
                      <span className="text-muted-foreground truncate text-right">{v}</span>
                    </div>
                  ))}
                </div>
            }
          </div>

          {/* Examples */}
          <div className="flex-1 overflow-y-auto p-4" role="region" aria-labelledby="examples-label">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3" id="examples-label">Examples</p>
            <div className="space-y-1.5" role="list" aria-label="Example expressions">
              {EXAMPLES.map(ex => (
                <button
                  key={ex}
                  onClick={() => { setInput(ex); inputRef.current?.focus(); announceToScreenReader(`Loaded example: ${ex}`) }}
                  className="w-full text-left font-mono text-xs rounded border border-border/50 px-2 py-1.5 hover:border-primary/50 hover:bg-muted/30 transition-colors text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1"
                  role="listitem"
                  aria-label={`Example: ${ex}`}
                >
                  {ex}
                </button>
              ))}
            </div>
            <div className="mt-4 space-y-1.5" role="list" aria-label="Supported features">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Supported</p>
              {["Arithmetic · Algebra", "Trig · Logarithms", "Unit conversions", "Matrices · Stats", "Complex numbers"].map(t => (
                <Badge key={t} variant="outline" className="text-xs w-full justify-start font-normal" role="listitem">{t}</Badge>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  </>
  )
}