"use client"

import { useEffect, useMemo, useState } from "react"
import { Download, CheckCircle2 } from "lucide-react"
import JSZip from "jszip"
import { FileDropzone } from "@/components/file-dropzone"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"

type PlatformId =
  | "instagram"
  | "facebook"
  | "twitter"
  | "tiktok"
  | "linkedin"
  | "youtube"
  | "pinterest"
  | "threads"
  | "snapchat"
  | "bluesky"
  | "whatsapp"
  | "reddit"

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
      { id: "instagram-square-post", platform: "instagram", platformLabel: "Instagram", label: "Square Post", width: 1080, height: 1080 },
      { id: "instagram-4x5-vertical", platform: "instagram", platformLabel: "Instagram", label: "4:5 Vertical", width: 1080, height: 1350 },
      { id: "instagram-3x4-vertical", platform: "instagram", platformLabel: "Instagram", label: "3:4 Vertical", width: 1080, height: 1440 },
      { id: "instagram-horizontal", platform: "instagram", platformLabel: "Instagram", label: "Horizontal", width: 1080, height: 566 },
      { id: "instagram-story-reels", platform: "instagram", platformLabel: "Instagram", label: "Story/Reels", width: 1080, height: 1920 },
      { id: "instagram-profile", platform: "instagram", platformLabel: "Instagram", label: "Profile", width: 320, height: 320 },
    ],
  },
  {
    id: "facebook",
    label: "Facebook",
    sizes: [
      { id: "facebook-post", platform: "facebook", platformLabel: "Facebook", label: "Post", width: 1200, height: 630 },
      { id: "facebook-story", platform: "facebook", platformLabel: "Facebook", label: "Story", width: 1080, height: 1920 },
      { id: "facebook-cover-photo", platform: "facebook", platformLabel: "Facebook", label: "Cover Photo", width: 820, height: 312 },
      { id: "facebook-profile", platform: "facebook", platformLabel: "Facebook", label: "Profile", width: 320, height: 320 },
      { id: "facebook-carousel", platform: "facebook", platformLabel: "Facebook", label: "Carousel", width: 1200, height: 1200 },
    ],
  },
  {
    id: "twitter",
    label: "Twitter/X",
    sizes: [
      { id: "twitter-post", platform: "twitter", platformLabel: "Twitter/X", label: "Post", width: 1200, height: 675 },
      { id: "twitter-square-post", platform: "twitter", platformLabel: "Twitter/X", label: "Square Post", width: 1080, height: 1080 },
      { id: "twitter-header", platform: "twitter", platformLabel: "Twitter/X", label: "Header", width: 1500, height: 500 },
      { id: "twitter-profile", platform: "twitter", platformLabel: "Twitter/X", label: "Profile", width: 400, height: 400 },
    ],
  },
  {
    id: "tiktok",
    label: "TikTok",
    sizes: [
      { id: "tiktok-vertical-cover", platform: "tiktok", platformLabel: "TikTok", label: "Vertical Cover", width: 1080, height: 1920 },
      { id: "tiktok-feed-square", platform: "tiktok", platformLabel: "TikTok", label: "Feed Square", width: 1080, height: 1080 },
      { id: "tiktok-profile", platform: "tiktok", platformLabel: "TikTok", label: "Profile", width: 200, height: 200 },
    ],
  },
  {
    id: "linkedin",
    label: "LinkedIn",
    sizes: [
      { id: "linkedin-post", platform: "linkedin", platformLabel: "LinkedIn", label: "Post", width: 1200, height: 627 },
      { id: "linkedin-cover", platform: "linkedin", platformLabel: "LinkedIn", label: "Cover", width: 1584, height: 396 },
      { id: "linkedin-profile", platform: "linkedin", platformLabel: "LinkedIn", label: "Profile", width: 400, height: 400 },
    ],
  },
  {
    id: "youtube",
    label: "YouTube",
    sizes: [
      { id: "youtube-thumbnail", platform: "youtube", platformLabel: "YouTube", label: "Thumbnail", width: 1280, height: 720 },
      { id: "youtube-channel-banner", platform: "youtube", platformLabel: "YouTube", label: "Channel Banner", width: 2560, height: 1440 },
      { id: "youtube-profile", platform: "youtube", platformLabel: "YouTube", label: "Profile", width: 800, height: 800 },
    ],
  },
  {
    id: "pinterest",
    label: "Pinterest",
    sizes: [
      { id: "pinterest-standard-pin", platform: "pinterest", platformLabel: "Pinterest", label: "Standard Pin", width: 1000, height: 1500 },
      { id: "pinterest-square-pin", platform: "pinterest", platformLabel: "Pinterest", label: "Square Pin", width: 1000, height: 1000 },
      { id: "pinterest-board-cover", platform: "pinterest", platformLabel: "Pinterest", label: "Board Cover", width: 800, height: 800 },
    ],
  },
  {
    id: "threads",
    label: "Threads",
    sizes: [
      { id: "threads-post-square", platform: "threads", platformLabel: "Threads", label: "Post Square", width: 1080, height: 1080 },
      { id: "threads-vertical", platform: "threads", platformLabel: "Threads", label: "Vertical", width: 1080, height: 1350 },
    ],
  },
  {
    id: "snapchat",
    label: "Snapchat",
    sizes: [
      { id: "snapchat-story", platform: "snapchat", platformLabel: "Snapchat", label: "Story", width: 1080, height: 1920 },
      { id: "snapchat-profile", platform: "snapchat", platformLabel: "Snapchat", label: "Profile", width: 320, height: 320 },
    ],
  },
  {
    id: "bluesky",
    label: "Bluesky",
    sizes: [
      { id: "bluesky-post-square", platform: "bluesky", platformLabel: "Bluesky", label: "Post Square", width: 1200, height: 1200 },
      { id: "bluesky-landscape", platform: "bluesky", platformLabel: "Bluesky", label: "Landscape", width: 1200, height: 675 },
      { id: "bluesky-banner", platform: "bluesky", platformLabel: "Bluesky", label: "Banner", width: 1500, height: 500 },
    ],
  },
  {
    id: "whatsapp",
    label: "WhatsApp",
    sizes: [
      { id: "whatsapp-profile", platform: "whatsapp", platformLabel: "WhatsApp", label: "Profile", width: 640, height: 640 },
      { id: "whatsapp-status", platform: "whatsapp", platformLabel: "WhatsApp", label: "Status", width: 1080, height: 1920 },
    ],
  },
  {
    id: "reddit",
    label: "Reddit",
    sizes: [
      { id: "reddit-post", platform: "reddit", platformLabel: "Reddit", label: "Post", width: 1200, height: 628 },
      { id: "reddit-banner", platform: "reddit", platformLabel: "Reddit", label: "Banner", width: 1920, height: 384 },
      { id: "reddit-profile", platform: "reddit", platformLabel: "Reddit", label: "Profile", width: 256, height: 256 },
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
  url: string
  blob: Blob
}

type DragState = {
  presetId: string
  startX: number
  startY: number
  startOffsetX: number
  startOffsetY: number
}

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value))

export function ImageResizer() {
  const [files, setFiles] = useState<File[]>([])
  const [selectedSizes, setSelectedSizes] = useState<Set<string>>(new Set(["instagram-square-post", "instagram-story-reels"]))
  const [cropOffsets, setCropOffsets] = useState<Record<string, { x: number; y: number }>>({})
  const [activePreviewPresetId, setActivePreviewPresetId] = useState<string>("instagram-square-post")
  const [generatedImages, setGeneratedImages] = useState<GeneratedImage[]>([])
  const [dragState, setDragState] = useState<DragState | null>(null)
  const [firstFileUrl, setFirstFileUrl] = useState<string | null>(null)
  const [firstFileSize, setFirstFileSize] = useState<{ width: number; height: number } | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)

  const selectedPresetList = useMemo(() => {
    return [...selectedSizes]
      .map((id) => PRESET_BY_ID.get(id))
      .filter((preset): preset is SizePreset => Boolean(preset))
  }, [selectedSizes])

  const activePreviewPreset = useMemo(() => {
    return PRESET_BY_ID.get(activePreviewPresetId) ?? selectedPresetList[0] ?? null
  }, [activePreviewPresetId, selectedPresetList])

  useEffect(() => {
    if (files.length === 0) {
      setFirstFileUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev)
        return null
      })
      setFirstFileSize(null)
      return
    }

    const url = URL.createObjectURL(files[0])
    setFirstFileUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev)
      return url
    })

    let cancelled = false
    createImageBitmap(files[0]).then((bitmap) => {
      if (!cancelled) {
        setFirstFileSize({ width: bitmap.width, height: bitmap.height })
      }
      bitmap.close()
    })

    return () => {
      cancelled = true
    }
  }, [files])

  useEffect(() => {
    if (selectedPresetList.length === 0) return
    if (!selectedSizes.has(activePreviewPresetId)) {
      setActivePreviewPresetId(selectedPresetList[0].id)
    }
  }, [selectedPresetList, selectedSizes, activePreviewPresetId])

  useEffect(() => {
    return () => {
      if (firstFileUrl) URL.revokeObjectURL(firstFileUrl)
      generatedImages.forEach((item) => URL.revokeObjectURL(item.url))
    }
  }, [firstFileUrl, generatedImages])

  const handleFilesSelected = (selectedFiles: File[]) => {
    setFiles(selectedFiles)
    setCropOffsets({})
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

  const selectAllForPlatform = (group: { sizes: SizePreset[] }) => {
    setSelectedSizes((prev) => {
      const next = new Set(prev)
      group.sizes.forEach((size) => next.add(size.id))
      return next
    })
  }

  const deselectAllForPlatform = (group: { sizes: SizePreset[] }) => {
    setSelectedSizes((prev) => {
      const next = new Set(prev)
      group.sizes.forEach((size) => next.delete(size.id))
      return next
    })
  }

  const getDrawRect = (
    bitmapWidth: number,
    bitmapHeight: number,
    targetWidth: number,
    targetHeight: number,
    offsetXRatio: number,
    offsetYRatio: number
  ) => {
    const srcAspect = bitmapWidth / bitmapHeight
    const targetAspect = targetWidth / targetHeight

    let drawWidth = targetWidth
    let drawHeight = targetHeight
    let drawX = 0
    let drawY = 0

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
    return { drawX, drawY, drawWidth, drawHeight }
  }

  const renderVariant = async (file: File, preset: SizePreset, offsetX: number, offsetY: number) => {
    const bitmap = await createImageBitmap(file)
    const canvas = document.createElement("canvas")
    canvas.width = preset.width
    canvas.height = preset.height
    const ctx = canvas.getContext("2d")
    if (!ctx) {
      bitmap.close()
      return null
    }
    const rect = getDrawRect(bitmap.width, bitmap.height, preset.width, preset.height, offsetX, offsetY)
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
        const offset = cropOffsets[preset.id] ?? { x: 0, y: 0 }
        const rendered = await renderVariant(file, preset, offset.x, offset.y)
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

  const handleCropDragStart = (presetId: string, event: React.PointerEvent<HTMLDivElement>) => {
    event.preventDefault()
    const current = cropOffsets[presetId] ?? { x: 0, y: 0 }
    setDragState({
      presetId,
      startX: event.clientX,
      startY: event.clientY,
      startOffsetX: current.x,
      startOffsetY: current.y,
    })
  }

  const handleCropDragMove = (preset: SizePreset, event: React.PointerEvent<HTMLDivElement>) => {
    if (!dragState || dragState.presetId !== preset.id || !firstFileSize) return
    const rect = event.currentTarget.getBoundingClientRect()
    const srcAspect = firstFileSize.width / firstFileSize.height
    const targetAspect = preset.width / preset.height
    const overlayWidth =
      srcAspect > targetAspect ? rect.height * targetAspect : rect.width
    const overlayHeight =
      srcAspect > targetAspect ? rect.height : rect.width / targetAspect
    const movableX = Math.max(1, rect.width - overlayWidth)
    const movableY = Math.max(1, rect.height - overlayHeight)

    const deltaXRatio = (event.clientX - dragState.startX) / (movableX / 2)
    const deltaYRatio = (event.clientY - dragState.startY) / (movableY / 2)

    setCropOffsets((prev) => ({
      ...prev,
      [preset.id]: {
        x: clamp(dragState.startOffsetX + deltaXRatio, -1, 1),
        y: clamp(dragState.startOffsetY + deltaYRatio, -1, 1),
      },
    }))
  }

  const handleCropDragEnd = (presetId: string) => {
    if (!dragState || dragState.presetId !== presetId) return
    setDragState(null)
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
      const folder = zip.folder(item.sourceFile.name.replace(/\.[^/.]+$/, ""))
      folder?.file(item.fileName, item.blob)
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
          Select platform sizes, adjust crop previews, and batch export ready-to-post assets.
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
                Choose sizes by platform. Use Select All / Deselect All per group.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Accordion type="multiple" className="rounded-lg border border-border px-3">
                {PLATFORM_GROUPS.map((group) => (
                  <AccordionItem key={group.id} value={group.id}>
                    <AccordionTrigger className="py-3">
                      <span>{group.label}</span>
                    </AccordionTrigger>
                    <AccordionContent className="space-y-3">
                      <div className="flex gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => selectAllForPlatform(group)}
                        >
                          Select All
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => deselectAllForPlatform(group)}
                        >
                          Deselect All
                        </Button>
                      </div>
                      <div className="grid gap-2">
                        {group.sizes.map((preset) => (
                          <label
                            key={preset.id}
                            className="flex cursor-pointer items-center justify-between rounded-lg border border-border px-3 py-2 text-sm"
                          >
                            <div className="flex items-center gap-2">
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
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>

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
          {files.length > 0 && selectedPresetList.length > 0 && firstFileUrl && firstFileSize && activePreviewPreset && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Crop Preview</CardTitle>
                <CardDescription>
                  Drag overlay on the original image to set crop position for the selected size.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-1">
                  <Label htmlFor="crop-size">Preview size</Label>
                  <select
                    id="crop-size"
                    className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
                    value={activePreviewPreset.id}
                    onChange={(e) => setActivePreviewPresetId(e.target.value)}
                  >
                    {selectedPresetList.map((preset) => (
                      <option key={preset.id} value={preset.id}>
                        {preset.platformLabel} - {preset.label} ({preset.width}x{preset.height})
                      </option>
                    ))}
                  </select>
                </div>

                <div
                  className="relative h-72 overflow-hidden rounded-md border border-border bg-muted/40"
                  onPointerDown={(event) => handleCropDragStart(activePreviewPreset.id, event)}
                  onPointerMove={(event) => handleCropDragMove(activePreviewPreset, event)}
                  onPointerUp={() => handleCropDragEnd(activePreviewPreset.id)}
                  onPointerLeave={() => handleCropDragEnd(activePreviewPreset.id)}
                  style={{ cursor: "grab" }}
                >
                  <img
                    src={firstFileUrl}
                    alt="Original preview"
                    className="h-full w-full object-contain select-none"
                    draggable={false}
                  />
                  {(() => {
                    const containerW = 100
                    const containerH = 72
                    const srcAspect = firstFileSize.width / firstFileSize.height
                    const targetAspect = activePreviewPreset.width / activePreviewPreset.height
                    const imgW = srcAspect > containerW / containerH ? containerW : containerH * srcAspect
                    const imgH = srcAspect > containerW / containerH ? containerW / srcAspect : containerH
                    const imgX = (containerW - imgW) / 2
                    const imgY = (containerH - imgH) / 2
                    const offset = cropOffsets[activePreviewPreset.id] ?? { x: 0, y: 0 }

                    let rectW = imgW
                    let rectH = imgH
                    let rectX = imgX
                    let rectY = imgY

                    if (srcAspect > targetAspect) {
                      rectH = imgH
                      rectW = imgH * targetAspect
                      const extra = imgW - rectW
                      rectX = imgX + extra / 2 + (extra / 2) * offset.x
                    } else {
                      rectW = imgW
                      rectH = imgW / targetAspect
                      const extra = imgH - rectH
                      rectY = imgY + extra / 2 + (extra / 2) * offset.y
                    }

                    return (
                      <div
                        className="pointer-events-none absolute border-2 border-primary"
                        style={{
                          left: `${rectX}%`,
                          top: `${rectY}%`,
                          width: `${rectW}%`,
                          height: `${rectH}%`,
                          boxShadow: "0 0 0 9999px rgba(0,0,0,0.25)",
                        }}
                      />
                    )
                  })()}
                </div>
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
                  Generated outputs for all uploaded files and selected sizes.
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
                            {item.width}x{item.height} • {item.sourceFile.name}
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
                      <img
                        src={item.url}
                        alt={`${item.platformLabel} ${item.presetLabel} preview`}
                        className="w-full rounded-md border border-border"
                      />
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
                  Configure sizes, adjust crop preview, and click Generate Selected.
                </CardDescription>
              </CardHeader>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
