"use client"

import { useState } from "react"
import { Copy, Check } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

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

  // HEX
  if (/^#?[0-9a-f]{3}$|^#?[0-9a-f]{6}$/i.test(s)) return hexToRgb(s)

  // RGB / RGBA
  const rgb = s.match(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/)
  if (rgb) return { r: +rgb[1], g: +rgb[2], b: +rgb[3] }

  // HSL / HSLA
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

  const applyColor = (rgb: { r: number; g: number; b: number } | null, rawInput: string) => {
    setColor(rgb)
    setInput(rawInput)
    if (rgb) setPickerValue(toHex(rgb.r, rgb.g, rgb.b))
  }

  const handleTextInput = (value: string) => {
    applyColor(parseColor(value), value)
  }

  const handlePicker = (hex: string) => {
    setPickerValue(hex)
    const rgb = hexToRgb(hex)
    setColor(rgb)
    setInput(hex)
  }

  const copy = (value: string, key: string) => {
    navigator.clipboard.writeText(value)
    setCopied(key)
    setTimeout(() => setCopied(null), 2000)
  }

  const hex = color ? toHex(color.r, color.g, color.b) : ""
  const hsl = color ? rgbToHsl(color.r, color.g, color.b) : null
  const oklch = color ? rgbToOklch(color.r, color.g, color.b) : null

  const formats = color ? [
    { label: "HEX", key: "hex", value: hex },
    { label: "RGB", key: "rgb", value: `rgb(${color.r}, ${color.g}, ${color.b})` },
    { label: "HSL", key: "hsl", value: `hsl(${hsl!.h}, ${hsl!.s}%, ${hsl!.l}%)` },
    { label: "OKLCH", key: "oklch", value: `oklch(${oklch!.l}% ${oklch!.c} ${oklch!.h})` },
  ] : []

  return (
    <div className="h-full flex flex-col bg-background">
      {/* Header */}
      <div className="shrink-0 border-b border-border bg-background">
        <div className="px-6 py-4">
          <h1 className="text-xl font-semibold">Color Converter</h1>
          <p className="text-sm text-muted-foreground">Convert between HEX, RGB, HSL, and OKLCH color formats</p>
        </div>
      </div>

      <div className="flex-1 flex flex-col md:flex-row overflow-y-auto md:overflow-hidden">
        {/* Left Panel — Input */}
        <div className="flex flex-col border-b md:border-b-0 md:border-r border-border md:w-1/2">
          <div className="p-3 border-b border-border bg-muted/30">
            <h3 className="text-sm font-medium">Color Input</h3>
          </div>
          <div className="p-6 space-y-6">
            <div className="flex items-start gap-4">
              <input
                type="color"
                value={pickerValue}
                onChange={(e) => handlePicker(e.target.value)}
                className="w-16 h-16 rounded-lg border border-border cursor-pointer p-1 bg-background shrink-0"
              />
              <div className="flex-1 space-y-1">
                <Input
                  value={input}
                  onChange={(e) => handleTextInput(e.target.value)}
                  placeholder="#3b82f6 or rgb(59,130,246) or hsl(217,91%,60%)"
                  className="font-mono text-sm"
                />
                <p className="text-xs text-muted-foreground">Accepts HEX, RGB, HSL</p>
              </div>
            </div>

            {color && (
              <div
                className="w-full h-40 rounded-xl border border-border shadow-inner transition-colors duration-200"
                style={{ backgroundColor: hex }}
              />
            )}

            {color && (
              <div className="rounded-lg border border-border p-4 space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">R</span><span className="font-mono">{color.r}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">G</span><span className="font-mono">{color.g}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">B</span><span className="font-mono">{color.b}</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Panel — Formats */}
        <div className="flex flex-col md:w-1/2 md:flex-1">
          <div className="p-3 border-b border-border bg-muted/30">
            <h3 className="text-sm font-medium">All Formats</h3>
          </div>
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            {formats.length === 0 ? (
              <div className="flex items-center justify-center h-full text-sm text-muted-foreground">
                Enter or pick a color to see all formats
              </div>
            ) : (
              formats.map(({ label, key, value }) => (
                <div key={key} className="rounded-lg border border-border overflow-hidden">
                  <div className="h-8" style={{ backgroundColor: value }} />
                  <div className="p-3 flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground mb-0.5">{label}</p>
                      <code className="text-sm font-mono">{value}</code>
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => copy(value, key)} className="shrink-0 h-7 text-xs">
                      {copied === key ? <Check className="h-3 w-3 mr-1" /> : <Copy className="h-3 w-3 mr-1" />}
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
  )
}
