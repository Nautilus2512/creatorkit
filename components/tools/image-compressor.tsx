"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { Download, Upload, Loader2, Check } from "lucide-react"
import JSZip from "jszip"
import { Button } from "@/components/ui/button"
import { Slider } from "@/components/ui/slider"
import { Label } from "@/components/ui/label"
import { FileDropzone } from "@/components/file-dropzone"
import { ShortcutsModal } from "@/components/shortcuts-modal"

function announceToScreenReader(message: string) {
  if (typeof document === "undefined") return
  const announcement = document.createElement("div")
  announcement.setAttribute("role", "status")
  announcement.setAttribute("aria-live", "polite")
  announcement.setAttribute("aria-atomic", "true")
  announcement.className = "sr-only"
  announcement.textContent = message
  document.body.appendChild(announcement)
  setTimeout(() => document.body.removeChild(announcement), 1000)
}

type CompressResult = {
  name: string
  originalSize: number
  compressedSize: number
  blob: Blob
  url: string
}

const ACCEPT = ".jpg,.jpeg,.png,.webp,.bmp,.gif,.tiff,.tif"
const FORMATS = ["jpeg", "webp", "png"] as const
type Format = typeof FORMATS[number]

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
}

function savingPercent(original: number, compressed: number): number {
  return Math.round((1 - compressed / original) * 100)
}

async function compressPngLossless(file: File): Promise<CompressResult> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const objectUrl = URL.createObjectURL(file)
    img.onload = async () => {
      const canvas = document.createElement("canvas")
      canvas.width = img.width
      canvas.height = img.height
      const ctx = canvas.getContext("2d")
      if (!ctx) { URL.revokeObjectURL(objectUrl); reject(new Error("Canvas error")); return }
      ctx.drawImage(img, 0, 0)
      URL.revokeObjectURL(objectUrl)
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
      const baseName = file.name.replace(/\.[^/.]+$/, "")
      try {
        const { encode } = await import("@jsquash/png")
        const buffer = await encode(imageData)
        const blob = new Blob([buffer], { type: "image/png" })
        resolve({ name: `${baseName}.png`, originalSize: file.size, compressedSize: blob.size, blob, url: URL.createObjectURL(blob) })
      } catch {
        // oxipng unavailable — fall back to canvas PNG
        canvas.toBlob((blob) => {
          if (!blob) { reject(new Error("Compression failed")); return }
          resolve({ name: `${baseName}.png`, originalSize: file.size, compressedSize: blob.size, blob, url: URL.createObjectURL(blob) })
        }, "image/png")
      }
    }
    img.onerror = () => { URL.revokeObjectURL(objectUrl); reject(new Error("Failed to load image")) }
    img.src = objectUrl
  })
}

async function compressImage(file: File, format: Format, quality: number): Promise<CompressResult> {
  if (format === "png") return compressPngLossless(file)
  return new Promise((resolve, reject) => {
    const img = new Image()
    const objectUrl = URL.createObjectURL(file)
    img.onload = () => {
      const canvas = document.createElement("canvas")
      canvas.width = img.width
      canvas.height = img.height
      const ctx = canvas.getContext("2d")
      if (!ctx) { URL.revokeObjectURL(objectUrl); reject(new Error("Canvas error")); return }
      ctx.drawImage(img, 0, 0)
      URL.revokeObjectURL(objectUrl)
      canvas.toBlob(
        (blob) => {
          if (!blob) { reject(new Error("Compression failed")); return }
          const ext = format === "jpeg" ? "jpg" : format
          const baseName = file.name.replace(/\.[^/.]+$/, "")
          resolve({
            name: `${baseName}.${ext}`,
            originalSize: file.size,
            compressedSize: blob.size,
            blob,
            url: URL.createObjectURL(blob),
          })
        },
        `image/${format}`,
        quality / 100
      )
    }
    img.onerror = () => { URL.revokeObjectURL(objectUrl); reject(new Error("Failed to load image")) }
    img.src = objectUrl
  })
}

const shortcuts = [
  { keys: ["Ctrl", "Shift", "U"], description: "Upload images" },
  { keys: ["Ctrl", "Shift", "S"], description: "Download all" },
  { keys: ["?"], description: "Toggle this panel" },
]

export default function ImageCompressor() {
  const [files, setFiles] = useState<File[]>([])
  const [format, setFormat] = useState<Format>("jpeg")
  const [quality, setQuality] = useState(80)
  const [results, setResults] = useState<CompressResult[]>([])
  const [isProcessing, setIsProcessing] = useState(false)
  const [downloadedIndex, setDownloadedIndex] = useState<number | null>(null)
  const [downloading, setDownloading] = useState(false)
  const [activeTab, setActiveTab] = useState<"input" | "output">("input")
  const uploadRef = useRef<HTMLInputElement>(null)
  const qualityTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const downloadingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const resultsRef = useRef<CompressResult[]>([])

  const compress = useCallback(async (filesToCompress: File[], fmt: Format, q: number) => {
    if (!filesToCompress.length) return
    setIsProcessing(true)
    resultsRef.current.forEach(r => URL.revokeObjectURL(r.url))
    try {
      const compressed = await Promise.all(filesToCompress.map(f => compressImage(f, fmt, q)))
      resultsRef.current = compressed
      setResults(compressed)
    } catch {
      // silently handle individual failures
    } finally {
      setIsProcessing(false)
    }
  }, [])

  const handleFilesSelected = useCallback((selected: File[]) => {
    setFiles(selected)
    resultsRef.current.forEach(r => URL.revokeObjectURL(r.url))
    resultsRef.current = []
    setResults([])
    setActiveTab("output")
    compress(selected, format, quality)
    announceToScreenReader(`${selected.length} file${selected.length > 1 ? "s" : ""} added for compression`)
  }, [format, quality, compress])

  useEffect(() => {
    if (!files.length) return
    if (qualityTimerRef.current) clearTimeout(qualityTimerRef.current)
    qualityTimerRef.current = setTimeout(() => {
      compress(files, format, quality)
    }, 500)
  }, [quality, format])

  const downloadOne = useCallback((result: CompressResult, index: number) => {
    const a = document.createElement("a")
    a.href = result.url
    a.download = result.name
    a.click()
    setDownloadedIndex(index)
    announceToScreenReader(`Downloaded ${result.name}`)
    setTimeout(() => setDownloadedIndex(null), 2000)
  }, [])

  const downloadAll = useCallback(async () => {
    if (!results.length) return
    setDownloading(true)
    if (downloadingTimerRef.current) clearTimeout(downloadingTimerRef.current)
    downloadingTimerRef.current = setTimeout(() => setDownloading(false), 1500)
    if (results.length === 1) {
      downloadOne(results[0], 0)
      announceToScreenReader(`Downloaded ${results[0].name}`)
      return
    }
    const zip = new JSZip()
    for (const r of results) {
      zip.file(r.name, r.blob)
    }
    const blob = await zip.generateAsync({ type: "blob" })
    const a = document.createElement("a")
    a.href = URL.createObjectURL(blob)
    a.download = "compressed-images.zip"
    a.click()
    announceToScreenReader("Downloaded all images as ZIP")
  }, [results, downloadOne])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        if (!(e.ctrlKey || e.metaKey)) return
      }
      if (e.key === "?" || (e.shiftKey && e.key === "/")) return
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === "u") { e.preventDefault(); uploadRef.current?.click(); announceToScreenReader("Upload dialog opened") }
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === "s") { e.preventDefault(); downloadAll() }
    }
    window.addEventListener("keydown", handler)
    return () => window.removeEventListener("keydown", handler)
  }, [downloadAll])

  useEffect(() => {
    return () => {
      if (downloadingTimerRef.current) clearTimeout(downloadingTimerRef.current)
    }
  }, [])

  const totalOriginal = results.reduce((sum, r) => sum + r.originalSize, 0)
  const totalCompressed = results.reduce((sum, r) => sum + r.compressedSize, 0)

  return (
    <div className="flex flex-1 flex-col min-h-0">

      {/* DESKTOP: top action bar */}
      <div className="hidden md:flex shrink-0 items-center gap-2 border-b border-border bg-card/95 backdrop-blur-sm px-4 py-2" role="toolbar" aria-label="Image Compressor controls">
        <span className="text-sm font-semibold shrink-0 mr-1">Image Compressor</span>
        <div className="ml-auto flex items-center gap-1.5">
          <ShortcutsModal pageName="Image Compressor" shortcuts={shortcuts} />
          <Button
            variant={downloading ? "outline" : "default"}
            size="sm"
            onClick={downloadAll}
            disabled={!results.length || isProcessing}
            aria-label={downloading ? "Downloaded" : results.length > 1 ? "Download all as ZIP" : "Download compressed image"}
          >
            {downloading ? <Check className="h-4 w-4 mr-1" aria-hidden="true" /> : <Download className="h-4 w-4 mr-1" aria-hidden="true" />}
            {downloading ? "Downloaded!" : results.length > 1 ? "Download All as ZIP" : "Download"}
            <kbd className={`ml-1 hidden md:inline rounded border px-1 text-[10px] ${downloading ? "border-border bg-muted" : "border-primary-foreground/30 bg-primary-foreground/20"}`} aria-hidden="true">Ctrl+Shift+S</kbd>
          </Button>
        </div>
      </div>

      {/* MOBILE: compact header + tab switcher */}
      <div className="flex md:hidden flex-col shrink-0 border-b border-border">
        <div className="flex items-center justify-between px-4 pt-3 pb-2">
          <h2 className="text-base font-semibold">Image Compressor</h2>
          <ShortcutsModal pageName="Image Compressor" shortcuts={shortcuts} />
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
            Result
          </button>
        </div>
      </div>

      {/* PANELS */}
      <div className="flex-1 min-h-0 flex flex-col md:flex-row overflow-hidden">

        {/* Input/Settings panel */}
        <div className={`${activeTab === "input" ? "flex" : "hidden"} md:flex flex-1 flex-col min-h-0 overflow-hidden border-b md:border-b-0 md:border-r border-border`}>
          <div className="flex-1 overflow-y-auto p-4 space-y-6">
            <FileDropzone
              ref={uploadRef}
              accept={ACCEPT}
              onFilesSelected={handleFilesSelected}
              maxFiles={20}
              multiple
              shortcut="Ctrl+Shift+U"
            />

            {files.length > 0 && (
              <>
                {/* Format */}
                <div className="space-y-2" role="group" aria-labelledby="format-label">
                  <Label className="text-sm font-medium" id="format-label">Output format</Label>
                  <div className="grid grid-cols-3 gap-2">
                    {FORMATS.map(f => (
                      <button
                        key={f}
                        onClick={() => { setFormat(f); announceToScreenReader(`${f} format selected`) }}
                        aria-pressed={format === f}
                        aria-label={`${f} output format`}
                        className={`rounded-md border px-3 py-1.5 text-sm font-medium uppercase transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 ${
                          format === f
                            ? "border-primary bg-primary text-primary-foreground"
                            : "border-border bg-muted/30 text-muted-foreground hover:border-primary/50 hover:text-foreground"
                        }`}
                      >
                        {f}
                      </button>
                    ))}
                  </div>
                  {format === "png" && (
                    <p className="text-xs text-muted-foreground" role="note">PNG uses oxipng lossless optimization. Typically 10-20% smaller than unoptimized PNG. Loads a small optimizer on first use. Quality slider has no effect.</p>
                  )}
                </div>

                {/* Quality */}
                <div className="space-y-3" role="group" aria-labelledby="quality-label">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm font-medium" id="quality-label">
                      Quality
                      <span className="ml-1.5 hidden md:inline-flex items-center gap-0.5" aria-hidden="true">
                        <kbd className="rounded border border-border bg-muted px-1 text-[10px]">Tab</kbd>
                        <kbd className="rounded border border-border bg-muted px-1 text-[10px]">← →</kbd>
                      </span>
                    </Label>
                    <span className="text-sm font-mono font-medium tabular-nums" aria-live="polite">{quality}%</span>
                  </div>
                  <Slider
                    min={1}
                    max={100}
                    step={1}
                    value={[quality]}
                    onValueChange={([v]) => { setQuality(v); announceToScreenReader(`Quality ${v} percent`) }}
                    disabled={format === "png"}
                    aria-label={`Quality ${quality} percent`}
                    aria-valuetext={`${quality} percent`}
                  />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Smaller file</span>
                    <span>Better quality</span>
                  </div>
                </div>
              </>
            )}

            {/* USAGE GUIDE */}
            <div className="rounded-xl border border-border bg-card p-4 space-y-4">
              <div className="space-y-1.5">
                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">How to use</p>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Drop or select up to <span className="text-foreground font-medium">20 images</span> to compress them all at once.
                  Results appear on the <span className="text-foreground font-medium">Result</span> tab automatically.
                  Adjust format and quality freely. The tool recompresses in the background without switching you away from settings.
                </p>
              </div>
              <div className="space-y-1.5">
                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">Output formats</p>
                <ul className="space-y-1 text-xs text-muted-foreground list-disc list-inside">
                  <li><span className="text-foreground font-medium">JPEG</span> uses lossy compression, best for photos. Smallest file size at high quality settings.</li>
                  <li><span className="text-foreground font-medium">WebP</span> is a modern format with better compression than JPEG. Supported in all current browsers.</li>
                  <li><span className="text-foreground font-medium">PNG</span> uses oxipng lossless optimization. Typically 10-20% smaller than the browser default. The optimizer loads once on first use. Quality slider has no effect.</li>
                </ul>
              </div>
              <div className="space-y-1.5">
                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">Quality slider</p>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Drag left for a smaller file, right for better visual quality.
                  <span className="text-foreground font-medium"> 75-85%</span> is a good starting point for most photos.
                  Changes recompress automatically after a short delay.
                </p>
              </div>
              <div className="space-y-1.5">
                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">Downloading</p>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Use the per-file download button in the Result tab for individual images.
                  <span className="text-foreground font-medium"> Download All as ZIP</span> bundles everything into one file when you have multiple images.
                </p>
              </div>
              <p className="text-xs text-muted-foreground">Everything runs in your browser. Nothing is sent to a server.</p>
            </div>

            <div className="md:hidden h-[60px]" aria-hidden="true" />
          </div>
        </div>

        {/* Output/Preview panel */}
        <div className={`${activeTab === "output" ? "flex" : "hidden"} md:flex flex-1 flex-col min-h-0 overflow-hidden`}>
          <div className="flex-1 overflow-y-auto p-4 min-h-0">
            {isProcessing ? (
              <div className="flex h-full min-h-[200px] flex-col items-center justify-center gap-3" role="status" aria-live="polite">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" aria-hidden="true" />
                <p className="text-sm text-muted-foreground">Compressing...</p>
              </div>
            ) : results.length === 0 ? (
              <div className="flex h-full min-h-[200px] flex-col items-center justify-center gap-3 text-center" role="status">
                <div className="rounded-full border border-border bg-muted/50 p-4">
                  <Upload className="h-6 w-6 text-muted-foreground" aria-hidden="true" />
                </div>
                <div>
                  <p className="text-sm font-medium">No images yet</p>
                  <p className="text-xs text-muted-foreground mt-1">Upload images on the left to compress them</p>
                </div>
              </div>
            ) : (
              <div className="space-y-3" role="list" aria-label="Compressed images">
                {/* Summary */}
                {results.length > 1 && (
                  <div className="rounded-lg border border-border bg-muted/20 px-4 py-3 flex items-center justify-between" role="status" aria-live="polite">
                    <div className="text-xs text-muted-foreground">
                      <span className="font-medium text-foreground">{results.length} images</span>
                      {" · "}{formatBytes(totalOriginal)} → {formatBytes(totalCompressed)}
                    </div>
                    <span className={`text-xs font-medium ${savingPercent(totalOriginal, totalCompressed) > 0 ? "text-green-500" : "text-muted-foreground"}`}>
                      {savingPercent(totalOriginal, totalCompressed) > 0 ? `-${savingPercent(totalOriginal, totalCompressed)}%` : "No reduction"}
                    </span>
                  </div>
                )}

                {/* Per-file results */}
                {results.map((r, i) => (
                  <div key={i} className="flex items-center justify-between gap-3 rounded-lg border border-border bg-muted/20 px-3 py-2.5" role="listitem">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{r.name}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {formatBytes(r.originalSize)} → {formatBytes(r.compressedSize)}
                        {" · "}
                        <span className={savingPercent(r.originalSize, r.compressedSize) > 0 ? "text-green-500" : "text-amber-500"}>
                          {savingPercent(r.originalSize, r.compressedSize) > 0
                            ? `-${savingPercent(r.originalSize, r.compressedSize)}%`
                            : "No reduction"}
                        </span>
                      </p>
                    </div>
                    <button
                      onClick={() => downloadOne(r, i)}
                      aria-label={`Download ${r.name}, ${formatBytes(r.compressedSize)}`}
                      className="shrink-0 rounded-md border border-border bg-background p-1.5 text-muted-foreground transition-colors hover:border-primary/50 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                    >
                      {downloadedIndex === i ? <Check className="h-3.5 w-3.5 text-green-500" aria-hidden="true" /> : <Download className="h-3.5 w-3.5" aria-hidden="true" />}
                    </button>
                  </div>
                ))}
              </div>
            )}
            <div className="md:hidden h-[60px]" aria-hidden="true" />
          </div>
        </div>

      </div>

      {/* MOBILE: bottom action bar */}
      <div
        className="md:hidden fixed bottom-0 left-0 right-0 flex items-center gap-1.5 border-t border-border bg-card/95 backdrop-blur-sm px-3 py-2 z-20"
        style={{ paddingBottom: "max(0.5rem, env(safe-area-inset-bottom))" }}
      >
        <div className="flex-1" />
        <Button
          variant={downloading ? "outline" : "default"}
          size="sm"
          className="h-11 px-4"
          onClick={downloadAll}
          disabled={!results.length || isProcessing}
          aria-label={downloading ? "Downloaded" : results.length > 1 ? "Download all as ZIP" : "Download compressed image"}
        >
          {downloading ? <Check className="h-4 w-4 mr-1" aria-hidden="true" /> : <Download className="h-4 w-4 mr-1" aria-hidden="true" />}
          {downloading ? "Downloaded!" : results.length > 1 ? "Download ZIP" : "Download"}
        </Button>
      </div>

    </div>
  )
}
