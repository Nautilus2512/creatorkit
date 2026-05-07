"use client"

import { useState } from "react"
import { Copy, Check, Plus, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Slider } from "@/components/ui/slider"

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

  const sorted = [...stops].sort((a, b) => a.position - b.position)
  const stopsStr = sorted.map(s => `${s.color} ${s.position}%`).join(", ")

  const cssValue =
    type === "linear" ? `linear-gradient(${useAngle ? `${angle}deg` : direction}, ${stopsStr})`
    : type === "radial" ? `radial-gradient(circle, ${stopsStr})`
    : `conic-gradient(from ${angle}deg, ${stopsStr})`

  const css = `background: ${cssValue};`

  const copy = () => { navigator.clipboard.writeText(css); setCopied(true); setTimeout(() => setCopied(false), 2000) }

  const updateStop = (id: number, field: keyof Stop, value: string | number) =>
    setStops(s => s.map(st => st.id === id ? { ...st, [field]: value } : st))

  const addStop = () => {
    const pos = Math.round((sorted[0].position + sorted[sorted.length - 1].position) / 2)
    setStops(s => [...s, { id: nextId++, color: "#ffffff", position: pos }])
  }

  const removeStop = (id: number) => {
    if (stops.length <= 2) return
    setStops(s => s.filter(st => st.id !== id))
  }

  return (
    <div className="h-screen flex flex-col bg-background">
      {/* Header */}
      <div className="shrink-0 border-b border-border bg-background">
        <div className="flex items-center justify-between px-6 py-4">
          <div>
            <h1 className="text-xl font-semibold">Gradient Generator</h1>
            <p className="text-sm text-muted-foreground">Build CSS gradients visually and copy the code instantly.</p>
          </div>
          <Button variant="outline" size="sm" onClick={copy}>
            {copied ? <Check className="h-4 w-4 mr-1" /> : <Copy className="h-4 w-4 mr-1" />}
            {copied ? "Copied!" : "Copy CSS"}
          </Button>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Left — Controls */}
        <div className="w-1/2 flex flex-col border-r border-border">
          <div className="p-3 border-b border-border bg-muted/30">
            <h3 className="text-sm font-medium">Controls</h3>
          </div>
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {/* Type */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Type</Label>
              <div className="flex gap-2">
                {(["linear", "radial", "conic"] as GradientType[]).map(t => (
                  <button
                    key={t}
                    onClick={() => setType(t)}
                    className={`text-sm px-4 py-1.5 rounded-full border capitalize transition-colors ${type === t ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground hover:border-primary/50"}`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>

            {/* Direction */}
            {type === "linear" && (
              <div className="space-y-3">
                <Label className="text-sm font-medium">Direction</Label>
                <div className="flex gap-1 flex-wrap">
                  {DIRECTIONS.map(({ label, value }) => (
                    <button
                      key={value}
                      onClick={() => { setDirection(value); setUseAngle(false) }}
                      className={`w-9 h-9 rounded border text-base transition-colors ${direction === value && !useAngle ? "bg-primary text-primary-foreground border-primary" : "border-border hover:border-primary/50"}`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-muted-foreground">Custom angle:</span>
                  <Input
                    type="number" value={angle} min={0} max={360}
                    onChange={(e) => { setAngle(parseInt(e.target.value) || 0); setUseAngle(true) }}
                    onFocus={() => setUseAngle(true)}
                    className="w-20 font-mono"
                  />
                  <span className="text-xs text-muted-foreground">deg</span>
                </div>
              </div>
            )}

            {type === "conic" && (
              <div className="space-y-2">
                <Label className="text-sm font-medium">Starting Angle</Label>
                <div className="flex items-center gap-3">
                  <Input
                    type="number" value={angle} min={0} max={360}
                    onChange={(e) => setAngle(parseInt(e.target.value) || 0)}
                    className="w-20 font-mono"
                  />
                  <span className="text-xs text-muted-foreground">deg</span>
                </div>
              </div>
            )}

            {/* Color stops */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-medium">Color Stops</Label>
                <Button variant="outline" size="sm" onClick={addStop}>
                  <Plus className="h-4 w-4 mr-1" />Add Stop
                </Button>
              </div>
              {sorted.map((stop) => (
                <div key={stop.id} className="flex items-center gap-3">
                  <input
                    type="color" value={stop.color}
                    onChange={(e) => updateStop(stop.id, "color", e.target.value)}
                    className="w-10 h-10 rounded border border-border cursor-pointer p-0.5 shrink-0"
                  />
                  <Input
                    value={stop.color}
                    onChange={(e) => updateStop(stop.id, "color", e.target.value)}
                    className="w-28 font-mono text-sm shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <Slider
                      value={[stop.position]}
                      onValueChange={([v]) => updateStop(stop.id, "position", v)}
                      min={0} max={100} step={1}
                    />
                  </div>
                  <span className="text-xs font-mono w-9 text-right shrink-0">{stop.position}%</span>
                  <Button
                    variant="ghost" size="sm"
                    onClick={() => removeStop(stop.id)}
                    disabled={stops.length <= 2}
                    className="shrink-0 text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right — Preview + Code */}
        <div className="w-1/2 flex flex-col">
          <div className="p-3 border-b border-border bg-muted/30">
            <h3 className="text-sm font-medium">Preview</h3>
          </div>
          <div className="flex-1 p-6 flex flex-col gap-5 min-h-0">
            <div
              className="flex-1 rounded-xl border border-border shadow-inner min-h-0"
              style={{ background: cssValue }}
            />
            <div className="shrink-0 space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-medium">CSS Output</Label>
                <Button variant="ghost" size="sm" onClick={copy}>
                  {copied ? <Check className="h-4 w-4 mr-1" /> : <Copy className="h-4 w-4 mr-1" />}
                  {copied ? "Copied!" : "Copy"}
                </Button>
              </div>
              <pre className="rounded-lg border border-border bg-muted/20 p-4 text-xs font-mono overflow-x-auto whitespace-pre-wrap break-all leading-relaxed">
                {css}
              </pre>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
