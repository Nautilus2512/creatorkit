"use client"

import { useState, useCallback, useEffect } from "react"
import { Play, RotateCcw, Download, Code, FileCode, FileType, Eye, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { ShortcutsModal } from "@/components/shortcuts-modal"
import JSZip from "jszip"

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

export default function CodePlayground() {
  const [html, setHtml] = useState(DEFAULT_HTML)
  const [css, setCss]   = useState(DEFAULT_CSS)
  const [js, setJs]     = useState(DEFAULT_JS)
  const [activeTab, setActiveTab] = useState<'html' | 'css' | 'js' | 'preview'>('html')
  const [autoRun, setAutoRun] = useState(true)
  const [srcDoc, setSrcDoc]   = useState("")

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

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        if (!(e.ctrlKey || e.metaKey)) return
      }

      if ((e.ctrlKey || e.metaKey) && !e.shiftKey) {
        if (e.key === "1") { e.preventDefault(); switchTab('html') }
        if (e.key === "2") { e.preventDefault(); switchTab('css') }
        if (e.key === "3") { e.preventDefault(); switchTab('js') }
        if (e.key === "4") { e.preventDefault(); switchTab('preview') }
      }

      if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
        e.preventDefault()
        if (!autoRun) updatePreview()
      }

      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === "s") {
        e.preventDefault()
        downloadFiles()
      }

      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === "e") {
        e.preventDefault()
        reset()
      }

      if (e.key === "Escape" && activeTab !== 'preview') {
        const textarea = document.querySelector(`textarea[data-tab="${activeTab}"]`) as HTMLTextAreaElement
        textarea?.focus()
      }
    }
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [switchTab, downloadFiles, updatePreview, reset, autoRun, activeTab])

  return (
    <div className="flex flex-1 flex-col min-h-0">

      {/* Mobile: compact header */}
      <div className="flex md:hidden shrink-0 items-center px-4 pt-3 pb-2 border-b border-border bg-card/95 backdrop-blur-sm">
        <h2 className="text-base font-semibold">Code Playground</h2>
      </div>

      {/* Toolbar — tabs + controls */}
      <div className="shrink-0 flex items-center gap-1 border-b border-border bg-card/95 backdrop-blur-sm px-3 py-2 overflow-x-auto" role="toolbar" aria-label="Code Playground controls">
        <span className="hidden md:inline text-sm font-semibold shrink-0 mr-2">Code Playground</span>
        <div className="flex items-center gap-1" role="tablist" aria-label="Editor tabs">
          <button
            id="tab-html"
            onClick={() => switchTab('html')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
              activeTab === 'html' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
            }`}
            role="tab" aria-selected={activeTab === 'html'} aria-controls="editor-panel" aria-label="HTML editor"
          >
            <FileCode className="h-4 w-4 text-orange-500" aria-hidden="true" />
            HTML<kbd className="ml-1 hidden md:inline rounded border border-border bg-muted px-1 text-[10px]" aria-hidden="true">Ctrl+1</kbd>
          </button>
          <button
            id="tab-css"
            onClick={() => switchTab('css')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
              activeTab === 'css' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
            }`}
            role="tab" aria-selected={activeTab === 'css'} aria-controls="editor-panel" aria-label="CSS editor"
          >
            <FileType className="h-4 w-4 text-blue-500" aria-hidden="true" />
            CSS<kbd className="ml-1 hidden md:inline rounded border border-border bg-muted px-1 text-[10px]" aria-hidden="true">Ctrl+2</kbd>
          </button>
          <button
            id="tab-js"
            onClick={() => switchTab('js')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
              activeTab === 'js' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
            }`}
            role="tab" aria-selected={activeTab === 'js'} aria-controls="editor-panel" aria-label="JavaScript editor"
          >
            <Code className="h-4 w-4 text-yellow-500" aria-hidden="true" />
            JS<kbd className="ml-1 hidden md:inline rounded border border-border bg-muted px-1 text-[10px]" aria-hidden="true">Ctrl+3</kbd>
          </button>
          <button
            id="tab-preview"
            onClick={() => switchTab('preview')}
            className={`md:hidden flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
              activeTab === 'preview' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
            }`}
            role="tab" aria-selected={activeTab === 'preview'} aria-controls="editor-panel" aria-label="Preview"
          >
            <Eye className="h-4 w-4" aria-hidden="true" />
            Preview
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
            Run{!autoRun && <kbd className="ml-1.5 hidden md:inline rounded border border-primary-foreground/30 bg-primary-foreground/20 px-1 text-[10px]" aria-hidden="true">Ctrl+Enter</kbd>}
          </Button>
          <label className="flex items-center gap-2 text-sm text-muted-foreground cursor-pointer">
            <input
              type="checkbox"
              checked={autoRun}
              onChange={toggleAutoRun}
              className="rounded border-border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
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
              { keys: ["Ctrl", "4"], description: "Switch to Preview (mobile)" },
              { keys: ["Ctrl", "Enter"], description: "Run code (when auto-run is off)" },
              { keys: ["Ctrl", "Shift", "S"], description: "Download files as ZIP" },
              { keys: ["Ctrl", "Shift", "E"], description: "Reset to defaults" },
              { keys: ["Escape"], description: "Focus current editor" },
              { keys: ["?"], description: "Toggle this shortcuts panel" },
            ]}
          />
        </div>
      </div>

      {/* Scrollable content area — same pattern as aes-encryptor / base64-encoder */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">

        {/* Panels card */}
        <div className="rounded-xl border border-border overflow-hidden">
          <div className="flex flex-col md:flex-row min-h-[500px]">

            {/* Left — Editor (hidden on mobile when Preview tab is active) */}
            <div
              className={`${activeTab !== 'preview' ? 'flex' : 'hidden'} md:flex flex-col flex-1 border-b md:border-b-0 md:border-r border-border bg-card`}
              role="region"
              aria-label="Code editor"
            >
              <div
                id="editor-panel"
                className="flex-1 min-h-0 flex flex-col"
                role="tabpanel"
                aria-labelledby={`tab-${activeTab}`}
              >
                {activeTab === 'html' && (
                  <textarea
                    value={html}
                    onChange={(e) => setHtml(e.target.value)}
                    className="flex-1 min-h-0 w-full p-4 font-mono text-sm bg-background resize-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary/20"
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
                    className="flex-1 min-h-0 w-full p-4 font-mono text-sm bg-background resize-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary/20"
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
                    className="flex-1 min-h-0 w-full p-4 font-mono text-sm bg-background resize-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary/20"
                    spellCheck={false}
                    placeholder="// Enter JavaScript here"
                    aria-label="JavaScript code editor"
                    data-tab="js"
                  />
                )}
              </div>
            </div>

            {/* Right — Live preview (desktop always visible; mobile when Preview tab active) */}
            <div
              className={`${activeTab === 'preview' ? 'flex' : 'hidden'} md:flex flex-col flex-1 bg-card`}
              role="region"
              aria-label="Live preview"
            >
              <div className="shrink-0 flex items-center justify-between px-4 py-2 border-b border-border bg-muted/30">
                <div className="flex items-center gap-2">
                  <Eye className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                  <span className="text-sm font-medium">Live Preview</span>
                </div>
                <button
                  onClick={clearAll}
                  className="text-xs text-muted-foreground hover:text-red-500 flex items-center gap-1 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-destructive rounded px-2 py-1"
                  aria-label="Clear all code"
                >
                  <Trash2 className="h-3 w-3" aria-hidden="true" />
                  Clear all
                </button>
              </div>
              <div className="flex-1 min-h-0 bg-white flex flex-col">
                <iframe
                  srcDoc={srcDoc}
                  className="flex-1 w-full border-0"
                  sandbox="allow-scripts"
                  title="Code preview"
                  aria-label="Preview of your HTML, CSS and JavaScript code"
                />
              </div>
            </div>

          </div>
        </div>

        {/* Usage guide */}
        <div className="rounded-xl border border-border bg-card p-4 space-y-4">
          <div className="space-y-1.5">
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">How to use</p>
            <ol className="space-y-1.5 text-xs text-muted-foreground list-decimal list-inside">
              <li>Switch between <span className="text-foreground font-medium">HTML</span>, <span className="text-foreground font-medium">CSS</span>, and <span className="text-foreground font-medium">JS</span> tabs to edit each file. With <span className="text-foreground font-medium">Auto-run</span> on, the preview updates automatically as you type.</li>
              <li>Turn off <span className="text-foreground font-medium">Auto-run</span> for large edits, then press <kbd className="rounded border border-border bg-muted px-1 text-[10px]">Ctrl+Enter</kbd> or click <span className="text-foreground font-medium">Run</span> to refresh manually.</li>
              <li>On mobile, tap the <span className="text-foreground font-medium">Preview</span> tab to see the live output.</li>
              <li>Click <span className="text-foreground font-medium">Download ZIP</span> to save <code className="rounded bg-muted px-1 text-[10px] font-mono">index.html</code>, <code className="rounded bg-muted px-1 text-[10px] font-mono">style.css</code>, and <code className="rounded bg-muted px-1 text-[10px] font-mono">script.js</code> as a linked project you can open locally.</li>
              <li><span className="text-foreground font-medium">Reset</span> restores the default starter code. <span className="text-foreground font-medium">Clear all</span> wipes all three files to start from blank.</li>
            </ol>
          </div>
          <div className="space-y-1.5">
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">Keyboard shortcuts</p>
            <ul className="space-y-1 text-xs text-muted-foreground list-disc list-inside">
              <li><kbd className="rounded border border-border bg-muted px-1 text-[10px]">Ctrl+1 / 2 / 3</kbd> Switch to HTML, CSS, or JS editor</li>
              <li><kbd className="rounded border border-border bg-muted px-1 text-[10px]">Ctrl+Enter</kbd> Run preview (when auto-run is off)</li>
              <li><kbd className="rounded border border-border bg-muted px-1 text-[10px]">Ctrl+Shift+S</kbd> Download files as ZIP</li>
              <li><kbd className="rounded border border-border bg-muted px-1 text-[10px]">Ctrl+Shift+E</kbd> Reset to defaults</li>
              <li><kbd className="rounded border border-border bg-muted px-1 text-[10px]">Escape</kbd> Focus the current editor</li>
              <li><kbd className="rounded border border-border bg-muted px-1 text-[10px]">?</kbd> Full shortcuts reference</li>
            </ul>
          </div>
          <div className="space-y-1.5">
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">Tips</p>
            <ul className="space-y-1 text-xs text-muted-foreground list-disc list-inside">
              <li>The preview runs in a sandboxed iframe. External network requests and <code className="rounded bg-muted px-1 text-[10px] font-mono">localStorage</code> are not available inside it.</li>
              <li>JavaScript errors in the preview do not affect the editor. Open browser DevTools to debug them.</li>
              <li>The downloaded ZIP links all three files. Open <code className="rounded bg-muted px-1 text-[10px] font-mono">index.html</code> directly in a browser to run your project locally.</li>
              <li>Everything runs in your browser. Nothing is sent to a server.</li>
            </ul>
          </div>
        </div>

        <div className="md:hidden h-[60px]" aria-hidden="true" />

      </div>

      {/* Desktop: bottom action bar */}
      <div className="hidden md:flex shrink-0 items-center gap-2 border-t border-border bg-card/95 backdrop-blur-sm px-4 py-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={reset}
          aria-label="Reset code to defaults"
          title="Reset to defaults (Ctrl+Shift+E)"
        >
          <RotateCcw className="h-4 w-4 mr-1" aria-hidden="true" />
          Reset<kbd className="ml-1 rounded border border-border bg-muted px-1 text-[10px]" aria-hidden="true">Ctrl+Shift+E</kbd>
        </Button>
        <div className="flex-1" />
        <Button size="sm" onClick={downloadFiles} aria-label="Download files as ZIP">
          <Download className="h-4 w-4 mr-1" aria-hidden="true" />
          Download ZIP
          <kbd className="ml-1 rounded border border-primary-foreground/30 bg-primary-foreground/20 px-1 text-[10px]" aria-hidden="true">Ctrl+Shift+S</kbd>
        </Button>
      </div>

      {/* Mobile: bottom action bar (fixed to viewport) */}
      <div
        className="md:hidden fixed bottom-0 left-0 right-0 flex items-center gap-2 border-t border-border bg-card/95 backdrop-blur-sm px-3 py-2 z-20"
        style={{ paddingBottom: "max(0.5rem, env(safe-area-inset-bottom))" }}
      >
        <Button variant="ghost" size="sm" className="h-11" onClick={reset} aria-label="Reset code to defaults">
          <RotateCcw className="h-4 w-4 mr-1" aria-hidden="true" />
          Reset
        </Button>
        <div className="flex-1" />
        <Button size="sm" className="h-11 px-4" onClick={downloadFiles} aria-label="Download files as ZIP">
          <Download className="h-4 w-4 mr-1.5" aria-hidden="true" />
          Download ZIP
        </Button>
      </div>

    </div>
  )
}
