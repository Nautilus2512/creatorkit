"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { Copy, Check, Moon, Sun, Palette } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
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

const shortcuts = [
  { keys: ["1"], description: "Open primary color picker" },
  { keys: ["2"], description: "Open secondary color picker" },
  { keys: ["3"], description: "Open accent color picker" },
  { keys: ["Ctrl", "Shift", "V"], description: "Copy CSS tokens" },
  { keys: ["Ctrl", "Shift", "L"], description: "Toggle light / dark preview" },
  { keys: ["Escape"], description: "Close color picker" },
  { keys: ["?"], description: "Toggle this shortcuts panel" },
  { keys: ["Tab"], description: "Navigate between controls" },
]

function ColorPicker({ label, value, onChange, shortcut, id }: {
  label: string; value: string; onChange: (hex: string) => void; shortcut?: string; id?: string
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
      <Label className="text-sm" id={`color-label-${label.toLowerCase()}`}>
        {label}
        {shortcut && (
          <kbd className="ml-2 hidden md:inline rounded border border-border bg-muted px-1 text-[10px]" aria-hidden="true">{shortcut}</kbd>
        )}
      </Label>

      <button
        type="button"
        id={id}
        onClick={() => {
          setOpen(v => !v)
          if (!open) announceToScreenReader(`${label} color picker opened`)
        }}
        className="flex items-center gap-2 w-full rounded-lg border border-border bg-muted/30 px-3 py-2 hover:border-primary/50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-labelledby={`color-label-${label.toLowerCase()}`}
      >
        <span className="h-6 w-6 rounded-md border border-border shrink-0" style={{ backgroundColor: value }} aria-hidden="true" />
        <span className="font-mono text-sm flex-1 text-left">{hexInput}</span>
        <span className="text-xs text-muted-foreground">{open ? 'Click to close' : 'Click to edit'}</span>
      </button>

      {open && (
        <div className="rounded-xl border border-border bg-popover shadow-xl p-3 space-y-3" role="dialog" aria-label={`${label} color picker`}>
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
            <span className="text-xs text-muted-foreground shrink-0" aria-label={`RGB values: ${rgb.r}, ${rgb.g}, ${rgb.b}`}>
              {rgb.r}, {rgb.g}, {rgb.b}
            </span>
          </div>
        </div>
      )}
    </div>
  )
}

function generateShades(hex: string): Record<string, string> {
  const { h, s } = hexToHSL(hex)
  return {
    50: `hsl(${h}, ${s}%, 97%)`, 100: `hsl(${h}, ${s}%, 94%)`, 200: `hsl(${h}, ${s}%, 86%)`,
    300: `hsl(${h}, ${s}%, 76%)`, 400: `hsl(${h}, ${s}%, 62%)`, 500: `hsl(${h}, ${s}%, 50%)`,
    600: `hsl(${h}, ${s}%, 42%)`, 700: `hsl(${h}, ${s}%, 34%)`, 800: `hsl(${h}, ${s}%, 26%)`, 900: `hsl(${h}, ${s}%, 18%)`,
  }
}

const typographyScale = { xs: "0.75rem", sm: "0.875rem", base: "1rem", lg: "1.125rem", xl: "1.25rem", "2xl": "1.5rem", "3xl": "1.875rem", "4xl": "2.25rem", "5xl": "3rem" }
const spacingScale = { 0: "0rem", 1: "0.25rem", 2: "0.5rem", 3: "0.75rem", 4: "1rem", 5: "1.25rem", 6: "1.5rem", 8: "2rem", 10: "2.5rem", 12: "3rem", 16: "4rem", 20: "5rem", 24: "6rem" }
const radiusScale = { none: "0px", sm: "0.125rem", md: "0.375rem", lg: "0.5rem", xl: "0.75rem", "2xl": "1rem", full: "9999px" }

export default function DesignTokenGenerator() {
  const [primaryColor, setPrimaryColor] = useState("#3b82f6")
  const [secondaryColor, setSecondaryColor] = useState("#8b5cf6")
  const [accentColor, setAccentColor] = useState("#f59e0b")
  const [copiedKey, setCopiedKey] = useState<string | null>(null)
  const [previewMode, setPreviewMode] = useState<"light" | "dark">("dark")
  const [cbMode, setCbMode] = useState<CBMode>("none")
  const [activeTab, setActiveTab] = useState<"input" | "output">("input")

  const primaryShades = useMemo(() => generateShades(primaryColor), [primaryColor])
  const secondaryShades = useMemo(() => generateShades(secondaryColor), [secondaryColor])
  const accentShades = useMemo(() => generateShades(accentColor), [accentColor])

  const isDark = previewMode === "dark"
  const previewBg = isDark ? "#0f0f0f" : "#ffffff"
  const previewSurface = isDark ? primaryShades[900] : primaryShades[50]
  const previewBorder = isDark ? primaryShades[700] : primaryShades[200]
  const previewText = isDark ? primaryShades[100] : primaryShades[900]
  const previewSubtext = isDark ? primaryShades[300] : primaryShades[700]
  const previewBtnBg = primaryShades[isDark ? 500 : 600]

  const generateCSS = () => {
    let css = `/* Light Mode */\n:root {\n`
    const addShades = (name: string, shades: Record<string, string>) => { Object.entries(shades).forEach(([shade, value]) => { css += `  --${name}-${shade}: ${value};\n` }); css += `\n` }
    addShades("primary", primaryShades); addShades("secondary", secondaryShades); addShades("accent", accentShades)
    css += `  /* Semantic - Light */\n`
    css += `  --color-background: ${primaryShades[50]};\n  --color-surface: #ffffff;\n  --color-text: ${primaryShades[900]};\n  --color-text-muted: ${primaryShades[600]};\n  --color-border: ${primaryShades[200]};\n  --color-btn-primary: ${primaryShades[600]};\n\n`
    Object.entries(typographyScale).forEach(([t, v]) => { css += `  --font-size-${t}: ${v};\n` }); css += `\n`
    Object.entries(spacingScale).forEach(([t, v]) => { css += `  --spacing-${t}: ${v};\n` }); css += `\n`
    Object.entries(radiusScale).forEach(([t, v]) => { css += `  --radius-${t}: ${v};\n` })
    css += `}\n\n/* Dark Mode */\n.dark {\n`
    css += `  --color-background: #0f0f0f;\n  --color-surface: ${primaryShades[900]};\n  --color-text: ${primaryShades[100]};\n  --color-text-muted: ${primaryShades[300]};\n  --color-border: ${primaryShades[700]};\n  --color-btn-primary: ${primaryShades[500]};\n}\n`
    return css
  }

  const generateTailwind = () => {
    const config = { theme: { extend: { colors: { primary: primaryShades, secondary: secondaryShades, accent: accentShades }, fontSize: typographyScale, spacing: spacingScale, borderRadius: radiusScale } } }
    return `module.exports = ${JSON.stringify(config, null, 2)}`
  }

  const generateJSON = () => {
    const tokens = {
      colors: { primary: primaryShades, secondary: secondaryShades, accent: accentShades },
      semantic: { light: { background: primaryShades[50], surface: "#ffffff", text: primaryShades[900], textMuted: primaryShades[600], border: primaryShades[200], btnPrimary: primaryShades[600] }, dark: { background: "#0f0f0f", surface: primaryShades[900], text: primaryShades[100], textMuted: primaryShades[300], border: primaryShades[700], btnPrimary: primaryShades[500] } },
      typography: typographyScale, spacing: spacingScale, borderRadius: radiusScale,
    }
    return JSON.stringify(tokens, null, 2)
  }

  const copyToClipboard = useCallback(async (text: string, key: string, label?: string) => {
    await navigator.clipboard.writeText(text)
    setCopiedKey(key)
    announceToScreenReader(label ? `${label} copied to clipboard` : 'Copied to clipboard')
    setTimeout(() => setCopiedKey(null), 2000)
  }, [])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        if (!(e.ctrlKey || e.metaKey)) return
      }

      if (!e.ctrlKey && !e.metaKey && !e.altKey && (e.key === "1" || e.key === "2" || e.key === "3")) {
        e.preventDefault()
        const ids: Record<string, string> = { "1": "primary-color-trigger", "2": "secondary-color-trigger", "3": "accent-color-trigger" }
        ;(document.getElementById(ids[e.key]) as HTMLButtonElement)?.click()
      }

      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === "v") {
        e.preventDefault()
        copyToClipboard(generateCSS(), "css", "CSS tokens")
      }

      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === "l") {
        e.preventDefault()
        setPreviewMode(prev => {
          const next = prev === "light" ? "dark" : "light"
          announceToScreenReader(`Switched to ${next} preview mode`)
          return next
        })
      }

      if (e.key === "Escape") {
        announceToScreenReader('Color picker closed')
      }
    }
    window.addEventListener("keydown", handler)
    return () => window.removeEventListener("keydown", handler)
  }, [primaryColor, secondaryColor, accentColor, copyToClipboard])

  const ColorPalette = ({ shades, name }: { shades: Record<string, string>; name: string }) => (
    <div className="space-y-1.5">
      <p className="text-xs font-medium capitalize text-muted-foreground">{name}</p>
      <div className="flex gap-0.5 overflow-hidden rounded-lg" role="group" aria-label={`${name} color palette shades`}>
        {Object.entries(shades).map(([shade, color]) => {
          const displayColor = simulateColorBlindness(color, cbMode)
          return (
            <button
              key={shade}
              className="group relative h-8 flex-1 transition-transform hover:scale-110 hover:z-10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1"
              style={{ backgroundColor: displayColor }}
              onClick={() => copyToClipboard(color, `${name}-${shade}`, `${name}-${shade}`)}
              title={`${name}-${shade}: ${color}`}
              aria-label={`Copy ${name} ${shade}: ${color}`}
            >
              <span
                className={`absolute inset-0 flex items-center justify-center bg-black/50 text-[9px] text-white transition-opacity group-hover:opacity-100 ${
                  copiedKey === `${name}-${shade}` ? "opacity-100" : "opacity-0"
                }`}
                aria-hidden="true"
              >
                {copiedKey === `${name}-${shade}` ? <Check className="h-2.5 w-2.5" aria-hidden="true" /> : shade}
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )

  return (
    <div className="flex flex-1 flex-col min-h-0">

      {/* DESKTOP: top action bar */}
      <div className="hidden md:flex shrink-0 items-center gap-2 border-b border-border bg-card/95 backdrop-blur-sm px-4 py-2">
        <span className="text-sm font-semibold shrink-0 mr-1">Design Token Generator</span>
        <div className="ml-auto flex items-center gap-1.5">
          <ShortcutsModal pageName="Design Token Generator" shortcuts={shortcuts} />
          <Button
            variant="ghost"
            size="sm"
            onClick={() => copyToClipboard(generateCSS(), "css", "CSS tokens")}
            aria-label="Copy CSS tokens"
          >
            {copiedKey === "css" ? <Check className="mr-2 h-4 w-4" aria-hidden="true" /> : <Copy className="mr-2 h-4 w-4" aria-hidden="true" />}
            Copy Tokens
            <kbd className="ml-1 hidden md:inline rounded border border-border bg-muted px-1 text-[10px]" aria-hidden="true">Ctrl+Shift+V</kbd>
          </Button>
        </div>
      </div>

      {/* MOBILE: compact header + tab switcher */}
      <div className="flex md:hidden flex-col shrink-0 border-b border-border">
        <div className="flex items-center justify-between px-4 pt-3 pb-2">
          <h2 className="text-base font-semibold">Design Token Generator</h2>
          <ShortcutsModal pageName="Design Token Generator" shortcuts={shortcuts} />
        </div>
        <div className="flex" role="tablist" aria-label="Panel selection">
          <button
            role="tab"
            aria-selected={activeTab === "input"}
            onClick={() => setActiveTab("input")}
            className={`flex-1 py-2.5 text-sm font-medium border-b-2 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-inset ${
              activeTab === "input" ? "border-primary text-foreground" : "border-transparent text-muted-foreground"
            }`}
          >
            Settings
          </button>
          <button
            role="tab"
            aria-selected={activeTab === "output"}
            onClick={() => setActiveTab("output")}
            className={`flex-1 py-2.5 text-sm font-medium border-b-2 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-inset ${
              activeTab === "output" ? "border-primary text-foreground" : "border-transparent text-muted-foreground"
            }`}
          >
            Tokens
          </button>
        </div>
      </div>

      {/* SCROLLABLE CONTENT AREA */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">

        {/* PANELS CARD */}
        <div className="flex flex-col md:flex-row min-h-[500px] rounded-xl border border-border overflow-hidden">

          {/* LEFT PANEL — Brand colors + palette */}
          <div
            className={`${activeTab === "input" ? "flex" : "hidden"} md:flex flex-col flex-1 min-h-0 overflow-hidden md:border-r border-border`}
            role="region"
            aria-label="Brand colors and palette editor"
          >
            <div className="shrink-0 border-b border-border px-4 py-3">
              <div className="flex items-center gap-2">
                <Palette className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                <span className="text-sm font-medium">Brand Colors &amp; Palette</span>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">Click a color to open the picker (keys <kbd className="rounded border border-border bg-muted px-1 text-[10px]">1</kbd> <kbd className="rounded border border-border bg-muted px-1 text-[10px]">2</kbd> <kbd className="rounded border border-border bg-muted px-1 text-[10px]">3</kbd>) — drag to adjust hue and tone</p>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-5">
              <div className="space-y-4" role="group" aria-label="Color pickers">
                <ColorPicker label="Primary"   value={primaryColor}   onChange={setPrimaryColor}   shortcut="1" id="primary-color-trigger"   />
                <ColorPicker label="Secondary" value={secondaryColor} onChange={setSecondaryColor} shortcut="2" id="secondary-color-trigger" />
                <ColorPicker label="Accent"    value={accentColor}    onChange={setAccentColor}    shortcut="3" id="accent-color-trigger"    />
              </div>

              <div className="space-y-3 rounded-lg border border-border p-3" role="region" aria-label="Generated color palette">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <p className="text-xs font-medium">Generated Palette <span className="text-muted-foreground font-normal">— click any shade to copy</span></p>
                  <div className="flex items-center gap-0.5" role="radiogroup" aria-label="Color vision simulation">
                    {CB_MODES.map(([mode, label]) => (
                      <button
                        key={mode}
                        onClick={() => {
                          setCbMode(mode)
                          announceToScreenReader(mode !== 'none' ? `Color vision simulation: ${label}` : 'Normal color vision')
                        }}
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
                <ColorPalette shades={primaryShades}   name="primary"   />
                <ColorPalette shades={secondaryShades} name="secondary" />
                <ColorPalette shades={accentShades}    name="accent"    />
              </div>

              <div className="space-y-2" role="region" aria-label="Core design scales">
                <p className="text-xs font-medium">Core Scales</p>
                <div className="grid gap-3 grid-cols-3">
                  <div className="space-y-1.5 rounded-lg border border-border p-3">
                    <p className="text-xs font-medium">Typography</p>
                    <div className="space-y-0.5 text-xs text-muted-foreground">
                      {Object.entries(typographyScale).map(([t, v]) => <p key={t}>{t}: {v}</p>)}
                    </div>
                  </div>
                  <div className="space-y-1.5 rounded-lg border border-border p-3">
                    <p className="text-xs font-medium">Spacing</p>
                    <div className="space-y-0.5 text-xs text-muted-foreground">
                      {Object.entries(spacingScale).map(([t, v]) => <p key={t}>{t}: {v}</p>)}
                    </div>
                  </div>
                  <div className="space-y-1.5 rounded-lg border border-border p-3">
                    <p className="text-xs font-medium">Radius</p>
                    <div className="space-y-0.5 text-xs text-muted-foreground">
                      {Object.entries(radiusScale).map(([t, v]) => <p key={t}>{t}: {v}</p>)}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* RIGHT PANEL — Preview + Export */}
          <div
            className={`${activeTab === "output" ? "flex" : "hidden"} md:flex flex-col flex-1 min-h-0 overflow-hidden`}
            role="region"
            aria-label="Live preview and export"
          >
            <div className="shrink-0 border-b border-border px-4 py-3 flex items-center justify-between">
              <div>
                <span className="text-sm font-medium">Live Preview &amp; Export</span>
                <p className="text-xs text-muted-foreground">See tokens in action and export in your preferred format</p>
              </div>
              <div className="flex items-center gap-1 rounded-lg border border-border p-1" role="radiogroup" aria-label="Preview mode">
                <button
                  type="button"
                  onClick={() => { setPreviewMode("light"); announceToScreenReader('Light preview mode') }}
                  aria-label="Switch to light preview"
                  role="radio"
                  aria-checked={previewMode === "light"}
                  className={`rounded-md p-1.5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary flex items-center gap-1 ${previewMode === "light" ? "bg-muted" : "hover:bg-muted/50"}`}
                >
                  <Sun className="h-4 w-4" aria-hidden="true" />
                  {previewMode === "dark" && (
                    <kbd className="hidden md:inline rounded border border-border bg-muted px-1 text-[10px]" aria-hidden="true">Ctrl+Shift+L</kbd>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => { setPreviewMode("dark"); announceToScreenReader('Dark preview mode') }}
                  aria-label="Switch to dark preview"
                  role="radio"
                  aria-checked={previewMode === "dark"}
                  className={`rounded-md p-1.5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary flex items-center gap-1 ${previewMode === "dark" ? "bg-muted" : "hover:bg-muted/50"}`}
                >
                  <Moon className="h-4 w-4" aria-hidden="true" />
                  {previewMode === "light" && (
                    <kbd className="hidden md:inline rounded border border-border bg-muted px-1 text-[10px]" aria-hidden="true">Ctrl+Shift+L</kbd>
                  )}
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              <div className="rounded-lg border border-border overflow-hidden" style={{ backgroundColor: previewBg }}>
                <div className="p-4 space-y-4">
                  <div className="space-y-1.5">
                    <p className="text-xs font-medium" style={{ color: isDark ? "#888" : "#666" }}>Buttons</p>
                    <div className="flex flex-wrap gap-2">
                      <button className="rounded-md px-4 py-2 text-sm font-medium text-white" style={{ backgroundColor: previewBtnBg }}>Primary</button>
                      <button className="rounded-md px-4 py-2 text-sm font-medium text-white" style={{ backgroundColor: secondaryShades[isDark ? 500 : 600] }}>Secondary</button>
                      <button className="rounded-md px-4 py-2 text-sm font-medium text-white" style={{ backgroundColor: accentShades[500] }}>Accent</button>
                      <button className="rounded-md border px-4 py-2 text-sm font-medium" style={{ borderColor: previewBorder, color: isDark ? primaryShades[300] : primaryShades[600] }}>Outline</button>
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <p className="text-xs font-medium" style={{ color: isDark ? "#888" : "#666" }}>Badges</p>
                    <div className="flex flex-wrap gap-2">
                      <span className="rounded-full px-3 py-0.5 text-xs font-medium text-white" style={{ backgroundColor: primaryShades[500] }}>Primary</span>
                      <span className="rounded-full px-3 py-0.5 text-xs font-medium text-white" style={{ backgroundColor: secondaryShades[500] }}>Secondary</span>
                      <span className="rounded-full px-3 py-0.5 text-xs font-medium text-white" style={{ backgroundColor: accentShades[500] }}>Accent</span>
                      <span className="rounded-full px-3 py-0.5 text-xs font-medium" style={{ backgroundColor: isDark ? primaryShades[800] : primaryShades[100], color: isDark ? primaryShades[200] : primaryShades[700] }}>Subtle</span>
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <p className="text-xs font-medium" style={{ color: isDark ? "#888" : "#666" }}>Card</p>
                    <div className="rounded-lg border p-4 space-y-2" style={{ borderColor: previewBorder, backgroundColor: previewSurface }}>
                      <p className="text-sm font-semibold" style={{ color: previewText }}>Sample Card</p>
                      <p className="text-xs" style={{ color: previewSubtext }}>Uses your {previewMode} mode semantic tokens.</p>
                      <button className="rounded px-3 py-1 text-xs font-medium text-white" style={{ backgroundColor: previewBtnBg }}>Action</button>
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <p className="text-xs font-medium" style={{ color: isDark ? "#888" : "#666" }}>Typography</p>
                    <div className="rounded-lg border p-3 space-y-1" style={{ borderColor: previewBorder }}>
                      {(["3xl", "xl", "base", "sm", "xs"] as const).map((size) => (
                        <p key={size} style={{ fontSize: typographyScale[size], color: previewSubtext, lineHeight: 1.3 }}>{size} — The quick brown fox</p>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <div role="region" aria-label="Export tokens">
                <p className="text-xs font-medium mb-2">Export <span className="text-muted-foreground font-normal">— includes light &amp; dark semantic tokens</span></p>
                <Tabs defaultValue="css">
                  <TabsList className="grid w-full grid-cols-3" aria-label="Export format">
                    <TabsTrigger value="css">CSS</TabsTrigger>
                    <TabsTrigger value="tailwind">Tailwind</TabsTrigger>
                    <TabsTrigger value="json">JSON</TabsTrigger>
                  </TabsList>
                  <TabsContent value="css" className="space-y-2">
                    <pre className="max-h-48 overflow-auto rounded-lg bg-muted p-3 text-xs" aria-label="Generated CSS code"><code>{generateCSS()}</code></pre>
                    <Button variant="outline" size="sm" onClick={() => copyToClipboard(generateCSS(), "css", "CSS tokens")} aria-label="Copy CSS tokens">
                      {copiedKey === "css" ? <Check className="mr-2 h-3.5 w-3.5" aria-hidden="true" /> : <Copy className="mr-2 h-3.5 w-3.5" aria-hidden="true" />}
                      Copy CSS
                      <kbd className="ml-2 hidden md:inline rounded border border-border bg-muted px-1 text-[10px]" aria-hidden="true">Ctrl+Shift+V</kbd>
                    </Button>
                  </TabsContent>
                  <TabsContent value="tailwind" className="space-y-2">
                    <pre className="max-h-48 overflow-auto rounded-lg bg-muted p-3 text-xs" aria-label="Generated Tailwind config"><code>{generateTailwind()}</code></pre>
                    <Button variant="outline" size="sm" onClick={() => copyToClipboard(generateTailwind(), "tailwind", "Tailwind config")} aria-label="Copy Tailwind config">
                      {copiedKey === "tailwind" ? <Check className="mr-2 h-3.5 w-3.5" aria-hidden="true" /> : <Copy className="mr-2 h-3.5 w-3.5" aria-hidden="true" />}
                      Copy Config
                    </Button>
                  </TabsContent>
                  <TabsContent value="json" className="space-y-2">
                    <pre className="max-h-48 overflow-auto rounded-lg bg-muted p-3 text-xs" aria-label="Generated JSON tokens"><code>{generateJSON()}</code></pre>
                    <Button variant="outline" size="sm" onClick={() => copyToClipboard(generateJSON(), "json", "JSON tokens")} aria-label="Copy JSON tokens">
                      {copiedKey === "json" ? <Check className="mr-2 h-3.5 w-3.5" aria-hidden="true" /> : <Copy className="mr-2 h-3.5 w-3.5" aria-hidden="true" />}
                      Copy JSON
                    </Button>
                  </TabsContent>
                </Tabs>
              </div>
            </div>
          </div>

        </div>

        {/* USAGE GUIDE */}
        <div className="rounded-xl border border-border bg-card p-4 space-y-4">
          <div className="space-y-1.5">
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">How to use</p>
            <ol className="space-y-1.5 text-xs text-muted-foreground list-decimal list-inside">
              <li>Click a color swatch (or press <kbd className="rounded border border-border bg-muted px-1 text-[10px]">1</kbd> <kbd className="rounded border border-border bg-muted px-1 text-[10px]">2</kbd> <kbd className="rounded border border-border bg-muted px-1 text-[10px]">3</kbd>) to open the <span className="text-foreground font-medium">Primary</span>, <span className="text-foreground font-medium">Secondary</span>, or <span className="text-foreground font-medium">Accent</span> color picker. Drag in the gradient area to change saturation and lightness; drag the hue bar to change the color family.</li>
              <li>The <span className="text-foreground font-medium">Generated Palette</span> shows 10 shades (50–900) for each color. Click any shade to copy its value.</li>
              <li>Switch to the <span className="text-foreground font-medium">Tokens</span> panel to see a live preview of your palette applied to buttons, badges, cards, and type. Toggle between <span className="text-foreground font-medium">light</span> and <span className="text-foreground font-medium">dark</span> mode using the sun/moon buttons.</li>
              <li>Export in <span className="text-foreground font-medium">CSS</span> (custom properties), <span className="text-foreground font-medium">Tailwind</span> (config extension), or <span className="text-foreground font-medium">JSON</span> (raw token object) — all include semantic light and dark mode values.</li>
            </ol>
          </div>

          <div className="space-y-1.5">
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">Color vision simulation</p>
            <p className="text-xs text-muted-foreground">Use the <span className="text-foreground font-medium">Normal / Deuter. / Protan. / Tritan.</span> buttons above the Generated Palette to preview how your colors appear to people with different types of color vision. The palette swatches update live. Copied values are always the original color.</p>
            <ul className="space-y-1 text-xs text-muted-foreground list-disc list-inside mt-1">
              <li><span className="text-foreground font-medium">Deuteranopia</span> — reduced green sensitivity. The most common form, affecting about 6% of men. Red and green appear similar in hue.</li>
              <li><span className="text-foreground font-medium">Protanopia</span> — reduced red sensitivity. Affects about 1% of men. Reds appear very dark and can be confused with black or dark brown.</li>
              <li><span className="text-foreground font-medium">Tritanopia</span> — reduced blue sensitivity. Much rarer, under 0.01% of people. Blue and green appear similar; yellow and violet may look alike.</li>
            </ul>
          </div>

          <div className="space-y-1.5">
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">Keyboard shortcuts</p>
            <ul className="space-y-1 text-xs text-muted-foreground list-disc list-inside">
              <li><kbd className="rounded border border-border bg-muted px-1 text-[10px]">1</kbd> / <kbd className="rounded border border-border bg-muted px-1 text-[10px]">2</kbd> / <kbd className="rounded border border-border bg-muted px-1 text-[10px]">3</kbd> open the Primary, Secondary, and Accent color pickers.</li>
              <li><kbd className="rounded border border-border bg-muted px-1 text-[10px]">Ctrl+Shift+V</kbd> copies the full CSS token output to your clipboard.</li>
              <li><kbd className="rounded border border-border bg-muted px-1 text-[10px]">Ctrl+Shift+L</kbd> toggles between light and dark preview mode.</li>
              <li><kbd className="rounded border border-border bg-muted px-1 text-[10px]">Escape</kbd> closes any open color picker.</li>
            </ul>
          </div>

          <p className="text-xs text-muted-foreground">Everything runs in your browser. Nothing is sent to a server.</p>
        </div>

        {/* Spacer so fixed mobile bar does not cover last content */}
        <div className="md:hidden h-[60px]" aria-hidden="true" />
      </div>

      {/* MOBILE: bottom action bar */}
      <div
        className="md:hidden fixed bottom-0 left-0 right-0 flex items-center gap-2 border-t border-border bg-card/95 backdrop-blur-sm px-3 py-2 z-20"
        style={{ paddingBottom: "max(0.5rem, env(safe-area-inset-bottom))" }}
      >
        <div className="flex-1" />
        <Button
          size="sm"
          className="h-11 px-4"
          onClick={() => copyToClipboard(generateCSS(), "css", "CSS tokens")}
          aria-label="Copy CSS tokens"
        >
          {copiedKey === "css" ? <Check className="mr-2 h-4 w-4" aria-hidden="true" /> : <Copy className="mr-2 h-4 w-4" aria-hidden="true" />}
          Copy
        </Button>
      </div>

    </div>
  )
}
