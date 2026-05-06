"use client"

import { useState, useCallback, useEffect, useRef } from "react"
import { Play, RotateCcw, Download, Code, FileCode, FileType, Eye, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { ShortcutsModal } from "@/components/shortcuts-modal"
import JSZip from "jszip"

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
  }, [html, css, js])

  useEffect(() => {
    if (autoRun) {
      const timeout = setTimeout(updatePreview, 500)
      return () => clearTimeout(timeout)
    }
  }, [html, css, js, autoRun, updatePreview])

  const downloadFiles = async () => {
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
  }

  const reset = () => {
    if (confirm("Reset all code to default?")) {
      setHtml(DEFAULT_HTML)
      setCss(DEFAULT_CSS)
      setJs(DEFAULT_JS)
    }
  }

  const formatCode = (type: 'html' | 'css' | 'js', code: string) => {
    // Simple auto-indent (basic)
    return code
  }

  return (
    <div className="flex flex-col md:grid md:grid-cols-2 md:gap-4 md:h-[calc(100vh-80px)]">
      <ShortcutsModal
        pageName="Code Playground"
        shortcuts={[
          { keys: ["Ctrl", "Enter"], description: "Run code" },
          { keys: ["Ctrl", "S"], description: "Download files" },
          { keys: ["?"], description: "Toggle this panel" },
        ]}
      />

      {/* Left panel - Editors */}
      <div className="flex flex-col md:overflow-hidden rounded-xl border border-border bg-card">
        <div className="flex-1 overflow-hidden flex flex-col">
          {/* Tab bar */}
          <div className="flex items-center gap-1 p-2 border-b border-border bg-muted/30">
            <button
              onClick={() => setActiveTab('html')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                activeTab === 'html' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <FileCode className="h-4 w-4 text-orange-500" />
              HTML
            </button>
            <button
              onClick={() => setActiveTab('css')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                activeTab === 'css' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <FileType className="h-4 w-4 text-blue-500" />
              CSS
            </button>
            <button
              onClick={() => setActiveTab('js')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                activeTab === 'js' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Code className="h-4 w-4 text-yellow-500" />
              JS
            </button>
            <button
              onClick={() => setActiveTab('preview')}
              className={`md:hidden flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                activeTab === 'preview' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Eye className="h-4 w-4" />
              Preview
            </button>
          </div>

          {/* Editor area */}
          <div className="flex-1 overflow-hidden">
            {activeTab === 'html' && (
              <textarea
                value={html}
                onChange={(e) => setHtml(e.target.value)}
                className="w-full h-full p-4 font-mono text-sm bg-background resize-none focus:outline-none"
                spellCheck={false}
                placeholder="<!-- Enter HTML here -->"
              />
            )}
            {activeTab === 'css' && (
              <textarea
                value={css}
                onChange={(e) => setCss(e.target.value)}
                className="w-full h-full p-4 font-mono text-sm bg-background resize-none focus:outline-none"
                spellCheck={false}
                placeholder="/* Enter CSS here */"
              />
            )}
            {activeTab === 'js' && (
              <textarea
                value={js}
                onChange={(e) => setJs(e.target.value)}
                className="w-full h-full p-4 font-mono text-sm bg-background resize-none focus:outline-none"
                spellCheck={false}
                placeholder="// Enter JavaScript here"
              />
            )}
            {activeTab === 'preview' && (
              <div className="w-full h-full bg-muted flex items-center justify-center md:hidden">
                <p className="text-muted-foreground">Preview on the right panel</p>
              </div>
            )}
          </div>
        </div>

        {/* Toolbar */}
        <div className="shrink-0 border-t border-border p-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Button size="sm" onClick={updatePreview} disabled={autoRun}>
              <Play className="h-4 w-4 mr-1" />
              Run
            </Button>
            <label className="flex items-center gap-2 text-sm text-muted-foreground cursor-pointer">
              <input
                type="checkbox"
                checked={autoRun}
                onChange={(e) => setAutoRun(e.target.checked)}
                className="rounded border-border"
              />
              Auto-run
            </label>
          </div>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="sm" onClick={downloadFiles}>
              <Download className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm" onClick={reset}>
              <RotateCcw className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Right panel - Preview */}
      <div className="hidden md:flex flex-col rounded-xl border border-border bg-card overflow-hidden">
        <div className="flex items-center justify-between px-4 py-2 border-b border-border bg-muted/30">
          <div className="flex items-center gap-2">
            <Eye className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">Live Preview</span>
          </div>
          <button
            onClick={() => { setHtml(''); setCss(''); setJs(''); }}
            className="text-xs text-muted-foreground hover:text-red-500 flex items-center gap-1"
          >
            <Trash2 className="h-3 w-3" />
            Clear all
          </button>
        </div>
        <div className="flex-1 bg-white">
          <iframe
            ref={iframeRef}
            srcDoc={srcDoc}
            className="w-full h-full border-0"
            sandbox="allow-scripts"
            title="Preview"
          />
        </div>
      </div>
    </div>
  )
}