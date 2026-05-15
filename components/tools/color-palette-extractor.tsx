"use client"

import { useState, useCallback, useEffect } from "react"
import { Upload, Copy, Check } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
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

interface ColorSwatch { hex: string; rgb: [number, number, number]; count: number; pct: number }

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

const CB_MODES: [CBMode, string][] = [
  ["none", "Normal"],
  ["deuteranopia", "Deuter."],
  ["protanopia", "Protan."],
  ["tritanopia", "Tritan."],
]

const FORMAT_SHORTCUTS: Record<"hex" | "rgb" | "hsl", string> = { hex: "1", rgb: "2", hsl: "3" }

export default function ColorPaletteExtractor() {
  const [activeTab, setActiveTab] = useState<"input" | "output">("input")
  const [imageUrl, setImageUrl] = useState("")
  const [palette, setPalette] = useState<ColorSwatch[]>([])
  const [numColors, setNumColors] = useState(8)
  const [copied, setCopied] = useState<string | null>(null)
  const [colorFormat, setColorFormat] = useState<"hex" | "rgb" | "hsl">("hex")
  const [cbMode, setCbMode] = useState<CBMode>("none")

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
      setActiveTab("output")
      announceToScreenReader(`Image uploaded. Extracted ${extracted.length} colors.`)
    }
    img.src = url
    e.target.value = ""
  }, [numColors])

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
    announceToScreenReader(`Color format: ${f.toUpperCase()}`)
  }, [])

  const changeCbMode = useCallback((mode: CBMode) => {
    setCbMode(mode)
    announceToScreenReader(mode === "none" ? "Normal color vision" : `Color vision simulation: ${mode}`)
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
    if (palette.length === 0) return
    const all = palette.map(sw => getLabel(sw)).join("\n")
    navigator.clipboard.writeText(all)
    setCopied('all')
    announceToScreenReader(`Copied all ${palette.length} colors to clipboard`)
    setTimeout(() => setCopied(null), 2000)
  }, [palette, getLabel])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        if (!(e.ctrlKey || e.metaKey)) return
      }

      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === "u") {
        e.preventDefault()
        const fileInput = document.getElementById('palette-image-upload') as HTMLInputElement
        fileInput?.click()
      }

      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === "v" && palette.length > 0) {
        e.preventDefault()
        copyAll()
      }

      // 1/2/3 — switch color format (bare keys, no modifier)
      if (!e.ctrlKey && !e.metaKey && !e.altKey && !e.shiftKey) {
        if (e.key === "1") { e.preventDefault(); changeFormat("hex") }
        if (e.key === "2") { e.preventDefault(); changeFormat("rgb") }
        if (e.key === "3") { e.preventDefault(); changeFormat("hsl") }
      }
    }
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [palette.length, copyAll, changeFormat])

  return (
    <div className="flex flex-1 flex-col min-h-0">

      {/* Desktop top bar */}
      <div className="hidden md:flex shrink-0 items-center gap-2 border-b border-border bg-card/95 backdrop-blur-sm px-4 py-2">
        <span className="text-sm font-semibold shrink-0 mr-1">Color Palette Extractor</span>

        {/* Colors count radiogroup */}
        <div className="flex items-center gap-2" role="radiogroup" aria-label="Number of colors to extract">
          <Label className="text-xs text-muted-foreground shrink-0">
            Colors
            <span className="ml-1 hidden md:inline-flex items-center gap-0.5" aria-hidden="true">
              <kbd className="rounded border border-border bg-muted px-1 text-[10px]">Tab</kbd>
              <kbd className="rounded border border-border bg-muted px-1 text-[10px]">← →</kbd>
            </span>
          </Label>
          {[5, 8, 10, 12].map(n => (
            <button
              key={n}
              onClick={() => changeNumColors(n)}
              className={`text-xs px-2.5 py-1 rounded-full border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${numColors === n ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground hover:border-primary/50"}`}
              role="radio"
              aria-checked={numColors === n}
              aria-label={`Extract ${n} colors`}
            >
              {n}
            </button>
          ))}
        </div>

        {/* Format radiogroup */}
        <div className="flex items-center gap-2 ml-2" role="radiogroup" aria-label="Color format">
          <Label className="text-xs text-muted-foreground shrink-0">Format:</Label>
          {(["hex", "rgb", "hsl"] as const).map(f => (
            <button
              key={f}
              onClick={() => changeFormat(f)}
              className={`text-xs px-2.5 py-1 rounded-full border uppercase transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${colorFormat === f ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground hover:border-primary/50"}`}
              role="radio"
              aria-checked={colorFormat === f}
              aria-label={`${f.toUpperCase()} format (press ${FORMAT_SHORTCUTS[f]})`}
            >
              {f}
              <kbd className={`ml-1 hidden md:inline rounded border px-1 text-[10px] ${colorFormat === f ? "border-primary-foreground/30 bg-primary-foreground/20" : "border-border bg-muted"}`} aria-hidden="true">
                {FORMAT_SHORTCUTS[f]}
              </kbd>
            </button>
          ))}
        </div>

        <div className="ml-auto flex items-center gap-1.5">
          <ShortcutsModal
            pageName="Color Palette Extractor"
            shortcuts={[
              { keys: ["Ctrl", "Shift", "U"], description: "Upload or change image" },
              { keys: ["Ctrl", "Shift", "V"], description: "Copy all colors" },
              { keys: ["1"], description: "Switch to HEX format" },
              { keys: ["2"], description: "Switch to RGB format" },
              { keys: ["3"], description: "Switch to HSL format" },
              { keys: ["?"], description: "Toggle this shortcuts panel" },
              { keys: ["Tab"], description: "Navigate between controls" },
              { keys: ["Tab", "← →"], description: "Change color count" },
            ]}
          />
          {palette.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={copyAll}
              aria-label="Copy all colors (Ctrl+Shift+V)"
            >
              {copied === 'all' ? <Check className="h-4 w-4 mr-1" aria-hidden="true" /> : <Copy className="h-4 w-4 mr-1" aria-hidden="true" />}
              {copied === 'all' ? 'Copied!' : 'Copy All'}
              <kbd className="ml-1 hidden md:inline rounded border border-border bg-muted px-1 text-[10px]" aria-hidden="true">Ctrl+Shift+V</kbd>
            </Button>
          )}
        </div>
      </div>

      {/* Mobile header */}
      <div className="flex md:hidden flex-col shrink-0 border-b border-border">
        <div className="flex items-center justify-between px-4 pt-3 pb-2">
          <h2 className="text-base font-semibold">Color Palette Extractor</h2>
          <ShortcutsModal
            pageName="Color Palette Extractor"
            shortcuts={[
              { keys: ["Ctrl", "Shift", "U"], description: "Upload or change image" },
              { keys: ["Ctrl", "Shift", "V"], description: "Copy all colors" },
              { keys: ["1 / 2 / 3"], description: "Switch HEX / RGB / HSL" },
            ]}
          />
        </div>
        <div className="flex" role="tablist" aria-label="Panel selection">
          <button
            role="tab"
            aria-selected={activeTab === "input"}
            onClick={() => setActiveTab("input")}
            className={`flex-1 py-2.5 text-sm font-medium border-b-2 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-inset ${activeTab === "input" ? "border-primary text-foreground" : "border-transparent text-muted-foreground"}`}
          >
            Upload
          </button>
          <button
            role="tab"
            aria-selected={activeTab === "output"}
            onClick={() => setActiveTab("output")}
            className={`flex-1 py-2.5 text-sm font-medium border-b-2 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-inset ${activeTab === "output" ? "border-primary text-foreground" : "border-transparent text-muted-foreground"}`}
          >
            Palette
          </button>
        </div>
      </div>

      {/* Scrollable content area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">

        {/* Panels card */}
        <div className="rounded-xl border border-border overflow-hidden">
          <div className="flex flex-col md:flex-row min-h-[500px]">

            {/* Left panel — Upload / Preview */}
            <div className={`${activeTab === "input" ? "flex" : "hidden"} md:flex flex-col flex-1 border-b md:border-b-0 md:border-r border-border bg-card`} role="region" aria-label="Image upload and preview">
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
                    className="w-full shrink-0"
                    onClick={() => {
                      const fileInput = document.getElementById('palette-image-upload') as HTMLInputElement
                      fileInput?.click()
                    }}
                    aria-label="Change image (Ctrl+Shift+U)"
                  >
                    <Upload className="h-4 w-4 mr-1" aria-hidden="true" />
                    Change Image
                    <kbd className="ml-2 hidden md:inline rounded border border-border bg-muted px-1 text-[10px]" aria-hidden="true">Ctrl+Shift+U</kbd>
                  </Button>
                </div>
              ) : (
                <div className="flex-1 p-4">
                  <input
                    type="file"
                    id="palette-image-upload"
                    accept="image/*"
                    className="hidden"
                    onChange={handleFile}
                    aria-label="Upload image file"
                  />
                  <div
                    className="h-full flex flex-col items-center justify-center cursor-pointer border-2 border-dashed border-border rounded-xl hover:border-primary/50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
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
                    <Upload className="h-10 w-10 text-muted-foreground/40 mb-3" aria-hidden="true" />
                    <p className="text-sm font-medium">Click to upload an image</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      JPG, PNG, WebP, GIF
                      <kbd className="ml-1 hidden md:inline rounded border border-border bg-muted px-1 text-[10px]" aria-hidden="true">Ctrl+Shift+U</kbd>
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Right panel — Palette */}
            <div className={`${activeTab === "output" ? "flex" : "hidden"} md:flex flex-col flex-1 bg-card`} role="region" aria-label="Extracted color palette">
              <div className="shrink-0 border-b border-border px-4 py-3 flex items-center justify-between gap-2 flex-wrap">
                <span className="text-sm font-medium shrink-0">
                  Extracted Palette
                  {palette.length > 0 && <span className="text-muted-foreground font-normal ml-1">({palette.length} colors)</span>}
                </span>
                {/* Color blindness simulation */}
                <div className="flex items-center gap-0.5" role="radiogroup" aria-label="Color vision simulation">
                  {CB_MODES.map(([mode, label]) => (
                    <button
                      key={mode}
                      onClick={() => changeCbMode(mode)}
                      className={`rounded px-1.5 py-0.5 text-[10px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${cbMode === mode ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground hover:bg-muted"}`}
                      role="radio"
                      aria-checked={cbMode === mode}
                      aria-label={`${label} color vision`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex-1 overflow-y-auto p-4 space-y-2" role="list" aria-label="Color palette list">
                {palette.length === 0 ? (
                  <div className="flex items-center justify-center h-full text-sm text-muted-foreground" role="note">
                    Upload an image to extract colors
                  </div>
                ) : (
                  palette.map((sw, index) => {
                    const label = getLabel(sw)
                    const displayColor = simulateColorBlindness(sw.hex, cbMode)
                    return (
                      <div
                        key={sw.hex}
                        className="flex items-center gap-3 rounded-lg border border-border p-3"
                        role="listitem"
                      >
                        <div
                          className="w-12 h-12 rounded-md border border-border/50 shrink-0 transition-colors"
                          style={{ backgroundColor: displayColor }}
                          role="img"
                          aria-label={`Color ${index + 1}: ${label}${cbMode !== "none" ? ` (${cbMode} simulation)` : ""}`}
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-mono" aria-live="polite">{label}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden" aria-hidden="true">
                              <div
                                className="h-full rounded-full opacity-70 transition-colors"
                                style={{ width: `${Math.max(sw.pct, 2)}%`, backgroundColor: displayColor }}
                              />
                            </div>
                            <span className="text-xs text-muted-foreground shrink-0">{sw.pct}%</span>
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

        {/* Usage guide */}
        <div className="rounded-xl border border-border bg-card p-4 space-y-4">
          <div className="space-y-1.5">
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">How to use</p>
            <ol className="space-y-1.5 text-xs text-muted-foreground list-decimal list-inside">
              <li>Click the upload area or press <kbd className="rounded border border-border bg-muted px-1 text-[10px]">Ctrl+Shift+U</kbd> to select an image.</li>
              <li>The tool extracts the most dominant colors automatically and shows them in the right panel.</li>
              <li>Use the <span className="text-foreground font-medium">Colors</span> buttons in the toolbar to choose how many colors to extract (5, 8, 10, or 12).</li>
              <li>Press <kbd className="rounded border border-border bg-muted px-1 text-[10px]">1</kbd> <kbd className="rounded border border-border bg-muted px-1 text-[10px]">2</kbd> <kbd className="rounded border border-border bg-muted px-1 text-[10px]">3</kbd> or use the Format buttons to switch between HEX, RGB, and HSL.</li>
              <li>Click <span className="text-foreground font-medium">Copy</span> next to any color, or press <kbd className="rounded border border-border bg-muted px-1 text-[10px]">Ctrl+Shift+V</kbd> to copy all colors at once.</li>
            </ol>
          </div>
          <div className="space-y-1.5">
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">Color vision simulation</p>
            <p className="text-xs text-muted-foreground">Use the <span className="text-foreground font-medium">Normal / Deuter. / Protan. / Tritan.</span> buttons in the Palette panel header to preview how your extracted palette appears to people with different types of color vision. Both the swatch and the proportion bar update live. Copied values are always the original color.</p>
            <ul className="space-y-1 text-xs text-muted-foreground list-disc list-inside mt-1">
              <li><span className="text-foreground font-medium">Deuteranopia</span> — reduced green sensitivity. The most common form, affecting about 6% of men. Red and green appear similar in hue.</li>
              <li><span className="text-foreground font-medium">Protanopia</span> — reduced red sensitivity. Affects about 1% of men. Reds appear very dark and can be confused with black or dark brown.</li>
              <li><span className="text-foreground font-medium">Tritanopia</span> — reduced blue sensitivity. Much rarer, under 0.01% of people. Blue and green appear similar; yellow and violet may look alike.</li>
            </ul>
          </div>
          <div className="space-y-1.5">
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">Keyboard shortcuts</p>
            <ul className="space-y-1 text-xs text-muted-foreground list-disc list-inside">
              <li><kbd className="rounded border border-border bg-muted px-1 text-[10px]">Ctrl+Shift+U</kbd> Upload or change image</li>
              <li><kbd className="rounded border border-border bg-muted px-1 text-[10px]">Ctrl+Shift+V</kbd> Copy all colors</li>
              <li><kbd className="rounded border border-border bg-muted px-1 text-[10px]">1</kbd> <kbd className="rounded border border-border bg-muted px-1 text-[10px]">2</kbd> <kbd className="rounded border border-border bg-muted px-1 text-[10px]">3</kbd> Switch HEX / RGB / HSL format</li>
              <li><kbd className="rounded border border-border bg-muted px-1 text-[10px]">?</kbd> Open shortcuts reference</li>
            </ul>
          </div>
          <div className="space-y-1.5">
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">Tips</p>
            <ul className="space-y-1 text-xs text-muted-foreground list-disc list-inside">
              <li>Images are downsampled to 200px before analysis for fast, in-browser processing.</li>
              <li>Transparent pixels (alpha below 50%) are ignored, so PNG images with transparency extract only visible colors.</li>
              <li>The bar next to each color shows how much of the image area that color covers.</li>
              <li>Everything runs in your browser. Nothing is sent to a server.</li>
            </ul>
          </div>
        </div>

        <div className="md:hidden h-[60px]" aria-hidden="true" />

      </div>

      {/* Mobile bottom action bar */}
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
          disabled={palette.length === 0}
          aria-label="Copy all colors"
        >
          {copied === 'all' ? <Check className="h-4 w-4 mr-1.5" aria-hidden="true" /> : <Copy className="h-4 w-4 mr-1.5" aria-hidden="true" />}
          {copied === 'all' ? 'Copied!' : 'Copy All'}
        </Button>
      </div>

    </div>
  )
}
