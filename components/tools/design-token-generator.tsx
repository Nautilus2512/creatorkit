"use client"

import { useMemo, useState } from "react"
import { Copy, Check } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

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
  r /= 255
  g /= 255
  b /= 255

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

export function DesignTokenGenerator() {
  const [primaryColor, setPrimaryColor] = useState("#3b82f6")
  const [copiedKey, setCopiedKey] = useState<string | null>(null)

  const primaryShades = useMemo(() => generateShades(primaryColor), [primaryColor])

  const typographyScale = useMemo(
    () => ({
      xs: "0.75rem",
      sm: "0.875rem",
      base: "1rem",
      lg: "1.125rem",
      xl: "1.25rem",
      "2xl": "1.5rem",
      "3xl": "1.875rem",
      "4xl": "2.25rem",
      "5xl": "3rem",
    }),
    []
  )

  const spacingScale = useMemo(
    () => ({
      0: "0rem",
      1: "0.25rem",
      2: "0.5rem",
      3: "0.75rem",
      4: "1rem",
      5: "1.25rem",
      6: "1.5rem",
      8: "2rem",
      10: "2.5rem",
      12: "3rem",
      16: "4rem",
      20: "5rem",
      24: "6rem",
    }),
    []
  )

  const radiusScale = useMemo(
    () => ({
      none: "0px",
      sm: "0.125rem",
      md: "0.375rem",
      lg: "0.5rem",
      xl: "0.75rem",
      "2xl": "1rem",
      full: "9999px",
    }),
    []
  )

  const generateCSS = () => {
    let css = `:root {\n`
    Object.entries(primaryShades).forEach(([shade, value]) => {
      css += `  --primary-${shade}: ${value};\n`
    })
    css += `\n`
    Object.entries(typographyScale).forEach(([token, value]) => {
      css += `  --font-size-${token}: ${value};\n`
    })
    css += `\n`
    Object.entries(spacingScale).forEach(([token, value]) => {
      css += `  --spacing-${token}: ${value};\n`
    })
    css += `\n`
    Object.entries(radiusScale).forEach(([token, value]) => {
      css += `  --radius-${token}: ${value};\n`
    })
    css += `}\n`
    return css
  }

  const generateTailwind = () => {
    const config = {
      theme: {
        extend: {
          colors: {
            primary: primaryShades,
          },
          fontSize: typographyScale,
          spacing: spacingScale,
          borderRadius: radiusScale,
        },
      },
    }
    return `module.exports = ${JSON.stringify(config, null, 2)}`
  }

  const copyToClipboard = async (text: string, key: string) => {
    await navigator.clipboard.writeText(text)
    setCopiedKey(key)
    setTimeout(() => setCopiedKey(null), 2000)
  }

  const ColorPalette = ({
    shades,
    name
  }: {
    shades: Record<string, string>
    name: string
  }) => (
    <div className="space-y-2">
      <p className="text-sm font-medium capitalize">{name}</p>
      <div className="flex gap-1 overflow-hidden rounded-lg">
        {Object.entries(shades).map(([shade, color]) => (
          <button
            key={shade}
            className="group relative h-12 flex-1 transition-transform hover:scale-110 hover:z-10"
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

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">
          Design Token Generator
        </h2>
        <p className="text-muted-foreground">
          Generate a palette and foundational tokens from one brand color.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 md:items-start">
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Primary Brand Color</CardTitle>
              <CardDescription>
                Pick a hex value to auto-generate your token system.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="max-w-md space-y-2">
                <Label htmlFor="primary">Primary</Label>
                <div className="flex gap-2">
                  <Input
                    id="primary"
                    type="color"
                    value={primaryColor}
                    onChange={(e) => setPrimaryColor(e.target.value)}
                    className="h-10 w-14 cursor-pointer p-1"
                  />
                  <Input
                    value={primaryColor}
                    onChange={(e) => setPrimaryColor(e.target.value)}
                    className="flex-1 font-mono text-sm"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Generated Palette</CardTitle>
              <CardDescription>
                Click on any shade to copy its value to clipboard.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <ColorPalette shades={primaryShades} name="primary" />
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Core Scales</CardTitle>
              <CardDescription>
                Typography, spacing, and border radius tokens are generated automatically.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2 rounded-lg border border-border p-3">
                <p className="text-sm font-medium">Typography</p>
                <div className="space-y-1 text-xs text-muted-foreground">
                  {Object.entries(typographyScale).map(([token, value]) => (
                    <p key={token}>
                      {token}: {value}
                    </p>
                  ))}
                </div>
              </div>
              <div className="space-y-2 rounded-lg border border-border p-3">
                <p className="text-sm font-medium">Spacing</p>
                <div className="space-y-1 text-xs text-muted-foreground">
                  {Object.entries(spacingScale).map(([token, value]) => (
                    <p key={token}>
                      {token}: {value}
                    </p>
                  ))}
                </div>
              </div>
              <div className="space-y-2 rounded-lg border border-border p-3">
                <p className="text-sm font-medium">Border Radius</p>
                <div className="space-y-1 text-xs text-muted-foreground">
                  {Object.entries(radiusScale).map(([token, value]) => (
                    <p key={token}>
                      {token}: {value}
                    </p>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Export</CardTitle>
              <CardDescription>
                Copy your design tokens in your preferred format.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="css">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="css">CSS Variables</TabsTrigger>
                  <TabsTrigger value="tailwind">Tailwind</TabsTrigger>
                </TabsList>
                <TabsContent value="css" className="space-y-3">
                  <pre className="max-h-64 overflow-auto rounded-lg bg-muted p-4 text-xs">
                    <code>{generateCSS()}</code>
                  </pre>
                  <Button
                    variant="outline"
                    onClick={() => copyToClipboard(generateCSS(), "css")}
                  >
                    {copiedKey === "css" ? (
                      <Check className="mr-2 h-4 w-4" />
                    ) : (
                      <Copy className="mr-2 h-4 w-4" />
                    )}
                    Copy CSS
                  </Button>
                </TabsContent>
                <TabsContent value="tailwind" className="space-y-3">
                  <pre className="max-h-64 overflow-auto rounded-lg bg-muted p-4 text-xs">
                    <code>{generateTailwind()}</code>
                  </pre>
                  <Button
                    variant="outline"
                    onClick={() => copyToClipboard(generateTailwind(), "tailwind")}
                  >
                    {copiedKey === "tailwind" ? (
                      <Check className="mr-2 h-4 w-4" />
                    ) : (
                      <Copy className="mr-2 h-4 w-4" />
                    )}
                    Copy Config
                  </Button>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
