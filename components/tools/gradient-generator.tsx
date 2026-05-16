"use client"

import { useState, useCallback, useEffect, useRef } from "react"
import { Copy, Check, Plus, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Slider } from "@/components/ui/slider"
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

type GradientType = "linear" | "radial" | "conic"
interface Stop { id: number; color: string; position: number }

let nextId = 3

const DIRECTIONS = [
  { label: "→", value: "to right" },
  { label: "←", value: "to left" },
  { label: "↓", value: "to bottom" },
  { label: "↑", value: "to top" },
  { label: "↘", value: "to bottom right" },
  { label: "↙", value: "to bottom left" },
  { label: "↗", value: "to top right" },
  { label: "↖", value: "to top left" },
]

export default function GradientGenerator() {
  const [type, setType] = useState<GradientType>("linear")
  const [direction, setDirection] = useState("to right")
  const [angle, setAngle] = useState(90)
  const [useAngle, setUseAngle] = useState(false)
  const [stops, setStops] = useState<Stop[]>([
    { id: 1, color: "#6366f1", position: 0 },
    { id: 2, color: "#a855f7", position: 100 },
  ])
  const [copied, setCopied] = useState(false)
  const copiedTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [activeTab, setActiveTab] = useState<"input" | "output">("input")

  const sorted = [...stops].sort((a, b) => a.position - b.position)
  const stopsStr = sorted.map(s => `${s.color} ${s.position}%`).join(", ")

  const cssValue =
    type === "linear" ? `linear-gradient(${useAngle ? `${angle}deg` : direction}, ${stopsStr})`
    : type === "radial" ? `radial-gradient(circle, ${stopsStr})`
    : `conic-gradient(from ${angle}deg, ${stopsStr})`

  const css = `background: ${cssValue};`

  const copy = useCallback(() => {
    navigator.clipboard.writeText(css)
    setCopied(true)
    announceToScreenReader("CSS copied to clipboard")
    if (copiedTimeoutRef.current) clearTimeout(copiedTimeoutRef.current)
    copiedTimeoutRef.current = setTimeout(() => setCopied(false), 2000)
  }, [css])

  const updateStop = useCallback((id: number, field: keyof Stop, value: string | number) =>
    setStops(s => s.map(st => st.id === id ? { ...st, [field]: value } : st))
  , [])

  const addStop = useCallback(() => {
    const pos = Math.round((sorted[0].position + sorted[sorted.length - 1].position) / 2)
    setStops(s => [...s, { id: nextId++, color: "#ffffff", position: pos }])
    announceToScreenReader("Color stop added")
  }, [sorted])

  const removeStop = useCallback((id: number) => { 
    if (stops.length <= 2) return; 
    setStops(s => s.filter(st => st.id !== id))
    announceToScreenReader("Color stop removed")
  }, [stops.length])

  const cycleType = useCallback(() => {
    const types: GradientType[] = ["linear", "radial", "conic"]
    const idx = types.indexOf(type)
    setType(types[(idx + 1) % types.length])
    announceToScreenReader(`${types[(idx + 1) % types.length]} gradient type selected`)
  }, [type])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "?" || (e.shiftKey && e.key === "/")) return
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === "v") { e.preventDefault(); copy() }
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === "l") { e.preventDefault(); cycleType() }
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === "x") { e.preventDefault(); addStop() }
    }
    window.addEventListener("keydown", handler)
    return () => window.removeEventListener("keydown", handler)
  }, [copy, cycleType, addStop])

  useEffect(() => {
    return () => { if (copiedTimeoutRef.current) clearTimeout(copiedTimeoutRef.current) }
  }, [])

  return (
    <div className="flex flex-1 flex-col min-h-0">

      {/* Desktop: top action bar */}
      <div className="hidden md:flex shrink-0 items-center gap-2 border-b border-border bg-card/95 backdrop-blur-sm px-4 py-2">
        <span className="text-sm font-semibold shrink-0 mr-1">Gradient Generator</span>
        <div className="ml-auto flex items-center gap-1.5">
          <ShortcutsModal pageName="Gradient Generator" shortcuts={[
            { keys: ["Ctrl", "Shift", "V"], description: "Copy CSS" },
            { keys: ["Ctrl", "Shift", "L"], description: "Cycle gradient type" },
            { keys: ["Ctrl", "Shift", "X"], description: "Add color stop" },
            { keys: ["?"], description: "Toggle this panel" },
          ]} />
          <Button variant="outline" size="sm" onClick={copy} aria-label={copied ? "CSS copied" : "Copy CSS"}>
            {copied ? <Check className="h-4 w-4 mr-1" aria-hidden="true" /> : <Copy className="h-4 w-4 mr-1" aria-hidden="true" />}
            {copied ? "Copied!" : "Copy CSS"}
            <kbd className="ml-1 hidden md:inline rounded border border-border bg-muted px-1 text-[10px]" aria-hidden="true">Ctrl+Shift+V</kbd>
          </Button>
        </div>
      </div>

      {/* Mobile: compact header + tab switcher */}
      <div className="flex md:hidden flex-col shrink-0 border-b border-border">
        <div className="flex items-center justify-between px-4 pt-3 pb-2">
          <h2 className="text-base font-semibold">Gradient Generator</h2>
          <ShortcutsModal pageName="Gradient Generator" shortcuts={[
            { keys: ["Ctrl", "Shift", "V"], description: "Copy CSS" },
            { keys: ["Ctrl", "Shift", "L"], description: "Cycle gradient type" },
            { keys: ["Ctrl", "Shift", "X"], description: "Add color stop" },
            { keys: ["?"], description: "Toggle this panel" },
          ]} />
        </div>
        <div className="flex" role="tablist" aria-label="Panel selection">
          <button role="tab" aria-selected={activeTab === "input"} onClick={() => setActiveTab("input")}
            className={`flex-1 py-2.5 text-sm font-medium border-b-2 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-inset ${activeTab === "input" ? "border-primary text-foreground" : "border-transparent text-muted-foreground"}`}>
            Controls
          </button>
          <button role="tab" aria-selected={activeTab === "output"} onClick={() => setActiveTab("output")}
            className={`flex-1 py-2.5 text-sm font-medium border-b-2 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-inset ${activeTab === "output" ? "border-primary text-foreground" : "border-transparent text-muted-foreground"}`}>
            Preview
          </button>
        </div>
      </div>

      <div className="flex-1 min-h-0 flex flex-col md:flex-row overflow-hidden">
        {/* Left — Controls */}
        <div className={`${activeTab === "input" ? "flex" : "hidden"} md:flex flex-col flex-1 min-h-0 overflow-hidden border-b md:border-b-0 md:border-r border-border bg-card`}>
          <div className="shrink-0 border-b border-border px-4 py-3">
            <span className="text-sm font-medium">Controls</span>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-5">
            <div className="space-y-2">
              <Label className="text-sm font-medium">Type <kbd className="ml-2 hidden md:inline rounded border border-border bg-muted px-1 text-[10px]" aria-hidden="true">Ctrl+Shift+L</kbd></Label>
              <div className="flex gap-2" role="group" aria-label="Gradient type">
                {(["linear", "radial", "conic"] as GradientType[]).map(t => (
                  <button
                    key={t}
                    onClick={() => { setType(t); announceToScreenReader(`${t} gradient selected`) }}
                    aria-pressed={type === t}
                    aria-label={`${t} gradient type`}
                    className={`text-sm px-4 py-1.5 rounded-full border capitalize transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 ${type === t ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground hover:border-primary/50"}`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>

            {type === "linear" && (
              <div className="space-y-3">
                <Label className="text-sm font-medium">Direction</Label>
                <div className="flex gap-1 flex-wrap" role="group" aria-label="Gradient direction">
                  {DIRECTIONS.map(({ label, value }) => (
                    <button
                      key={value}
                      onClick={() => { setDirection(value); setUseAngle(false); announceToScreenReader(`Direction ${value}`) }}
                      aria-pressed={direction === value && !useAngle}
                      aria-label={`Direction ${value}`}
                      title={value}
                      className={`w-9 h-9 rounded border text-base transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 ${direction === value && !useAngle ? "bg-primary text-primary-foreground border-primary" : "border-border hover:border-primary/50"}`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-muted-foreground" id="custom-angle-label">Custom angle:</span>
                  <Input
                    type="number" value={angle} min={0} max={360}
                    onChange={(e) => { setAngle(parseInt(e.target.value) || 0); setUseAngle(true) }}
                    onFocus={() => setUseAngle(true)}
                    className="w-20 font-mono"
                    aria-label="Custom angle in degrees"
                    aria-describedby="custom-angle-label"
                  />
                  <span className="text-xs text-muted-foreground">deg</span>
                </div>
              </div>
            )}

            {type === "conic" && (
              <div className="space-y-2">
                <Label className="text-sm font-medium" id="starting-angle-label">Starting Angle</Label>
                <div className="flex items-center gap-3">
                  <Input
                    type="number"
                    value={angle}
                    min={0}
                    max={360}
                    onChange={(e) => setAngle(parseInt(e.target.value) || 0)}
                    className="w-20 font-mono"
                    aria-label="Starting angle in degrees"
                    aria-describedby="starting-angle-label"
                  />
                  <span className="text-xs text-muted-foreground">deg</span>
                </div>
              </div>
            )}

            <div className="space-y-3" role="region" aria-labelledby="color-stops-label">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-medium" id="color-stops-label">Color Stops</Label>
                <Button variant="outline" size="sm" onClick={addStop} aria-label="Add color stop">
                  <Plus className="h-4 w-4 mr-1" aria-hidden="true" />Add Stop
                  <kbd className="ml-2 hidden md:inline rounded border border-border bg-muted px-1 text-[10px]" aria-hidden="true">Ctrl+Shift+X</kbd>
                </Button>
              </div>
              {sorted.map((stop) => (
                <div key={stop.id} className="flex items-center gap-3" role="group" aria-label={`Color stop ${stop.position}%`}>
                  <input
                    type="color" value={stop.color}
                    onChange={(e) => { updateStop(stop.id, "color", e.target.value); announceToScreenReader(`Color changed to ${e.target.value}`) }}
                    className="w-10 h-10 rounded border border-border cursor-pointer p-0.5 shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                    aria-label={`Stop ${stop.position}% color picker`}
                  />
                  <Input
                    value={stop.color}
                    onChange={(e) => updateStop(stop.id, "color", e.target.value)}
                    className="w-28 font-mono text-sm shrink-0"
                    aria-label={`Stop ${stop.position}% hex color`}
                  />
                  <div className="flex-1 min-w-0">
                    <Slider
                      value={[stop.position]}
                      onValueChange={([v]) => updateStop(stop.id, "position", v)}
                      min={0}
                      max={100}
                      step={1}
                      aria-label={`Stop ${stop.position}% position`}
                    />
                  </div>
                  <span className="text-xs font-mono w-9 text-right shrink-0" aria-label={`${stop.position} percent`}>{stop.position}%</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeStop(stop.id)}
                    disabled={stops.length <= 2}
                    className="shrink-0 text-muted-foreground hover:text-destructive focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-destructive"
                    aria-label={`Remove stop at ${stop.position}%`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>

            {/* Usage guide */}
            <div className="rounded-xl border border-border bg-card p-4 space-y-4">
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">How to use</p>
              <ol className="space-y-1.5 text-xs text-muted-foreground list-decimal list-inside">
                <li>Choose a <span className="text-foreground font-medium">Type</span>: Linear (directional blend), Radial (center outward), or Conic (rotational sweep).</li>
                <li>For linear gradients, pick a direction arrow or enter a custom angle.</li>
                <li>Adjust the <span className="text-foreground font-medium">Color Stops</span>: change colors with the picker, drag the slider to reposition, or click <span className="text-foreground font-medium">Add Stop</span> for more stops.</li>
                <li>Click <span className="text-foreground font-medium">Copy CSS</span> to copy the <code className="bg-muted px-1 rounded">background</code> property, ready to paste into your stylesheet.</li>
              </ol>
              <div className="border-t border-border pt-3 space-y-1">
                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">Keyboard shortcuts</p>
                <p className="text-xs text-muted-foreground"><kbd className="rounded border border-border bg-muted px-1 text-[10px]">Ctrl+Shift+V</kbd> copy CSS &nbsp; <kbd className="rounded border border-border bg-muted px-1 text-[10px]">Ctrl+Shift+L</kbd> cycle type &nbsp; <kbd className="rounded border border-border bg-muted px-1 text-[10px]">Ctrl+Shift+X</kbd> add stop</p>
              </div>
              <p className="text-xs text-muted-foreground">Everything runs in your browser. Nothing is sent to a server.</p>
            </div>

            <div className="md:hidden h-[60px]" aria-hidden="true" />
          </div>
        </div>

        {/* Right — Preview + Code */}
        <div className={`${activeTab === "output" ? "flex" : "hidden"} md:flex flex-col flex-1 min-h-0 overflow-hidden bg-card`}>
          <div className="shrink-0 border-b border-border px-4 py-3">
            <span className="text-sm font-medium">Preview</span>
          </div>
          <div className="flex-1 p-4 flex flex-col gap-4 min-h-0">
            <div
              className="flex-1 rounded-xl border border-border shadow-inner min-h-0"
              style={{ background: cssValue }}
              role="img"
              aria-label={`Gradient preview showing ${type} gradient with ${stops.length} color stops`}
            />
          </div>
          <div className="shrink-0 border-t border-border bg-card/95 backdrop-blur-sm px-4 py-3 space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium">CSS Output</Label>
              <Button variant="ghost" size="sm" onClick={copy} aria-label={copied ? "CSS copied" : "Copy CSS"}>
                {copied ? <Check className="h-4 w-4 mr-1" aria-hidden="true" /> : <Copy className="h-4 w-4 mr-1" aria-hidden="true" />}
                {copied ? "Copied!" : "Copy"}
                <kbd className="ml-2 hidden md:inline rounded border border-border bg-muted px-1 text-[10px]" aria-hidden="true">Ctrl+Shift+V</kbd>
              </Button>
            </div>
            <pre className="rounded-lg border border-border bg-muted/20 p-3 text-xs font-mono overflow-x-auto whitespace-pre-wrap break-all leading-relaxed" aria-live="polite">{css}</pre>
          </div>
        </div>
      </div>

      {/* Mobile: bottom action bar */}
      <div
        className="md:hidden fixed bottom-0 left-0 right-0 flex items-center gap-2 border-t border-border bg-card/95 backdrop-blur-sm px-3 py-2 z-20"
        style={{ paddingBottom: "max(0.5rem, env(safe-area-inset-bottom))" }}
      >
        <Button variant="outline" size="sm" className="h-11 px-3" onClick={addStop} aria-label="Add color stop">
          <Plus className="h-4 w-4 mr-1.5" aria-hidden="true" />Add Stop
        </Button>
        <div className="flex-1" />
        <Button size="sm" className="h-11 px-4" onClick={copy} aria-label="Copy CSS">
          {copied ? <Check className="h-4 w-4 mr-1.5" aria-hidden="true" /> : <Copy className="h-4 w-4 mr-1.5" aria-hidden="true" />}
          {copied ? "Copied!" : "Copy CSS"}
        </Button>
      </div>
    </div>
  )
}
