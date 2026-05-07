"use client"

import { useState } from "react"
import { Copy, Check, Plus, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Slider } from "@/components/ui/slider"
import { Switch } from "@/components/ui/switch"

interface Shadow {
  id: number
  x: number
  y: number
  blur: number
  spread: number
  color: string
  opacity: number
  inset: boolean
}

let nextId = 2

function toRgba(hex: string, opacity: number) {
  const h = hex.replace("#", "")
  const r = parseInt(h.slice(0, 2), 16)
  const g = parseInt(h.slice(2, 4), 16)
  const b = parseInt(h.slice(4, 6), 16)
  return `rgba(${r}, ${g}, ${b}, ${(opacity / 100).toFixed(2)})`
}

function shadowToCss(s: Shadow) {
  return `${s.inset ? "inset " : ""}${s.x}px ${s.y}px ${s.blur}px ${s.spread}px ${toRgba(s.color, s.opacity)}`
}

const makeDefault = (): Shadow => ({
  id: nextId++, x: 4, y: 4, blur: 12, spread: 0, color: "#000000", opacity: 20, inset: false,
})

const CONTROLS = [
  { label: "X Offset", field: "x" as const, min: -100, max: 100, unit: "px" },
  { label: "Y Offset", field: "y" as const, min: -100, max: 100, unit: "px" },
  { label: "Blur", field: "blur" as const, min: 0, max: 100, unit: "px" },
  { label: "Spread", field: "spread" as const, min: -50, max: 50, unit: "px" },
  { label: "Opacity", field: "opacity" as const, min: 0, max: 100, unit: "%" },
]

export default function ShadowGenerator() {
  const [shadows, setShadows] = useState<Shadow[]>([
    { id: 1, x: 0, y: 4, blur: 16, spread: 0, color: "#000000", opacity: 20, inset: false },
  ])
  const [activeId, setActiveId] = useState(1)
  const [bgColor, setBgColor] = useState("#f1f5f9")
  const [boxColor, setBoxColor] = useState("#ffffff")
  const [copied, setCopied] = useState(false)

  const active = shadows.find(s => s.id === activeId) || shadows[0]

  const update = (id: number, field: keyof Shadow, value: unknown) =>
    setShadows(s => s.map(sh => sh.id === id ? { ...sh, [field]: value } : sh))

  const addLayer = () => {
    const s = makeDefault()
    setShadows(prev => [...prev, s])
    setActiveId(s.id)
  }

  const removeLayer = (id: number) => {
    setShadows(prev => {
      const next = prev.filter(s => s.id !== id)
      if (activeId === id && next.length > 0) setActiveId(next[0].id)
      return next
    })
  }

  const cssValue = shadows.map(shadowToCss).join(",\n       ")
  const css = `box-shadow: ${cssValue};`

  const copy = () => { navigator.clipboard.writeText(css); setCopied(true); setTimeout(() => setCopied(false), 2000) }

  return (
    <div className="h-screen flex flex-col bg-background">
      {/* Header */}
      <div className="shrink-0 border-b border-border bg-background">
        <div className="flex items-center justify-between px-6 py-4">
          <div>
            <h1 className="text-xl font-semibold">Box Shadow Generator</h1>
            <p className="text-sm text-muted-foreground">Build CSS box-shadows visually. Supports multiple layered shadows.</p>
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
          {/* Layer tabs */}
          <div className="shrink-0 flex items-center gap-1 p-2 border-b border-border overflow-x-auto">
            {shadows.map((s, i) => (
              <div key={s.id} className="flex items-center gap-0.5 shrink-0">
                <button
                  onClick={() => setActiveId(s.id)}
                  className={`text-xs px-3 py-1.5 rounded border transition-colors ${activeId === s.id ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground hover:border-primary/50"}`}
                >
                  Shadow {i + 1}
                </button>
                {shadows.length > 1 && (
                  <button onClick={() => removeLayer(s.id)} className="p-0.5 text-muted-foreground hover:text-destructive">
                    <Trash2 className="h-3 w-3" />
                  </button>
                )}
              </div>
            ))}
            <Button variant="ghost" size="sm" onClick={addLayer} className="ml-auto shrink-0">
              <Plus className="h-4 w-4 mr-1" />Add
            </Button>
          </div>

          <div className="flex-1 overflow-y-auto p-6 space-y-5">
            {/* Color + Inset */}
            <div className="flex items-end gap-4">
              <div className="space-y-1.5">
                <Label className="text-sm">Color</Label>
                <div className="flex items-center gap-2">
                  <input
                    type="color" value={active.color}
                    onChange={(e) => update(active.id, "color", e.target.value)}
                    className="w-10 h-10 rounded border border-border cursor-pointer p-0.5"
                  />
                  <Input
                    value={active.color}
                    onChange={(e) => update(active.id, "color", e.target.value)}
                    className="w-28 font-mono text-sm"
                  />
                </div>
              </div>
              <div className="space-y-1.5 ml-auto">
                <Label className="text-sm">Inset</Label>
                <Switch checked={active.inset} onCheckedChange={(v) => update(active.id, "inset", v)} />
              </div>
            </div>

            {CONTROLS.map(({ label, field, min, max, unit }) => (
              <div key={field} className="space-y-2">
                <div className="flex justify-between">
                  <Label className="text-sm">{label}</Label>
                  <span className="text-xs font-mono text-muted-foreground">{active[field]}{unit}</span>
                </div>
                <Slider
                  value={[active[field] as number]}
                  onValueChange={([v]) => update(active.id, field, v)}
                  min={min} max={max} step={1}
                />
              </div>
            ))}
          </div>
        </div>

        {/* Right — Preview + Code */}
        <div className="w-1/2 flex flex-col">
          <div className="p-3 border-b border-border bg-muted/30 flex items-center justify-between">
            <h3 className="text-sm font-medium">Preview</h3>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5">
                <Label className="text-xs text-muted-foreground">BG</Label>
                <input type="color" value={bgColor} onChange={(e) => setBgColor(e.target.value)}
                  className="w-7 h-7 rounded border border-border cursor-pointer p-0.5" />
              </div>
              <div className="flex items-center gap-1.5">
                <Label className="text-xs text-muted-foreground">Box</Label>
                <input type="color" value={boxColor} onChange={(e) => setBoxColor(e.target.value)}
                  className="w-7 h-7 rounded border border-border cursor-pointer p-0.5" />
              </div>
            </div>
          </div>

          <div className="flex-1 flex items-center justify-center p-8" style={{ backgroundColor: bgColor }}>
            <div
              className="w-40 h-40 rounded-xl transition-all duration-150"
              style={{ backgroundColor: boxColor, boxShadow: shadows.map(shadowToCss).join(", ") }}
            />
          </div>

          <div className="shrink-0 border-t border-border p-4 space-y-2">
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
  )
}
