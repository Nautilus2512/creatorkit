"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { Download, Upload, ImageIcon, Loader2, Check } from "lucide-react"
import JSZip from "jszip"
import { Button } from "@/components/ui/button"
import { Slider } from "@/components/ui/slider"
import { Label } from "@/components/ui/label"
import { FileDropzone } from "@/components/file-dropzone"
import { ShortcutsModal } from "@/components/shortcuts-modal"

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

  const compress = useCallback(async (filesToCompress: File[], fmt: Format, q: number) => {
    if (!filesToCompress.length) return
    setIsProcessing(true)
    results.forEach(r => URL.revokeObjectURL(r.url))
    try {
      const compressed = await Promise.all(filesToCompress.map(f => compressImage(f, fmt, q)))
      setResults(compressed)
    } catch {
      // silently handle individual failures
    } finally {
      setIsProcessing(false)
    }
  }, [results])

  const handleFilesSelected = (selected: File[]) => {
    setFiles(selected)
    setResults([])
    compress(selected, format, quality)
  }

  useEffect(() => {
    if (!files.length) return
    if (qualityTimerRef.current) clearTimeout(qualityTimerRef.current)
    qualityTimerRef.current = setTimeout(() => {
      compress(files, format, quality)
    }, 400)
  }, [quality, format])

  const downloadOne = (result: CompressResult, index: number) => {
    const a = document.createElement("a")
    a.href = result.url
    a.download = result.name
    a.click()
    setDownloadedIndex(index)
    setTimeout(() => setDownloadedIndex(null), 2000)
  }

  const downloadAll = async () => {
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
    setTimeout(() => setDownloadedAll(false), 2000)
  }

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const ctrl = e.ctrlKey || e.metaKey
      if (ctrl && (e.key === "o" || e.key === "O")) { e.preventDefault(); uploadRef.current?.click() }
      if (ctrl && (e.key === "d" || e.key === "D")) { e.preventDefault(); downloadAll() }
    }
    window.addEventListener("keydown", handler)
    return () => window.removeEventListener("keydown", handler)
  }, [results])

  const totalOriginal = results.reduce((sum, r) => sum + r.originalSize, 0)
  const totalCompressed = results.reduce((sum, r) => sum + r.compressedSize, 0)

  return (
    <div className="flex flex-col gap-4 md:grid md:grid-cols-2 md:gap-4 md:h-[calc(100vh-80px)]">
      {/* Left panel */}
      <div className="flex flex-col md:overflow-hidden rounded-xl border border-border bg-card">
        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          <div className="flex items-center gap-2">
            <div className="rounded-lg border border-border bg-muted/50 p-2">
              <ImageIcon className="h-4 w-4 text-primary" />
            </div>
            <div>
              <h1 className="text-base font-semibold">Image Compressor</h1>
              <p className="text-xs text-muted-foreground">Compress images locally · No uploads</p>
            </div>
          </div>

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
              <div className="space-y-2">
                <Label className="text-sm font-medium">Output format</Label>
                <div className="grid grid-cols-3 gap-2">
                  {FORMATS.map(f => (
                    <button
                      key={f}
                      onClick={() => setFormat(f)}
                      className={`rounded-md border px-3 py-1.5 text-sm font-medium uppercase transition-colors ${
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
                  <p className="text-xs text-muted-foreground">PNG is lossless — quality slider has no effect</p>
                )}
              </div>

              {/* Quality */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-medium">Quality</Label>
                  <span className="text-sm font-mono font-medium tabular-nums">{quality}%</span>
                </div>
                <Slider
                  min={1}
                  max={100}
                  step={1}
                  value={[quality]}
                  onValueChange={([v]) => setQuality(v)}
                  disabled={format === "png"}
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
      <div className="flex flex-col md:overflow-hidden rounded-xl border border-border bg-card">
        <div className="flex-1 overflow-y-auto p-4">
          {isProcessing ? (
            <div className="flex h-full min-h-[200px] flex-col items-center justify-center gap-3">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              <p className="text-sm text-muted-foreground">Compressing...</p>
            </div>
          ) : results.length === 0 ? (
            <div className="flex h-full min-h-[200px] flex-col items-center justify-center gap-3 text-center">
              <div className="rounded-full border border-border bg-muted/50 p-4">
                <Upload className="h-6 w-6 text-muted-foreground" />
              </div>
              <div>
                <p className="text-sm font-medium">No images yet</p>
                <p className="text-xs text-muted-foreground mt-1">Upload images on the left to compress them</p>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {/* Summary */}
              {results.length > 1 && (
                <div className="rounded-lg border border-border bg-muted/20 px-4 py-3 flex items-center justify-between">
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
                <div key={i} className="flex items-center justify-between gap-3 rounded-lg border border-border bg-muted/20 px-3 py-2.5">
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
                    aria-label="Download compressed image"
                    className="shrink-0 rounded-md border border-border bg-background p-1.5 text-muted-foreground transition-colors hover:border-primary/50 hover:text-foreground"
                  >
                    {downloadedIndex === i ? <Check className="h-3.5 w-3.5 text-green-500" /> : <Download className="h-3.5 w-3.5" />}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="shrink-0 border-t border-border p-4">
          <Button className="w-full" onClick={downloadAll} disabled={!results.length || isProcessing}>
            {downloadedAll ? <Check className="mr-2 h-4 w-4" /> : <Download className="mr-2 h-4 w-4" />}
            {downloadedAll ? "Downloaded!" : results.length > 1 ? "Download All as ZIP" : "Download"}
            {!downloadedAll && (
              <kbd className="ml-auto rounded border border-primary-foreground/30 bg-primary-foreground/10 px-1.5 text-[10px] opacity-60">
                Ctrl+D
              </kbd>
            )}
          </Button>
        </div>
      </div>

      <ShortcutsModal
        pageName="Image Compressor"
        shortcuts={[
          { keys: ["Ctrl", "O"], description: "Upload images" },
          { keys: ["Ctrl", "D"], description: "Download all" },
          { keys: ["?"], description: "Toggle this panel" },
        ]}
      />
    </div>
  )
}
