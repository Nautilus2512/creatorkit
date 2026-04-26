"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { Copy, Check, Moon, Sun, Palette } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ShortcutsModal } from "@/components/shortcuts-modal"

// ── Color conversion helpers ──────────────────────────────────────────────────

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

// ── Custom Color Picker ───────────────────────────────────────────────────────

function ColorPicker({ label, value, onChange }: { label: string; value: string; onChange: (hex: string) => void }) {
  const hsl = useMemo(() => hexToHSL(value), [value])
  const [h, setH] = useState(hsl.h)
  const [s, setS] = useState(hsl.s)
  const [l, setL] = useState(hsl.l)
  const [hexInput, setHexInput] = useState(value)
  const [open, setOpen] = useState(false)

  // Sync when value changes externally
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

  // SL picker (2D gradient area)
  const slRef = useRef<HTMLDivElement>(null)
  const draggingSL = useRef(false)

  const handleSLPointer = useCallback((e: React.PointerEvent) => {
    if (!slRef.current) return
    const rect = slRef.current.getBoundingClientRect()
    const nx = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width))
    const ny = Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height))
    const ns = Math.round(nx * 100)
    const nl = Math.round((1 - ny) * 100)
    setS(ns); setL(nl)
    commit(h, ns, nl)
  }, [h, commit])

  // Hue slider
  const hueRef = useRef<HTMLDivElement>(null)
  const draggingH = useRef(false)

  const handleHuePointer = useCallback((e: React.PointerEvent) => {
    if (!hueRef.current) return
    const rect = hueRef.current.getBoundingClientRect()
    const nx = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width))
    const nh = Math.round(nx * 360)
    setH(nh)
    commit(nh, s, l)
  }, [s, l, commit])

  // Hex input
  const handleHexInput = (raw: string) => {
    setHexInput(raw)
    const clean = raw.startsWith("#") ? raw : `#${raw}`
    if (/^#[0-9a-fA-F]{6}$/.test(clean)) {
      onChange(clean)
    }
  }

  const rgb = hslToRgb(h, s, l)
  const thumbX = `${s}%`
  const thumbY = `${100 - l}%`
  const hueX = `${(h / 360) * 100}%`

  return (
    <div className="space-y-1.5">
      <Label className="text-sm">{label}</Label>

      {/* Color swatch trigger */}
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        className="flex items-center gap-2 w-full rounded-lg border border-border bg-muted/30 px-3 py-2 hover:border-primary/50 transition-colors"
      >
        <span className="h-6 w-6 rounded-md border border-border shrink-0" style={{ backgroundColor: value }} />
        <span className="font-mono text-sm flex-1 text-left">{hexInput}</span>
        <span className="text-xs text-muted-foreground">Click to edit</span>
      </button>

      {/* Picker panel */}
      {open && (
        <div className="rounded-xl border border-border bg-popover shadow-xl p-3 space-y-3">
          {/* SL gradient area */}
          <div
            ref={slRef}
            className="relative h-36 w-full rounded-lg cursor-crosshair select-none"
            style={{
              background: `linear-gradient(to top, #000, transparent), linear-gradient(to right, #fff, hsl(${h}, 100%, 50%))`,
            }}
            onPointerDown={(e) => { draggingSL.current = true; e.currentTarget.setPointerCapture(e.pointerId); handleSLPointer(e) }}
            onPointerMove={(e) => { if (draggingSL.current) handleSLPointer(e) }}
            onPointerUp={(e) => { draggingSL.current = false; e.currentTarget.releasePointerCapture(e.pointerId) }}
            onPointerCancel={() => { draggingSL.current = false }}
          >
            {/* Thumb */}
            <div
              className="absolute h-4 w-4 rounded-full border-2 border-white shadow-md -translate-x-1/2 -translate-y-1/2 pointer-events-none"
              style={{ left: thumbX, top: thumbY, backgroundColor: value }}
            />
          </div>

          {/* Hue slider */}
          <div
            ref={hueRef}
            className="relative h-4 w-full rounded-full cursor-pointer select-none"
            style={{ background: "linear-gradient(to right, #f00, #ff0, #0f0, #0ff, #00f, #f0f, #f00)" }}
            onPointerDown={(e) => { draggingH.current = true; e.currentTarget.setPointerCapture(e.pointerId); handleHuePointer(e) }}
            onPointerMove={(e) => { if (draggingH.current) handleHuePointer(e) }}
            onPointerUp={(e) => { draggingH.current = false; e.currentTarget.releasePointerCapture(e.pointerId) }}
            onPointerCancel={() => { draggingH.current = false }}
          >
            {/* Hue thumb */}
            <div
              className="absolute h-5 w-5 rounded-full border-2 border-white shadow-md top-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none"
              style={{ left: hueX, backgroundColor: `hsl(${h}, 100%, 50%)` }}
            />
          </div>

          {/* Hex + RGB display */}
          <div className="flex gap-2 items-center">
            <span className="h-8 w-8 rounded-md border border-border shrink-0" style={{ backgroundColor: value }} />
            <Input
              value={hexInput}
              onChange={(e) => handleHexInput(e.target.value)}
              className="flex-1 font-mono text-sm h-8"
              placeholder="#000000"
            />
            <span className="text-xs text-muted-foreground shrink-0">
              {rgb.r}, {rgb.g}, {rgb.b}
            </span>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Token generation ──────────────────────────────────────────────────────────

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

// ── Main component ────────────────────────────────────────────────────────────

export function DesignTokenGenerator() {
  const [primaryColor, setPrimaryColor] = useState("#3b82f6")
  const [secondaryColor, setSecondaryColor] = useState("#8b5cf6")
  const [accentColor, setAccentColor] = useState("#f59e0b")
  const [copiedKey, setCopiedKey] = useState<string | null>(null)
  const [previewMode, setPreviewMode] = useState<"light" | "dark">("dark")

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

  const copyToClipboard = async (text: string, key: string) => {
    await navigator.clipboard.writeText(text)
    setCopiedKey(key)
    setTimeout(() => setCopiedKey(null), 2000)
  }

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const ctrl = e.ctrlKey || e.metaKey
      if (!ctrl) return
      if (e.key === "c" || e.key === "C") { e.preventDefault(); copyToClipboard(generateCSS(), "css") }
    }
    window.addEventListener("keydown", handler)
    return () => window.removeEventListener("keydown", handler)
  }, [primaryColor, secondaryColor, accentColor])

  const ColorPalette = ({ shades, name }: { shades: Record<string, string>; name: string }) => (
    <div className="space-y-1.5">
      <p className="text-xs font-medium capitalize text-muted-foreground">{name}</p>
      <div className="flex gap-0.5 overflow-hidden rounded-lg">
        {Object.entries(shades).map(([shade, color]) => (
          <button key={shade} className="group relative h-8 flex-1 transition-transform hover:scale-110 hover:z-10"
            style={{ backgroundColor: color }} onClick={() => copyToClipboard(color, `${name}-${shade}`)} title={`${name}-${shade}: ${color}`}>
            <span className="absolute inset-0 flex items-center justify-center bg-black/50 text-[9px] text-white opacity-0 transition-opacity group-hover:opacity-100">
              {copiedKey === `${name}-${shade}` ? <Check className="h-2.5 w-2.5" /> : shade}
            </span>
          </button>
        ))}
      </div>
    </div>
  )

  return (
    <>
      <div className="flex h-full flex-col space-y-3">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">Design Token Generator</h2>
          <p className="text-muted-foreground">Generate a complete design system from your brand colors.</p>
        </div>

        <div className="grid gap-4 md:grid-cols-2 md:h-[calc(100vh-13rem)]">

          {/* LEFT PANEL */}
          <div className="flex flex-col md:overflow-hidden rounded-xl border border-border bg-card">
            <div className="shrink-0 border-b border-border px-4 py-3">
              <div className="flex items-center gap-2">
                <Palette className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">Brand Colors & Palette</span>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">Click a color to open the picker — drag to adjust hue and tone</p>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-5">
              {/* Custom Color Pickers */}
              <div className="space-y-4">
                <ColorPicker label="Primary" value={primaryColor} onChange={setPrimaryColor} />
                <ColorPicker label="Secondary" value={secondaryColor} onChange={setSecondaryColor} />
                <ColorPicker label="Accent" value={accentColor} onChange={setAccentColor} />
              </div>

              {/* Generated Palette */}
              <div className="space-y-3 rounded-lg border border-border p-3">
                <p className="text-xs font-medium">Generated Palette <span className="text-muted-foreground font-normal">— click any shade to copy</span></p>
                <ColorPalette shades={primaryShades} name="primary" />
                <ColorPalette shades={secondaryShades} name="secondary" />
                <ColorPalette shades={accentShades} name="accent" />
              </div>

              {/* Core Scales */}
              <div className="space-y-2">
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

            {/* Sticky Action Bar */}
            <div className="shrink-0 border-t border-border bg-card/95 backdrop-blur-sm px-4 py-3">
              <Button variant="outline" className="w-full" onClick={() => copyToClipboard(generateCSS(), "css")}>
                {copiedKey === "css" ? <Check className="mr-2 h-4 w-4" /> : <Copy className="mr-2 h-4 w-4" />}
                Copy CSS
                <kbd className="ml-2 rounded border border-border px-1 text-[10px] opacity-50">Ctrl+C</kbd>
              </Button>
            </div>
          </div>

          {/* RIGHT PANEL */}
          <div className="flex flex-col md:overflow-hidden rounded-xl border border-border bg-card">
            <div className="shrink-0 border-b border-border px-4 py-3 flex items-center justify-between">
              <div>
                <span className="text-sm font-medium">Live Preview & Export</span>
                <p className="text-xs text-muted-foreground">See tokens in action and export in your preferred format</p>
              </div>
              <div className="flex items-center gap-1 rounded-lg border border-border p-1">
                <button type="button" onClick={() => setPreviewMode("light")}
                  className={`rounded-md p-1.5 transition-colors ${previewMode === "light" ? "bg-muted" : "hover:bg-muted/50"}`} title="Light mode">
                  <Sun className="h-4 w-4" />
                </button>
                <button type="button" onClick={() => setPreviewMode("dark")}
                  className={`rounded-md p-1.5 transition-colors ${previewMode === "dark" ? "bg-muted" : "hover:bg-muted/50"}`} title="Dark mode">
                  <Moon className="h-4 w-4" />
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

              <div>
                <p className="text-xs font-medium mb-2">Export <span className="text-muted-foreground font-normal">— includes light & dark semantic tokens</span></p>
                <Tabs defaultValue="css">
                  <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="css">CSS</TabsTrigger>
                    <TabsTrigger value="tailwind">Tailwind</TabsTrigger>
                    <TabsTrigger value="json">JSON</TabsTrigger>
                  </TabsList>
                  <TabsContent value="css" className="space-y-2">
                    <pre className="max-h-48 overflow-auto rounded-lg bg-muted p-3 text-xs"><code>{generateCSS()}</code></pre>
                    <Button variant="outline" size="sm" onClick={() => copyToClipboard(generateCSS(), "css")}>
                      {copiedKey === "css" ? <Check className="mr-2 h-3.5 w-3.5" /> : <Copy className="mr-2 h-3.5 w-3.5" />}
                      Copy CSS <kbd className="ml-2 rounded border border-border px-1 text-[10px] opacity-50">Ctrl+C</kbd>
                    </Button>
                  </TabsContent>
                  <TabsContent value="tailwind" className="space-y-2">
                    <pre className="max-h-48 overflow-auto rounded-lg bg-muted p-3 text-xs"><code>{generateTailwind()}</code></pre>
                    <Button variant="outline" size="sm" onClick={() => copyToClipboard(generateTailwind(), "tailwind")}>
                      {copiedKey === "tailwind" ? <Check className="mr-2 h-3.5 w-3.5" /> : <Copy className="mr-2 h-3.5 w-3.5" />}
                      Copy Config
                    </Button>
                  </TabsContent>
                  <TabsContent value="json" className="space-y-2">
                    <pre className="max-h-48 overflow-auto rounded-lg bg-muted p-3 text-xs"><code>{generateJSON()}</code></pre>
                    <Button variant="outline" size="sm" onClick={() => copyToClipboard(generateJSON(), "json")}>
                      {copiedKey === "json" ? <Check className="mr-2 h-3.5 w-3.5" /> : <Copy className="mr-2 h-3.5 w-3.5" />}
                      Copy JSON
                    </Button>
                  </TabsContent>
                </Tabs>
              </div>
            </div>
          </div>
        </div>
      </div>

      <ShortcutsModal
        pageName="Design Token Generator"
        shortcuts={[
          { keys: ["Ctrl", "C"], description: "Copy CSS tokens" },
          { keys: ["?"], description: "Toggle this shortcuts panel" },
        ]}
      />
    </>
  )
}