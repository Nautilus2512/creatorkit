"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import { 
  Pen, Square, Circle, Triangle, Type, Download, Trash2, Undo, Redo, 
  Palette, Minus, Plus, RotateCcw, Save, Image as ImageIcon
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Slider } from "@/components/ui/slider"
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

  const colors = [
    "#000000", "#FF0000", "#00FF00", "#0000FF", "#FFFF00", 
    "#FF00FF", "#00FFFF", "#FFA500", "#800080", "#FFC0CB"
  ]

  const redrawCanvas = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    ctx.clearRect(0, 0, canvas.width, canvas.height)
    ctx.fillStyle = "#FFFFFF"
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    elements.forEach(element => {
      ctx.strokeStyle = element.color
      ctx.lineWidth = element.lineWidth
      ctx.fillStyle = element.color

      switch (element.type) {
        case "pen":
          if (element.path && element.path.length > 0) {
            ctx.beginPath()
            ctx.moveTo(element.path[0].x, element.path[0].y)
            element.path.forEach(point => {
              ctx.lineTo(point.x, point.y)
            })
            ctx.stroke()
          }
          break
        case "rectangle":
          ctx.beginPath()
          ctx.rect(
            element.startX,
            element.startY,
            element.endX - element.startX,
            element.endY - element.startY
          )
          ctx.stroke()
          break
        case "circle":
          const radius = Math.sqrt(
            Math.pow(element.endX - element.startX, 2) + 
            Math.pow(element.endY - element.startY, 2)
          )
          ctx.beginPath()
          ctx.arc(element.startX, element.startY, radius, 0, 2 * Math.PI)
          ctx.stroke()
          break
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
            element.path.forEach(point => {
              ctx.lineTo(point.x, point.y)
            })
            ctx.stroke()
            ctx.globalCompositeOperation = "source-over"
          }
          break
      }
    })

    if (currentElement) {
      ctx.strokeStyle = currentElement.color
      ctx.lineWidth = currentElement.lineWidth
      
      switch (currentElement.type) {
        case "pen":
        case "eraser":
          if (currentElement.path && currentElement.path.length > 0) {
            ctx.beginPath()
            ctx.moveTo(currentElement.path[0].x, currentElement.path[0].y)
            currentElement.path.forEach(point => {
              ctx.lineTo(point.x, point.y)
            })
            ctx.stroke()
          }
          break
        case "rectangle":
          ctx.beginPath()
          ctx.rect(
            currentElement.startX,
            currentElement.startY,
            currentElement.endX - currentElement.startX,
            currentElement.endY - currentElement.startY
          )
          ctx.stroke()
          break
        case "circle":
          const radius = Math.sqrt(
            Math.pow(currentElement.endX - currentElement.startX, 2) + 
            Math.pow(currentElement.endY - currentElement.startY, 2)
          )
          ctx.beginPath()
          ctx.arc(currentElement.startX, currentElement.startY, radius, 0, 2 * Math.PI)
          ctx.stroke()
          break
        case "triangle":
          ctx.beginPath()
          ctx.moveTo(currentElement.startX, currentElement.startY)
          ctx.lineTo(currentElement.endX, currentElement.endY)
          ctx.lineTo(currentElement.startX - (currentElement.endX - currentElement.startX), currentElement.endY)
          ctx.closePath()
          ctx.stroke()
          break
      }
    }
  }, [elements, currentElement])

  useEffect(() => {
    redrawCanvas()
  }, [redrawCanvas])

  const getMousePos = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current
    if (!canvas) return { x: 0, y: 0 }
    const rect = canvas.getBoundingClientRect()
    const scaleX = canvas.width / rect.width
    const scaleY = canvas.height / rect.height
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY
    }
  }

  const getTouchPos = (e: React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current
    if (!canvas) return { x: 0, y: 0 }
    const rect = canvas.getBoundingClientRect()
    const scaleX = canvas.width / rect.width
    const scaleY = canvas.height / rect.height
    const touch = e.touches[0] || e.changedTouches[0]
    return {
      x: (touch.clientX - rect.left) * scaleX,
      y: (touch.clientY - rect.top) * scaleY
    }
  }

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (currentTool === "text") {
      const pos = getMousePos(e)
      setTextPosition(pos)
      return
    }

    setIsDrawing(true)
    const pos = getMousePos(e)
    const newElement: DrawingElement = {
      id: Date.now().toString(),
      type: currentTool,
      startX: pos.x,
      startY: pos.y,
      endX: pos.x,
      endY: pos.y,
      color: currentColor,
      lineWidth: lineWidth,
      path: currentTool === "pen" || currentTool === "eraser" ? [pos] : undefined
    }
    setCurrentElement(newElement)
  }

  const startDrawingTouch = (e: React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault()
    if (currentTool === "text") {
      const pos = getTouchPos(e)
      setTextPosition(pos)
      return
    }

    setIsDrawing(true)
    const pos = getTouchPos(e)
    const newElement: DrawingElement = {
      id: Date.now().toString(),
      type: currentTool,
      startX: pos.x,
      startY: pos.y,
      endX: pos.x,
      endY: pos.y,
      color: currentColor,
      lineWidth: lineWidth,
      path: currentTool === "pen" || currentTool === "eraser" ? [pos] : undefined
    }
    setCurrentElement(newElement)
  }

  const draw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !currentElement) return

    const pos = getMousePos(e)

    if (currentElement.type === "pen" || currentElement.type === "eraser") {
      setCurrentElement({
        ...currentElement,
        path: [...(currentElement.path || []), pos]
      })
    } else {
      setCurrentElement({
        ...currentElement,
        endX: pos.x,
        endY: pos.y
      })
    }
  }

  const drawTouch = (e: React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault()
    if (!isDrawing || !currentElement) return

    const pos = getTouchPos(e)

    if (currentElement.type === "pen" || currentElement.type === "eraser") {
      setCurrentElement({
        ...currentElement,
        path: [...(currentElement.path || []), pos]
      })
    } else {
      setCurrentElement({
        ...currentElement,
        endX: pos.x,
        endY: pos.y
      })
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
      const newElement: DrawingElement = {
        id: Date.now().toString(),
        type: "text",
        startX: textPosition.x,
        startY: textPosition.y,
        endX: textPosition.x,
        endY: textPosition.y,
        color: currentColor,
        lineWidth: lineWidth,
        text: textInput
      }
      const newElements = [...elements, newElement]
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
  }, [announceToScreenReader])

  const changeTool = useCallback((tool: Tool) => {
    setCurrentTool(tool)
    announceToScreenReader(`Tool changed to ${tool}`)
  }, [announceToScreenReader])

  const changeColor = useCallback((color: string) => {
    setCurrentColor(color)
    announceToScreenReader(`Color changed to ${color}`)
  }, [announceToScreenReader])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.shiftKey) {
        switch (e.key.toLowerCase()) {
          case "z":
            e.preventDefault()
            undo()
            break
          case "y":
            e.preventDefault()
            redo()
            break
          case "d":
            e.preventDefault()
            download()
            break
          case "x":
            e.preventDefault()
            clear()
            break
        }
      }
      if (e.key === "Delete" && !textPosition) {
        e.preventDefault()
        clear()
      }
    }
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [undo, redo, download, clear, textPosition])

  return (
    <>
      <ShortcutsModal
        pageName="Whiteboard Drawing"
        shortcuts={[
          { keys: ["Ctrl", "Shift", "Z"], description: "Undo" },
          { keys: ["Ctrl", "Shift", "Y"], description: "Redo" },
          { keys: ["Ctrl", "Shift", "D"], description: "Download image" },
          { keys: ["Ctrl", "Shift", "X"], description: "Clear canvas" },
          { keys: ["Delete"], description: "Clear canvas" },
          { keys: ["?"], description: "Toggle this panel" },
        ]}
      />
    <div aria-live="polite" aria-atomic="true" className="sr-only">
      {announcement}
    </div>
    <div className="flex h-full flex-col gap-3 p-4">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">Whiteboard Drawing</h2>
        <p className="text-muted-foreground">Draw, sketch, and export your ideas.</p>
      </div>

      <div className="flex-1 min-h-0 overflow-hidden rounded-xl border border-border bg-card flex flex-col md:flex-row">
      {/* Toolbar */}
      <div className="shrink-0 md:w-64 border-b md:border-b-0 md:border-r border-border overflow-y-auto p-4 space-y-4">
        {/* Tools */}
        <div className="space-y-2" role="group" aria-label="Drawing tools">
          <Label className="text-sm font-medium" id="tools-label">Tools</Label>
          <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-labelledby="tools-label">
            {[
              { tool: "pen" as Tool, icon: Pen, label: "Pen" },
              { tool: "rectangle" as Tool, icon: Square, label: "Rectangle" },
              { tool: "circle" as Tool, icon: Circle, label: "Circle" },
              { tool: "triangle" as Tool, icon: Triangle, label: "Triangle" },
              { tool: "text" as Tool, icon: Type, label: "Text" },
              { tool: "eraser" as Tool, icon: Trash2, label: "Eraser" },
            ].map(({ tool, icon: Icon, label }) => (
              <Button
                key={tool}
                variant={currentTool === tool ? "default" : "outline"}
                size="sm"
                onClick={() => changeTool(tool)}
                className="flex items-center gap-1 focus:outline-none focus:ring-2 focus:ring-primary/50"
                role="radio"
                aria-checked={currentTool === tool}
                aria-label={label}
              >
                <Icon className="h-3 w-3" aria-hidden="true" />
                {label}
              </Button>
            ))}
          </div>
        </div>

        {/* Colors */}
        <div className="space-y-2" role="group" aria-label="Color selection">
          <Label className="text-sm font-medium" id="color-label">Color</Label>
          <div className="grid grid-cols-5 gap-2" role="radiogroup" aria-labelledby="color-label">
            {colors.map(color => (
              <button
                key={color}
                onClick={() => changeColor(color)}
                className={`w-8 h-8 rounded border-2 focus:outline-none focus:ring-2 focus:ring-primary/50 ${
                  currentColor === color ? "border-primary ring-2 ring-primary/30" : "border-border"
                }`}
                style={{ backgroundColor: color }}
                role="radio"
                aria-checked={currentColor === color}
                aria-label={`Color ${color}`}
                title={color}
              />
            ))}
          </div>
          <input
            type="color"
            value={currentColor}
            onChange={(e) => changeColor(e.target.value)}
            className="w-full h-8 rounded cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary/50"
            aria-label="Custom color picker"
          />
        </div>

        {/* Line Width */}
        <div className="space-y-2">
          <Label className="text-sm font-medium" id="linewidth-label">Line Width: {lineWidth}px</Label>
          <Slider
            value={[lineWidth]}
            onValueChange={(value) => {
              setLineWidth(value[0])
              announceToScreenReader(`Line width set to ${value[0]} pixels`)
            }}
            min={1}
            max={20}
            step={1}
            className="w-full"
            aria-label={`Line width: ${lineWidth} pixels`}
          />
        </div>

        {/* Actions */}
        <div className="space-y-2" role="group" aria-label="Canvas actions">
          <Label className="text-sm font-medium">Actions</Label>
          <div className="flex flex-col gap-2">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={undo} 
              disabled={elements.length === 0 && historyIndex < 0}
              className="focus:outline-none focus:ring-2 focus:ring-primary/50 justify-between"
              aria-label="Undo last action"
              title="Ctrl+Shift+Z"
            >
              <span className="flex items-center gap-2">
                <Undo className="h-4 w-4" aria-hidden="true" />
                <span>Undo</span>
              </span>
              <kbd className="pointer-events-none inline-flex h-5 select-none items-center rounded border bg-background/60 px-1.5 font-mono text-[9px] font-medium text-foreground/70 shadow-sm">
                C+S+Z
              </kbd>
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={redo} 
              disabled={historyIndex >= history.length - 1}
              className="focus:outline-none focus:ring-2 focus:ring-primary/50 justify-between"
              aria-label="Redo last action"
              title="Ctrl+Shift+Y"
            >
              <span className="flex items-center gap-2">
                <Redo className="h-4 w-4" aria-hidden="true" />
                <span>Redo</span>
              </span>
              <kbd className="pointer-events-none inline-flex h-5 select-none items-center rounded border bg-background/60 px-1.5 font-mono text-[9px] font-medium text-foreground/70 shadow-sm">
                C+S+Y
              </kbd>
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={clear}
              className="focus:outline-none focus:ring-2 focus:ring-primary/50 justify-between"
              aria-label="Clear canvas"
              title="Ctrl+Shift+X"
            >
              <span className="flex items-center gap-2">
                <Trash2 className="h-4 w-4" aria-hidden="true" />
                <span>Clear</span>
              </span>
              <kbd className="pointer-events-none inline-flex h-5 select-none items-center rounded border bg-background/60 px-1.5 font-mono text-[9px] font-medium text-foreground/70 shadow-sm">
                C+S+X
              </kbd>
            </Button>
            <Button 
              size="sm" 
              onClick={download}
              className="focus:outline-none focus:ring-2 focus:ring-primary/50 justify-between"
              aria-label="Download drawing as image"
              title="Ctrl+Shift+D"
            >
              <span className="flex items-center gap-2">
                <Download className="h-4 w-4" aria-hidden="true" />
                <span>Save</span>
              </span>
              <kbd className="pointer-events-none inline-flex h-5 select-none items-center rounded border bg-background/80 px-1.5 font-mono text-[9px] font-medium text-foreground shadow-sm">
                C+S+D
              </kbd>
            </Button>
          </div>
        </div>
      </div>

      {/* Canvas */}
      <div className="flex-1 relative bg-white overflow-hidden" role="region" aria-label="Drawing canvas">
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
          aria-label={`Drawing canvas with ${elements.length} elements. Current tool: ${currentTool}, color: ${currentColor}, line width: ${lineWidth}px`}
        />
        
        {/* Text Input Popup */}
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
                if (e.key === "Enter") {
                  addText()
                } else if (e.key === "Escape") {
                  setTextPosition(null)
                  setTextInput("")
                }
              }}
              placeholder="Enter text..."
              className="px-2 py-1 border rounded text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
              autoFocus
              aria-label="Text to add to canvas"
            />
            <div className="flex gap-1 mt-1" role="group" aria-label="Text input actions">
              <Button 
                size="sm" 
                onClick={addText}
                className="focus:outline-none focus:ring-2 focus:ring-primary/50"
                aria-label="Add text to canvas"
              >
                Add
              </Button>
              <Button 
                size="sm" 
                variant="outline" 
                onClick={() => { setTextPosition(null); setTextInput(""); announceToScreenReader("Text input cancelled") }}
                className="focus:outline-none focus:ring-2 focus:ring-primary/50"
                aria-label="Cancel text input"
              >
                Cancel
              </Button>
            </div>
          </div>
        )}
      </div>
      </div>
    </div>
    </>
  )
}