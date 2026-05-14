"use client"

import { useState, useRef, useCallback, useEffect } from "react"
import { Download, Check, Upload, Type } from "lucide-react"
import JSZip from "jszip"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Slider } from "@/components/ui/slider"
import { ShortcutsModal } from "@/components/shortcuts-modal"

type Mode = "image" | "text"

const SIZES = [16, 32, 48, 180, 192, 512]
const SIZE_NAMES: Record<number, string> = {
  16: "favicon-16x16.png",
  32: "favicon-32x32.png",
  48: "favicon.ico",
  180: "apple-touch-icon.png",
  192: "android-chrome-192x192.png",
  512: "android-chrome-512x512.png",
}

const SIZE_LABELS: Record<number, string> = {
  16:  "16×16 — browser tab",
  32:  "32×32 — browser tab HD",
  48:  "48×48 — favicon.ico",
  180: "180×180 — Apple touch icon",
  192: "192×192 — Android chrome",
  512: "512×512 — PWA splash screen",
}


const MANIFEST = (name: string) => JSON.stringify({
  name,
  short_name: name,
  icons: [
    { src: "/android-chrome-192x192.png", sizes: "192x192", type: "image/png" },
    { src: "/android-chrome-512x512.png", sizes: "512x512", type: "image/png" },
  ],
  theme_color: "#ffffff",
  background_color: "#ffffff",
  display: "standalone",
}, null, 2)

function resizeCanvas(source: HTMLCanvasElement, size: number): HTMLCanvasElement {
  const canvas = document.createElement("canvas")
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext("2d")!
  ctx.imageSmoothingEnabled = true
  ctx.imageSmoothingQuality = "high"
  ctx.drawImage(source, 0, 0, size, size)
  return canvas
}

function canvasToBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error("Failed")), "image/png")
  })
}

export function FaviconGenerator() {
  const [mode, setMode] = useState<Mode>("image")
  const [sourceCanvas, setSourceCanvas] = useState<HTMLCanvasElement | null>(null)
  const [previews, setPreviews] = useState<Record<number, string>>({})
  const [text, setText] = useState("")
  const [bgColor, setBgColor] = useState("#3b82f6")
  const [textColor, setTextColor] = useState("#ffffff")
  const [fontSize, setFontSize] = useState(52)
  const [siteName, setSiteName] = useState("My App")
  const [downloaded, setDownloaded] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [selectedSizes, setSelectedSizes] = useState<Set<number>>(new Set(SIZES))
  const [includeManifest, setIncludeManifest] = useState(true)
  const uploadRef = useRef<HTMLInputElement>(null)

  const buildFromCanvas = useCallback((canvas: HTMLCanvasElement) => {
    setSourceCanvas(canvas)
    const newPreviews: Record<number, string> = {}
    SIZES.forEach(size => {
      newPreviews[size] = resizeCanvas(canvas, size).toDataURL("image/png")
    })
    setPreviews(newPreviews)
  }, [])

  const handleImageUpload = (file: File) => {
    const img = new Image()
    const url = URL.createObjectURL(file)
    img.onload = () => {
      const canvas = document.createElement("canvas")
      const size = Math.max(img.width, img.height)
      canvas.width = size
      canvas.height = size
      const ctx = canvas.getContext("2d")!
      ctx.fillStyle = "#ffffff"
      ctx.fillRect(0, 0, size, size)
      const x = (size - img.width) / 2
      const y = (size - img.height) / 2
      ctx.drawImage(img, x, y)
      URL.revokeObjectURL(url)
      buildFromCanvas(canvas)
    }
    img.src = url
  }

  const buildFromText = useCallback(() => {
    if (!text.trim()) return
    const canvas = document.createElement("canvas")
    canvas.width = 512
    canvas.height = 512
    const ctx = canvas.getContext("2d")!
    ctx.fillStyle = bgColor
    ctx.fillRect(0, 0, 512, 512)
    ctx.fillStyle = textColor
    ctx.font = `bold ${fontSize * 5}px system-ui, sans-serif`
    ctx.textAlign = "center"
    ctx.textBaseline = "middle"
    ctx.fillText(text.slice(0, 3), 256, 256)
    buildFromCanvas(canvas)
  }, [text, bgColor, textColor, fontSize, buildFromCanvas])

  const toggleSize = (size: number) => {
    setSelectedSizes(prev => {
      const next = new Set(prev)
      if (next.has(size)) {
        if (next.size === 1) return prev
        next.delete(size)
      } else {
        next.add(size)
      }
      return next
    })
  }

  useEffect(() => {
    if (mode === "text" && text.trim()) buildFromText()
  }, [text, bgColor, textColor, fontSize, mode, buildFromText])

  const downloadAll = useCallback(async () => {
    if (!sourceCanvas) return
    setIsProcessing(true)
    const zip = new JSZip()
    for (const size of SIZES) {
      if (!selectedSizes.has(size)) continue
      const canvas = resizeCanvas(sourceCanvas, size)
      const blob = await canvasToBlob(canvas)
      zip.file(SIZE_NAMES[size], blob)
    }
    if (includeManifest) zip.file("site.webmanifest", MANIFEST(siteName))
    const blob = await zip.generateAsync({ type: "blob" })
    const a = document.createElement("a")
    a.href = URL.createObjectURL(blob)
    a.download = "favicons.zip"
    a.click()
    setIsProcessing(false)
    setDownloaded(true)
    setTimeout(() => setDownloaded(false), 2000)
  }, [sourceCanvas, siteName, selectedSizes, includeManifest])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const ctrl = e.ctrlKey || e.metaKey
      if (ctrl && e.shiftKey && (e.key === "D" || e.key === "d")) {
        e.preventDefault(); downloadAll()
      }
      if (ctrl && e.shiftKey && (e.key === "O" || e.key === "o")) {
        e.preventDefault(); uploadRef.current?.click()
      }
    }
    window.addEventListener("keydown", handler)
    return () => window.removeEventListener("keydown", handler)
  }, [downloadAll])

  const hasPreviews = Object.keys(previews).length > 0

  const [activeTab, setActiveTab] = useState<"input" | "output">("input")

  return (
    <>
    <div className="flex h-full flex-col">

      {/* Desktop top action bar */}
      <div className="hidden md:flex shrink-0 items-center gap-2 border-b border-border bg-card/95 backdrop-blur-sm px-4 py-2">
        <span className="text-sm font-semibold shrink-0 mr-1">Favicon Generator</span>
        <div className="ml-auto flex items-center gap-1.5">
          <ShortcutsModal
            pageName="Favicon Generator"
            shortcuts={[
              { keys: ["Ctrl", "O"], description: "Upload image" },
              { keys: ["Ctrl", "D"], description: "Download favicons.zip" },
              { keys: ["1"], description: "Switch to image mode" },
              { keys: ["2"], description: "Switch to text mode" },
              { keys: ["?"], description: "Toggle this panel" },
            ]}
          />
          <Button
            size="sm"
            onClick={downloadAll}
            disabled={!hasPreviews || isProcessing}
            aria-label={hasPreviews ? "Download favicons as ZIP" : "No favicons to download"}
          >
            {downloaded ? <Check className="mr-2 h-4 w-4" aria-hidden="true" /> : <Download className="mr-2 h-4 w-4" aria-hidden="true" />}
            {downloaded ? "Downloaded!" : "Download"}
          </Button>
        </div>
      </div>

      {/* Mobile: compact header + tab switcher */}
      <div className="flex md:hidden flex-col shrink-0 border-b border-border">
        <div className="flex items-center justify-between px-4 pt-3 pb-1">
          <h2 className="text-base font-semibold">Favicon Generator</h2>
          <ShortcutsModal
            pageName="Favicon Generator"
            shortcuts={[
              { keys: ["Ctrl", "O"], description: "Upload image" },
              { keys: ["Ctrl", "D"], description: "Download favicons.zip" },
              { keys: ["1"], description: "Switch to image mode" },
              { keys: ["2"], description: "Switch to text mode" },
              { keys: ["?"], description: "Toggle this panel" },
            ]}
          />
        </div>
        <div className="flex" role="tablist">
          <button role="tab" aria-selected={activeTab === "input"} onClick={() => setActiveTab("input")}
            className={`flex-1 py-2.5 text-sm font-medium border-b-2 transition-colors ${activeTab === "input" ? "border-primary text-foreground" : "border-transparent text-muted-foreground"}`}>
            Upload
          </button>
          <button role="tab" aria-selected={activeTab === "output"} onClick={() => setActiveTab("output")}
            className={`flex-1 py-2.5 text-sm font-medium border-b-2 transition-colors ${activeTab === "output" ? "border-primary text-foreground" : "border-transparent text-muted-foreground"}`}>
            Preview
          </button>
        </div>
      </div>

      <div className="flex-1 min-h-0 flex flex-col md:flex-row overflow-hidden">
      {/* Left panel */}
      <div className={`${activeTab === "input" ? "flex" : "hidden"} md:flex flex-col flex-1 min-h-0 overflow-hidden border-b md:border-b-0 md:border-r border-border bg-card`}>
        <div className="shrink-0 border-b border-border px-4 py-3">
          <span className="text-sm font-medium">Upload & Settings</span>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-6">

          {/* Mode toggle */}
          <div className="space-y-2" role="radiogroup" aria-label="Generation mode">
            <Label className="text-sm font-medium">Source</Label>
            <div className="grid grid-cols-2 gap-2">
              {(["image", "text"] as Mode[]).map((m, idx) => (
                <button
                  key={m}
                  onClick={() => { setMode(m); setPreviews({}); setSourceCanvas(null) }}
                  className={`flex items-center justify-center gap-2 rounded-md border px-3 py-2 text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-primary ${
                    mode === m
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border bg-muted/30 text-muted-foreground hover:border-primary/50 hover:text-foreground"
                  }`}
                  role="radio"
                  aria-checked={mode === m}
                  aria-label={m === "image" ? "Upload image mode" : "Text or emoji mode"}
                >
                  {m === "image" ? <Upload className="h-3.5 w-3.5" /> : <Type className="h-3.5 w-3.5" />}
                  {m === "image" ? "Upload Image" : "Text / Emoji"}
                  <kbd className="ml-1 text-[9px] opacity-50" aria-hidden="true">{idx + 1}</kbd>
                </button>
              ))}
            </div>
          </div>

          {mode === "image" && (
            <div className="space-y-2">
              <Label htmlFor="favicon-upload" className="text-sm font-medium">Image</Label>
              <div
                onClick={() => uploadRef.current?.click()}
                className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-border p-8 text-sm text-muted-foreground transition-colors hover:border-primary/50 hover:text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                role="button"
                aria-label="Upload image for favicon"
                tabIndex={0}
              >
                <Upload className="h-5 w-5" />
                <span>Click to upload</span>
                <span className="text-xs opacity-60">PNG, JPG, WebP, SVG</span>
                <kbd className="mt-2 rounded border border-border bg-background px-2 py-1 text-[10px]" aria-label="Shortcut">Ctrl+O</kbd>
              </div>
              <input
                ref={uploadRef}
                id="favicon-upload"
                type="file"
                accept=".png,.jpg,.jpeg,.webp,.svg"
                className="hidden"
                onChange={e => { const f = e.target.files?.[0]; if (f) handleImageUpload(f) }}
                aria-label="Upload image file"
              />
            </div>
          )}

          {mode === "text" && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="favicon-text" className="text-sm font-medium">Text or Emoji</Label>
                <Input
                  id="favicon-text"
                  placeholder="CK, 🔒, AB..."
                  value={text}
                  maxLength={3}
                  onChange={e => setText(e.target.value)}
                  aria-label="Enter text or emoji for favicon"
                  className="font-mono"
                />
                <p className="text-xs text-muted-foreground">Up to 3 characters or 1 emoji</p>
              </div>

              <div className="flex gap-4">
                <div className="flex items-center gap-2">
                  <input 
                    type="color" 
                    id="favicon-bg-color"
                    value={bgColor} 
                    onChange={e => setBgColor(e.target.value)}
                    className="h-8 w-8 cursor-pointer rounded border border-border bg-transparent p-0.5" 
                  />
                  <Label htmlFor="favicon-bg-color" className="text-xs text-muted-foreground">Background</Label>
                </div>
                <div className="flex items-center gap-2">
                  <input 
                    type="color" 
                    id="favicon-text-color"
                    value={textColor} 
                    onChange={e => setTextColor(e.target.value)}
                    className="h-8 w-8 cursor-pointer rounded border border-border bg-transparent p-0.5" 
                  />
                  <Label htmlFor="favicon-text-color" className="text-xs text-muted-foreground">Text</Label>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="favicon-font-size" className="text-sm font-medium">Font size</Label>
                  <span className="text-sm font-mono tabular-nums">{fontSize}%</span>
                </div>
                <Slider 
                  id="favicon-font-size"
                  min={20} 
                  max={80} 
                  step={1} 
                  value={[fontSize]}
                  onValueChange={([v]) => setFontSize(v)}
                  aria-label="Font size percentage"
                />
              </div>
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="favicon-site-name" className="text-sm font-medium">Site name</Label>
            <Input 
              id="favicon-site-name"
              placeholder="My App" 
              value={siteName} 
              onChange={e => setSiteName(e.target.value)}
              aria-label="Site name for web manifest"
            />
            <p className="text-xs text-muted-foreground">Used in site.webmanifest</p>
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium">Sizes to export</Label>
              <button
                onClick={() => setSelectedSizes(selectedSizes.size === SIZES.length ? new Set([16]) : new Set(SIZES))}
                className="text-xs text-primary hover:underline focus:outline-none focus:ring-2 focus:ring-primary rounded"
                aria-label={selectedSizes.size === SIZES.length ? "Deselect all sizes" : "Select all sizes"}
              >
                {selectedSizes.size === SIZES.length ? "Deselect all" : "Select all"}
              </button>
            </div>
            <div className="space-y-1.5" role="group" aria-label="Select sizes to export">
              {SIZES.map(size => (
                <button
                  key={size}
                  onClick={() => toggleSize(size)}
                  aria-label={`${selectedSizes.has(size) ? "Deselect" : "Select"} ${SIZE_LABELS[size]}`}
                  aria-pressed={selectedSizes.has(size)}
                  className={`flex w-full items-center gap-2 rounded-md border px-3 py-2 text-sm transition-colors text-left focus:outline-none focus:ring-2 focus:ring-primary ${
                    selectedSizes.has(size)
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border bg-muted/20 text-muted-foreground hover:border-primary/30"
                  }`}
                >
                  <div 
                    className={`h-3.5 w-3.5 rounded border-2 flex items-center justify-center shrink-0 ${
                      selectedSizes.has(size) ? "border-primary bg-primary" : "border-muted-foreground"
                    }`}
                    aria-hidden="true"
                  >
                    {selectedSizes.has(size) && <Check className="h-2 w-2 text-primary-foreground" />}
                  </div>
                  {SIZE_LABELS[size]}
                </button>
              ))}
            </div>
            <button
              onClick={() => setIncludeManifest(v => !v)}
              aria-label={`${includeManifest ? "Exclude" : "Include"} site.webmanifest`}
              aria-pressed={includeManifest}
              className="flex items-center gap-2 pt-1 focus:outline-none focus:ring-2 focus:ring-primary rounded"
            >
              <div 
                className={`h-3.5 w-3.5 rounded border-2 flex items-center justify-center shrink-0 transition-colors ${
                  includeManifest ? "border-primary bg-primary" : "border-muted-foreground"
                }`}
                aria-hidden="true"
              >
                {includeManifest && <Check className="h-2 w-2 text-primary-foreground" />}
              </div>
              <span className="text-sm text-muted-foreground cursor-pointer select-none">
                Include site.webmanifest
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* Right panel */}
      <div className={`${activeTab === "output" ? "flex" : "hidden"} md:flex flex-col flex-1 min-h-0 overflow-hidden bg-card`}>
        <div className="shrink-0 border-b border-border px-4 py-3">
          <span className="text-sm font-medium">Preview</span>
        </div>
        <div className="flex-1 overflow-y-auto p-4" role="region" aria-label="Favicon preview">
          {!hasPreviews ? (
            <div className="flex h-full min-h-[200px] flex-col items-center justify-center gap-3 text-center">
              <div className="rounded-full border border-border bg-muted/50 p-4">
                <Download className="h-6 w-6 text-muted-foreground" />
              </div>
              <div>
                <p className="text-sm font-medium">No favicon yet</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {mode === "image" ? "Upload an image on the left" : "Enter text or emoji on the left"}
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-xs text-muted-foreground" role="status" aria-live="polite">
                Preview — {selectedSizes.size} size{selectedSizes.size !== 1 ? "s" : ""}
                {includeManifest ? " + site.webmanifest" : ""}
              </p>
              <div className="grid grid-cols-3 gap-3" role="list" aria-label="Favicon sizes preview">
                {SIZES.filter(s => selectedSizes.has(s)).map(size => (
                  <div key={size} className="flex flex-col items-center gap-1.5 rounded-lg border border-border bg-muted/20 p-3" role="listitem" aria-label={`${size}x${size} favicon`}>
                    <div className="rounded border border-border/50 bg-white" style={{ width: Math.min(size, 64), height: Math.min(size, 64) }}>
                      <img src={previews[size]} alt={`${size}x${size} preview`} width={Math.min(size, 64)} height={Math.min(size, 64)} />
                    </div>
                    <p className="text-[10px] text-muted-foreground text-center leading-tight">{SIZE_NAMES[size]}</p>
                    <p className="text-[10px] text-muted-foreground/60">{size === 48 ? "32×32" : `${size}×${size}`}</p>
                  </div>
                ))}
                {includeManifest && (
                  <div className="flex flex-col items-center justify-center gap-1.5 rounded-lg border border-dashed border-border bg-muted/10 p-3" role="listitem" aria-label="site.webmanifest file">
                    <p className="text-[10px] text-muted-foreground text-center leading-tight">site.webmanifest</p>
                    <p className="text-[10px] text-muted-foreground/60">JSON config</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

      </div>

      </div>

      {/* Mobile bottom action bar */}
      <div className="flex md:hidden shrink-0 items-center gap-2 border-t border-border bg-card/95 px-3 py-2"
        style={{ paddingBottom: "max(0.5rem, env(safe-area-inset-bottom))" }}>
        <div className="flex-1" />
        <Button
          size="sm"
          className="h-11 px-4"
          onClick={downloadAll}
          disabled={!hasPreviews || isProcessing}
          aria-label={hasPreviews ? "Download favicons as ZIP" : "No favicons to download"}
        >
          {downloaded ? <Check className="mr-2 h-4 w-4" aria-hidden="true" /> : <Download className="mr-2 h-4 w-4" aria-hidden="true" />}
          {downloaded ? "Downloaded!" : "Download"}
        </Button>
      </div>
    </div>
    </>
  )
}
