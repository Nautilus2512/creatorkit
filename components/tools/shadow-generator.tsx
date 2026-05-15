"use client"

import { useState, useCallback, useEffect } from "react"
import { Copy, Check, Plus, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Slider } from "@/components/ui/slider"
import { Switch } from "@/components/ui/switch"
import { ShortcutsModal } from "@/components/shortcuts-modal"

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

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        if (!(e.ctrlKey || e.metaKey)) return
      }

      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === "v") {
        e.preventDefault()
        copy()
      }

      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === "x") {
        e.preventDefault()
        addLayer()
      }

      if ((e.ctrlKey || e.metaKey) && e.key === "Delete" && shadows.length > 1) {
        e.preventDefault()
        removeLayer(activeId)
      }

      if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
        const target = e.target as Element
        if (target.getAttribute('role') === 'slider') return
        const currentIndex = shadows.findIndex(s => s.id === activeId)
        if (currentIndex !== -1) {
          const newIndex = e.key === "ArrowLeft"
            ? (currentIndex > 0 ? currentIndex - 1 : shadows.length - 1)
            : (currentIndex < shadows.length - 1 ? currentIndex + 1 : 0)
          switchLayer(shadows[newIndex].id)
        }
      }
    }
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [copy, addLayer, removeLayer, switchLayer, activeId, shadows])

  return (
    <div className="flex flex-1 flex-col min-h-0">

      {/* Desktop: top action bar */}
      <div className="hidden md:flex shrink-0 items-center gap-2 border-b border-border bg-card/95 backdrop-blur-sm px-4 py-2">
        <span className="text-sm font-semibold shrink-0 mr-1">Box Shadow Generator</span>
        <div className="ml-auto flex items-center gap-1.5">
          <ShortcutsModal pageName="Shadow Generator" shortcuts={[
            { keys: ["Ctrl", "Shift", "X"], description: "Add new shadow layer" },
            { keys: ["Ctrl", "Delete"], description: "Remove active layer" },
            { keys: ["Ctrl", "Shift", "V"], description: "Copy CSS" },
            { keys: ["←", "→"], description: "Switch layers" },
          ]} />
          <Button variant="outline" size="sm" onClick={copy} aria-label="Copy CSS to clipboard">
            {copied ? <Check className="h-4 w-4 mr-1" aria-hidden="true" /> : <Copy className="h-4 w-4 mr-1" aria-hidden="true" />}
            {copied ? "Copied!" : "Copy CSS"}
            <kbd className="ml-1 hidden md:inline rounded border border-border bg-muted px-1 text-[10px]" aria-hidden="true">Ctrl+Shift+V</kbd>
          </Button>
        </div>
      </div>

      {/* Mobile: compact header + tab switcher */}
      <div className="flex md:hidden flex-col shrink-0 border-b border-border">
        <div className="flex items-center justify-between px-4 pt-3 pb-2">
          <h2 className="text-base font-semibold">Box Shadow Generator</h2>
          <ShortcutsModal pageName="Shadow Generator" shortcuts={[{ keys: ["←", "→"], description: "Switch layers" }]} />
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

      {/* Scrollable content area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">

        {/* Two-panel card */}
        <div className="rounded-xl border border-border overflow-hidden">
          <div className="flex flex-col md:flex-row min-h-[500px]">

            {/* Left — Controls */}
            <div className={`${activeTab === "input" ? "flex" : "hidden"} md:flex flex-col flex-1 border-b md:border-b-0 md:border-r border-border bg-card`} role="region" aria-label="Shadow controls">
              <div className="shrink-0 border-b border-border">
                <div className="flex items-center gap-1 p-2 overflow-x-auto" role="tablist" aria-label="Shadow layers">
                  {shadows.map((s, i) => (
                    <div key={s.id} className="flex items-center gap-0.5 shrink-0">
                      <button
                        onClick={() => switchLayer(s.id)}
                        className={`text-xs px-3 py-1.5 rounded border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${activeId === s.id ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground hover:border-primary/50"}`}
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
                          className="p-0.5 text-muted-foreground hover:text-destructive transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-destructive rounded"
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
                    <Plus className="h-4 w-4 mr-1" aria-hidden="true" />Add<kbd className="ml-1 hidden md:inline rounded border border-border bg-muted px-1 text-[10px]" aria-hidden="true">Ctrl+Shift+X</kbd>
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
                        className="w-10 h-10 rounded border border-border cursor-pointer p-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
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
                    <Label className="text-sm" id="inset-label">
                      Inset
                      <span className="ml-1.5 hidden md:inline-flex items-center gap-0.5" aria-hidden="true">
                        <kbd className="rounded border border-border bg-muted px-1 text-[10px]">Tab</kbd>
                        <kbd className="rounded border border-border bg-muted px-1 text-[10px]">Space</kbd>
                      </span>
                    </Label>
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
                        <Label className="text-sm" id={`${field}-label`}>
                          {label}
                          <span className="ml-1 hidden md:inline-flex items-center gap-0.5" aria-hidden="true">
                            <kbd className="rounded border border-border bg-muted px-1 text-[10px]">Tab</kbd>
                            <kbd className="rounded border border-border bg-muted px-1 text-[10px]">← →</kbd>
                          </span>
                        </Label>
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
            <div className={`${activeTab === "output" ? "flex" : "hidden"} md:flex flex-col flex-1 bg-card`} role="region" aria-label="Preview and CSS output">
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
                      className="w-7 h-7 rounded border border-border cursor-pointer p-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
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
                      className="w-7 h-7 rounded border border-border cursor-pointer p-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
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
                    {copied ? "Copied!" : "Copy"}<kbd className="ml-2 hidden md:inline rounded border border-border bg-muted px-1 text-[10px]" aria-hidden="true">Ctrl+Shift+V</kbd>
                  </Button>
                </div>
                <pre className="rounded-lg border border-border bg-muted/20 p-3 text-xs font-mono overflow-x-auto whitespace-pre-wrap break-all leading-relaxed" aria-live="polite" aria-atomic="true">{css}</pre>
              </div>
            </div>

          </div>
        </div>

        {/* Usage guide */}
        <div className="rounded-xl border border-border bg-card p-4 space-y-4">
          <div className="space-y-1.5">
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">How to use</p>
            <ol className="space-y-1.5 text-xs text-muted-foreground list-decimal list-inside">
              <li>Adjust <span className="text-foreground font-medium">X Offset</span> and <span className="text-foreground font-medium">Y Offset</span> to position the shadow.</li>
              <li>Use <span className="text-foreground font-medium">Blur</span> to soften the edge and <span className="text-foreground font-medium">Spread</span> to expand or shrink it.</li>
              <li>Set the shadow <span className="text-foreground font-medium">Color</span> and <span className="text-foreground font-medium">Opacity</span> for the right intensity.</li>
              <li>Toggle <span className="text-foreground font-medium">Inset</span> to flip the shadow inside the element.</li>
              <li>Click <span className="text-foreground font-medium">Add</span> to stack multiple shadow layers for richer effects.</li>
              <li>Copy the generated CSS and paste it into your stylesheet.</li>
            </ol>
          </div>
          <div className="space-y-1.5">
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">Keyboard shortcuts</p>
            <ul className="space-y-1 text-xs text-muted-foreground list-disc list-inside">
              <li><kbd className="rounded border border-border bg-muted px-1 text-[10px]">Ctrl+Shift+V</kbd> Copy CSS to clipboard</li>
              <li><kbd className="rounded border border-border bg-muted px-1 text-[10px]">Ctrl+Shift+X</kbd> Add a new shadow layer</li>
              <li><kbd className="rounded border border-border bg-muted px-1 text-[10px]">Ctrl+Delete</kbd> Remove the active layer</li>
              <li><kbd className="rounded border border-border bg-muted px-1 text-[10px]">← →</kbd> Switch between layers</li>
              <li><kbd className="rounded border border-border bg-muted px-1 text-[10px]">?</kbd> Open this shortcuts reference</li>
            </ul>
          </div>
          <div className="space-y-1.5">
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">Tips</p>
            <ul className="space-y-1 text-xs text-muted-foreground list-disc list-inside">
              <li>Stack two layers, one large and blurry and one small and sharp, for a natural-looking shadow.</li>
              <li>Use a low opacity (10 to 20) for subtle, realistic results.</li>
              <li>Use the <span className="text-foreground font-medium">BG</span> and <span className="text-foreground font-medium">Box</span> color pickers to preview on your actual background and element colors.</li>
              <li>Everything runs in your browser. Nothing is sent to a server.</li>
            </ul>
          </div>
        </div>

        <div className="md:hidden h-[60px]" aria-hidden="true" />

      </div>

      {/* Mobile: bottom action bar */}
      <div
        className="md:hidden fixed bottom-0 left-0 right-0 flex items-center gap-2 border-t border-border bg-card/95 backdrop-blur-sm px-3 py-2 z-20"
        style={{ paddingBottom: "max(0.5rem, env(safe-area-inset-bottom))" }}
      >
        <div className="flex-1" />
        <Button variant="outline" size="sm" className="h-11 px-4" onClick={copy} aria-label="Copy CSS">
          {copied ? <Check className="h-4 w-4 mr-1.5" aria-hidden="true" /> : <Copy className="h-4 w-4 mr-1.5" aria-hidden="true" />}
          {copied ? "Copied!" : "Copy CSS"}
        </Button>
      </div>

    </div>
  )
}
