"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { RefreshCw, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"

// ─── Types ────────────────────────────────────────────────────────────────────
interface Solve {
  id: string
  ms: number
  penalty: "none" | "+2" | "dnf"
  scramble: string
}

// Phases:
//   idle / stopped       → no inspection: hold space → holding → ready → release → running
//                        → with inspection: press space → inspecting (countdown)
//   inspecting           → press/hold space: insp-holding → 300ms → insp-ready → release → running
//                          quick release (< 300ms) during insp-holding → also starts timer
//   running              → press space → stopped
type Phase =
  | "idle"
  | "holding"       // held from idle, building to ready (no inspection)
  | "ready"         // held ≥300ms from idle, green → release to start
  | "inspecting"    // 15s countdown running
  | "insp-holding"  // held during inspection, building to ready
  | "insp-ready"    // held ≥300ms during inspection, green → release to start
  | "running"
  | "stopped"

// ─── Scramble ─────────────────────────────────────────────────────────────────
const FACES = ["U", "D", "L", "R", "F", "B"]
const MODS = ["", "'", "2"]
const OPP: Record<string, string> = { U: "D", D: "U", L: "R", R: "L", F: "B", B: "F" }

function genScramble(len = 20): string {
  const moves: string[] = []
  let last = "", prev = ""
  for (let i = 0; i < len; i++) {
    let face: string
    do { face = FACES[Math.floor(Math.random() * 6)] }
    while (face === last || (OPP[face] === last && face === prev))
    moves.push(face + MODS[Math.floor(Math.random() * 3)])
    prev = last; last = face
  }
  return moves.join(" ")
}

// ─── Formatting ───────────────────────────────────────────────────────────────
function fmt(ms: number): string {
  if (ms <= 0) return "0.00"
  const min = Math.floor(ms / 60000)
  const sec = Math.floor((ms % 60000) / 1000)
  const cs = Math.floor((ms % 1000) / 10)
  return min > 0
    ? `${min}:${sec.toString().padStart(2, "0")}.${cs.toString().padStart(2, "0")}`
    : `${sec}.${cs.toString().padStart(2, "0")}`
}

function fmtSolve(s: Solve): string {
  if (s.penalty === "dnf") return "DNF"
  const ms = s.penalty === "+2" ? s.ms + 2000 : s.ms
  return fmt(ms) + (s.penalty === "+2" ? "+" : "")
}

function effectiveMs(s: Solve): number | null {
  if (s.penalty === "dnf") return null
  return s.penalty === "+2" ? s.ms + 2000 : s.ms
}

// ─── Stats ────────────────────────────────────────────────────────────────────
function calcBest(solves: Solve[]): string {
  const valid = solves.map(effectiveMs).filter((ms): ms is number => ms !== null)
  return valid.length ? fmt(Math.min(...valid)) : "--"
}

function calcAo(solves: Solve[], n: number): string {
  if (solves.length < n) return "--"
  const last = solves.slice(-n)
  const effs = last.map(effectiveMs)
  const dnfCount = effs.filter(ms => ms === null).length
  if (dnfCount > 1) return "DNF"
  const sorted = effs.map(ms => ms ?? Infinity).sort((a, b) => a - b)
  const trimmed = sorted.slice(1, -1)
  if (trimmed.includes(Infinity)) return "DNF"
  return fmt(trimmed.reduce((a, b) => a + b, 0) / trimmed.length)
}

// ─── localStorage ─────────────────────────────────────────────────────────────
const STORAGE_KEY = "creatorkit-rubiks-session"
const INSP_KEY = "creatorkit-rubiks-inspection"

function loadSolves(): Solve[] {
  if (typeof window === "undefined") return []
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]") } catch { return [] }
}

function saveSolves(solves: Solve[]) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(solves)) } catch { /* ignore */ }
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function RubiksTimer() {
  const [scramble, setScramble] = useState("")
  const [phase, setPhase] = useState<Phase>("idle")
  const [displayMs, setDisplayMs] = useState(0)
  const [inspSecs, setInspSecs] = useState(15)
  const [inspEnabled, setInspEnabled] = useState(true)
  const [solves, setSolves] = useState<Solve[]>([])
  const [lastSolveId, setLastSolveId] = useState<string | null>(null)

  // Refs — keep values accessible inside stable callbacks without stale closures
  const phaseRef = useRef<Phase>("idle")
  const startRef = useRef(0)
  const rafRef = useRef(0)
  const isRunningRef = useRef(false)
  const holdTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const inspTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const scrambleRef = useRef("")
  const inspEnabledRef = useRef(true)

  useEffect(() => { phaseRef.current = phase }, [phase])
  useEffect(() => { scrambleRef.current = scramble }, [scramble])
  useEffect(() => { inspEnabledRef.current = inspEnabled }, [inspEnabled])

  // Load from localStorage on mount
  useEffect(() => {
    setSolves(loadSolves())
    setScramble(genScramble())
    const savedInsp = localStorage.getItem(INSP_KEY)
    if (savedInsp !== null) setInspEnabled(savedInsp === "true")
  }, [])

  // Save inspection preference
  const toggleInspection = (val: boolean) => {
    setInspEnabled(val)
    localStorage.setItem(INSP_KEY, String(val))
  }

  // ─── Timer core ─────────────────────────────────────────────────────────────
  const tick = useCallback(() => {
    if (!isRunningRef.current) return
    setDisplayMs(Date.now() - startRef.current)
    rafRef.current = requestAnimationFrame(tick)
  }, [])

  const startTimer = useCallback(() => {
    clearInterval(inspTimerRef.current!)
    startRef.current = Date.now()
    isRunningRef.current = true
    setPhase("running")
    phaseRef.current = "running"
    rafRef.current = requestAnimationFrame(tick)
  }, [tick])

  const stopTimer = useCallback(() => {
    isRunningRef.current = false
    cancelAnimationFrame(rafRef.current)
    const elapsed = Date.now() - startRef.current
    setDisplayMs(elapsed)
    const id = crypto.randomUUID()
    const newSolve: Solve = { id, ms: elapsed, penalty: "none", scramble: scrambleRef.current }
    setSolves(prev => { const u = [...prev, newSolve]; saveSolves(u); return u })
    setLastSolveId(id)
    setPhase("stopped")
    phaseRef.current = "stopped"
    setScramble(genScramble())
  }, [])

  // ─── Inspection ─────────────────────────────────────────────────────────────
  const startInspection = useCallback(() => {
    clearInterval(inspTimerRef.current!)
    setInspSecs(15)
    setDisplayMs(0)
    setLastSolveId(null)
    setPhase("inspecting")
    phaseRef.current = "inspecting"
    inspTimerRef.current = setInterval(() => {
      setInspSecs(prev => {
        if (prev <= 1) {
          clearInterval(inspTimerRef.current!)
          startTimer()
          return 0
        }
        return prev - 1
      })
    }, 1000)
  }, [startTimer])

  // ─── Keyboard handler ────────────────────────────────────────────────────────
  useEffect(() => {
    const onDown = (e: KeyboardEvent) => {
      if (e.code !== "Space" || e.repeat) return
      e.preventDefault()
      const p = phaseRef.current

      // Always: space stops the timer
      if (p === "running") { stopTimer(); return }

      // From idle / stopped
      if (p === "idle" || p === "stopped") {
        if (inspEnabledRef.current) {
          // Single press → start 15s inspection immediately
          startInspection()
        } else {
          // No inspection: begin hold mechanic
          setLastSolveId(null)
          setDisplayMs(0)
          setPhase("holding")
          phaseRef.current = "holding"
          holdTimerRef.current = setTimeout(() => {
            setPhase("ready")
            phaseRef.current = "ready"
          }, 300)
        }
        return
      }

      // During inspection: press starts hold mechanic (quick release = instant start)
      if (p === "inspecting") {
        setPhase("insp-holding")
        phaseRef.current = "insp-holding"
        holdTimerRef.current = setTimeout(() => {
          setPhase("insp-ready")
          phaseRef.current = "insp-ready"
        }, 300)
      }
    }

    const onUp = (e: KeyboardEvent) => {
      if (e.code !== "Space") return
      e.preventDefault()
      const p = phaseRef.current

      if (p === "holding") {
        // Released too fast from idle → cancel
        clearTimeout(holdTimerRef.current!)
        setPhase("idle")
        phaseRef.current = "idle"
      } else if (p === "ready") {
        // Held long enough from idle → start!
        startTimer()
      } else if (p === "insp-holding") {
        // Quick tap during inspection → start immediately
        clearTimeout(holdTimerRef.current!)
        startTimer()
      } else if (p === "insp-ready") {
        // Held long enough during inspection → start!
        startTimer()
      }
    }

    window.addEventListener("keydown", onDown)
    window.addEventListener("keyup", onUp)
    return () => {
      window.removeEventListener("keydown", onDown)
      window.removeEventListener("keyup", onUp)
    }
  }, [startTimer, stopTimer, startInspection])

  // Cleanup on unmount
  useEffect(() => () => {
    isRunningRef.current = false
    cancelAnimationFrame(rafRef.current)
    clearTimeout(holdTimerRef.current!)
    clearInterval(inspTimerRef.current!)
  }, [])

  // ─── Actions ─────────────────────────────────────────────────────────────────
  const setPenalty = (id: string, penalty: Solve["penalty"]) => {
    setSolves(prev => { const u = prev.map(s => s.id === id ? { ...s, penalty } : s); saveSolves(u); return u })
  }

  const deleteSolve = (id: string) => {
    setSolves(prev => { const u = prev.filter(s => s.id !== id); saveSolves(u); return u })
    if (lastSolveId === id) setLastSolveId(null)
  }

  const clearSession = () => { setSolves([]); saveSolves([]); setLastSolveId(null) }

  // ─── Display ─────────────────────────────────────────────────────────────────
  const isInspPhase = phase === "inspecting" || phase === "insp-holding" || phase === "insp-ready"

  const timerDisplay = isInspPhase ? String(inspSecs) : fmt(displayMs)

  const timerColor =
    phase === "holding"      ? "text-red-500" :
    phase === "ready"        ? "text-green-500" :
    phase === "inspecting"   ? "text-yellow-500" :
    phase === "insp-holding" ? "text-orange-500" :
    phase === "insp-ready"   ? "text-green-500" :
    "text-foreground"

  const hint = (() => {
    if (phase === "idle" || phase === "stopped")
      return inspEnabled ? "Press Space to start 15s inspection" : "Hold Space to get ready"
    if (phase === "holding")      return "Keep holding…"
    if (phase === "ready")        return "Release Space to start!"
    if (phase === "inspecting")   return "Press Space to start · or hold Space → release"
    if (phase === "insp-holding") return "Keep holding…"
    if (phase === "insp-ready")   return "Release Space to start!"
    if (phase === "running")      return "Press Space to stop"
    return "Hold Space for next solve"
  })()

  const lastSolve = lastSolveId ? solves.find(s => s.id === lastSolveId) : null

  return (
    <div className="h-screen flex flex-col bg-background select-none" tabIndex={-1}>
      {/* Header */}
      <div className="shrink-0 border-b border-border bg-background">
        <div className="flex items-center justify-between px-6 py-4">
          <div>
            <h1 className="text-xl font-semibold">Rubik's Cube Timer</h1>
            <p className="text-sm text-muted-foreground">
              {inspEnabled
                ? "Space → 15s inspect → Space/hold to start · Space to stop"
                : "Hold Space → release to start · Space to stop"}
            </p>
          </div>
          <div className="flex items-center gap-4">
            {/* Inspection toggle */}
            <div className="flex items-center gap-2">
              <Switch
                id="inspection-toggle"
                checked={inspEnabled}
                onCheckedChange={toggleInspection}
                disabled={phase === "running" || isInspPhase}
              />
              <Label htmlFor="inspection-toggle" className="text-sm cursor-pointer">
                15s Inspection
              </Label>
            </div>
            <Button
              variant="outline" size="sm"
              onClick={() => setScramble(genScramble())}
              disabled={phase === "running" || isInspPhase}
            >
              <RefreshCw className="h-4 w-4 mr-1" />New Scramble
            </Button>
          </div>
        </div>
      </div>

      {/* Scramble */}
      <div className="shrink-0 border-b border-border bg-muted/20 px-6 py-4">
        <p className="font-mono text-sm text-center tracking-widest leading-relaxed">
          {scramble || "Loading…"}
        </p>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Timer */}
        <div className="flex-1 flex flex-col items-center justify-center gap-5 p-8">
          {/* Big display */}
          <div
            className={`font-bold font-mono tabular-nums transition-colors cursor-pointer leading-none ${timerColor} ${isInspPhase ? "text-9xl" : "text-8xl"}`}
            onPointerDown={() => { if (phase === "running") stopTimer() }}
          >
            {timerDisplay}
          </div>

          {/* Inspection label */}
          {isInspPhase && (
            <p className="text-sm font-medium text-muted-foreground -mt-2">seconds remaining</p>
          )}

          {/* Hint */}
          <p className="text-sm text-muted-foreground">{hint}</p>

          {/* Penalty buttons */}
          {phase === "stopped" && lastSolve && (
            <div className="flex items-center gap-3">
              <span className="text-xs text-muted-foreground">Penalty:</span>
              {(["none", "+2", "dnf"] as const).map(p => (
                <button
                  key={p}
                  onClick={() => setPenalty(lastSolve.id, p)}
                  className={`text-xs px-3 py-1.5 rounded-full border font-semibold uppercase tracking-wide transition-colors ${
                    lastSolve.penalty === p
                      ? p === "dnf" ? "bg-destructive text-destructive-foreground border-destructive"
                      : p === "+2"  ? "bg-yellow-500 text-white border-yellow-500"
                      :               "bg-primary text-primary-foreground border-primary"
                      : "border-border text-muted-foreground hover:border-primary/40"
                  }`}
                >
                  {p === "none" ? "OK" : p}
                </button>
              ))}
              <span className="text-sm font-mono ml-2 text-muted-foreground">
                {fmtSolve(lastSolve)}
              </span>
            </div>
          )}

          {/* Stats */}
          <div className="flex gap-10 text-center mt-6">
            {[
              { label: "Best",  value: calcBest(solves) },
              { label: "Ao5",   value: calcAo(solves, 5) },
              { label: "Ao12",  value: calcAo(solves, 12) },
              { label: "Count", value: String(solves.length) },
            ].map(({ label, value }) => (
              <div key={label}>
                <p className="text-2xl font-mono font-bold">{value}</p>
                <p className="text-xs text-muted-foreground mt-1">{label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Solve history sidebar */}
        {solves.length > 0 && (
          <div className="w-52 flex flex-col border-l border-border shrink-0">
            <div className="p-3 border-b border-border bg-muted/30 flex items-center justify-between">
              <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Session ({solves.length})
              </h3>
              <button
                onClick={clearSession}
                className="text-xs text-muted-foreground hover:text-destructive transition-colors"
              >
                Clear all
              </button>
            </div>
            <div className="flex-1 overflow-y-auto">
              {[...solves].reverse().map((s, i) => (
                <div
                  key={s.id}
                  className={`flex items-center px-3 py-2 border-b border-border/50 text-sm group ${
                    s.id === lastSolveId ? "bg-primary/5" : "hover:bg-muted/20"
                  }`}
                >
                  <span className="text-xs text-muted-foreground w-6 shrink-0">
                    {solves.length - i}
                  </span>
                  <span className={`font-mono flex-1 text-center ${
                    s.penalty === "dnf" ? "text-destructive" :
                    s.penalty === "+2"  ? "text-yellow-600"  : ""
                  }`}>
                    {fmtSolve(s)}
                  </span>
                  <button
                    onClick={() => deleteSolve(s.id)}
                    className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-opacity shrink-0 ml-1"
                    title="Delete solve"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
