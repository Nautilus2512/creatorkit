"use client"

import { useState, useCallback, useEffect } from "react"
import { Copy, Check } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Slider } from "@/components/ui/slider"
import { ShortcutsModal } from "@/components/shortcuts-modal"

function announceToScreenReader(message: string) {
  const el = document.createElement("div")
  el.setAttribute("role", "status")
  el.setAttribute("aria-live", "polite")
  el.setAttribute("aria-atomic", "true")
  el.className = "sr-only"
  el.textContent = message
  document.body.appendChild(el)
  setTimeout(() => document.body.removeChild(el), 1000)
}

const PRESETS = [
  { label: "Square",      shortcut: "1", tl: 0,  tr: 0,  br: 0,  bl: 0  },
  { label: "Rounded",     shortcut: "2", tl: 8,  tr: 8,  br: 8,  bl: 8  },
  { label: "Large",       shortcut: "3", tl: 16, tr: 16, br: 16, bl: 16 },
  { label: "Pill",        shortcut: "4", tl: 50, tr: 50, br: 50, bl: 50 },
  { label: "Top only",    shortcut: "5", tl: 16, tr: 16, br: 0,  bl: 0  },
  { label: "Bottom only", shortcut: "6", tl: 0,  tr: 0,  br: 16, bl: 16 },
  { label: "Left only",   shortcut: "7", tl: 16, tr: 0,  br: 0,  bl: 16 },
  { label: "Right only",  shortcut: "8", tl: 0,  tr: 16, br: 16, bl: 0  },
  { label: "Blob",        shortcut: "9", tl: 60, tr: 30, br: 60, bl: 30 },
  { label: "Chat bubble", shortcut: "0", tl: 16, tr: 16, br: 4,  bl: 16 },
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
  const [activeTab, setActiveTab] = useState<"input" | "output">("input")

  const max = unit === "%" ? 50 : 200

  const setAll = useCallback((v: number) => { setTl(v); setTr(v); setBr(v); setBl(v) }, [])

  const handleCorner = useCallback((setter: (v: number) => void, label: string) => (v: number) => {
    setter(v)
    if (linked) setAll(v)
    if (v % 10 === 0 || v === max) announceToScreenReader(`${label} radius set to ${v}${unit}`)
  }, [linked, setAll, unit, max])

  const all4Same = tl === tr && tr === br && br === bl
  const simplified = all4Same ? `${tl}${unit}` : `${tl}${unit} ${tr}${unit} ${br}${unit} ${bl}${unit}`
  const css = `border-radius: ${simplified};`

  const copy = useCallback(() => {
    navigator.clipboard.writeText(css)
    setCopied(true)
    announceToScreenReader("CSS copied to clipboard")
    setTimeout(() => setCopied(false), 2000)
  }, [css])

  const applyPreset = useCallback((label: string, ptl: number, ptr: number, pbr: number, pbl: number) => {
    setTl(ptl); setTr(ptr); setBr(pbr); setBl(pbl)
    announceToScreenReader(`${label} preset applied`)
  }, [])

  const toggleUnit = useCallback((u: "%" | "px") => {
    setUnit(u)
    announceToScreenReader(`Unit set to ${u}`)
  }, [])

  const toggleLinked = useCallback(() => {
    const next = !linked
    setLinked(next)
    announceToScreenReader(next ? "Corners linked" : "Corners unlinked")
  }, [linked])

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
      if (!(e.ctrlKey || e.metaKey)) return
    }
    if ((e.ctrlKey || e.metaKey) && e.shiftKey) {
      switch (e.key.toLowerCase()) {
        case "v": e.preventDefault(); copy(); return
        case "u": e.preventDefault(); toggleUnit(unit === "%" ? "px" : "%"); return
        case "l": e.preventDefault(); toggleLinked(); return
      }
    }
    if (!e.ctrlKey && !e.metaKey && !e.altKey && /^[0-9]$/.test(e.key)) {
      const preset = PRESETS.find(p => p.shortcut === e.key)
      if (preset) { e.preventDefault(); applyPreset(preset.label, preset.tl, preset.tr, preset.br, preset.bl) }
    }
  }, [copy, unit, toggleUnit, toggleLinked, applyPreset])

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [handleKeyDown])

  const corners4 = [
    { label: "Top Left",     value: tl, set: handleCorner(setTl, "Top Left")     },
    { label: "Top Right",    value: tr, set: handleCorner(setTr, "Top Right")    },
    { label: "Bottom Right", value: br, set: handleCorner(setBr, "Bottom Right") },
    { label: "Bottom Left",  value: bl, set: handleCorner(setBl, "Bottom Left")  },
  ]

  const shortcuts = [
    { keys: ["0–9"], description: "Apply presets" },
    { keys: ["Ctrl", "Shift", "V"], description: "Copy CSS" },
    { keys: ["Ctrl", "Shift", "U"], description: "Toggle unit (px / %)" },
    { keys: ["Ctrl", "Shift", "L"], description: "Toggle linked corners" },
    { keys: ["?"], description: "Toggle shortcuts panel" },
  ]

  return (
    <div className="flex flex-1 flex-col min-h-0">

      {/* ── Desktop top action bar ── */}
      <div className="hidden md:flex shrink-0 items-center gap-2 border-b border-border bg-card/95 backdrop-blur-sm px-4 py-2" role="toolbar" aria-label="Border radius controls">
        <span className="text-sm font-semibold shrink-0 mr-1">Border Radius Visualizer</span>
        <div className="flex items-center gap-1" role="radiogroup" aria-label="Unit">
          {(["px", "%"] as const).map(u => (
            <button key={u} onClick={() => toggleUnit(u)} role="radio" aria-checked={unit === u} aria-label={`Unit: ${u}`}
              className={`text-xs px-2.5 py-1 rounded-full border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${unit === u ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground hover:border-primary/50"}`}>
              {u}
            </button>
          ))}
        </div>
        <button onClick={toggleLinked} aria-label={linked ? "Unlink corners" : "Link corners"} aria-pressed={linked}
          className={`text-xs px-2.5 py-1 rounded-full border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${linked ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground hover:border-primary/50"}`}>
          {linked ? "🔒 Linked" : "🔓 Unlinked"}
          <kbd className={`ml-1 hidden md:inline rounded border px-1 text-[10px] ${linked ? "border-primary-foreground/30 bg-primary-foreground/20" : "border-border bg-muted"}`} aria-hidden="true">Ctrl+Shift+L</kbd>
        </button>
        <div className="ml-auto flex items-center gap-1.5">
          <ShortcutsModal pageName="Border Radius Visualizer" shortcuts={shortcuts} />
          <Button variant="outline" size="sm" onClick={copy} aria-label="Copy CSS to clipboard">
            {copied ? <Check className="h-4 w-4 mr-1" aria-hidden="true" /> : <Copy className="h-4 w-4 mr-1" aria-hidden="true" />}
            {copied ? "Copied!" : "Copy CSS"}
            <kbd className="ml-1 hidden md:inline rounded border border-border bg-muted px-1 text-[10px]" aria-hidden="true">Ctrl+Shift+V</kbd>
          </Button>
        </div>
      </div>

      {/* ── Mobile: compact header + tab switcher ── */}
      <div className="flex md:hidden flex-col shrink-0 border-b border-border">
        <div className="flex items-center justify-between px-4 pt-3 pb-2">
          <h2 className="text-base font-semibold">Border Radius</h2>
          <ShortcutsModal pageName="Border Radius Visualizer" shortcuts={shortcuts} />
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

      {/* ── Scrollable content ── */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">

        {/* Panels card */}
        <div className="flex flex-col md:flex-row min-h-[500px] rounded-xl border border-border overflow-hidden">

          {/* Left: Controls */}
          <div
            className={`${activeTab === "input" ? "flex" : "hidden"} md:flex flex-col flex-1 min-h-0 overflow-hidden border-b md:border-b-0 md:border-r border-border bg-card`}
            role="region" aria-label="Border radius controls"
          >
            <div className="shrink-0 border-b border-border px-4 py-3">
              <span className="text-sm font-medium">Controls</span>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-5">

              {/* Presets */}
              <div className="space-y-2" role="group" aria-label="Preset styles">
                <Label className="text-sm font-medium">
                  Presets
                  <kbd className="ml-1.5 hidden md:inline rounded border border-border bg-muted px-1 text-[10px] font-normal text-muted-foreground" aria-hidden="true">0–9</kbd>
                </Label>
                <div className="flex flex-wrap gap-2">
                  {PRESETS.map(({ label, shortcut, tl: ptl, tr: ptr, br: pbr, bl: pbl }) => (
                    <button key={label}
                      onClick={() => applyPreset(label, ptl, ptr, pbr, pbl)}
                      className="text-xs px-3 py-1 rounded border border-border text-muted-foreground hover:border-primary/50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                      aria-label={`${label} preset (key ${shortcut})`}>
                      {label} <kbd className="ml-1 hidden md:inline rounded border border-border bg-muted px-1 text-[10px]" aria-hidden="true">{shortcut}</kbd>
                    </button>
                  ))}
                </div>
              </div>

              {/* Corner sliders */}
              <div className="space-y-4" role="group" aria-label="Corner radius sliders">
                {corners4.map(({ label, value, set }) => (
                  <div key={label} className="space-y-2">
                    <div className="flex justify-between items-center">
                      <Label className="text-sm" id={`${label.toLowerCase().replace(/ /g, "-")}-label`}>
                        {label}
                        <span className="ml-1 hidden md:inline-flex items-center gap-0.5" aria-hidden="true">
                          <kbd className="rounded border border-border bg-muted px-1 text-[10px] font-normal text-muted-foreground">Tab</kbd>
                          <kbd className="rounded border border-border bg-muted px-1 text-[10px] font-normal text-muted-foreground">← →</kbd>
                        </span>
                      </Label>
                      <span className="text-xs font-mono text-muted-foreground" aria-live="polite">{value}{unit}</span>
                    </div>
                    <Slider value={[value]} onValueChange={([v]) => set(v)} min={0} max={max} step={1}
                      aria-labelledby={`${label.toLowerCase().replace(/ /g, "-")}-label`} />
                  </div>
                ))}
              </div>

              {/* Box color */}
              <div className="space-y-2">
                <Label className="text-sm" id="color-label">Box Color</Label>
                <div className="flex items-center gap-3">
                  <input type="color" value={boxColor}
                    onChange={e => { setBoxColor(e.target.value); announceToScreenReader(`Box color changed to ${e.target.value}`) }}
                    className="w-10 h-10 rounded border border-border cursor-pointer p-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                    aria-labelledby="color-label" />
                  <span className="text-xs font-mono text-muted-foreground" aria-live="polite">{boxColor}</span>
                </div>
              </div>

            </div>
          </div>

          {/* Right: Preview + CSS output */}
          <div
            className={`${activeTab === "output" ? "flex" : "hidden"} md:flex flex-col flex-1 min-h-0 overflow-hidden bg-card`}
            role="region" aria-label="Preview and CSS output"
          >
            <div className="shrink-0 border-b border-border px-4 py-3">
              <span className="text-sm font-medium">Preview</span>
            </div>
            <div className="flex-1 flex flex-col p-4 gap-4 min-h-0">
              <div
                className="flex-1 flex items-center justify-center bg-muted/20 rounded-xl border border-border min-h-0"
                role="img" aria-label={`Preview box with ${simplified} border radius`}
              >
                <div className="w-48 h-48 transition-all duration-100"
                  style={{ backgroundColor: boxColor, borderRadius: `${tl}${unit} ${tr}${unit} ${br}${unit} ${bl}${unit}` }} />
              </div>
              <div className="shrink-0 space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-medium" id="css-output-label">CSS Output</Label>
                  <Button variant="ghost" size="sm" onClick={copy} aria-label="Copy CSS to clipboard">
                    {copied ? <Check className="h-4 w-4 mr-1" aria-hidden="true" /> : <Copy className="h-4 w-4 mr-1" aria-hidden="true" />}
                    {copied ? "Copied!" : "Copy"}
                    <kbd className="ml-2 hidden md:inline rounded border border-border bg-muted px-1 text-[10px]" aria-hidden="true">Ctrl+Shift+V</kbd>
                  </Button>
                </div>
                <pre className="rounded-lg border border-border bg-muted/20 p-4 text-sm font-mono" aria-live="polite" aria-atomic="true">{css}</pre>
              </div>
            </div>
          </div>

        </div>

        {/* Usage guide */}
        <div className="rounded-xl border border-border bg-card p-4 space-y-4">
          <div className="space-y-1.5">
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">How to use</p>
            <ol className="space-y-1.5 text-xs text-muted-foreground list-decimal list-inside">
              <li>Use the <span className="text-foreground font-medium">corner sliders</span> to set each corner's radius independently.</li>
              <li>Enable <span className="text-foreground font-medium">Linked</span> to move all four corners together in sync.</li>
              <li>Switch between <span className="text-foreground font-medium">px</span> and <span className="text-foreground font-medium">%</span> units. Percentage caps at 50%, producing a pill or circle shape.</li>
              <li>Click a <span className="text-foreground font-medium">preset</span> for a quick starting point, then fine-tune with the sliders.</li>
              <li>Click <span className="text-foreground font-medium">Copy CSS</span> and paste the value directly into your stylesheet.</li>
            </ol>
          </div>
          <div className="space-y-1.5">
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">Keyboard shortcuts</p>
            <ul className="space-y-1 text-xs text-muted-foreground list-disc list-inside">
              <li>Press <kbd className="rounded border border-border bg-muted px-1 text-[10px]">0</kbd>–<kbd className="rounded border border-border bg-muted px-1 text-[10px]">9</kbd> to apply a preset instantly.</li>
              <li><kbd className="rounded border border-border bg-muted px-1 text-[10px]">Ctrl+Shift+L</kbd> toggles linked corners. <kbd className="rounded border border-border bg-muted px-1 text-[10px]">Ctrl+Shift+U</kbd> toggles the unit.</li>
              <li><kbd className="rounded border border-border bg-muted px-1 text-[10px]">Ctrl+Shift+V</kbd> copies the CSS output.</li>
            </ul>
          </div>
          <div className="space-y-1.5">
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">Tips</p>
            <ul className="space-y-1 text-xs text-muted-foreground list-disc list-inside">
              <li>In % mode, 50% on all corners produces a circle (square element) or a pill (rectangular element).</li>
              <li>Mix different corner values for asymmetric shapes. The <span className="text-foreground font-medium">Blob</span> and <span className="text-foreground font-medium">Chat bubble</span> presets show what is possible.</li>
              <li>Everything runs in your browser. Nothing is sent to a server.</li>
            </ul>
          </div>
        </div>

        <div className="md:hidden h-[60px]" aria-hidden="true" />
      </div>

      {/* ── Mobile: bottom action bar ── */}
      <div
        className="md:hidden fixed bottom-0 left-0 right-0 flex items-center gap-2 border-t border-border bg-card/95 backdrop-blur-sm px-3 py-2 z-20"
        style={{ paddingBottom: "max(0.5rem, env(safe-area-inset-bottom))" }}
      >
        <div className="flex items-center gap-1" role="radiogroup" aria-label="Unit">
          {(["px", "%"] as const).map(u => (
            <button key={u} onClick={() => toggleUnit(u)}
              role="radio" aria-checked={unit === u} aria-label={`Unit: ${u}`}
              className={`h-11 px-3 text-xs rounded-md border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${unit === u ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground"}`}>
              {u}
            </button>
          ))}
        </div>
        <div className="flex-1" />
        <Button variant="outline" size="sm" className="h-11 px-4" onClick={copy} aria-label="Copy CSS">
          {copied ? <Check className="h-4 w-4 mr-1.5" aria-hidden="true" /> : <Copy className="h-4 w-4 mr-1.5" aria-hidden="true" />}
          {copied ? "Copied!" : "Copy CSS"}
        </Button>
      </div>

    </div>
  )
}
