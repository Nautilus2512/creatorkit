"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { RefreshCw, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"

// ─── Types ────────────────────────────────────────────────────────────────────
interface Solve {
  id: string
  ms: number
  penalty: "none" | "+2" | "dnf"
  scramble: string
}

type Phase = "idle" | "holding" | "ready" | "running" | "stopped"

// ─── Scramble generator ───────────────────────────────────────────────────────
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

// ─── Statistics ───────────────────────────────────────────────────────────────
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
  // Replace DNF with Infinity so it sorts to worst
  const sorted = effs.map(ms => ms ?? Infinity).sort((a, b) => a - b)
  const trimmed = sorted.slice(1, -1) // remove best and worst
  if (trimmed.includes(Infinity)) return "DNF"
  return fmt(trimmed.reduce((a, b) => a + b, 0) / trimmed.length)
}

// ─── localStorage ─────────────────────────────────────────────────────────────
const STORAGE_KEY = "creatorkit-rubiks-session"

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
  const [solves, setSolves] = useState<Solve[]>([])
  const [lastSolveId, setLastSolveId] = useState<string | null>(null)

  // Refs for values used inside callbacks (avoid stale closures)
  const phaseRef = useRef<Phase>("idle")
  const startRef = useRef(0)
  const rafRef = useRef(0)
  const isRunningRef = useRef(false)   // guards RAF after cancel
  const holdTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const scrambleRef = useRef("")       // so stopTimer doesn't need scramble as dep

  // Keep refs in sync
  useEffect(() => { phaseRef.current = phase }, [phase])
  useEffect(() => { scrambleRef.current = scramble }, [scramble])

  // Load session from localStorage on mount
  useEffect(() => {
    setSolves(loadSolves())
    setScramble(genScramble())
  }, [])

  // ─── Timer core ─────────────────────────────────────────────────────────────
  const tick = useCallback(() => {
    if (!isRunningRef.current) return
    setDisplayMs(Date.now() - startRef.current)
    rafRef.current = requestAnimationFrame(tick)
  }, [])

  const startTimer = useCallback(() => {
    startRef.current = Date.now()
    isRunningRef.current = true
    setPhase("running")
    phaseRef.current = "running"
    rafRef.current = requestAnimationFrame(tick)
  }, [tick])

  const stopTimer = useCallback(() => {
    // Stop RAF immediately and guard against late fires
    isRunningRef.current = false
    cancelAnimationFrame(rafRef.current)

    const elapsed = Date.now() - startRef.current
    setDisplayMs(elapsed)

    const id = crypto.randomUUID()
    const newSolve: Solve = {
      id, ms: elapsed, penalty: "none", scramble: scrambleRef.current,
    }
    setSolves(prev => {
      const updated = [...prev, newSolve]
      saveSolves(updated)
      return updated
    })
    setLastSolveId(id)
    setPhase("stopped")
    phaseRef.current = "stopped"
    setScramble(genScramble())
  }, []) // stable — no deps needed thanks to refs

  // ─── Keyboard handler ────────────────────────────────────────────────────────
  useEffect(() => {
    const onDown = (e: KeyboardEvent) => {
      if (e.code !== "Space" || e.repeat) return
      e.preventDefault()
      const p = phaseRef.current

      if (p === "running") {
        stopTimer()
        return
      }

      if (p === "idle" || p === "stopped") {
        // Begin hold: hide penalty UI, reset display
        setLastSolveId(null)
        setDisplayMs(0)
        setPhase("holding")
        phaseRef.current = "holding"
        // After 300 ms of holding → turn green (ready)
        holdTimerRef.current = setTimeout(() => {
          setPhase("ready")
          phaseRef.current = "ready"
        }, 300)
      }
    }

    const onUp = (e: KeyboardEvent) => {
      if (e.code !== "Space") return
      e.preventDefault()
      const p = phaseRef.current

      if (p === "holding") {
        // Released too fast — cancel
        clearTimeout(holdTimerRef.current!)
        setPhase("idle")
        phaseRef.current = "idle"
      } else if (p === "ready") {
        // Held long enough — start!
        startTimer()
      }
    }

    window.addEventListener("keydown", onDown)
    window.addEventListener("keyup", onUp)
    return () => {
      window.removeEventListener("keydown", onDown)
      window.removeEventListener("keyup", onUp)
    }
  }, [startTimer, stopTimer])

  // Cleanup on unmount
  useEffect(() => () => {
    isRunningRef.current = false
    cancelAnimationFrame(rafRef.current)
    clearTimeout(holdTimerRef.current!)
  }, [])

  // ─── Actions ─────────────────────────────────────────────────────────────────
  const setPenalty = (id: string, penalty: Solve["penalty"]) => {
    setSolves(prev => {
      const updated = prev.map(s => s.id === id ? { ...s, penalty } : s)
      saveSolves(updated)
      return updated
    })
  }

  const deleteSolve = (id: string) => {
    setSolves(prev => {
      const updated = prev.filter(s => s.id !== id)
      saveSolves(updated)
      return updated
    })
    if (lastSolveId === id) setLastSolveId(null)
  }

  const clearSession = () => {
    setSolves([])
    saveSolves([])
    setLastSolveId(null)
  }

  // ─── Derived display ─────────────────────────────────────────────────────────
  const lastSolve = lastSolveId ? solves.find(s => s.id === lastSolveId) : null

  const timerColor =
    phase === "holding" ? "text-red-500" :
    phase === "ready"   ? "text-green-500" :
    "text-foreground"

  const hint =
    phase === "idle"    ? "Hold Space to get ready" :
    phase === "holding" ? "Keep holding…" :
    phase === "ready"   ? "Release Space to start!" :
    phase === "running" ? "Press Space to stop" :
    "Hold Space for next solve"

  return (
    <div className="h-screen flex flex-col bg-background select-none" tabIndex={-1}>
      {/* Header */}
      <div className="shrink-0 border-b border-border bg-background">
        <div className="flex items-center justify-between px-6 py-4">
          <div>
            <h1 className="text-xl font-semibold">Rubik's Cube Timer</h1>
            <p className="text-sm text-muted-foreground">Hold Space → release to start · Space to stop</p>
          </div>
          <Button
            variant="outline" size="sm"
            onClick={() => setScramble(genScramble())}
            disabled={phase === "running"}
          >
            <RefreshCw className="h-4 w-4 mr-1" />New Scramble
          </Button>
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
          {/* Display */}
          <div
            className={`text-8xl font-bold font-mono tabular-nums transition-colors cursor-pointer leading-none ${timerColor}`}
            onPointerDown={() => { if (phase === "running") stopTimer() }}
          >
            {fmt(displayMs)}
          </div>

          {/* Hint */}
          <p className="text-sm text-muted-foreground">{hint}</p>

          {/* Penalty buttons — shown only right after a solve */}
          {phase === "stopped" && lastSolve && (
            <div className="flex items-center gap-3">
              <span className="text-xs text-muted-foreground">Penalty:</span>
              {(["none", "+2", "dnf"] as const).map(p => (
                <button
                  key={p}
                  onClick={() => setPenalty(lastSolve.id, p)}
                  className={`text-xs px-3 py-1.5 rounded-full border font-semibold uppercase tracking-wide transition-colors ${
                    lastSolve.penalty === p
                      ? p === "dnf"  ? "bg-destructive text-destructive-foreground border-destructive"
                      : p === "+2"   ? "bg-yellow-500 text-white border-yellow-500"
                      :                "bg-primary text-primary-foreground border-primary"
                      : "border-border text-muted-foreground hover:border-primary/40"
                  }`}
                >
                  {p === "none" ? "OK" : p}
                </button>
              ))}
              {lastSolve && (
                <span className="text-sm font-mono ml-2 text-muted-foreground">
                  {fmtSolve(lastSolve)}
                </span>
              )}
            </div>
          )}

          {/* Stats */}
          <div className="flex gap-10 text-center mt-6">
            {[
              { label: "Best", value: calcBest(solves) },
              { label: "Ao5",  value: calcAo(solves, 5) },
              { label: "Ao12", value: calcAo(solves, 12) },
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
                    s.penalty === "+2"  ? "text-yellow-600" : ""
                  }`}>
                    {fmtSolve(s)}
                  </span>
                  <button
                    onClick={() => deleteSolve(s.id)}
                    className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-opacity shrink-0 ml-1"
                    title="Delete this solve"
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
