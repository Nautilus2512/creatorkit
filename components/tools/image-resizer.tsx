"use client"

import { useMemo, useState } from "react"
import { Download, CheckCircle2 } from "lucide-react"
import JSZip from "jszip"
import { FileDropzone } from "@/components/file-dropzone"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"

type PlatformId =
  | "instagram"
  | "twitter"
  | "facebook"
  | "linkedin"
  | "youtube"
  | "tiktok"
  | "pinterest"

type ResizeMode = "cover" | "fit"

type SizePreset = {
  id: string
  platform: PlatformId
  platformLabel: string
  label: string
  width: number
  height: number
}

const PLATFORM_GROUPS: Array<{ id: PlatformId; label: string; sizes: SizePreset[] }> = [
  {
    id: "instagram",
    label: "Instagram",
    sizes: [
      { id: "instagram-post", platform: "instagram", platformLabel: "Instagram", label: "Post", width: 1080, height: 1080 },
      { id: "instagram-story", platform: "instagram", platformLabel: "Instagram", label: "Story", width: 1080, height: 1920 },
      { id: "instagram-reel", platform: "instagram", platformLabel: "Instagram", label: "Reel", width: 1080, height: 1920 },
    ],
  },
  {
    id: "twitter",
    label: "Twitter/X",
    sizes: [
      { id: "twitter-post", platform: "twitter", platformLabel: "Twitter/X", label: "Post", width: 1200, height: 675 },
      { id: "twitter-header", platform: "twitter", platformLabel: "Twitter/X", label: "Header", width: 1500, height: 500 },
    ],
  },
  {
    id: "facebook",
    label: "Facebook",
    sizes: [
      { id: "facebook-post", platform: "facebook", platformLabel: "Facebook", label: "Post", width: 1200, height: 630 },
      { id: "facebook-story", platform: "facebook", platformLabel: "Facebook", label: "Story", width: 1080, height: 1920 },
      { id: "facebook-cover", platform: "facebook", platformLabel: "Facebook", label: "Cover", width: 820, height: 312 },
    ],
  },
  {
    id: "linkedin",
    label: "LinkedIn",
    sizes: [
      { id: "linkedin-post", platform: "linkedin", platformLabel: "LinkedIn", label: "Post", width: 1200, height: 627 },
      { id: "linkedin-cover", platform: "linkedin", platformLabel: "LinkedIn", label: "Cover", width: 1584, height: 396 },
    ],
  },
  {
    id: "youtube",
    label: "YouTube",
    sizes: [
      { id: "youtube-thumbnail", platform: "youtube", platformLabel: "YouTube", label: "Thumbnail", width: 1280, height: 720 },
      { id: "youtube-banner", platform: "youtube", platformLabel: "YouTube", label: "Banner", width: 2560, height: 1440 },
    ],
  },
  {
    id: "tiktok",
    label: "TikTok",
    sizes: [{ id: "tiktok-cover", platform: "tiktok", platformLabel: "TikTok", label: "Video Cover", width: 1080, height: 1920 }],
  },
  {
    id: "pinterest",
    label: "Pinterest",
    sizes: [
      { id: "pinterest-pin", platform: "pinterest", platformLabel: "Pinterest", label: "Pin", width: 1000, height: 1500 },
      { id: "pinterest-board-cover", platform: "pinterest", platformLabel: "Pinterest", label: "Board Cover", width: 800, height: 800 },
    ],
  },
]

const PRESET_BY_ID = new Map(PLATFORM_GROUPS.flatMap((group) => group.sizes.map((size) => [size.id, size])))

type GeneratedImage = {
  id: string
  presetId: string
  presetLabel: string
  platformLabel: string
  width: number
  height: number
  fileName: string
  sourceFile: File
  offsetX: number
  offsetY: number
  url: string
  blob: Blob
}

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value))

export function ImageResizer() {
  const [files, setFiles] = useState<File[]>([])
  const [activePlatform, setActivePlatform] = useState<PlatformId>("instagram")
  const [selectedSizes, setSelectedSizes] = useState<Set<string>>(
    new Set(["instagram-post", "instagram-story"])
  )
  const [resizeMode, setResizeMode] = useState<ResizeMode>("cover")
  const [fitBackground, setFitBackground] = useState<"white" | "black">("white")
  const [generatedImages, setGeneratedImages] = useState<GeneratedImage[]>([])
  const [dragState, setDragState] = useState<{
    id: string
    startX: number
    startY: number
    startOffsetX: number
    startOffsetY: number
  } | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)

  const activeGroup = useMemo(
    () => PLATFORM_GROUPS.find((group) => group.id === activePlatform) ?? PLATFORM_GROUPS[0],
    [activePlatform]
  )

  const selectedPresetList = useMemo(() => {
    return [...selectedSizes].map((id) => PRESET_BY_ID.get(id)).filter((preset): preset is SizePreset => Boolean(preset))
  }, [selectedSizes])

  const handleFilesSelected = (selectedFiles: File[]) => {
    setFiles(selectedFiles)
    setGeneratedImages((prev) => {
      prev.forEach((item) => URL.revokeObjectURL(item.url))
      return []
    })
  }

  const toggleSize = (presetId: string, checked: boolean) => {
    setSelectedSizes((prev) => {
      const next = new Set(prev)
      if (checked) next.add(presetId)
      else next.delete(presetId)
      return next
    })
  }

  const selectAllForPlatform = (platformId: PlatformId) => {
    const group = PLATFORM_GROUPS.find((item) => item.id === platformId)
    if (!group) return
    setSelectedSizes((prev) => {
      const next = new Set(prev)
      group.sizes.forEach((size) => next.add(size.id))
      return next
    })
  }

  const getDrawRect = (
    bitmapWidth: number,
    bitmapHeight: number,
    targetWidth: number,
    targetHeight: number,
    mode: ResizeMode,
    offsetXRatio: number,
    offsetYRatio: number
  ) => {
    const srcAspect = bitmapWidth / bitmapHeight
    const targetAspect = targetWidth / targetHeight

    let drawWidth = targetWidth
    let drawHeight = targetHeight
    let drawX = 0
    let drawY = 0

    if (mode === "cover") {
      if (srcAspect > targetAspect) {
        drawHeight = targetHeight
        drawWidth = targetHeight * srcAspect
      } else {
        drawWidth = targetWidth
        drawHeight = targetWidth / srcAspect
      }

      const overflowX = Math.max(0, drawWidth - targetWidth)
      const overflowY = Math.max(0, drawHeight - targetHeight)
      drawX = (targetWidth - drawWidth) / 2 + (overflowX / 2) * offsetXRatio
      drawY = (targetHeight - drawHeight) / 2 + (overflowY / 2) * offsetYRatio
    } else {
      if (srcAspect > targetAspect) {
        drawWidth = targetWidth
        drawHeight = targetWidth / srcAspect
      } else {
        drawHeight = targetHeight
        drawWidth = targetHeight * srcAspect
      }

      const roomX = Math.max(0, targetWidth - drawWidth)
      const roomY = Math.max(0, targetHeight - drawHeight)
      drawX = roomX / 2 + (roomX / 2) * offsetXRatio
      drawY = roomY / 2 + (roomY / 2) * offsetYRatio
    }

    return { drawX, drawY, drawWidth, drawHeight }
  }

  const renderVariant = async (
    file: File,
    preset: SizePreset,
    mode: ResizeMode,
    offsetX: number,
    offsetY: number
  ) => {
    const bitmap = await createImageBitmap(file)
    const canvas = document.createElement("canvas")
    canvas.width = preset.width
    canvas.height = preset.height
    const ctx = canvas.getContext("2d")
    if (!ctx) {
      bitmap.close()
      return null
    }

    if (mode === "fit") {
      ctx.fillStyle = fitBackground === "white" ? "#ffffff" : "#000000"
      ctx.fillRect(0, 0, preset.width, preset.height)
    } else {
      ctx.clearRect(0, 0, preset.width, preset.height)
    }

    const rect = getDrawRect(bitmap.width, bitmap.height, preset.width, preset.height, mode, offsetX, offsetY)
    ctx.drawImage(bitmap, rect.drawX, rect.drawY, rect.drawWidth, rect.drawHeight)
    bitmap.close()

    const blob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob((nextBlob) => resolve(nextBlob), "image/jpeg", 0.92)
    })
    if (!blob) return null
    return { blob, url: URL.createObjectURL(blob) }
  }

  const generateSelected = async () => {
    if (files.length === 0 || selectedPresetList.length === 0) return

    setIsProcessing(true)
    const nextGenerated: GeneratedImage[] = []

    for (const file of files) {
      const sourceName = file.name.replace(/\.[^/.]+$/, "")
      for (const preset of selectedPresetList) {
        const rendered = await renderVariant(file, preset, resizeMode, 0, 0)
        if (!rendered) continue
        nextGenerated.push({
          id: `${file.name}-${file.lastModified}-${preset.id}`,
          presetId: preset.id,
          presetLabel: preset.label,
          platformLabel: preset.platformLabel,
          width: preset.width,
          height: preset.height,
          fileName: `${sourceName}_${preset.id}.jpg`,
          sourceFile: file,
          offsetX: 0,
          offsetY: 0,
          url: rendered.url,
          blob: rendered.blob,
        })
      }
    }

    setGeneratedImages((prev) => {
      prev.forEach((item) => URL.revokeObjectURL(item.url))
      return nextGenerated
    })
    setIsProcessing(false)
  }

  const updateRenderedItem = async (id: string) => {
    const current = generatedImages.find((item) => item.id === id)
    if (!current) return
    const preset = PRESET_BY_ID.get(current.presetId)
    if (!preset) return

    const rendered = await renderVariant(current.sourceFile, preset, resizeMode, current.offsetX, current.offsetY)
    if (!rendered) return

    setGeneratedImages((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item
        URL.revokeObjectURL(item.url)
        return { ...item, blob: rendered.blob, url: rendered.url }
      })
    )
  }

  const handleDragStart = (id: string, event: React.PointerEvent<HTMLDivElement>) => {
    event.preventDefault()
    const current = generatedImages.find((item) => item.id === id)
    if (!current) return
    setDragState({
      id,
      startX: event.clientX,
      startY: event.clientY,
      startOffsetX: current.offsetX,
      startOffsetY: current.offsetY,
    })
  }

  const handleDragMove = (id: string, event: React.PointerEvent<HTMLDivElement>) => {
    if (!dragState || dragState.id !== id) return
    const rect = event.currentTarget.getBoundingClientRect()
    const deltaXRatio = (event.clientX - dragState.startX) / Math.max(1, rect.width / 2)
    const deltaYRatio = (event.clientY - dragState.startY) / Math.max(1, rect.height / 2)

    setGeneratedImages((prev) =>
      prev.map((item) =>
        item.id === id
          ? {
              ...item,
              offsetX: clamp(dragState.startOffsetX + deltaXRatio, -1, 1),
              offsetY: clamp(dragState.startOffsetY + deltaYRatio, -1, 1),
            }
          : item
      )
    )
  }

  const handleDragEnd = async (id: string) => {
    if (!dragState || dragState.id !== id) return
    setDragState(null)
    await updateRenderedItem(id)
  }

  const downloadFile = (url: string, name: string) => {
    const a = document.createElement("a")
    a.href = url
    a.download = name
    a.click()
  }

  const downloadAll = async () => {
    if (generatedImages.length === 0) return
    const zip = new JSZip()
    generatedImages.forEach((item) => {
      zip.file(item.fileName, item.blob)
    })
    const zipBlob = await zip.generateAsync({ type: "blob" })
    const zipUrl = URL.createObjectURL(zipBlob)
    downloadFile(zipUrl, "resized-social-images.zip")
    URL.revokeObjectURL(zipUrl)
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">Image Resizer</h2>
        <p className="text-muted-foreground">
          Batch resize images for social media with platform presets, fit modes, and manual crop positioning.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 md:items-start">
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Upload Images</CardTitle>
              <CardDescription>
                Drag and drop one or more images. All processing happens in your browser.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <FileDropzone
                accept="image/*"
                onFilesSelected={handleFilesSelected}
                maxFiles={20}
                multiple
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Size Selection</CardTitle>
              <CardDescription>
                Choose platform presets, select sizes, then generate selected outputs.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Platform</Label>
                <Select
                  value={activePlatform}
                  onValueChange={(value) => setActivePlatform(value as PlatformId)}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select platform" />
                  </SelectTrigger>
                  <SelectContent>
                    {PLATFORM_GROUPS.map((group) => (
                      <SelectItem key={group.id} value={group.id}>
                        {group.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center justify-between">
                <p className="text-sm font-medium">{activeGroup.label} sizes</p>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => selectAllForPlatform(activeGroup.id)}
                >
                  Select All
                </Button>
              </div>

              <div className="grid gap-2">
                {activeGroup.sizes.map((preset) => (
                  <label
                    key={preset.id}
                    className="flex cursor-pointer items-center justify-between rounded-lg border border-border px-3 py-2 text-sm"
                  >
                    <div
                      className="flex items-center gap-2"
                    >
                      <Checkbox
                        checked={selectedSizes.has(preset.id)}
                        onCheckedChange={(checked) => toggleSize(preset.id, Boolean(checked))}
                      />
                      <span>{preset.label}</span>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {preset.width}x{preset.height}
                    </span>
                  </label>
                ))}
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="fit-mode">Fit / Letterbox mode</Label>
                  <Switch
                    id="fit-mode"
                    checked={resizeMode === "fit"}
                    onCheckedChange={(checked) => setResizeMode(checked ? "fit" : "cover")}
                  />
                </div>
                {resizeMode === "fit" && (
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      size="sm"
                      variant={fitBackground === "white" ? "default" : "outline"}
                      onClick={() => setFitBackground("white")}
                    >
                      White background
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant={fitBackground === "black" ? "default" : "outline"}
                      onClick={() => setFitBackground("black")}
                    >
                      Black background
                    </Button>
                  </div>
                )}
              </div>

              <p className="text-xs text-muted-foreground">
                Selected sizes: {selectedPresetList.length} • Files: {files.length}
              </p>

              <Button
                onClick={generateSelected}
                disabled={isProcessing || files.length === 0 || selectedPresetList.length === 0}
                className="w-full"
              >
                {isProcessing ? "Processing..." : "Generate Selected"}
              </Button>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          {generatedImages.length > 0 ? (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                  Generated Previews
                </CardTitle>
                <CardDescription>
                  Drag inside a preview to reposition crop, then download individually or as ZIP.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid gap-3 sm:grid-cols-2">
                  {generatedImages.map((item) => (
                    <div
                      key={item.id}
                      className="space-y-3 rounded-lg border border-border bg-muted/50 p-3"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium">
                            {item.platformLabel} {item.presetLabel}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {item.width}x{item.height}
                          </p>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => downloadFile(item.url, item.fileName)}
                        >
                          <Download className="mr-2 h-4 w-4" />
                          Download
                        </Button>
                      </div>
                      <div
                        className="relative overflow-hidden rounded-md border border-border"
                        onPointerDown={(event) => handleDragStart(item.id, event)}
                        onPointerMove={(event) => handleDragMove(item.id, event)}
                        onPointerUp={() => handleDragEnd(item.id)}
                        onPointerLeave={() => handleDragEnd(item.id)}
                        style={{ cursor: "grab" }}
                      >
                        <img
                          src={item.url}
                          alt={`${item.platformLabel} ${item.presetLabel} preview`}
                          className="w-full select-none"
                          style={{
                            transform: `translate(${item.offsetX * 8}px, ${item.offsetY * 8}px)`,
                            userSelect: "none",
                          }}
                          draggable={false}
                        />
                      </div>
                    </div>
                  ))}
                </div>
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={downloadAll}
                >
                  Download All as ZIP
                </Button>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Results</CardTitle>
                <CardDescription>
                  Generated previews will appear here after you select sizes and click Generate Selected.
                </CardDescription>
              </CardHeader>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
