"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { Play, Pause, RotateCcw, SkipForward, Settings, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Slider } from "@/components/ui/slider"
import { Switch } from "@/components/ui/switch"
import { ShortcutsModal } from "@/components/shortcuts-modal"

type Mode = "work" | "short" | "long"

interface Settings { work: number; short: number; long: number; longsAfter: number; sound: boolean; notify: boolean }

const DEFAULTS: Settings = { work: 25, short: 5, long: 15, longsAfter: 4, sound: true, notify: true }

const MODE_LABEL: Record<Mode, string> = { work: "Focus", short: "Short Break", long: "Long Break" }
const MODE_COLOR: Record<Mode, string> = {
  work: "text-red-500 dark:text-red-400",
  short: "text-green-500 dark:text-green-400",
  long: "text-blue-500 dark:text-blue-400",
}
const MODE_RING: Record<Mode, string> = {
  work: "#ef4444", short: "#22c55e", long: "#3b82f6",
}

const RADIUS = 88
const CIRC   = 2 * Math.PI * RADIUS

function playBell(vol = 0.5) {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)()
    ;[0, 0.15, 0.3].forEach(delay => {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.connect(gain); gain.connect(ctx.destination)
      osc.type = "sine"; osc.frequency.value = 880
      gain.gain.setValueAtTime(0, ctx.currentTime + delay)
      gain.gain.linearRampToValueAtTime(vol, ctx.currentTime + delay + 0.02)
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + delay + 1.2)
      osc.start(ctx.currentTime + delay); osc.stop(ctx.currentTime + delay + 1.3)
    })
  } catch {}
}

function notify(title: string, body: string) {
  if (typeof Notification === "undefined") return
  if (Notification.permission === "granted") {
    new Notification(title, { body, icon: "/favicon.ico" })
  }
}

export default function PomodoroTimer() {
  const [settings, setSettings] = useState<Settings>(DEFAULTS)
  const [showSettings, setShowSettings] = useState(false)
  const [mode, setMode] = useState<Mode>("work")
  const [sessionInCycle, setSessionInCycle] = useState(0)
  const [totalPomos, setTotalPomos] = useState(0)
  const [running, setRunning] = useState(false)
  const [secondsLeft, setSecondsLeft] = useState(DEFAULTS.work * 60)
  const [announcement, setAnnouncement] = useState("")
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const settingsRef = useRef(settings)
  const modeRef = useRef(mode)
  const sessionRef = useRef(sessionInCycle)

  const announceToScreenReader = useCallback((message: string) => {
    setAnnouncement(message)
    setTimeout(() => setAnnouncement(""), 1000)
  }, [])

  settingsRef.current = settings
  modeRef.current = mode
  sessionRef.current = sessionInCycle

  useEffect(() => {
    const s = localStorage.getItem("ck-pomodoro-settings")
    if (s) try { const parsed = JSON.parse(s); setSettings(parsed); setSecondsLeft(parsed.work * 60) } catch {}
    const t = localStorage.getItem("ck-pomodoro-pomos")
    if (t) setTotalPomos(parseInt(t) || 0)
  }, [])

  useEffect(() => {
    localStorage.setItem("ck-pomodoro-settings", JSON.stringify(settings))
  }, [settings])

  useEffect(() => {
    const m = Math.floor(secondsLeft / 60).toString().padStart(2, "0")
    const s = (secondsLeft % 60).toString().padStart(2, "0")
    document.title = running ? `${m}:${s} Â· ${MODE_LABEL[mode]} â€” CreatorKit` : "Pomodoro â€” CreatorKit"
    return () => { document.title = "CreatorKit" }
  }, [secondsLeft, running, mode])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.shiftKey) {
        switch (e.key.toLowerCase()) {
          case "s": e.preventDefault(); toggle(); announceToScreenReader(running ? "Timer paused" : "Timer started"); break
          case "r": e.preventDefault(); reset(); announceToScreenReader("Timer reset"); break
          case "n": e.preventDefault(); skip(); announceToScreenReader("Skipped to next session"); break
        }
      }
    }
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [])

  const advance = useCallback(() => {
    const s = settingsRef.current
    const cur = modeRef.current
    const sess = sessionRef.current
    if (cur === "work") {
      const newSess = sess + 1
      setTotalPomos(p => { const n = p + 1; localStorage.setItem("ck-pomodoro-pomos", String(n)); return n })
      if (newSess >= s.longsAfter) {
        setMode("long"); setSecondsLeft(s.long * 60); setSessionInCycle(0)
        notify("Long Break ðŸŽ‰", `${s.longsAfter} sessions complete! Take a ${s.long}-minute break.`)
      } else {
        setMode("short"); setSecondsLeft(s.short * 60); setSessionInCycle(newSess)
        notify("Short Break â˜•", `Good work! Take a ${s.short}-minute break.`)
      }
    } else {
      setMode("work"); setSecondsLeft(s.work * 60)
      notify("Focus Time ðŸ…", `Break over â€” time to focus for ${s.work} minutes!`)
    }
    setRunning(false)
  }, [])

  useEffect(() => {
    if (!running) { if (intervalRef.current) clearInterval(intervalRef.current); return }
    intervalRef.current = setInterval(() => {
      setSecondsLeft(s => {
        if (s <= 1) { if (settingsRef.current.sound) playBell(); advance(); return 0 }
        return s - 1
      })
    }, 1000)
    return () => { if (intervalRef.current) clearInterval(intervalRef.current) }
  }, [running, advance])

  const toggle = useCallback(() => {
    if (!running && settings.notify && Notification.permission === "default") Notification.requestPermission()
    setRunning(r => !r)
    announceToScreenReader(running ? "Timer paused" : "Timer started")
  }, [running, settings.notify, announceToScreenReader])

  const reset = useCallback(() => {
    setRunning(false)
    setSecondsLeft(settings[mode] * 60)
    announceToScreenReader(`Timer reset to ${settings[mode]} minutes`)
  }, [settings, mode, announceToScreenReader])

  const skip = useCallback(() => {
    setRunning(false)
    advance()
    announceToScreenReader("Skipped to next session")
  }, [advance, announceToScreenReader])

  const switchMode = useCallback((m: Mode) => {
    setRunning(false); setMode(m)
    setSecondsLeft(settings[m] * 60)
    if (m === "work") setSessionInCycle(0)
    announceToScreenReader(`Switched to ${MODE_LABEL[m]}`)
  }, [settings, announceToScreenReader])

  const setSetting = useCallback(<K extends keyof Settings>(k: K, v: Settings[K]) => {
    setSettings(s => ({ ...s, [k]: v }))
    if ((k === "work" && mode === "work") || (k === "short" && mode === "short") || (k === "long" && mode === "long")) {
      setSecondsLeft((v as number) * 60)
    }
  }, [mode])

  const shortcuts = [
    { keys: ["Ctrl", "Shift", "S"], description: "Start/Pause timer" },
    { keys: ["Ctrl", "Shift", "R"], description: "Reset timer" },
    { keys: ["Ctrl", "Shift", "N"], description: "Skip to next session" },
  ]

  const totalSecs = settings[mode] * 60
  const progress  = totalSecs > 0 ? secondsLeft / totalSecs : 1
  const dashOffset = CIRC * (1 - progress)
  const mins = Math.floor(secondsLeft / 60).toString().padStart(2, "0")
  const secs = (secondsLeft % 60).toString().padStart(2, "0")

  return (
    <>
      <div aria-live="polite" aria-atomic="true" className="sr-only">{announcement}</div>

      <div className="flex flex-1 flex-col min-h-0">

        {/* â”€â”€ Desktop: top action bar â”€â”€ */}
        <div className="hidden md:flex shrink-0 items-center gap-2 border-b border-border bg-card/95 backdrop-blur-sm px-4 py-2">
          <span className="text-sm font-semibold shrink-0 mr-1">Pomodoro Timer</span>
          <div className="ml-auto flex items-center gap-1.5">
            <ShortcutsModal pageName="Pomodoro Timer" shortcuts={shortcuts} />
            <Button variant="outline" size="sm" onClick={() => setShowSettings(s => !s)} aria-label="Toggle settings">
              <Settings className="h-3.5 w-3.5 mr-1.5" aria-hidden="true" />Settings
            </Button>
          </div>
        </div>

        {/* â”€â”€ Mobile: compact header â”€â”€ */}
        <div className="flex md:hidden shrink-0 items-center justify-between px-4 py-3 border-b border-border">
          <h2 className="text-base font-semibold">Pomodoro Timer</h2>
          <div className="flex items-center gap-1.5">
            <ShortcutsModal pageName="Pomodoro Timer" shortcuts={shortcuts} />
            <Button variant="outline" size="sm" onClick={() => setShowSettings(s => !s)} aria-label="Toggle settings">
              <Settings className="h-3.5 w-3.5" aria-hidden="true" />
            </Button>
          </div>
        </div>

        {/* â”€â”€ Content â”€â”€ */}
        <div className="flex-1 min-h-0 flex flex-col md:flex-row overflow-hidden gap-0">

          {/* Timer */}
          <div className="flex-1 flex flex-col overflow-hidden rounded-none border-0 md:border-r border-border bg-card">
            <div className="flex-1 flex flex-col items-center justify-center p-8 gap-6 overflow-y-auto">
              <div className="flex gap-1 rounded-full border border-border p-1" role="tablist" aria-label="Timer modes">
                {(["work", "short", "long"] as Mode[]).map(m => (
                  <button key={m} onClick={() => switchMode(m)} role="tab" aria-selected={mode === m}
                    className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-primary/50 focus:ring-offset-2 ${mode === m ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground hover:bg-muted/50"}`}>
                    {MODE_LABEL[m]}
                  </button>
                ))}
              </div>

              <div className="relative" role="timer" aria-label={`${mins} minutes ${secs} seconds remaining`} aria-live="polite">
                <svg width="220" height="220" viewBox="0 0 220 220" className="-rotate-90" aria-hidden="true">
                  <circle cx="110" cy="110" r={RADIUS} fill="none" stroke="currentColor" strokeWidth="8" className="text-muted/30" />
                  <circle cx="110" cy="110" r={RADIUS} fill="none" stroke={MODE_RING[mode]} strokeWidth="8"
                    strokeLinecap="round" strokeDasharray={CIRC} strokeDashoffset={dashOffset}
                    style={{ transition: "stroke-dashoffset 0.5s ease, stroke 0.3s ease" }} />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className={`text-5xl font-bold font-mono tabular-nums ${MODE_COLOR[mode]}`} aria-hidden="true">{mins}:{secs}</span>
                  <span className="sr-only">{mins} minutes and {secs} seconds</span>
                  <span className="text-sm text-muted-foreground mt-1">{MODE_LABEL[mode]}</span>
                </div>
              </div>

              <div className="flex items-center gap-3" role="group" aria-label="Timer controls">
                <button onClick={reset} className="rounded-full p-2 text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors focus:outline-none focus:ring-2 focus:ring-primary/50 focus:ring-offset-2" aria-label="Reset timer">
                  <RotateCcw className="h-5 w-5" />
                </button>
                <button onClick={toggle} aria-label={running ? "Pause timer" : "Start timer"}
                  className={`rounded-full w-14 h-14 flex items-center justify-center text-white shadow-lg transition-all hover:scale-105 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:ring-offset-2 ${running ? "bg-slate-600 hover:bg-slate-700" : "bg-primary hover:opacity-90"}`}>
                  {running ? <Pause className="h-6 w-6" /> : <Play className="h-6 w-6 ml-0.5" />}
                </button>
                <button onClick={skip} className="rounded-full p-2 text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors focus:outline-none focus:ring-2 focus:ring-primary/50 focus:ring-offset-2" aria-label="Skip to next session">
                  <SkipForward className="h-5 w-5" />
                </button>
              </div>

              <div className="flex items-center gap-2" role="group" aria-label={`Session progress: ${sessionInCycle} of ${settings.longsAfter} sessions`}>
                {Array.from({ length: settings.longsAfter }).map((_, i) => (
                  <div key={i} className={`w-3 h-3 rounded-full transition-colors ${i < sessionInCycle ? "bg-red-500" : "bg-muted/50 border border-border"}`} aria-label={i < sessionInCycle ? "Completed session" : "Upcoming session"} />
                ))}
              </div>

              <div className="flex items-center gap-6 text-center" role="region" aria-label="Statistics">
                <div>
                  <p className="text-2xl font-bold">{totalPomos}</p>
                  <p className="text-xs text-muted-foreground">Total pomodoros</p>
                </div>
                <div className="h-8 w-px bg-border" aria-hidden="true" />
                <div>
                  <p className="text-2xl font-bold">{Math.floor(totalPomos * settings.work / 60)}h {(totalPomos * settings.work) % 60}m</p>
                  <p className="text-xs text-muted-foreground">Focus time</p>
                </div>
                <div className="h-8 w-px bg-border" aria-hidden="true" />
                <div>
                  <button onClick={() => { setTotalPomos(0); localStorage.setItem("ck-pomodoro-pomos", "0"); announceToScreenReader("Statistics reset") }}
                    className="text-xs text-muted-foreground hover:text-destructive transition-colors focus:outline-none focus:ring-2 focus:ring-destructive/50 focus:ring-offset-2 px-2 py-1 rounded"
                    aria-label="Reset all statistics">
                    Reset stats
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Settings panel */}
          {showSettings && (
            <div className="shrink-0 md:w-64 flex flex-col overflow-hidden border-t md:border-t-0 md:border-l border-border bg-card" role="dialog" aria-label="Settings panel">
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold">Settings</p>
                  <button onClick={() => setShowSettings(false)} className="text-muted-foreground hover:text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 rounded p-1" aria-label="Close settings">
                    <X className="h-4 w-4" />
                  </button>
                </div>
                {([
                  { key: "work",      label: "Focus duration (min)",          min: 1, max: 90 },
                  { key: "short",     label: "Short break (min)",              min: 1, max: 30 },
                  { key: "long",      label: "Long break (min)",               min: 1, max: 60 },
                  { key: "longsAfter",label: "Sessions before long break",     min: 1, max: 8  },
                ] as const).map(({ key, label, min, max }) => (
                  <div key={key} className="space-y-1.5">
                    <div className="flex justify-between">
                      <Label htmlFor={`setting-${key}`} className="text-xs text-muted-foreground">{label}</Label>
                      <span className="text-xs font-mono text-muted-foreground">{settings[key]}</span>
                    </div>
                    <Slider id={`setting-${key}`} value={[settings[key]]} onValueChange={([v]) => setSetting(key, v)} min={min} max={max} step={1} />
                  </div>
                ))}
                <div className="flex items-center justify-between">
                  <Label htmlFor="setting-sound" className="text-xs text-muted-foreground">Sound bell</Label>
                  <Switch id="setting-sound" checked={settings.sound} onCheckedChange={v => { setSetting("sound", v); announceToScreenReader(v ? "Sound bell enabled" : "Sound bell disabled") }} />
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="setting-notify" className="text-xs text-muted-foreground">Browser notifications</Label>
                  <Switch id="setting-notify" checked={settings.notify} onCheckedChange={v => { setSetting("notify", v); announceToScreenReader(v ? "Notifications enabled" : "Notifications disabled") }} />
                </div>
                <Button variant="outline" size="sm" className="w-full" onClick={() => { setSettings(DEFAULTS); setSecondsLeft(DEFAULTS.work * 60); setMode("work"); setRunning(false); announceToScreenReader("Settings reset to defaults") }}>
                  Reset to defaults
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* â”€â”€ Mobile: bottom action bar â”€â”€ */}
        <div
          className="flex md:hidden shrink-0 items-center gap-2 border-t border-border bg-card/95 px-3 py-2"
          style={{ paddingBottom: "max(0.5rem, env(safe-area-inset-bottom))" }}
        >
          <button onClick={reset} className="h-11 px-3 rounded-md border border-border text-muted-foreground hover:text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50" aria-label="Reset">
            <RotateCcw className="h-4 w-4" />
          </button>
          <button onClick={skip} className="h-11 px-3 rounded-md border border-border text-muted-foreground hover:text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50" aria-label="Skip">
            <SkipForward className="h-4 w-4" />
          </button>
          <div className="flex-1" />
          <Button size="sm" className={`h-11 px-6 ${running ? "bg-slate-600 hover:bg-slate-700" : ""}`} onClick={toggle} aria-label={running ? "Pause" : "Start"}>
            {running ? <><Pause className="h-4 w-4 mr-1.5" aria-hidden="true" />Pause</> : <><Play className="h-4 w-4 mr-1.5 ml-0.5" aria-hidden="true" />Start</>}
          </Button>
        </div>

      </div>
    </>
  )
}
