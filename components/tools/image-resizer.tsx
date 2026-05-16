"use client"

import { useEffect, useMemo, useRef, useState, useCallback } from "react"
import { Download, Check, CheckCircle2, ChevronDown, Plus, X, Crop } from "lucide-react"
import JSZip from "jszip"
import { FileDropzone } from "@/components/file-dropzone"
import { Button } from "@/components/ui/button"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
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

type OutputFormat = "jpeg" | "png" | "webp"
type PlatformId = "instagram" | "facebook" | "twitter" | "tiktok" | "linkedin" | "youtube" | "pinterest" | "threads" | "snapchat" | "bluesky" | "whatsapp" | "reddit" | "custom"
type SizePreset = { id: string; platform: PlatformId; platformLabel: string; label: string; width: number; height: number; ratio: string }

const PLATFORM_GROUPS: Array<{ id: PlatformId; label: string; sizes: SizePreset[] }> = [
  { id: "instagram", label: "Instagram", sizes: [
    { id: "instagram-square-post", platform: "instagram", platformLabel: "Instagram", label: "Square Post", width: 1080, height: 1080, ratio: "1:1" },
    { id: "instagram-4x5-vertical", platform: "instagram", platformLabel: "Instagram", label: "4:5 Vertical", width: 1080, height: 1350, ratio: "4:5" },
    { id: "instagram-3x4-vertical", platform: "instagram", platformLabel: "Instagram", label: "3:4 Vertical", width: 1080, height: 1440, ratio: "3:4" },
    { id: "instagram-horizontal", platform: "instagram", platformLabel: "Instagram", label: "Horizontal", width: 1080, height: 566, ratio: "1.91:1" },
    { id: "instagram-story-reels", platform: "instagram", platformLabel: "Instagram", label: "Story/Reels", width: 1080, height: 1920, ratio: "9:16" },
    { id: "instagram-profile", platform: "instagram", platformLabel: "Instagram", label: "Profile", width: 320, height: 320, ratio: "1:1" },
  ]},
  { id: "facebook", label: "Facebook", sizes: [
    { id: "facebook-post", platform: "facebook", platformLabel: "Facebook", label: "Post", width: 1200, height: 630, ratio: "1.91:1" },
    { id: "facebook-story", platform: "facebook", platformLabel: "Facebook", label: "Story", width: 1080, height: 1920, ratio: "9:16" },
    { id: "facebook-cover-photo", platform: "facebook", platformLabel: "Facebook", label: "Cover Photo", width: 820, height: 312, ratio: "2.63:1" },
    { id: "facebook-profile", platform: "facebook", platformLabel: "Facebook", label: "Profile", width: 320, height: 320, ratio: "1:1" },
    { id: "facebook-carousel", platform: "facebook", platformLabel: "Facebook", label: "Carousel", width: 1200, height: 1200, ratio: "1:1" },
  ]},
  { id: "twitter", label: "Twitter/X", sizes: [
    { id: "twitter-post", platform: "twitter", platformLabel: "Twitter/X", label: "Post", width: 1200, height: 675, ratio: "16:9" },
    { id: "twitter-square-post", platform: "twitter", platformLabel: "Twitter/X", label: "Square Post", width: 1080, height: 1080, ratio: "1:1" },
    { id: "twitter-header", platform: "twitter", platformLabel: "Twitter/X", label: "Header", width: 1500, height: 500, ratio: "3:1" },
    { id: "twitter-profile", platform: "twitter", platformLabel: "Twitter/X", label: "Profile", width: 400, height: 400, ratio: "1:1" },
  ]},
  { id: "tiktok", label: "TikTok", sizes: [
    { id: "tiktok-vertical-cover", platform: "tiktok", platformLabel: "TikTok", label: "Vertical Cover", width: 1080, height: 1920, ratio: "9:16" },
    { id: "tiktok-feed-square", platform: "tiktok", platformLabel: "TikTok", label: "Feed Square", width: 1080, height: 1080, ratio: "1:1" },
    { id: "tiktok-profile", platform: "tiktok", platformLabel: "TikTok", label: "Profile", width: 200, height: 200, ratio: "1:1" },
  ]},
  { id: "linkedin", label: "LinkedIn", sizes: [
    { id: "linkedin-post", platform: "linkedin", platformLabel: "LinkedIn", label: "Post", width: 1200, height: 627, ratio: "1.91:1" },
    { id: "linkedin-cover", platform: "linkedin", platformLabel: "LinkedIn", label: "Cover", width: 1584, height: 396, ratio: "4:1" },
    { id: "linkedin-profile", platform: "linkedin", platformLabel: "LinkedIn", label: "Profile", width: 400, height: 400, ratio: "1:1" },
  ]},
  { id: "youtube", label: "YouTube", sizes: [
    { id: "youtube-thumbnail", platform: "youtube", platformLabel: "YouTube", label: "Thumbnail", width: 1280, height: 720, ratio: "16:9" },
    { id: "youtube-channel-banner", platform: "youtube", platformLabel: "YouTube", label: "Channel Banner", width: 2560, height: 1440, ratio: "16:9" },
    { id: "youtube-profile", platform: "youtube", platformLabel: "YouTube", label: "Profile", width: 800, height: 800, ratio: "1:1" },
  ]},
  { id: "pinterest", label: "Pinterest", sizes: [
    { id: "pinterest-standard-pin", platform: "pinterest", platformLabel: "Pinterest", label: "Standard Pin", width: 1000, height: 1500, ratio: "2:3" },
    { id: "pinterest-square-pin", platform: "pinterest", platformLabel: "Pinterest", label: "Square Pin", width: 1000, height: 1000, ratio: "1:1" },
    { id: "pinterest-board-cover", platform: "pinterest", platformLabel: "Pinterest", label: "Board Cover", width: 800, height: 800, ratio: "1:1" },
  ]},
  { id: "threads", label: "Threads", sizes: [
    { id: "threads-post-square", platform: "threads", platformLabel: "Threads", label: "Post Square", width: 1080, height: 1080, ratio: "1:1" },
    { id: "threads-vertical", platform: "threads", platformLabel: "Threads", label: "Vertical", width: 1080, height: 1350, ratio: "4:5" },
  ]},
  { id: "snapchat", label: "Snapchat", sizes: [
    { id: "snapchat-story", platform: "snapchat", platformLabel: "Snapchat", label: "Story", width: 1080, height: 1920, ratio: "9:16" },
    { id: "snapchat-profile", platform: "snapchat", platformLabel: "Snapchat", label: "Profile", width: 320, height: 320, ratio: "1:1" },
  ]},
  { id: "bluesky", label: "Bluesky", sizes: [
    { id: "bluesky-post-square", platform: "bluesky", platformLabel: "Bluesky", label: "Post Square", width: 1200, height: 1200, ratio: "1:1" },
    { id: "bluesky-landscape", platform: "bluesky", platformLabel: "Bluesky", label: "Landscape", width: 1200, height: 675, ratio: "16:9" },
    { id: "bluesky-banner", platform: "bluesky", platformLabel: "Bluesky", label: "Banner", width: 1500, height: 500, ratio: "3:1" },
  ]},
  { id: "whatsapp", label: "WhatsApp", sizes: [
    { id: "whatsapp-profile", platform: "whatsapp", platformLabel: "WhatsApp", label: "Profile", width: 640, height: 640, ratio: "1:1" },
    { id: "whatsapp-status", platform: "whatsapp", platformLabel: "WhatsApp", label: "Status", width: 1080, height: 1920, ratio: "9:16" },
  ]},
  { id: "reddit", label: "Reddit", sizes: [
    { id: "reddit-post", platform: "reddit", platformLabel: "Reddit", label: "Post", width: 1200, height: 628, ratio: "1.91:1" },
    { id: "reddit-banner", platform: "reddit", platformLabel: "Reddit", label: "Banner", width: 1920, height: 384, ratio: "5:1" },
    { id: "reddit-profile", platform: "reddit", platformLabel: "Reddit", label: "Profile", width: 256, height: 256, ratio: "1:1" },
  ]},
]

const PRESET_BY_ID = new Map(PLATFORM_GROUPS.flatMap((g) => g.sizes.map((s) => [s.id, s])))

function getSimpleRatio(w: number, h: number): string {
  const gcd = (a: number, b: number): number => b === 0 ? a : gcd(b, a % b)
  const d = gcd(w, h)
  return `${w / d}:${h / d}`
}

type GeneratedImage = { id: string; presetId: string; presetLabel: string; platformLabel: string; width: number; height: number; ratio: string; fileName: string; sourceFile: File; url: string; blob: Blob }

const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v))

function StyledSelect({ value, onChange, options }: { value: string; onChange: (v: string) => void; options: { value: string; label: string }[] }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const selected = options.find((o) => o.value === value)
  useEffect(() => {
    const handler = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false) }
    document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [])
  return (
    <div ref={ref} className="relative w-full">
      <button type="button" onClick={() => setOpen((v) => !v)} aria-label="Select platform" aria-expanded={open} className="flex h-9 w-full items-center justify-between rounded-md border border-input bg-background px-3 text-sm text-foreground">
        <span className="truncate">{selected?.label ?? "Select..."}</span>
        <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
      </button>
      {open && (
        <div className="absolute z-50 mt-1 max-h-60 w-full overflow-auto rounded-md border border-border bg-popover shadow-md">
          {options.map((opt) => (
            <button key={opt.value} type="button" onClick={() => { onChange(opt.value); setOpen(false) }}
              className={`flex w-full items-center px-3 py-2 text-left text-sm hover:bg-accent hover:text-accent-foreground ${opt.value === value ? "bg-accent/50 font-medium" : ""}`}>
              {opt.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

function computeOverlay(containerW: number, containerH: number, imgW: number, imgH: number, targetW: number, targetH: number, offsetX: number, offsetY: number) {
  const imgAspect = imgW / imgH
  const containerAspect = containerW / containerH
  const targetAspect = targetW / targetH
  let rendW: number, rendH: number
  if (imgAspect > containerAspect) { rendW = containerW; rendH = containerW / imgAspect } else { rendH = containerH; rendW = containerH * imgAspect }
  const rendX = (containerW - rendW) / 2
  const rendY = (containerH - rendH) / 2
  let cropW: number, cropH: number
  if (imgAspect > targetAspect) { cropH = rendH; cropW = rendH * targetAspect } else { cropW = rendW; cropH = rendW / targetAspect }
  const extraX = rendW - cropW
  const extraY = rendH - cropH
  return { cropX: rendX + extraX / 2 + (extraX / 2) * offsetX, cropY: rendY + extraY / 2 + (extraY / 2) * offsetY, cropW, cropH }
}

export default function ImageResizer() {
  const [activeTab, setActiveTab] = useState<"input" | "output">("input")
  const [outputFormat, setOutputFormat] = useState<OutputFormat>("jpeg")
  const [quality, setQuality] = useState(92)
  const [files, setFiles] = useState<File[]>([])
  const [selectedSizes, setSelectedSizes] = useState<Set<string>>(new Set(["instagram-square-post", "instagram-story-reels"]))
  const [customSizes, setCustomSizes] = useState<SizePreset[]>([])
  const [customWidth, setCustomWidth] = useState("1200")
  const [customHeight, setCustomHeight] = useState("800")
  const [customLabel, setCustomLabel] = useState("")
  const [cropOffsets, setCropOffsets] = useState<Record<string, { x: number; y: number }>>({})
  const [activePreviewPresetId, setActivePreviewPresetId] = useState<string>("instagram-square-post")
  const [generatedImages, setGeneratedImages] = useState<GeneratedImage[]>([])
  const [firstFileUrl, setFirstFileUrl] = useState<string | null>(null)
  const [firstFileSize, setFirstFileSize] = useState<{ width: number; height: number } | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [containerSize, setContainerSize] = useState<{ w: number; h: number } | null>(null)
  const [downloading, setDownloading] = useState(false)

  const dragRef = useRef<{ presetId: string; startX: number; startY: number; startOffsetX: number; startOffsetY: number } | null>(null)
  const cropContainerRef = useRef<HTMLDivElement>(null)
  const uploadRef = useRef<HTMLInputElement>(null)

  const allPresetById = useMemo(() => {
    const map = new Map(PRESET_BY_ID)
    customSizes.forEach((s) => map.set(s.id, s))
    return map
  }, [customSizes])

  useEffect(() => {
    const el = cropContainerRef.current
    if (!el) return
    const observer = new ResizeObserver((entries) => { for (const entry of entries) setContainerSize({ w: entry.contentRect.width, h: entry.contentRect.height }) })
    observer.observe(el)
    setContainerSize({ w: el.offsetWidth, h: el.offsetHeight })
    return () => observer.disconnect()
  }, [])

  const selectedPresetList = useMemo(() => [...selectedSizes].map((id) => allPresetById.get(id)).filter((p): p is SizePreset => Boolean(p)), [selectedSizes, allPresetById])
  const activePreviewPreset = useMemo(() => allPresetById.get(activePreviewPresetId) ?? selectedPresetList[0] ?? null, [activePreviewPresetId, selectedPresetList, allPresetById])
  const selectedChips = useMemo(() => selectedPresetList.map((p) => ({ id: p.id, label: `${p.platformLabel} ${p.label}` })), [selectedPresetList])

  useEffect(() => {
    if (files.length === 0) { setFirstFileUrl((prev) => { if (prev) URL.revokeObjectURL(prev); return null }); setFirstFileSize(null); return }
    const url = URL.createObjectURL(files[0])
    setFirstFileUrl((prev) => { if (prev) URL.revokeObjectURL(prev); return url })
    let cancelled = false
    createImageBitmap(files[0]).then((bmp) => { if (!cancelled) setFirstFileSize({ width: bmp.width, height: bmp.height }); bmp.close() })
    return () => { cancelled = true }
  }, [files])

  useEffect(() => {
    if (selectedPresetList.length > 0 && !selectedSizes.has(activePreviewPresetId)) setActivePreviewPresetId(selectedPresetList[0].id)
  }, [selectedPresetList, selectedSizes, activePreviewPresetId])

  useEffect(() => {
    return () => { if (firstFileUrl) URL.revokeObjectURL(firstFileUrl); generatedImages.forEach((item) => URL.revokeObjectURL(item.url)) }
  }, [firstFileUrl, generatedImages])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        if (!(e.ctrlKey || e.metaKey)) return
      }
      if (e.key === "?" || (e.shiftKey && e.key === "/")) return
      const ctrl = e.ctrlKey || e.metaKey
      if (ctrl && e.shiftKey && e.key.toLowerCase() === "u") { e.preventDefault(); uploadRef.current?.click(); announceToScreenReader("Upload dialog opened") }
      if (ctrl && e.key === "Enter") { e.preventDefault(); if (!isProcessing && files.length > 0) { generateSelected(); announceToScreenReader("Generating images") } }
      if (ctrl && e.shiftKey && e.key.toLowerCase() === "s") { e.preventDefault(); if (generatedImages.length > 0) downloadAll() }
      if (ctrl && e.key === "Backspace") { e.preventDefault(); if (files.length > 0) { setFiles([]); setGeneratedImages([]); announceToScreenReader("Files cleared") } }
    }
    window.addEventListener("keydown", handler)
    return () => window.removeEventListener("keydown", handler)
  }, [isProcessing, files, generatedImages])

  const handleFilesSelected = useCallback((f: File[]) => { setFiles(f); setCropOffsets({}); setGeneratedImages((prev) => { prev.forEach((i) => URL.revokeObjectURL(i.url)); return [] }); announceToScreenReader(`${f.length} file${f.length > 1 ? "s" : ""} selected`) }, [])
  const toggleSize = (id: string, checked: boolean) => setSelectedSizes((prev) => { const n = new Set(prev); checked ? n.add(id) : n.delete(id); return n })
  const removeChip = (id: string) => setSelectedSizes((prev) => { const n = new Set(prev); n.delete(id); return n })
  const selectAllForPlatform = (g: { sizes: SizePreset[] }) => setSelectedSizes((prev) => { const n = new Set(prev); g.sizes.forEach((s) => n.add(s.id)); return n })
  const deselectAllForPlatform = (g: { sizes: SizePreset[] }) => setSelectedSizes((prev) => { const n = new Set(prev); g.sizes.forEach((s) => n.delete(s.id)); return n })

  const addCustomSize = () => {
    const w = parseInt(customWidth), h = parseInt(customHeight)
    if (!w || !h || w < 1 || h < 1) return
    const label = customLabel.trim() || `${w}x${h}`
    const id = `custom-${Date.now()}`
    const preset: SizePreset = { id, platform: "custom", platformLabel: "Custom", label, width: w, height: h, ratio: getSimpleRatio(w, h) }
    setCustomSizes((prev) => [...prev, preset])
    setSelectedSizes((prev) => { const n = new Set(prev); n.add(id); return n })
    setCustomLabel("")
  }

  const removeCustomSize = (id: string) => { setCustomSizes((prev) => prev.filter((s) => s.id !== id)); setSelectedSizes((prev) => { const n = new Set(prev); n.delete(id); return n }) }

  const getDrawRect = (bW: number, bH: number, tW: number, tH: number, ox: number, oy: number) => {
    const sa = bW / bH, ta = tW / tH
    let dW = tW, dH = tH
    if (sa > ta) { dH = tH; dW = tH * sa } else { dW = tW; dH = tW / sa }
    const ovX = Math.max(0, dW - tW), ovY = Math.max(0, dH - tH)
    return { drawX: (tW - dW) / 2 + (ovX / 2) * ox, drawY: (tH - dH) / 2 + (ovY / 2) * oy, drawWidth: dW, drawHeight: dH }
  }

  const renderVariant = async (file: File, preset: SizePreset, ox: number, oy: number) => {
    const bmp = await createImageBitmap(file)
    const canvas = document.createElement("canvas")
    canvas.width = preset.width; canvas.height = preset.height
    const ctx = canvas.getContext("2d")
    if (!ctx) { bmp.close(); return null }
    const r = getDrawRect(bmp.width, bmp.height, preset.width, preset.height, ox, oy)
    ctx.drawImage(bmp, r.drawX, r.drawY, r.drawWidth, r.drawHeight)
    bmp.close()
    const mimeType = `image/${outputFormat}`
    const qualityValue = outputFormat === "png" ? undefined : quality / 100
    const blob = await new Promise<Blob | null>((res) => canvas.toBlob(res, mimeType, qualityValue))
    if (!blob) return null
    return { blob, url: URL.createObjectURL(blob) }
  }

  const generateSelected = useCallback(async () => {
    if (!files.length || !selectedPresetList.length) return
    setIsProcessing(true)
    const next: GeneratedImage[] = []
    for (const file of files) {
      const name = file.name.replace(/\.[^/.]+$/, "")
      for (const preset of selectedPresetList) {
        const offset = cropOffsets[preset.id] ?? { x: 0, y: 0 }
        const rendered = await renderVariant(file, preset, offset.x, offset.y)
        if (!rendered) continue
        next.push({ id: `${file.name}-${file.lastModified}-${preset.id}`, presetId: preset.id, presetLabel: preset.label, platformLabel: preset.platformLabel, width: preset.width, height: preset.height, ratio: preset.ratio, fileName: `${name}_${preset.id}.${outputFormat === "jpeg" ? "jpg" : outputFormat}`, sourceFile: file, url: rendered.url, blob: rendered.blob })
      }
    }
    setGeneratedImages((prev) => { prev.forEach((i) => URL.revokeObjectURL(i.url)); return next })
    setIsProcessing(false)
    announceToScreenReader(`${next.length} images generated`)
  }, [files, selectedPresetList, cropOffsets, outputFormat])

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!activePreviewPreset) return
    e.preventDefault(); e.currentTarget.setPointerCapture(e.pointerId)
    const current = cropOffsets[activePreviewPreset.id] ?? { x: 0, y: 0 }
    dragRef.current = { presetId: activePreviewPreset.id, startX: e.clientX, startY: e.clientY, startOffsetX: current.x, startOffsetY: current.y }
  }

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragRef.current || !activePreviewPreset || !firstFileSize) return
    const cW = containerSize?.w ?? cropContainerRef.current?.offsetWidth ?? 0
    const cH = containerSize?.h ?? cropContainerRef.current?.offsetHeight ?? 0
    if (!cW || !cH) return
    const imgAspect = firstFileSize.width / firstFileSize.height
    const containerAspect = cW / cH
    const targetAspect = activePreviewPreset.width / activePreviewPreset.height
    let rendW: number, rendH: number
    if (imgAspect > containerAspect) { rendW = cW; rendH = cW / imgAspect } else { rendH = cH; rendW = cH * imgAspect }
    let cropW: number, cropH: number
    if (imgAspect > targetAspect) { cropH = rendH; cropW = rendH * targetAspect } else { cropW = rendW; cropH = rendW / targetAspect }
    const movX = Math.max(1, rendW - cropW), movY = Math.max(1, rendH - cropH)
    const dx = (e.clientX - dragRef.current.startX) / (movX / 2)
    const dy = (e.clientY - dragRef.current.startY) / (movY / 2)
    const saved = dragRef.current
    setCropOffsets((prev) => ({ ...prev, [activePreviewPreset.id]: { x: clamp(saved.startOffsetX + dx, -1, 1), y: clamp(saved.startOffsetY + dy, -1, 1) } }))
  }

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => { e.currentTarget.releasePointerCapture(e.pointerId); dragRef.current = null }

  const downloadFile = (url: string, name: string) => { const a = document.createElement("a"); a.href = url; a.download = name; a.click() }

  const downloadAll = useCallback(async () => {
    if (!generatedImages.length) return
    const zip = new JSZip()
    generatedImages.forEach((item) => { zip.folder(item.sourceFile.name.replace(/\.[^/.]+$/, ""))?.file(item.fileName, item.blob) })
    const blob = await zip.generateAsync({ type: "blob" })
    const url = URL.createObjectURL(blob)
    downloadFile(url, "resized-social-images.zip")
    URL.revokeObjectURL(url)
    setDownloading(true)
    announceToScreenReader("Downloaded all images as ZIP")
    setTimeout(() => setDownloading(false), 1500)
  }, [generatedImages])

  const overlayRect = useMemo(() => {
    if (!firstFileSize || !activePreviewPreset) return null
    const cW = containerSize?.w ?? cropContainerRef.current?.offsetWidth ?? 0
    const cH = containerSize?.h ?? cropContainerRef.current?.offsetHeight ?? 0
    if (!cW || !cH) return null
    const offset = cropOffsets[activePreviewPreset.id] ?? { x: 0, y: 0 }
    return computeOverlay(cW, cH, firstFileSize.width, firstFileSize.height, activePreviewPreset.width, activePreviewPreset.height, offset.x, offset.y)
  }, [containerSize, firstFileSize, activePreviewPreset, cropOffsets])

  return (
    <div className="flex flex-1 flex-col min-h-0" role="main" aria-label="Image Resizer tool">
      {/* Desktop top bar */}
      <div className="hidden md:flex shrink-0 items-center gap-2 border-b border-border bg-card/95 backdrop-blur-sm px-4 py-2">
        <span className="text-sm font-semibold shrink-0 mr-1">Image Resizer</span>
        <div className="ml-auto flex items-center gap-1.5">
          <ShortcutsModal
            pageName="Image Resizer"
            shortcuts={[
              { keys: ["Ctrl", "Shift", "U"], description: "Upload images" },
              { keys: ["Ctrl", "Enter"], description: "Generate selected sizes" },
              { keys: ["Ctrl", "Shift", "S"], description: "Download all as ZIP" },
              { keys: ["Ctrl", "Backspace"], description: "Clear all files" },
              { keys: ["?"], description: "Toggle this shortcuts panel" },
            ]}
          />
          {generatedImages.length > 0 && (
            <Button
              variant={downloading ? "outline" : "default"}
              size="sm"
              onClick={() => downloadAll()}
              aria-label={downloading ? "All images downloaded as ZIP" : `Download all ${generatedImages.length} images as ZIP`}
              className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
            >
              {downloading ? <Check className="mr-2 h-4 w-4" aria-hidden="true" /> : <Download className="mr-2 h-4 w-4" aria-hidden="true" />}
              {downloading ? "Downloaded!" : "Download All as ZIP"}
              <kbd className={`ml-2 hidden md:inline rounded border px-1.5 text-[10px] ${downloading ? "border-border bg-muted" : "border-primary-foreground/30 bg-primary-foreground/20"}`} aria-hidden="true">Ctrl+Shift+S</kbd>
            </Button>
          )}
        </div>
      </div>

      {/* Mobile header */}
      <div className="flex md:hidden flex-col shrink-0 border-b border-border">
        <div className="flex items-center justify-between px-4 pt-3 pb-2">
          <h2 className="text-base font-semibold">Image Resizer</h2>
          <ShortcutsModal
            pageName="Image Resizer"
            shortcuts={[
              { keys: ["Ctrl", "Shift", "U"], description: "Upload images" },
              { keys: ["Ctrl", "Enter"], description: "Generate selected sizes" },
              { keys: ["Ctrl", "Shift", "S"], description: "Download all as ZIP" },
              { keys: ["Ctrl", "Backspace"], description: "Clear all files" },
              { keys: ["?"], description: "Toggle this shortcuts panel" },
            ]}
          />
        </div>
        <div className="flex" role="tablist" aria-label="Panel selection">
          <button
            role="tab"
            aria-selected={activeTab === "input"}
            onClick={() => setActiveTab("input")}
            className={`flex-1 py-2.5 text-sm font-medium border-b-2 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-inset ${activeTab === "input" ? "border-primary text-foreground" : "border-transparent text-muted-foreground"}`}
          >
            Settings
          </button>
          <button
            role="tab"
            aria-selected={activeTab === "output"}
            onClick={() => setActiveTab("output")}
            className={`flex-1 py-2.5 text-sm font-medium border-b-2 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-inset ${activeTab === "output" ? "border-primary text-foreground" : "border-transparent text-muted-foreground"}`}
          >
            Preview
          </button>
        </div>
      </div>

      {/* Panels */}
      <div className="flex-1 min-h-0 flex flex-col md:flex-row overflow-hidden">
        {/* LEFT PANEL */}
        <div className={`${activeTab === "input" ? "flex" : "hidden"} md:flex flex-col flex-1 min-h-0 overflow-hidden border-b md:border-b-0 md:border-r border-border bg-card`} role="region" aria-labelledby="left-panel-label">
          <div className="shrink-0 border-b border-border px-4 py-3">
            <div className="flex items-center gap-2">
              <Crop className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
              <span className="text-sm font-medium" id="left-panel-label">Upload &amp; Size Selection</span>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">40+ sizes across 12 platforms · Custom size support · Press Ctrl+Shift+U to upload</p>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            <FileDropzone ref={uploadRef} accept="image/*" onFilesSelected={handleFilesSelected} maxFiles={20} multiple shortcut="Ctrl+Shift+U" />

            {selectedChips.length > 0 && (
              <div className="space-y-1" role="group" aria-labelledby="selected-sizes-label">
                <p className="text-xs font-medium text-muted-foreground" id="selected-sizes-label">{selectedChips.length} size{selectedChips.length !== 1 ? "s" : ""} selected</p>
                <div className="flex flex-wrap gap-1.5" role="list" aria-label="Selected sizes">
                  {selectedChips.map((chip) => (
                    <span key={chip.id} className="inline-flex items-center gap-1 rounded-full border border-border bg-muted px-2 py-0.5 text-xs" role="listitem">
                      {chip.label}
                      <button type="button" onClick={() => { removeChip(chip.id); announceToScreenReader(`${chip.label} removed`) }} aria-label={`Remove ${chip.label}`} className="ml-0.5 hover:text-destructive focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-destructive focus-visible:ring-offset-2 rounded">x</button>
                    </span>
                  ))}
                </div>
              </div>
            )}

            <Accordion type="multiple" className="rounded-lg border border-border px-3" role="group" aria-label="Platform size presets">
              {PLATFORM_GROUPS.map((group) => (
                <AccordionItem key={group.id} value={group.id}>
                  <AccordionTrigger className="py-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 rounded">
                    <span className="flex items-center gap-2">
                      <span className="font-medium">{group.label}</span>
                      {group.sizes.some((s) => selectedSizes.has(s.id)) && (
                        <span className="rounded-full bg-primary px-1.5 py-0.5 text-[10px] text-primary-foreground" aria-label={`${group.sizes.filter((s) => selectedSizes.has(s.id)).length} sizes selected`}>{group.sizes.filter((s) => selectedSizes.has(s.id)).length}</span>
                      )}
                    </span>
                  </AccordionTrigger>
                  <AccordionContent className="space-y-3">
                    <div className="flex gap-2">
                      <Button type="button" variant="outline" size="sm" onClick={() => { selectAllForPlatform(group); announceToScreenReader(`All ${group.label} sizes selected`) }} className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2">Select All</Button>
                      <Button type="button" variant="outline" size="sm" onClick={() => { deselectAllForPlatform(group); announceToScreenReader(`${group.label} sizes deselected`) }} className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2">Deselect All</Button>
                    </div>
                    <div className="grid gap-2" role="group" aria-label={`${group.label} size options`}>
                      {group.sizes.map((preset) => (
                        <label key={preset.id} className="flex cursor-pointer items-center justify-between rounded-lg border border-border px-3 py-2 text-sm focus-within:ring-2 focus-within:ring-primary focus-within:ring-offset-2">
                          <div className="flex items-center gap-2">
                            <Checkbox checked={selectedSizes.has(preset.id)} onCheckedChange={(c: boolean | "indeterminate") => { toggleSize(preset.id, Boolean(c)); announceToScreenReader(c ? `${preset.label} selected` : `${preset.label} deselected`) }} aria-label={`${preset.label} ${preset.width} by ${preset.height} pixels`} />
                            <span>{preset.label}</span>
                          </div>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <span className="rounded bg-muted px-1.5 py-0.5 font-mono" aria-label={`Aspect ratio ${preset.ratio}`}>{preset.ratio}</span>
                            <span aria-label={`${preset.width} by ${preset.height} pixels`}>{preset.width}x{preset.height}</span>
                          </div>
                        </label>
                      ))}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>

            {/* Custom sizes list */}
            {customSizes.length > 0 && (
              <div className="grid gap-2" role="group" aria-label="Custom sizes">
                {customSizes.map((preset) => (
                  <div key={preset.id} className="flex items-center justify-between rounded-lg border border-border px-3 py-2 text-sm">
                    <div className="flex items-center gap-2">
                      <Checkbox checked={selectedSizes.has(preset.id)} onCheckedChange={(c: boolean | "indeterminate") => { toggleSize(preset.id, Boolean(c)); announceToScreenReader(c ? `${preset.label} selected` : `${preset.label} deselected`) }} aria-label={`Custom size ${preset.label}`} />
                      <span>{preset.label}</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span className="rounded bg-muted px-1.5 py-0.5 font-mono">{preset.ratio}</span>
                      <span>{preset.width}x{preset.height}</span>
                      <button type="button" onClick={() => { removeCustomSize(preset.id); announceToScreenReader(`${preset.label} removed`) }} aria-label="Remove custom size" className="hover:text-destructive focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-destructive focus-visible:ring-offset-2 rounded"><X className="h-3.5 w-3.5" /></button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Custom Size Form */}
            <div className="space-y-3 rounded-lg border border-dashed border-border p-3" role="group" aria-labelledby="custom-size-label">
              <p className="text-xs font-medium text-muted-foreground" id="custom-size-label">Add Custom Size</p>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label className="text-xs" htmlFor="custom-width">Width (px)</Label>
                  <Input id="custom-width" type="number" min="1" max="9999" value={customWidth} onChange={(e) => setCustomWidth(e.target.value)} className="h-8 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2" aria-describedby="width-help" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs" htmlFor="custom-height">Height (px)</Label>
                  <Input id="custom-height" type="number" min="1" max="9999" value={customHeight} onChange={(e) => setCustomHeight(e.target.value)} className="h-8 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2" aria-describedby="height-help" />
                </div>
              </div>
              <div className="space-y-1">
                <Label className="text-xs" htmlFor="custom-label-input">Label (optional)</Label>
                <Input id="custom-label-input" placeholder={`${customWidth}x${customHeight}`} value={customLabel} onChange={(e) => setCustomLabel(e.target.value)} className="h-8 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2" />
              </div>
              <Button type="button" variant="outline" size="sm" className="w-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2" onClick={() => { addCustomSize(); announceToScreenReader("Custom size added") }}>
                <Plus className="mr-2 h-3.5 w-3.5" aria-hidden="true" />Add Custom Size
              </Button>
            </div>

            {/* Output Format */}
            <div className="space-y-3 rounded-lg border border-border p-3" role="group" aria-labelledby="output-format-label">
              <div className="space-y-1">
                <Label className="text-xs" id="output-format-label">Output Format</Label>
                <div className="flex gap-2" role="group" aria-label="Format selection">
                  {(["jpeg", "png", "webp"] as OutputFormat[]).map((fmt) => (
                    <button key={fmt} type="button" onClick={() => { setOutputFormat(fmt); announceToScreenReader(`${fmt === "jpeg" ? "JPG" : fmt.toUpperCase()} format selected`) }}
                      aria-pressed={outputFormat === fmt}
                      aria-label={`${fmt === "jpeg" ? "JPG" : fmt.toUpperCase()} format`}
                      className={`flex-1 rounded-md border px-2 py-1 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 ${outputFormat === fmt ? "border-primary bg-primary text-primary-foreground" : "border-border hover:border-primary/50"}`}>
                      {fmt === "jpeg" ? "JPG" : fmt.toUpperCase()}
                    </button>
                  ))}
                </div>
              </div>
              {outputFormat !== "png" && (
                <div className="space-y-1" role="group" aria-labelledby="quality-label">
                  <div className="flex justify-between">
                    <Label className="text-xs" id="quality-label">Quality</Label>
                    <span className="text-xs text-muted-foreground" aria-live="polite">{quality}%</span>
                  </div>
                  <input
                    type="range"
                    min={50}
                    max={100}
                    value={quality}
                    onChange={(e) => { setQuality(Number(e.target.value)); announceToScreenReader(`Quality ${e.target.value} percent`) }}
                    className="w-full accent-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                    aria-label={`Quality ${quality} percent`}
                    aria-valuetext={`${quality} percent`}
                  />
                </div>
              )}
            </div>

            {/* USAGE GUIDE */}
            <div className="rounded-xl border border-border bg-card p-4 space-y-4">
              <div className="space-y-1.5">
                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">How to use</p>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Upload one or more images, select the sizes you want, then click <span className="text-foreground font-medium">Generate</span>.
                  Each image is resized to every selected size and shown in the Preview panel ready to download.
                  Use <span className="text-foreground font-medium">Ctrl+Enter</span> to generate without leaving the keyboard.
                </p>
              </div>
              <div className="space-y-1.5">
                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">Platforms and sizes</p>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  40+ preset sizes across 12 platforms including Instagram, YouTube, LinkedIn, and TikTok.
                  Use <span className="text-foreground font-medium">Select All</span> or <span className="text-foreground font-medium">Deselect All</span> inside each accordion to pick sizes in bulk.
                </p>
              </div>
              <div className="space-y-1.5">
                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">Custom sizes</p>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Enter a width, height, and optional label in the <span className="text-foreground font-medium">Add Custom Size</span> form. Custom sizes appear as checkboxes alongside the platform presets and can be removed at any time.
                </p>
              </div>
              <div className="space-y-1.5">
                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">Crop position</p>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  The Preview panel shows a crop overlay for the selected size. <span className="text-foreground font-medium">Drag</span> the overlay to shift the crop focus before generating.
                  Use the dropdown to switch between sizes and adjust each independently.
                </p>
              </div>
              <div className="space-y-1.5">
                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">Output format</p>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  <span className="text-foreground font-medium">JPG</span> and <span className="text-foreground font-medium">WebP</span> support a quality slider (50 to 100).
                  <span className="text-foreground font-medium"> PNG</span> is always lossless.
                  All resized images download together as a single ZIP file.
                </p>
              </div>
              <p className="text-xs text-muted-foreground">Everything runs in your browser. Nothing is sent to a server.</p>
            </div>

            <div className="md:hidden h-[60px]" aria-hidden="true" />
          </div>

          {/* Sticky Action Bar — left panel (desktop only) */}
          <div className="hidden md:block shrink-0 border-t border-border bg-card/95 backdrop-blur-sm px-4 py-3" role="group" aria-label="Generate actions">
            {files.length > 0 && selectedPresetList.length > 0 ? (
              <Button onClick={() => { generateSelected(); announceToScreenReader("Generating images") }} disabled={isProcessing} className="w-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2" aria-label={isProcessing ? "Processing images" : `Generate ${selectedPresetList.length} resized images`}>
                {isProcessing ? "Processing..." : (
                  <span className="flex items-center justify-between w-full">
                    <span>Generate {selectedPresetList.length} Selected</span>
                    <kbd className="ml-2 hidden md:inline rounded border border-primary-foreground/30 px-1 text-[10px] opacity-50" aria-hidden="true">Ctrl+Enter</kbd>
                  </span>
                )}
              </Button>
            ) : (
              <p className="text-xs text-muted-foreground text-center" role="status" aria-live="polite">
                {files.length === 0 ? "Upload images to get started" : "Select at least one size"}
              </p>
            )}
          </div>
        </div>

        {/* RIGHT PANEL */}
        <div className={`${activeTab === "output" ? "flex" : "hidden"} md:flex flex-col flex-1 min-h-0 overflow-hidden bg-card`} role="region" aria-labelledby="right-panel-label">
          <div className="shrink-0 border-b border-border px-4 py-3">
            <span className="text-sm font-medium" id="right-panel-label">Preview &amp; Results</span>
            <p className="text-xs text-muted-foreground">Drag overlay to adjust crop position.</p>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {/* Crop Preview */}
            {files.length > 0 && selectedPresetList.length > 0 && firstFileUrl && firstFileSize && activePreviewPreset && (
              <div className="space-y-3" role="group" aria-labelledby="crop-preview-label">
                <div className="space-y-1">
                  <Label className="text-xs" id="crop-preview-label">Preview size</Label>
                  <StyledSelect
                    value={activePreviewPreset.id}
                    onChange={(v) => { setActivePreviewPresetId(v); announceToScreenReader(`${v} selected for preview`) }}
                    options={selectedPresetList.map((p) => ({ value: p.id, label: `${p.platformLabel} - ${p.label} (${p.ratio}) ${p.width}x${p.height}` }))}
                  />
                </div>
                <div ref={cropContainerRef} className="relative h-60 overflow-hidden rounded-md border border-border bg-muted/40 focus-within:ring-2 focus-within:ring-primary focus-within:ring-offset-2"
                  onPointerDown={handlePointerDown} onPointerMove={handlePointerMove} onPointerUp={handlePointerUp} onPointerCancel={handlePointerUp}
                  style={{ cursor: "grab", touchAction: "none" }}
                  role="img"
                  aria-label={`Crop preview for ${activePreviewPreset.platformLabel} ${activePreviewPreset.label}. Drag to adjust crop position.`}
                  tabIndex={0}
                >
                  <img src={firstFileUrl} alt="Original preview" className="h-full w-full object-contain select-none pointer-events-none" draggable={false} />
                  {overlayRect && (
                    <div className="pointer-events-none absolute border-2 border-primary"
                      style={{ left: overlayRect.cropX, top: overlayRect.cropY, width: overlayRect.cropW, height: overlayRect.cropH, boxShadow: "0 0 0 9999px rgba(0,0,0,0.35)" }}
                      aria-hidden="true"
                    />
                  )}
                </div>
                <p className="text-xs text-muted-foreground" aria-live="polite">{activePreviewPreset.platformLabel} · {activePreviewPreset.label} · {activePreviewPreset.ratio} · {activePreviewPreset.width}x{activePreviewPreset.height}px</p>
              </div>
            )}

            {/* Generated Images */}
            {generatedImages.length > 0 ? (
              <div className="space-y-3" role="region" aria-labelledby="generated-label">
                <p className="text-xs font-medium text-muted-foreground flex items-center gap-1" id="generated-label">
                  <CheckCircle2 className="h-3.5 w-3.5 text-green-500" aria-hidden="true" />
                  <span aria-live="polite">{generatedImages.length} image{generatedImages.length !== 1 ? "s" : ""} generated</span>
                </p>
                <div className="grid gap-3 sm:grid-cols-2" role="list" aria-label="Generated images">
                  {generatedImages.map((item) => (
                    <div key={item.id} className="space-y-2 rounded-lg border border-border bg-muted/50 p-3" role="listitem">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="truncate text-xs font-medium">{item.platformLabel} {item.presetLabel}</p>
                          <p className="text-xs text-muted-foreground">{item.ratio} · {item.width}x{item.height}</p>
                        </div>
                        <Button variant="ghost" size="sm" aria-label={`Download ${item.fileName}`} className="h-7 px-2 text-xs shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2" onClick={() => { downloadFile(item.url, item.fileName); announceToScreenReader(`Downloaded ${item.fileName}`) }}>
                          <Download className="h-3.5 w-3.5" aria-hidden="true" />
                        </Button>
                      </div>
                      <img src={item.url} alt={`${item.platformLabel} ${item.presetLabel} preview ${item.width} by ${item.height} pixels`} className="w-full rounded-md border border-border" />
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              !firstFileUrl && (
                <div className="flex h-full min-h-[200px] items-center justify-center" role="status">
                  <p className="text-sm text-muted-foreground text-center">Upload images and select sizes,<br />then click Generate.</p>
                </div>
              )
            )}
            <div className="md:hidden h-[60px]" aria-hidden="true" />
          </div>
        </div>
      </div>

      {/* Mobile bottom bar */}
      <div
        className="md:hidden fixed bottom-0 left-0 right-0 flex items-center gap-1.5 border-t border-border bg-card/95 backdrop-blur-sm px-3 py-2 z-20"
        style={{ paddingBottom: "max(0.5rem, env(safe-area-inset-bottom))" }}
      >
        {activeTab === "input" ? (
          files.length > 0 && selectedPresetList.length > 0 ? (
            <Button
              onClick={() => { generateSelected(); setActiveTab("output"); announceToScreenReader("Generating images") }}
              disabled={isProcessing}
              className="w-full h-11 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
              aria-label={isProcessing ? "Processing images" : `Generate ${selectedPresetList.length} resized images`}
            >
              {isProcessing ? "Processing..." : `Generate ${selectedPresetList.length} Selected`}
            </Button>
          ) : (
            <p className="text-xs text-muted-foreground text-center w-full" role="status" aria-live="polite">
              {files.length === 0 ? "Upload images to get started" : "Select at least one size"}
            </p>
          )
        ) : (
          generatedImages.length > 0 && (
            <Button
              variant={downloading ? "outline" : "default"}
              className="w-full h-11 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
              onClick={() => downloadAll()}
              aria-label={downloading ? "All images downloaded as ZIP" : `Download all ${generatedImages.length} images as ZIP`}
            >
              {downloading ? <Check className="mr-2 h-4 w-4" aria-hidden="true" /> : <Download className="mr-2 h-4 w-4" aria-hidden="true" />}
              {downloading ? "Downloaded!" : "Download All as ZIP"}
            </Button>
          )
        )}
      </div>
    </div>
  )
}
