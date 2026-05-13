"use client"

import { useState, useCallback, useEffect } from "react"
import { Upload, Download, Trash2, Check } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Slider } from "@/components/ui/slider"
import { Switch } from "@/components/ui/switch"
import { ShortcutsModal } from "@/components/shortcuts-modal"
import JSZip from "jszip"

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

interface ImgFile { id: string; file: File; url: string; name: string }
type OutputFormat = "jpeg" | "png" | "webp"

function processImage(file: File, ops: {
  resize: boolean; maxWidth: number; maxHeight: number
  quality: number; format: OutputFormat
  grayscale: boolean; brightness: number; contrast: number
}): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => {
      let { width: w, height: h } = img
      if (ops.resize) {
        const scale = Math.min(ops.maxWidth / w, ops.maxHeight / h, 1)
        w = Math.round(w * scale); h = Math.round(h * scale)
      }
      const canvas = document.createElement("canvas")
      canvas.width = w; canvas.height = h
      const ctx = canvas.getContext("2d")!
      const filters: string[] = []
      if (ops.grayscale) filters.push("grayscale(100%)")
      if (ops.brightness !== 100) filters.push(`brightness(${ops.brightness}%)`)
      if (ops.contrast !== 100) filters.push(`contrast(${ops.contrast}%)`)
      if (filters.length) ctx.filter = filters.join(" ")
      ctx.drawImage(img, 0, 0, w, h)
      const mime = `image/${ops.format}`
      const q = ops.format === "png" ? undefined : ops.quality / 100
      canvas.toBlob(b => b ? resolve(b) : reject(new Error("Failed")), mime, q)
    }
    img.onerror = reject
    img.src = URL.createObjectURL(file)
  })
}

export default function BatchImageEditor() {
  const [images, setImages] = useState<ImgFile[]>([])
  const [format, setFormat] = useState<OutputFormat>("jpeg")
  const [quality, setQuality] = useState(85)
  const [resize, setResize] = useState(false)
  const [maxWidth, setMaxWidth] = useState(1920)
  const [maxHeight, setMaxHeight] = useState(1080)
  const [grayscale, setGrayscale] = useState(false)
  const [brightness, setBrightness] = useState(100)
  const [contrast, setContrast] = useState(100)
  const [loading, setLoading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [done, setDone] = useState(false)

  const add = useCallback((files: FileList | null) => {
    if (!files) return
    const imageFiles = Array.from(files).filter(f => f.type.startsWith("image/"))
    if (imageFiles.length === 0) {
      announceToScreenReader('No valid image files selected')
      return
    }
    setImages(prev => [
      ...prev,
      ...imageFiles.map(f => ({
        id: crypto.randomUUID(), file: f, url: URL.createObjectURL(f), name: f.name,
      })),
    ])
    setDone(false)
    announceToScreenReader(`${imageFiles.length} image${imageFiles.length !== 1 ? 's' : ''} added`)
  }, [])

  const remove = useCallback((id: string) => {
    setImages(prev => { 
      const img = prev.find(i => i.id === id)
      if (img) {
        URL.revokeObjectURL(img.url)
        announceToScreenReader(`Removed ${img.name}`)
      }
      return prev.filter(i => i.id !== id) 
    })
  }, [])

  const clearAll = useCallback(() => {
    images.forEach(img => URL.revokeObjectURL(img.url))
    setImages([])
    setDone(false)
    announceToScreenReader('All images cleared')
  }, [images])

  const process = useCallback(async () => {
    if (!images.length) {
      announceToScreenReader('Please add images first')
      return
    }
    setLoading(true); setProgress(0); setDone(false)
    announceToScreenReader(`Processing ${images.length} images...`)
    const zip = new JSZip()
    const ops = { resize, maxWidth, maxHeight, quality, format, grayscale, brightness, contrast }

    for (let i = 0; i < images.length; i++) {
      const img = images[i]
      const blob = await processImage(img.file, ops)
      const ext = format === "jpeg" ? "jpg" : format
      const name = img.name.replace(/\.[^.]+$/, "") + "." + ext
      zip.file(name, blob)
      const currentProgress = Math.round(((i + 1) / images.length) * 100)
      setProgress(currentProgress)
      if (currentProgress % 25 === 0) {
        announceToScreenReader(`${currentProgress}% complete`)
      }
    }

    const blob = await zip.generateAsync({ type: "blob" })
    const url = URL.createObjectURL(blob)
    const a = Object.assign(document.createElement("a"), {
      href: url, download: "batch-edited-images.zip",
    })
    a.click()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
    setLoading(false); setDone(true)
    announceToScreenReader('Processing complete. ZIP file downloaded.')
  }, [images, resize, maxWidth, maxHeight, quality, format, grayscale, brightness, contrast])

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return
      
      // Ctrl+Shift+O to add images
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === "o") {
        e.preventDefault()
        e.stopPropagation()
        const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement
        fileInput?.click()
      }
      
      // Ctrl+Enter to process
      if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
        e.preventDefault()
        e.stopPropagation()
        if (images.length && !loading) {
          process()
        }
      }
      
      // Ctrl+Shift+C to clear all
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === "c") {
        e.preventDefault()
        e.stopPropagation()
        if (images.length) {
          clearAll()
        }
      }
    }
    window.addEventListener("keydown", handleKeyDown, true)
    return () => window.removeEventListener("keydown", handleKeyDown, true)
  }, [images.length, loading, process, clearAll])

  return (
    <>
    <div className="flex h-full flex-col gap-3 p-4">
      <div className="flex items-start justify-between" role="banner">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight" id="batch-title">Batch Image Editor</h2>
          <p className="text-muted-foreground" id="batch-description">Apply the same edits to multiple images and download as a ZIP. All in your browser. Press ? for keyboard shortcuts.</p>
        </div>
        <Button 
          onClick={process} 
          disabled={!images.length || loading}
          aria-label={loading ? `Processing ${progress} percent complete` : done ? "Processing done" : `Process ${images.length} images`}
        >
          {loading ? <span className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent inline-block" aria-hidden="true" /> : done ? <Check className="h-4 w-4 mr-1" aria-hidden="true" /> : <Download className="h-4 w-4 mr-1" aria-hidden="true" />}
          {loading ? `Processing… ${progress}%` : done ? "Done!" : `Process ${images.length} image${images.length !== 1 ? "s" : ""}`}
          {!loading && !done && <kbd className="ml-2 rounded border border-primary-foreground/30 bg-primary-foreground/20 px-1 text-[10px]" aria-hidden="true">Ctrl+Enter</kbd>}
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 flex-1 min-h-0">
        {/* Left — Settings */}
        <div className="flex flex-col overflow-hidden rounded-xl border border-border bg-card min-w-0" role="region" aria-label="Edit settings">
          <div className="shrink-0 border-b border-border px-4 py-3">
            <span className="text-sm font-medium">Edit Settings</span>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-5">
            {/* Format & Quality */}
            <div className="space-y-3" role="group" aria-label="Output format selection">
              <Label className="text-sm font-medium" id="format-label">Output Format</Label>
              <div className="flex gap-2" role="radiogroup" aria-labelledby="format-label">
                {(["jpeg", "png", "webp"] as OutputFormat[]).map(f => (
                  <button 
                    key={f} 
                    onClick={() => {
                      setFormat(f)
                      announceToScreenReader(`Output format set to ${f.toUpperCase()}`)
                    }}
                    className={`text-xs px-3 py-1 rounded-full border uppercase transition-colors focus:outline-none focus:ring-2 focus:ring-primary ${format === f ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground"}`}
                    role="radio"
                    aria-checked={format === f}
                    aria-label={f.toUpperCase()}
                  >
                    {f}
                  </button>
                ))}
              </div>
              {format !== "png" && (
                <div className="space-y-1.5">
                  <div className="flex justify-between">
                    <Label className="text-xs text-muted-foreground" id="quality-label">Quality</Label>
                    <span className="text-xs font-mono text-muted-foreground" aria-live="polite">{quality}%</span>
                  </div>
                  <Slider 
                    value={[quality]} 
                    onValueChange={([v]) => {
                      setQuality(v)
                      if (v % 20 === 0) announceToScreenReader(`Quality set to ${v} percent`)
                    }} 
                    min={10} 
                    max={100} 
                    step={5} 
                    aria-labelledby="quality-label"
                  />
                </div>
              )}
            </div>

            {/* Resize */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-medium" id="resize-label">Resize</Label>
                <Switch 
                  checked={resize} 
                  onCheckedChange={(v) => {
                    setResize(v)
                    announceToScreenReader(v ? 'Resize enabled' : 'Resize disabled')
                  }}
                  aria-labelledby="resize-label"
                />
              </div>
              {resize && (
                <div className="space-y-2">
                  {[
                    { label: "Max width", value: maxWidth, set: setMaxWidth },
                    { label: "Max height", value: maxHeight, set: setMaxHeight },
                  ].map(({ label, value, set }) => (
                    <div key={label} className="flex items-center gap-2">
                      <Label className="text-xs text-muted-foreground w-20 shrink-0">{label}</Label>
                      <input 
                        type="number" 
                        value={value} 
                        onChange={e => set(parseInt(e.target.value) || 1920)}
                        className="flex-1 px-2 py-1 border border-border rounded text-xs font-mono bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                        aria-label={label}
                      />
                    </div>
                  ))}
                  <p className="text-xs text-muted-foreground">Scales down proportionally, never upscales</p>
                </div>
              )}
            </div>

            {/* Filters */}
            <div className="space-y-3" role="group" aria-label="Image filters">
              <Label className="text-sm font-medium">Filters</Label>
              <div className="flex items-center justify-between">
                <Label className="text-xs text-muted-foreground" id="grayscale-label">Grayscale</Label>
                <Switch 
                  checked={grayscale} 
                  onCheckedChange={(v) => {
                    setGrayscale(v)
                    announceToScreenReader(v ? 'Grayscale filter enabled' : 'Grayscale filter disabled')
                  }}
                  aria-labelledby="grayscale-label"
                />
              </div>
              {[
                { label: "Brightness", value: brightness, set: setBrightness, min: 0, max: 200 },
                { label: "Contrast", value: contrast, set: setContrast, min: 0, max: 200 },
              ].map(({ label, value, set, min, max }) => (
                <div key={label} className="space-y-1.5">
                  <div className="flex justify-between">
                    <Label className="text-xs text-muted-foreground" id={`${label.toLowerCase()}-label`}>{label}</Label>
                    <span className="text-xs font-mono text-muted-foreground" aria-live="polite">{value}%</span>
                  </div>
                  <Slider 
                    value={[value]} 
                    onValueChange={([v]) => {
                      set(v)
                      if (v === 100 || v % 50 === 0) announceToScreenReader(`${label} set to ${v} percent`)
                    }} 
                    min={min} 
                    max={max} 
                    step={5} 
                    aria-labelledby={`${label.toLowerCase()}-label`}
                  />
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right — Images */}
        <div className="flex flex-col overflow-hidden rounded-xl border border-border bg-card min-w-0" role="region" aria-label="Image gallery">
          <div className="shrink-0 border-b border-border px-4 py-3 flex items-center justify-between">
            <h3 className="text-sm font-medium" aria-live="polite" aria-atomic="true">{images.length} image{images.length !== 1 ? "s" : ""}</h3>
            <div className="flex gap-2">
              {images.length > 0 && (
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={clearAll}
                  aria-label="Clear all images"
                >
                  Clear all{images.length > 0 && <kbd className="ml-1 rounded border border-border bg-muted px-1 text-[10px]" aria-hidden="true">Ctrl+Shift+C</kbd>}
                </Button>
              )}
              <>
                <input 
                  type="file" 
                  id="image-upload"
                  accept="image/*" 
                  multiple 
                  className="hidden" 
                  onChange={e => add(e.target.files)}
                  aria-label="Add images"
                />
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => {
                    const fileInput = document.getElementById('image-upload') as HTMLInputElement
                    fileInput?.click()
                  }}
                  aria-label="Add images"
                >
                  <Upload className="h-4 w-4 mr-1" aria-hidden="true" />Add Images <kbd className="ml-1 rounded border border-border bg-muted px-1 text-[10px]" aria-hidden="true">Ctrl+O</kbd>
                </Button>
              </>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto p-4">
            {images.length === 0 ? (
              <div 
                className="flex flex-col items-center justify-center h-full cursor-pointer border-2 border-dashed border-border rounded-xl hover:border-primary/50 transition-colors focus:outline-none focus:ring-2 focus:ring-primary"
                onClick={() => {
                  const fileInput = document.getElementById('image-upload') as HTMLInputElement
                  fileInput?.click()
                }}
                role="button"
                tabIndex={0}
                aria-label="Click to add images"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    const fileInput = document.getElementById('image-upload') as HTMLInputElement
                    fileInput?.click()
                  }
                }}
              >
                <Upload className="h-10 w-10 text-muted-foreground/40 mb-3" aria-hidden="true" />
                <p className="text-sm font-medium">Click to add images</p>
                <p className="text-xs text-muted-foreground mt-1">Batch process up to hundreds of images · <kbd className="rounded border border-border bg-muted px-1 text-[10px]" aria-hidden="true">Ctrl+O</kbd></p>
                <span className="sr-only">Press Control plus O to browse for images</span>
              </div>
            ) : (
              <div className="grid grid-cols-4 gap-3" role="list" aria-label="Selected images">
                {images.map(img => (
                  <div 
                    key={img.id} 
                    className="group relative rounded-lg border border-border overflow-hidden"
                    role="listitem"
                  >
                    <img src={img.url} alt={`Preview of ${img.name}`} className="w-full h-24 object-cover" />
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <button 
                        onClick={() => remove(img.id)} 
                        className="p-1.5 bg-red-500/70 rounded hover:bg-red-500 transition-colors focus:outline-none focus:ring-2 focus:ring-white"
                        aria-label={`Remove ${img.name}`}
                      >
                        <Trash2 className="h-3 w-3 text-white" aria-hidden="true" />
                      </button>
                    </div>
                    <div className="bg-background/90 px-2 py-1 text-xs truncate border-t border-border">{img.name}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
    <ShortcutsModal
      pageName="Batch Image Editor"
      shortcuts={[
        { keys: ["Ctrl", "O"], description: "Add images" },
        { keys: ["Ctrl", "Enter"], description: "Process and download ZIP" },
        { keys: ["Ctrl", "Shift", "C"], description: "Clear all images" },
        { keys: ["?"], description: "Toggle this shortcuts panel" },
        { keys: ["Tab"], description: "Navigate between controls" },
        { keys: ["Enter"], description: "Activate focused button" },
        { keys: ["Space"], description: "Activate focused button" },
      ]}
    />
    </>
  )
}
