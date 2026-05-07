"use client"

import { useState, useRef } from "react"
import { Upload, Download, Grid, Clock } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Slider } from "@/components/ui/slider"
import JSZip from "jszip"

interface Thumb { time: number; url: string }
type Mode = "grid" | "interval"

function fmtTime(s: number) {
  const m = Math.floor(s / 60), sec = Math.floor(s % 60)
  return `${m}:${sec.toString().padStart(2, "0")}`
}

async function extractFrame(video: HTMLVideoElement, time: number): Promise<string> {
  return new Promise(resolve => {
    const onSeeked = () => {
      video.removeEventListener("seeked", onSeeked)
      const canvas = document.createElement("canvas")
      canvas.width = video.videoWidth; canvas.height = video.videoHeight
      canvas.getContext("2d")!.drawImage(video, 0, 0)
      resolve(canvas.toDataURL("image/jpeg", 0.92))
    }
    video.addEventListener("seeked", onSeeked)
    video.currentTime = time
  })
}

export default function VideoThumbnailExtractor() {
  const [videoUrl, setVideoUrl] = useState("")
  const [duration, setDuration] = useState(0)
  const [filename, setFilename] = useState("")
  const [thumbs, setThumbs] = useState<Thumb[]>([])
  const [mode, setMode] = useState<Mode>("grid")
  const [gridCount, setGridCount] = useState(9)
  const [interval, setIntervalSec] = useState(10)
  const [loading, setLoading] = useState(false)
  const [progress, setProgress] = useState(0)
  const videoRef = useRef<HTMLVideoElement>(null)

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !file.type.startsWith("video/")) return
    const url = URL.createObjectURL(file)
    setVideoUrl(url)
    setFilename(file.name.replace(/\.[^.]+$/, ""))
    setThumbs([])
    e.target.value = ""
  }

  const onLoadedMetadata = () => {
    if (videoRef.current) setDuration(videoRef.current.duration)
  }

  const extract = async () => {
    const video = videoRef.current
    if (!video || !duration) return
    setLoading(true); setThumbs([])

    const times: number[] = mode === "grid"
      ? Array.from({ length: gridCount }, (_, i) => (duration / (gridCount + 1)) * (i + 1))
      : Array.from({ length: Math.floor(duration / interval) }, (_, i) => i * interval + interval / 2).filter(t => t < duration)

    const results: Thumb[] = []
    for (let i = 0; i < times.length; i++) {
      const url = await extractFrame(video, times[i])
      results.push({ time: times[i], url })
      setProgress(Math.round(((i + 1) / times.length) * 100))
    }
    setThumbs(results)
    setLoading(false); setProgress(0)
  }

  const downloadAll = async () => {
    if (!thumbs.length) return
    const zip = new JSZip()
    for (const thumb of thumbs) {
      const b64 = thumb.url.split(",")[1]
      zip.file(`${filename}-${fmtTime(thumb.time).replace(":", "m")}s.jpg`, b64, { base64: true })
    }
    const blob = await zip.generateAsync({ type: "blob" })
    const a = Object.assign(document.createElement("a"), {
      href: URL.createObjectURL(blob),
      download: `${filename}-thumbnails.zip`,
    })
    a.click()
  }

  const downloadOne = (thumb: Thumb) => {
    const a = Object.assign(document.createElement("a"), {
      href: thumb.url,
      download: `${filename}-${fmtTime(thumb.time).replace(":", "m")}s.jpg`,
    })
    a.click()
  }

  return (
    <div className="flex flex-col bg-background md:h-screen">
      <div className="shrink-0 border-b border-border bg-background">
        <div className="flex items-center justify-between px-6 py-4">
          <div>
            <h1 className="text-xl font-semibold">Video Thumbnail Extractor</h1>
            <p className="text-sm text-muted-foreground">Extract frames from any video as JPG images. Runs entirely in your browser.</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={extract} disabled={!videoUrl || loading}>
              {loading ? `Extracting… ${progress}%` : "Extract Frames"}
            </Button>
            {thumbs.length > 0 && (
              <Button size="sm" onClick={downloadAll}>
                <Download className="h-4 w-4 mr-1" />Download ZIP
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Options */}
      <div className="shrink-0 border-b border-border bg-muted/30 px-6 py-2 flex flex-wrap items-center gap-6">
        <div className="flex items-center gap-2">
          <Label className="text-xs text-muted-foreground">Mode:</Label>
          <button onClick={() => setMode("grid")}
            className={`text-xs px-3 py-1 rounded-full border flex items-center gap-1 transition-colors ${mode === "grid" ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground"}`}>
            <Grid className="h-3 w-3" />Grid
          </button>
          <button onClick={() => setMode("interval")}
            className={`text-xs px-3 py-1 rounded-full border flex items-center gap-1 transition-colors ${mode === "interval" ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground"}`}>
            <Clock className="h-3 w-3" />Interval
          </button>
        </div>
        {mode === "grid" ? (
          <div className="flex items-center gap-3">
            <Label className="text-xs text-muted-foreground">Frames:</Label>
            <Slider value={[gridCount]} onValueChange={([v]) => setGridCount(v)} min={3} max={24} step={1} className="w-28" />
            <span className="text-xs font-mono text-muted-foreground">{gridCount}</span>
          </div>
        ) : (
          <div className="flex items-center gap-3">
            <Label className="text-xs text-muted-foreground">Every:</Label>
            <Slider value={[intervalSec]} onValueChange={([v]) => setIntervalSec(v)} min={1} max={60} step={1} className="w-28" />
            <span className="text-xs font-mono text-muted-foreground">{intervalSec}s</span>
          </div>
        )}
        {duration > 0 && <span className="text-xs text-muted-foreground">Duration: {fmtTime(duration)}</span>}
      </div>

      <div className="flex-1 flex flex-col md:flex-row overflow-y-auto md:overflow-hidden">
        {/* Left — Video */}
        <div className="flex flex-col border-b md:border-b-0 md:border-r border-border md:w-1/2">
          <div className="p-3 border-b border-border bg-muted/30">
            <h3 className="text-sm font-medium">Video</h3>
          </div>
          {videoUrl ? (
            <div className="flex-1 flex flex-col p-4 gap-3 min-h-0">
              <video
                ref={videoRef}
                src={videoUrl}
                controls
                onLoadedMetadata={onLoadedMetadata}
                className="flex-1 w-full object-contain rounded-lg border border-border min-h-0"
              />
              <label className="cursor-pointer">
                <input type="file" accept="video/*" className="hidden" onChange={handleFile} />
                <Button variant="outline" size="sm" className="w-full" asChild>
                  <span><Upload className="h-4 w-4 mr-1" />Change Video</span>
                </Button>
              </label>
            </div>
          ) : (
            <label className="flex-1 flex flex-col items-center justify-center cursor-pointer border-2 border-dashed border-border m-4 rounded-xl hover:border-primary/50 transition-colors">
              <input type="file" accept="video/*" className="hidden" onChange={handleFile} />
              <Upload className="h-10 w-10 text-muted-foreground/40 mb-3" />
              <p className="text-sm font-medium">Click to upload a video</p>
              <p className="text-xs text-muted-foreground mt-1">MP4, WebM, MOV, AVI</p>
            </label>
          )}
        </div>

        {/* Right — Thumbnails */}
        <div className="flex flex-col md:w-1/2 md:flex-1">
          <div className="p-3 border-b border-border bg-muted/30">
            <h3 className="text-sm font-medium">{thumbs.length > 0 ? `${thumbs.length} frames extracted` : "Frames"}</h3>
          </div>
          <div className="flex-1 overflow-y-auto p-4">
            {thumbs.length === 0 ? (
              <div className="flex items-center justify-center h-full text-sm text-muted-foreground">
                Extract frames to see thumbnails here
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-3">
                {thumbs.map((thumb) => (
                  <div key={thumb.time} className="group relative rounded-lg border border-border overflow-hidden cursor-pointer" onClick={() => downloadOne(thumb)}>
                    <img src={thumb.url} alt={`Frame at ${fmtTime(thumb.time)}`} className="w-full h-20 object-cover" />
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <Download className="h-5 w-5 text-white" />
                    </div>
                    <div className="bg-background/90 px-2 py-1 text-xs font-mono text-center border-t border-border">
                      {fmtTime(thumb.time)}
                    </div>
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
