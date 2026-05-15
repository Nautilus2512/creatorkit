"use client"

import { useState, useCallback, useEffect } from "react"
import { Copy, Check } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
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

function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const full = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
  if (full) return { r: parseInt(full[1], 16), g: parseInt(full[2], 16), b: parseInt(full[3], 16) }
  const short = /^#?([a-f\d])([a-f\d])([a-f\d])$/i.exec(hex)
  if (short) return {
    r: parseInt(short[1] + short[1], 16),
    g: parseInt(short[2] + short[2], 16),
    b: parseInt(short[3] + short[3], 16),
  }
  return null
}

function rgbToHsl(r: number, g: number, b: number) {
  r /= 255; g /= 255; b /= 255
  const max = Math.max(r, g, b), min = Math.min(r, g, b)
  let h = 0, s = 0
  const l = (max + min) / 2
  if (max !== min) {
    const d = max - min
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break
      case g: h = ((b - r) / d + 2) / 6; break
      case b: h = ((r - g) / d + 4) / 6; break
    }
  }
  return { h: Math.round(h * 360), s: Math.round(s * 100), l: Math.round(l * 100) }
}

function rgbToOklch(r: number, g: number, b: number) {
  const toLinear = (v: number) => {
    v /= 255
    return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4)
  }
  const rl = toLinear(r), gl = toLinear(g), bl = toLinear(b)
  const lms = Math.cbrt(0.4122214708 * rl + 0.5363325363 * gl + 0.0514459929 * bl)
  const mms = Math.cbrt(0.2119034982 * rl + 0.6806995451 * gl + 0.1073969566 * bl)
  const sms = Math.cbrt(0.0883024619 * rl + 0.2817188376 * gl + 0.6299787005 * bl)
  const L = 0.2104542553 * lms + 0.7936177850 * mms - 0.0040720468 * sms
  const a = 1.9779984951 * lms - 2.4285922050 * mms + 0.4505937099 * sms
  const bOk = 0.0259040371 * lms + 0.7827717662 * mms - 0.8086757660 * sms
  const C = Math.sqrt(a * a + bOk * bOk)
  const H = Math.atan2(bOk, a) * 180 / Math.PI
  return {
    l: Math.round(L * 1000) / 10,
    c: Math.round(C * 1000) / 1000,
    h: Math.round((H < 0 ? H + 360 : H) * 10) / 10,
  }
}

function hslToRgb(h: number, s: number, l: number) {
  s /= 100; l /= 100
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s
  const p = 2 * l - q
  const hue2rgb = (p: number, q: number, t: number) => {
    if (t < 0) t += 1; if (t > 1) t -= 1
    if (t < 1 / 6) return p + (q - p) * 6 * t
    if (t < 1 / 2) return q
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6
    return p
  }
  return {
    r: Math.round(hue2rgb(p, q, h / 360 + 1 / 3) * 255),
    g: Math.round(hue2rgb(p, q, h / 360) * 255),
    b: Math.round(hue2rgb(p, q, h / 360 - 1 / 3) * 255),
  }
}

function parseColor(input: string): { r: number; g: number; b: number } | null {
  const s = input.trim()
  if (!s) return null
  if (/^#?[0-9a-f]{3}$|^#?[0-9a-f]{6}$/i.test(s)) return hexToRgb(s)
  const rgb = s.match(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/)
  if (rgb) return { r: +rgb[1], g: +rgb[2], b: +rgb[3] }
  const hsl = s.match(/hsla?\(\s*(\d+)\s*,\s*(\d+)%?\s*,\s*(\d+)%?/)
  if (hsl) return hslToRgb(+hsl[1], +hsl[2], +hsl[3])
  return null
}

function toHex(r: number, g: number, b: number) {
  return `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${b.toString(16).padStart(2, "0")}`
}

export default function ColorConverter() {
  const [input, setInput] = useState("")
  const [pickerValue, setPickerValue] = useState("#3b82f6")
  const [color, setColor] = useState<{ r: number; g: number; b: number } | null>(null)
  const [copied, setCopied] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<"input" | "output">("input")

  const applyColor = useCallback((rgb: { r: number; g: number; b: number } | null, rawInput: string) => {
    setColor(rgb)
    setInput(rawInput)
    if (rgb) {
      setPickerValue(toHex(rgb.r, rgb.g, rgb.b))
      announceToScreenReader(`Color set to ${toHex(rgb.r, rgb.g, rgb.b)}`)
    } else if (rawInput) {
      announceToScreenReader('Invalid color format')
    }
  }, [])

  const handleTextInput = useCallback((value: string) => applyColor(parseColor(value), value), [applyColor])

  const handlePicker = useCallback((hex: string) => {
    setPickerValue(hex)
    const rgb = hexToRgb(hex)
    setColor(rgb)
    setInput(hex)
    if (rgb) announceToScreenReader(`Color picker set to ${hex}`)
  }, [])

  const copy = useCallback((value: string, key: string, label: string) => {
    navigator.clipboard.writeText(value)
    setCopied(key)
    announceToScreenReader(`${label} copied: ${value}`)
    setTimeout(() => setCopied(null), 2000)
  }, [])

  const hex = color ? toHex(color.r, color.g, color.b) : ""
  const hsl = color ? rgbToHsl(color.r, color.g, color.b) : null
  const oklch = color ? rgbToOklch(color.r, color.g, color.b) : null

  const formats = color ? [
    { label: "HEX",   key: "hex",   value: hex,                                       shortcut: "1" },
    { label: "RGB",   key: "rgb",   value: `rgb(${color.r}, ${color.g}, ${color.b})`, shortcut: "2" },
    { label: "HSL",   key: "hsl",   value: `hsl(${hsl!.h}, ${hsl!.s}%, ${hsl!.l}%)`, shortcut: "3" },
    { label: "OKLCH", key: "oklch", value: `oklch(${oklch!.l}% ${oklch!.c} ${oklch!.h})`, shortcut: "4" },
  ] : []

  const copyAll = useCallback(() => {
    if (!color || formats.length === 0) return
    const allFormats = formats.map(f => `${f.label}: ${f.value}`).join('\n')
    navigator.clipboard.writeText(allFormats)
    setCopied("all")
    announceToScreenReader('All color formats copied to clipboard')
    setTimeout(() => setCopied(null), 2000)
  }, [color, formats])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        if (!(e.ctrlKey || e.metaKey)) return
      }

      // Number keys 1–4 copy individual formats (no modifier needed)
      if (!e.ctrlKey && !e.metaKey && !e.altKey && /^[1-4]$/.test(e.key) && color) {
        e.preventDefault()
        const format = formats.find(f => f.shortcut === e.key)
        if (format) copy(format.value, format.key, format.label)
      }

      // Ctrl+Shift+V — copy all formats
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === "v" && color) {
        e.preventDefault()
        copyAll()
      }

      // Escape — focus color input
      if (e.key === "Escape") {
        const inputEl = document.getElementById('color-input') as HTMLInputElement
        inputEl?.focus()
      }
    }
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [color, formats, copy, copyAll])

  return (
    <div className="flex flex-1 flex-col min-h-0">

      {/* Desktop: top action bar */}
      <div className="hidden md:flex shrink-0 items-center gap-2 border-b border-border bg-card/95 backdrop-blur-sm px-4 py-2">
        <span className="text-sm font-semibold shrink-0 mr-1">Color Converter</span>
        <div className="ml-auto flex items-center gap-1.5">
          <ShortcutsModal pageName="Color Converter" shortcuts={[
            { keys: ["1"], description: "Copy HEX" },
            { keys: ["2"], description: "Copy RGB" },
            { keys: ["3"], description: "Copy HSL" },
            { keys: ["4"], description: "Copy OKLCH" },
            { keys: ["Ctrl", "Shift", "V"], description: "Copy all formats" },
            { keys: ["Escape"], description: "Focus color input" },
          ]} />
        </div>
      </div>

      {/* Mobile: compact header + tab switcher */}
      <div className="flex md:hidden flex-col shrink-0 border-b border-border">
        <div className="flex items-center justify-between px-4 pt-3 pb-2">
          <h2 className="text-base font-semibold">Color Converter</h2>
          <ShortcutsModal pageName="Color Converter" shortcuts={[{ keys: ["1-4"], description: "Copy formats" }]} />
        </div>
        <div className="flex" role="tablist" aria-label="Panel selection">
          <button role="tab" aria-selected={activeTab === "input"} onClick={() => setActiveTab("input")}
            className={`flex-1 py-2.5 text-sm font-medium border-b-2 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-inset ${activeTab === "input" ? "border-primary text-foreground" : "border-transparent text-muted-foreground"}`}>
            Color Input
          </button>
          <button role="tab" aria-selected={activeTab === "output"} onClick={() => setActiveTab("output")}
            className={`flex-1 py-2.5 text-sm font-medium border-b-2 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-inset ${activeTab === "output" ? "border-primary text-foreground" : "border-transparent text-muted-foreground"}`}>
            All Formats
          </button>
        </div>
      </div>

      {/* Scrollable content area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">

        {/* Panels card */}
        <div className="rounded-xl border border-border overflow-hidden">
          <div className="flex flex-col md:flex-row min-h-[500px]">

            {/* Left panel — Input */}
            <div className={`${activeTab === "input" ? "flex" : "hidden"} md:flex flex-col flex-1 border-b md:border-b-0 md:border-r border-border bg-card`} role="region" aria-label="Color input">
              <div className="shrink-0 border-b border-border px-4 py-3">
                <span className="text-sm font-medium">Color Input</span>
              </div>
              <div className="flex-1 overflow-y-auto p-4 space-y-5">
                <div className="flex items-start gap-4">
                  <input
                    type="color"
                    id="color-picker"
                    value={pickerValue}
                    onChange={(e) => handlePicker(e.target.value)}
                    className="w-16 h-16 rounded-lg border border-border cursor-pointer p-1 bg-background shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                    aria-label="Color picker"
                  />
                  <div className="flex-1 space-y-1">
                    <Input
                      id="color-input"
                      value={input}
                      onChange={(e) => handleTextInput(e.target.value)}
                      placeholder="#3b82f6 or rgb(59,130,246) or hsl(217,91%,60%)"
                      className="font-mono text-sm"
                      aria-label="Color input (HEX, RGB, or HSL)"
                      aria-describedby="color-formats-help"
                    />
                    <p className="text-xs text-muted-foreground" id="color-formats-help">Accepts HEX, RGB, HSL</p>
                  </div>
                </div>

                {color && (
                  <div
                    className="w-full h-36 rounded-xl border border-border shadow-inner transition-colors duration-200"
                    style={{ backgroundColor: hex }}
                    role="img"
                    aria-label={`Color preview: ${hex}`}
                  />
                )}

                {color && (
                  <div className="rounded-lg border border-border p-4 space-y-1 text-sm" role="group" aria-label="RGB values">
                    <div className="flex justify-between"><span className="text-muted-foreground">R</span><span className="font-mono" aria-live="polite">{color.r}</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">G</span><span className="font-mono" aria-live="polite">{color.g}</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">B</span><span className="font-mono" aria-live="polite">{color.b}</span></div>
                  </div>
                )}
              </div>
            </div>

            {/* Right panel — Formats */}
            <div className={`${activeTab === "output" ? "flex" : "hidden"} md:flex flex-col flex-1 bg-card`} role="region" aria-label="Color formats">
              <div className="shrink-0 border-b border-border px-4 py-3 flex items-center justify-between">
                <span className="text-sm font-medium">All Formats</span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={copyAll}
                  disabled={!color}
                  className="text-xs h-7"
                  aria-label="Copy all formats"
                >
                  {copied === "all" ? <Check className="h-3 w-3 mr-1" aria-hidden="true" /> : <Copy className="h-3 w-3 mr-1" aria-hidden="true" />}
                  {copied === "all" ? "Copied!" : "Copy All"}
                  <kbd className="ml-1 hidden md:inline rounded border border-border bg-muted px-1 text-[10px]" aria-hidden="true">Ctrl+Shift+V</kbd>
                </Button>
              </div>
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {formats.length === 0 ? (
                  <div className="flex items-center justify-center h-full text-sm text-muted-foreground" role="note">
                    Enter or pick a color to see all formats
                  </div>
                ) : (
                  formats.map(({ label, key, value, shortcut }) => (
                    <div key={key} className="rounded-lg border border-border overflow-hidden">
                      <div
                        className="h-8"
                        style={{ backgroundColor: value }}
                        aria-hidden="true"
                      />
                      <div className="p-3 flex items-center justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground mb-0.5">
                            {label} <kbd className="rounded border border-border bg-muted px-1 text-[10px]" aria-hidden="true">{shortcut}</kbd>
                          </p>
                          <code className="text-sm font-mono" aria-live="polite">{value}</code>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => copy(value, key, label)}
                          className="shrink-0 h-7 text-xs"
                          aria-label={`Copy ${label} value`}
                        >
                          {copied === key ? <Check className="h-3 w-3 mr-1" aria-hidden="true" /> : <Copy className="h-3 w-3 mr-1" aria-hidden="true" />}
                          {copied === key ? "Copied!" : "Copy"}
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

          </div>
        </div>

        {/* Usage guide */}
        <div className="rounded-xl border border-border bg-card p-4 space-y-4">
          <div className="space-y-1.5">
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">How to use</p>
            <ol className="space-y-1.5 text-xs text-muted-foreground list-decimal list-inside">
              <li>Click the <span className="text-foreground font-medium">color swatch</span> to open a visual picker, or type a value directly into the input field.</li>
              <li>All four formats update instantly in the right panel.</li>
              <li>Click <span className="text-foreground font-medium">Copy</span> next to any format, or press <kbd className="rounded border border-border bg-muted px-1 text-[10px]">1</kbd> <kbd className="rounded border border-border bg-muted px-1 text-[10px]">2</kbd> <kbd className="rounded border border-border bg-muted px-1 text-[10px]">3</kbd> <kbd className="rounded border border-border bg-muted px-1 text-[10px]">4</kbd> to copy HEX, RGB, HSL, or OKLCH.</li>
              <li>Press <kbd className="rounded border border-border bg-muted px-1 text-[10px]">Ctrl+Shift+V</kbd> or click <span className="text-foreground font-medium">Copy All</span> to copy every format at once.</li>
            </ol>
          </div>
          <div className="space-y-1.5">
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">Keyboard shortcuts</p>
            <ul className="space-y-1 text-xs text-muted-foreground list-disc list-inside">
              <li><kbd className="rounded border border-border bg-muted px-1 text-[10px]">1 / 2 / 3 / 4</kbd> Copy HEX, RGB, HSL, or OKLCH</li>
              <li><kbd className="rounded border border-border bg-muted px-1 text-[10px]">Ctrl+Shift+V</kbd> Copy all formats at once</li>
              <li><kbd className="rounded border border-border bg-muted px-1 text-[10px]">Escape</kbd> Focus the color input</li>
              <li><kbd className="rounded border border-border bg-muted px-1 text-[10px]">?</kbd> Open shortcuts reference</li>
            </ul>
          </div>
          <div className="space-y-1.5">
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">Tips</p>
            <ul className="space-y-1 text-xs text-muted-foreground list-disc list-inside">
              <li>Shorthand HEX works too. <code className="rounded bg-muted px-1 text-[10px] font-mono">#abc</code> expands to <code className="rounded bg-muted px-1 text-[10px] font-mono">#aabbcc</code> automatically.</li>
              <li>Paste any <code className="rounded bg-muted px-1 text-[10px] font-mono">rgb()</code> or <code className="rounded bg-muted px-1 text-[10px] font-mono">hsl()</code> value directly from CSS and it will be parsed.</li>
              <li><span className="text-foreground font-medium">OKLCH</span> is the modern CSS color space with perceptually uniform lightness. It is supported in all major browsers.</li>
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
        <Button
          variant="outline"
          size="sm"
          className="h-11 px-4"
          onClick={copyAll}
          disabled={!color}
          aria-label="Copy all formats"
        >
          {copied === "all" ? <Check className="h-4 w-4 mr-1.5" aria-hidden="true" /> : <Copy className="h-4 w-4 mr-1.5" aria-hidden="true" />}
          {copied === "all" ? "Copied!" : "Copy All"}
        </Button>
      </div>

    </div>
  )
}
