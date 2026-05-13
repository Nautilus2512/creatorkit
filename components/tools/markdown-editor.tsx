"use client"

import { useState, useRef, useEffect, useCallback } from "react"

import {
  Download, Upload, Copy, Check,
  Bold, Italic, Link, Image, Code, List, ListOrdered,
  Quote, Hash, Strikethrough, Link2, Link2Off,
  Undo, Redo,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { ShortcutsModal } from "@/components/shortcuts-modal"

// Simple markdown parser (basic implementation)
const parseMarkdown = (text: string): string => {
  let html = text
  
  // Headers
  html = html.replace(/^### (.*$)/gim, '<h3 class="text-lg font-semibold mb-2">$1</h3>')
  html = html.replace(/^## (.*$)/gim, '<h2 class="text-xl font-semibold mb-3">$1</h2>')
  html = html.replace(/^# (.*$)/gim, '<h1 class="text-2xl font-bold mb-4">$1</h1>')
  
  // Bold
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong class="font-bold">$1</strong>')
  
  // Italic
  html = html.replace(/\*(.+?)\*/g, '<em class="italic">$1</em>')
  
  // Strikethrough
  html = html.replace(/~~(.+?)~~/g, '<del class="line-through">$1</del>')
  
  // Code blocks
  html = html.replace(/```([\s\S]*?)```/g, (match, code) => {
    // Remove any script tags from code content
    const sanitizedCode = code.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
    return `<pre class="bg-gray-100 dark:bg-gray-800 p-3 rounded-lg overflow-x-auto"><code>${sanitizedCode}</code></pre>`;
  })
  
  // Inline code
  html = html.replace(/`(.+?)`/g, (match, code) => {
    // Remove any script tags from inline code content
    const sanitizedCode = code.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
    return `<code class="bg-gray-100 dark:bg-gray-800 px-1 py-0.5 rounded text-sm">${sanitizedCode}</code>`;
  })
  
  // Links
  html = html.replace(/\[(.+?)\]\((.+?)\)/g, '<a href="$2" class="text-blue-600 dark:text-blue-400 hover:underline" target="_blank" rel="noopener noreferrer">$1</a>')
  
  // Images
  html = html.replace(/!\[(.+?)\]\((.+?)\)/g, '<img src="$2" alt="$1" class="max-w-full h-auto rounded-lg" />')
  
  // Blockquotes
  html = html.replace(/^> (.+)$/gim, '<blockquote class="border-l-4 border-gray-300 dark:border-gray-600 pl-4 italic text-gray-600 dark:text-gray-400">$1</blockquote>')
  
  // Unordered lists
  html = html.replace(/^\* (.+)$/gim, '<li class="ml-4">• $1</li>')
  html = html.replace(/(<li class="ml-4">• .+<\/li>\n)+/g, '<ul class="list-disc list-inside mb-3">$&</ul>')
  
  // Ordered lists
  html = html.replace(/^\d+\. (.+)$/gim, '<li class="ml-4">$1</li>')
  html = html.replace(/(<li class="ml-4">.+<\/li>\n)+/g, '<ol class="list-decimal list-inside mb-3">$&</ol>')
  
  // Line breaks
  html = html.replace(/\n\n/g, '</p><p class="mb-3">')
  html = '<p class="mb-3">' + html + '</p>'
  
  // Remove empty paragraphs
  html = html.replace(/<p class="mb-3"><\/p>/g, '')
  
  // Remove any remaining script tags from the entire HTML
  html = html.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
  
  return html
}

export function MarkdownEditor() {
  const [markdown, setMarkdown] = useState("# Welcome to Markdown Editor\n\n## Features\n- **Live preview** with instant rendering\n- *Syntax highlighting* support\n- ~~Strikethrough~~ text\n- `Inline code` examples\n\n## Code Example\n```javascript\nfunction hello() {\n  console.log(\"Hello, World!\");\n}\n```\n\n## Links and Images\n[Visit GitHub](https://github.com)\n\n> This is a blockquote example\n> Perfect for highlighting important content\n\n## Lists\n1. First item\n2. Second item\n3. Third item\n\n* Unordered list item\n* Another item\n* Last item")
  
  const [copied, setCopied] = useState(false)
  const [syncScroll, setSyncScroll] = useState(true)
  const [history, setHistory] = useState<string[]>([])
  const [historyIndex, setHistoryIndex] = useState(-1)
  const [announcement, setAnnouncement] = useState("")
  const editorRef = useRef<HTMLTextAreaElement>(null)
  const previewRef = useRef<HTMLDivElement>(null)
  const isUndoingRef = useRef(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const announceToScreenReader = useCallback((message: string) => {
    setAnnouncement(message)
    setTimeout(() => setAnnouncement(""), 1000)
  }, [])
  
  const html = parseMarkdown(markdown)

  const setMarkdownWithHistory = useCallback((newMarkdown: string) => {
    if (isUndoingRef.current) {
      isUndoingRef.current = false
      setMarkdown(newMarkdown)
      return
    }

    setHistory(prev => {
      const newHistory = prev.slice(0, historyIndex + 1)
      if (newHistory[newHistory.length - 1] !== newMarkdown) {
        newHistory.push(newMarkdown)
      }
      return newHistory
    })
    setHistoryIndex(prev => {
      const newIndex = Math.min(prev + 1, history.length)
      return newIndex
    })
    setMarkdown(newMarkdown)
  }, [historyIndex, history.length])

  const insertText = (before: string, after: string = "") => {
    const textarea = editorRef.current
    if (!textarea) return
    
    const start = textarea.selectionStart
    const end = textarea.selectionEnd
    const selectedText = markdown.substring(start, end)
    const newText = before + selectedText + after
    
    const newMarkdown = markdown.substring(0, start) + newText + markdown.substring(end)
    setMarkdownWithHistory(newMarkdown)
    
    // Restore cursor position
    setTimeout(() => {
      textarea.focus()
      textarea.setSelectionRange(start + before.length, start + before.length + selectedText.length)
    }, 0)
  }

  const copyMarkdown = useCallback(async () => {
    await navigator.clipboard.writeText(markdown)
    setCopied(true)
    announceToScreenReader("Markdown copied to clipboard")
    setTimeout(() => setCopied(false), 2000)
  }, [markdown, announceToScreenReader])

  const downloadMarkdown = useCallback(() => {
    const blob = new Blob([markdown], { type: 'text/markdown' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = 'document.md'
    a.click()
    URL.revokeObjectURL(url)
    announceToScreenReader("Markdown file downloaded")
  }, [markdown, announceToScreenReader])

  const uploadMarkdown = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    
    const reader = new FileReader()
    reader.onload = (event) => {
      const content = event.target?.result as string
      setMarkdownWithHistory(content)
      announceToScreenReader(`File "${file.name}" uploaded successfully`)
    }
    reader.readAsText(file)
  }, [setMarkdownWithHistory, announceToScreenReader])

  const undo = () => {
    if (historyIndex > 0) {
      isUndoingRef.current = true
      const newIndex = historyIndex - 1
      setHistoryIndex(newIndex)
      setMarkdown(history[newIndex])
    }
  }

  const redo = () => {
    if (historyIndex < history.length - 1) {
      isUndoingRef.current = true
      const newIndex = historyIndex + 1
      setHistoryIndex(newIndex)
      setMarkdown(history[newIndex])
    }
  }

  // Scroll sync - bidirectional with RAF for smoothness
  const isSyncingRef = useRef(false)
  const rafRef = useRef<number | null>(null)

  const syncEditorToPreview = useCallback(() => {
    if (!syncScroll || !editorRef.current || !previewRef.current || isSyncingRef.current) return
    isSyncingRef.current = true

    if (rafRef.current) cancelAnimationFrame(rafRef.current)
    rafRef.current = requestAnimationFrame(() => {
      const editor = editorRef.current
      const preview = previewRef.current
      if (!editor || !preview) return

      const editorScrollable = editor.scrollHeight - editor.clientHeight
      const previewScrollable = preview.scrollHeight - preview.clientHeight

      if (editorScrollable > 0 && previewScrollable > 0) {
        const scrollRatio = editor.scrollTop / editorScrollable
        preview.scrollTop = scrollRatio * previewScrollable
      }

      isSyncingRef.current = false
    })
  }, [syncScroll])

  const syncPreviewToEditor = useCallback(() => {
    if (!syncScroll || !editorRef.current || !previewRef.current || isSyncingRef.current) return
    isSyncingRef.current = true

    if (rafRef.current) cancelAnimationFrame(rafRef.current)
    rafRef.current = requestAnimationFrame(() => {
      const editor = editorRef.current
      const preview = previewRef.current
      if (!editor || !preview) return

      const editorScrollable = editor.scrollHeight - editor.clientHeight
      const previewScrollable = preview.scrollHeight - preview.clientHeight

      if (editorScrollable > 0 && previewScrollable > 0) {
        const scrollRatio = preview.scrollTop / previewScrollable
        editor.scrollTop = scrollRatio * editorScrollable
      }

      isSyncingRef.current = false
    })
  }, [syncScroll])

  useEffect(() => {
    const editor = editorRef.current
    const preview = previewRef.current
    if (editor && preview) {
      editor.addEventListener('scroll', syncEditorToPreview, { passive: true })
      preview.addEventListener('scroll', syncPreviewToEditor, { passive: true })
      return () => {
        editor.removeEventListener('scroll', syncEditorToPreview)
        preview.removeEventListener('scroll', syncPreviewToEditor)
        if (rafRef.current) cancelAnimationFrame(rafRef.current)
      }
    }
  }, [syncEditorToPreview, syncPreviewToEditor])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 's') {
        e.preventDefault()
        downloadMarkdown()
      }
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'c') {
        e.preventDefault()
        copyMarkdown()
      }
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'b') {
        e.preventDefault()
        insertText("**", "**")
        announceToScreenReader("Bold applied")
      }
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'i') {
        e.preventDefault()
        insertText("*", "*")
        announceToScreenReader("Italic applied")
      }
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'o') {
        e.preventDefault()
        fileInputRef.current?.click()
        announceToScreenReader("File upload dialog opened")
      }
    }
    const handleEditorKeyDown = (e: KeyboardEvent) => {
      // Ctrl+Shift+Z to undo
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'z') {
        e.preventDefault()
        undo()
        announceToScreenReader("Undo")
      }
      // Ctrl+Shift+Y to redo
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
        e.preventDefault()
        redo()
        announceToScreenReader("Redo")
      }
    }

    const editor = editorRef.current
    if (editor) {
      editor.addEventListener('keydown', handleEditorKeyDown)
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      if (editor) {
        editor.removeEventListener('keydown', handleEditorKeyDown)
      }
    }
  }, [markdown, downloadMarkdown, copyMarkdown, announceToScreenReader])

  return (
    <>
      <div aria-live="polite" aria-atomic="true" className="sr-only">
        {announcement}
      </div>
      <ShortcutsModal
        pageName="Markdown Editor"
        shortcuts={[
          { keys: ["Ctrl", "Shift", "S"], description: "Download markdown" },
          { keys: ["Ctrl", "Shift", "C"], description: "Copy markdown" },
          { keys: ["Ctrl", "Shift", "O"], description: "Upload file" },
          { keys: ["Ctrl", "Shift", "B"], description: "Bold text" },
          { keys: ["Ctrl", "Shift", "I"], description: "Italic text" },
          { keys: ["Ctrl", "Z"], description: "Undo" },
          { keys: ["Ctrl", "Y"], description: "Redo" },
          { keys: ["?"], description: "Show keyboard shortcuts" },
        ]}
      />
      <div className="flex flex-1 min-h-0 flex-col gap-3 p-4">
        {/* Header */}
        <div className="flex items-center justify-between shrink-0 flex-wrap gap-2">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight">Markdown Editor</h2>
            <p className="text-muted-foreground">Write and preview markdown with live rendering</p>
          </div>
          <div className="flex items-center gap-2" role="group" aria-label="Editor actions">
            <Button
              variant="outline"
              size="sm"
              onClick={() => { setSyncScroll(!syncScroll); announceToScreenReader(syncScroll ? "Scroll sync disabled" : "Scroll sync enabled") }}
              title={syncScroll ? "Disable scroll sync" : "Enable scroll sync"}
              className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
              aria-pressed={syncScroll}
              aria-label="Toggle scroll sync"
            >
              {syncScroll ? <Link2 className="h-3 w-3 mr-1" aria-hidden="true" /> : <Link2Off className="h-3 w-3 mr-1" aria-hidden="true" />}
              {syncScroll ? "Sync Scroll" : "Free Scroll"}
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={copyMarkdown}
              className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
              aria-label={copied ? "Copied to clipboard" : "Copy markdown to clipboard"}
            >
              {copied ? <Check className="h-3 w-3 mr-1" aria-hidden="true" /> : <Copy className="h-3 w-3 mr-1" aria-hidden="true" />}
              {copied ? "Copied!" : "Copy"}
              <kbd className="ml-2 rounded border border-muted-foreground/30 bg-muted/20 px-1 text-[10px] opacity-60" aria-hidden="true">Ctrl+Shift+C</kbd>
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={downloadMarkdown}
              className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
              aria-label="Download markdown file"
            >
              <Download className="h-3 w-3 mr-1" aria-hidden="true" />Download
              <kbd className="ml-2 rounded border border-muted-foreground/30 bg-muted/20 px-1 text-[10px] opacity-60" aria-hidden="true">Ctrl+Shift+S</kbd>
            </Button>
            <div className="relative">
              <input 
                type="file" 
                accept=".md,.txt" 
                onChange={uploadMarkdown} 
                className="hidden" 
                id="upload-md"
                ref={fileInputRef}
                aria-label="Upload markdown file"
              />
              <Button 
                variant="outline" 
                size="sm" 
                asChild
                className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
              >
                <label htmlFor="upload-md" className="cursor-pointer flex items-center gap-1" role="button" aria-label="Upload markdown file">
                  <Upload className="h-3 w-3" aria-hidden="true" />Upload<kbd className="ml-1 rounded border border-muted-foreground/30 bg-muted/20 px-1 text-[10px] opacity-60" aria-hidden="true">Ctrl+Shift+O</kbd>
                </label>
              </Button>
            </div>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2 flex-1 min-h-0">
          {/* Left card — Editor */}
          <div className="flex flex-col overflow-hidden rounded-xl border border-border bg-card" role="region" aria-labelledby="editor-panel-label">
            <div className="sr-only" id="editor-panel-label">Markdown Editor</div>
            {/* Toolbar */}
            <div 
              className="shrink-0 flex flex-wrap items-center gap-1 p-2 border-b border-border bg-muted/30"
              role="toolbar"
              aria-label="Formatting tools"
            >
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => { undo(); announceToScreenReader("Undo") }}
                disabled={historyIndex <= 0} 
                title="Undo (Ctrl+Z)"
                className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                aria-label="Undo"
                aria-disabled={historyIndex <= 0}
              >
                <Undo className="h-3 w-3" aria-hidden="true" />
              </Button>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => { redo(); announceToScreenReader("Redo") }}
                disabled={historyIndex >= history.length - 1} 
                title="Redo (Ctrl+Y)"
                className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                aria-label="Redo"
                aria-disabled={historyIndex >= history.length - 1}
              >
                <Redo className="h-3 w-3" aria-hidden="true" />
              </Button>
              <div className="h-4 w-px bg-border mx-1" aria-hidden="true" />
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => { insertText("**", "**"); announceToScreenReader("Bold applied") }}
                title="Bold (Ctrl+Shift+B)"
                className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                aria-label="Bold"
              >
                <Bold className="h-3 w-3" aria-hidden="true" />
                <kbd className="sr-only">Ctrl+Shift+B</kbd>
              </Button>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => { insertText("*", "*"); announceToScreenReader("Italic applied") }}
                title="Italic (Ctrl+Shift+I)"
                className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                aria-label="Italic"
              >
                <Italic className="h-3 w-3" aria-hidden="true" />
                <kbd className="sr-only">Ctrl+Shift+I</kbd>
              </Button>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => { insertText("~~", "~~"); announceToScreenReader("Strikethrough applied") }}
                title="Strikethrough"
                className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                aria-label="Strikethrough"
              >
                <Strikethrough className="h-3 w-3" aria-hidden="true" />
              </Button>
              <div className="h-4 w-px bg-border mx-1" aria-hidden="true" />
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => { insertText("# ", ""); announceToScreenReader("Heading added") }}
                title="Heading"
                className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                aria-label="Add heading"
              >
                <Hash className="h-3 w-3" aria-hidden="true" />
              </Button>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => { insertText("`", "`"); announceToScreenReader("Inline code added") }}
                title="Inline code"
                className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                aria-label="Add inline code"
              >
                <Quote className="h-3 w-3" aria-hidden="true" />
              </Button>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => { insertText("> ", ""); announceToScreenReader("Blockquote added") }}
                title="Quote"
                className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                aria-label="Add blockquote"
              >
                <Code className="h-3 w-3" aria-hidden="true" />
              </Button>
              <div className="h-4 w-px bg-border mx-1" aria-hidden="true" />
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => { insertText("- ", ""); announceToScreenReader("Unordered list added") }}
                title="Unordered list"
                className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                aria-label="Add unordered list"
              >
                <List className="h-3 w-3" aria-hidden="true" />
              </Button>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => { insertText("1. ", ""); announceToScreenReader("Ordered list added") }}
                title="Ordered list"
                className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                aria-label="Add ordered list"
              >
                <ListOrdered className="h-3 w-3" aria-hidden="true" />
              </Button>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => { insertText("[", "](url)"); announceToScreenReader("Link template added") }}
                title="Link"
                className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                aria-label="Add link"
              >
                <Link className="h-3 w-3" aria-hidden="true" />
              </Button>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => { insertText("![", "](url)"); announceToScreenReader("Image template added") }}
                title="Image"
                className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                aria-label="Add image"
              >
                <Image className="h-3 w-3" aria-hidden="true" />
              </Button>
            </div>
            {/* Editor */}
            <div className="flex-1 min-h-0" role="textbox" aria-label="Markdown editor">
              <Textarea
                ref={editorRef}
                value={markdown}
                onChange={(e) => { setMarkdownWithHistory(e.target.value); announceToScreenReader("Editor content updated") }}
                placeholder="Write your markdown here..."
                className="w-full h-full resize-none border-0 rounded-none focus-visible:ring-0 font-mono text-sm p-4"
                aria-label="Markdown editor input"
              />
            </div>
          </div>

          {/* Right card — Preview */}
          <div className="flex flex-col overflow-hidden rounded-xl border border-border bg-card" role="region" aria-labelledby="preview-panel-label">
            <div className="shrink-0 border-b border-border px-4 py-3 bg-muted/30">
              <span className="text-sm font-medium" id="preview-panel-label">Preview</span>
            </div>
            <div
              ref={previewRef}
              className="flex-1 overflow-y-auto p-4 prose prose-sm max-w-none dark:prose-invert"
              dangerouslySetInnerHTML={{ __html: html }}
              role="document"
              aria-label="Markdown preview"
            />
          </div>
        </div>
      </div>
    </>
  )
}