"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import {
  Pen, Square, Circle, Triangle, Type, Trash2, Undo, Redo, Download
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { ShortcutsModal } from "@/components/shortcuts-modal"

type Tool = "pen" | "rectangle" | "circle" | "triangle" | "text" | "eraser"
type DrawingElement = {
  id: string
  type: Tool
  startX: number
  startY: number
  endX: number
  endY: number
  color: string
  lineWidth: number
  text?: string
  path?: { x: number; y: number }[]
}

const COLORS = [
  "#000000", "#FF0000", "#00FF00", "#0000FF", "#FFFF00",
  "#FF00FF", "#00FFFF", "#FFA500", "#800080", "#FFC0CB",
]

const TOOLS: { tool: Tool; icon: React.ElementType; label: string }[] = [
  { tool: "pen", icon: Pen, label: "Pen" },
  { tool: "rectangle", icon: Square, label: "Rect" },
  { tool: "circle", icon: Circle, label: "Circle" },
  { tool: "triangle", icon: Triangle, label: "Triangle" },
  { tool: "text", icon: Type, label: "Text" },
  { tool: "eraser", icon: Trash2, label: "Eraser" },
]

export function WhiteboardDrawing() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [isDrawing, setIsDrawing] = useState(false)
  const [currentTool, setCurrentTool] = useState<Tool>("pen")
  const [currentColor, setCurrentColor] = useState("#000000")
  const [lineWidth, setLineWidth] = useState(2)
  const [elements, setElements] = useState<DrawingElement[]>([])
  const [currentElement, setCurrentElement] = useState<DrawingElement | null>(null)
  const [history, setHistory] = useState<DrawingElement[][]>([])
  const [historyIndex, setHistoryIndex] = useState(-1)
  const [textInput, setTextInput] = useState("")
  const [textPosition, setTextPosition] = useState<{ x: number; y: number } | null>(null)
  const [announcement, setAnnouncement] = useState("")

  const announceToScreenReader = useCallback((message: string) => {
    setAnnouncement(message)
    setTimeout(() => setAnnouncement(""), 1000)
  }, [])

  const redrawCanvas = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    ctx.clearRect(0, 0, canvas.width, canvas.height)
    ctx.fillStyle = "#FFFFFF"
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    const drawEl = (element: DrawingElement) => {
      ctx.strokeStyle = element.color
      ctx.lineWidth = element.lineWidth
      ctx.fillStyle = element.color

      switch (element.type) {
        case "pen":
          if (element.path && element.path.length > 0) {
            ctx.beginPath()
            ctx.moveTo(element.path[0].x, element.path[0].y)
            element.path.forEach(p => ctx.lineTo(p.x, p.y))
            ctx.stroke()
          }
          break
        case "rectangle":
          ctx.beginPath()
          ctx.rect(element.startX, element.startY, element.endX - element.startX, element.endY - element.startY)
          ctx.stroke()
          break
        case "circle": {
          const r = Math.sqrt(Math.pow(element.endX - element.startX, 2) + Math.pow(element.endY - element.startY, 2))
          ctx.beginPath()
          ctx.arc(element.startX, element.startY, r, 0, 2 * Math.PI)
          ctx.stroke()
          break
        }
        case "triangle":
          ctx.beginPath()
          ctx.moveTo(element.startX, element.startY)
          ctx.lineTo(element.endX, element.endY)
          ctx.lineTo(element.startX - (element.endX - element.startX), element.endY)
          ctx.closePath()
          ctx.stroke()
          break
        case "text":
          if (element.text) {
            ctx.font = `${element.lineWidth * 8}px Arial`
            ctx.fillText(element.text, element.startX, element.startY)
          }
          break
        case "eraser":
          if (element.path && element.path.length > 0) {
            ctx.globalCompositeOperation = "destination-out"
            ctx.lineWidth = element.lineWidth * 5
            ctx.beginPath()
            ctx.moveTo(element.path[0].x, element.path[0].y)
            element.path.forEach(p => ctx.lineTo(p.x, p.y))
            ctx.stroke()
            ctx.globalCompositeOperation = "source-over"
          }
          break
      }
    }

    elements.forEach(drawEl)
    if (currentElement) drawEl(currentElement)
  }, [elements, currentElement])

  useEffect(() => { redrawCanvas() }, [redrawCanvas])

  const getMousePos = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current
    if (!canvas) return { x: 0, y: 0 }
    const rect = canvas.getBoundingClientRect()
    return {
      x: (e.clientX - rect.left) * (canvas.width / rect.width),
      y: (e.clientY - rect.top) * (canvas.height / rect.height),
    }
  }

  const getTouchPos = (e: React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current
    if (!canvas) return { x: 0, y: 0 }
    const rect = canvas.getBoundingClientRect()
    const touch = e.touches[0] || e.changedTouches[0]
    return {
      x: (touch.clientX - rect.left) * (canvas.width / rect.width),
      y: (touch.clientY - rect.top) * (canvas.height / rect.height),
    }
  }

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const pos = getMousePos(e)
    if (currentTool === "text") { setTextPosition(pos); return }
    setIsDrawing(true)
    setCurrentElement({
      id: Date.now().toString(), type: currentTool,
      startX: pos.x, startY: pos.y, endX: pos.x, endY: pos.y,
      color: currentColor, lineWidth,
      path: currentTool === "pen" || currentTool === "eraser" ? [pos] : undefined,
    })
  }

  const startDrawingTouch = (e: React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault()
    const pos = getTouchPos(e)
    if (currentTool === "text") { setTextPosition(pos); return }
    setIsDrawing(true)
    setCurrentElement({
      id: Date.now().toString(), type: currentTool,
      startX: pos.x, startY: pos.y, endX: pos.x, endY: pos.y,
      color: currentColor, lineWidth,
      path: currentTool === "pen" || currentTool === "eraser" ? [pos] : undefined,
    })
  }

  const draw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !currentElement) return
    const pos = getMousePos(e)
    if (currentElement.type === "pen" || currentElement.type === "eraser") {
      setCurrentElement({ ...currentElement, path: [...(currentElement.path || []), pos] })
    } else {
      setCurrentElement({ ...currentElement, endX: pos.x, endY: pos.y })
    }
  }

  const drawTouch = (e: React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault()
    if (!isDrawing || !currentElement) return
    const pos = getTouchPos(e)
    if (currentElement.type === "pen" || currentElement.type === "eraser") {
      setCurrentElement({ ...currentElement, path: [...(currentElement.path || []), pos] })
    } else {
      setCurrentElement({ ...currentElement, endX: pos.x, endY: pos.y })
    }
  }

  const stopDrawing = () => {
    if (currentElement && isDrawing) {
      const newElements = [...elements, currentElement]
      setElements(newElements)
      setHistory([...history.slice(0, historyIndex + 1), newElements])
      setHistoryIndex(historyIndex + 1)
    }
    setIsDrawing(false)
    setCurrentElement(null)
  }

  const stopDrawingTouch = (e: React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault()
    stopDrawing()
  }

  const addText = () => {
    if (textPosition && textInput.trim()) {
      const el: DrawingElement = {
        id: Date.now().toString(), type: "text",
        startX: textPosition.x, startY: textPosition.y,
        endX: textPosition.x, endY: textPosition.y,
        color: currentColor, lineWidth, text: textInput,
      }
      const newElements = [...elements, el]
      setElements(newElements)
      setHistory([...history.slice(0, historyIndex + 1), newElements])
      setHistoryIndex(historyIndex + 1)
    }
    setTextPosition(null)
    setTextInput("")
  }

  const undo = useCallback(() => {
    if (historyIndex > 0) {
      setHistoryIndex(historyIndex - 1)
      setElements(history[historyIndex - 1])
      announceToScreenReader("Undo performed")
    } else if (elements.length > 0) {
      setElements([])
      setHistoryIndex(-1)
      announceToScreenReader("Canvas cleared")
    }
  }, [historyIndex, history, elements, announceToScreenReader])

  const redo = useCallback(() => {
    if (historyIndex < history.length - 1) {
      setHistoryIndex(historyIndex + 1)
      setElements(history[historyIndex + 1])
      announceToScreenReader("Redo performed")
    }
  }, [historyIndex, history, announceToScreenReader])

  const clear = useCallback(() => {
    setElements([])
    setCurrentElement(null)
    setHistory([])
    setHistoryIndex(-1)
    announceToScreenReader("Canvas cleared")
  }, [announceToScreenReader])

  const download = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const link = document.createElement("a")
    link.download = "whiteboard-drawing.png"
    link.href = canvas.toDataURL()
    link.click()
    announceToScreenReader("Image downloaded")
  }, [])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.shiftKey) {
        switch (e.key.toLowerCase()) {
          case "z": e.preventDefault(); undo(); break
          case "y": e.preventDefault(); redo(); break
          case "d": e.preventDefault(); download(); break
          case "x": e.preventDefault(); clear(); break
        }
      }
      if (e.key === "Delete" && !textPosition) { e.preventDefault(); clear() }
    }
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [undo, redo, download, clear, textPosition])

  const canUndo = elements.length > 0 || historyIndex >= 0
  const canRedo = historyIndex < history.length - 1

  return (
    <>
      <div aria-live="polite" aria-atomic="true" className="sr-only">{announcement}</div>

      <div className="flex flex-1 flex-col min-h-0">

        {/* â”€â”€ Compact top toolbar (all screen sizes, scrollable on mobile) â”€â”€ */}
        <div className="shrink-0 flex items-center gap-1 border-b border-border bg-card/95 backdrop-blur-sm px-3 py-2 overflow-x-auto" role="toolbar" aria-label="Drawing tools">

          {/* Tool buttons */}
          <div className="flex items-center gap-1 shrink-0" role="radiogroup" aria-label="Drawing tool">
            {TOOLS.map(({ tool, icon: Icon, label }) => (
              <button
                key={tool}
                onClick={() => { setCurrentTool(tool); announceToScreenReader(`Tool: ${label}`) }}
                role="radio"
                aria-checked={currentTool === tool}
                aria-label={label}
                title={label}
                className={`h-8 w-8 rounded-md flex items-center justify-center border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1 ${
                  currentTool === tool
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-muted/30 text-muted-foreground hover:border-primary/50 hover:text-foreground"
                }`}
              >
                <Icon className="h-3.5 w-3.5" aria-hidden="true" />
              </button>
            ))}
          </div>

          <div className="h-5 w-px bg-border shrink-0 mx-1" aria-hidden="true" />

          {/* Color swatches */}
          <div className="flex items-center gap-1 shrink-0" role="radiogroup" aria-label="Drawing color">
            {COLORS.map(color => (
              <button
                key={color}
                onClick={() => { setCurrentColor(color); announceToScreenReader(`Color: ${color}`) }}
                role="radio"
                aria-checked={currentColor === color}
                aria-label={`Color ${color}`}
                title={color}
                className={`h-6 w-6 rounded border-2 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1 ${
                  currentColor === color ? "border-primary ring-1 ring-primary/40" : "border-border"
                }`}
                style={{ backgroundColor: color }}
              />
            ))}
            <input
              type="color"
              value={currentColor}
              onChange={(e) => { setCurrentColor(e.target.value); announceToScreenReader(`Color: ${e.target.value}`) }}
              className="h-6 w-6 rounded cursor-pointer border border-border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              aria-label="Custom color picker"
              title="Custom color"
            />
          </div>

          <div className="h-5 w-px bg-border shrink-0 mx-1" aria-hidden="true" />

          {/* Line width */}
          <div className="flex items-center gap-1.5 shrink-0" role="group" aria-label="Line width">
            <button
              onClick={() => setLineWidth(w => Math.max(1, w - 1))}
              className="h-6 w-6 rounded border border-border bg-muted/30 text-xs font-bold flex items-center justify-center hover:border-primary/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              aria-label="Decrease line width"
            >âˆ’</button>
            <span className="text-xs font-mono w-6 text-center tabular-nums" aria-live="polite" aria-label={`Line width: ${lineWidth}`}>{lineWidth}</span>
            <button
              onClick={() => setLineWidth(w => Math.min(20, w + 1))}
              className="h-6 w-6 rounded border border-border bg-muted/30 text-xs font-bold flex items-center justify-center hover:border-primary/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              aria-label="Increase line width"
            >+</button>
          </div>

          <div className="ml-auto shrink-0">
            <ShortcutsModal pageName="Whiteboard Drawing" shortcuts={[
              { keys: ["Ctrl", "Shift", "Z"], description: "Undo" },
              { keys: ["Ctrl", "Shift", "Y"], description: "Redo" },
              { keys: ["Ctrl", "Shift", "D"], description: "Download image" },
              { keys: ["Ctrl", "Shift", "X"], description: "Clear canvas" },
              { keys: ["Delete"], description: "Clear canvas" },
              { keys: ["?"], description: "Toggle this panel" },
            ]} />
          </div>
        </div>

        {/* â”€â”€ Canvas â”€â”€ */}
        <div className="flex-1 min-h-0 relative bg-white overflow-hidden" role="region" aria-label="Drawing canvas">
          <canvas
            ref={canvasRef}
            width={800}
            height={600}
            className="w-full h-full cursor-crosshair touch-none focus:outline-none focus:ring-2 focus:ring-primary/30"
            onMouseDown={startDrawing}
            onMouseMove={draw}
            onMouseUp={stopDrawing}
            onMouseLeave={stopDrawing}
            onTouchStart={startDrawingTouch}
            onTouchMove={drawTouch}
            onTouchEnd={stopDrawingTouch}
            onTouchCancel={stopDrawingTouch}
            role="img"
            aria-label={`Drawing canvas with ${elements.length} element${elements.length !== 1 ? "s" : ""}. Tool: ${currentTool}, color: ${currentColor}, width: ${lineWidth}px`}
          />

          {/* Text input popup */}
          {textPosition && (
            <div
              className="absolute bg-background border border-border rounded-lg p-2 shadow-lg z-10"
              style={{ left: textPosition.x, top: textPosition.y }}
              role="dialog"
              aria-label="Add text to canvas"
            >
              <input
                type="text"
                value={textInput}
                onChange={(e) => setTextInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") addText()
                  else if (e.key === "Escape") { setTextPosition(null); setTextInput("") }
                }}
                placeholder="Enter textâ€¦"
                className="px-2 py-1 border rounded text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                autoFocus
                aria-label="Text to add to canvas"
              />
              <div className="flex gap-1 mt-1">
                <Button size="sm" onClick={addText} className="h-9" aria-label="Add text">Add</Button>
                <Button size="sm" variant="outline" className="h-9" onClick={() => { setTextPosition(null); setTextInput("") }} aria-label="Cancel">Cancel</Button>
              </div>
            </div>
          )}
        </div>

        {/* â”€â”€ Bottom action bar (always visible) â”€â”€ */}
        <div
          className="shrink-0 flex items-center gap-2 border-t border-border bg-card/95 backdrop-blur-sm px-4 py-2"
          style={{ paddingBottom: "max(0.5rem, env(safe-area-inset-bottom))" }}
          role="toolbar"
          aria-label="Canvas actions"
        >
          <Button
            variant="outline"
            size="sm"
            onClick={undo}
            disabled={!canUndo}
            className="h-11 md:h-9"
            aria-label="Undo last action"
          >
            <Undo className="h-4 w-4 mr-1" aria-hidden="true" />Undo
            <kbd className="ml-1 hidden md:inline rounded border border-border bg-muted px-1 text-[10px]" aria-hidden="true">Ctrl+Shift+Z</kbd>
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={redo}
            disabled={!canRedo}
            className="h-11 md:h-9"
            aria-label="Redo last action"
          >
            <Redo className="h-4 w-4 mr-1" aria-hidden="true" />Redo
            <kbd className="ml-1 hidden md:inline rounded border border-border bg-muted px-1 text-[10px]" aria-hidden="true">Ctrl+Shift+Y</kbd>
          </Button>
          <div className="flex-1" />
          <Button
            variant="outline"
            size="sm"
            onClick={clear}
            className="h-11 md:h-9"
            aria-label="Clear canvas"
          >
            <Trash2 className="h-4 w-4 mr-1" aria-hidden="true" />Clear
            <kbd className="ml-1 hidden md:inline rounded border border-border bg-muted px-1 text-[10px]" aria-hidden="true">Ctrl+Shift+X</kbd>
          </Button>
          <Button
            size="sm"
            onClick={download}
            className="h-11 md:h-9"
            aria-label="Download drawing as PNG"
          >
            <Download className="h-4 w-4 mr-1" aria-hidden="true" />Save
            <kbd className="ml-1 hidden md:inline rounded border border-border bg-muted px-1 text-[10px]" aria-hidden="true">Ctrl+Shift+D</kbd>
          </Button>
        </div>

      </div>
    </>
  )
}
