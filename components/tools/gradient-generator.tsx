"use client"

import { useState, useCallback, useEffect, useRef, useMemo } from "react"
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

// ── Color helpers ──────────────────────────────────────────────────────────────
function hexToHSL(hex: string): { h: number; s: number; l: number } {
  let r = 0, g = 0, b = 0
  if (hex.length === 4) { r = parseInt(hex[1]+hex[1], 16); g = parseInt(hex[2]+hex[2], 16); b = parseInt(hex[3]+hex[3], 16) }
  else if (hex.length === 7) { r = parseInt(hex.slice(1,3), 16); g = parseInt(hex.slice(3,5), 16); b = parseInt(hex.slice(5,7), 16) }
  r /= 255; g /= 255; b /= 255
  const max = Math.max(r,g,b), min = Math.min(r,g,b)
  let h = 0, s = 0
  const l = (max + min) / 2
  if (max !== min) {
    const d = max - min
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
    switch (max) {
      case r: h = ((g-b)/d + (g < b ? 6 : 0)) / 6; break
      case g: h = ((b-r)/d + 2) / 6; break
      case b: h = ((r-g)/d + 4) / 6; break
    }
  }
  return { h: Math.round(h*360), s: Math.round(s*100), l: Math.round(l*100) }
}

function hslToHex(h: number, s: number, l: number): string {
  s /= 100; l /= 100
  const k = (n: number) => (n + h / 30) % 12
  const a = s * Math.min(l, 1 - l)
  const f = (n: number) => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)))
  const toHex = (x: number) => Math.round(x * 255).toString(16).padStart(2, "0")
  return `#${toHex(f(0))}${toHex(f(8))}${toHex(f(4))}`
}

function hslToRgb(h: number, s: number, l: number) {
  s /= 100; l /= 100
  const k = (n: number) => (n + h / 30) % 12
  const a = s * Math.min(l, 1 - l)
  const f = (n: number) => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)))
  return { r: Math.round(f(0)*255), g: Math.round(f(8)*255), b: Math.round(f(4)*255) }
}

// ── Color blindness simulation ─────────────────────────────────────────────────
type CBMode = "none" | "deuteranopia" | "protanopia" | "tritanopia"

function simulateColorBlindness(hex: string, mode: CBMode): string {
  if (mode === "none" || !hex.startsWith("#") || hex.length !== 7) return hex
  const r = parseInt(hex.slice(1, 3), 16) / 255
  const g = parseInt(hex.slice(3, 5), 16) / 255
  const b = parseInt(hex.slice(5, 7), 16) / 255
  let sr: number, sg: number, sb: number
  switch (mode) {
    case "deuteranopia": sr = 0.625*r + 0.375*g; sg = 0.7*r + 0.3*g; sb = 0.3*g + 0.7*b; break
    case "protanopia":   sr = 0.567*r + 0.433*g; sg = 0.558*r + 0.442*g; sb = 0.242*g + 0.758*b; break
    case "tritanopia":   sr = 0.95*r + 0.05*g; sg = 0.433*g + 0.567*b; sb = 0.475*g + 0.525*b; break
    default: return hex
  }
  const toH = (v: number) => Math.round(Math.max(0, Math.min(1, v)) * 255).toString(16).padStart(2, "0")
  return `#${toH(sr)}${toH(sg)}${toH(sb)}`
}

const CB_MODES: [CBMode, string][] = [
  ["none", "Normal"], ["deuteranopia", "Deuter."], ["protanopia", "Protan."], ["tritanopia", "Tritan."],
]

// ── Gradient types & constants ─────────────────────────────────────────────────
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

// ── Custom color picker ────────────────────────────────────────────────────────
function ColorPicker({ value, onChange, label, shortcut, id }: {
  value: string; onChange: (hex: string) => void; label?: string; shortcut?: string; id?: string
}) {
  const hsl = useMemo(() => hexToHSL(value), [value])
  const [h, setH] = useState(hsl.h)
  const [s, setS] = useState(hsl.s)
  const [l, setL] = useState(hsl.l)
  const [hexInput, setHexInput] = useState(value)
  const [open, setOpen] = useState(false)

  useEffect(() => {
    const parsed = hexToHSL(value)
    setH(parsed.h); setS(parsed.s); setL(parsed.l)
    setHexInput(value)
  }, [value])

  const commit = useCallback((nh: number, ns: number, nl: number) => {
    const hex = hslToHex(nh, ns, nl)
    setHexInput(hex)
    onChange(hex)
  }, [onChange])

  const slRef = useRef<HTMLDivElement>(null)
  const draggingSL = useRef(false)
  const handleSLPointer = useCallback((e: React.PointerEvent) => {
    if (!slRef.current) return
    e.preventDefault()
    const rect = slRef.current.getBoundingClientRect()
    const nx = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width))
    const ny = Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height))
    const ns = Math.round(nx * 100)
    const nl = Math.round((1 - ny) * 100)
    setS(ns); setL(nl)
    commit(h, ns, nl)
  }, [h, commit])

  const hueRef = useRef<HTMLDivElement>(null)
  const draggingH = useRef(false)
  const handleHuePointer = useCallback((e: React.PointerEvent) => {
    if (!hueRef.current) return
    e.preventDefault()
    const rect = hueRef.current.getBoundingClientRect()
    const nx = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width))
    const nh = Math.round(nx * 360)
    setH(nh)
    commit(nh, s, l)
  }, [s, l, commit])

  const handleHexInput = (raw: string) => {
    setHexInput(raw)
    const clean = raw.startsWith("#") ? raw : `#${raw}`
    if (/^#[0-9a-fA-F]{6}$/.test(clean)) onChange(clean)
  }

  const rgb = hslToRgb(h, s, l)
  const thumbX = `${s}%`
  const thumbY = `${100 - l}%`
  const hueX = `${(h / 360) * 100}%`

  return (
    <div className="space-y-1.5">
      {label && (
        <Label className="text-sm" id={`color-label-${label.toLowerCase()}`}>
          {label}
          {shortcut && (
            <kbd className="ml-2 hidden md:inline rounded border border-border bg-muted px-1 text-[10px]" aria-hidden="true">{shortcut}</kbd>
          )}
        </Label>
      )}
      <button
        type="button"
        id={id}
        onClick={() => {
          setOpen(v => !v)
          if (!open && label) announceToScreenReader(`${label} color picker opened`)
        }}
        className="flex items-center gap-2 w-full rounded-lg border border-border bg-muted/30 px-3 py-2 hover:border-primary/50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={label ? undefined : `Color picker, current color: ${hexInput}`}
        aria-labelledby={label ? `color-label-${label.toLowerCase()}` : undefined}
      >
        <span className="h-6 w-6 rounded-md border border-border shrink-0" style={{ backgroundColor: value }} aria-hidden="true" />
        <span className="font-mono text-sm flex-1 text-left">{hexInput}</span>
        <span className="text-xs text-muted-foreground">{open ? "Close" : "Edit"}</span>
      </button>

      {open && (
        <div className="rounded-xl border border-border bg-popover shadow-xl p-3 space-y-3" role="dialog" aria-label={`${label ?? "Color"} picker`}>
          <div
            ref={slRef}
            className="relative h-36 w-full rounded-lg cursor-crosshair select-none"
            style={{ background: `linear-gradient(to top, #000, transparent), linear-gradient(to right, #fff, hsl(${h}, 100%, 50%))`, touchAction: "none" }}
            onPointerDown={(e) => { draggingSL.current = true; e.currentTarget.setPointerCapture(e.pointerId); handleSLPointer(e) }}
            onPointerMove={(e) => { if (draggingSL.current) handleSLPointer(e) }}
            onPointerUp={(e) => { draggingSL.current = false; e.currentTarget.releasePointerCapture(e.pointerId) }}
            onPointerCancel={() => { draggingSL.current = false }}
            role="slider"
            aria-label="Saturation and lightness"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={s}
            aria-valuetext={`Saturation ${s}%, Lightness ${l}%`}
            tabIndex={0}
          >
            <div
              className="absolute h-4 w-4 rounded-full border-2 border-white shadow-md -translate-x-1/2 -translate-y-1/2 pointer-events-none"
              style={{ left: thumbX, top: thumbY, backgroundColor: value }}
              aria-hidden="true"
            />
          </div>

          <div
            ref={hueRef}
            className="relative h-4 w-full rounded-full cursor-pointer select-none"
            style={{ background: "linear-gradient(to right, #f00, #ff0, #0f0, #0ff, #00f, #f0f, #f00)", touchAction: "none" }}
            onPointerDown={(e) => { draggingH.current = true; e.currentTarget.setPointerCapture(e.pointerId); handleHuePointer(e) }}
            onPointerMove={(e) => { if (draggingH.current) handleHuePointer(e) }}
            onPointerUp={(e) => { draggingH.current = false; e.currentTarget.releasePointerCapture(e.pointerId) }}
            onPointerCancel={() => { draggingH.current = false }}
            role="slider"
            aria-label="Hue"
            aria-valuemin={0}
            aria-valuemax={360}
            aria-valuenow={h}
            aria-valuetext={`Hue ${h} degrees`}
            tabIndex={0}
          >
            <div
              className="absolute h-5 w-5 rounded-full border-2 border-white shadow-md top-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none"
              style={{ left: hueX, backgroundColor: `hsl(${h}, 100%, 50%)` }}
              aria-hidden="true"
            />
          </div>

          <div className="flex gap-2 items-center">
            <span className="h-8 w-8 rounded-md border border-border shrink-0" style={{ backgroundColor: value }} aria-hidden="true" />
            <Input
              value={hexInput}
              onChange={(e) => handleHexInput(e.target.value)}
              className="flex-1 font-mono text-sm h-8"
              placeholder="#000000"
              aria-label="Hex color value"
            />
            <span className="text-xs text-muted-foreground shrink-0" aria-label={`RGB: ${rgb.r}, ${rgb.g}, ${rgb.b}`}>
              {rgb.r}, {rgb.g}, {rgb.b}
            </span>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Main component ─────────────────────────────────────────────────────────────
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
  const [cbMode, setCbMode] = useState<CBMode>("none")

  const sorted = [...stops].sort((a, b) => a.position - b.position)
  const stopsStr = sorted.map(s => `${s.color} ${s.position}%`).join(", ")

  const cssValue =
    type === "linear" ? `linear-gradient(${useAngle ? `${angle}deg` : direction}, ${stopsStr})`
    : type === "radial" ? `radial-gradient(circle, ${stopsStr})`
    : `conic-gradient(from ${angle}deg, ${stopsStr})`

  const css = `background: ${cssValue};`

  // Simulated gradient for the preview — CSS output always uses original colors
  const simulatedStopsStr = sorted.map(s => `${simulateColorBlindness(s.color, cbMode)} ${s.position}%`).join(", ")
  const simulatedCssValue =
    type === "linear" ? `linear-gradient(${useAngle ? `${angle}deg` : direction}, ${simulatedStopsStr})`
    : type === "radial" ? `radial-gradient(circle, ${simulatedStopsStr})`
    : `conic-gradient(from ${angle}deg, ${simulatedStopsStr})`

  const changeCbMode = useCallback((mode: CBMode) => {
    setCbMode(mode)
    announceToScreenReader(mode === "none" ? "Normal color vision" : `Color vision simulation: ${mode}`)
  }, [])

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
    if (stops.length <= 2) return
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
                <div key={stop.id} className="rounded-lg border border-border p-3 space-y-3" role="group" aria-label={`Color stop at ${stop.position}%`}>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 min-w-0">
                      <ColorPicker
                        value={stop.color}
                        onChange={(hex) => { updateStop(stop.id, "color", hex); announceToScreenReader(`Color changed to ${hex}`) }}
                      />
                    </div>
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
                  <div className="flex items-center gap-3">
                    <div className="flex-1">
                      <Slider
                        value={[stop.position]}
                        onValueChange={([v]) => updateStop(stop.id, "position", v)}
                        min={0}
                        max={100}
                        step={1}
                        aria-label={`Color stop position: ${stop.position}%`}
                      />
                    </div>
                    <span className="text-xs font-mono w-9 text-right shrink-0" aria-label={`${stop.position} percent`}>{stop.position}%</span>
                  </div>
                </div>
              ))}
            </div>

            {/* Usage guide */}
            <div className="rounded-xl border border-border bg-card p-4 space-y-4">
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">How to use</p>
              <ol className="space-y-1.5 text-xs text-muted-foreground list-decimal list-inside">
                <li>Choose a <span className="text-foreground font-medium">Type</span>: Linear (directional blend), Radial (center outward), or Conic (rotational sweep).</li>
                <li>For linear gradients, pick a direction arrow or enter a custom angle.</li>
                <li>Click a <span className="text-foreground font-medium">Color Stop</span> to open the visual picker. Drag in the gradient area to adjust saturation and lightness; drag the hue bar to change the color family.</li>
                <li>Drag the position slider to reposition a stop along the gradient. Click <span className="text-foreground font-medium">Add Stop</span> for more colors.</li>
                <li>Use the <span className="text-foreground font-medium">color vision simulation</span> buttons in the Preview panel header to check readability for people with different types of color vision.</li>
                <li>Click <span className="text-foreground font-medium">Copy CSS</span> to copy the <code className="bg-muted px-1 rounded">background</code> property ready to paste into your stylesheet.</li>
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
        <div className={`${activeTab === "output" ? "flex" : "hidden"} md:flex flex-col flex-1 min-h-0 overflow-y-auto md:overflow-hidden bg-card`}>
          <div className="shrink-0 border-b border-border px-4 py-3 flex items-center justify-between flex-wrap gap-2">
            <span className="text-sm font-medium">Preview</span>
            <div className="flex items-center gap-0.5" role="radiogroup" aria-label="Color vision simulation">
              {CB_MODES.map(([mode, label]) => (
                <button
                  key={mode}
                  onClick={() => changeCbMode(mode)}
                  role="radio"
                  aria-checked={cbMode === mode}
                  aria-label={`${label} color vision`}
                  className={`rounded px-1.5 py-0.5 text-[10px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                    cbMode === mode ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground hover:bg-muted"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
          <div className="p-4 md:flex-1 md:flex md:flex-col md:gap-4 md:min-h-0">
            <div
              className="h-[280px] md:h-auto md:flex-1 md:min-h-0 rounded-xl border border-border shadow-inner"
              style={{ background: simulatedCssValue }}
              role="img"
              aria-label={`Gradient preview: ${type} with ${stops.length} stops${cbMode !== "none" ? ` (${cbMode} simulation)` : ""}`}
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
          <div className="md:hidden h-[60px]" aria-hidden="true" />
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
