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
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
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

  const undo = () => {
    if (historyIndex > 0) {
      setHistoryIndex(historyIndex - 1)
      setElements(history[historyIndex - 1])
    } else if (elements.length > 0) {
      setElements([])
      setHistoryIndex(-1)
    }
  }

  const redo = () => {
    if (historyIndex < history.length - 1) {
      setHistoryIndex(historyIndex + 1)
      setElements(history[historyIndex + 1])
    }
  }

  const clear = () => {
    setElements([])
    setCurrentElement(null)
    setHistory([])
    setHistoryIndex(-1)
  }

  const download = () => {
    const canvas = canvasRef.current
    if (!canvas) return
    
    const link = document.createElement("a")
    link.download = "whiteboard-drawing.png"
    link.href = canvas.toDataURL()
    link.click()
  }

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "z") {
        e.preventDefault()
        undo()
      }
      if ((e.ctrlKey || e.metaKey) && e.key === "y") {
        e.preventDefault()
        redo()
      }
      if ((e.ctrlKey || e.metaKey) && e.key === "s") {
        e.preventDefault()
        download()
      }
    }
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [elements, history, historyIndex])

  return (
    <div className="flex flex-col md:grid md:grid-cols-4 md:gap-4 md:h-[calc(100vh-80px)]">
      <ShortcutsModal
        pageName="Whiteboard Drawing"
        shortcuts={[
          { keys: ["Ctrl", "Z"], description: "Undo" },
          { keys: ["Ctrl", "Y"], description: "Redo" },
          { keys: ["Ctrl", "S"], description: "Download image" },
          { keys: ["Delete"], description: "Clear canvas" },
          { keys: ["?"], description: "Toggle this panel" },
        ]}
      />

      {/* Toolbar */}
      <div className="md:col-span-1 space-y-4 p-4 border-r border-border">
        <div className="flex items-center gap-2">
          <div className="rounded-lg border border-border bg-muted/50 p-2">
            <Pen className="h-4 w-4 text-primary" />
          </div>
          <div>
            <h1 className="text-base font-semibold">Whiteboard</h1>
            <p className="text-xs text-muted-foreground">Draw, sketch, and export</p>
          </div>
        </div>

        {/* Tools */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">Tools</Label>
          <div className="grid grid-cols-2 gap-2">
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
                onClick={() => setCurrentTool(tool)}
                className="flex items-center gap-1"
              >
                <Icon className="h-3 w-3" />
                {label}
              </Button>
            ))}
          </div>
        </div>

        {/* Colors */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">Color</Label>
          <div className="grid grid-cols-5 gap-2">
            {colors.map(color => (
              <button
                key={color}
                onClick={() => setCurrentColor(color)}
                className={`w-8 h-8 rounded border-2 ${
                  currentColor === color ? "border-primary" : "border-border"
                }`}
                style={{ backgroundColor: color }}
              />
            ))}
          </div>
          <input
            type="color"
            value={currentColor}
            onChange={(e) => setCurrentColor(e.target.value)}
            className="w-full h-8 rounded cursor-pointer"
          />
        </div>

        {/* Line Width */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">Line Width: {lineWidth}px</Label>
          <Slider
            value={[lineWidth]}
            onValueChange={(value) => setLineWidth(value[0])}
            min={1}
            max={20}
            step={1}
            className="w-full"
          />
        </div>

        {/* Actions */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">Actions</Label>
          <div className="grid grid-cols-2 gap-2">
            <Button variant="outline" size="sm" onClick={undo} disabled={elements.length === 0 && historyIndex < 0}>
              <Undo className="h-3 w-3 mr-1" />
              Undo
            </Button>
            <Button variant="outline" size="sm" onClick={redo} disabled={historyIndex >= history.length - 1}>
              <Redo className="h-3 w-3 mr-1" />
              Redo
            </Button>
            <Button variant="outline" size="sm" onClick={clear}>
              <Trash2 className="h-3 w-3 mr-1" />
              Clear
            </Button>
            <Button size="sm" onClick={download}>
              <Download className="h-3 w-3 mr-1" />
              Save
            </Button>
          </div>
        </div>
      </div>

      {/* Canvas */}
      <div className="md:col-span-3 relative bg-white rounded-lg border border-border overflow-hidden">
        <canvas
          ref={canvasRef}
          width={800}
          height={600}
          className="w-full h-full cursor-crosshair"
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
        />
        
        {/* Text Input Popup */}
        {textPosition && (
          <div
            className="absolute bg-background border border-border rounded-lg p-2 shadow-lg"
            style={{ left: textPosition.x, top: textPosition.y }}
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
              className="px-2 py-1 border rounded text-sm"
              autoFocus
            />
            <div className="flex gap-1 mt-1">
              <Button size="sm" onClick={addText}>Add</Button>
              <Button size="sm" variant="outline" onClick={() => { setTextPosition(null); setTextInput("") }}>Cancel</Button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}