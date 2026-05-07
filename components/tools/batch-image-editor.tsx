"use client"

import { useState } from "react"
import { Upload, Download, Trash2, Check } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Slider } from "@/components/ui/slider"
import { Switch } from "@/components/ui/switch"
import JSZip from "jszip"

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

  const add = (files: FileList | null) => {
    if (!files) return
    setImages(prev => [
      ...prev,
      ...Array.from(files).filter(f => f.type.startsWith("image/")).map(f => ({
        id: crypto.randomUUID(), file: f, url: URL.createObjectURL(f), name: f.name,
      })),
    ])
    setDone(false)
  }

  const remove = (id: string) =>
    setImages(prev => { const img = prev.find(i => i.id === id); if (img) URL.revokeObjectURL(img.url); return prev.filter(i => i.id !== id) })

  const process = async () => {
    if (!images.length) return
    setLoading(true); setProgress(0); setDone(false)
    const zip = new JSZip()
    const ops = { resize, maxWidth, maxHeight, quality, format, grayscale, brightness, contrast }

    for (let i = 0; i < images.length; i++) {
      const img = images[i]
      const blob = await processImage(img.file, ops)
      const ext = format === "jpeg" ? "jpg" : format
      const name = img.name.replace(/\.[^.]+$/, "") + "." + ext
      zip.file(name, blob)
      setProgress(Math.round(((i + 1) / images.length) * 100))
    }

    const blob = await zip.generateAsync({ type: "blob" })
    const a = Object.assign(document.createElement("a"), {
      href: URL.createObjectURL(blob), download: "batch-edited-images.zip",
    })
    a.click()
    setLoading(false); setDone(true)
  }

  return (
    <div className="h-full flex flex-col bg-background">
      <div className="shrink-0 border-b border-border bg-background">
        <div className="flex items-center justify-between px-6 py-4">
          <div>
            <h1 className="text-xl font-semibold">Batch Image Editor</h1>
            <p className="text-sm text-muted-foreground">Apply the same edits to multiple images and download as a ZIP. All in your browser.</p>
          </div>
          <Button onClick={process} disabled={!images.length || loading}>
            {done ? <Check className="h-4 w-4 mr-1" /> : <Download className="h-4 w-4 mr-1" />}
            {loading ? `Processing… ${progress}%` : done ? "Done!" : `Process ${images.length} image${images.length !== 1 ? "s" : ""}`}
          </Button>
        </div>
      </div>

      <div className="flex-1 flex flex-col md:flex-row overflow-y-auto md:overflow-hidden">
        {/* Left — Settings */}
        <div className="flex flex-col border-b md:border-b-0 md:border-r border-border md:w-72 md:shrink-0">
          <div className="p-3 border-b border-border bg-muted/30">
            <h3 className="text-sm font-medium">Edit Settings</h3>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-5">
            {/* Format & Quality */}
            <div className="space-y-3">
              <Label className="text-sm font-medium">Output Format</Label>
              <div className="flex gap-2">
                {(["jpeg", "png", "webp"] as OutputFormat[]).map(f => (
                  <button key={f} onClick={() => setFormat(f)}
                    className={`text-xs px-3 py-1 rounded-full border uppercase transition-colors ${format === f ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground"}`}>
                    {f}
                  </button>
                ))}
              </div>
              {format !== "png" && (
                <div className="space-y-1.5">
                  <div className="flex justify-between">
                    <Label className="text-xs text-muted-foreground">Quality</Label>
                    <span className="text-xs font-mono text-muted-foreground">{quality}%</span>
                  </div>
                  <Slider value={[quality]} onValueChange={([v]) => setQuality(v)} min={10} max={100} step={5} />
                </div>
              )}
            </div>

            {/* Resize */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-medium">Resize</Label>
                <Switch checked={resize} onCheckedChange={setResize} />
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
                        className="flex-1 px-2 py-1 border border-border rounded text-xs font-mono bg-background" />
                    </div>
                  ))}
                  <p className="text-xs text-muted-foreground">Scales down proportionally, never upscales</p>
                </div>
              )}
            </div>

            {/* Filters */}
            <div className="space-y-3">
              <Label className="text-sm font-medium">Filters</Label>
              <div className="flex items-center justify-between">
                <Label className="text-xs text-muted-foreground">Grayscale</Label>
                <Switch checked={grayscale} onCheckedChange={setGrayscale} />
              </div>
              {[
                { label: "Brightness", value: brightness, set: setBrightness, min: 0, max: 200 },
                { label: "Contrast", value: contrast, set: setContrast, min: 0, max: 200 },
              ].map(({ label, value, set, min, max }) => (
                <div key={label} className="space-y-1.5">
                  <div className="flex justify-between">
                    <Label className="text-xs text-muted-foreground">{label}</Label>
                    <span className="text-xs font-mono text-muted-foreground">{value}%</span>
                  </div>
                  <Slider value={[value]} onValueChange={([v]) => set(v)} min={min} max={max} step={5} />
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right — Images */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="p-3 border-b border-border bg-muted/30 flex items-center justify-between">
            <h3 className="text-sm font-medium">{images.length} image{images.length !== 1 ? "s" : ""}</h3>
            <div className="flex gap-2">
              {images.length > 0 && <Button variant="ghost" size="sm" onClick={() => setImages([])}>Clear all</Button>}
              <label className="cursor-pointer">
                <input type="file" accept="image/*" multiple className="hidden" onChange={e => add(e.target.files)} />
                <Button variant="outline" size="sm" asChild>
                  <span><Upload className="h-4 w-4 mr-1" />Add Images</span>
                </Button>
              </label>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto p-4">
            {images.length === 0 ? (
              <label className="flex flex-col items-center justify-center h-full cursor-pointer border-2 border-dashed border-border rounded-xl hover:border-primary/50 transition-colors">
                <input type="file" accept="image/*" multiple className="hidden" onChange={e => add(e.target.files)} />
                <Upload className="h-10 w-10 text-muted-foreground/40 mb-3" />
                <p className="text-sm font-medium">Click to add images</p>
                <p className="text-xs text-muted-foreground mt-1">Batch process up to hundreds of images</p>
              </label>
            ) : (
              <div className="grid grid-cols-4 gap-3">
                {images.map(img => (
                  <div key={img.id} className="group relative rounded-lg border border-border overflow-hidden">
                    <img src={img.url} alt={img.name} className="w-full h-24 object-cover" />
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <button onClick={() => remove(img.id)} className="p-1.5 bg-red-500/70 rounded hover:bg-red-500 transition-colors">
                        <Trash2 className="h-3 w-3 text-white" />
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
  )
}
