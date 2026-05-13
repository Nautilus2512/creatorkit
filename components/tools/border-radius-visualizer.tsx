"use client"

import { useState, useCallback, useEffect } from "react"
import { Copy, Check } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Slider } from "@/components/ui/slider"
import { ShortcutsModal } from "@/components/shortcuts-modal"

// Accessibility helper for screen reader announcements
function announceToScreenReader(message: string) {
  const announcement = document.createElement('div')
  announcement.setAttribute('role', 'status')
  announcement.setAttribute('aria-live', 'polite')
  announcement.setAttribute('aria-atomic', 'true')
  announcement.className = 'sr-only'
  announcement.textContent = message
  document.body.appendChild(announcement)
  setTimeout(() => document.body.removeChild(announcement), 1000)
}

const PRESETS = [
  { label: "Square", shortcut: "1", tl: 0, tr: 0, br: 0, bl: 0 },
  { label: "Rounded", shortcut: "2", tl: 8, tr: 8, br: 8, bl: 8 },
  { label: "Large", shortcut: "3", tl: 16, tr: 16, br: 16, bl: 16 },
  { label: "Pill", shortcut: "4", tl: 50, tr: 50, br: 50, bl: 50 },
  { label: "Top only", shortcut: "5", tl: 16, tr: 16, br: 0, bl: 0 },
  { label: "Bottom only", shortcut: "6", tl: 0, tr: 0, br: 16, bl: 16 },
  { label: "Left only", shortcut: "7", tl: 16, tr: 0, br: 0, bl: 16 },
  { label: "Right only", shortcut: "8", tl: 0, tr: 16, br: 16, bl: 0 },
  { label: "Blob", shortcut: "9", tl: 60, tr: 30, br: 60, bl: 30 },
  { label: "Chat bubble", shortcut: "0", tl: 16, tr: 16, br: 4, bl: 16 },
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

  const setAll = useCallback((v: number) => { setTl(v); setTr(v); setBr(v); setBl(v) }, [])

  const handleCorner = useCallback((setter: (v: number) => void, label: string) => (v: number) => {
    setter(v)
    if (linked) setAll(v)
    // Announce only on significant changes to avoid spam
    if (v % 10 === 0 || v === max) {
      announceToScreenReader(`${label} radius set to ${v}${unit}`)
    }
  }, [linked, setAll, unit])

  const all4Same = tl === tr && tr === br && br === bl
  const corners = `${tl}${unit} ${tr}${unit} ${br}${unit} ${bl}${unit}`
  const simplified = all4Same ? `${tl}${unit}` : corners
  const css = `border-radius: ${simplified};`
  const max = unit === "%" ? 50 : 200

  const copy = useCallback(() => {
    navigator.clipboard.writeText(css)
    setCopied(true)
    announceToScreenReader('CSS copied to clipboard')
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
    const newLinked = !linked
    setLinked(newLinked)
    announceToScreenReader(newLinked ? 'Corners linked' : 'Corners unlinked')
  }, [linked])

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return
      
      // Ctrl+Shift+C to copy CSS
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === "c") {
        e.preventDefault()
        e.stopPropagation()
        copy()
      }
      
      // Ctrl+Shift+U to toggle unit
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === "u") {
        e.preventDefault()
        e.stopPropagation()
        toggleUnit(unit === "%" ? "px" : "%")
      }
      
      // Ctrl+Shift+L to toggle linked
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === "l") {
        e.preventDefault()
        e.stopPropagation()
        toggleLinked()
      }
      
      // Number keys 0-9 for presets
      if (!e.ctrlKey && !e.metaKey && !e.altKey && /^[0-9]$/.test(e.key)) {
        const preset = PRESETS.find(p => p.shortcut === e.key)
        if (preset) {
          e.preventDefault()
          applyPreset(preset.label, preset.tl, preset.tr, preset.br, preset.bl)
        }
      }
    }
    window.addEventListener("keydown", handleKeyDown, true)
    return () => window.removeEventListener("keydown", handleKeyDown, true)
  }, [copy, unit, linked, toggleLinked, toggleUnit, applyPreset])

  const corners4 = [
    { label: "Top Left", value: tl, set: handleCorner(setTl, "Top Left") },
    { label: "Top Right", value: tr, set: handleCorner(setTr, "Top Right") },
    { label: "Bottom Right", value: br, set: handleCorner(setBr, "Bottom Right") },
    { label: "Bottom Left", value: bl, set: handleCorner(setBl, "Bottom Left") },
  ]

  return (
    <>
    <div className="flex h-full flex-col gap-3 p-4">
      <div className="flex items-start justify-between flex-wrap gap-2" role="banner">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight" id="border-radius-title">Border Radius Visualizer</h2>
          <p className="text-muted-foreground" id="border-radius-description">Build CSS border-radius values visually and copy the code. Press ? for keyboard shortcuts. Number keys 0-9 apply presets.</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1" role="radiogroup" aria-label="Unit selection">
            {(["px", "%"] as const).map(u => (
              <button 
                key={u} 
                onClick={() => toggleUnit(u)}
                className={`text-xs px-3 py-1 rounded-full border transition-colors focus:outline-none focus:ring-2 focus:ring-primary ${unit === u ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground"}`}
                role="radio"
                aria-checked={unit === u}
                aria-label={`Set unit to ${u}`}
              >{u}</button>
            ))}
          </div>
          <button
            onClick={toggleLinked}
            className={`text-xs px-3 py-1 rounded-full border transition-colors focus:outline-none focus:ring-2 focus:ring-primary ${linked ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground"}`}
            aria-label={linked ? "Unlink corners" : "Link corners"}
            aria-pressed={linked}
            title="Link corners so they move together"
          >
            {linked ? "🔒 Linked" : "🔓 Unlinked"}
            <span className="sr-only">. Press Control plus L to toggle</span>
          </button>
          <Button variant="outline" size="sm" onClick={copy} aria-label="Copy CSS to clipboard">
            {copied ? <Check className="h-4 w-4 mr-1" aria-hidden="true" /> : <Copy className="h-4 w-4 mr-1" aria-hidden="true" />}
            {copied ? "Copied!" : "Copy CSS"}<kbd className="ml-2 rounded border border-border bg-muted px-1 text-[10px]" aria-hidden="true">Ctrl+C</kbd>
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 flex-1 min-h-0">
        {/* Left — Controls */}
        <div className="flex flex-col overflow-hidden rounded-xl border border-border bg-card min-w-0" role="region" aria-label="Border radius controls">
          <div className="shrink-0 border-b border-border px-4 py-3">
            <span className="text-sm font-medium">Controls</span>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-5">
            {/* Presets */}
            <div className="space-y-2" role="group" aria-label="Preset styles">
              <Label className="text-sm font-medium">Presets <span className="text-xs text-muted-foreground font-normal">(0-9 keys)</span></Label>
              <div className="flex flex-wrap gap-2">
                {PRESETS.map(({ label, shortcut, tl: ptl, tr: ptr, br: pbr, bl: pbl }) => (
                  <button
                    key={label}
                    onClick={() => applyPreset(label, ptl, ptr, pbr, pbl)}
                    className="text-xs px-3 py-1 rounded border border-border text-muted-foreground hover:border-primary/50 transition-colors focus:outline-none focus:ring-2 focus:ring-primary"
                    aria-label={`${label} preset (key ${shortcut})`}
                    title={`Press ${shortcut} key`}
                  >
                    {label} <kbd className="ml-1 rounded border border-border bg-muted px-1 text-[10px]" aria-hidden="true">{shortcut}</kbd>
                  </button>
                ))}
              </div>
            </div>

            {/* Corner sliders */}
            <div className="space-y-4" role="group" aria-label="Corner radius sliders">
              {corners4.map(({ label, value, set }) => (
                <div key={label} className="space-y-2">
                  <div className="flex justify-between">
                    <Label className="text-sm" id={`${label.toLowerCase().replace(' ', '-')}-label`}>{label}</Label>
                    <span className="text-xs font-mono text-muted-foreground" aria-live="polite">{value}{unit}</span>
                  </div>
                  <Slider 
                    value={[value]} 
                    onValueChange={([v]) => set(v)} 
                    min={0} 
                    max={max} 
                    step={1} 
                    aria-labelledby={`${label.toLowerCase().replace(' ', '-')}-label`}
                  />
                </div>
              ))}
            </div>

            {/* Box color */}
            <div className="space-y-2">
              <Label className="text-sm" id="color-label">Box Color</Label>
              <div className="flex items-center gap-3">
                <input 
                  type="color" 
                  value={boxColor} 
                  onChange={(e) => {
                    setBoxColor(e.target.value)
                    announceToScreenReader(`Box color changed to ${e.target.value}`)
                  }}
                  className="w-10 h-10 rounded border border-border cursor-pointer p-0.5 focus:outline-none focus:ring-2 focus:ring-primary"
                  aria-labelledby="color-label"
                />
                <span className="text-xs font-mono text-muted-foreground" aria-live="polite">{boxColor}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right — Preview + Code */}
        <div className="flex flex-col overflow-hidden rounded-xl border border-border bg-card min-w-0" role="region" aria-label="Preview and CSS output">
          <div className="shrink-0 border-b border-border px-4 py-3">
            <span className="text-sm font-medium">Preview</span>
          </div>
          <div className="flex-1 flex flex-col p-4 gap-4 min-h-0">
            <div 
              className="flex-1 flex items-center justify-center bg-muted/20 rounded-xl border border-border min-h-0"
              role="img"
              aria-label={`Preview box with ${simplified} border radius`}
            >
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
                <Label className="text-sm font-medium" id="css-output-label">CSS Output</Label>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={copy}
                  aria-labelledby="css-output-label"
                >
                  {copied ? <Check className="h-4 w-4 mr-1" aria-hidden="true" /> : <Copy className="h-4 w-4 mr-1" aria-hidden="true" />}
                  {copied ? "Copied!" : "Copy"}<kbd className="ml-2 rounded border border-border bg-muted px-1 text-[10px]" aria-hidden="true">Ctrl+C</kbd>
                </Button>
              </div>
              <pre className="rounded-lg border border-border bg-muted/20 p-4 text-sm font-mono" aria-live="polite" aria-atomic="true">{css}</pre>
            </div>
          </div>
        </div>
      </div>
    </div>
    <ShortcutsModal
      pageName="Border Radius Visualizer"
      shortcuts={[
        { keys: ["0-9"], description: "Apply presets (1=Square, 2=Rounded, etc.)" },
        { keys: ["Ctrl", "C"], description: "Copy CSS" },
        { keys: ["Ctrl", "U"], description: "Toggle unit (px/%)" },
        { keys: ["Ctrl", "L"], description: "Toggle linked corners" },
        { keys: ["?"], description: "Toggle this shortcuts panel" },
        { keys: ["Tab"], description: "Navigate between controls" },
        { keys: ["Enter"], description: "Activate focused button" },
        { keys: ["Space"], description: "Activate focused button" },
      ]}
    />
    </>
  )
}
