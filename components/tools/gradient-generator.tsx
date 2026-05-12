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
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === "c") { e.preventDefault(); copy() }
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === "t") { e.preventDefault(); cycleType() }
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === "n") { e.preventDefault(); addStop() }
    }
    window.addEventListener("keydown", handler)
    return () => window.removeEventListener("keydown", handler)
  }, [copy, cycleType, addStop])

  useEffect(() => {
    return () => { if (copiedTimeoutRef.current) clearTimeout(copiedTimeoutRef.current) }
  }, [])

  return (
    <>
    <div className="flex h-full flex-col gap-3 p-4">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">Gradient Generator</h2>
          <p className="text-muted-foreground">Build CSS gradients visually and copy the code instantly. Press ? for shortcuts.</p>
        </div>
        <Button variant="outline" size="sm" onClick={copy} aria-label={copied ? "CSS copied to clipboard" : "Copy CSS to clipboard"}>
          {copied ? <Check className="h-4 w-4 mr-1" aria-hidden="true" /> : <Copy className="h-4 w-4 mr-1" aria-hidden="true" />}
          {copied ? "Copied!" : "Copy CSS"}
          {!copied && <kbd className="ml-2 rounded border border-border bg-muted px-1 text-[10px]" aria-hidden="true">Ctrl+Shift+C</kbd>}
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 flex-1 min-h-0">
        {/* Left — Controls */}
        <div className="flex flex-col overflow-hidden rounded-xl border border-border bg-card">
          <div className="shrink-0 border-b border-border px-4 py-3">
            <span className="text-sm font-medium">Controls</span>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-5">
            <div className="space-y-2">
              <Label className="text-sm font-medium">Type <kbd className="ml-2 rounded border border-border bg-muted px-1 text-[10px]" aria-hidden="true">Ctrl+Shift+T</kbd></Label>
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
                  <kbd className="ml-2 rounded border border-border bg-muted px-1 text-[10px]" aria-hidden="true">Ctrl+Shift+N</kbd>
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
          </div>
        </div>

        {/* Right — Preview + Code */}
        <div className="flex flex-col overflow-hidden rounded-xl border border-border bg-card">
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
          <div className="shrink-0 border-t border-border bg-card/95 backdrop-blur-sm px-4 py-3 space-y-2" role="region" aria-labelledby="css-output-label">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium" id="css-output-label">CSS Output</Label>
              <Button variant="ghost" size="sm" onClick={copy} aria-label={copied ? "CSS copied to clipboard" : "Copy CSS code"}>
                {copied ? <Check className="h-4 w-4 mr-1" aria-hidden="true" /> : <Copy className="h-4 w-4 mr-1" aria-hidden="true" />}
                {copied ? "Copied!" : "Copy"}
                {!copied && <kbd className="ml-2 rounded border border-border bg-muted px-1 text-[10px]" aria-hidden="true">Ctrl+Shift+C</kbd>}
              </Button>
            </div>
            <pre className="rounded-lg border border-border bg-muted/20 p-3 text-xs font-mono overflow-x-auto whitespace-pre-wrap break-all leading-relaxed" aria-live="polite">{css}</pre>
          </div>
        </div>
      </div>
    </div>
    <ShortcutsModal
      pageName="Gradient Generator"
      shortcuts={[
        { keys: ["Ctrl", "Shift", "C"], description: "Copy CSS" },
        { keys: ["Ctrl", "Shift", "T"], description: "Cycle gradient type" },
        { keys: ["Ctrl", "Shift", "N"], description: "Add color stop" },
        { keys: ["?"], description: "Toggle this panel" },
      ]}
    />
    </>
  )
}
