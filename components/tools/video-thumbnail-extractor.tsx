"use client"

import { useState, useRef, useCallback, useEffect } from "react"
import { Upload, Download, Grid, Clock } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Slider } from "@/components/ui/slider"
import { ShortcutsModal } from "@/components/shortcuts-modal"
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
  const [announcement, setAnnouncement] = useState("")
  const videoRef = useRef<HTMLVideoElement>(null)

  const announceToScreenReader = useCallback((message: string) => {
    setAnnouncement(message)
    setTimeout(() => setAnnouncement(""), 1000)
  }, [])

  const handleFile = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !file.type.startsWith("video/")) return
    const url = URL.createObjectURL(file)
    setVideoUrl(url)
    setFilename(file.name.replace(/\.[^.]+$/, ""))
    setThumbs([])
    e.target.value = ""
    announceToScreenReader(`Video loaded: ${file.name}`)
  }, [announceToScreenReader])

  const onLoadedMetadata = useCallback(() => {
    if (videoRef.current) {
      setDuration(videoRef.current.duration)
      announceToScreenReader(`Video duration: ${fmtTime(videoRef.current.duration)}`)
    }
  }, [announceToScreenReader])

  const extract = useCallback(async () => {
    const video = videoRef.current
    if (!video || !duration) return
    setLoading(true); setThumbs([])
    announceToScreenReader("Extracting frames")

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
    announceToScreenReader(`Extracted ${results.length} frames`)
  }, [duration, mode, gridCount, interval, announceToScreenReader])

  const downloadAll = useCallback(async () => {
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
    announceToScreenReader("Downloaded thumbnails as ZIP")
  }, [thumbs, filename, announceToScreenReader])

  const downloadOne = useCallback((thumb: Thumb) => {
    const a = Object.assign(document.createElement("a"), {
      href: thumb.url,
      download: `${filename}-${fmtTime(thumb.time).replace(":", "m")}s.jpg`,
    })
    a.click()
    announceToScreenReader(`Downloaded frame at ${fmtTime(thumb.time)}`)
  }, [filename, announceToScreenReader])

  const changeMode = useCallback((newMode: Mode) => {
    setMode(newMode)
    setThumbs([])
    announceToScreenReader(`Switched to ${newMode} mode`)
  }, [announceToScreenReader])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.shiftKey) {
        switch (e.key.toLowerCase()) {
          case "e":
            if (videoUrl && !loading) {
              e.preventDefault()
              extract()
            }
            break
          case "d":
            if (thumbs.length > 0) {
              e.preventDefault()
              downloadAll()
            }
            break
          case "g":
            e.preventDefault()
            changeMode("grid")
            break
          case "i":
            e.preventDefault()
            changeMode("interval")
            break
        }
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [videoUrl, loading, thumbs.length, extract, downloadAll, changeMode])

  const shortcuts = [
    { keys: ["Ctrl", "Shift", "E"], description: "Extract frames" },
    { keys: ["Ctrl", "Shift", "D"], description: "Download all as ZIP" },
    { keys: ["Ctrl", "Shift", "G"], description: "Switch to grid mode" },
    { keys: ["Ctrl", "Shift", "I"], description: "Switch to interval mode" },
  ]

  return (
    <div className="flex h-full flex-col gap-3 p-4">
      <div aria-live="polite" aria-atomic="true" className="sr-only">
        {announcement}
      </div>

      <div className="flex items-start justify-between flex-wrap gap-2">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">Video Thumbnail Extractor</h2>
          <p className="text-muted-foreground">Extract frames from any video as JPG images. Runs entirely in your browser.</p>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={extract} 
            disabled={!videoUrl || loading}
            aria-label={loading ? `Extracting frames: ${progress}%` : "Extract frames from video"}
            className="focus:outline-none focus:ring-2 focus:ring-primary/50"
          >
            {loading ? `Extracting… ${progress}%` : "Extract Frames"}
            <kbd className="ml-2 pointer-events-none inline-flex h-5 select-none items-center gap-0.5 rounded border bg-background/80 px-1 font-mono text-[10px] font-medium text-foreground shadow-sm">
              <span>Ctrl</span><span>Shift</span><span>E</span>
            </kbd>
          </Button>
          {thumbs.length > 0 && (
            <Button 
              size="sm" 
              onClick={downloadAll}
              aria-label="Download all thumbnails as ZIP"
              className="focus:outline-none focus:ring-2 focus:ring-primary/50"
            >
              <Download className="h-4 w-4 mr-1" aria-hidden="true" />
              <span>Download ZIP</span>
              <kbd className="ml-2 pointer-events-none inline-flex h-5 select-none items-center gap-0.5 rounded border bg-background/80 px-1 font-mono text-[10px] font-medium text-foreground shadow-sm">
                <span>Ctrl</span><span>Shift</span><span>D</span>
              </kbd>
            </Button>
          )}
        </div>
        <ShortcutsModal pageName="Video Thumbnail Extractor" shortcuts={shortcuts} />
      </div>

      <div className="flex flex-wrap items-center gap-4" role="group" aria-label="Extraction options">
        <div className="flex items-center gap-2" role="radiogroup" aria-label="Extraction mode">
          <Label className="text-xs text-muted-foreground" id="mode-label">Mode:</Label>
          <button 
            onClick={() => changeMode("grid")}
            role="radio"
            aria-checked={mode === "grid"}
            aria-labelledby="mode-label"
            title="Grid mode (Ctrl+Shift+G)"
            className={`text-xs px-3 py-1 rounded-full border flex items-center gap-1 transition-colors focus:outline-none focus:ring-2 focus:ring-primary/50 ${mode === "grid" ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground"}`}>
            <Grid className="h-3 w-3" aria-hidden="true" />
            <span>Grid</span>
            <kbd className="ml-1 pointer-events-none inline-flex h-4 select-none items-center gap-0.5 rounded border bg-background/60 px-1 font-mono text-[9px] font-medium text-foreground/70 shadow-sm">
              <span>G</span>
            </kbd>
          </button>
          <button 
            onClick={() => changeMode("interval")}
            role="radio"
            aria-checked={mode === "interval"}
            aria-labelledby="mode-label"
            title="Interval mode (Ctrl+Shift+I)"
            className={`text-xs px-3 py-1 rounded-full border flex items-center gap-1 transition-colors focus:outline-none focus:ring-2 focus:ring-primary/50 ${mode === "interval" ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground"}`}>
            <Clock className="h-3 w-3" aria-hidden="true" />
            <span>Interval</span>
            <kbd className="ml-1 pointer-events-none inline-flex h-4 select-none items-center gap-0.5 rounded border bg-background/60 px-1 font-mono text-[9px] font-medium text-foreground/70 shadow-sm">
              <span>I</span>
            </kbd>
          </button>
        </div>
        {mode === "grid" ? (
          <div className="flex items-center gap-3">
            <Label className="text-xs text-muted-foreground" id="frames-label">Frames:</Label>
            <Slider 
              value={[gridCount]} 
              onValueChange={([v]) => {
                setGridCount(v)
                announceToScreenReader(`Set to ${v} frames`)
              }} 
              min={3} 
              max={24} 
              step={1} 
              className="w-28" 
              aria-label={`Number of frames: ${gridCount}`}
            />
            <span className="text-xs font-mono text-muted-foreground" aria-live="polite">{gridCount}</span>
          </div>
        ) : (
          <div className="flex items-center gap-3">
            <Label className="text-xs text-muted-foreground" id="interval-label">Every:</Label>
            <Slider 
              value={[interval]} 
              onValueChange={([v]) => {
                setIntervalSec(v)
                announceToScreenReader(`Set interval to ${v} seconds`)
              }} 
              min={1} 
              max={60} 
              step={1} 
              className="w-28" 
              aria-label={`Extract frame every ${interval} seconds`}
            />
            <span className="text-xs font-mono text-muted-foreground" aria-live="polite">{interval}s</span>
          </div>
        )}
        {duration > 0 && <span className="text-xs text-muted-foreground" aria-live="polite">Duration: {fmtTime(duration)}</span>}
      </div>

      <div className="grid gap-4 md:grid-cols-2 flex-1 min-h-0">
        {/* Left — Video */}
        <div className="flex flex-col overflow-hidden rounded-xl border border-border bg-card" role="region" aria-label="Video panel">
          <div className="shrink-0 border-b border-border px-4 py-3">
            <span className="text-sm font-medium" id="video-label">Video</span>
          </div>
          {videoUrl ? (
            <div className="flex-1 flex flex-col p-4 gap-3 min-h-0">
              <video
                ref={videoRef}
                src={videoUrl}
                controls
                onLoadedMetadata={onLoadedMetadata}
                className="flex-1 w-full object-contain rounded-lg border border-border min-h-0"
                aria-label="Video preview"
              />
              <label className="cursor-pointer">
                <input type="file" accept="video/*" className="hidden" onChange={handleFile} aria-label="Change video file" />
                <Button variant="outline" size="sm" className="w-full focus:outline-none focus:ring-2 focus:ring-primary/50" asChild>
                  <span><Upload className="h-4 w-4 mr-1" aria-hidden="true" />Change Video</span>
                </Button>
              </label>
            </div>
          ) : (
            <label className="flex-1 flex flex-col items-center justify-center cursor-pointer border-2 border-dashed border-border m-4 rounded-xl hover:border-primary/50 transition-colors focus:outline-none focus:ring-2 focus:ring-primary/50" role="button" tabIndex={0} aria-label="Upload video file">
              <input type="file" accept="video/*" className="hidden" onChange={handleFile} />
              <Upload className="h-10 w-10 text-muted-foreground/40 mb-3" aria-hidden="true" />
              <p className="text-sm font-medium">Click to upload a video</p>
              <p className="text-xs text-muted-foreground mt-1">MP4, WebM, MOV, AVI</p>
            </label>
          )}
        </div>

        {/* Right — Thumbnails */}
        <div className="flex flex-col overflow-hidden rounded-xl border border-border bg-card" role="region" aria-label="Thumbnails panel">
          <div className="shrink-0 border-b border-border px-4 py-3">
            <span className="text-sm font-medium" id="thumbnails-label">{thumbs.length > 0 ? `${thumbs.length} frames extracted` : "Frames"}</span>
          </div>
          <div className="flex-1 overflow-y-auto p-4" role="list" aria-label="Extracted thumbnails">
            {thumbs.length === 0 ? (
              <div className="flex items-center justify-center h-full text-sm text-muted-foreground" role="status">
                Extract frames to see thumbnails here
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-3">
                {thumbs.map((thumb) => (
                  <div 
                    key={thumb.time} 
                    className="group relative rounded-lg border border-border overflow-hidden cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary/50" 
                    onClick={() => downloadOne(thumb)}
                    role="listitem"
                    aria-label={`Download frame at ${fmtTime(thumb.time)}`}
                    tabIndex={0}
                    onKeyDown={(e) => e.key === "Enter" && downloadOne(thumb)}
                  >
                    <img src={thumb.url} alt={`Frame at ${fmtTime(thumb.time)}`} className="w-full h-20 object-cover" />
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 group-focus:opacity-100 transition-opacity flex items-center justify-center" aria-hidden="true">
                      <Download className="h-5 w-5 text-white" />
                    </div>
                    <div className="bg-background/90 px-2 py-1 text-xs font-mono text-center border-t border-border" aria-live="polite">
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
