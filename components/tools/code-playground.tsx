"use client"

import { useState, useCallback, useEffect, useRef } from "react"
import { Play, RotateCcw, Download, Code, FileCode, FileType, Eye, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { ShortcutsModal } from "@/components/shortcuts-modal"
import JSZip from "jszip"

// Accessibility helper for screen reader announcements
function announceToScreenReader(message: string) {
  const announcement = document.createElement('div')
  announcement.setAttribute('role', 'status')
  announcement.setAttribute('aria-live', 'polite')
  announcement.setAttribute('aria-atomic', 'true')
  announcement.className = 'sr-only'
  announcement.textContent = message
  document.body.appendChild(announcement)
  setTimeout(() => document.body.removeChild(announcement), 1000)
}

const DEFAULT_HTML = `<!-- Your HTML here -->
<div class="container">
  <h1>Hello World</h1>
  <p>Start editing to see changes!</p>
  <button onclick="alert('Clicked!')">Click me</button>
</div>`

const DEFAULT_CSS = `/* Your CSS here */
body {
  font-family: system-ui, sans-serif;
  padding: 2rem;
  background: #f5f5f5;
}

.container {
  max-width: 600px;
  margin: 0 auto;
  background: white;
  padding: 2rem;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
}

h1 {
  color: #333;
  margin-top: 0;
}

button {
  background: #3b82f6;
  color: white;
  border: none;
  padding: 0.5rem 1rem;
  border-radius: 4px;
  cursor: pointer;
}

button:hover {
  background: #2563eb;
}`

const DEFAULT_JS = `// Your JavaScript here
console.log("Hello from JavaScript!");

// Try the button click!`

export function CodePlayground() {
  const [html, setHtml] = useState(DEFAULT_HTML)
  const [css, setCss] = useState(DEFAULT_CSS)
  const [js, setJs] = useState(DEFAULT_JS)
  const [activeTab, setActiveTab] = useState<'html' | 'css' | 'js' | 'preview'>('html')
  const [autoRun, setAutoRun] = useState(true)
  const [srcDoc, setSrcDoc] = useState("")
  const iframeRef = useRef<HTMLIFrameElement>(null)

  const updatePreview = useCallback(() => {
    const doc = `
      <!DOCTYPE html>
      <html>
        <head>
          <style>${css}</style>
        </head>
        <body>
          ${html}
          <script>${js}<\/script>
        </body>
      </html>
    `
    setSrcDoc(doc)
    announceToScreenReader('Preview updated')
  }, [html, css, js])

  useEffect(() => {
    if (autoRun) {
      const timeout = setTimeout(updatePreview, 500)
      return () => clearTimeout(timeout)
    }
  }, [html, css, js, autoRun, updatePreview])

  const downloadFiles = useCallback(async () => {
    const zip = new JSZip()
    zip.file("index.html", `<!DOCTYPE html>
<html>
<head>
  <link rel="stylesheet" href="style.css">
</head>
<body>
${html}
<script src="script.js"><\/script>
</body>
</html>`)
    zip.file("style.css", css)
    zip.file("script.js", js)

    const blob = await zip.generateAsync({ type: "blob" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = "code-playground.zip"
    a.click()
    URL.revokeObjectURL(url)
    announceToScreenReader('Files downloaded as ZIP')
  }, [html, css, js])

  const reset = useCallback(() => {
    if (confirm("Reset all code to default?")) {
      setHtml(DEFAULT_HTML)
      setCss(DEFAULT_CSS)
      setJs(DEFAULT_JS)
      setActiveTab('html')
      announceToScreenReader('Code reset to defaults')
    }
  }, [])

  const clearAll = useCallback(() => {
    if (confirm("Clear all code? This cannot be undone.")) {
      setHtml('')
      setCss('')
      setJs('')
      announceToScreenReader('All code cleared')
    }
  }, [])

  const toggleAutoRun = useCallback(() => {
    setAutoRun(prev => {
      const newValue = !prev
      announceToScreenReader(newValue ? 'Auto-run enabled' : 'Auto-run disabled')
      return newValue
    })
  }, [])

  const switchTab = useCallback((tab: 'html' | 'css' | 'js' | 'preview') => {
    setActiveTab(tab)
    const tabNames = { html: 'HTML', css: 'CSS', js: 'JavaScript', preview: 'Preview' }
    announceToScreenReader(`Switched to ${tabNames[tab]} editor`)
  }, [])

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Tab switching with Ctrl+1/2/3/4
      if ((e.ctrlKey || e.metaKey) && !e.shiftKey) {
        if (e.key === "1") {
          e.preventDefault()
          e.stopPropagation()
          switchTab('html')
        }
        if (e.key === "2") {
          e.preventDefault()
          e.stopPropagation()
          switchTab('css')
        }
        if (e.key === "3") {
          e.preventDefault()
          e.stopPropagation()
          switchTab('js')
        }
        if (e.key === "4") {
          e.preventDefault()
          e.stopPropagation()
          switchTab('preview')
        }
        if (e.key.toLowerCase() === "s") {
          e.preventDefault()
          e.stopPropagation()
          downloadFiles()
        }
        if (e.key.toLowerCase() === "r") {
          e.preventDefault()
          e.stopPropagation()
          if (!autoRun) {
            updatePreview()
          }
        }
      }

      // Escape to focus editor
      if (e.key === "Escape" && activeTab !== 'preview') {
        const textarea = document.querySelector(`textarea[data-tab="${activeTab}"]`) as HTMLTextAreaElement
        textarea?.focus()
      }
    }
    window.addEventListener("keydown", handleKeyDown, true)
    return () => window.removeEventListener("keydown", handleKeyDown, true)
  }, [switchTab, downloadFiles, updatePreview, autoRun, activeTab])

  return (
    <div className="flex h-full flex-col">
      {/* Compact top toolbar */}
      <div className="shrink-0 flex items-center gap-1 border-b border-border bg-card/95 backdrop-blur-sm px-3 py-2 overflow-x-auto" role="toolbar" aria-label="Code Playground controls">
        <div className="flex items-center gap-1" role="tablist" aria-label="Editor tabs">
          <button
            onClick={() => switchTab('html')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-primary ${
              activeTab === 'html' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
            }`}
            role="tab"
            aria-selected={activeTab === 'html'}
            aria-label="HTML editor"
          >
            <FileCode className="h-4 w-4 text-orange-500" aria-hidden="true" />
            HTML<kbd className="ml-1 hidden md:inline rounded border border-border bg-muted px-1 text-[10px]" aria-hidden="true">Ctrl+1</kbd>
          </button>
          <button
            onClick={() => switchTab('css')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-primary ${
              activeTab === 'css' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
            }`}
            role="tab"
            aria-selected={activeTab === 'css'}
            aria-label="CSS editor"
          >
            <FileType className="h-4 w-4 text-blue-500" aria-hidden="true" />
            CSS<kbd className="ml-1 hidden md:inline rounded border border-border bg-muted px-1 text-[10px]" aria-hidden="true">Ctrl+2</kbd>
          </button>
          <button
            onClick={() => switchTab('js')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-primary ${
              activeTab === 'js' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
            }`}
            role="tab"
            aria-selected={activeTab === 'js'}
            aria-label="JavaScript editor"
          >
            <Code className="h-4 w-4 text-yellow-500" aria-hidden="true" />
            JS<kbd className="ml-1 hidden md:inline rounded border border-border bg-muted px-1 text-[10px]" aria-hidden="true">Ctrl+3</kbd>
          </button>
          <button
            onClick={() => switchTab('preview')}
            className={`md:hidden flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-primary ${
              activeTab === 'preview' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
            }`}
            role="tab"
            aria-selected={activeTab === 'preview'}
            aria-label="Preview"
          >
            <Eye className="h-4 w-4" aria-hidden="true" />
            Preview<kbd className="ml-1 hidden md:inline rounded border border-border bg-muted px-1 text-[10px]" aria-hidden="true">Ctrl+4</kbd>
          </button>
        </div>
        <div className="shrink-0 flex items-center gap-2 ml-2">
          <Button
            size="sm"
            onClick={updatePreview}
            disabled={autoRun}
            aria-label={autoRun ? "Auto-run is enabled" : "Run code preview"}
          >
            <Play className="h-4 w-4 mr-1" aria-hidden="true" />
            Run{!autoRun && <kbd className="ml-1.5 hidden md:inline rounded border border-primary-foreground/30 bg-primary-foreground/20 px-1 text-[10px]" aria-hidden="true">Ctrl+R</kbd>}
          </Button>
          <label className="flex items-center gap-2 text-sm text-muted-foreground cursor-pointer">
            <input
              type="checkbox"
              checked={autoRun}
              onChange={toggleAutoRun}
              className="rounded border-border focus:ring-2 focus:ring-primary"
              aria-label="Toggle auto-run"
            />
            Auto-run
          </label>
        </div>
        <div className="ml-auto shrink-0">
          <ShortcutsModal
            pageName="Code Playground"
            shortcuts={[
              { keys: ["Ctrl", "1"], description: "Switch to HTML editor" },
              { keys: ["Ctrl", "2"], description: "Switch to CSS editor" },
              { keys: ["Ctrl", "3"], description: "Switch to JS editor" },
              { keys: ["Ctrl", "4"], description: "Switch to Preview" },
              { keys: ["Ctrl", "R"], description: "Run code (when auto-run is off)" },
              { keys: ["Ctrl", "S"], description: "Download files as ZIP" },
              { keys: ["Ctrl", "Shift", "R"], description: "Reset to defaults" },
              { keys: ["Escape"], description: "Focus current editor" },
              { keys: ["?"], description: "Toggle this shortcuts panel" },
              { keys: ["Tab"], description: "Navigate between controls" },
            ]}
          />
        </div>
      </div>

      {/* Canvas/workspace */}
      <div className="flex-1 min-h-0 overflow-hidden flex">
        {/* Left panel - Editors */}
        <div className="flex flex-col overflow-hidden border-r border-border bg-card min-h-0 w-full md:w-1/2" role="region" aria-label="Code editors">
          {/* Editor area */}
          <div className="flex-1 overflow-hidden" role="tabpanel" aria-label={`${activeTab === 'html' ? 'HTML' : activeTab === 'css' ? 'CSS' : activeTab === 'js' ? 'JavaScript' : 'Preview'} editor`}>
            {activeTab === 'html' && (
              <textarea
                value={html}
                onChange={(e) => setHtml(e.target.value)}
                className="w-full h-full p-4 font-mono text-sm bg-background resize-none focus:outline-none focus:ring-2 focus:ring-inset focus:ring-primary/20"
                spellCheck={false}
                placeholder="<!-- Enter HTML here -->"
                aria-label="HTML code editor"
                data-tab="html"
              />
            )}
            {activeTab === 'css' && (
              <textarea
                value={css}
                onChange={(e) => setCss(e.target.value)}
                className="w-full h-full p-4 font-mono text-sm bg-background resize-none focus:outline-none focus:ring-2 focus:ring-inset focus:ring-primary/20"
                spellCheck={false}
                placeholder="/* Enter CSS here */"
                aria-label="CSS code editor"
                data-tab="css"
              />
            )}
            {activeTab === 'js' && (
              <textarea
                value={js}
                onChange={(e) => setJs(e.target.value)}
                className="w-full h-full p-4 font-mono text-sm bg-background resize-none focus:outline-none focus:ring-2 focus:ring-inset focus:ring-primary/20"
                spellCheck={false}
                placeholder="// Enter JavaScript here"
                aria-label="JavaScript code editor"
                data-tab="js"
              />
            )}
            {activeTab === 'preview' && (
              <div className="w-full h-full bg-muted flex items-center justify-center md:hidden" role="note" aria-label="Mobile preview placeholder">
                <p className="text-muted-foreground">Preview on the right panel</p>
              </div>
            )}
          </div>
        </div>

        {/* Right panel - Preview */}
        <div className="hidden md:flex flex-col overflow-hidden bg-card min-h-0 flex-1" role="region" aria-label="Live preview">
          <div className="flex items-center justify-between px-4 py-2 border-b border-border bg-muted/30">
            <div className="flex items-center gap-2">
              <Eye className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
              <span className="text-sm font-medium">Live Preview</span>
            </div>
            <button
              onClick={clearAll}
              className="text-xs text-muted-foreground hover:text-red-500 flex items-center gap-1 transition-colors focus:outline-none focus:ring-2 focus:ring-destructive rounded px-2 py-1"
              aria-label="Clear all code"
            >
              <Trash2 className="h-3 w-3" aria-hidden="true" />
              Clear all
            </button>
          </div>
          <div className="flex-1 bg-white">
            <iframe
              ref={iframeRef}
              srcDoc={srcDoc}
              className="w-full h-full border-0"
              sandbox="allow-scripts"
              title="Code preview"
              aria-label="Preview of your HTML, CSS and JavaScript code"
            />
          </div>
        </div>
      </div>

      {/* Bottom action bar */}
      <div
        className="shrink-0 flex items-center gap-2 border-t border-border bg-card/95 backdrop-blur-sm px-4 py-2"
        style={{ paddingBottom: "max(0.5rem, env(safe-area-inset-bottom))" }}
      >
        <Button
          variant="ghost"
          size="sm"
          className="h-11 md:h-9"
          onClick={reset}
          aria-label="Reset code to defaults"
          title="Reset to defaults (Ctrl+Shift+R)"
        >
          <RotateCcw className="h-4 w-4 mr-1" aria-hidden="true" />
          Reset
        </Button>
        <div className="flex-1" />
        <Button
          size="sm"
          className="h-11 md:h-9"
          onClick={downloadFiles}
          aria-label="Download files as ZIP"
        >
          <Download className="h-4 w-4 mr-1" aria-hidden="true" />
          Download ZIP
          <kbd className="ml-1 hidden md:inline rounded border border-border bg-muted px-1 text-[10px]" aria-hidden="true">Ctrl+S</kbd>
        </Button>
      </div>
    </div>
  )
}
