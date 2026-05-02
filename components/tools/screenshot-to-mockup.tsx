"use client"

import { useState, useCallback, useEffect, useRef } from "react"
import { Monitor, Smartphone, Laptop, Tablet, Upload, Download, X, ImageIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { ShortcutsModal } from "@/components/shortcuts-modal"

type Device = "browser" | "phone" | "laptop" | "tablet"
interface BgPreset { label: string; type: "solid" | "gradient"; c1: string; c2?: string }

const DEVICES = [
  { id: "browser" as Device, label: "Browser", icon: Monitor },
  { id: "phone"   as Device, label: "Phone",   icon: Smartphone },
  { id: "laptop"  as Device, label: "Laptop",  icon: Laptop },
  { id: "tablet"  as Device, label: "Tablet",  icon: Tablet },
]

const BG_PRESETS: BgPreset[] = [
  { label: "White",  type: "solid",    c1: "#ffffff" },
  { label: "Light",  type: "solid",    c1: "#f1f5f9" },
  { label: "Dark",   type: "solid",    c1: "#0f172a" },
  { label: "Black",  type: "solid",    c1: "#000000" },
  { label: "Purple", type: "gradient", c1: "#7c3aed", c2: "#3b82f6" },
  { label: "Sunset", type: "gradient", c1: "#f97316", c2: "#ec4899" },
  { label: "Ocean",  type: "gradient", c1: "#06b6d4", c2: "#3b82f6" },
  { label: "Forest", type: "gradient", c1: "#059669", c2: "#0891b2" },
  { label: "Rose",   type: "gradient", c1: "#f43f5e", c2: "#a855f7" },
  { label: "Gold",   type: "gradient", c1: "#f59e0b", c2: "#ef4444" },
]

const CANVAS_SIZES: Record<Device, [number, number]> = {
  browser: [1400, 880],
  phone:   [560, 1100],
  laptop:  [1400, 980],
  tablet:  [1200, 920],
}

function formatBytes(n: number) {
  if (n < 1024) return `${n} B`
  if (n < 1048576) return `${(n / 1024).toFixed(1)} KB`
  return `${(n / 1048576).toFixed(1)} MB`
}

// ── Canvas helpers ───────────────────────────────────────────────────────────
function rr(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  const rx = Math.min(r, w / 2), ry = Math.min(r, h / 2)
  ctx.beginPath()
  ctx.moveTo(x + rx, y); ctx.lineTo(x + w - rx, y); ctx.arcTo(x + w, y, x + w, y + ry, rx)
  ctx.lineTo(x + w, y + h - ry); ctx.arcTo(x + w, y + h, x + w - rx, y + h, ry)
  ctx.lineTo(x + rx, y + h); ctx.arcTo(x, y + h, x, y + h - ry, ry)
  ctx.lineTo(x, y + ry); ctx.arcTo(x, y, x + rx, y, rx)
  ctx.closePath()
}

function cover(ctx: CanvasRenderingContext2D, img: HTMLImageElement, x: number, y: number, w: number, h: number) {
  const ir = img.naturalWidth / img.naturalHeight, fr = w / h
  let sx = 0, sy = 0, sw = img.naturalWidth, sh = img.naturalHeight
  if (ir > fr) { sw = sh * fr; sx = (img.naturalWidth - sw) / 2 }
  else { sh = sw / fr; sy = (img.naturalHeight - sh) / 2 }
  ctx.drawImage(img, sx, sy, sw, sh, x, y, w, h)
}

function drawBg(ctx: CanvasRenderingContext2D, bg: BgPreset, w: number, h: number) {
  if (bg.type === "solid") {
    ctx.fillStyle = bg.c1
  } else {
    const g = ctx.createLinearGradient(0, 0, w, h)
    g.addColorStop(0, bg.c1); g.addColorStop(1, bg.c2!)
    ctx.fillStyle = g
  }
  ctx.fillRect(0, 0, w, h)
}

// ── Device drawers ───────────────────────────────────────────────────────────
function drawBrowser(ctx: CanvasRenderingContext2D, img: HTMLImageElement, shadow: boolean) {
  const fx = 90, fy = 60, fw = 1220, fh = 760, r = 10, hh = 52
  if (shadow) {
    ctx.save(); ctx.shadowColor = "rgba(0,0,0,0.3)"; ctx.shadowBlur = 50; ctx.shadowOffsetY = 20
    ctx.fillStyle = "#000"; rr(ctx, fx, fy, fw, fh, r); ctx.fill(); ctx.restore()
  }
  ctx.save(); rr(ctx, fx, fy, fw, fh, r); ctx.clip()
  ctx.fillStyle = "#1e1e1e"; ctx.fillRect(fx, fy, fw, fh)
  ctx.fillStyle = "#2d2d2d"; ctx.fillRect(fx, fy, fw, hh)
  const dots: [string, number][] = [["#ff5f57", fx+22], ["#ffbd2e", fx+44], ["#28c940", fx+66]]
  dots.forEach(([c, x]) => { ctx.beginPath(); ctx.arc(x, fy+hh/2, 9, 0, Math.PI*2); ctx.fillStyle = c; ctx.fill() })
  ctx.fillStyle = "#3a3a3a"; rr(ctx, fx+100, fy+11, fw-200, 30, 15); ctx.fill()
  cover(ctx, img, fx, fy+hh, fw, fh-hh)
  ctx.strokeStyle = "rgba(255,255,255,0.07)"; ctx.lineWidth = 1; rr(ctx, fx, fy, fw, fh, r); ctx.stroke()
  ctx.restore()
}

function drawPhone(ctx: CanvasRenderingContext2D, img: HTMLImageElement, shadow: boolean) {
  const fx = 60, fy = 50, fw = 440, fh = 1000, r = 50, bw = 18
  const sx = fx+bw, sy = fy+130, sw = fw-bw*2, sh = fh-130-80
  if (shadow) {
    ctx.save(); ctx.shadowColor = "rgba(0,0,0,0.3)"; ctx.shadowBlur = 40; ctx.shadowOffsetY = 15
    ctx.fillStyle = "#000"; rr(ctx, fx, fy, fw, fh, r); ctx.fill(); ctx.restore()
  }
  ctx.save(); rr(ctx, fx, fy, fw, fh, r); ctx.clip()
  ctx.fillStyle = "#111111"; ctx.fillRect(fx, fy, fw, fh)
  cover(ctx, img, sx, sy, sw, sh)
  ctx.fillStyle = "rgba(0,0,0,0.55)"; ctx.fillRect(sx, fy+bw, sw, 112)
  ctx.fillStyle = "#111111"; rr(ctx, fx+fw/2-70, fy+bw, 140, 34, 17); ctx.fill()
  ctx.beginPath(); ctx.arc(fx+fw/2+36, fy+bw+17, 6, 0, Math.PI*2); ctx.fillStyle = "#1a1a1a"; ctx.fill()
  ctx.fillStyle = "rgba(255,255,255,0.35)"; rr(ctx, fx+fw/2-65, fy+fh-40, 130, 5, 2.5); ctx.fill()
  ctx.strokeStyle = "rgba(255,255,255,0.06)"; ctx.lineWidth = 1.5; rr(ctx, fx, fy, fw, fh, r); ctx.stroke()
  ctx.restore()
}

function drawLaptop(ctx: CanvasRenderingContext2D, img: HTMLImageElement, shadow: boolean) {
  const sfx = 100, sfy = 50, sfw = 1200, sfh = 740, sr = 8
  const ssx = sfx+18, ssy = sfy+18, ssw = sfw-36, ssh = sfh-36
  const bfx = 70, bfy = sfy+sfh, bfw = 1260, bfh = 70
  if (shadow) {
    ctx.save(); ctx.shadowColor = "rgba(0,0,0,0.35)"; ctx.shadowBlur = 55; ctx.shadowOffsetY = 22
    ctx.fillStyle = "#000"; rr(ctx, sfx, sfy, sfw, sfh, sr); ctx.fill(); ctx.restore()
  }
  ctx.save(); rr(ctx, sfx, sfy, sfw, sfh, sr); ctx.clip()
  ctx.fillStyle = "#1a1a1a"; ctx.fillRect(sfx, sfy, sfw, sfh)
  cover(ctx, img, ssx, ssy, ssw, ssh)
  ctx.strokeStyle = "rgba(255,255,255,0.06)"; ctx.lineWidth = 1; rr(ctx, sfx, sfy, sfw, sfh, sr); ctx.stroke()
  ctx.restore()
  ctx.fillStyle = "#1c1c1c"
  ctx.beginPath()
  ctx.moveTo(bfx, bfy); ctx.lineTo(bfx+bfw, bfy); ctx.lineTo(bfx+bfw, bfy+bfh-8)
  ctx.arcTo(bfx+bfw, bfy+bfh, bfx+bfw-8, bfy+bfh, 8)
  ctx.lineTo(bfx+8, bfy+bfh); ctx.arcTo(bfx, bfy+bfh, bfx, bfy+bfh-8, 8)
  ctx.closePath(); ctx.fill()
  ctx.strokeStyle = "rgba(255,255,255,0.04)"; ctx.lineWidth = 1
  ctx.beginPath(); ctx.moveTo(bfx, bfy); ctx.lineTo(bfx+bfw, bfy); ctx.stroke()
}

function drawTablet(ctx: CanvasRenderingContext2D, img: HTMLImageElement, shadow: boolean) {
  const fx = 70, fy = 60, fw = 1060, fh = 800, r = 26, bw = 25
  const sx = fx+bw, sy = fy+bw, sw = fw-bw*2, sh = fh-bw*2
  if (shadow) {
    ctx.save(); ctx.shadowColor = "rgba(0,0,0,0.3)"; ctx.shadowBlur = 50; ctx.shadowOffsetY = 18
    ctx.fillStyle = "#000"; rr(ctx, fx, fy, fw, fh, r); ctx.fill(); ctx.restore()
  }
  ctx.save(); rr(ctx, fx, fy, fw, fh, r); ctx.clip()
  ctx.fillStyle = "#1a1a1a"; ctx.fillRect(fx, fy, fw, fh)
  cover(ctx, img, sx, sy, sw, sh)
  ctx.fillStyle = "rgba(0,0,0,0.3)"; ctx.fillRect(sx, sy, sw, 28)
  ctx.strokeStyle = "rgba(255,255,255,0.06)"; ctx.lineWidth = 1; rr(ctx, fx, fy, fw, fh, r); ctx.stroke()
  ctx.restore()
}

function renderMockup(canvas: HTMLCanvasElement, img: HTMLImageElement, device: Device, bg: BgPreset, shadow: boolean) {
  const [w, h] = CANVAS_SIZES[device]
  canvas.width = w; canvas.height = h
  const ctx = canvas.getContext("2d")!
  drawBg(ctx, bg, w, h)
  if (device === "browser") drawBrowser(ctx, img, shadow)
  else if (device === "phone") drawPhone(ctx, img, shadow)
  else if (device === "laptop") drawLaptop(ctx, img, shadow)
  else drawTablet(ctx, img, shadow)
}

// ── Component ────────────────────────────────────────────────────────────────
export function ScreenshotToMockup() {
  const [imageEl, setImageEl]   = useState<HTMLImageElement | null>(null)
  const [fileName, setFileName] = useState("")
  const [fileSize, setFileSize] = useState(0)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [device, setDevice]     = useState<Device>("browser")
  const [bgIndex, setBgIndex]   = useState(4)
  const [shadow, setShadow]     = useState(true)
  const [isDragging, setIsDragging] = useState(false)
  const inputRef  = useRef<HTMLInputElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  const handleFile = (f: File) => {
    if (!f.type.startsWith("image/")) return
    setFileName(f.name); setFileSize(f.size); setPreviewUrl(null)
    const url = URL.createObjectURL(f)
    const img = new Image()
    img.onload = () => setImageEl(img)
    img.src = url
  }

  useEffect(() => {
    if (!imageEl || !canvasRef.current) return
    const canvas = canvasRef.current
    renderMockup(canvas, imageEl, device, BG_PRESETS[bgIndex], shadow)
    setPreviewUrl(canvas.toDataURL("image/jpeg", 0.92))
  }, [imageEl, device, bgIndex, shadow])

  const download = useCallback(() => {
    if (!imageEl) return
    const canvas = document.createElement("canvas")
    renderMockup(canvas, imageEl, device, BG_PRESETS[bgIndex], shadow)
    canvas.toBlob((blob) => {
      if (!blob) return
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `mockup-${device}-${fileName.replace(/\.[^.]+$/, "")}.png`
      a.click(); setTimeout(() => URL.revokeObjectURL(url), 100)
    }, "image/png")
  }, [imageEl, device, bgIndex, shadow, fileName])

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if ((e.ctrlKey||e.metaKey) && e.key === "s") { e.preventDefault(); download() }
      if ((e.ctrlKey||e.metaKey) && e.key === "o") { e.preventDefault(); inputRef.current?.click() }
    }
    window.addEventListener("keydown", h)
    return () => window.removeEventListener("keydown", h)
  }, [download])

  return (
    <div className="flex flex-col gap-4 md:grid md:grid-cols-2 md:gap-4 md:h-[calc(100vh-80px)]">
      {/* Left panel */}
      <div className="flex flex-col md:overflow-hidden rounded-xl border border-border bg-card">
        <div className="flex-1 overflow-y-auto p-4 space-y-6">

          <div className="flex items-center gap-2">
            <div className="rounded-lg border border-border bg-muted/50 p-2">
              <Monitor className="h-4 w-4 text-primary" />
            </div>
            <div>
              <h1 className="text-base font-semibold">Screenshot to Mockup</h1>
              <p className="text-xs text-muted-foreground">Wrap screenshots in device frames · 100% in-browser</p>
            </div>
          </div>

          {/* Upload */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Screenshot</Label>
            <div
              onDragOver={(e) => { e.preventDefault(); setIsDragging(true) }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={(e) => { e.preventDefault(); setIsDragging(false); const f = e.dataTransfer.files[0]; if (f) handleFile(f) }}
              onClick={() => inputRef.current?.click()}
              className={`relative flex min-h-[100px] cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed transition-colors ${
                isDragging ? "border-primary bg-primary/5" : "border-border hover:border-primary/50 hover:bg-muted/50"
              }`}
            >
              <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f) }} />
              {imageEl ? (
                <div className="flex items-center gap-3 px-4 w-full">
                  <div className="rounded-md bg-primary/10 p-2 shrink-0"><ImageIcon className="h-5 w-5 text-primary" /></div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{fileName}</p>
                    <p className="text-xs text-muted-foreground">{imageEl.naturalWidth}×{imageEl.naturalHeight}px · {formatBytes(fileSize)}</p>
                  </div>
                  <button onClick={(e) => { e.stopPropagation(); setImageEl(null); setPreviewUrl(null) }} className="shrink-0 rounded-md p-1.5 text-muted-foreground hover:text-foreground">
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-2 text-center px-4">
                  <div className="rounded-full bg-muted p-3"><Upload className="h-5 w-5 text-muted-foreground" /></div>
                  <p className="text-sm font-medium">Drop a screenshot here</p>
                  <p className="text-xs text-muted-foreground">JPG, PNG, WebP · <kbd className="rounded border border-border bg-muted px-1 text-[10px]">Ctrl+O</kbd></p>
                </div>
              )}
            </div>
          </div>

          {/* Device selector */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Device</Label>
            <div className="grid grid-cols-4 gap-2">
              {DEVICES.map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  onClick={() => setDevice(id)}
                  className={`flex flex-col items-center gap-1.5 rounded-lg border px-2 py-2.5 text-xs font-medium transition-colors ${
                    device === id
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border bg-muted/30 text-muted-foreground hover:border-primary/50 hover:text-foreground"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Background presets */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Background</Label>
            <div className="grid grid-cols-5 gap-2">
              {BG_PRESETS.map((bg, i) => (
                <button
                  key={i}
                  onClick={() => setBgIndex(i)}
                  title={bg.label}
                  className={`h-9 rounded-lg border-2 transition-all ${bgIndex === i ? "border-primary scale-110" : "border-transparent hover:border-primary/50"}`}
                  style={{ background: bg.type === "solid" ? bg.c1 : `linear-gradient(135deg, ${bg.c1}, ${bg.c2})` }}
                />
              ))}
            </div>
          </div>

          {/* Shadow toggle */}
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-sm font-medium">Drop Shadow</Label>
              <p className="text-xs text-muted-foreground">Adds depth to the device frame</p>
            </div>
            <Switch checked={shadow} onCheckedChange={setShadow} />
          </div>

        </div>
      </div>

      {/* Right panel — preview */}
      <div className="flex flex-col md:overflow-hidden rounded-xl border border-border bg-card">
        <canvas ref={canvasRef} className="hidden" aria-hidden="true" />
        <div className="flex-1 overflow-y-auto p-4">
          {!previewUrl ? (
            <div className="flex h-full min-h-[200px] flex-col items-center justify-center gap-3 text-center">
              <div className="rounded-full border border-border bg-muted/50 p-4">
                <Monitor className="h-6 w-6 text-muted-foreground" />
              </div>
              <div>
                <p className="text-sm font-medium">No screenshot yet</p>
                <p className="text-xs text-muted-foreground mt-1">Drop a screenshot to see it in a device frame</p>
              </div>
            </div>
          ) : (
            <img src={previewUrl} alt="Mockup preview" className="w-full rounded-lg border border-border object-contain max-h-[70vh]" />
          )}
        </div>
        {previewUrl && (
          <div className="shrink-0 border-t border-border p-4">
            <Button className="w-full" onClick={download}>
              <Download className="mr-2 h-4 w-4" />
              Download PNG
              <kbd className="ml-2 rounded border border-primary-foreground/30 bg-primary-foreground/20 px-1 text-[10px]">Ctrl+S</kbd>
            </Button>
          </div>
        )}
      </div>

      <ShortcutsModal
        pageName="Screenshot to Mockup"
        shortcuts={[
          { keys: ["Ctrl", "S"], description: "Download mockup" },
          { keys: ["Ctrl", "O"], description: "Open screenshot" },
          { keys: ["?"], description: "Toggle this panel" },
        ]}
      />
    </div>
  )
}
