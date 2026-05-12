"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { Gamepad2, Wifi, WifiOff } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { ShortcutsModal } from "@/components/shortcuts-modal"

function announceToScreenReader(message: string) {
  if (typeof document === "undefined") return
  const announcement = document.createElement("div")
  announcement.setAttribute("role", "status")
  announcement.setAttribute("aria-live", "polite")
  announcement.setAttribute("aria-atomic", "true")
  announcement.className = "sr-only"
  announcement.textContent = message
  document.body.appendChild(announcement)
  setTimeout(() => document.body.removeChild(announcement), 1000)
}

const STANDARD_BUTTONS = [
  "A / Cross", "B / Circle", "X / Square", "Y / Triangle",
  "LB / L1", "RB / R1", "LT / L2", "RT / R2",
  "Select / Share", "Start / Options",
  "L3 (L Stick)", "R3 (R Stick)",
  "D-Pad Up", "D-Pad Down", "D-Pad Left", "D-Pad Right",
  "Home / Guide",
]
const STANDARD_AXES = ["Left Stick X", "Left Stick Y", "Right Stick X", "Right Stick Y"]

interface GPState {
  id: string; index: number; connected: boolean
  buttons: { pressed: boolean; value: number }[]
  axes: number[]
  mapping: string
}

function ButtonDot({ idx, gp }: { idx: number; gp: GPState | undefined }) {
    if (!gp || !gp.buttons[idx]) {
      return (
        <div 
          className="w-6 h-6 rounded-full bg-muted border border-border" 
          aria-hidden="true"
        />
      )
    }
    const b = gp.buttons[idx]
    const pressed = b.pressed || b.value > 0.1
    return (
      <div 
        role="img"
        aria-label={`${STANDARD_BUTTONS[idx] ?? `Button ${idx}`}: ${pressed ? "pressed" : "not pressed"}${b.value > 0 && b.value < 1 ? `, value ${b.value.toFixed(2)}` : ""}`}
        title={STANDARD_BUTTONS[idx] ?? `Button ${idx}`}
        className={`w-6 h-6 rounded-full border-2 flex items-center justify-center text-[9px] font-bold transition-colors duration-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 ${
          pressed ? "bg-primary border-primary text-primary-foreground" : "bg-muted border-border text-muted-foreground"
        }`}>
        {idx}
      </div>
    )
  }

  function AxisBar({ value, label, idx }: { value: number; label: string; idx: number }) {
    const pct = ((value + 1) / 2) * 100
    const isActive = Math.abs(value) > 0.05
    return (
      <div 
        className="relative h-3 w-full rounded-full bg-muted overflow-hidden"
        role="meter"
        aria-label={`${label}: ${value.toFixed(4)}`}
        aria-valuenow={Math.round(value * 100)}
        aria-valuemin={-100}
        aria-valuemax={100}
      >
        <div className="absolute inset-0 flex items-center">
          <div className="h-full w-0.5 bg-border absolute left-1/2 -translate-x-1/2" />
        </div>
        <div
          className={`absolute top-0 h-full rounded-full transition-all duration-50 ${isActive ? "bg-primary" : "bg-primary/50"}`}
          style={{
            left: value < 0 ? `${pct}%` : "50%",
            width: `${Math.abs(value) * 50}%`,
          }}
        />
        <div 
          className={`absolute top-1/2 -translate-y-1/2 h-3 w-3 rounded-full bg-primary border-2 border-background shadow transition-all duration-50 ${isActive ? "scale-125" : ""}`} 
          style={{ left: `calc(${pct}% - 6px)` }} 
        />
      </div>
    )
  }

export default function GamepadTester() {
  const [gamepads, setGamepads] = useState<GPState[]>([])
  const [active, setActive] = useState(0)
  const rafRef = useRef<number>(0)
  const isSafari = typeof navigator !== "undefined" && /^((?!chrome|android).)*safari/i.test(navigator.userAgent)

  const poll = useCallback(() => {
    const raw = navigator.getGamepads()
    const states: GPState[] = []
    for (let i = 0; i < raw.length; i++) {
      const gp = raw[i]
      if (!gp) continue
      states.push({
        id: gp.id, index: gp.index, connected: gp.connected, mapping: gp.mapping,
        buttons: Array.from(gp.buttons).map(b => ({ pressed: b.pressed, value: b.value })),
        axes: Array.from(gp.axes),
      })
    }
    setGamepads(states)
    rafRef.current = requestAnimationFrame(poll)
  }, [])

  useEffect(() => {
    if (isSafari) return
    const onConnect = () => { rafRef.current = requestAnimationFrame(poll) }
    const onDisconnect = () => {}
    window.addEventListener("gamepadconnected", onConnect)
    window.addEventListener("gamepaddisconnected", onDisconnect)
    rafRef.current = requestAnimationFrame(poll)
    return () => {
      cancelAnimationFrame(rafRef.current)
      window.removeEventListener("gamepadconnected", onConnect)
      window.removeEventListener("gamepaddisconnected", onDisconnect)
    }
  }, [poll, isSafari])

  const cycleController = useCallback(() => {
    if (gamepads.length <= 1) return
    const next = (active + 1) % gamepads.length
    setActive(next)
    announceToScreenReader(`Switched to Controller ${next + 1}`)
  }, [active, gamepads.length])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "?" || (e.shiftKey && e.key === "/")) {
        return
      }
      if (e.key === "c" || e.key === "C") {
        cycleController()
      }
    }
    window.addEventListener("keydown", handler)
    return () => window.removeEventListener("keydown", handler)
  }, [cycleController])

  const gp = gamepads[active]

  // Group buttons for display
  const faceButtons  = [0, 1, 2, 3]
  const shoulderBtns = [4, 5, 6, 7]
  const centerBtns   = [8, 9, 16]
const stickBtns    = [10, 11]

  return (
    <>
    <div className="flex h-full flex-col gap-3 p-4">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">Game Controller Tester</h2>
          <p className="text-muted-foreground">Test your gamepad — buttons, axes, and rumble. Uses the browser Gamepad API. Press ? for shortcuts.</p>
        </div>
        <div className="flex items-center gap-2" role="status" aria-live="polite">
          {gamepads.length > 0
            ? <Badge className="bg-green-500 text-white"><Wifi className="h-3 w-3 mr-1" aria-hidden="true" />{gamepads.length} controller{gamepads.length > 1 ? "s" : ""} detected</Badge>
            : <Badge variant="secondary"><WifiOff className="h-3 w-3 mr-1" aria-hidden="true" />No controllers</Badge>
          }
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-hidden rounded-xl border border-border bg-card">
      <div className="h-full overflow-y-auto">
        {/* Safari warning */}
        {isSafari && (
          <div className="m-4 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 p-4 text-sm text-amber-700 dark:text-amber-300" role="alert">
            <strong>Safari not supported.</strong> The Gamepad API is not available in Safari. Please use Chrome, Firefox, or Edge.
          </div>
        )}

        {/* No controller connected */}
        {!isSafari && gamepads.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full min-h-[300px] gap-4 p-8 text-center" role="region" aria-labelledby="no-controller-heading">
            <div className="rounded-full bg-muted/50 border border-border p-8">
              <Gamepad2 className="h-14 w-14 text-muted-foreground" aria-hidden="true" />
            </div>
            <div className="space-y-2">
              <h2 id="no-controller-heading" className="text-lg font-semibold">Connect a controller</h2>
              <p className="text-sm text-muted-foreground max-w-sm">
                Plug in a USB gamepad or connect via Bluetooth, then press any button to activate it. Works with Xbox, PlayStation, and generic controllers.
              </p>
            </div>
          </div>
        )}

        {/* Controller tabs */}
        {gamepads.length > 1 && (
          <div className="flex gap-1 px-4 pt-4" role="tablist" aria-label="Connected controllers">
            {gamepads.map((g, i) => (
              <button 
                key={g.index} 
                onClick={() => { setActive(i); announceToScreenReader(`Switched to Controller ${i + 1}`) }}
                role="tab"
                aria-selected={active === i}
                aria-controls={`controller-panel-${i}`}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 ${active === i ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:text-foreground"}`}>
                Controller {i + 1}
              </button>
            ))}
          </div>
        )}

        {/* Controller detail */}
        {gp && (
          <div className="p-4 space-y-5" role="tabpanel" id={`controller-panel-${active}`} aria-label={`Controller ${active + 1} details`}>
            {/* ID */}
            <div className="rounded-lg border border-border bg-muted/20 px-4 py-3" role="region" aria-labelledby="controller-id-label">
              <p id="controller-id-label" className="text-xs font-mono text-muted-foreground truncate">{gp.id}</p>
              <p className="text-xs text-muted-foreground mt-0.5">Mapping: <span className="font-mono">{gp.mapping || "none"}</span> · {gp.buttons.length} buttons · {gp.axes.length} axes</p>
            </div>

            {/* Visual layout */}
            <div className="rounded-xl border border-border bg-muted/10 p-6">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-4" id="controller-layout-label">Controller Layout</p>
              <div className="flex flex-col gap-4" role="img" aria-labelledby="controller-layout-label">
                {/* Shoulders */}
                <div className="flex justify-between items-center">
                  <div className="flex gap-1.5">{shoulderBtns.slice(0,2).map(i => <ButtonDot key={i} idx={i} gp={gp} />)}</div>
                  <p className="text-xs text-muted-foreground">Bumpers</p>
                  <div className="flex gap-1.5">{shoulderBtns.slice(2,4).map(i => <ButtonDot key={i} idx={i} gp={gp} />)}</div>
                </div>
                {/* Center row: dpad | center buttons | face */}
                <div className="flex justify-between items-center gap-4">
                  {/* D-Pad */}
                  <div className="grid grid-cols-3 gap-1 w-20" role="group" aria-label="D-Pad">
                    <div /><ButtonDot idx={12} gp={gp} /><div />
                    <ButtonDot idx={14} gp={gp} /><div /><ButtonDot idx={15} gp={gp} />
                    <div /><ButtonDot idx={13} gp={gp} /><div />
                  </div>
                  {/* Center buttons */}
                  <div className="flex gap-1.5" role="group" aria-label="Center buttons">
                    {centerBtns.map(i => <ButtonDot key={i} idx={i} gp={gp} />)}
                  </div>
                  {/* Face buttons */}
                  <div className="grid grid-cols-3 gap-1 w-20" role="group" aria-label="Face buttons">
                    <div /><ButtonDot idx={3} gp={gp} /><div />
                    <ButtonDot idx={2} gp={gp} /><div /><ButtonDot idx={1} gp={gp} />
                    <div /><ButtonDot idx={0} gp={gp} /><div />
                  </div>
                </div>
                {/* Stick buttons */}
                <div className="flex justify-between">
                  <ButtonDot idx={10} gp={gp} />
                  <ButtonDot idx={11} gp={gp} />
                </div>
              </div>
            </div>

            {/* All buttons list */}
            <div className="space-y-2" role="region" aria-labelledby="buttons-list-heading">
              <p id="buttons-list-heading" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">All Buttons ({gp.buttons.length})</p>
              <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3" role="list">
                {gp.buttons.map((b, i) => {
                  const pressed = b.pressed || b.value > 0.1
                  return (
                    <div 
                      key={i} 
                      role="listitem"
                      aria-label={`${STANDARD_BUTTONS[i] ?? `Button ${i}`}: ${pressed ? "pressed" : "not pressed"}${b.value > 0 && b.value < 1 ? `, value ${b.value.toFixed(2)}` : ""}`}
                      className={`flex items-center gap-2 rounded-lg border px-3 py-2 transition-colors ${pressed ? "border-primary bg-primary/10" : "border-border bg-muted/20"}`}>
                      <div className={`w-2 h-2 rounded-full shrink-0 ${pressed ? "bg-primary" : "bg-muted-foreground/30"}`} aria-hidden="true" />
                      <span className="text-xs truncate">{STANDARD_BUTTONS[i] ?? `Button ${i}`}</span>
                      {b.value > 0 && b.value < 1 && <span className="text-xs font-mono text-muted-foreground ml-auto shrink-0" aria-label={`Analog value: ${b.value.toFixed(2)}`}>{b.value.toFixed(2)}</span>}
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Axes */}
            <div className="space-y-2" role="region" aria-labelledby="axes-list-heading">
              <p id="axes-list-heading" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Axes ({gp.axes.length})</p>
              <div className="space-y-3">
                {gp.axes.map((v, i) => (
                  <div key={i} className="space-y-1">
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>{STANDARD_AXES[i] ?? `Axis ${i}`}</span>
                      <span className="font-mono" aria-label={`Value: ${v.toFixed(4)}`}>{v.toFixed(4)}</span>
                    </div>
                    <AxisBar value={v} label={STANDARD_AXES[i] ?? `Axis ${i}`} idx={i} />
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
      </div>
    </div>
    <ShortcutsModal
      pageName="Game Controller Tester"
      shortcuts={[
        { keys: ["C"], description: "Cycle controller" },
        { keys: ["?"], description: "Toggle this panel" },
      ]}
    />
    </>
  )
}
