"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { Gamepad2, Wifi, WifiOff } from "lucide-react"
import { Badge } from "@/components/ui/badge"

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

function AxisBar({ value }: { value: number }) {
  const pct = ((value + 1) / 2) * 100
  return (
    <div className="relative h-3 w-full rounded-full bg-muted overflow-hidden">
      <div className="absolute inset-0 flex items-center">
        <div className="h-full w-0.5 bg-border absolute left-1/2 -translate-x-1/2" />
      </div>
      <div
        className="absolute top-0 h-full rounded-full bg-primary transition-all duration-50"
        style={{
          left: value < 0 ? `${pct}%` : "50%",
          width: `${Math.abs(value) * 50}%`,
        }}
      />
      <div className="absolute top-1/2 -translate-y-1/2 h-3 w-3 rounded-full bg-primary border-2 border-background shadow transition-all duration-50" style={{ left: `calc(${pct}% - 6px)` }} />
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

  const gp = gamepads[active]

  // Group buttons for display
  const faceButtons  = [0, 1, 2, 3]
  const shoulderBtns = [4, 5, 6, 7]
  const centerBtns   = [8, 9, 16]
  const stickBtns    = [10, 11]
  const dpad         = [12, 13, 14, 15]

  function ButtonDot({ idx }: { idx: number }) {
    if (!gp || !gp.buttons[idx]) return <div className="w-6 h-6 rounded-full bg-muted border border-border" />
    const b = gp.buttons[idx]
    const pressed = b.pressed || b.value > 0.1
    return (
      <div title={STANDARD_BUTTONS[idx] ?? `Button ${idx}`}
        className={`w-6 h-6 rounded-full border-2 flex items-center justify-center text-[9px] font-bold transition-colors duration-50 ${
          pressed ? "bg-primary border-primary text-primary-foreground" : "bg-muted border-border text-muted-foreground"
        }`}>
        {idx}
      </div>
    )
  }

  return (
    <div className="flex h-full flex-col gap-3 p-4">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">Game Controller Tester</h2>
          <p className="text-muted-foreground">Test your gamepad — buttons, axes, and rumble. Uses the browser Gamepad API.</p>
        </div>
        <div className="flex items-center gap-2">
          {gamepads.length > 0
            ? <Badge className="bg-green-500 text-white"><Wifi className="h-3 w-3 mr-1" />{gamepads.length} controller{gamepads.length > 1 ? "s" : ""} detected</Badge>
            : <Badge variant="secondary"><WifiOff className="h-3 w-3 mr-1" />No controllers</Badge>
          }
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-hidden rounded-xl border border-border bg-card">
      <div className="h-full overflow-y-auto">
        {/* Safari warning */}
        {isSafari && (
          <div className="m-4 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 p-4 text-sm text-amber-700 dark:text-amber-300">
            <strong>Safari not supported.</strong> The Gamepad API is not available in Safari. Please use Chrome, Firefox, or Edge.
          </div>
        )}

        {/* No controller connected */}
        {!isSafari && gamepads.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full min-h-[300px] gap-4 p-8 text-center">
            <div className="rounded-full bg-muted/50 border border-border p-8">
              <Gamepad2 className="h-14 w-14 text-muted-foreground" />
            </div>
            <div className="space-y-2">
              <h2 className="text-lg font-semibold">Connect a controller</h2>
              <p className="text-sm text-muted-foreground max-w-sm">
                Plug in a USB gamepad or connect via Bluetooth, then press any button to activate it. Works with Xbox, PlayStation, and generic controllers.
              </p>
            </div>
          </div>
        )}

        {/* Controller tabs */}
        {gamepads.length > 1 && (
          <div className="flex gap-1 px-4 pt-4">
            {gamepads.map((g, i) => (
              <button key={g.index} onClick={() => setActive(i)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${active === i ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:text-foreground"}`}>
                Controller {i + 1}
              </button>
            ))}
          </div>
        )}

        {/* Controller detail */}
        {gp && (
          <div className="p-4 space-y-5">
            {/* ID */}
            <div className="rounded-lg border border-border bg-muted/20 px-4 py-3">
              <p className="text-xs font-mono text-muted-foreground truncate">{gp.id}</p>
              <p className="text-xs text-muted-foreground mt-0.5">Mapping: <span className="font-mono">{gp.mapping || "none"}</span> · {gp.buttons.length} buttons · {gp.axes.length} axes</p>
            </div>

            {/* Visual layout */}
            <div className="rounded-xl border border-border bg-muted/10 p-6">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-4">Controller Layout</p>
              <div className="flex flex-col gap-4">
                {/* Shoulders */}
                <div className="flex justify-between items-center">
                  <div className="flex gap-1.5">{shoulderBtns.slice(0,2).map(i => <ButtonDot key={i} idx={i} />)}</div>
                  <p className="text-xs text-muted-foreground">Bumpers</p>
                  <div className="flex gap-1.5">{shoulderBtns.slice(2,4).map(i => <ButtonDot key={i} idx={i} />)}</div>
                </div>
                {/* Center row: dpad | center buttons | face */}
                <div className="flex justify-between items-center gap-4">
                  {/* D-Pad */}
                  <div className="grid grid-cols-3 gap-1 w-20">
                    <div /><ButtonDot idx={12} /><div />
                    <ButtonDot idx={14} /><div /><ButtonDot idx={15} />
                    <div /><ButtonDot idx={13} /><div />
                  </div>
                  {/* Center buttons */}
                  <div className="flex gap-1.5">
                    {centerBtns.map(i => <ButtonDot key={i} idx={i} />)}
                  </div>
                  {/* Face buttons */}
                  <div className="grid grid-cols-3 gap-1 w-20">
                    <div /><ButtonDot idx={3} /><div />
                    <ButtonDot idx={2} /><div /><ButtonDot idx={1} />
                    <div /><ButtonDot idx={0} /><div />
                  </div>
                </div>
                {/* Stick buttons */}
                <div className="flex justify-between">
                  <ButtonDot idx={10} />
                  <ButtonDot idx={11} />
                </div>
              </div>
            </div>

            {/* All buttons list */}
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">All Buttons ({gp.buttons.length})</p>
              <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3">
                {gp.buttons.map((b, i) => {
                  const pressed = b.pressed || b.value > 0.1
                  return (
                    <div key={i} className={`flex items-center gap-2 rounded-lg border px-3 py-2 transition-colors ${pressed ? "border-primary bg-primary/10" : "border-border bg-muted/20"}`}>
                      <div className={`w-2 h-2 rounded-full shrink-0 ${pressed ? "bg-primary" : "bg-muted-foreground/30"}`} />
                      <span className="text-xs truncate">{STANDARD_BUTTONS[i] ?? `Button ${i}`}</span>
                      {b.value > 0 && b.value < 1 && <span className="text-xs font-mono text-muted-foreground ml-auto shrink-0">{b.value.toFixed(2)}</span>}
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Axes */}
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Axes ({gp.axes.length})</p>
              <div className="space-y-3">
                {gp.axes.map((v, i) => (
                  <div key={i} className="space-y-1">
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>{STANDARD_AXES[i] ?? `Axis ${i}`}</span>
                      <span className="font-mono">{v.toFixed(4)}</span>
                    </div>
                    <AxisBar value={v} />
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
      </div>
    </div>
  )
}
