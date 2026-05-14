"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { Delete, RotateCcw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"

let mathRad: MathInst | null = null
let mathDeg: MathInst | null = null
type MathInst = { evaluate: (e: string, s?: Record<string, unknown>) => unknown }

type CalcEntry = { expr: string; result: string }
type RightTab = "graph" | "calculus" | "constants" | "history"

const CONSTANTS: Record<string, { value: number; label: string; desc: string }> = {
  c:    { value: 299792458,  label: "c",  desc: "Speed of light (m/s)"  },
  G:    { value: 6.674e-11,  label: "G",  desc: "Gravitational constant" },
  h:    { value: 6.626e-34,  label: "h",  desc: "Planck constant"        },
  hbar: { value: 1.0546e-34, label: "ℏ",  desc: "Reduced Planck"         },
  k_B:  { value: 1.381e-23,  label: "kB", desc: "Boltzmann constant"     },
  Na:   { value: 6.022e23,   label: "Nₐ", desc: "Avogadro's number"      },
  e_c:  { value: 1.602e-19,  label: "e",  desc: "Elementary charge (C)"  },
}

type BtnDef = { label: string; action: string; variant?: "primary" | "fn" | "op" | "num" | "eq"; shortcut?: string }

const BUTTONS: BtnDef[] = [
  { label: "sin",  action: "sin(",      variant: "fn", shortcut: "S" },
  { label: "cos",  action: "cos(",      variant: "fn", shortcut: "C" },
  { label: "tan",  action: "tan(",      variant: "fn", shortcut: "T" },
  { label: "asin", action: "asin(",     variant: "fn", shortcut:"A" },
  { label: "acos", action: "acos(",     variant: "fn", shortcut:"O" },
  { label: "atan", action: "atan(",     variant: "fn", shortcut:"N" },
  { label: "ln",   action: "log(",      variant: "fn", shortcut: "L" },
  { label: "log",  action: "log10(",    variant: "fn", shortcut: "G" },
  { label: "√x",   action: "sqrt(",     variant: "fn", shortcut: "Q" },
  { label: "x!",   action: "factorial(",variant: "fn" },
  { label: "x²",   action: "^2",        variant: "fn" },
  { label: "xⁿ",   action: "^",         variant: "op" },
  { label: "π",    action: "pi",        variant: "fn", shortcut: "P" },
  { label: "eˣ",   action: "exp(",      variant: "fn", shortcut: "E" },
  { label: "ANS",  action: "ANS",       variant: "fn" },
  { label: "(",    action: "(",         variant: "op" },
  { label: ")",    action: ")",         variant: "op" },
  { label: "%",    action: " mod ",     variant: "op" },
  { label: "C",    action: "__clear",   variant: "primary", shortcut: "Escape" },
  { label: "⌫",    action: "__back",    variant: "primary", shortcut: "Backspace" },
  { label: "7", action: "7", variant: "num" },
  { label: "8", action: "8", variant: "num" },
  { label: "9", action: "9", variant: "num" },
  { label: "÷", action: " / ", variant: "op" },
  { label: "±", action: "(-1)*(", variant: "op" },
  { label: "4", action: "4", variant: "num" },
  { label: "5", action: "5", variant: "num" },
  { label: "6", action: "6", variant: "num" },
  { label: "×", action: " * ", variant: "op" },
  { label: "abs", action: "abs(", variant: "fn" },
  { label: "1", action: "1", variant: "num" },
  { label: "2", action: "2", variant: "num" },
  { label: "3", action: "3", variant: "num" },
  { label: "+", action: " + ", variant: "op" },
  { label: "−", action: " - ", variant: "op" },
  { label: "0",  action: "0",        variant: "num" },
  { label: ".",  action: ".",        variant: "num" },
  { label: "EE", action: "e",        variant: "fn"  },
  { label: "1/x",action: "1/(",      variant: "fn"  },
  { label: "=",  action: "__eval",   variant: "eq", shortcut: "Enter" },
]

function getConstantScope() {
  return Object.fromEntries(Object.entries(CONSTANTS).map(([k, v]) => [k, v.value]))
}

function formatNum(val: unknown): string {
  if (typeof val === "number") {
    if (!isFinite(val)) return String(val)
    return parseFloat(val.toPrecision(12)).toString()
  }
  return String(val)
}

function niceStep(range: number, targetSteps: number): number {
  if (range <= 0 || targetSteps <= 0) return 1
  const rough = range / targetSteps
  const power = Math.pow(10, Math.floor(Math.log10(rough)))
  const norm  = rough / power
  const nice  = norm < 1.5 ? 1 : norm < 3 ? 2 : norm < 7 ? 5 : 10
  return nice * power
}

function simpsonIntegral(fn: (x: number) => number, a: number, b: number, n = 1000): number {
  if (n % 2 !== 0) n++
  const h = (b - a) / n
  let s = fn(a) + fn(b)
  for (let i = 1; i < n; i++) s += (i % 2 === 0 ? 2 : 4) * fn(a + i * h)
  return (h / 3) * s
}

function centralDiff(fn: (x: number) => number, x: number): number {
  const h = 1e-7
  return (fn(x + h) - fn(x - h)) / (2 * h)
}

export default function EngineeringCalculator() {
  // ── Calculator state ──
  const [expr, setExpr]       = useState("")
  const [display, setDisplay] = useState("0")
  const [history, setHistory] = useState<CalcEntry[]>([])
  const [ans, setAns]         = useState(0)
  const [isDeg, setIsDeg]     = useState(true)
  const [ready, setReady]     = useState(false)
  const [error, setError]     = useState(false)
  const [mem, setMem]         = useState(0)
  const [rightTab, setRightTab] = useState<RightTab>("graph")
  const [panelTab, setPanelTab] = useState<"input" | "output">("input")

  // ── Graph state ──
  const [graphFn, setGraphFn]     = useState("sin(x)")
  const [graphXMin, setGraphXMin] = useState("-10")
  const [graphXMax, setGraphXMax] = useState("10")
  const [graphError, setGraphError] = useState("")
  const canvasRef   = useRef<HTMLCanvasElement>(null)
  const graphBoxRef = useRef<HTMLDivElement>(null)

  // ── Calculus state ──
  const [intFn, setIntFn]           = useState("sin(x)")
  const [intA, setIntA]             = useState("0")
  const [intB, setIntB]             = useState("pi")
  const [intResult, setIntResult]   = useState<string | null>(null)
  const [intError, setIntError]     = useState("")
  const [dFn, setDFn]               = useState("x^2")
  const [dX, setDX]                 = useState("2")
  const [dResult, setDResult]       = useState<string | null>(null)
  const [dError, setDError]         = useState("")

  // ── Load mathjs ──
  useEffect(() => {
    import("mathjs").then(m => {
      const { create, all } = m as typeof import("mathjs")
      mathRad = create(all) as MathInst
      mathDeg = create(all) as MathInst
      ;(mathDeg as unknown as { import: (fns: Record<string, unknown>, o: object) => void }).import({
        sin:   (x: number) => Math.sin((x * Math.PI) / 180),
        cos:   (x: number) => Math.cos((x * Math.PI) / 180),
        tan:   (x: number) => Math.tan((x * Math.PI) / 180),
        asin:  (x: number) => (Math.asin(x) * 180) / Math.PI,
        acos:  (x: number) => (Math.acos(x) * 180) / Math.PI,
        atan:  (x: number) => (Math.atan(x) * 180) / Math.PI,
        log10: (x: number) => Math.log10(x),
      }, { override: true })
      setReady(true)
    })
  }, [])

  // ── Graph drawing ──
  const drawGraph = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas || !mathRad) return
    const W = canvas.width
    const H = canvas.height
    if (W === 0 || H === 0) return

    const xMin = parseFloat(graphXMin)
    const xMax = parseFloat(graphXMax)
    if (isNaN(xMin) || isNaN(xMax) || xMin >= xMax) return

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    const scope: Record<string, unknown> = { ...getConstantScope() }
    const evalAt = (x: number): number | null => {
      scope.x = x
      try {
        const r = mathRad!.evaluate(graphFn, scope)
        return typeof r === "number" && isFinite(r) ? r : null
      } catch { return null }
    }

    // Collect y values for auto-scale (sample every 2px)
    const ys: number[] = []
    for (let px = 0; px <= W; px += 2) {
      const v = evalAt(xMin + (px / W) * (xMax - xMin))
      if (v !== null) ys.push(v)
    }

    if (ys.length === 0) { setGraphError("Cannot evaluate function"); return }
    setGraphError("")

    let yMin = Math.min(...ys)
    let yMax = Math.max(...ys)
    if (yMin === yMax) { yMin -= 1; yMax += 1 }
    const yPad = (yMax - yMin) * 0.12
    yMin -= yPad; yMax += yPad

    const toCx = (x: number) => ((x - xMin) / (xMax - xMin)) * W
    const toCy = (y: number) => H - ((y - yMin) / (yMax - yMin)) * H

    // Background
    ctx.fillStyle = "#0d1117"
    ctx.fillRect(0, 0, W, H)

    // Grid lines
    const gx = niceStep(xMax - xMin, 6)
    const gy = niceStep(yMax - yMin, 5)
    ctx.strokeStyle = "#1e2d3d"
    ctx.lineWidth = 1
    ctx.beginPath()
    for (let x = Math.ceil(xMin / gx) * gx; x <= xMax + gx * 0.01; x += gx) {
      ctx.moveTo(toCx(x), 0); ctx.lineTo(toCx(x), H)
    }
    for (let y = Math.ceil(yMin / gy) * gy; y <= yMax + gy * 0.01; y += gy) {
      ctx.moveTo(0, toCy(y)); ctx.lineTo(W, toCy(y))
    }
    ctx.stroke()

    // Axes
    ctx.strokeStyle = "#334155"
    ctx.lineWidth = 1.5
    ctx.beginPath()
    if (yMin <= 0 && yMax >= 0) { ctx.moveTo(0, toCy(0)); ctx.lineTo(W, toCy(0)) }
    if (xMin <= 0 && xMax >= 0) { ctx.moveTo(toCx(0), 0); ctx.lineTo(toCx(0), H) }
    ctx.stroke()

    // Axis labels
    ctx.fillStyle = "#64748b"
    ctx.font = "10px ui-monospace, monospace"
    ctx.textAlign = "center"
    for (let x = Math.ceil(xMin / gx) * gx; x <= xMax + gx * 0.01; x += gx) {
      if (Math.abs(x) < gx * 0.01) continue
      const lx = toCx(x)
      const ly = yMin <= 0 && yMax >= 0 ? Math.min(toCy(0) + 12, H - 4) : H - 4
      ctx.fillText(parseFloat(x.toPrecision(4)).toString(), lx, ly)
    }
    ctx.textAlign = "right"
    for (let y = Math.ceil(yMin / gy) * gy; y <= yMax + gy * 0.01; y += gy) {
      if (Math.abs(y) < gy * 0.01) continue
      const ly = toCy(y)
      const lx = xMin <= 0 && xMax >= 0 ? Math.max(toCx(0) - 4, 28) : W - 4
      ctx.fillText(parseFloat(y.toPrecision(4)).toString(), lx, ly + 3)
    }

    // Function curve
    ctx.strokeStyle = "#38bdf8"
    ctx.lineWidth = 2
    ctx.shadowColor = "#38bdf860"
    ctx.shadowBlur = 6
    ctx.beginPath()
    let pen = false
    let prevPy = 0
    for (let px = 0; px <= W; px++) {
      const v = evalAt(xMin + (px / W) * (xMax - xMin))
      if (v !== null) {
        const py = toCy(v)
        if (pen && Math.abs(py - prevPy) > H * 0.6) {
          ctx.stroke(); ctx.beginPath(); pen = false
        }
        if (!pen) { ctx.moveTo(px, py); pen = true } else { ctx.lineTo(px, py) }
        prevPy = py
      } else {
        if (pen) { ctx.stroke(); ctx.beginPath(); pen = false }
      }
    }
    if (pen) ctx.stroke()
    ctx.shadowBlur = 0
  }, [graphFn, graphXMin, graphXMax])

  // Resize canvas to container
  useEffect(() => {
    const box = graphBoxRef.current
    const cnv = canvasRef.current
    if (!box || !cnv) return
    const ro = new ResizeObserver(() => {
      cnv.width  = box.clientWidth
      cnv.height = box.clientHeight
      drawGraph()
    })
    ro.observe(box)
    cnv.width  = box.clientWidth
    cnv.height = box.clientHeight
    return () => ro.disconnect()
  }, [drawGraph])

  useEffect(() => {
    if (ready && rightTab === "graph") drawGraph()
  }, [ready, rightTab, drawGraph])

  // ── Bound parser using mathjs (supports "pi", "pi/2", "e", expressions) ──
  const parseBound = (s: string): number => {
    if (!mathRad) return NaN
    try {
      const r = mathRad.evaluate(s.trim(), getConstantScope())
      return typeof r === "number" ? r : NaN
    } catch { return NaN }
  }

  const computeIntegral = () => {
    if (!mathRad) return
    const a = parseBound(intA)
    const b = parseBound(intB)
    if (isNaN(a) || isNaN(b)) { setIntError("Invalid bounds"); return }
    const sc = getConstantScope()
    const fn = (x: number): number => {
      try {
        const r = mathRad!.evaluate(intFn, { ...sc, x })
        return typeof r === "number" ? r : NaN
      } catch { return NaN }
    }
    try {
      setIntResult(formatNum(simpsonIntegral(fn, a, b)))
      setIntError("")
    } catch { setIntError("Evaluation failed") }
  }

  const computeDerivative = () => {
    if (!mathRad) return
    const xVal = parseBound(dX)
    if (isNaN(xVal)) { setDError("Invalid x"); return }
    const sc = getConstantScope()
    const fn = (x: number): number => {
      try {
        const r = mathRad!.evaluate(dFn, { ...sc, x })
        return typeof r === "number" ? r : NaN
      } catch { return NaN }
    }
    try {
      setDResult(formatNum(centralDiff(fn, xVal)))
      setDError("")
    } catch { setDError("Evaluation failed") }
  }

  // ── Main calculator eval ──
  const evalExpr = useCallback((rawExpr: string) => {
    const math = isDeg ? mathDeg : mathRad
    if (!math) return
    const scope: Record<string, unknown> = { ANS: ans, ...getConstantScope() }
    try {
      const result    = math.evaluate(rawExpr, scope)
      const resultStr = formatNum(result)
      const num       = parseFloat(resultStr)
      if (!isNaN(num)) setAns(num)
      setDisplay(resultStr)
      setHistory(h => [{ expr: rawExpr, result: resultStr }, ...h.slice(0, 49)])
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
    setExpr(e => e + action)
    setError(false)
  }, [expr, evalExpr])

  const btnClass = (v: BtnDef["variant"]) => {
    const base = "h-10 w-full rounded-lg text-sm font-medium transition-all active:scale-95 select-none border relative"
    if (v === "eq")      return `${base} bg-primary text-primary-foreground border-primary hover:opacity-90`
    if (v === "primary") return `${base} bg-destructive/80 text-white border-destructive/80 hover:bg-destructive`
    if (v === "fn")      return `${base} bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-900 hover:bg-blue-100 dark:hover:bg-blue-900/40`
    if (v === "op")      return `${base} bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-900 hover:bg-amber-100`
    return `${base} bg-card border-border hover:bg-muted/50`
  }

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement) return
      
      const key = e.key.toUpperCase()
      const shortcutMap: Record<string, string> = {
        "S": "sin(", "C": "cos(", "T": "tan(", "A": "asin(", "O": "acos(", "N": "atan(",
        "L": "log(", "G": "log10(", "Q": "sqrt(", "P": "pi", "E": "exp(",
        "ENTER": "__eval", "ESCAPE": "__clear", "BACKSPACE": "__back",
      }
      
      if (shortcutMap[key]) {
        e.preventDefault()
        handleBtn(shortcutMap[key])
        announceToScreenReader(`${key} pressed`)
      }
      
      if (/^[0-9.+\-*/()%]$/.test(e.key)) {
        e.preventDefault()
        handleBtn(e.key)
      }
    }
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [handleBtn])

  // Accessibility helper
  const announceToScreenReader = (message: string) => {
    const el = document.createElement('div')
    el.setAttribute('role', 'status')
    el.setAttribute('aria-live', 'polite')
    el.className = 'sr-only'
    el.textContent = message
    document.body.appendChild(el)
    setTimeout(() => document.body.removeChild(el), 1000)
  }

  // Tab switching with keyboard
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement) return
      if (e.ctrlKey || e.metaKey || e.altKey) return
      
      if (/^[1-4]$/.test(e.key)) {
        e.preventDefault()
        const idx = parseInt(e.key) - 1
        setRightTab(TABS[idx].id)
        announceToScreenReader(`Switched to ${TABS[idx].label}`)
      }
    }
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [])

  const TABS: { id: RightTab; label: string; shortcut: string }[] = [
    { id: "graph",      label: "Graph",     shortcut: "1" },
    { id: "calculus",   label: "Calculus",  shortcut: "2" },
    { id: "constants", label: "Constants", shortcut: "3" },
    { id: "history",    label: "History",   shortcut: "4" },
  ]

  return (
    <div className="flex flex-1 flex-col min-h-0">

      {/* ── Desktop: top action bar ── */}
      <div className="hidden md:flex shrink-0 items-center gap-2 border-b border-border bg-card/95 backdrop-blur-sm px-4 py-2">
        <span className="text-sm font-semibold shrink-0">Engineering Calculator</span>
        {!ready && <span className="ml-2 text-xs text-muted-foreground">Loading…</span>}
      </div>

      {/* ── Mobile: compact header + tab switcher ── */}
      <div className="flex md:hidden flex-col shrink-0 border-b border-border">
        <div className="flex items-center justify-between px-4 pt-3 pb-1">
          <h2 className="text-base font-semibold">Engineering Calculator</h2>
          {!ready && <span className="text-xs text-muted-foreground">Loading…</span>}
        </div>
        <div className="flex" role="tablist" aria-label="Panel selection">
          <button role="tab" aria-selected={panelTab === "input"} onClick={() => setPanelTab("input")}
            className={`flex-1 py-2.5 text-sm font-medium border-b-2 transition-colors ${panelTab === "input" ? "border-primary text-foreground" : "border-transparent text-muted-foreground"}`}>
            Calculator
          </button>
          <button role="tab" aria-selected={panelTab === "output"} onClick={() => setPanelTab("output")}
            className={`flex-1 py-2.5 text-sm font-medium border-b-2 transition-colors ${panelTab === "output" ? "border-primary text-foreground" : "border-transparent text-muted-foreground"}`}>
            Graph & Tools
          </button>
        </div>
      </div>

      <div className="flex-1 min-h-0 flex flex-col md:flex-row overflow-hidden">

        {/* ── Left: Calculator ── */}
        <div className={`${panelTab === "input" ? "flex" : "hidden"} md:flex flex-1 flex-col min-h-0 overflow-hidden border-b md:border-b-0 md:border-r border-border bg-card`}>
          {/* Display */}
          <div className="shrink-0 p-4 bg-muted/20 border-b border-border" role="region" aria-label="Calculator display">
            <div className="flex items-center justify-between mb-2">
              <button
                onClick={() => setIsDeg(d => !d)}
                className={`text-xs px-3 py-1 rounded-full border font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-primary ${
                  isDeg ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground"
                }`}
                role="radio"
                aria-checked={isDeg}
                aria-label={isDeg ? "Degree mode" : "Radian mode"}
                title={isDeg ? "Switch to RAD" : "Switch to DEG"}
              >
                {isDeg ? "DEG" : "RAD"}<kbd className="ml-1.5 hidden md:inline text-[9px] opacity-50" aria-hidden="true">D</kbd>
              </button>
              <div className="flex gap-1" role="group" aria-label="Memory controls">
                <button onClick={() => setMem(m => m + (parseFloat(display) || 0))}
                  className="text-xs px-2 py-0.5 rounded border border-border text-muted-foreground hover:text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  title="Memory Add (M+)">M+</button>
                <button onClick={() => setExpr(e => e + mem.toString())}
                  className="text-xs px-2 py-0.5 rounded border border-border text-muted-foreground hover:text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  title="Memory Recall (MR)">MR</button>
                <button onClick={() => setMem(0)}
                  className="text-xs px-2 py-0.5 rounded border border-border text-muted-foreground hover:text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  title="Memory Clear (MC)">MC</button>
              </div>
            </div>
            <div className="text-right font-mono text-sm text-muted-foreground truncate min-h-[1.25rem]" aria-live="polite" aria-atomic="true">{expr || " "}</div>
            <div className={`text-right font-mono text-2xl font-semibold mt-1 ${error ? "text-destructive" : "text-foreground"}`} role="status" aria-live="polite">
              {display}
            </div>
          </div>

          {/* Buttons */}
          <div className="flex-1 overflow-y-auto p-3" role="group" aria-label="Calculator keypad">
            <div className="grid grid-cols-5 gap-1.5">
              {BUTTONS.map((btn, i) => (
                <button 
                  key={i} 
                  onClick={() => handleBtn(btn.action)} 
                  disabled={!ready}
                  className={btnClass(btn.variant)}
                  aria-label={btn.label}
                  title={btn.shortcut ? `Shortcut: ${btn.shortcut}` : undefined}
                >
                  <span className="relative inline-flex items-center justify-center w-full h-full">
                    {btn.label === "⌫" ? <Delete className="h-4 w-4 mx-auto" /> : btn.label}
                    {btn.shortcut && (
                      <kbd className="absolute -bottom-0.5 -right-0.5 text-[7px] opacity-40 font-mono" aria-hidden="true">
                        {btn.shortcut}
                      </kbd>
                    )}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* ── Right: Tabs ── */}
        <div className={`${panelTab === "output" ? "flex" : "hidden"} md:flex flex-1 flex-col min-h-0 overflow-hidden bg-card`}>

          {/* Tab bar */}
          <div className="flex shrink-0 border-b border-border" role="tablist" aria-label="Right panel sections">
            {TABS.map((t, idx) => (
              <button 
                key={t.id} 
                onClick={() => setRightTab(t.id)}
                className={`flex-1 py-2.5 text-xs font-medium transition-colors relative ${
                  rightTab === t.id
                    ? "text-foreground border-b-2 border-primary bg-muted/30"
                    : "text-muted-foreground hover:text-foreground"
                }`}
                role="tab"
                aria-selected={rightTab === t.id}
                aria-label={`${t.label} (press ${t.shortcut})`}
                title={`Press ${t.shortcut} to switch`}
              >
                {t.label}
                <kbd className="ml-1 hidden md:inline text-[9px] opacity-50" aria-hidden="true">{t.shortcut}</kbd>
              </button>
            ))}
          </div>

          {/* ── Graph tab ── */}
          {rightTab === "graph" && (
            <div className="flex flex-col flex-1 min-h-0 p-3 gap-2" role="region" aria-label="Function Grapher">
              <div className="flex gap-2 items-end shrink-0">
                <div className="flex-1">
                  <label htmlFor="graph-fn" className="text-xs text-muted-foreground block mb-1">f(x) =</label>
                  <Input
                    id="graph-fn"
                    value={graphFn}
                    onChange={e => setGraphFn(e.target.value)}
                    onKeyDown={e => e.key === "Enter" && drawGraph()}
                    className="font-mono text-sm h-8"
                    placeholder="sin(x)"
                    aria-label="Function to graph"
                  />
                </div>
                <Button size="sm" onClick={drawGraph} disabled={!ready} className="h-8 shrink-0">Plot</Button>
              </div>
              <div className="flex gap-2 shrink-0">
                <div className="flex-1">
                  <label htmlFor="graph-xmin" className="text-xs text-muted-foreground block mb-1">x min</label>
                  <Input id="graph-xmin" value={graphXMin} onChange={e => setGraphXMin(e.target.value)} className="h-8 text-sm font-mono" aria-label="X minimum value" />
                </div>
                <div className="flex-1">
                  <label htmlFor="graph-xmax" className="text-xs text-muted-foreground block mb-1">x max</label>
                  <Input id="graph-xmax" value={graphXMax} onChange={e => setGraphXMax(e.target.value)} className="h-8 text-sm font-mono" aria-label="X maximum value" />
                </div>
              </div>
              {graphError && <p className="text-xs text-destructive shrink-0" role="alert">{graphError}</p>}
              <div ref={graphBoxRef} className="flex-1 min-h-0 rounded-lg overflow-hidden" role="img" aria-label="Function graph visualization">
                <canvas ref={canvasRef} aria-label={`Graph of ${graphFn}`} />
              </div>
              <p className="text-xs text-muted-foreground shrink-0 text-center">
                Use <code className="bg-muted px-1 rounded" aria-label="variable x">x</code> as variable · e.g.{" "}
                <code className="bg-muted px-1 rounded">x^2 - 3*x + 2</code>
              </p>
            </div>
          )}

          {/* ── Calculus tab ── */}
          {rightTab === "calculus" && (
            <div className="flex-1 overflow-y-auto p-4 space-y-5" role="region" aria-label="Calculus tools">

              {/* Definite Integral */}
              <div className="space-y-3">
                <h3 className="text-sm font-semibold flex items-center gap-2">
                  <span className="text-lg leading-none font-normal" aria-hidden="true">∫</span>
                  Definite Integral
                </h3>
                <div className="space-y-2">
                  <div>
                    <label htmlFor="int-fn" className="text-xs text-muted-foreground block mb-1">f(x) =</label>
                    <Input id="int-fn" value={intFn} onChange={e => setIntFn(e.target.value)}
                      className="font-mono text-sm h-8" placeholder="sin(x)" aria-label="Integrand function" />
                  </div>
                  <div className="flex gap-2">
                    <div className="flex-1">
                      <label htmlFor="int-a" className="text-xs text-muted-foreground block mb-1">Lower bound (a)</label>
                      <Input id="int-a" value={intA} onChange={e => setIntA(e.target.value)} className="h-8 text-sm font-mono" aria-label="Lower bound" />
                    </div>
                    <div className="flex-1">
                      <label htmlFor="int-b" className="text-xs text-muted-foreground block mb-1">Upper bound (b)</label>
                      <Input id="int-b" value={intB} onChange={e => setIntB(e.target.value)} className="h-8 text-sm font-mono" aria-label="Upper bound" />
                    </div>
                  </div>
                  <Button size="sm" onClick={computeIntegral} disabled={!ready} className="w-full h-8">
                    Compute ∫ f(x) dx
                  </Button>
                  {intError && <p className="text-xs text-destructive" role="alert">{intError}</p>}
                  {intResult !== null && (
                    <div className="rounded-lg bg-muted/40 border border-border px-4 py-3" role="status" aria-live="polite">
                      <p className="text-xs text-muted-foreground">
                        ∫ ({intFn}) dx from {intA} to {intB}
                      </p>
                      <p className="text-xl font-mono font-bold text-primary mt-1">≈ {intResult}</p>
                    </div>
                  )}
                  <p className="text-xs text-muted-foreground">
                    Bounds support expressions: <code className="bg-muted px-1 rounded">pi</code>,{" "}
                    <code className="bg-muted px-1 rounded">pi/2</code>,{" "}
                    <code className="bg-muted px-1 rounded">sqrt(2)</code>
                  </p>
                </div>
              </div>

              <div className="border-t border-border" />

              {/* Derivative at point */}
              <div className="space-y-3">
                <h3 className="text-sm font-semibold flex items-center gap-2">
                  <span className="text-sm font-bold leading-none" aria-label="derivative">d/dx</span>
                  Derivative at Point
                  <span className="text-xs text-muted-foreground font-normal">(numerical)</span>
                </h3>
                <div className="space-y-2">
                  <div>
                    <label htmlFor="d-fn" className="text-xs text-muted-foreground block mb-1">f(x) =</label>
                    <Input id="d-fn" value={dFn} onChange={e => setDFn(e.target.value)}
                      className="font-mono text-sm h-8" placeholder="x^2" aria-label="Function to differentiate" />
                  </div>
                  <div>
                    <label htmlFor="d-x" className="text-xs text-muted-foreground block mb-1">x =</label>
                    <Input id="d-x" value={dX} onChange={e => setDX(e.target.value)}
                      className="h-8 text-sm font-mono" aria-label="Point at which to evaluate derivative" />
                  </div>
                  <Button size="sm" onClick={computeDerivative} disabled={!ready} className="w-full h-8">
                    Compute f′(x)
                  </Button>
                  {dError && <p className="text-xs text-destructive" role="alert">{dError}</p>}
                  {dResult !== null && (
                    <div className="rounded-lg bg-muted/40 border border-border px-4 py-3" role="status" aria-live="polite">
                      <p className="text-xs text-muted-foreground">f′({dX}) for f(x) = {dFn}</p>
                      <p className="text-xl font-mono font-bold text-primary mt-1">≈ {dResult}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ── Constants tab ── */}
          {rightTab === "constants" && (
            <div className="flex-1 overflow-y-auto p-4" role="region" aria-label="Physical constants">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
                Physical Constants — click to insert
              </p>
              <div className="grid grid-cols-2 gap-1.5" role="listbox" aria-label="Constants list">
                {Object.entries(CONSTANTS).map(([key, c]) => (
                  <button 
                    key={key} 
                    onClick={() => setExpr(e => e + key)} 
                    disabled={!ready}
                    className="text-left rounded-lg border border-border px-3 py-2 hover:border-primary/50 hover:bg-muted/30 transition-colors focus:outline-none focus:ring-2 focus:ring-primary"
                    role="option"
                    aria-label={`${c.label}: ${c.desc}, value ${c.value.toExponential(3)}`}
                  >
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs font-mono shrink-0">{c.label}</Badge>
                      <span className="text-xs text-muted-foreground truncate">{c.desc}</span>
                    </div>
                    <p className="text-xs font-mono text-primary mt-0.5">{c.value.toExponential(3)}</p>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* ── History tab ── */}
          {rightTab === "history" && (
            <div className="flex-1 overflow-y-auto p-4" role="region" aria-label="Calculation history">
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">History</p>
                {history.length > 0 && (
                  <button 
                    onClick={() => setHistory([])}
                    className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 focus:outline-none focus:ring-2 focus:ring-primary rounded"
                    aria-label="Clear history"
                  >
                    <RotateCcw className="h-3 w-3" />Clear
                  </button>
                )}
              </div>
              {history.length === 0
                ? <p className="text-xs text-muted-foreground italic">No calculations yet</p>
                : (
                  <div className="space-y-1.5" role="list" aria-label="Calculation results">
                    {history.map((h, i) => (
                      <button 
                        key={i} 
                        onClick={() => setExpr(h.result)}
                        className="w-full text-left font-mono text-xs rounded border border-border/50 px-3 py-2 hover:border-primary/40 hover:bg-muted/20 transition-colors focus:outline-none focus:ring-2 focus:ring-primary"
                        role="listitem"
                        aria-label={`Expression: ${h.expr}, result: ${h.result}`}
                      >
                        <div className="text-muted-foreground truncate">{h.expr}</div>
                        <div className="text-primary font-semibold">= {h.result}</div>
                      </button>
                    ))}
                  </div>
                )
              }
            </div>
          )}

        </div>
      </div>
    </div>
  )
}
