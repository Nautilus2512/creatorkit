"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { Download, Check, RefreshCw, ArrowRight } from "lucide-react"
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

type Format = "jpeg" | "png" | "webp" | "avif"

type ConvertResult = {
  name: string
  originalFormat: string
  originalSize: number
  convertedSize: number
  blob: Blob
  url: string
}

const OUTPUT_FORMATS: { id: Format; label: string; lossy: boolean }[] = [
  { id: "jpeg", label: "JPEG", lossy: true },
  { id: "png", label: "PNG", lossy: false },
  { id: "webp", label: "WebP", lossy: true },
  { id: "avif", label: "AVIF", lossy: true },
]

const ACCEPT = ".jpg,.jpeg,.png,.webp,.bmp,.gif,.tiff,.tif,.avif"

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
}

function getExtension(file: File): string {
  return file.name.split(".").pop()?.toLowerCase() ?? "unknown"
}

async function convertImage(file: File, format: Format, quality: number): Promise<ConvertResult> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const objectUrl = URL.createObjectURL(file)
    img.onload = () => {
      const canvas = document.createElement("canvas")
      canvas.width = img.width
      canvas.height = img.height
      const ctx = canvas.getContext("2d")
      if (!ctx) { URL.revokeObjectURL(objectUrl); reject(new Error("Canvas error")); return }
      if (format === "jpeg") {
        ctx.fillStyle = "#ffffff"
        ctx.fillRect(0, 0, canvas.width, canvas.height)
      }
      ctx.drawImage(img, 0, 0)
      URL.revokeObjectURL(objectUrl)
      const ext = format === "jpeg" ? "jpg" : format
      const baseName = file.name.replace(/\.[^/.]+$/, "")
      canvas.toBlob(
        (blob) => {
          if (!blob) { reject(new Error("Conversion failed")); return }
          resolve({
            name: `${baseName}.${ext}`,
            originalFormat: getExtension(file).toUpperCase(),
            originalSize: file.size,
            convertedSize: blob.size,
            blob,
            url: URL.createObjectURL(blob),
          })
        },
        `image/${format}`,
        OUTPUT_FORMATS.find(f => f.id === format)?.lossy ? quality / 100 : undefined
      )
    }
    img.onerror = () => { URL.revokeObjectURL(objectUrl); reject(new Error("Failed to load image")) }
    img.src = objectUrl
  })
}

const shortcuts = [
  { keys: ["Ctrl", "Shift", "O"], description: "Upload images" },
  { keys: ["Ctrl", "Shift", "D"], description: "Download all" },
  { keys: ["?"], description: "Toggle this panel" },
]

export function ImageFormatConverter() {
  const [files, setFiles] = useState<File[]>([])
  const [format, setFormat] = useState<Format>("webp")
  const [quality, setQuality] = useState(85)
  const [results, setResults] = useState<ConvertResult[]>([])
  const [isProcessing, setIsProcessing] = useState(false)
  const [downloadedIndex, setDownloadedIndex] = useState<number | null>(null)
  const [downloadedAll, setDownloadedAll] = useState(false)
  const [errors, setErrors] = useState<string[]>([])
  const [activeTab, setActiveTab] = useState<"input" | "output">("input")
  const uploadRef = useRef<HTMLInputElement>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const resultsRef = useRef<ConvertResult[]>([])

  const convert = useCallback(async (filesToConvert: File[], fmt: Format, q: number) => {
    if (!filesToConvert.length) return
    setIsProcessing(true)
    setErrors([])
    resultsRef.current.forEach(r => URL.revokeObjectURL(r.url))
    const converted: ConvertResult[] = []
    const errs: string[] = []
    await Promise.all(
      filesToConvert.map(async (f) => {
        try {
          converted.push(await convertImage(f, fmt, q))
        } catch {
          errs.push(`Failed to convert ${f.name}`)
        }
      })
    )
    resultsRef.current = converted
    setResults(converted)
    setErrors(errs)
    setIsProcessing(false)
    if (converted.length > 0) setActiveTab("output")
  }, [])

  const handleFilesSelected = useCallback((selected: File[]) => {
    setFiles(selected)
    resultsRef.current.forEach(r => URL.revokeObjectURL(r.url))
    resultsRef.current = []
    setResults([])
    convert(selected, format, quality)
    announceToScreenReader(`${selected.length} file${selected.length > 1 ? "s" : ""} added for conversion`)
  }, [format, quality, convert])

  useEffect(() => {
    if (!files.length) return
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => convert(files, format, quality), 500)
  }, [quality, format])

  const downloadOne = useCallback((result: ConvertResult, index: number) => {
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
    for (const r of results) zip.file(r.name, r.blob)
    const blob = await zip.generateAsync({ type: "blob" })
    const a = document.createElement("a")
    a.href = URL.createObjectURL(blob)
    a.download = "converted-images.zip"
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

  const isLossy = OUTPUT_FORMATS.find(f => f.id === format)?.lossy ?? true

  return (
    <>
      <div className="flex h-full flex-col">

        {/* DESKTOP: top action bar */}
        <div className="hidden md:flex shrink-0 items-center gap-2 border-b border-border bg-card/95 backdrop-blur-sm px-4 py-2" role="toolbar" aria-label="Image Format Converter controls">
          <span className="text-sm font-semibold shrink-0 mr-1">Image Format Converter</span>
          <div className="h-4 w-px bg-border mx-1" aria-hidden="true" />
          <div className="ml-auto flex items-center gap-1.5">
            <ShortcutsModal pageName="Image Format Converter" shortcuts={shortcuts} />
            <Button
              variant="outline"
              size="sm"
              onClick={downloadAll}
              disabled={!results.length || isProcessing}
              aria-label={downloadedAll ? "All images downloaded" : results.length > 1 ? "Download all as ZIP" : "Download converted image"}
            >
              {downloadedAll ? <Check className="h-4 w-4 mr-1" aria-hidden="true" /> : <Download className="h-4 w-4 mr-1" aria-hidden="true" />}
              {downloadedAll ? "Downloaded!" : results.length > 1 ? "Download All as ZIP" : "Download"}
              <kbd className="ml-1 rounded border border-border bg-muted px-1 text-[10px]" aria-hidden="true">Ctrl+Shift+D</kbd>
            </Button>
          </div>
        </div>

        {/* MOBILE: compact header + tab switcher */}
        <div className="flex md:hidden flex-col shrink-0 border-b border-border">
          <div className="flex items-center justify-between px-4 pt-3 pb-1">
            <h2 className="text-base font-semibold">Image Format Converter</h2>
            <ShortcutsModal pageName="Image Format Converter" shortcuts={shortcuts} />
          </div>
          <div className="flex" role="tablist" aria-label="Panel selection">
            <button
              role="tab"
              aria-selected={activeTab === "input"}
              onClick={() => setActiveTab("input")}
              className={`flex-1 py-2.5 text-sm font-medium border-b-2 transition-colors ${activeTab === "input" ? "border-primary text-foreground" : "border-transparent text-muted-foreground"}`}
            >
              Upload &amp; Format
            </button>
            <button
              role="tab"
              aria-selected={activeTab === "output"}
              onClick={() => setActiveTab("output")}
              className={`flex-1 py-2.5 text-sm font-medium border-b-2 transition-colors ${activeTab === "output" ? "border-primary text-foreground" : "border-transparent text-muted-foreground"}`}
            >
              Preview
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
              />

              {files.length > 0 && (
                <>
                  <div className="space-y-2" role="group" aria-labelledby="format-label">
                    <Label className="text-sm font-medium" id="format-label">Convert to</Label>
                    <div className="grid grid-cols-4 gap-2" role="radiogroup" aria-labelledby="format-label">
                      {OUTPUT_FORMATS.map(f => (
                        <button
                          key={f.id}
                          onClick={() => { setFormat(f.id); announceToScreenReader(`${f.label} format selected`) }}
                          aria-pressed={format === f.id}
                          aria-label={`${f.label} format`}
                          className={`rounded-md border px-2 py-1.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 ${
                            format === f.id
                              ? "border-primary bg-primary text-primary-foreground"
                              : "border-border bg-muted/30 text-muted-foreground hover:border-primary/50 hover:text-foreground"
                          }`}
                        >
                          {f.label}
                        </button>
                      ))}
                    </div>
                    {format === "avif" && (
                      <p className="text-xs text-muted-foreground" role="note">AVIF requires a modern browser (Chrome 85+, Safari 16.4+)</p>
                    )}
                  </div>

                  <div className="space-y-3" role="group" aria-labelledby="quality-label">
                    <div className="flex items-center justify-between">
                      <Label className="text-sm font-medium" id="quality-label">Quality</Label>
                      <span className="text-sm font-mono font-medium tabular-nums" aria-live="polite">{isLossy ? `${quality}%` : "Lossless"}</span>
                    </div>
                    <Slider
                      min={1}
                      max={100}
                      step={1}
                      value={[quality]}
                      onValueChange={([v]) => { setQuality(v); if (v % 20 === 0) announceToScreenReader(`Quality ${v} percent`) }}
                      disabled={!isLossy}
                      aria-label={`Quality ${isLossy ? quality : "lossless"}`}
                      aria-valuetext={isLossy ? `${quality} percent` : "Lossless"}
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

          {/* Output/Preview panel */}
          <div className={`${activeTab === "output" ? "flex" : "hidden"} md:flex flex-1 flex-col min-h-0 overflow-hidden`}>
            <div className="flex-1 overflow-y-auto p-4">
              {isProcessing ? (
                <div className="flex h-full min-h-[200px] flex-col items-center justify-center gap-3" role="status" aria-live="polite">
                  <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" aria-hidden="true" />
                  <p className="text-sm text-muted-foreground">Converting...</p>
                </div>
              ) : results.length === 0 ? (
                <div className="flex h-full min-h-[200px] flex-col items-center justify-center gap-3 text-center" role="status">
                  <div className="rounded-full border border-border bg-muted/50 p-4">
                    <RefreshCw className="h-6 w-6 text-muted-foreground" aria-hidden="true" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">No images yet</p>
                    <p className="text-xs text-muted-foreground mt-1">Upload images on the left to convert them</p>
                  </div>
                </div>
              ) : (
                <div className="space-y-3" role="list" aria-label="Converted images">
                  {errors.map((err, i) => (
                    <p key={i} className="text-xs text-red-500" role="alert">{err}</p>
                  ))}
                  {results.map((r, i) => (
                    <div key={i} className="flex items-center justify-between gap-3 rounded-lg border border-border bg-muted/20 px-3 py-2.5" role="listitem">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{r.name}</p>
                        <div className="flex items-center gap-1.5 mt-0.5 text-xs text-muted-foreground">
                          <span aria-hidden="true">{r.originalFormat}</span>
                          <ArrowRight className="h-3 w-3" aria-hidden="true" />
                          <span className="uppercase">{format === "jpeg" ? "JPG" : format.toUpperCase()}</span>
                          <span className="text-muted-foreground/60" aria-hidden="true">·</span>
                          <span>{formatBytes(r.originalSize)} → {formatBytes(r.convertedSize)}</span>
                        </div>
                      </div>
                      <button
                        onClick={() => downloadOne(r, i)}
                        aria-label={`Download ${r.name}, ${formatBytes(r.convertedSize)}`}
                        className="shrink-0 rounded-md border border-border bg-background p-1.5 text-muted-foreground transition-colors hover:border-primary/50 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                      >
                        {downloadedIndex === i ? <Check className="h-3.5 w-3.5 text-green-500" aria-hidden="true" /> : <Download className="h-3.5 w-3.5" aria-hidden="true" />}
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

        </div>

        {/* MOBILE: bottom action bar */}
        <div className="flex md:hidden shrink-0 items-center gap-1.5 border-t border-border bg-card/95 px-3 py-2"
          style={{ paddingBottom: "max(0.5rem, env(safe-area-inset-bottom))" }}>
          <div className="flex-1" />
          <Button
            size="sm"
            className="h-11 px-4"
            onClick={downloadAll}
            disabled={!results.length || isProcessing}
            aria-label={downloadedAll ? "All images downloaded" : results.length > 1 ? "Download all as ZIP" : "Download converted image"}
          >
            {downloadedAll ? <Check className="h-4 w-4 mr-1" aria-hidden="true" /> : <Download className="h-4 w-4 mr-1" aria-hidden="true" />}
            {downloadedAll ? "Downloaded!" : results.length > 1 ? "Download ZIP" : "Download"}
          </Button>
        </div>

      </div>
    </>
  )
}
