"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { Download, CheckCircle2, ChevronDown, Plus, X } from "lucide-react"
import JSZip from "jszip"
import { FileDropzone } from "@/components/file-dropzone"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ShortcutsModal } from "@/components/shortcuts-modal"

type OutputFormat = "jpeg" | "png" | "webp"

type PlatformId =
  | "instagram" | "facebook" | "twitter" | "tiktok" | "linkedin"
  | "youtube" | "pinterest" | "threads" | "snapchat" | "bluesky"
  | "whatsapp" | "reddit" | "custom"

type SizePreset = {
  id: string
  platform: PlatformId
  platformLabel: string
  label: string
  width: number
  height: number
  ratio: string
}

const PLATFORM_GROUPS: Array<{ id: PlatformId; label: string; sizes: SizePreset[] }> = [
  {
    id: "instagram", label: "Instagram",
    sizes: [
      { id: "instagram-square-post", platform: "instagram", platformLabel: "Instagram", label: "Square Post", width: 1080, height: 1080, ratio: "1:1" },
      { id: "instagram-4x5-vertical", platform: "instagram", platformLabel: "Instagram", label: "4:5 Vertical", width: 1080, height: 1350, ratio: "4:5" },
      { id: "instagram-3x4-vertical", platform: "instagram", platformLabel: "Instagram", label: "3:4 Vertical", width: 1080, height: 1440, ratio: "3:4" },
      { id: "instagram-horizontal", platform: "instagram", platformLabel: "Instagram", label: "Horizontal", width: 1080, height: 566, ratio: "1.91:1" },
      { id: "instagram-story-reels", platform: "instagram", platformLabel: "Instagram", label: "Story/Reels", width: 1080, height: 1920, ratio: "9:16" },
      { id: "instagram-profile", platform: "instagram", platformLabel: "Instagram", label: "Profile", width: 320, height: 320, ratio: "1:1" },
    ],
  },
  {
    id: "facebook", label: "Facebook",
    sizes: [
      { id: "facebook-post", platform: "facebook", platformLabel: "Facebook", label: "Post", width: 1200, height: 630, ratio: "1.91:1" },
      { id: "facebook-story", platform: "facebook", platformLabel: "Facebook", label: "Story", width: 1080, height: 1920, ratio: "9:16" },
      { id: "facebook-cover-photo", platform: "facebook", platformLabel: "Facebook", label: "Cover Photo", width: 820, height: 312, ratio: "2.63:1" },
      { id: "facebook-profile", platform: "facebook", platformLabel: "Facebook", label: "Profile", width: 320, height: 320, ratio: "1:1" },
      { id: "facebook-carousel", platform: "facebook", platformLabel: "Facebook", label: "Carousel", width: 1200, height: 1200, ratio: "1:1" },
    ],
  },
  {
    id: "twitter", label: "Twitter/X",
    sizes: [
      { id: "twitter-post", platform: "twitter", platformLabel: "Twitter/X", label: "Post", width: 1200, height: 675, ratio: "16:9" },
      { id: "twitter-square-post", platform: "twitter", platformLabel: "Twitter/X", label: "Square Post", width: 1080, height: 1080, ratio: "1:1" },
      { id: "twitter-header", platform: "twitter", platformLabel: "Twitter/X", label: "Header", width: 1500, height: 500, ratio: "3:1" },
      { id: "twitter-profile", platform: "twitter", platformLabel: "Twitter/X", label: "Profile", width: 400, height: 400, ratio: "1:1" },
    ],
  },
  {
    id: "tiktok", label: "TikTok",
    sizes: [
      { id: "tiktok-vertical-cover", platform: "tiktok", platformLabel: "TikTok", label: "Vertical Cover", width: 1080, height: 1920, ratio: "9:16" },
      { id: "tiktok-feed-square", platform: "tiktok", platformLabel: "TikTok", label: "Feed Square", width: 1080, height: 1080, ratio: "1:1" },
      { id: "tiktok-profile", platform: "tiktok", platformLabel: "TikTok", label: "Profile", width: 200, height: 200, ratio: "1:1" },
    ],
  },
  {
    id: "linkedin", label: "LinkedIn",
    sizes: [
      { id: "linkedin-post", platform: "linkedin", platformLabel: "LinkedIn", label: "Post", width: 1200, height: 627, ratio: "1.91:1" },
      { id: "linkedin-cover", platform: "linkedin", platformLabel: "LinkedIn", label: "Cover", width: 1584, height: 396, ratio: "4:1" },
      { id: "linkedin-profile", platform: "linkedin", platformLabel: "LinkedIn", label: "Profile", width: 400, height: 400, ratio: "1:1" },
    ],
  },
  {
    id: "youtube", label: "YouTube",
    sizes: [
      { id: "youtube-thumbnail", platform: "youtube", platformLabel: "YouTube", label: "Thumbnail", width: 1280, height: 720, ratio: "16:9" },
      { id: "youtube-channel-banner", platform: "youtube", platformLabel: "YouTube", label: "Channel Banner", width: 2560, height: 1440, ratio: "16:9" },
      { id: "youtube-profile", platform: "youtube", platformLabel: "YouTube", label: "Profile", width: 800, height: 800, ratio: "1:1" },
    ],
  },
  {
    id: "pinterest", label: "Pinterest",
    sizes: [
      { id: "pinterest-standard-pin", platform: "pinterest", platformLabel: "Pinterest", label: "Standard Pin", width: 1000, height: 1500, ratio: "2:3" },
      { id: "pinterest-square-pin", platform: "pinterest", platformLabel: "Pinterest", label: "Square Pin", width: 1000, height: 1000, ratio: "1:1" },
      { id: "pinterest-board-cover", platform: "pinterest", platformLabel: "Pinterest", label: "Board Cover", width: 800, height: 800, ratio: "1:1" },
    ],
  },
  {
    id: "threads", label: "Threads",
    sizes: [
      { id: "threads-post-square", platform: "threads", platformLabel: "Threads", label: "Post Square", width: 1080, height: 1080, ratio: "1:1" },
      { id: "threads-vertical", platform: "threads", platformLabel: "Threads", label: "Vertical", width: 1080, height: 1350, ratio: "4:5" },
    ],
  },
  {
    id: "snapchat", label: "Snapchat",
    sizes: [
      { id: "snapchat-story", platform: "snapchat", platformLabel: "Snapchat", label: "Story", width: 1080, height: 1920, ratio: "9:16" },
      { id: "snapchat-profile", platform: "snapchat", platformLabel: "Snapchat", label: "Profile", width: 320, height: 320, ratio: "1:1" },
    ],
  },
  {
    id: "bluesky", label: "Bluesky",
    sizes: [
      { id: "bluesky-post-square", platform: "bluesky", platformLabel: "Bluesky", label: "Post Square", width: 1200, height: 1200, ratio: "1:1" },
      { id: "bluesky-landscape", platform: "bluesky", platformLabel: "Bluesky", label: "Landscape", width: 1200, height: 675, ratio: "16:9" },
      { id: "bluesky-banner", platform: "bluesky", platformLabel: "Bluesky", label: "Banner", width: 1500, height: 500, ratio: "3:1" },
    ],
  },
  {
    id: "whatsapp", label: "WhatsApp",
    sizes: [
      { id: "whatsapp-profile", platform: "whatsapp", platformLabel: "WhatsApp", label: "Profile", width: 640, height: 640, ratio: "1:1" },
      { id: "whatsapp-status", platform: "whatsapp", platformLabel: "WhatsApp", label: "Status", width: 1080, height: 1920, ratio: "9:16" },
    ],
  },
  {
    id: "reddit", label: "Reddit",
    sizes: [
      { id: "reddit-post", platform: "reddit", platformLabel: "Reddit", label: "Post", width: 1200, height: 628, ratio: "1.91:1" },
      { id: "reddit-banner", platform: "reddit", platformLabel: "Reddit", label: "Banner", width: 1920, height: 384, ratio: "5:1" },
      { id: "reddit-profile", platform: "reddit", platformLabel: "Reddit", label: "Profile", width: 256, height: 256, ratio: "1:1" },
    ],
  },
]

const PRESET_BY_ID = new Map(PLATFORM_GROUPS.flatMap((g) => g.sizes.map((s) => [s.id, s])))

function getSimpleRatio(w: number, h: number): string {
  const gcd = (a: number, b: number): number => b === 0 ? a : gcd(b, a % b)
  const d = gcd(w, h)
  return `${w / d}:${h / d}`
}

type GeneratedImage = {
  id: string
  presetId: string
  presetLabel: string
  platformLabel: string
  width: number
  height: number
  ratio: string
  fileName: string
  sourceFile: File
  url: string
  blob: Blob
}

const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v))

function StyledSelect({
  value, onChange, options,
}: {
  value: string
  onChange: (v: string) => void
  options: { value: string; label: string }[]
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const selected = options.find((o) => o.value === value)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [])

  return (
    <div ref={ref} className="relative w-full">
      <button type="button" onClick={() => setOpen((v) => !v)}
        className="flex h-9 w-full items-center justify-between rounded-md border border-input bg-background px-3 text-sm text-foreground">
        <span className="truncate">{selected?.label ?? "Select..."}</span>
        <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
      </button>
      {open && (
        <div className="absolute z-50 mt-1 max-h-60 w-full overflow-auto rounded-md border border-border bg-popover shadow-md">
          {options.map((opt) => (
            <button key={opt.value} type="button"
              onClick={() => { onChange(opt.value); setOpen(false) }}
              className={`flex w-full items-center px-3 py-2 text-left text-sm hover:bg-accent hover:text-accent-foreground ${opt.value === value ? "bg-accent/50 font-medium" : ""}`}>
              {opt.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

function computeOverlay(
  containerW: number, containerH: number,
  imgW: number, imgH: number,
  targetW: number, targetH: number,
  offsetX: number, offsetY: number
) {
  const imgAspect = imgW / imgH
  const containerAspect = containerW / containerH
  const targetAspect = targetW / targetH
  let rendW: number, rendH: number
  if (imgAspect > containerAspect) { rendW = containerW; rendH = containerW / imgAspect }
  else { rendH = containerH; rendW = containerH * imgAspect }
  const rendX = (containerW - rendW) / 2
  const rendY = (containerH - rendH) / 2
  let cropW: number, cropH: number
  if (imgAspect > targetAspect) { cropH = rendH; cropW = rendH * targetAspect }
  else { cropW = rendW; cropH = rendW / targetAspect }
  const extraX = rendW - cropW
  const extraY = rendH - cropH
  return {
    cropX: rendX + extraX / 2 + (extraX / 2) * offsetX,
    cropY: rendY + extraY / 2 + (extraY / 2) * offsetY,
    cropW, cropH,
  }
}

export function ImageResizer() {
  const [outputFormat, setOutputFormat] = useState<OutputFormat>("jpeg")
  const [quality, setQuality] = useState(92)
  const [files, setFiles] = useState<File[]>([])
  const [selectedSizes, setSelectedSizes] = useState<Set<string>>(
    new Set(["instagram-square-post", "instagram-story-reels"])
  )
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

  const dragRef = useRef<{ presetId: string; startX: number; startY: number; startOffsetX: number; startOffsetY: number } | null>(null)
  const cropContainerRef = useRef<HTMLDivElement>(null)

  const uploadRef = useRef<HTMLInputElement>(null)

  // Merge preset map with custom sizes
  const allPresetById = useMemo(() => {
    const map = new Map(PRESET_BY_ID)
    customSizes.forEach((s) => map.set(s.id, s))
    return map
  }, [customSizes])

  useEffect(() => {
    const el = cropContainerRef.current
    if (!el) return
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) setContainerSize({ w: entry.contentRect.width, h: entry.contentRect.height })
    })
    observer.observe(el)
    setContainerSize({ w: el.offsetWidth, h: el.offsetHeight })
    return () => observer.disconnect()
  }, [])

  const selectedPresetList = useMemo(
    () => [...selectedSizes].map((id) => allPresetById.get(id)).filter((p): p is SizePreset => Boolean(p)),
    [selectedSizes, allPresetById]
  )

  const activePreviewPreset = useMemo(
    () => allPresetById.get(activePreviewPresetId) ?? selectedPresetList[0] ?? null,
    [activePreviewPresetId, selectedPresetList, allPresetById]
  )

  const selectedChips = useMemo(
    () => selectedPresetList.map((p) => ({ id: p.id, label: `${p.platformLabel} ${p.label}` })),
    [selectedPresetList]
  )

  useEffect(() => {
    if (files.length === 0) {
      setFirstFileUrl((prev) => { if (prev) URL.revokeObjectURL(prev); return null })
      setFirstFileSize(null)
      return
    }
    const url = URL.createObjectURL(files[0])
    setFirstFileUrl((prev) => { if (prev) URL.revokeObjectURL(prev); return url })
    let cancelled = false
    createImageBitmap(files[0]).then((bmp) => {
      if (!cancelled) setFirstFileSize({ width: bmp.width, height: bmp.height })
      bmp.close()
    })
    return () => { cancelled = true }
  }, [files])

  useEffect(() => {
    if (selectedPresetList.length > 0 && !selectedSizes.has(activePreviewPresetId)) {
      setActivePreviewPresetId(selectedPresetList[0].id)
    }
  }, [selectedPresetList, selectedSizes, activePreviewPresetId])

  useEffect(() => {
    return () => {
      if (firstFileUrl) URL.revokeObjectURL(firstFileUrl)
      generatedImages.forEach((item) => URL.revokeObjectURL(item.url))
    }
  }, [firstFileUrl, generatedImages])

  const handleFilesSelected = (f: File[]) => {
    setFiles(f)
    setCropOffsets({})
    setGeneratedImages((prev) => { prev.forEach((i) => URL.revokeObjectURL(i.url)); return [] })
  }

  const toggleSize = (id: string, checked: boolean) =>
    setSelectedSizes((prev) => { const n = new Set(prev); checked ? n.add(id) : n.delete(id); return n })

  const removeChip = (id: string) =>
    setSelectedSizes((prev) => { const n = new Set(prev); n.delete(id); return n })

  const selectAllForPlatform = (g: { sizes: SizePreset[] }) =>
    setSelectedSizes((prev) => { const n = new Set(prev); g.sizes.forEach((s) => n.add(s.id)); return n })

  const deselectAllForPlatform = (g: { sizes: SizePreset[] }) =>
    setSelectedSizes((prev) => { const n = new Set(prev); g.sizes.forEach((s) => n.delete(s.id)); return n })

  const addCustomSize = () => {
    const w = parseInt(customWidth)
    const h = parseInt(customHeight)
    if (!w || !h || w < 1 || h < 1) return
    const label = customLabel.trim() || `${w}x${h}`
    const id = `custom-${Date.now()}`
    const preset: SizePreset = {
      id, platform: "custom", platformLabel: "Custom",
      label, width: w, height: h, ratio: getSimpleRatio(w, h),
    }
    setCustomSizes((prev) => [...prev, preset])
    setSelectedSizes((prev) => { const n = new Set(prev); n.add(id); return n })
    setCustomLabel("")
  }

  const removeCustomSize = (id: string) => {
    setCustomSizes((prev) => prev.filter((s) => s.id !== id))
    setSelectedSizes((prev) => { const n = new Set(prev); n.delete(id); return n })
  }

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

  const generateSelected = async () => {
    if (!files.length || !selectedPresetList.length) return
    setIsProcessing(true)
    const next: GeneratedImage[] = []
    for (const file of files) {
      const name = file.name.replace(/\.[^/.]+$/, "")
      for (const preset of selectedPresetList) {
        const offset = cropOffsets[preset.id] ?? { x: 0, y: 0 }
        const rendered = await renderVariant(file, preset, offset.x, offset.y)
        if (!rendered) continue
        next.push({
          id: `${file.name}-${file.lastModified}-${preset.id}`,
          presetId: preset.id, presetLabel: preset.label, platformLabel: preset.platformLabel,
          width: preset.width, height: preset.height, ratio: preset.ratio,
          fileName: `${name}_${preset.id}.${outputFormat === "jpeg" ? "jpg" : outputFormat}`,
          sourceFile: file, url: rendered.url, blob: rendered.blob,
        })
      }
    }
    setGeneratedImages((prev) => { prev.forEach((i) => URL.revokeObjectURL(i.url)); return next })
    setIsProcessing(false)
  }

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!activePreviewPreset) return
    e.preventDefault()
    e.currentTarget.setPointerCapture(e.pointerId)
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
    if (imgAspect > containerAspect) { rendW = cW; rendH = cW / imgAspect }
    else { rendH = cH; rendW = cH * imgAspect }
    let cropW: number, cropH: number
    if (imgAspect > targetAspect) { cropH = rendH; cropW = rendH * targetAspect }
    else { cropW = rendW; cropH = rendW / targetAspect }
    const movX = Math.max(1, rendW - cropW)
    const movY = Math.max(1, rendH - cropH)
    const dx = (e.clientX - dragRef.current.startX) / (movX / 2)
    const dy = (e.clientY - dragRef.current.startY) / (movY / 2)
    const saved = dragRef.current
    setCropOffsets((prev) => ({
      ...prev,
      [activePreviewPreset.id]: {
        x: clamp(saved.startOffsetX + dx, -1, 1),
        y: clamp(saved.startOffsetY + dy, -1, 1),
      },
    }))
  }

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    e.currentTarget.releasePointerCapture(e.pointerId)
    dragRef.current = null
  }

  const downloadFile = (url: string, name: string) => {
    const a = document.createElement("a"); a.href = url; a.download = name; a.click()
  }

  const downloadAll = async () => {
    if (!generatedImages.length) return
    const zip = new JSZip()
    generatedImages.forEach((item) => {
      zip.folder(item.sourceFile.name.replace(/\.[^/.]+$/, ""))?.file(item.fileName, item.blob)
    })
    const blob = await zip.generateAsync({ type: "blob" })
    const url = URL.createObjectURL(blob)
    downloadFile(url, "resized-social-images.zip")
    URL.revokeObjectURL(url)
  }

  const overlayRect = useMemo(() => {
    if (!firstFileSize || !activePreviewPreset) return null
    const cW = containerSize?.w ?? cropContainerRef.current?.offsetWidth ?? 0
    const cH = containerSize?.h ?? cropContainerRef.current?.offsetHeight ?? 0
    if (!cW || !cH) return null
    const offset = cropOffsets[activePreviewPreset.id] ?? { x: 0, y: 0 }
    return computeOverlay(cW, cH, firstFileSize.width, firstFileSize.height, activePreviewPreset.width, activePreviewPreset.height, offset.x, offset.y)
  }, [containerSize, firstFileSize, activePreviewPreset, cropOffsets])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const ctrl = e.ctrlKey || e.metaKey
      if (!ctrl) return
      if (e.key === "Enter") { e.preventDefault(); if (!isProcessing && files.length > 0) generateSelected() }
      if (e.key === "d" || e.key === "D") { e.preventDefault(); if (generatedImages.length > 0) downloadAll() }
      if (e.key === "Backspace") { e.preventDefault(); if (files.length > 0) { setFiles([]); setGeneratedImages([]) } }
    }
    window.addEventListener("keydown", handler)
    return () => window.removeEventListener("keydown", handler)
  }, [isProcessing, files, generatedImages])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const ctrl = e.ctrlKey || e.metaKey
      if (!ctrl) return
      if (e.key === "o" || e.key === "O") { e.preventDefault(); uploadRef.current?.click() }
      if (e.key === "Enter") { e.preventDefault(); if (!isProcessing && files.length > 0) generateSelected() }
      if (e.key === "d" || e.key === "D") { e.preventDefault(); if (generatedImages.length > 0) downloadAll() }
      if (e.key === "Backspace") { e.preventDefault(); if (files.length > 0) { setFiles([]); setGeneratedImages([]) } }
    }
    window.addEventListener("keydown", handler)
    return () => window.removeEventListener("keydown", handler)
  }, [isProcessing, files, generatedImages])

  return (
    <>
    <div className="space-y-4">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">Image Resizer</h2>
        <p className="text-muted-foreground">Select platform sizes, adjust crop previews, and batch export ready-to-post assets.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 md:items-start">
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Upload Images</CardTitle>
              <CardDescription>Drag and drop one or more images. All processing happens in your browser.</CardDescription>
            </CardHeader>
            <CardContent>
              <FileDropzone ref={uploadRef} accept="image/*" onFilesSelected={handleFilesSelected} maxFiles={20} multiple />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Size Selection</CardTitle>
              <CardDescription>Choose platform sizes or add custom dimensions.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {selectedChips.length > 0 && (
                <div className="space-y-1">
                  <p className="text-xs font-medium text-muted-foreground">{selectedChips.length} size{selectedChips.length !== 1 ? "s" : ""} selected</p>
                  <div className="flex flex-wrap gap-1.5">
                    {selectedChips.map((chip) => (
                      <span key={chip.id} className="inline-flex items-center gap-1 rounded-full border border-border bg-muted px-2 py-0.5 text-xs">
                        {chip.label}
                        <button type="button" onClick={() => removeChip(chip.id)} className="ml-0.5 hover:text-destructive">x</button>
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <Accordion type="multiple" className="rounded-lg border border-border px-3">
                {PLATFORM_GROUPS.map((group) => (
                  <AccordionItem key={group.id} value={group.id}>
                    <AccordionTrigger className="py-3">
                      <span className="flex items-center gap-2">
                        {group.label}
                        {group.sizes.some((s) => selectedSizes.has(s.id)) && (
                          <span className="rounded-full bg-primary px-1.5 py-0.5 text-[10px] text-primary-foreground">
                            {group.sizes.filter((s) => selectedSizes.has(s.id)).length}
                          </span>
                        )}
                      </span>
                    </AccordionTrigger>
                    <AccordionContent className="space-y-3">
                      <div className="flex gap-2">
                        <Button type="button" variant="outline" size="sm" onClick={() => selectAllForPlatform(group)}>Select All</Button>
                        <Button type="button" variant="outline" size="sm" onClick={() => deselectAllForPlatform(group)}>Deselect All</Button>
                      </div>
                      <div className="grid gap-2">
                        {group.sizes.map((preset) => (
                          <label key={preset.id} className="flex cursor-pointer items-center justify-between rounded-lg border border-border px-3 py-2 text-sm">
                            <div className="flex items-center gap-2">
                              <Checkbox checked={selectedSizes.has(preset.id)} onCheckedChange={(c: boolean | "indeterminate") => toggleSize(preset.id, Boolean(c))} />
                              <span>{preset.label}</span>
                            </div>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              <span className="rounded bg-muted px-1.5 py-0.5 font-mono">{preset.ratio}</span>
                              <span>{preset.width}x{preset.height}</span>
                            </div>
                          </label>
                        ))}
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                ))}

                {/* Custom Size */}

                    <span className="flex items-center gap-2">
                     
                      {customSizes.length > 0 && (
                        <span className="rounded-full bg-primary px-1.5 py-0.5 text-[10px] text-primary-foreground">{customSizes.length}</span>
                      )}
                    </span>

                    {customSizes.length > 0 && (
                      <div className="grid gap-2">
                        {customSizes.map((preset) => (
                          <div key={preset.id} className="flex items-center justify-between rounded-lg border border-border px-3 py-2 text-sm">
                            <div className="flex items-center gap-2">
                              <Checkbox checked={selectedSizes.has(preset.id)} onCheckedChange={(c: boolean | "indeterminate") => toggleSize(preset.id, Boolean(c))} />
                              <span>{preset.label}</span>
                            </div>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              <span className="rounded bg-muted px-1.5 py-0.5 font-mono">{preset.ratio}</span>
                              <span>{preset.width}x{preset.height}</span>
                              <button type="button" onClick={() => removeCustomSize(preset.id)} className="hover:text-destructive">
                                <X className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

              </Accordion>

              {/* Custom Size Form - outside accordion */}
              <div className="space-y-3 rounded-lg border border-dashed border-border p-3">
                <p className="text-xs font-medium text-muted-foreground">Add Custom Size</p>
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <Label className="text-xs">Width (px)</Label>
                    <Input type="number" min="1" max="9999" value={customWidth} onChange={(e) => setCustomWidth(e.target.value)} className="h-8 text-sm" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Height (px)</Label>
                    <Input type="number" min="1" max="9999" value={customHeight} onChange={(e) => setCustomHeight(e.target.value)} className="h-8 text-sm" />
                  </div>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Label (optional)</Label>
                  <Input placeholder={`${customWidth}x${customHeight}`} value={customLabel} onChange={(e) => setCustomLabel(e.target.value)} className="h-8 text-sm" />
                </div>
                <Button type="button" variant="outline" size="sm" className="w-full" onClick={addCustomSize}>
                  <Plus className="mr-2 h-3.5 w-3.5" />
                  Add Custom Size
                </Button>
              </div>

              <p className="text-xs text-muted-foreground">Selected: {selectedPresetList.length} sizes - Files: {files.length}</p>

              <div className="space-y-3 rounded-lg border border-border p-3">
                <div className="space-y-1">
                  <Label className="text-xs">Output Format</Label>
                  <div className="flex gap-2">
                    {(["jpeg", "png", "webp"] as OutputFormat[]).map((fmt) => (
                      <button key={fmt} type="button" onClick={() => setOutputFormat(fmt)}
                        className={`flex-1 rounded-md border px-2 py-1 text-xs font-medium transition-colors ${outputFormat === fmt ? "border-primary bg-primary text-primary-foreground" : "border-border hover:border-primary/50"}`}>
                        {fmt === "jpeg" ? "JPG" : fmt.toUpperCase()}
                      </button>
                    ))}
                  </div>
                </div>
                {outputFormat !== "png" && (
                  <div className="space-y-1">
                    <div className="flex justify-between">
                      <Label className="text-xs">Quality</Label>
                      <span className="text-xs text-muted-foreground">{quality}%</span>
                    </div>
                    <input type="range" min={50} max={100} value={quality} onChange={(e) => setQuality(Number(e.target.value))} className="w-full accent-primary" />
                  </div>
                )}
              </div>

              <Button onClick={generateSelected} disabled={isProcessing || !files.length || !selectedPresetList.length} className="w-full">
                {isProcessing ? "Processing..." : `Generate ${selectedPresetList.length > 0 ? selectedPresetList.length : ""} Selected`}
              </Button>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          {files.length > 0 && selectedPresetList.length > 0 && firstFileUrl && firstFileSize && activePreviewPreset && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Crop Preview</CardTitle>
                <CardDescription>Drag the overlay to adjust crop position for each size.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-1">
                  <Label>Preview size</Label>
                  <StyledSelect
                    value={activePreviewPreset.id}
                    onChange={setActivePreviewPresetId}
                    options={selectedPresetList.map((p) => ({
                      value: p.id,
                      label: `${p.platformLabel} - ${p.label} (${p.ratio}) ${p.width}x${p.height}`,
                    }))}
                  />
                </div>
                <div
                  ref={cropContainerRef}
                  className="relative h-72 overflow-hidden rounded-md border border-border bg-muted/40"
                  onPointerDown={handlePointerDown}
                  onPointerMove={handlePointerMove}
                  onPointerUp={handlePointerUp}
                  onPointerCancel={handlePointerUp}
                  style={{ cursor: "grab", touchAction: "none" }}
                >
                  <img src={firstFileUrl} alt="Original preview" className="h-full w-full object-contain select-none pointer-events-none" draggable={false} />
                  {overlayRect && (
                    <div className="pointer-events-none absolute border-2 border-primary"
                      style={{ left: overlayRect.cropX, top: overlayRect.cropY, width: overlayRect.cropW, height: overlayRect.cropH, boxShadow: "0 0 0 9999px rgba(0,0,0,0.35)" }} />
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  {activePreviewPreset.platformLabel} - {activePreviewPreset.label} - {activePreviewPreset.ratio} - {activePreviewPreset.width}x{activePreviewPreset.height}px
                </p>
              </CardContent>
            </Card>
          )}

          {generatedImages.length > 0 ? (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                  Generated Previews
                </CardTitle>
                <CardDescription>
                  {generatedImages.length} image{generatedImages.length !== 1 ? "s" : ""} generated across {files.length} file{files.length !== 1 ? "s" : ""}.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid gap-3 sm:grid-cols-2">
                  {generatedImages.map((item) => (
                    <div key={item.id} className="space-y-3 rounded-lg border border-border bg-muted/50 p-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium">{item.platformLabel} {item.presetLabel}</p>
                          <p className="text-xs text-muted-foreground">{item.ratio} - {item.width}x{item.height} - {item.sourceFile.name}</p>
                        </div>
                        <Button variant="ghost" size="sm" onClick={() => downloadFile(item.url, item.fileName)}>
                          <Download className="mr-2 h-4 w-4" />Download
                        </Button>
                      </div>
                      <img src={item.url} alt={`${item.platformLabel} ${item.presetLabel} preview`} className="w-full rounded-md border border-border" />
                    </div>
                  ))}
                </div>
                <Button variant="outline" className="w-full" onClick={downloadAll}>Download All as ZIP</Button>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Results</CardTitle>
                <CardDescription>Select sizes, adjust crop preview, then click Generate Selected.</CardDescription>
              </CardHeader>
            </Card>
          )}
        </div>
      </div>
    </div>

    <ShortcutsModal
      pageName="Image Resizer"
      shortcuts={[
        { keys: ["Ctrl", "O"], description: "Open file upload" },
        { keys: ["Ctrl", "Enter"], description: "Generate selected sizes" },
        { keys: ["Ctrl", "D"], description: "Download all as ZIP" },
        { keys: ["Ctrl", "Backspace"], description: "Clear all files" },
        { keys: ["?"], description: "Toggle this shortcuts panel" },
      ]}
    />
    </>
  )
}