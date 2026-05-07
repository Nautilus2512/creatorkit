"use client"

import { useState } from "react"
import { Upload, Copy, Check } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"

interface ColorSwatch { hex: string; rgb: [number, number, number]; count: number; pct: number }

function toHex(r: number, g: number, b: number) {
  return `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${b.toString(16).padStart(2, "0")}`
}

function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
  r /= 255; g /= 255; b /= 255
  const max = Math.max(r, g, b), min = Math.min(r, g, b)
  let h = 0, s = 0; const l = (max + min) / 2
  if (max !== min) {
    const d = max - min
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break
      case g: h = ((b - r) / d + 2) / 6; break
      case b: h = ((r - g) / d + 4) / 6; break
    }
  }
  return [Math.round(h * 360), Math.round(s * 100), Math.round(l * 100)]
}

function quantize(r: number, g: number, b: number, q = 32) {
  return `${Math.round(r / q) * q},${Math.round(g / q) * q},${Math.round(b / q) * q}`
}

function extractPalette(img: HTMLImageElement, numColors = 10): ColorSwatch[] {
  const canvas = document.createElement("canvas")
  const maxDim = 200
  const scale = Math.min(1, maxDim / Math.max(img.width, img.height))
  canvas.width = Math.round(img.width * scale)
  canvas.height = Math.round(img.height * scale)
  const ctx = canvas.getContext("2d")!
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
  const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data

  const counts = new Map<string, { r: number; g: number; b: number; count: number }>()
  for (let i = 0; i < data.length; i += 4) {
    const a = data[i + 3]
    if (a < 128) continue
    const r = data[i], g = data[i + 1], b = data[i + 2]
    const key = quantize(r, g, b)
    const existing = counts.get(key)
    if (existing) existing.count++
    else counts.set(key, { r, g, b, count: 1 })
  }

  const total = Array.from(counts.values()).reduce((s, v) => s + v.count, 0)
  return Array.from(counts.values())
    .sort((a, b) => b.count - a.count)
    .slice(0, numColors)
    .map(({ r, g, b, count }) => ({
      hex: toHex(r, g, b),
      rgb: [r, g, b] as [number, number, number],
      count,
      pct: Math.round((count / total) * 100),
    }))
}

export default function ColorPaletteExtractor() {
  const [imageUrl, setImageUrl] = useState("")
  const [palette, setPalette] = useState<ColorSwatch[]>([])
  const [numColors, setNumColors] = useState(8)
  const [copied, setCopied] = useState<string | null>(null)
  const [colorFormat, setColorFormat] = useState<"hex" | "rgb" | "hsl">("hex")

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !file.type.startsWith("image/")) return
    const url = URL.createObjectURL(file)
    setImageUrl(url)
    const img = new Image()
    img.onload = () => { setPalette(extractPalette(img, numColors)) }
    img.src = url
    e.target.value = ""
  }

  const reExtract = () => {
    if (!imageUrl) return
    const img = new Image()
    img.onload = () => setPalette(extractPalette(img, numColors))
    img.src = imageUrl
  }

  const getLabel = (sw: ColorSwatch) => {
    if (colorFormat === "hex") return sw.hex
    if (colorFormat === "rgb") return `rgb(${sw.rgb.join(", ")})`
    const [h, s, l] = rgbToHsl(...sw.rgb)
    return `hsl(${h}, ${s}%, ${l}%)`
  }

  const copy = (value: string) => {
    navigator.clipboard.writeText(value)
    setCopied(value)
    setTimeout(() => setCopied(null), 2000)
  }

  const copyAll = () => {
    const all = palette.map(sw => getLabel(sw)).join("\n")
    copy(all)
  }

  return (
    <div className="h-screen flex flex-col bg-background">
      <div className="shrink-0 border-b border-border bg-background">
        <div className="flex items-center justify-between px-6 py-4">
          <div>
            <h1 className="text-xl font-semibold">Color Palette Extractor</h1>
            <p className="text-sm text-muted-foreground">Extract dominant colors from any image. Runs entirely in your browser.</p>
          </div>
          {palette.length > 0 && (
            <Button variant="outline" size="sm" onClick={copyAll}>
              {copied ? <Check className="h-4 w-4 mr-1" /> : <Copy className="h-4 w-4 mr-1" />}
              Copy All
            </Button>
          )}
        </div>
      </div>

      {/* Options */}
      <div className="shrink-0 border-b border-border bg-muted/30 px-6 py-2 flex flex-wrap items-center gap-6">
        <div className="flex items-center gap-2">
          <Label className="text-xs text-muted-foreground">Colors:</Label>
          {[5, 8, 10, 12].map(n => (
            <button key={n} onClick={() => { setNumColors(n); if (imageUrl) { const img = new Image(); img.onload = () => setPalette(extractPalette(img, n)); img.src = imageUrl } }}
              className={`text-xs px-3 py-1 rounded-full border transition-colors ${numColors === n ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground hover:border-primary/50"}`}>
              {n}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <Label className="text-xs text-muted-foreground">Format:</Label>
          {(["hex", "rgb", "hsl"] as const).map(f => (
            <button key={f} onClick={() => setColorFormat(f)}
              className={`text-xs px-3 py-1 rounded-full border uppercase transition-colors ${colorFormat === f ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground hover:border-primary/50"}`}>
              {f}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Left — Upload + preview */}
        <div className="w-1/2 flex flex-col border-r border-border">
          <div className="p-3 border-b border-border bg-muted/30">
            <h3 className="text-sm font-medium">Image</h3>
          </div>
          {imageUrl ? (
            <div className="flex-1 flex flex-col p-4 gap-4 min-h-0">
              <img src={imageUrl} alt="Uploaded" className="flex-1 object-contain rounded-lg border border-border min-h-0" />
              <label className="cursor-pointer">
                <input type="file" accept="image/*" className="hidden" onChange={handleFile} />
                <Button variant="outline" size="sm" className="w-full" asChild>
                  <span><Upload className="h-4 w-4 mr-1" />Change Image</span>
                </Button>
              </label>
            </div>
          ) : (
            <label className="flex-1 flex flex-col items-center justify-center cursor-pointer border-2 border-dashed border-border m-4 rounded-xl hover:border-primary/50 transition-colors">
              <input type="file" accept="image/*" className="hidden" onChange={handleFile} />
              <Upload className="h-10 w-10 text-muted-foreground/40 mb-3" />
              <p className="text-sm font-medium">Click to upload an image</p>
              <p className="text-xs text-muted-foreground mt-1">JPG, PNG, WebP, GIF</p>
            </label>
          )}
        </div>

        {/* Right — Palette */}
        <div className="w-1/2 flex flex-col">
          <div className="p-3 border-b border-border bg-muted/30">
            <h3 className="text-sm font-medium">Extracted Palette</h3>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-2">
            {palette.length === 0 ? (
              <div className="flex items-center justify-center h-full text-sm text-muted-foreground">
                Upload an image to extract colors
              </div>
            ) : (
              palette.map((sw) => {
                const label = getLabel(sw)
                return (
                  <div key={sw.hex} className="flex items-center gap-3 rounded-lg border border-border p-3">
                    <div className="w-12 h-12 rounded-md border border-border/50 shrink-0" style={{ backgroundColor: sw.hex }} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-mono">{label}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
                          <div className="h-full rounded-full bg-primary/40" style={{ width: `${Math.max(sw.pct, 2)}%` }} />
                        </div>
                        <span className="text-xs text-muted-foreground shrink-0">{sw.pct}%</span>
                      </div>
                    </div>
                    <Button variant="ghost" size="sm" className="shrink-0 h-8 w-8 p-0" onClick={() => copy(label)}>
                      {copied === label ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                    </Button>
                  </div>
                )
              })
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
