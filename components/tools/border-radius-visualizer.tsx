"use client"

import { useState } from "react"
import { Copy, Check } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Slider } from "@/components/ui/slider"

const PRESETS = [
  { label: "Square", tl: 0, tr: 0, br: 0, bl: 0 },
  { label: "Rounded", tl: 8, tr: 8, br: 8, bl: 8 },
  { label: "Large", tl: 16, tr: 16, br: 16, bl: 16 },
  { label: "Pill", tl: 50, tr: 50, br: 50, bl: 50 },
  { label: "Top only", tl: 16, tr: 16, br: 0, bl: 0 },
  { label: "Bottom only", tl: 0, tr: 0, br: 16, bl: 16 },
  { label: "Left only", tl: 16, tr: 0, br: 0, bl: 16 },
  { label: "Right only", tl: 0, tr: 16, br: 16, bl: 0 },
  { label: "Blob", tl: 60, tr: 30, br: 60, bl: 30 },
  { label: "Chat bubble", tl: 16, tr: 16, br: 4, bl: 16 },
]

export default function BorderRadiusVisualizer() {
  const [tl, setTl] = useState(8)
  const [tr, setTr] = useState(8)
  const [br, setBr] = useState(8)
  const [bl, setBl] = useState(8)
  const [unit, setUnit] = useState<"%" | "px">("%")
  const [linked, setLinked] = useState(false)
  const [boxColor, setBoxColor] = useState("#6366f1")
  const [copied, setCopied] = useState(false)

  const setAll = (v: number) => { setTl(v); setTr(v); setBr(v); setBl(v) }

  const handleCorner = (setter: (v: number) => void) => (v: number) => {
    setter(v)
    if (linked) setAll(v)
  }

  const all4Same = tl === tr && tr === br && br === bl
  const corners = `${tl}${unit} ${tr}${unit} ${br}${unit} ${bl}${unit}`
  const simplified = all4Same ? `${tl}${unit}` : corners
  const css = `border-radius: ${simplified};`
  const max = unit === "%" ? 50 : 200

  const copy = () => {
    navigator.clipboard.writeText(css)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const corners4 = [
    { label: "Top Left", value: tl, set: handleCorner(setTl) },
    { label: "Top Right", value: tr, set: handleCorner(setTr) },
    { label: "Bottom Right", value: br, set: handleCorner(setBr) },
    { label: "Bottom Left", value: bl, set: handleCorner(setBl) },
  ]

  return (
    <div className="h-full flex flex-col bg-background">
      {/* Header */}
      <div className="shrink-0 border-b border-border bg-background">
        <div className="flex items-center justify-between px-6 py-4">
          <div>
            <h1 className="text-xl font-semibold">Border Radius Visualizer</h1>
            <p className="text-sm text-muted-foreground">Build CSS border-radius values visually and copy the code.</p>
          </div>
          <div className="flex items-center gap-2">
            {(["px", "%"] as const).map(u => (
              <button key={u} onClick={() => setUnit(u)}
                className={`text-xs px-3 py-1 rounded-full border transition-colors ${unit === u ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground"}`}
              >{u}</button>
            ))}
            <button
              onClick={() => setLinked(l => !l)}
              className={`text-xs px-3 py-1 rounded-full border transition-colors ${linked ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground"}`}
            >
              {linked ? "🔒 Linked" : "🔓 Unlinked"}
            </button>
            <Button variant="outline" size="sm" onClick={copy}>
              {copied ? <Check className="h-4 w-4 mr-1" /> : <Copy className="h-4 w-4 mr-1" />}
              {copied ? "Copied!" : "Copy CSS"}
            </Button>
          </div>
        </div>
      </div>

      <div className="flex-1 flex flex-col md:flex-row overflow-y-auto md:overflow-hidden">
        {/* Left — Controls */}
        <div className="flex flex-col border-b md:border-b-0 md:border-r border-border md:w-1/2">
          <div className="p-3 border-b border-border bg-muted/30">
            <h3 className="text-sm font-medium">Controls</h3>
          </div>
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {/* Presets */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Presets</Label>
              <div className="flex flex-wrap gap-2">
                {PRESETS.map(({ label, tl: ptl, tr: ptr, br: pbr, bl: pbl }) => (
                  <button
                    key={label}
                    onClick={() => { setTl(ptl); setTr(ptr); setBr(pbr); setBl(pbl) }}
                    className="text-xs px-3 py-1 rounded border border-border text-muted-foreground hover:border-primary/50 transition-colors"
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* Corner sliders */}
            {corners4.map(({ label, value, set }) => (
              <div key={label} className="space-y-2">
                <div className="flex justify-between">
                  <Label className="text-sm">{label}</Label>
                  <span className="text-xs font-mono text-muted-foreground">{value}{unit}</span>
                </div>
                <Slider value={[value]} onValueChange={([v]) => set(v)} min={0} max={max} step={1} />
              </div>
            ))}

            {/* Box color */}
            <div className="space-y-2">
              <Label className="text-sm">Box Color</Label>
              <div className="flex items-center gap-3">
                <input type="color" value={boxColor} onChange={(e) => setBoxColor(e.target.value)}
                  className="w-10 h-10 rounded border border-border cursor-pointer p-0.5" />
                <span className="text-xs font-mono text-muted-foreground">{boxColor}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right — Preview + Code */}
        <div className="flex flex-col md:w-1/2 md:flex-1">
          <div className="p-3 border-b border-border bg-muted/30">
            <h3 className="text-sm font-medium">Preview</h3>
          </div>
          <div className="flex-1 flex flex-col p-6 gap-5 min-h-0">
            <div className="flex-1 flex items-center justify-center bg-muted/20 rounded-xl border border-border min-h-0">
              <div
                className="w-48 h-48 transition-all duration-100"
                style={{
                  backgroundColor: boxColor,
                  borderRadius: `${tl}${unit} ${tr}${unit} ${br}${unit} ${bl}${unit}`,
                }}
              />
            </div>
            <div className="shrink-0 space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-medium">CSS Output</Label>
                <Button variant="ghost" size="sm" onClick={copy}>
                  {copied ? <Check className="h-4 w-4 mr-1" /> : <Copy className="h-4 w-4 mr-1" />}
                  {copied ? "Copied!" : "Copy"}
                </Button>
              </div>
              <pre className="rounded-lg border border-border bg-muted/20 p-4 text-sm font-mono">{css}</pre>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
