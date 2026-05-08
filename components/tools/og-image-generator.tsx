"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import { Download } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"

type Template = "minimal" | "dark" | "gradient" | "split"
type FontId = "sans-serif" | "serif" | "monospace" | "Georgia" | "Arial Black"

interface Cfg {
  template: Template
  title: string
  subtitle: string
  site: string
  primary: string
  secondary: string
  font: FontId
}

const W = 1200, H = 630

function hex2rgba(hex: string, a: number) {
  const r = parseInt(hex.slice(1,3),16)
  const g = parseInt(hex.slice(3,5),16)
  const b = parseInt(hex.slice(5,7),16)
  return `rgba(${r},${g},${b},${a})`
}

function getLines(ctx: CanvasRenderingContext2D, text: string, maxW: number, limit = 4): string[] {
  const words = (text || "").split(/\s+/).filter(Boolean)
  const lines: string[] = []
  let line = ""
  for (const w of words) {
    const test = line ? `${line} ${w}` : w
    if (ctx.measureText(test).width > maxW && line) {
      lines.push(line); if (lines.length >= limit) return lines; line = w
    } else { line = test }
  }
  if (line && lines.length < limit) lines.push(line)
  return lines
}

function render(canvas: HTMLCanvasElement, c: Cfg) {
  const ctx = canvas.getContext("2d")!
  ctx.clearRect(0,0,W,H)
  ctx.textBaseline = "top"
  ctx.textAlign = "left"

  const title = c.title || "Your Title Here"
  const sub   = c.subtitle || "A short description of your content or page."
  const site  = c.site || "yoursite.com"

  if (c.template === "minimal") {
    // Background
    ctx.fillStyle = "#ffffff"; ctx.fillRect(0,0,W,H)
    // Top accent
    ctx.fillStyle = c.primary; ctx.fillRect(0,0,W,8)
    // Soft circle decoration
    const g = ctx.createRadialGradient(W-80,60,0,W-80,60,300)
    g.addColorStop(0, hex2rgba(c.primary,.1)); g.addColorStop(1,"transparent")
    ctx.fillStyle = g; ctx.fillRect(0,0,W,H)
    // Title
    ctx.font = `bold 68px ${c.font}`; ctx.fillStyle = "#111827"
    const tl = getLines(ctx, title, W-220, 2)
    tl.forEach((l,i) => ctx.fillText(l, 80, 150+i*80))
    const ty = 150 + tl.length*80 + 20
    // Subtitle
    ctx.font = `${32}px ${c.font}`; ctx.fillStyle = "#6b7280"
    const sl = getLines(ctx, sub, W-220, 3)
    sl.forEach((l,i) => ctx.fillText(l, 80, ty+i*44))
    // Divider
    ctx.fillStyle = hex2rgba(c.primary,.4); ctx.fillRect(80, H-96, 56, 3)
    // Site
    ctx.font = `600 24px ${c.font}`; ctx.fillStyle = c.primary
    ctx.fillText(site, 80, H-76)

  } else if (c.template === "dark") {
    ctx.fillStyle = "#0f172a"; ctx.fillRect(0,0,W,H)
    // Left bar
    ctx.fillStyle = c.primary; ctx.fillRect(0,0,6,H)
    // Glow top-right
    const g1 = ctx.createRadialGradient(W,0,0,W,0,480)
    g1.addColorStop(0, hex2rgba(c.primary,.35)); g1.addColorStop(1,"transparent")
    ctx.fillStyle = g1; ctx.fillRect(0,0,W,H)
    // Glow bottom-left
    const g2 = ctx.createRadialGradient(0,H,0,0,H,320)
    g2.addColorStop(0, hex2rgba(c.secondary,.25)); g2.addColorStop(1,"transparent")
    ctx.fillStyle = g2; ctx.fillRect(0,0,W,H)
    // Title
    ctx.font = `bold 68px ${c.font}`; ctx.fillStyle = "#f8fafc"
    const tl = getLines(ctx, title, W-200, 2)
    tl.forEach((l,i) => ctx.fillText(l, 80, 150+i*80))
    const ty = 150 + tl.length*80 + 20
    // Subtitle
    ctx.font = `32px ${c.font}`; ctx.fillStyle = "#94a3b8"
    getLines(ctx, sub, W-200, 3).forEach((l,i) => ctx.fillText(l, 80, ty+i*44))
    // Site badge
    ctx.font = `600 22px ${c.font}`
    const bw = ctx.measureText(site).width + 32
    ctx.fillStyle = c.primary
    ctx.beginPath(); ctx.roundRect(80, H-74, bw, 38, 6); ctx.fill()
    ctx.fillStyle = "#ffffff"; ctx.fillText(site, 96, H-57)

  } else if (c.template === "gradient") {
    const grd = ctx.createLinearGradient(0,0,W,H)
    grd.addColorStop(0, c.primary); grd.addColorStop(1, c.secondary)
    ctx.fillStyle = grd; ctx.fillRect(0,0,W,H)
    // Dot grid pattern
    ctx.fillStyle = "rgba(255,255,255,0.06)"
    for (let r=0; r<H; r+=40) for (let col=0; col<W; col+=40) {
      ctx.beginPath(); ctx.arc(col,r,2,0,Math.PI*2); ctx.fill()
    }
    // Centered text
    ctx.textAlign = "center"
    ctx.font = `bold 68px ${c.font}`; ctx.fillStyle = "#ffffff"
    ctx.shadowColor = "rgba(0,0,0,0.4)"; ctx.shadowBlur = 24
    const tl = getLines(ctx, title, W-200, 2)
    const startY = Math.round((H - (tl.length*80 + 44*2 + 24))/2)
    tl.forEach((l,i) => ctx.fillText(l, W/2, startY+i*80))
    ctx.shadowBlur = 0
    const ty = startY + tl.length*80 + 20
    ctx.font = `32px ${c.font}`; ctx.fillStyle = "rgba(255,255,255,0.88)"
    getLines(ctx, sub, W-200, 2).forEach((l,i) => ctx.fillText(l, W/2, ty+i*44))
    // Site pill
    ctx.font = `600 22px ${c.font}`
    const pw = ctx.measureText(site).width + 36
    ctx.fillStyle = "rgba(255,255,255,0.2)"; ctx.fillStyle = "rgba(255,255,255,0.22)"
    ctx.beginPath(); ctx.roundRect(W/2-pw/2, H-74, pw, 40, 20); ctx.fill()
    ctx.fillStyle = "#ffffff"; ctx.fillText(site, W/2, H-57)
    ctx.textAlign = "left"

  } else { // split
    // Right white bg first
    ctx.fillStyle = "#ffffff"; ctx.fillRect(0,0,W,H)
    // Left colored panel
    ctx.fillStyle = c.primary
    ctx.beginPath(); ctx.moveTo(0,0); ctx.lineTo(W*.42,0); ctx.lineTo(W*.36,H); ctx.lineTo(0,H); ctx.closePath(); ctx.fill()
    // Glow on left panel
    const gl = ctx.createRadialGradient(W*.15,H*.3,0,W*.15,H*.3,250)
    gl.addColorStop(0,"rgba(255,255,255,.18)"); gl.addColorStop(1,"transparent")
    ctx.fillStyle = gl
    ctx.beginPath(); ctx.moveTo(0,0); ctx.lineTo(W*.42,0); ctx.lineTo(W*.36,H); ctx.lineTo(0,H); ctx.closePath(); ctx.fill()
    // Left: site name rotated
    ctx.save()
    ctx.translate(W*.18, H/2); ctx.rotate(-Math.PI/2)
    ctx.textAlign = "center"; ctx.textBaseline = "middle"
    ctx.fillStyle = "#ffffff"; ctx.font = `bold 26px ${c.font}`
    ctx.fillText(site.toUpperCase(), 0, 0)
    ctx.restore()
    ctx.textBaseline = "top"
    // Right: title + subtitle
    const rx = W*.42
    ctx.font = `bold 60px ${c.font}`; ctx.fillStyle = "#111827"
    const tl = getLines(ctx, title, W*.56-40, 3)
    tl.forEach((l,i) => ctx.fillText(l, rx, 120+i*72))
    const ty = 120 + tl.length*72 + 16
    // Accent line
    ctx.fillStyle = c.secondary; ctx.fillRect(rx, ty, 52, 4)
    ctx.font = `28px ${c.font}`; ctx.fillStyle = "#6b7280"
    getLines(ctx, sub, W*.56-40, 3).forEach((l,i) => ctx.fillText(l, rx, ty+18+i*40))
  }
}

const TEMPLATES: { id: Template; label: string }[] = [
  { id: "minimal",  label: "Minimal" },
  { id: "dark",     label: "Dark" },
  { id: "gradient", label: "Gradient" },
  { id: "split",    label: "Split" },
]
const FONTS: { id: FontId; label: string }[] = [
  { id: "sans-serif",  label: "Sans" },
  { id: "serif",       label: "Serif" },
  { id: "monospace",   label: "Mono" },
  { id: "Georgia",     label: "Georgia" },
  { id: "Arial Black", label: "Impact" },
]
const PRESETS = [
  { p:"#3b82f6", s:"#8b5cf6" }, { p:"#10b981", s:"#06b6d4" },
  { p:"#f59e0b", s:"#ef4444" }, { p:"#ec4899", s:"#8b5cf6" },
  { p:"#0f172a", s:"#1e3a5f" }, { p:"#dc2626", s:"#ea580c" },
]

export default function OgImageGenerator() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [template, setTemplate] = useState<Template>("minimal")
  const [title, setTitle]       = useState("Build fast. Ship confidently.")
  const [subtitle, setSubtitle] = useState("Privacy-first tools for creators. 60+ utilities that run entirely in your browser — no uploads, no tracking.")
  const [site, setSite]         = useState("creatorkit-tools.vercel.app")
  const [primary, setPrimary]   = useState("#3b82f6")
  const [secondary, setSecondary] = useState("#8b5cf6")
  const [font, setFont]         = useState<FontId>("sans-serif")

  const draw = useCallback(() => {
    if (!canvasRef.current) return
    render(canvasRef.current, { template, title, subtitle, site, primary, secondary, font })
  }, [template, title, subtitle, site, primary, secondary, font])

  useEffect(() => { draw() }, [draw])

  const download = () => {
    const canvas = canvasRef.current; if (!canvas) return
    const a = document.createElement("a")
    a.href = canvas.toDataURL("image/png")
    a.download = "og-image.png"; a.click()
  }

  return (
    <div className="flex h-full flex-col gap-3 p-4">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">OG Image Generator</h2>
          <p className="text-muted-foreground">Generate Open Graph images for social media. 1200×630 PNG, rendered in your browser.</p>
        </div>
        <Button onClick={download}><Download className="h-4 w-4 mr-1.5" />Download PNG</Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 flex-1 min-h-0">
        {/* Controls */}
        <div className="flex flex-col overflow-hidden rounded-xl border border-border bg-card">
          <div className="shrink-0 border-b border-border px-4 py-3"><span className="text-sm font-medium">Settings</span></div>
          <div className="flex-1 overflow-y-auto p-4 space-y-5">

          <div className="space-y-2">
            <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Template</Label>
            <div className="grid grid-cols-2 gap-1">
              {TEMPLATES.map(t => (
                <button key={t.id} onClick={() => setTemplate(t.id)}
                  className={`text-xs px-2 py-2 rounded border transition-colors ${template===t.id?"bg-primary text-primary-foreground border-primary":"border-border text-muted-foreground hover:border-primary/40"}`}>
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-3">
            <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Content</Label>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Title</Label>
              <Textarea value={title} onChange={e=>setTitle(e.target.value)} rows={2} className="text-sm resize-none" placeholder="Your headline" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Subtitle / Description</Label>
              <Textarea value={subtitle} onChange={e=>setSubtitle(e.target.value)} rows={3} className="text-sm resize-none" placeholder="A short description" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Site / Brand name</Label>
              <Input value={site} onChange={e=>setSite(e.target.value)} className="text-sm" placeholder="yoursite.com" />
            </div>
          </div>

          <div className="space-y-3">
            <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Colors</Label>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <input type="color" value={primary} onChange={e=>setPrimary(e.target.value)} className="w-8 h-8 rounded border border-border cursor-pointer shrink-0" />
                <div>
                  <Label className="text-xs text-muted-foreground">Primary</Label>
                  <p className="text-xs font-mono text-muted-foreground">{primary}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <input type="color" value={secondary} onChange={e=>setSecondary(e.target.value)} className="w-8 h-8 rounded border border-border cursor-pointer shrink-0" />
                <div>
                  <Label className="text-xs text-muted-foreground">Secondary / Gradient end</Label>
                  <p className="text-xs font-mono text-muted-foreground">{secondary}</p>
                </div>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Presets</Label>
              <div className="flex flex-wrap gap-1.5">
                {PRESETS.map(({p,s}) => (
                  <button key={p} onClick={()=>{setPrimary(p);setSecondary(s)}}
                    title={`${p} → ${s}`}
                    className="w-7 h-7 rounded-full border-2 border-white shadow hover:scale-110 transition-transform"
                    style={{background:`linear-gradient(135deg,${p},${s})`}} />
                ))}
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Font</Label>
            <div className="grid grid-cols-2 gap-1">
              {FONTS.map(f => (
                <button key={f.id} onClick={()=>setFont(f.id)}
                  className={`text-xs px-2 py-1.5 rounded border transition-colors ${font===f.id?"bg-primary text-primary-foreground border-primary":"border-border text-muted-foreground hover:border-primary/40"}`}
                  style={{fontFamily:f.id}}>
                  {f.label}
                </button>
              ))}
            </div>
          </div>
          </div>
        </div>

        {/* Preview */}
        <div className="flex flex-col overflow-hidden rounded-xl border border-border bg-card">
          <div className="shrink-0 border-b border-border px-4 py-3"><span className="text-sm font-medium">Preview</span></div>
          <div className="flex-1 overflow-auto p-6 flex items-center justify-center bg-muted/20">
            <div className="w-full max-w-4xl space-y-3">
              <canvas ref={canvasRef} width={1200} height={630}
                className="w-full h-auto rounded-xl shadow-xl border border-border" />
              <p className="text-center text-xs text-muted-foreground">
                1200 × 630 px — standard Open Graph / Twitter Card size
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
