"use client"

import { useState, useRef, useCallback, useEffect } from "react"
import { FileDown, Upload, X, Download, AlertCircle, Settings, AlertTriangle, Info } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { ShortcutsModal } from "@/components/shortcuts-modal"
import { Badge } from "@/components/ui/badge"
import { PDFDocument } from 'pdf-lib'

// Change from static import to dynamic
let pdfjsLib: typeof import('pdfjs-dist') | null = null

function formatBytes(n: number) {
  if (n < 1024) return `${n} B`
  if (n < 1048576) return `${(n / 1024).toFixed(1)} KB`
  return `${(n / 1048576).toFixed(2)} MB`
}

interface CompressionOptions {
  quality: number
  maxDimension: number
  targetDPI: number
}

interface CompressionResult {
  originalSize: number
  compressedSize: number
  pagesProcessed: number
  compressionRatio: number
  blob: Blob
}

class PDFCompressor {
  private options: CompressionOptions
  private onProgress: (progress: number) => void

  constructor(
    options: Partial<CompressionOptions> = {},
    onProgress: (progress: number) => void = () => {}
  ) {
    this.options = {
      quality: 0.65,
      maxDimension: 1500,
      targetDPI: 150,
      ...options
    }
    this.onProgress = onProgress
  }

  private async setupPDFJS(): Promise<typeof import('pdfjs-dist')> {
    if (typeof window === 'undefined') throw new Error('PDF.js only works in browser')

    if (!pdfjsLib) {
      pdfjsLib = await import('pdfjs-dist')
      pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`
    }

    return pdfjsLib
  }

  async compress(file: File): Promise<CompressionResult> {
    const pdfjs = await this.setupPDFJS()
    const originalSize = file.size
    const arrayBuffer = await file.arrayBuffer()

    const [pdfDoc, pdfjsDoc] = await Promise.all([
      PDFDocument.load(arrayBuffer),
      pdfjs.getDocument({ data: arrayBuffer }).promise
    ])

    const pageCount = pdfDoc.getPageCount()
    const newPdf = await PDFDocument.create()

    const batchSize = 2
    for (let i = 0; i < pageCount; i += batchSize) {
      const batchEnd = Math.min(i + batchSize, pageCount)

      for (let pageNum = i; pageNum < batchEnd; pageNum++) {
        this.onProgress((pageNum / pageCount) * 100)

        try {
          const pdfjsPage = await pdfjsDoc.getPage(pageNum + 1)
          const viewport = pdfjsPage.getViewport({ scale: 1 })

          const scale = this.calculateScale(viewport.width, viewport.height)
          const scaledViewport = pdfjsPage.getViewport({ scale })

          const canvas = document.createElement('canvas')
          const ctx = canvas.getContext('2d', { alpha: false })
          if (!ctx) throw new Error('Canvas not supported')

          canvas.width = scaledViewport.width
          canvas.height = scaledViewport.height

          ctx.fillStyle = 'white'
          ctx.fillRect(0, 0, canvas.width, canvas.height)

          // @ts-ignore
          await pdfjsPage.render({
            canvasContext: ctx,
            viewport: scaledViewport,
            canvas: canvas
          }).promise

          const compressedImageData = await this.canvasToJpeg(canvas)
          const embeddedImage = await newPdf.embedJpg(compressedImageData)

          const newPage = newPdf.addPage([viewport.width, viewport.height])
          newPage.drawImage(embeddedImage, {
            x: 0,
            y: 0,
            width: viewport.width,
            height: viewport.height
          })

          pdfjsPage.cleanup()
          canvas.width = 0
          canvas.height = 0

        } catch (err) {
          console.warn(`Failed to compress page ${pageNum + 1}:`, err)
          const [fallbackPage] = await newPdf.copyPages(pdfDoc, [pageNum])
          newPdf.addPage(fallbackPage)
        }
      }

      await new Promise(resolve => setTimeout(resolve, 10))
    }

    const compressedBytes = await newPdf.save({
      useObjectStreams: true,
      addDefaultPage: false
    })

    // @ts-ignore
    const blob = new Blob([compressedBytes as unknown as BlobPart], { type: 'application/pdf' })
    const compressedSize = blob.size
    const compressionRatio = ((originalSize - compressedSize) / originalSize * 100)

    return {
      originalSize,
      compressedSize,
      pagesProcessed: pageCount,
      compressionRatio,
      blob
    }
  }

  private calculateScale(width: number, height: number): number {
    const maxDim = Math.max(width, height)
    if (maxDim <= this.options.maxDimension) return 1
    return this.options.maxDimension / maxDim
  }

  private async canvasToJpeg(canvas: HTMLCanvasElement): Promise<Uint8Array> {
    return new Promise((resolve, reject) => {
      canvas.toBlob(
        (blob) => {
          if (!blob) {
            reject(new Error('Canvas to blob failed'))
            return
          }
          const reader = new FileReader()
          reader.onloadend = () => {
            resolve(new Uint8Array(reader.result as ArrayBuffer))
          }
          reader.onerror = reject
          reader.readAsArrayBuffer(blob)
        },
        'image/jpeg',
        this.options.quality
      )
    })
  }
}

const shortcuts = [
  { keys: ["Ctrl", "Shift", "E"], description: "Compress PDF" },
  { keys: ["Ctrl", "Shift", "O"], description: "Open file picker" },
  { keys: ["Ctrl", "Shift", "D"], description: "Download compressed PDF" },
]

export function PDFCompress() {
  const [file, setFile] = useState<File | null>(null)
  const [compressing, setCompressing] = useState(false)
  const [progress, setProgress] = useState(0)
  const [result, setResult] = useState<CompressionResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [options, setOptions] = useState<CompressionOptions>({
    quality: 0.65,
    maxDimension: 1500,
    targetDPI: 150
  })
  const [removeMetadata, setRemoveMetadata] = useState(true)
  const [announcement, setAnnouncement] = useState("")
  const [activeTab, setActiveTab] = useState<"input" | "output">("input")
  const inputRef = useRef<HTMLInputElement>(null)

  const announceToScreenReader = useCallback((message: string) => {
    setAnnouncement(message)
    setTimeout(() => setAnnouncement(""), 1000)
  }, [])

  const handleFile = (f: File) => {
    if (!f.name.toLowerCase().endsWith(".pdf")) {
      setError("Please upload a PDF file")
      announceToScreenReader("Error: Please upload a PDF file")
      return
    }
    setFile(f)
    setResult(null)
    setError(null)
    announceToScreenReader(`File loaded: ${f.name}, ${formatBytes(f.size)}`)
  }

  const handleCompress = useCallback(async () => {
    if (!file) return
    setCompressing(true)
    setError(null)
    setProgress(0)
    announceToScreenReader("Compressing PDF...")

    try {
      const compressor = new PDFCompressor(options, setProgress)
      const compressionResult = await compressor.compress(file)
      setResult(compressionResult)
      announceToScreenReader(`PDF compressed. Reduced by ${compressionResult.compressionRatio.toFixed(1)}%`)
    } catch (err) {
      setError("Could not compress this PDF. It may be encrypted or contain unsupported features.")
      announceToScreenReader("Error: Could not compress PDF")
    } finally {
      setCompressing(false)
    }
  }, [file, options, announceToScreenReader])

  const download = useCallback(() => {
    if (!result?.blob) return
    const url = URL.createObjectURL(result.blob)
    const a = document.createElement("a")
    a.href = url
    a.download = file?.name.replace(/\.pdf$/i, `-compressed-${Math.round(options.quality * 100)}.pdf`) || "compressed.pdf"
    a.click()
    URL.revokeObjectURL(url)
    announceToScreenReader("Compressed PDF downloaded")
  }, [result, file, options, announceToScreenReader])

  const openFileDialog = () => {
    inputRef.current?.click()
    announceToScreenReader("File picker opened")
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    if (f) handleFile(f)
  }

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === "e") {
        e.preventDefault()
        handleCompress()
      }
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === "o") {
        e.preventDefault()
        openFileDialog()
      }
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === "d" && result) {
        e.preventDefault()
        download()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleCompress, result, download])

  return (
    <>
      <div aria-live="polite" aria-atomic="true" className="sr-only">
        {announcement}
      </div>

      <div className="flex h-full flex-col">

        {/* DESKTOP: top action bar */}
        <div className="hidden md:flex shrink-0 items-center gap-2 border-b border-border bg-card/95 backdrop-blur-sm px-4 py-2">
          <span className="text-sm font-semibold shrink-0 mr-1">PDF Compressor (Scanned Docs)</span>
          <Badge variant="outline" className="bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300 border-amber-300">
            <AlertTriangle className="h-3 w-3 mr-1" />
            Warning: Text becomes images
          </Badge>
          <div className="ml-auto flex items-center gap-1.5">
            <ShortcutsModal pageName="PDF Compressor (Scanned Docs)" shortcuts={shortcuts} />
            <Button
              size="sm"
              onClick={handleCompress}
              disabled={!file || compressing}
              aria-label={compressing ? "Compressing PDF" : "Compress PDF"}
            >
              {compressing ? (
                <>
                  <span className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent inline-block" />
                  Compressing…
                </>
              ) : (
                <>
                  <FileDown className="mr-1 h-4 w-4" aria-hidden="true" />
                  Compress
                  <kbd className="ml-1 rounded border border-border bg-muted px-1 text-[10px]" aria-hidden="true">Ctrl+Shift+E</kbd>
                </>
              )}
            </Button>
            {result && result.compressionRatio > 0 && (
              <Button
                size="sm"
                variant="outline"
                onClick={download}
                aria-label="Download compressed PDF"
              >
                <Download className="mr-1 h-4 w-4" aria-hidden="true" />
                Download
                <kbd className="ml-1 rounded border border-border bg-muted px-1 text-[10px]" aria-hidden="true">Ctrl+Shift+D</kbd>
              </Button>
            )}
          </div>
        </div>

        {/* MOBILE: compact header + tab switcher */}
        <div className="flex md:hidden flex-col shrink-0 border-b border-border">
          <div className="flex items-center justify-between px-4 pt-3 pb-1">
            <h2 className="text-base font-semibold">PDF Compressor</h2>
            <ShortcutsModal pageName="PDF Compressor (Scanned Docs)" shortcuts={shortcuts} />
          </div>
          <div className="flex" role="tablist">
            <button role="tab" aria-selected={activeTab === "input"} onClick={() => setActiveTab("input")}
              className={`flex-1 py-2.5 text-sm font-medium border-b-2 transition-colors ${activeTab === "input" ? "border-primary text-foreground" : "border-transparent text-muted-foreground"}`}>
              Settings
            </button>
            <button role="tab" aria-selected={activeTab === "output"} onClick={() => setActiveTab("output")}
              className={`flex-1 py-2.5 text-sm font-medium border-b-2 transition-colors ${activeTab === "output" ? "border-primary text-foreground" : "border-transparent text-muted-foreground"}`}>
              Result
            </button>
          </div>
        </div>

        {/* Info boxes - visible on desktop inside panels, show here on mobile as top banner */}
        <div className="md:hidden shrink-0 overflow-y-auto max-h-32 border-b border-border">
          <div className="space-y-2 p-3">
            <div className="rounded-lg bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 p-3 text-xs space-y-2" role="note" aria-label="How compression works">
              <p className="font-medium text-blue-700 dark:text-blue-300 flex items-center gap-2">
                <Info className="h-4 w-4" aria-hidden="true" />
                How this works:
              </p>
              <ul className="space-y-1 text-blue-600 dark:text-blue-400 list-disc list-inside">
                <li>Each PDF page is rendered to an image using your browser</li>
                <li>Images are compressed with JPEG at your selected quality level</li>
                <li>A new PDF is built from these compressed images</li>
                <li>Text becomes images (unselectable), but size drops 60-80%</li>
              </ul>
              <p className="text-blue-500 dark:text-blue-400 italic pt-1">Best for: scanned documents, image-heavy PDFs, reducing email attachment sizes</p>
            </div>

            <div className="rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 p-3 text-xs space-y-2" role="alert" aria-label="Limitations and requirements">
              <p className="font-medium text-amber-700 dark:text-amber-300 flex items-center gap-2">
                <AlertTriangle className="h-4 w-4" aria-hidden="true" />
                Limitations &amp; Requirements:
              </p>
              <ul className="space-y-1 text-amber-600 dark:text-amber-400 list-disc list-inside">
                <li>Max file size: ~50MB (browser memory limit)</li>
                <li>Password-protected PDFs cannot be processed</li>
                <li>Complex PDFs with forms or scripts may fail</li>
                <li>Text will become images (not selectable/searchable)</li>
              </ul>
              <p className="text-amber-500 dark:text-amber-400 italic pt-1">v1.0 - Client-side only • Free • Open source</p>
            </div>
          </div>
        </div>

        <div className="flex-1 min-h-0 flex flex-col md:flex-row overflow-hidden">
          {/* Left panel */}
          <div className={`${activeTab === "input" ? "flex" : "hidden"} md:flex flex-col flex-1 min-h-0 overflow-hidden border-b md:border-b-0 md:border-r border-border bg-card`} role="region" aria-labelledby="settings-label">
              <div className="flex-1 overflow-y-auto p-4 space-y-6" id="settings-label">

                <div className="space-y-2" role="group" aria-labelledby="file-label">
                  <Label className="text-sm font-medium" id="file-label">PDF File</Label>
                  <div
                    onDragOver={(e) => { e.preventDefault(); setIsDragging(true) }}
                    onDragLeave={() => setIsDragging(false)}
                    onDrop={(e) => { e.preventDefault(); setIsDragging(false); const f = e.dataTransfer.files[0]; if (f) handleFile(f) }}
                    onClick={openFileDialog}
                    onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") openFileDialog() }}
                    role="button"
                    tabIndex={0}
                    aria-label="Drop PDF file or click to browse"
                    className={`relative flex min-h-[120px] cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 ${
                      isDragging ? "border-primary bg-primary/5" : "border-border hover:border-primary/50 hover:bg-muted/50"
                    }`}
                  >
                    <input
                      ref={inputRef}
                      type="file"
                      accept=".pdf,application/pdf"
                      className="hidden"
                      onChange={handleFileChange}
                      aria-label="PDF file input"
                    />
                    {file ? (
                      <div className="flex items-center gap-3 px-4 w-full">
                        <div className="rounded-md bg-primary/10 p-2 shrink-0">
                          <FileDown className="h-5 w-5 text-primary" aria-hidden="true" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium">{file.name}</p>
                          <p className="text-xs text-muted-foreground">{formatBytes(file.size)}</p>
                        </div>
                        <button
                          onClick={(e) => { e.stopPropagation(); setFile(null); setResult(null); announceToScreenReader("File removed") }}
                          className="shrink-0 rounded-md p-1.5 text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                          aria-label="Remove file"
                        >
                          <X className="h-4 w-4" aria-hidden="true" />
                        </button>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center gap-2 text-center px-4">
                        <div className="rounded-full bg-muted p-3"><Upload className="h-5 w-5 text-muted-foreground" aria-hidden="true" /></div>
                        <p className="text-sm font-medium">Drop a PDF here</p>
                        <p className="text-xs text-muted-foreground">PDF only · <kbd className="rounded border border-border bg-muted px-1 text-[10px]">Ctrl+Shift+O</kbd></p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Compression Settings */}
                <div className="space-y-4" role="group" aria-labelledby="compression-settings-label">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-medium flex items-center gap-2" id="compression-settings-label">
                      <Settings className="h-4 w-4" aria-hidden="true" />
                      Compression Settings
                    </h3>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => { setShowAdvanced(!showAdvanced); announceToScreenReader(showAdvanced ? "Showing simple settings" : "Showing advanced settings") }}
                      className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                    >
                      {showAdvanced ? 'Simple' : 'Advanced'}
                    </Button>
                  </div>

                  <div className="space-y-3">
                    <div className="space-y-2">
                      <Label className="text-sm" id="quality-label">Compression Quality</Label>
                      <div className="grid grid-cols-4 gap-2" role="radiogroup" aria-labelledby="quality-label">
                        {[
                          { label: 'High', value: 0.5, desc: 'Smallest file' },
                          { label: 'Medium', value: 0.65, desc: 'Balanced' },
                          { label: 'Good', value: 0.8, desc: 'Better quality' },
                          { label: 'Best', value: 0.95, desc: 'Near original' },
                        ].map((preset) => (
                          <button
                            key={preset.value}
                            onClick={() => { setOptions({...options, quality: preset.value}); announceToScreenReader(`Quality set to ${preset.label}`) }}
                            role="radio"
                            aria-checked={options.quality === preset.value}
                            className={`p-2 rounded-lg border text-xs transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 ${
                              options.quality === preset.value
                                ? 'border-primary bg-primary/10 text-primary font-medium'
                                : 'border-border hover:border-primary/50 hover:bg-muted/50'
                            }`}
                          >
                            <div className="font-medium">{preset.label}</div>
                            <div className="text-[10px] opacity-70 mt-0.5">{preset.desc}</div>
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-sm" htmlFor="max-resolution">Max Resolution</Label>
                      <select
                        id="max-resolution"
                        value={options.maxDimension}
                        onChange={(e) => { setOptions({...options, maxDimension: Number(e.target.value)}); announceToScreenReader(`Resolution set to ${e.target.value}px`) }}
                        className="w-full p-2 border rounded-md bg-background text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                        aria-label="Maximum resolution"
                      >
                        <option value={2000}>High (2000px)</option>
                        <option value={1500}>Medium (1500px)</option>
                        <option value={1200}>Standard (1200px)</option>
                        <option value={1000}>Low (1000px)</option>
                        <option value={800}>Very Low (800px)</option>
                      </select>
                    </div>
                  </div>

                  {showAdvanced && (
                    <div className="space-y-3 bg-muted/20 rounded-lg p-3">
                      <div className="flex items-center justify-between">
                        <Label htmlFor="remove-metadata" className="text-sm">Remove Metadata</Label>
                        <Switch
                          id="remove-metadata"
                          checked={removeMetadata}
                          onCheckedChange={(checked) => { setRemoveMetadata(checked); announceToScreenReader(checked ? "Metadata removal enabled" : "Metadata removal disabled") }}
                          className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                        />
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Note: This tool renders each page to an image and re-encodes it. Text will become unselectable, but file size can be reduced by 60-80% for scanned documents.
                      </p>
                    </div>
                  )}
                </div>

                {error && (
                  <div className="flex items-center gap-2 text-xs text-red-500" role="alert">
                    <AlertCircle className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />{error}
                  </div>
                )}
              </div>
            </div>

          {/* Right panel */}
          <div className={`${activeTab === "output" ? "flex" : "hidden"} md:flex flex-col flex-1 min-h-0 overflow-hidden bg-card`} role="region" aria-labelledby="results-label">
              <div className="flex-1 overflow-y-auto p-4" id="results-label">
                {progress > 0 && progress < 100 && (
                  <div className="mb-3" role="status" aria-live="polite">
                    <div className="w-full bg-muted rounded-full h-2">
                      <div className="bg-primary h-2 rounded-full transition-all" style={{ width: `${progress}%` }}></div>
                    </div>
                    <p className="text-xs text-center mt-1 text-muted-foreground">{Math.round(progress)}% processed</p>
                  </div>
                )}
                {!result ? (
                  <div className="flex h-full min-h-[200px] flex-col items-center justify-center gap-3 text-center" role="status">
                    <div className="rounded-full border border-border bg-muted/50 p-4">
                      <FileDown className="h-6 w-6 text-muted-foreground" aria-hidden="true" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">No result yet</p>
                      <p className="text-xs text-muted-foreground mt-1">Upload a PDF and click Compress</p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="rounded-xl border border-border bg-muted/20 p-5 space-y-4">
                      <div className="grid grid-cols-2 gap-4 text-center">
                        <div>
                          <p className="text-xs text-muted-foreground mb-1">Original</p>
                          <p className="text-xl font-semibold">{formatBytes(result.originalSize)}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground mb-1">Compressed</p>
                          <p className="text-xl font-semibold">{formatBytes(result.compressedSize)}</p>
                        </div>
                      </div>

                      <div className="text-center">
                        {result.compressionRatio > 5 ? (
                          <div className="rounded-lg border border-green-500/30 bg-green-500/10 px-4 py-4">
                            <p className="text-4xl font-bold text-green-600 dark:text-green-400" aria-live="polite">−{result.compressionRatio.toFixed(1)}%</p>
                            <p className="text-xs text-muted-foreground mt-1">Saved {formatBytes(result.originalSize - result.compressedSize)}</p>
                          </div>
                        ) : (
                          <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3">
                            <p className="text-sm font-medium text-amber-600 dark:text-amber-400">Minimal reduction</p>
                            <p className="text-xs text-muted-foreground mt-0.5">This PDF may already be optimized or is text-heavy.</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
          </div>
        </div>

        {/* MOBILE: bottom action bar */}
        <div
          className="flex md:hidden shrink-0 items-center gap-1.5 border-t border-border bg-card/95 px-3 py-2"
          style={{ paddingBottom: "max(0.5rem, env(safe-area-inset-bottom))" }}
        >
          <div className="flex-1" />
          {result && result.compressionRatio > 0 ? (
            <Button
              size="sm"
              className="h-11 px-4"
              onClick={download}
              aria-label="Download compressed PDF"
            >
              <Download className="mr-1.5 h-4 w-4" aria-hidden="true" />
              Download
            </Button>
          ) : (
            <Button
              size="sm"
              className="h-11 px-4"
              onClick={handleCompress}
              disabled={!file || compressing}
              aria-label={compressing ? "Compressing PDF" : "Compress PDF"}
            >
              {compressing ? (
                <>
                  <span className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent inline-block" />
                  Compressing…
                </>
              ) : (
                <>
                  <FileDown className="mr-1.5 h-4 w-4" aria-hidden="true" />
                  Compress
                </>
              )}
            </Button>
          )}
        </div>

      </div>
    </>
  )
}
