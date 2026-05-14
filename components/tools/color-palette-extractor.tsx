"use client"

import { useState, useCallback, useEffect } from "react"
import { Upload, Copy, Check } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
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
  const [activeTab, setActiveTab] = useState<"input" | "output">("input")
  const [imageUrl, setImageUrl] = useState("")
  const [palette, setPalette] = useState<ColorSwatch[]>([])
  const [numColors, setNumColors] = useState(8)
  const [copied, setCopied] = useState<string | null>(null)
  const [colorFormat, setColorFormat] = useState<"hex" | "rgb" | "hsl">("hex")

  const handleFile = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !file.type.startsWith("image/")) {
      announceToScreenReader('Please select a valid image file')
      return
    }
    const url = URL.createObjectURL(file)
    setImageUrl(url)
    const img = new Image()
    img.onload = () => {
      const extracted = extractPalette(img, numColors)
      setPalette(extracted)
      announceToScreenReader(`Image uploaded. Extracted ${extracted.length} colors.`)
    }
    img.src = url
    e.target.value = ""
  }, [numColors])

  const reExtract = useCallback(() => {
    if (!imageUrl) return
    const img = new Image()
    img.onload = () => {
      const extracted = extractPalette(img, numColors)
      setPalette(extracted)
      announceToScreenReader(`Re-extracted ${extracted.length} colors`)
    }
    img.src = imageUrl
  }, [imageUrl, numColors])

  const changeNumColors = useCallback((n: number) => {
    setNumColors(n)
    if (imageUrl) {
      const img = new Image()
      img.onload = () => {
        const extracted = extractPalette(img, n)
        setPalette(extracted)
        announceToScreenReader(`Set to extract ${n} colors`)
      }
      img.src = imageUrl
    }
  }, [imageUrl])

  const changeFormat = useCallback((f: "hex" | "rgb" | "hsl") => {
    setColorFormat(f)
    announceToScreenReader(`Color format changed to ${f.toUpperCase()}`)
  }, [])

  const getLabel = useCallback((sw: ColorSwatch) => {
    if (colorFormat === "hex") return sw.hex
    if (colorFormat === "rgb") return `rgb(${sw.rgb.join(", ")})`
    const [h, s, l] = rgbToHsl(...sw.rgb)
    return `hsl(${h}, ${s}%, ${l}%)`
  }, [colorFormat])

  const copy = useCallback((value: string) => {
    navigator.clipboard.writeText(value)
    setCopied(value)
    announceToScreenReader(`Copied ${value}`)
    setTimeout(() => setCopied(null), 2000)
  }, [])

  const copyAll = useCallback(() => {
    const all = palette.map(sw => getLabel(sw)).join("\n")
    navigator.clipboard.writeText(all)
    setCopied('all')
    announceToScreenReader(`Copied all ${palette.length} colors to clipboard`)
    setTimeout(() => setCopied(null), 2000)
  }, [palette, getLabel])

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return

      // Ctrl+Shift+O to upload image
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === "o") {
        e.preventDefault()
        e.stopPropagation()
        const fileInput = document.getElementById('palette-image-upload') as HTMLInputElement
        fileInput?.click()
      }

      // Ctrl+Shift+C to copy all when palette exists
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === "c" && palette.length > 0) {
        e.preventDefault()
        e.stopPropagation()
        copyAll()
      }

      // Number keys to focus color count buttons (Tab to navigate, Enter to select)
      // Individual color copy with number keys would require palette to be visible
    }
    window.addEventListener("keydown", handleKeyDown, true)
    return () => window.removeEventListener("keydown", handleKeyDown, true)
  }, [palette.length, imageUrl, copyAll, changeNumColors])

  return (
    <div className="flex h-full flex-col">
      {/* Desktop top bar */}
      <div className="hidden md:flex shrink-0 items-center gap-2 border-b border-border bg-card/95 backdrop-blur-sm px-4 py-2">
        <span className="text-sm font-semibold shrink-0 mr-1">Color Palette Extractor</span>
        <div className="flex items-center gap-2" role="radiogroup" aria-label="Number of colors to extract">
          <Label className="text-xs text-muted-foreground" id="num-colors-label">Colors:</Label>
          {[5, 8, 10, 12].map(n => (
            <button
              key={n}
              onClick={() => changeNumColors(n)}
              className={`text-xs px-3 py-1 rounded-full border transition-colors focus:outline-none focus:ring-2 focus:ring-primary ${numColors === n ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground hover:border-primary/50"}`}
              role="radio"
              aria-checked={numColors === n}
              aria-label={`Extract ${n} colors`}
            >
              {n}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2 ml-2" role="radiogroup" aria-label="Color format">
          <Label className="text-xs text-muted-foreground" id="format-label">Format:</Label>
          {(["hex", "rgb", "hsl"] as const).map(f => (
            <button
              key={f}
              onClick={() => changeFormat(f)}
              className={`text-xs px-3 py-1 rounded-full border uppercase transition-colors focus:outline-none focus:ring-2 focus:ring-primary ${colorFormat === f ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground hover:border-primary/50"}`}
              role="radio"
              aria-checked={colorFormat === f}
              aria-label={f.toUpperCase()}
            >
              {f}
            </button>
          ))}
        </div>
        <div className="ml-auto flex items-center gap-1.5">
          <ShortcutsModal
            pageName="Color Palette Extractor"
            shortcuts={[
              { keys: ["Ctrl", "O"], description: "Upload or change image" },
              { keys: ["Ctrl", "C"], description: "Copy all colors" },
              { keys: ["?"], description: "Toggle this shortcuts panel" },
              { keys: ["Tab"], description: "Navigate between controls" },
              { keys: ["Enter"], description: "Activate focused button" },
              { keys: ["Space"], description: "Activate focused button" },
            ]}
          />
          {palette.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={copyAll}
              aria-label="Copy all colors"
            >
              {copied === 'all' ? <Check className="h-4 w-4 mr-1" aria-hidden="true" /> : <Copy className="h-4 w-4 mr-1" aria-hidden="true" />}
              Copy All<kbd className="ml-2 hidden md:inline rounded border border-border bg-muted px-1 text-[10px]" aria-hidden="true">Ctrl+Shift+C</kbd>
            </Button>
          )}
        </div>
      </div>

      {/* Mobile header */}
      <div className="flex md:hidden flex-col shrink-0 border-b border-border">
        <div className="flex items-center justify-between px-4 py-2">
          <span className="text-sm font-semibold">Color Palette Extractor</span>
          <ShortcutsModal
            pageName="Color Palette Extractor"
            shortcuts={[
              { keys: ["Ctrl", "O"], description: "Upload or change image" },
              { keys: ["Ctrl", "C"], description: "Copy all colors" },
              { keys: ["?"], description: "Toggle this shortcuts panel" },
              { keys: ["Tab"], description: "Navigate between controls" },
              { keys: ["Enter"], description: "Activate focused button" },
              { keys: ["Space"], description: "Activate focused button" },
            ]}
          />
        </div>
        <div className="flex border-t border-border">
          <button
            onClick={() => setActiveTab("input")}
            className={`flex-1 py-2 text-sm font-medium transition-colors ${activeTab === "input" ? "bg-background text-foreground" : "text-muted-foreground hover:text-foreground"}`}
          >
            Upload
          </button>
          <button
            onClick={() => setActiveTab("output")}
            className={`flex-1 py-2 text-sm font-medium transition-colors ${activeTab === "output" ? "bg-background text-foreground" : "text-muted-foreground hover:text-foreground"}`}
          >
            Palette
          </button>
        </div>
      </div>

      {/* Panels */}
      <div className="flex-1 min-h-0 flex flex-col md:flex-row overflow-hidden">
        {/* Left — Upload + preview */}
        <div className={`${activeTab === "input" ? "flex" : "hidden"} md:flex flex-col flex-1 min-h-0 overflow-hidden border-b md:border-b-0 md:border-r border-border bg-card`} role="region" aria-label="Image upload and preview">
          <div className="shrink-0 border-b border-border px-4 py-3">
            <span className="text-sm font-medium">Image</span>
          </div>
          {imageUrl ? (
            <div className="flex-1 flex flex-col p-4 gap-4 min-h-0">
              <img
                src={imageUrl}
                alt="Uploaded image for color extraction"
                className="flex-1 object-contain rounded-lg border border-border min-h-0"
              />
              <>
                <input
                  type="file"
                  id="palette-image-upload"
                  accept="image/*"
                  className="hidden"
                  onChange={handleFile}
                  aria-label="Change image"
                />
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full"
                  onClick={() => {
                    const fileInput = document.getElementById('palette-image-upload') as HTMLInputElement
                    fileInput?.click()
                  }}
                >
                  <Upload className="h-4 w-4 mr-1" aria-hidden="true" />Change Image<kbd className="ml-2 hidden md:inline rounded border border-border bg-muted px-1 text-[10px]" aria-hidden="true">Ctrl+O</kbd>
                </Button>
              </>
            </div>
          ) : (
            <div
              className="flex-1 flex flex-col items-center justify-center cursor-pointer border-2 border-dashed border-border m-4 rounded-xl hover:border-primary/50 transition-colors focus:outline-none focus:ring-2 focus:ring-primary"
              onClick={() => {
                const fileInput = document.getElementById('palette-image-upload') as HTMLInputElement
                fileInput?.click()
              }}
              role="button"
              tabIndex={0}
              aria-label="Upload an image"
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  const fileInput = document.getElementById('palette-image-upload') as HTMLInputElement
                  fileInput?.click()
                }
              }}
            >
              <input
                type="file"
                id="palette-image-upload"
                accept="image/*"
                className="hidden"
                onChange={handleFile}
                aria-label="Upload image file"
              />
              <Upload className="h-10 w-10 text-muted-foreground/40 mb-3" aria-hidden="true" />
              <p className="text-sm font-medium">Click to upload an image</p>
              <p className="text-xs text-muted-foreground mt-1">JPG, PNG, WebP, GIF · <kbd className="rounded border border-border bg-muted px-1 text-[10px]" aria-hidden="true">Ctrl+O</kbd></p>
              <span className="sr-only">Press Control plus O to browse for images</span>
            </div>
          )}
        </div>

        {/* Right — Palette */}
        <div className={`${activeTab === "output" ? "flex" : "hidden"} md:flex flex-col flex-1 min-h-0 overflow-hidden bg-card`} role="region" aria-label="Extracted color palette">
          <div className="shrink-0 border-b border-border px-4 py-3">
            <span className="text-sm font-medium">Extracted Palette {palette.length > 0 && <span className="text-muted-foreground font-normal">({palette.length} colors)</span>}</span>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-2" role="list" aria-label="Color palette list">
            {palette.length === 0 ? (
              <div className="flex items-center justify-center h-full text-sm text-muted-foreground" role="note">
                Upload an image to extract colors
              </div>
            ) : (
              palette.map((sw, index) => {
                const label = getLabel(sw)
                return (
                  <div
                    key={sw.hex}
                    className="flex items-center gap-3 rounded-lg border border-border p-3"
                    role="listitem"
                  >
                    <div
                      className="w-12 h-12 rounded-md border border-border/50 shrink-0"
                      style={{ backgroundColor: sw.hex }}
                      aria-label={`Color ${index + 1}: ${label}`}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-mono" aria-live="polite">{label}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden" aria-hidden="true">
                          <div className="h-full rounded-full bg-primary/40" style={{ width: `${Math.max(sw.pct, 2)}%` }} />
                        </div>
                        <span className="text-xs text-muted-foreground shrink-0">{sw.pct}% of image</span>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="shrink-0 h-8 w-8 p-0"
                      onClick={() => copy(label)}
                      aria-label={`Copy ${label}`}
                    >
                      {copied === label ? <Check className="h-3 w-3" aria-hidden="true" /> : <Copy className="h-3 w-3" aria-hidden="true" />}
                      <span className="sr-only">{copied === label ? 'Copied!' : 'Copy'}</span>
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
