"use client"

import { useState, useCallback, useEffect } from "react"
import { Copy, Check, Plus, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Slider } from "@/components/ui/slider"
import { Switch } from "@/components/ui/switch"
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
  const [activeTab, setActiveTab] = useState<"input" | "output">("input")

  const active = shadows.find(s => s.id === activeId) || shadows[0]

  const update = useCallback((id: number, field: keyof Shadow, value: unknown) => {
    setShadows(s => s.map(sh => sh.id === id ? { ...sh, [field]: value } : sh))
    // Announce on significant changes for sliders
    if (typeof value === 'number' && (value === 0 || value % 20 === 0)) {
      announceToScreenReader(`${field} set to ${value}`)
    }
  }, [])

  const addLayer = useCallback(() => { 
    const s = makeDefault()
    setShadows(prev => [...prev, s])
    setActiveId(s.id)
    announceToScreenReader(`Shadow layer ${shadows.length + 1} added`)
  }, [shadows.length])

  const removeLayer = useCallback((id: number) => {
    setShadows(prev => {
      const next = prev.filter(s => s.id !== id)
      const removed = prev.find(s => s.id === id)
      if (removed) announceToScreenReader(`Shadow ${prev.indexOf(removed) + 1} removed`)
      if (activeId === id && next.length > 0) setActiveId(next[0].id)
      return next
    })
  }, [activeId])

  const switchLayer = useCallback((id: number) => {
    setActiveId(id)
    const index = shadows.findIndex(s => s.id === id)
    announceToScreenReader(`Switched to shadow ${index + 1} of ${shadows.length}`)
  }, [shadows])

  const cssValue = shadows.map(shadowToCss).join(",\n       ")
  const css = `box-shadow: ${cssValue};`

  const copy = useCallback(() => { 
    navigator.clipboard.writeText(css)
    setCopied(true)
    announceToScreenReader('CSS copied to clipboard')
    setTimeout(() => setCopied(false), 2000)
  }, [css])

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
      
      // Ctrl+Shift+N to add new layer
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === "n") {
        e.preventDefault()
        e.stopPropagation()
        addLayer()
      }
      
      // Ctrl+Delete to remove active layer (if more than 1)
      if ((e.ctrlKey || e.metaKey) && e.key === "Delete" && shadows.length > 1) {
        e.preventDefault()
        e.stopPropagation()
        removeLayer(activeId)
      }
      
      // Arrow keys to switch between layers
      if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
        const currentIndex = shadows.findIndex(s => s.id === activeId)
        if (currentIndex !== -1) {
          let newIndex
          if (e.key === "ArrowLeft") {
            newIndex = currentIndex > 0 ? currentIndex - 1 : shadows.length - 1
          } else {
            newIndex = currentIndex < shadows.length - 1 ? currentIndex + 1 : 0
          }
          switchLayer(shadows[newIndex].id)
        }
      }
    }
    window.addEventListener("keydown", handleKeyDown, true)
    return () => window.removeEventListener("keydown", handleKeyDown, true)
  }, [copy, addLayer, removeLayer, switchLayer, activeId, shadows])

  return (
    <>
    <div className="flex h-full flex-col">

      {/* Desktop: top action bar */}
      <div className="hidden md:flex shrink-0 items-center gap-2 border-b border-border bg-card/95 backdrop-blur-sm px-4 py-2">
        <span className="text-sm font-semibold shrink-0 mr-1">Box Shadow Generator</span>
        <div className="ml-auto flex items-center gap-1.5">
          <ShortcutsModal pageName="Shadow Generator" shortcuts={[
            { keys: ["Ctrl", "N"], description: "Add new shadow layer" },
            { keys: ["Ctrl", "Delete"], description: "Remove active layer" },
            { keys: ["Ctrl", "Shift", "C"], description: "Copy CSS" },
            { keys: ["←", "→"], description: "Switch layers" },
          ]} />
          <Button variant="outline" size="sm" onClick={copy} aria-label="Copy CSS to clipboard">
            {copied ? <Check className="h-4 w-4 mr-1" aria-hidden="true" /> : <Copy className="h-4 w-4 mr-1" aria-hidden="true" />}
            {copied ? "Copied!" : "Copy CSS"}
            <kbd className="ml-1 hidden md:inline rounded border border-border bg-muted px-1 text-[10px]" aria-hidden="true">Ctrl+Shift+C</kbd>
          </Button>
        </div>
      </div>

      {/* Mobile: compact header + tab switcher */}
      <div className="flex md:hidden flex-col shrink-0 border-b border-border">
        <div className="flex items-center justify-between px-4 pt-3 pb-1">
          <h2 className="text-base font-semibold">Box Shadow Generator</h2>
          <ShortcutsModal pageName="Shadow Generator" shortcuts={[{ keys: ["←", "→"], description: "Switch layers" }]} />
        </div>
        <div className="flex" role="tablist">
          <button role="tab" aria-selected={activeTab === "input"} onClick={() => setActiveTab("input")}
            className={`flex-1 py-2.5 text-sm font-medium border-b-2 transition-colors ${activeTab === "input" ? "border-primary text-foreground" : "border-transparent text-muted-foreground"}`}>
            Controls
          </button>
          <button role="tab" aria-selected={activeTab === "output"} onClick={() => setActiveTab("output")}
            className={`flex-1 py-2.5 text-sm font-medium border-b-2 transition-colors ${activeTab === "output" ? "border-primary text-foreground" : "border-transparent text-muted-foreground"}`}>
            Preview
          </button>
        </div>
      </div>

      <div className="flex-1 min-h-0 flex flex-col md:flex-row overflow-hidden">
        {/* Left — Controls */}
        <div className={`${activeTab === "input" ? "flex" : "hidden"} md:flex flex-col flex-1 min-h-0 overflow-hidden border-b md:border-b-0 md:border-r border-border bg-card`} role="region" aria-label="Shadow controls">
          <div className="shrink-0 border-b border-border">
            <div className="flex items-center gap-1 p-2 overflow-x-auto" role="tablist" aria-label="Shadow layers">
              {shadows.map((s, i) => (
                <div key={s.id} className="flex items-center gap-0.5 shrink-0">
                  <button
                    onClick={() => switchLayer(s.id)}
                    className={`text-xs px-3 py-1.5 rounded border transition-colors focus:outline-none focus:ring-2 focus:ring-primary ${activeId === s.id ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground hover:border-primary/50"}`}
                    role="tab"
                    aria-selected={activeId === s.id}
                    aria-label={`Shadow ${i + 1}${activeId === s.id ? ', active' : ''}`}
                    title={`Switch to shadow ${i + 1} (Arrow keys)`}
                  >
                    Shadow {i + 1}
                  </button>
                  {shadows.length > 1 && (
                    <button 
                      onClick={() => removeLayer(s.id)} 
                      className="p-0.5 text-muted-foreground hover:text-destructive transition-colors focus:outline-none focus:ring-2 focus:ring-destructive rounded"
                      aria-label={`Remove shadow ${i + 1}`}
                      title="Ctrl+Delete to remove active layer"
                    >
                      <Trash2 className="h-3 w-3" aria-hidden="true" />
                    </button>
                  )}
                </div>
              ))}
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={addLayer} 
                className="ml-auto shrink-0"
                aria-label="Add new shadow layer"
              >
                <Plus className="h-4 w-4 mr-1" aria-hidden="true" />Add<kbd className="ml-1 hidden md:inline rounded border border-border bg-muted px-1 text-[10px]" aria-hidden="true">Ctrl+Shift+N</kbd>
              </Button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            <div className="flex items-end gap-4">
              <div className="space-y-1.5">
                <Label className="text-sm" id="color-label">Color</Label>
                <div className="flex items-center gap-2">
                  <input 
                    type="color" 
                    value={active.color} 
                    onChange={(e) => {
                      update(active.id, "color", e.target.value)
                      announceToScreenReader(`Shadow color changed to ${e.target.value}`)
                    }} 
                    className="w-10 h-10 rounded border border-border cursor-pointer p-0.5 focus:outline-none focus:ring-2 focus:ring-primary"
                    aria-labelledby="color-label"
                  />
                  <Input 
                    value={active.color} 
                    onChange={(e) => update(active.id, "color", e.target.value)} 
                    className="w-28 font-mono text-sm"
                    aria-labelledby="color-label"
                  />
                </div>
              </div>
              <div className="space-y-1.5 ml-auto">
                <Label className="text-sm" id="inset-label">Inset</Label>
                <Switch 
                  checked={active.inset} 
                  onCheckedChange={(v) => {
                    update(active.id, "inset", v)
                    announceToScreenReader(v ? 'Inset shadow enabled' : 'Inset shadow disabled')
                  }}
                  aria-labelledby="inset-label"
                />
              </div>
            </div>

            <div className="space-y-4" role="group" aria-label="Shadow properties">
              {CONTROLS.map(({ label, field, min, max, unit }) => (
                <div key={field} className="space-y-2">
                  <div className="flex justify-between">
                    <Label className="text-sm" id={`${field}-label`}>{label}</Label>
                    <span className="text-xs font-mono text-muted-foreground" aria-live="polite">{active[field]}{unit}</span>
                  </div>
                  <Slider 
                    value={[active[field] as number]} 
                    onValueChange={([v]) => update(active.id, field, v)} 
                    min={min} 
                    max={max} 
                    step={1}
                    aria-labelledby={`${field}-label`}
                  />
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right — Preview + Code */}
        <div className={`${activeTab === "output" ? "flex" : "hidden"} md:flex flex-col flex-1 min-h-0 overflow-hidden bg-card`} role="region" aria-label="Preview and CSS output">
          <div className="shrink-0 border-b border-border px-4 py-3 flex items-center justify-between">
            <span className="text-sm font-medium">Preview</span>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5">
                <Label className="text-xs text-muted-foreground" id="bg-color-label">BG</Label>
                <input 
                  type="color" 
                  value={bgColor} 
                  onChange={(e) => {
                    setBgColor(e.target.value)
                    announceToScreenReader(`Background color changed`)
                  }} 
                  className="w-7 h-7 rounded border border-border cursor-pointer p-0.5 focus:outline-none focus:ring-2 focus:ring-primary"
                  aria-labelledby="bg-color-label"
                />
              </div>
              <div className="flex items-center gap-1.5">
                <Label className="text-xs text-muted-foreground" id="box-color-label">Box</Label>
                <input 
                  type="color" 
                  value={boxColor} 
                  onChange={(e) => {
                    setBoxColor(e.target.value)
                    announceToScreenReader(`Box color changed`)
                  }} 
                  className="w-7 h-7 rounded border border-border cursor-pointer p-0.5 focus:outline-none focus:ring-2 focus:ring-primary"
                  aria-labelledby="box-color-label"
                />
              </div>
            </div>
          </div>

          <div 
            className="flex-1 flex items-center justify-center p-8" 
            style={{ backgroundColor: bgColor }}
            role="img"
            aria-label={`Preview box with ${shadows.length} shadow layer${shadows.length !== 1 ? 's' : ''}`}
          >
            <div
              className="w-40 h-40 rounded-xl transition-all duration-150"
              style={{ backgroundColor: boxColor, boxShadow: shadows.map(shadowToCss).join(", ") }}
            />
          </div>

          <div className="shrink-0 border-t border-border bg-card/95 backdrop-blur-sm px-4 py-3 space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium" id="css-output-label">CSS Output</Label>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={copy}
                aria-labelledby="css-output-label"
              >
                {copied ? <Check className="h-4 w-4 mr-1" aria-hidden="true" /> : <Copy className="h-4 w-4 mr-1" aria-hidden="true" />}
                {copied ? "Copied!" : "Copy"}<kbd className="ml-2 hidden md:inline rounded border border-border bg-muted px-1 text-[10px]" aria-hidden="true">Ctrl+Shift+C</kbd>
              </Button>
            </div>
            <pre className="rounded-lg border border-border bg-muted/20 p-3 text-xs font-mono overflow-x-auto whitespace-pre-wrap break-all leading-relaxed" aria-live="polite" aria-atomic="true">{css}</pre>
          </div>
        </div>
      </div>

      {/* Mobile: bottom action bar */}
      <div
        className="flex md:hidden shrink-0 items-center gap-2 border-t border-border bg-card/95 px-3 py-2"
        style={{ paddingBottom: "max(0.5rem, env(safe-area-inset-bottom))" }}
      >
        <div className="flex-1" />
        <Button variant="outline" size="sm" className="h-11 px-4" onClick={copy} aria-label="Copy CSS">
          {copied ? <Check className="h-4 w-4 mr-1.5" aria-hidden="true" /> : <Copy className="h-4 w-4 mr-1.5" aria-hidden="true" />}
          {copied ? "Copied!" : "Copy CSS"}
        </Button>
      </div>

    </div>
    </>
  )
}
