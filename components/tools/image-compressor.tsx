"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { Download, Upload, ImageIcon, Loader2, Check } from "lucide-react"
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
  announcement.className = 'sr-only'
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

async function compressImage(file: File, format: Format, quality: number): Promise<CompressResult> {
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

export function ImageCompressor() {
  const [files, setFiles] = useState<File[]>([])
  const [format, setFormat] = useState<Format>("jpeg")
  const [quality, setQuality] = useState(80)
  const [results, setResults] = useState<CompressResult[]>([])
  const [isProcessing, setIsProcessing] = useState(false)
  const [downloadedIndex, setDownloadedIndex] = useState<number | null>(null)
  const [downloadedAll, setDownloadedAll] = useState(false)
  const uploadRef = useRef<HTMLInputElement>(null)
  const qualityTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

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
    if (results.length === 1) { downloadOne(results[0], 0); return }
    const zip = new JSZip()
    for (const r of results) {
      zip.file(r.name, r.blob)
    }
    const blob = await zip.generateAsync({ type: "blob" })
    const a = document.createElement("a")
    a.href = URL.createObjectURL(blob)
    a.download = "compressed-images.zip"
    a.click()
    setDownloadedAll(true)
    announceToScreenReader("Downloaded all images as ZIP")
    setTimeout(() => setDownloadedAll(false), 2000)
  }, [results, downloadOne])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "?" || (e.shiftKey && e.key === "/")) return
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === "o") { e.preventDefault(); uploadRef.current?.click(); announceToScreenReader("Upload dialog opened") }
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === "d") { e.preventDefault(); downloadAll() }
    }
    window.addEventListener("keydown", handler)
    return () => window.removeEventListener("keydown", handler)
  }, [downloadAll])

  const totalOriginal = results.reduce((sum, r) => sum + r.originalSize, 0)
  const totalCompressed = results.reduce((sum, r) => sum + r.compressedSize, 0)

  return (
    <>
    <div className="flex h-full flex-col gap-3 p-4">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">Image Compressor</h2>
        <p className="text-muted-foreground">Compress images locally · No uploads. Press ? for shortcuts.</p>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 flex-1 min-h-0">
      {/* Left panel */}
      <div className="flex flex-col min-h-0 overflow-hidden rounded-xl border border-border bg-card" role="region" aria-labelledby="settings-label">
        <div className="shrink-0 border-b border-border px-4 py-3">
          <span className="text-sm font-medium" id="settings-label">Compression Settings</span>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-6 min-h-0">
          <FileDropzone
            ref={uploadRef}
            accept={ACCEPT}
            onFilesSelected={handleFilesSelected}
            maxFiles={20}
            multiple
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
                  <p className="text-xs text-muted-foreground" role="note">PNG is lossless — quality slider has no effect</p>
                )}
              </div>

              {/* Quality */}
              <div className="space-y-3" role="group" aria-labelledby="quality-label">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-medium" id="quality-label">Quality</Label>
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
        </div>
      </div>

      {/* Right panel */}
      <div className="flex flex-col min-h-0 overflow-hidden rounded-xl border border-border bg-card" role="region" aria-labelledby="results-label">
        <div className="shrink-0 border-b border-border px-4 py-3">
          <span className="text-sm font-medium" id="results-label">Compressed Images</span>
        </div>
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
        </div>

        <div className="shrink-0 border-t border-border p-4">
          <Button 
            className="w-full" 
            onClick={downloadAll} 
            disabled={!results.length || isProcessing}
            aria-label={downloadedAll ? "All images downloaded" : results.length > 1 ? "Download all as ZIP" : "Download compressed image"}
          >
            {downloadedAll ? <Check className="mr-2 h-4 w-4" aria-hidden="true" /> : <Download className="mr-2 h-4 w-4" aria-hidden="true" />}
            {downloadedAll ? "Downloaded!" : results.length > 1 ? "Download All as ZIP" : "Download"}
            {!downloadedAll && results.length > 0 && (
              <kbd className="ml-auto rounded border border-primary-foreground/30 bg-primary-foreground/10 px-1.5 text-[10px] opacity-60" aria-hidden="true">
                Ctrl+Shift+D
              </kbd>
            )}
          </Button>
        </div>
      </div>

      </div>
    </div>
    <ShortcutsModal
      pageName="Image Compressor"
      shortcuts={[
        { keys: ["Ctrl", "Shift", "O"], description: "Upload images" },
        { keys: ["Ctrl", "Shift", "D"], description: "Download all" },
        { keys: ["?"], description: "Toggle this panel" },
      ]}
    />
    </>
  )
}
