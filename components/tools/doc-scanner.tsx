"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import { Camera, Upload, RotateCcw, Download, RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Slider } from "@/components/ui/slider"
import { Switch } from "@/components/ui/switch"

// ─── Perspective transform (pure math, no deps) ─────────────────────────────

function gaussElim(A: number[][], b: number[]): number[] {
  const n = b.length
  const M = A.map((row, i) => [...row, b[i]])
  for (let col = 0; col < n; col++) {
    let pr = col
    for (let r = col + 1; r < n; r++) if (Math.abs(M[r][col]) > Math.abs(M[pr][col])) pr = r
    ;[M[col], M[pr]] = [M[pr], M[col]]
    const pv = M[col][col]
    if (Math.abs(pv) < 1e-10) continue
    for (let r = 0; r < n; r++) {
      if (r === col) continue
      const f = M[r][col] / pv
      for (let j = col; j <= n; j++) M[r][j] -= f * M[col][j]
    }
  }
  return M.map((row, i) => row[n] / row[i])
}

function computeH(src: [number,number][], dst: [number,number][]): number[] {
  const A: number[][] = [], b: number[] = []
  for (let i = 0; i < 4; i++) {
    const [x, y] = src[i], [xp, yp] = dst[i]
    A.push([x, y, 1, 0, 0, 0, -xp*x, -xp*y]); b.push(xp)
    A.push([0, 0, 0, x, y, 1, -yp*x, -yp*y]); b.push(yp)
  }
  return [...gaussElim(A, b), 1]
}

function applyH(H: number[], x: number, y: number): [number, number] {
  const w = H[6]*x + H[7]*y + H[8]
  return [(H[0]*x + H[1]*y + H[2])/w, (H[3]*x + H[4]*y + H[5])/w]
}

function warpPerspective(
  src: ImageData, srcW: number, srcH: number,
  srcPts: [number,number][],
  dstW: number, dstH: number
): ImageData {
  const dstPts: [number,number][] = [[0,0],[dstW,0],[dstW,dstH],[0,dstH]]
  const H = computeH(dstPts, srcPts) // inverse mapping: output → source
  const out = new Uint8ClampedArray(dstW * dstH * 4)
  const d = src.data
  for (let dy = 0; dy < dstH; dy++) {
    for (let dx = 0; dx < dstW; dx++) {
      const [sx, sy] = applyH(H, dx, dy)
      const xi = Math.floor(sx), yi = Math.floor(sy)
      if (xi < 0 || yi < 0 || xi >= srcW-1 || yi >= srcH-1) continue
      const fx = sx-xi, fy = sy-yi
      const i00 = (yi*srcW+xi)*4, i10 = i00+4, i01 = i00+srcW*4, i11 = i01+4
      const w00=(1-fx)*(1-fy), w10=fx*(1-fy), w01=(1-fx)*fy, w11=fx*fy
      const oi = (dy*dstW+dx)*4
      for (let c=0; c<3; c++) out[oi+c] = w00*d[i00+c]+w10*d[i10+c]+w01*d[i01+c]+w11*d[i11+c]
      out[oi+3] = 255
    }
  }
  return new ImageData(out, dstW, dstH)
}

// ─── Types ───────────────────────────────────────────────────────────────────

type Pt = [number, number]     // percentage coords [0..1, 0..1]
type Phase = "idle" | "select" | "done"

// ─── Component ───────────────────────────────────────────────────────────────

export default function DocScanner() {
  const [phase, setPhase]       = useState<Phase>("idle")
  const [mode, setMode]         = useState<"camera"|"upload">("camera")
  const [corners, setCorners]   = useState<Pt[]>([[.12,.1],[.88,.1],[.88,.9],[.12,.9]])
  const [dragging, setDragging] = useState<number|null>(null)
  const [aspect, setAspect]     = useState(4/3)
  const [processing, setProcessing] = useState(false)
  const [resultUrl, setResultUrl]   = useState<string|null>(null)
  const [brightness, setBrightness] = useState(100)
  const [contrast, setContrast]     = useState(100)
  const [grayscale, setGrayscale]   = useState(false)

  const videoRef     = useRef<HTMLVideoElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const streamRef    = useRef<MediaStream|null>(null)
  const imgRef       = useRef<HTMLImageElement|null>(null)
  const imgUrlRef    = useRef<string|null>(null)
  const fileRef      = useRef<HTMLInputElement>(null)

  // ── Camera ──────────────────────────────────────────────────────────────────

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment", width:{ideal:1920}, height:{ideal:1080} }
      })
      streamRef.current = stream
      const vid = videoRef.current!
      vid.srcObject = stream
      await vid.play()
      setAspect(vid.videoWidth / vid.videoHeight || 4/3)
      setMode("camera"); setPhase("select")
    } catch {
      alert("Camera access denied or unavailable. Try uploading a photo instead.")
    }
  }

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach(t => t.stop())
    streamRef.current = null
  }, [])

  useEffect(() => () => { stopCamera() }, [stopCamera])

  // ── Upload ───────────────────────────────────────────────────────────────────

  const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return
    if (imgUrlRef.current) URL.revokeObjectURL(imgUrlRef.current)
    const url = URL.createObjectURL(file)
    imgUrlRef.current = url
    const img = new Image()
    img.onload = () => {
      imgRef.current = img
      setAspect(img.naturalWidth / img.naturalHeight || 4/3)
      setMode("upload"); setPhase("select")
    }
    img.src = url
    e.target.value = ""
  }

  // ── Corner dragging ──────────────────────────────────────────────────────────

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    if (dragging === null || !containerRef.current) return
    const rect = containerRef.current.getBoundingClientRect()
    const x = Math.max(0.02, Math.min(0.98, (e.clientX-rect.left)/rect.width))
    const y = Math.max(0.02, Math.min(0.98, (e.clientY-rect.top)/rect.height))
    setCorners(cs => cs.map((c,i) => i===dragging ? [x,y] : c) as Pt[])
  }, [dragging])

  // ── Scan ─────────────────────────────────────────────────────────────────────

  const scan = async () => {
    setProcessing(true)
    await new Promise<void>(res => setTimeout(async () => {
      try {
        let srcW: number, srcH: number
        const offscreen = document.createElement("canvas")

        if (mode === "camera") {
          const vid = videoRef.current!
          srcW = vid.videoWidth; srcH = vid.videoHeight
          offscreen.width = srcW; offscreen.height = srcH
          offscreen.getContext("2d")!.drawImage(vid, 0, 0)
        } else {
          const img = imgRef.current!
          srcW = img.naturalWidth; srcH = img.naturalHeight
          offscreen.width = srcW; offscreen.height = srcH
          offscreen.getContext("2d")!.drawImage(img, 0, 0)
        }

        // Scale source if too large (cap at 2MP for performance)
        let scale = 1
        if (srcW * srcH > 2_000_000) {
          scale = Math.sqrt(2_000_000 / (srcW * srcH))
          const sc = document.createElement("canvas")
          sc.width = Math.round(srcW*scale); sc.height = Math.round(srcH*scale)
          sc.getContext("2d")!.drawImage(offscreen, 0, 0, sc.width, sc.height)
          offscreen.width = sc.width; offscreen.height = sc.height
          offscreen.getContext("2d")!.drawImage(sc, 0, 0)
          srcW = sc.width; srcH = sc.height
        }

        const srcPts = corners.map(([cx,cy]) => [cx*srcW, cy*srcH] as [number,number])
        const [tl,tr,br,bl] = srcPts
        const outW = Math.round(Math.max(
          Math.hypot(tr[0]-tl[0],tr[1]-tl[1]),
          Math.hypot(br[0]-bl[0],br[1]-bl[1])
        ))
        const outH = Math.round(Math.max(
          Math.hypot(bl[0]-tl[0],bl[1]-tl[1]),
          Math.hypot(br[0]-tr[0],br[1]-tr[1])
        ))

        const srcData = offscreen.getContext("2d")!.getImageData(0,0,srcW,srcH)
        const warped  = warpPerspective(srcData, srcW, srcH, srcPts, outW, outH)

        const out = document.createElement("canvas")
        out.width = outW; out.height = outH
        out.getContext("2d")!.putImageData(warped, 0, 0)
        setResultUrl(out.toDataURL("image/jpeg", 0.94))
      } catch (err) {
        alert("Processing failed: " + String(err))
      }
      res()
    }, 60))

    stopCamera()
    setProcessing(false)
    setPhase("done")
  }

  const reset = () => {
    stopCamera()
    setPhase("idle"); setResultUrl(null)
    setCorners([[.12,.1],[.88,.1],[.88,.9],[.12,.9]])
    setBrightness(100); setContrast(100); setGrayscale(false)
    setProcessing(false)
  }

  const downloadResult = () => {
    if (!resultUrl) return
    const img = new Image()
    img.onload = () => {
      const c = document.createElement("canvas")
      c.width = img.naturalWidth; c.height = img.naturalHeight
      const ctx = c.getContext("2d")!
      ctx.filter = `brightness(${brightness}%) contrast(${contrast}%) ${grayscale?"grayscale(1)":""}`
      ctx.drawImage(img, 0, 0)
      const a = document.createElement("a")
      a.href = c.toDataURL("image/jpeg", 0.92)
      a.download = "scanned-doc.jpg"; a.click()
    }
    img.src = resultUrl
  }

  // ─── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="h-full flex flex-col bg-background">
      <div className="shrink-0 border-b border-border px-6 py-4 flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-semibold">Doc Scanner</h1>
          <p className="text-sm text-muted-foreground">
            Scan documents with your camera. Drag 4 corner handles to align, then scan — perspective-corrected output.
          </p>
        </div>
        {phase !== "idle" && (
          <Button variant="outline" size="sm" onClick={reset}>
            <RotateCcw className="h-3.5 w-3.5 mr-1.5" />Start over
          </Button>
        )}
      </div>

      <div className="flex-1 overflow-hidden flex">

        {/* ── Idle ── */}
        {phase === "idle" && (
          <div className="flex-1 flex flex-col items-center justify-center gap-6 p-8">
            <div className="rounded-full bg-muted/50 border border-border p-8">
              <Camera className="h-14 w-14 text-muted-foreground" />
            </div>
            <div className="text-center space-y-2">
              <h2 className="text-lg font-semibold">Scan a document</h2>
              <p className="text-sm text-muted-foreground max-w-sm">
                Point your camera at a document, drag the 4 corner handles to align with its edges, then hit Scan. Works with uploaded photos too.
              </p>
            </div>
            <div className="flex gap-3">
              <Button size="lg" onClick={startCamera}>
                <Camera className="h-4 w-4 mr-2" />Start Camera
              </Button>
              <Button size="lg" variant="outline" onClick={() => fileRef.current?.click()}>
                <Upload className="h-4 w-4 mr-2" />Upload Photo
              </Button>
            </div>
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleUpload} />
          </div>
        )}

        {/* ── Select corners ── */}
        {phase === "select" && (
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Video/image area with corner handles */}
            <div className="flex-1 bg-black flex items-center justify-center overflow-hidden">
              <div
                ref={containerRef}
                className="relative"
                style={{ aspectRatio: String(aspect), maxHeight:"100%", maxWidth:"100%" }}
                onPointerMove={onPointerMove}
                onPointerUp={() => setDragging(null)}
                onPointerLeave={() => setDragging(null)}
              >
                {mode === "camera"
                  ? <video ref={videoRef} className="w-full h-full block" playsInline muted />
                  : <img src={imgUrlRef.current ?? ""} alt="document" className="w-full h-full block object-fill" />
                }

                {/* SVG overlay */}
                <svg
                  className="absolute inset-0 w-full h-full"
                  style={{ touchAction: "none" }}
                  viewBox="0 0 100 100"
                  preserveAspectRatio="none"
                >
                  {/* Document outline */}
                  <polygon
                    points={corners.map(([x,y]) => `${x*100},${y*100}`).join(" ")}
                    fill="rgba(59,130,246,0.12)"
                    stroke="#3b82f6"
                    strokeWidth="0.5"
                    strokeDasharray="3 1.5"
                    vectorEffect="non-scaling-stroke"
                  />
                  {/* Edge lines */}
                  {corners.map(([x,y], i) => {
                    const [nx,ny] = corners[(i+1)%4]
                    return (
                      <line key={i}
                        x1={x*100} y1={y*100} x2={nx*100} y2={ny*100}
                        stroke="#3b82f6" strokeWidth="0.5"
                        vectorEffect="non-scaling-stroke"
                      />
                    )
                  })}
                  {/* Corner handles */}
                  {corners.map(([x,y], i) => (
                    <g key={i}
                      style={{ cursor: dragging===i ? "grabbing" : "grab" }}
                      onPointerDown={e => { e.stopPropagation(); (e.target as Element).setPointerCapture(e.pointerId); setDragging(i) }}
                      onPointerUp={() => setDragging(null)}
                    >
                      <circle cx={x*100} cy={y*100} r="4" fill="rgba(59,130,246,0.2)" vectorEffect="non-scaling-stroke" />
                      <circle cx={x*100} cy={y*100} r="2.5" fill="#3b82f6" stroke="white" strokeWidth="0.6" vectorEffect="non-scaling-stroke" />
                      <text x={x*100} y={y*100} textAnchor="middle" dominantBaseline="central" fill="white" fontSize="1.6" fontWeight="bold">
                        {i+1}
                      </text>
                    </g>
                  ))}
                </svg>
              </div>
            </div>

            {/* Action bar */}
            <div className="shrink-0 border-t border-border bg-background px-6 py-3 flex items-center justify-between gap-4 flex-wrap">
              <p className="text-sm text-muted-foreground">
                Drag corner handles 1–4 to align with the document edges
              </p>
              <div className="flex gap-2">
                <Button variant="outline" onClick={reset}>Cancel</Button>
                <Button onClick={scan} disabled={processing}>
                  {processing ? "Processing…" : "Scan Document"}
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* ── Done ── */}
        {phase === "done" && resultUrl && (
          <div className="flex-1 flex flex-col md:flex-row overflow-y-auto md:overflow-hidden">
            {/* Result */}
            <div className="flex-1 overflow-auto bg-muted/20 p-6 flex items-center justify-center">
              <img
                src={resultUrl}
                alt="Scanned document"
                className="max-w-full max-h-full rounded-lg shadow-xl border border-border"
                style={{ filter: `brightness(${brightness}%) contrast(${contrast}%) ${grayscale?"grayscale(1)":""}` }}
              />
            </div>
            {/* Controls */}
            <div className="border-t md:border-t-0 md:border-l border-border p-4 space-y-5 overflow-y-auto md:w-60 md:shrink-0">
              <div className="space-y-4">
                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Adjustments</Label>
                <div className="space-y-1.5">
                  <div className="flex justify-between">
                    <Label className="text-xs text-muted-foreground">Brightness</Label>
                    <span className="text-xs font-mono text-muted-foreground">{brightness}%</span>
                  </div>
                  <Slider value={[brightness]} onValueChange={([v])=>setBrightness(v)} min={50} max={200} step={5} />
                </div>
                <div className="space-y-1.5">
                  <div className="flex justify-between">
                    <Label className="text-xs text-muted-foreground">Contrast</Label>
                    <span className="text-xs font-mono text-muted-foreground">{contrast}%</span>
                  </div>
                  <Slider value={[contrast]} onValueChange={([v])=>setContrast(v)} min={50} max={200} step={5} />
                </div>
                <div className="flex items-center justify-between">
                  <Label className="text-xs text-muted-foreground">Grayscale</Label>
                  <Switch checked={grayscale} onCheckedChange={setGrayscale} />
                </div>
              </div>

              <div className="space-y-2 pt-2 border-t border-border">
                <Button className="w-full" onClick={downloadResult}>
                  <Download className="h-4 w-4 mr-1.5" />Download JPEG
                </Button>
                <Button variant="outline" className="w-full" onClick={reset}>
                  <RefreshCw className="h-4 w-4 mr-1.5" />Scan Another
                </Button>
              </div>

              <div className="rounded-lg bg-muted/40 border border-border p-3">
                <p className="text-xs text-muted-foreground">
                  Tip: Enable Grayscale and increase Contrast to get a clean black-and-white document scan.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
