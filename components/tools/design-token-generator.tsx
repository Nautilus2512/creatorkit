"use client"

import { Copy, Check, Moon, Sun } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useEffect, useMemo, useState } from "react"
import { ShortcutsModal } from "@/components/shortcuts-modal"

function hexToHSL(hex: string): { h: number; s: number; l: number } {
  let r = 0, g = 0, b = 0
  if (hex.length === 4) {
    r = parseInt(hex[1] + hex[1], 16)
    g = parseInt(hex[2] + hex[2], 16)
    b = parseInt(hex[3] + hex[3], 16)
  } else if (hex.length === 7) {
    r = parseInt(hex.slice(1, 3), 16)
    g = parseInt(hex.slice(3, 5), 16)
    b = parseInt(hex.slice(5, 7), 16)
  }
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

function generateShades(hex: string): Record<string, string> {
  const { h, s } = hexToHSL(hex)
  return {
    50: `hsl(${h}, ${s}%, 97%)`,
    100: `hsl(${h}, ${s}%, 94%)`,
    200: `hsl(${h}, ${s}%, 86%)`,
    300: `hsl(${h}, ${s}%, 76%)`,
    400: `hsl(${h}, ${s}%, 62%)`,
    500: `hsl(${h}, ${s}%, 50%)`,
    600: `hsl(${h}, ${s}%, 42%)`,
    700: `hsl(${h}, ${s}%, 34%)`,
    800: `hsl(${h}, ${s}%, 26%)`,
    900: `hsl(${h}, ${s}%, 18%)`,
  }
}

const typographyScale = {
  xs: "0.75rem", sm: "0.875rem", base: "1rem", lg: "1.125rem",
  xl: "1.25rem", "2xl": "1.5rem", "3xl": "1.875rem", "4xl": "2.25rem", "5xl": "3rem",
}

const spacingScale = {
  0: "0rem", 1: "0.25rem", 2: "0.5rem", 3: "0.75rem", 4: "1rem",
  5: "1.25rem", 6: "1.5rem", 8: "2rem", 10: "2.5rem", 12: "3rem",
  16: "4rem", 20: "5rem", 24: "6rem",
}

const radiusScale = {
  none: "0px", sm: "0.125rem", md: "0.375rem", lg: "0.5rem",
  xl: "0.75rem", "2xl": "1rem", full: "9999px",
}

export function DesignTokenGenerator() {
  const [primaryColor, setPrimaryColor] = useState("#3b82f6")
  const [secondaryColor, setSecondaryColor] = useState("#8b5cf6")
  const [accentColor, setAccentColor] = useState("#f59e0b")
  const [copiedKey, setCopiedKey] = useState<string | null>(null)
  const [previewMode, setPreviewMode] = useState<"light" | "dark">("dark")

  const primaryShades = useMemo(() => generateShades(primaryColor), [primaryColor])
  const secondaryShades = useMemo(() => generateShades(secondaryColor), [secondaryColor])
  const accentShades = useMemo(() => generateShades(accentColor), [accentColor])

  // Dark mode uses high shades for bg, low shades for text
  // Light mode uses low shades for bg, high shades for text
  const isDark = previewMode === "dark"
  const previewBg = isDark ? "#0f0f0f" : "#ffffff"
  const previewSurface = isDark ? primaryShades[900] : primaryShades[50]
  const previewBorder = isDark ? primaryShades[700] : primaryShades[200]
  const previewText = isDark ? primaryShades[100] : primaryShades[900]
  const previewSubtext = isDark ? primaryShades[300] : primaryShades[700]
  const previewBtnBg = primaryShades[isDark ? 500 : 600]

  const generateCSS = () => {
    let css = `/* Light Mode */\n:root {\n`
    const addShades = (name: string, shades: Record<string, string>) => {
      Object.entries(shades).forEach(([shade, value]) => {
        css += `  --${name}-${shade}: ${value};\n`
      })
      css += `\n`
    }
    addShades("primary", primaryShades)
    addShades("secondary", secondaryShades)
    addShades("accent", accentShades)

    // Light mode semantic tokens
    css += `  /* Semantic - Light */\n`
    css += `  --color-background: ${primaryShades[50]};\n`
    css += `  --color-surface: #ffffff;\n`
    css += `  --color-text: ${primaryShades[900]};\n`
    css += `  --color-text-muted: ${primaryShades[600]};\n`
    css += `  --color-border: ${primaryShades[200]};\n`
    css += `  --color-btn-primary: ${primaryShades[600]};\n`
    css += `\n`
    Object.entries(typographyScale).forEach(([t, v]) => { css += `  --font-size-${t}: ${v};\n` })
    css += `\n`
    Object.entries(spacingScale).forEach(([t, v]) => { css += `  --spacing-${t}: ${v};\n` })
    css += `\n`
    Object.entries(radiusScale).forEach(([t, v]) => { css += `  --radius-${t}: ${v};\n` })
    css += `}\n\n`

    // Dark mode semantic tokens
    css += `/* Dark Mode */\n.dark {\n`
    css += `  --color-background: #0f0f0f;\n`
    css += `  --color-surface: ${primaryShades[900]};\n`
    css += `  --color-text: ${primaryShades[100]};\n`
    css += `  --color-text-muted: ${primaryShades[300]};\n`
    css += `  --color-border: ${primaryShades[700]};\n`
    css += `  --color-btn-primary: ${primaryShades[500]};\n`
    css += `}\n`
    return css
  }

  const generateTailwind = () => {
    const config = {
      theme: {
        extend: {
          colors: { primary: primaryShades, secondary: secondaryShades, accent: accentShades },
          fontSize: typographyScale,
          spacing: spacingScale,
          borderRadius: radiusScale,
        },
      },
    }
    return `module.exports = ${JSON.stringify(config, null, 2)}`
  }

  const generateJSON = () => {
    const tokens = {
      colors: { primary: primaryShades, secondary: secondaryShades, accent: accentShades },
      semantic: {
        light: {
          background: primaryShades[50],
          surface: "#ffffff",
          text: primaryShades[900],
          textMuted: primaryShades[600],
          border: primaryShades[200],
          btnPrimary: primaryShades[600],
        },
        dark: {
          background: "#0f0f0f",
          surface: primaryShades[900],
          text: primaryShades[100],
          textMuted: primaryShades[300],
          border: primaryShades[700],
          btnPrimary: primaryShades[500],
        },
      },
      typography: typographyScale,
      spacing: spacingScale,
      borderRadius: radiusScale,
    }
    return JSON.stringify(tokens, null, 2)
  }

  const copyToClipboard = async (text: string, key: string) => {
    await navigator.clipboard.writeText(text)
    setCopiedKey(key)
    setTimeout(() => setCopiedKey(null), 2000)
  }

  const ColorInput = ({ label, id, value, onChange }: { label: string; id: string; value: string; onChange: (v: string) => void }) => (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <div className="flex gap-2">
        <Input id={id} type="color" value={value} onChange={(e) => onChange(e.target.value)} className="h-10 w-14 cursor-pointer p-1" />
        <Input value={value} onChange={(e) => onChange(e.target.value)} className="flex-1 font-mono text-sm" />
      </div>
    </div>
  )

  const ColorPalette = ({ shades, name }: { shades: Record<string, string>; name: string }) => (
    <div className="space-y-2">
      <p className="text-sm font-medium capitalize">{name}</p>
      <div className="flex gap-1 overflow-hidden rounded-lg">
        {Object.entries(shades).map(([shade, color]) => (
          <button
            key={shade}
            className="group relative h-10 flex-1 transition-transform hover:scale-110 hover:z-10"
            style={{ backgroundColor: color }}
            onClick={() => copyToClipboard(color, `${name}-${shade}`)}
            title={`${name}-${shade}: ${color}`}
          >
            <span className="absolute inset-0 flex items-center justify-center bg-black/50 text-[10px] text-white opacity-0 transition-opacity group-hover:opacity-100">
              {copiedKey === `${name}-${shade}` ? <Check className="h-3 w-3" /> : shade}
            </span>
          </button>
        ))}
      </div>
    </div>
  )

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const ctrl = e.ctrlKey || e.metaKey
      if (!ctrl) return
      if (e.key === "c" || e.key === "C") {
        e.preventDefault()
        copyToClipboard(generateCSS(), "css")
      }
    }
    window.addEventListener("keydown", handler)
    return () => window.removeEventListener("keydown", handler)
  }, [primaryColor, secondaryColor, accentColor])

  return (
    <>
    <div className="space-y-4">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">Design Token Generator</h2>
        <p className="text-muted-foreground">Generate a complete design system from your brand colors.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 md:items-start">
        {/* LEFT */}
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Brand Colors</CardTitle>
              <CardDescription>Set your primary, secondary, and accent colors.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <ColorInput label="Primary" id="primary" value={primaryColor} onChange={setPrimaryColor} />
              <ColorInput label="Secondary" id="secondary" value={secondaryColor} onChange={setSecondaryColor} />
              <ColorInput label="Accent" id="accent" value={accentColor} onChange={setAccentColor} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Generated Palette</CardTitle>
              <CardDescription>Click any shade to copy its value.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <ColorPalette shades={primaryShades} name="primary" />
              <ColorPalette shades={secondaryShades} name="secondary" />
              <ColorPalette shades={accentShades} name="accent" />
            </CardContent>
          </Card>
        </div>

        {/* RIGHT */}
        <div className="space-y-4">
          {/* Live Preview */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base">Live Preview</CardTitle>
                  <CardDescription>See your tokens in light and dark mode.</CardDescription>
                </div>
                {/* Mode toggle */}
                <div className="flex items-center gap-1 rounded-lg border border-border p-1">
                  <button
                    type="button"
                    onClick={() => setPreviewMode("light")}
                    className={`rounded-md p-1.5 transition-colors ${previewMode === "light" ? "bg-muted" : "hover:bg-muted/50"}`}
                    title="Light mode preview"
                  >
                    <Sun className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setPreviewMode("dark")}
                    className={`rounded-md p-1.5 transition-colors ${previewMode === "dark" ? "bg-muted" : "hover:bg-muted/50"}`}
                    title="Dark mode preview"
                  >
                    <Moon className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Preview container */}
              <div className="rounded-lg border border-border overflow-hidden" style={{ backgroundColor: previewBg }}>
                <div className="p-4 space-y-4">
                  {/* Buttons */}
                  <div className="space-y-2">
                    <p className="text-xs font-medium" style={{ color: isDark ? "#888" : "#666" }}>Buttons</p>
                    <div className="flex flex-wrap gap-2">
                      <button className="rounded-md px-4 py-2 text-sm font-medium text-white" style={{ backgroundColor: previewBtnBg }}>Primary</button>
                      <button className="rounded-md px-4 py-2 text-sm font-medium text-white" style={{ backgroundColor: secondaryShades[isDark ? 500 : 600] }}>Secondary</button>
                      <button className="rounded-md px-4 py-2 text-sm font-medium text-white" style={{ backgroundColor: accentShades[500] }}>Accent</button>
                      <button className="rounded-md border px-4 py-2 text-sm font-medium" style={{ borderColor: previewBorder, color: isDark ? primaryShades[300] : primaryShades[600] }}>Outline</button>
                    </div>
                  </div>

                  {/* Badges */}
                  <div className="space-y-2">
                    <p className="text-xs font-medium" style={{ color: isDark ? "#888" : "#666" }}>Badges</p>
                    <div className="flex flex-wrap gap-2">
                      <span className="rounded-full px-3 py-0.5 text-xs font-medium text-white" style={{ backgroundColor: primaryShades[500] }}>Primary</span>
                      <span className="rounded-full px-3 py-0.5 text-xs font-medium text-white" style={{ backgroundColor: secondaryShades[500] }}>Secondary</span>
                      <span className="rounded-full px-3 py-0.5 text-xs font-medium text-white" style={{ backgroundColor: accentShades[500] }}>Accent</span>
                      <span className="rounded-full px-3 py-0.5 text-xs font-medium" style={{ backgroundColor: isDark ? primaryShades[800] : primaryShades[100], color: isDark ? primaryShades[200] : primaryShades[700] }}>Subtle</span>
                    </div>
                  </div>

                  {/* Card */}
                  <div className="space-y-2">
                    <p className="text-xs font-medium" style={{ color: isDark ? "#888" : "#666" }}>Card</p>
                    <div className="rounded-lg border p-4 space-y-2" style={{ borderColor: previewBorder, backgroundColor: previewSurface }}>
                      <p className="text-sm font-semibold" style={{ color: previewText }}>Sample Card</p>
                      <p className="text-xs" style={{ color: previewSubtext }}>This card uses your {previewMode} mode semantic tokens.</p>
                      <button className="rounded px-3 py-1 text-xs font-medium text-white" style={{ backgroundColor: previewBtnBg }}>Action</button>
                    </div>
                  </div>

                  {/* Typography */}
                  <div className="space-y-1">
                    <p className="text-xs font-medium" style={{ color: isDark ? "#888" : "#666" }}>Typography Scale</p>
                    <div className="rounded-lg border p-3 space-y-1" style={{ borderColor: previewBorder }}>
                      {(["3xl", "xl", "base", "sm", "xs"] as const).map((size) => (
                        <p key={size} style={{ fontSize: typographyScale[size], color: previewSubtext, lineHeight: 1.3 }}>
                          {size} — The quick brown fox
                        </p>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Core Scales */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Core Scales</CardTitle>
              <CardDescription>Typography, spacing, and radius tokens.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2 rounded-lg border border-border p-3">
                <p className="text-sm font-medium">Typography</p>
                <div className="space-y-1 text-xs text-muted-foreground">
                  {Object.entries(typographyScale).map(([t, v]) => <p key={t}>{t}: {v}</p>)}
                </div>
              </div>
              <div className="space-y-2 rounded-lg border border-border p-3">
                <p className="text-sm font-medium">Spacing</p>
                <div className="space-y-1 text-xs text-muted-foreground">
                  {Object.entries(spacingScale).map(([t, v]) => <p key={t}>{t}: {v}</p>)}
                </div>
              </div>
              <div className="space-y-2 rounded-lg border border-border p-3">
                <p className="text-sm font-medium">Border Radius</p>
                <div className="space-y-1 text-xs text-muted-foreground">
                  {Object.entries(radiusScale).map(([t, v]) => <p key={t}>{t}: {v}</p>)}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Export */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Export</CardTitle>
              <CardDescription>Includes light & dark mode semantic tokens.</CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="css">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="css">CSS</TabsTrigger>
                  <TabsTrigger value="tailwind">Tailwind</TabsTrigger>
                  <TabsTrigger value="json">JSON</TabsTrigger>
                </TabsList>
                <TabsContent value="css" className="space-y-3">
                  <pre className="max-h-64 overflow-auto rounded-lg bg-muted p-4 text-xs"><code>{generateCSS()}</code></pre>
                  <Button variant="outline" onClick={() => copyToClipboard(generateCSS(), "css")}>
                    {copiedKey === "css" ? <Check className="mr-2 h-4 w-4" /> : <Copy className="mr-2 h-4 w-4" />}
                    Copy CSS
                    <kbd className="ml-2 rounded border border-border px-1 text-[10px] opacity-50">Ctrl+C</kbd>
                  </Button>
                </TabsContent>
                <TabsContent value="tailwind" className="space-y-3">
                  <pre className="max-h-64 overflow-auto rounded-lg bg-muted p-4 text-xs"><code>{generateTailwind()}</code></pre>
                  <Button variant="outline" onClick={() => copyToClipboard(generateTailwind(), "tailwind")}>
                    {copiedKey === "tailwind" ? <Check className="mr-2 h-4 w-4" /> : <Copy className="mr-2 h-4 w-4" />}
                    Copy Config
                  </Button>
                </TabsContent>
                <TabsContent value="json" className="space-y-3">
                  <pre className="max-h-64 overflow-auto rounded-lg bg-muted p-4 text-xs"><code>{generateJSON()}</code></pre>
                  <Button variant="outline" onClick={() => copyToClipboard(generateJSON(), "json")}>
                    {copiedKey === "json" ? <Check className="mr-2 h-4 w-4" /> : <Copy className="mr-2 h-4 w-4" />}
                    Copy JSON
                  </Button>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
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