"use client"

import { useState, useCallback, useEffect } from "react"
import { Upload, Download, Trash2, Check } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Slider } from "@/components/ui/slider"
import { Switch } from "@/components/ui/switch"
import { ShortcutsModal } from "@/components/shortcuts-modal"
import JSZip from "jszip"

function announceToScreenReader(message: string) {
  const el = document.createElement("div")
  el.setAttribute("role", "status")
  el.setAttribute("aria-live", "polite")
  el.setAttribute("aria-atomic", "true")
  el.className = "sr-only"
  el.textContent = message
  document.body.appendChild(el)
  setTimeout(() => document.body.removeChild(el), 1000)
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
  const [activeTab, setActiveTab] = useState<"input" | "output">("input")

  const triggerUpload = () => {
    (document.getElementById("image-upload") as HTMLInputElement)?.click()
  }

  const add = useCallback((files: FileList | null) => {
    if (!files) return
    const imageFiles = Array.from(files).filter(f => f.type.startsWith("image/"))
    if (imageFiles.length === 0) { announceToScreenReader("No valid image files selected"); return }
    setImages(prev => [
      ...prev,
      ...imageFiles.map(f => ({ id: crypto.randomUUID(), file: f, url: URL.createObjectURL(f), name: f.name })),
    ])
    setDone(false)
    announceToScreenReader(`${imageFiles.length} image${imageFiles.length !== 1 ? "s" : ""} added`)
  }, [])

  const remove = useCallback((id: string) => {
    setImages(prev => {
      const img = prev.find(i => i.id === id)
      if (img) { URL.revokeObjectURL(img.url); announceToScreenReader(`Removed ${img.name}`) }
      return prev.filter(i => i.id !== id)
    })
  }, [])

  const clearAll = useCallback(() => {
    images.forEach(img => URL.revokeObjectURL(img.url))
    setImages([]); setDone(false)
    announceToScreenReader("All images cleared")
  }, [images])

  const process = useCallback(async () => {
    if (!images.length) { announceToScreenReader("Please add images first"); return }
    setLoading(true); setProgress(0); setDone(false)
    announceToScreenReader(`Processing ${images.length} images...`)
    const zip = new JSZip()
    const ops = { resize, maxWidth, maxHeight, quality, format, grayscale, brightness, contrast }

    for (let i = 0; i < images.length; i++) {
      const img = images[i]
      const blob = await processImage(img.file, ops)
      const ext = format === "jpeg" ? "jpg" : format
      zip.file(img.name.replace(/\.[^.]+$/, "") + "." + ext, blob)
      const p = Math.round(((i + 1) / images.length) * 100)
      setProgress(p)
      if (p % 25 === 0) announceToScreenReader(`${p}% complete`)
    }

    const blob = await zip.generateAsync({ type: "blob" })
    const url = URL.createObjectURL(blob)
    Object.assign(document.createElement("a"), { href: url, download: "batch-edited-images.zip" }).click()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
    setLoading(false); setDone(true)
    setActiveTab("output")
    announceToScreenReader("Processing complete. ZIP file downloaded.")
  }, [images, resize, maxWidth, maxHeight, quality, format, grayscale, brightness, contrast])

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
      if (!(e.ctrlKey || e.metaKey)) return
    }
    if ((e.ctrlKey || e.metaKey) && e.shiftKey) {
      switch (e.key.toLowerCase()) {
        case "u": e.preventDefault(); triggerUpload(); return
        case "x": e.preventDefault(); if (images.length) clearAll(); return
      }
    }
    if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
      e.preventDefault()
      if (images.length && !loading) process()
    }
  }, [images.length, loading, process, clearAll])

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [handleKeyDown])

  const shortcuts = [
    { keys: ["Ctrl", "Shift", "U"], description: "Add images" },
    { keys: ["Ctrl", "Enter"], description: "Process and download ZIP" },
    { keys: ["Ctrl", "Shift", "X"], description: "Clear all images" },
    { keys: ["?"], description: "Toggle shortcuts panel" },
  ]

  return (
    <div className="flex flex-1 flex-col min-h-0">

      {/* ── Desktop top action bar ── */}
      <div className="hidden md:flex shrink-0 items-center gap-2 border-b border-border bg-card/95 backdrop-blur-sm px-4 py-2" role="toolbar" aria-label="Batch image editor controls">
        <span className="text-sm font-semibold shrink-0 mr-1">Batch Image Editor</span>
        <div className="ml-auto flex items-center gap-1.5">
          <ShortcutsModal pageName="Batch Image Editor" shortcuts={shortcuts} />
          <Button size="sm" onClick={process} disabled={!images.length || loading}
            aria-label={loading ? `Processing ${progress} percent complete` : done ? "Processing done" : `Process ${images.length} images`}>
            {loading
              ? <><span className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent inline-block" aria-hidden="true" />Processing… {progress}%</>
              : done
                ? <><Check className="h-4 w-4 mr-1" aria-hidden="true" />Done!</>
                : <><Download className="h-4 w-4 mr-1" aria-hidden="true" />Download All<kbd className="ml-1 hidden md:inline rounded border border-primary-foreground/30 bg-primary-foreground/20 px-1 text-[10px]" aria-hidden="true">Ctrl+Enter</kbd></>
            }
          </Button>
        </div>
      </div>

      {/* ── Mobile: compact header + tab switcher ── */}
      <div className="flex md:hidden flex-col shrink-0 border-b border-border">
        <div className="flex items-center justify-between px-4 pt-3 pb-2">
          <h2 className="text-base font-semibold">Batch Image Editor</h2>
          <ShortcutsModal pageName="Batch Image Editor" shortcuts={shortcuts} />
        </div>
        <div className="flex" role="tablist" aria-label="Panel selection">
          <button role="tab" aria-selected={activeTab === "input"} onClick={() => setActiveTab("input")}
            className={`flex-1 py-2.5 text-sm font-medium border-b-2 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-inset ${activeTab === "input" ? "border-primary text-foreground" : "border-transparent text-muted-foreground"}`}>
            Settings
          </button>
          <button role="tab" aria-selected={activeTab === "output"} onClick={() => setActiveTab("output")}
            className={`flex-1 py-2.5 text-sm font-medium border-b-2 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-inset ${activeTab === "output" ? "border-primary text-foreground" : "border-transparent text-muted-foreground"}`}>
            Preview{images.length > 0 && ` (${images.length})`}
          </button>
        </div>
      </div>

      {/* ── Scrollable content ── */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">

        {/* Panels card */}
        <div className="flex flex-col md:flex-row min-h-[500px] rounded-xl border border-border overflow-hidden">

          {/* Left: Upload + Settings */}
          <div
            className={`${activeTab === "input" ? "flex" : "hidden"} md:flex flex-col flex-1 min-h-0 overflow-hidden border-b md:border-b-0 md:border-r border-border bg-card`}
            role="region" aria-label="Upload and settings"
          >
            <div className="shrink-0 border-b border-border px-4 py-3">
              <span className="text-sm font-medium">Upload &amp; Settings</span>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-5">

              {/* Upload */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">Images</Label>
                <input type="file" id="image-upload" accept="image/*" multiple className="hidden"
                  onChange={e => add(e.target.files)} aria-label="Add images" />
                <div
                  onClick={triggerUpload}
                  onKeyDown={e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); triggerUpload() } }}
                  role="button" tabIndex={0}
                  aria-label={images.length ? `${images.length} image${images.length !== 1 ? "s" : ""} added. Click to add more.` : "Click to add images"}
                  className="flex items-center justify-between rounded-lg border-2 border-dashed border-border px-4 py-3 cursor-pointer hover:border-primary/50 hover:bg-muted/30 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <Upload className="h-4 w-4 text-muted-foreground shrink-0" aria-hidden="true" />
                    <span className="text-sm text-muted-foreground truncate">
                      {images.length ? `${images.length} image${images.length !== 1 ? "s" : ""} added — click to add more` : "Click or drop images here"}
                    </span>
                  </div>
                  <kbd className="ml-2 hidden md:inline rounded border border-border bg-muted px-1 text-[10px] shrink-0" aria-hidden="true">Ctrl+Shift+U</kbd>
                </div>
                {images.length > 0 && (
                  <Button variant="ghost" size="sm" onClick={clearAll}
                    className="text-muted-foreground hover:text-destructive w-full justify-start pl-0"
                    aria-label={`Clear all ${images.length} images`}>
                    <Trash2 className="h-3.5 w-3.5 mr-1.5" aria-hidden="true" />
                    Clear all {images.length} image{images.length !== 1 ? "s" : ""}
                    <kbd className="ml-auto hidden md:inline rounded border border-border bg-muted px-1 text-[10px]" aria-hidden="true">Ctrl+Shift+X</kbd>
                  </Button>
                )}
              </div>

              {/* Format & Quality */}
              <div className="space-y-3" role="group" aria-label="Output format selection">
                <Label className="text-sm font-medium" id="format-label">Output Format</Label>
                <div className="flex gap-2" role="radiogroup" aria-labelledby="format-label">
                  {(["jpeg", "png", "webp"] as OutputFormat[]).map(f => (
                    <button key={f}
                      onClick={() => { setFormat(f); announceToScreenReader(`Output format set to ${f.toUpperCase()}`) }}
                      className={`text-xs px-3 py-1 rounded-full border uppercase transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${format === f ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground"}`}
                      role="radio" aria-checked={format === f} aria-label={f.toUpperCase()}>
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
                    <Slider value={[quality]} onValueChange={([v]) => { setQuality(v); if (v % 20 === 0) announceToScreenReader(`Quality set to ${v} percent`) }}
                      min={10} max={100} step={5} aria-labelledby="quality-label" />
                  </div>
                )}
              </div>

              {/* Resize */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-medium" id="resize-label">Resize</Label>
                  <Switch checked={resize} onCheckedChange={v => { setResize(v); announceToScreenReader(v ? "Resize enabled" : "Resize disabled") }}
                    aria-labelledby="resize-label" />
                </div>
                {resize && (
                  <div className="space-y-2">
                    {[
                      { label: "Max width", value: maxWidth, set: setMaxWidth },
                      { label: "Max height", value: maxHeight, set: setMaxHeight },
                    ].map(({ label, value, set }) => (
                      <div key={label} className="flex items-center gap-2">
                        <Label className="text-xs text-muted-foreground w-20 shrink-0">{label}</Label>
                        <input type="number" value={value} onChange={e => set(parseInt(e.target.value) || 1920)}
                          className="flex-1 px-2 py-1 border border-border rounded text-xs font-mono bg-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                          aria-label={label} />
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
                  <Switch checked={grayscale} onCheckedChange={v => { setGrayscale(v); announceToScreenReader(v ? "Grayscale filter enabled" : "Grayscale filter disabled") }}
                    aria-labelledby="grayscale-label" />
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
                    <Slider value={[value]} onValueChange={([v]) => { set(v); if (v === 100 || v % 50 === 0) announceToScreenReader(`${label} set to ${v} percent`) }}
                      min={min} max={max} step={5} aria-labelledby={`${label.toLowerCase()}-label`} />
                  </div>
                ))}
              </div>

            </div>
          </div>

          {/* Right: Image preview */}
          <div
            className={`${activeTab === "output" ? "flex" : "hidden"} md:flex flex-col flex-1 min-h-0 overflow-hidden bg-card`}
            role="region" aria-label="Image preview"
          >
            <div className="shrink-0 border-b border-border px-4 py-3">
              <span className="text-sm font-medium" aria-live="polite" aria-atomic="true">
                {images.length} image{images.length !== 1 ? "s" : ""}
              </span>
            </div>
            <div className="flex-1 overflow-y-auto p-4">
              {images.length === 0 ? (
                <div className="flex h-full min-h-[200px] flex-col items-center justify-center gap-3 text-center">
                  <div className="rounded-full border border-border bg-muted/50 p-4" aria-hidden="true">
                    <Upload className="h-6 w-6 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">No images added</p>
                    <p className="text-xs text-muted-foreground mt-1">Add images from the Settings panel</p>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-3 md:grid-cols-4 gap-3" role="list" aria-label="Selected images">
                  {images.map(img => (
                    <div key={img.id} className="group relative rounded-lg border border-border overflow-hidden" role="listitem">
                      <img src={img.url} alt={`Preview of ${img.name}`} className="w-full h-24 object-cover" />
                      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <button onClick={() => remove(img.id)}
                          className="p-1.5 bg-red-500/70 rounded hover:bg-red-500 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
                          aria-label={`Remove ${img.name}`}>
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

        {/* Usage guide */}
        <div className="rounded-xl border border-border bg-card p-4 space-y-4">
          <div className="space-y-1.5">
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">How to use</p>
            <ol className="space-y-1.5 text-xs text-muted-foreground list-decimal list-inside">
              <li>Click the upload area in the <span className="text-foreground font-medium">Settings</span> panel to add images. You can select multiple files at once.</li>
              <li>Choose an <span className="text-foreground font-medium">Output Format</span> (JPEG, PNG, or WebP) and set the quality if needed.</li>
              <li>Optionally enable <span className="text-foreground font-medium">Resize</span> to cap maximum dimensions, or apply <span className="text-foreground font-medium">Filters</span> such as grayscale, brightness, or contrast.</li>
              <li>Click <span className="text-foreground font-medium">Download All</span> to process every image and download them as a single ZIP file.</li>
            </ol>
          </div>
          <div className="space-y-1.5">
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">Tips</p>
            <ul className="space-y-1 text-xs text-muted-foreground list-disc list-inside">
              <li>PNG ignores the quality slider. PNG is lossless so quality has no effect.</li>
              <li>Resize only scales images down. Images already smaller than the max size are left at their original dimensions.</li>
              <li>Everything runs in your browser. Nothing is sent to a server.</li>
            </ul>
          </div>
        </div>

        <div className="md:hidden h-[60px]" aria-hidden="true" />
      </div>

      {/* ── Mobile: bottom action bar ── */}
      <div
        className="md:hidden fixed bottom-0 left-0 right-0 flex items-center gap-1.5 border-t border-border bg-card/95 backdrop-blur-sm px-3 py-2 z-20"
        style={{ paddingBottom: "max(0.5rem, env(safe-area-inset-bottom))" }}
      >
        <div className="flex-1" />
        <Button size="sm" className="h-11 px-4" onClick={process} disabled={!images.length || loading}
          aria-label={loading ? `Processing ${progress} percent complete` : done ? "Processing done" : `Process ${images.length} images`}>
          {loading
            ? <><span className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent inline-block" aria-hidden="true" />Processing… {progress}%</>
            : done
              ? <><Check className="h-4 w-4 mr-1" aria-hidden="true" />Done!</>
              : <><Download className="h-4 w-4 mr-1" aria-hidden="true" />Download All</>
          }
        </Button>
      </div>

    </div>
  )
}
