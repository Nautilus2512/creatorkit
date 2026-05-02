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
      if ((e.ctrlKey || e.metaKey) && (e.key === "d" || e.key === "D")) {
        e.preventDefault(); downloadAll()
      }
    }
    window.addEventListener("keydown", handler)
    return () => window.removeEventListener("keydown", handler)
  }, [downloadAll])

  const hasPreviews = Object.keys(previews).length > 0

  return (
    <div className="flex flex-col gap-4 md:grid md:grid-cols-2 md:gap-4 md:h-[calc(100vh-80px)]">
      {/* Left panel */}
      <div className="flex flex-col md:overflow-hidden rounded-xl border border-border bg-card">
        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          <div className="flex items-center gap-2">
            <div className="rounded-lg border border-border bg-muted/50 p-2">
              <Download className="h-4 w-4 text-primary" />
            </div>
            <div>
              <h1 className="text-base font-semibold">Favicon Generator</h1>
              <p className="text-xs text-muted-foreground">All sizes + manifest · 100% in-browser</p>
            </div>
          </div>

          {/* Mode toggle */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Source</Label>
            <div className="grid grid-cols-2 gap-2">
              {(["image", "text"] as Mode[]).map(m => (
                <button
                  key={m}
                  onClick={() => { setMode(m); setPreviews({}); setSourceCanvas(null) }}
                  className={`flex items-center justify-center gap-2 rounded-md border px-3 py-2 text-sm font-medium transition-colors ${
                    mode === m
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border bg-muted/30 text-muted-foreground hover:border-primary/50 hover:text-foreground"
                  }`}
                >
                  {m === "image" ? <Upload className="h-3.5 w-3.5" /> : <Type className="h-3.5 w-3.5" />}
                  {m === "image" ? "Upload Image" : "Text / Emoji"}
                </button>
              ))}
            </div>
          </div>

          {mode === "image" && (
            <div className="space-y-2">
              <Label className="text-sm font-medium">Image</Label>
              <div
                onClick={() => uploadRef.current?.click()}
                className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-border p-8 text-sm text-muted-foreground transition-colors hover:border-primary/50 hover:text-foreground"
              >
                <Upload className="h-5 w-5" />
                <span>Click to upload</span>
                <span className="text-xs opacity-60">PNG, JPG, WebP, SVG</span>
              </div>
              <input
                ref={uploadRef}
                type="file"
                accept=".png,.jpg,.jpeg,.webp,.svg"
                className="hidden"
                onChange={e => { const f = e.target.files?.[0]; if (f) handleImageUpload(f) }}
              />
            </div>
          )}

          {mode === "text" && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label className="text-sm font-medium">Text or Emoji</Label>
                <Input
                  placeholder="CK, 🔒, AB..."
                  value={text}
                  maxLength={3}
                  onChange={e => setText(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">Up to 3 characters or 1 emoji</p>
              </div>

              <div className="flex gap-4">
                <div className="flex items-center gap-2">
                  <input type="color" value={bgColor} onChange={e => setBgColor(e.target.value)}
                    className="h-8 w-8 cursor-pointer rounded border border-border bg-transparent p-0.5" />
                  <span className="text-xs text-muted-foreground">Background</span>
                </div>
                <div className="flex items-center gap-2">
                  <input type="color" value={textColor} onChange={e => setTextColor(e.target.value)}
                    className="h-8 w-8 cursor-pointer rounded border border-border bg-transparent p-0.5" />
                  <span className="text-xs text-muted-foreground">Text</span>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-medium">Font size</Label>
                  <span className="text-sm font-mono tabular-nums">{fontSize}%</span>
                </div>
                <Slider min={20} max={80} step={1} value={[fontSize]}
                  onValueChange={([v]) => setFontSize(v)} />
              </div>
            </div>
          )}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Site name</Label>
            <Input placeholder="My App" value={siteName} onChange={e => setSiteName(e.target.value)} />
            <p className="text-xs text-muted-foreground">Used in site.webmanifest</p>
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium">Sizes to export</Label>
              <button
                onClick={() => setSelectedSizes(selectedSizes.size === SIZES.length ? new Set([16]) : new Set(SIZES))}
                className="text-xs text-primary hover:underline"
              >
                {selectedSizes.size === SIZES.length ? "Deselect all" : "Select all"}
              </button>
            </div>
            <div className="space-y-1.5">
              {SIZES.map(size => (
                <button
                  key={size}
                  onClick={() => toggleSize(size)}
                  className={`flex w-full items-center gap-2 rounded-md border px-3 py-2 text-sm transition-colors text-left ${
                    selectedSizes.has(size)
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border bg-muted/20 text-muted-foreground hover:border-primary/30"
                  }`}
                >
                  <div className={`h-3.5 w-3.5 rounded border-2 flex items-center justify-center shrink-0 ${
                    selectedSizes.has(size) ? "border-primary bg-primary" : "border-muted-foreground"
                  }`}>
                    {selectedSizes.has(size) && <Check className="h-2 w-2 text-primary-foreground" />}
                  </div>
                  {SIZE_LABELS[size]}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-2 pt-1">
              <button
                onClick={() => setIncludeManifest(v => !v)}
                className={`h-3.5 w-3.5 rounded border-2 flex items-center justify-center shrink-0 transition-colors ${
                  includeManifest ? "border-primary bg-primary" : "border-muted-foreground"
                }`}
              >
                {includeManifest && <Check className="h-2 w-2 text-primary-foreground" />}
              </button>
              <span
                className="text-sm text-muted-foreground cursor-pointer select-none"
                onClick={() => setIncludeManifest(v => !v)}
              >
                Include site.webmanifest
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Right panel */}
      <div className="flex flex-col md:overflow-hidden rounded-xl border border-border bg-card">
        <div className="flex-1 overflow-y-auto p-4">
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
              <p className="text-xs text-muted-foreground">
                Preview — {selectedSizes.size} size{selectedSizes.size !== 1 ? "s" : ""}
                {includeManifest ? " + site.webmanifest" : ""}
              </p>
              <div className="grid grid-cols-3 gap-3">
                {SIZES.filter(s => selectedSizes.has(s)).map(size => (
                  <div key={size} className="flex flex-col items-center gap-1.5 rounded-lg border border-border bg-muted/20 p-3">
                    <div className="rounded border border-border/50 bg-white" style={{ width: Math.min(size, 64), height: Math.min(size, 64) }}>
                      <img src={previews[size]} alt={`${size}x${size}`} width={Math.min(size, 64)} height={Math.min(size, 64)} />
                    </div>
                    <p className="text-[10px] text-muted-foreground text-center leading-tight">{SIZE_NAMES[size]}</p>
                    <p className="text-[10px] text-muted-foreground/60">{size === 48 ? "32×32" : `${size}×${size}`}</p>
                  </div>
                ))}
                {includeManifest && (
                  <div className="flex flex-col items-center justify-center gap-1.5 rounded-lg border border-dashed border-border bg-muted/10 p-3">
                    <p className="text-[10px] text-muted-foreground text-center leading-tight">site.webmanifest</p>
                    <p className="text-[10px] text-muted-foreground/60">JSON config</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="shrink-0 border-t border-border p-4">
          <Button className="w-full" onClick={downloadAll} disabled={!hasPreviews || isProcessing}>
            {downloaded ? <Check className="mr-2 h-4 w-4" /> : <Download className="mr-2 h-4 w-4" />}
            {downloaded ? "Downloaded!" : "Download favicons.zip"}
            {!downloaded && (
              <kbd className="ml-auto rounded border border-primary-foreground/30 bg-primary-foreground/10 px-1.5 text-[10px] opacity-60">
                Ctrl+D
              </kbd>
            )}
          </Button>
        </div>
      </div>

      <ShortcutsModal
        pageName="Favicon Generator"
        shortcuts={[
          { keys: ["Ctrl", "D"], description: "Download favicons.zip" },
          { keys: ["?"], description: "Toggle this panel" },
        ]}
      />
    </div>
  )
}
