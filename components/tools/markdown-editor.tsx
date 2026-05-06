"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import { 
  FileText, Eye, EyeOff, Download, Upload, Copy, Check, 
  Bold, Italic, Link, Image, Code, List, ListOrdered, 
  Quote, Hash, Strikethrough, Table, Moon, Sun
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
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
  html = html.replace(/```[\s\S]*?```/g, '<pre class="bg-gray-100 dark:bg-gray-800 p-3 rounded-lg overflow-x-auto"><code>$1</code></pre>')
  
  // Inline code
  html = html.replace(/`(.+?)`/g, '<code class="bg-gray-100 dark:bg-gray-800 px-1 py-0.5 rounded text-sm">$1</code>')
  
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
  
  return html
}

export function MarkdownEditor() {
  const [markdown, setMarkdown] = useState(`# Welcome to Markdown Editor

## Features
- **Live preview** with instant rendering
- *Syntax highlighting* support
- ~~Strikethrough~~ text
- \`Inline code\` examples

## Code Example
\`\`\`javascript
function hello() {
  console.log("Hello, World!");
}
\`\`\`

## Links and Images
[Visit GitHub](https://github.com)

> This is a blockquote example
> Perfect for highlighting important content

## Lists
1. First item
2. Second item
3. Third item

* Unordered list item
* Another item
* Last item`)
  
  const [showPreview, setShowPreview] = useState(true)
  const [copied, setCopied] = useState(false)
  const editorRef = useRef<HTMLTextAreaElement>(null)
  const previewRef = useRef<HTMLDivElement>(null)
  
  const html = parseMarkdown(markdown)

  const insertText = (before: string, after: string = "") => {
    const textarea = editorRef.current
    if (!textarea) return
    
    const start = textarea.selectionStart
    const end = textarea.selectionEnd
    const selectedText = markdown.substring(start, end)
    const newText = before + selectedText + after
    
    const newMarkdown = markdown.substring(0, start) + newText + markdown.substring(end)
    setMarkdown(newMarkdown)
    
    // Restore cursor position
    setTimeout(() => {
      textarea.focus()
      textarea.setSelectionRange(start + before.length, start + before.length + selectedText.length)
    }, 0)
  }

  const copyMarkdown = async () => {
    await navigator.clipboard.writeText(markdown)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const downloadMarkdown = () => {
    const blob = new Blob([markdown], { type: 'text/markdown' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = 'document.md'
    a.click()
    URL.revokeObjectURL(url)
  }

  const uploadMarkdown = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    
    const reader = new FileReader()
    reader.onload = (event) => {
      const content = event.target?.result as string
      setMarkdown(content)
    }
    reader.readAsText(file)
  }

  // Scroll sync
  const syncScroll = useCallback(() => {
    if (!editorRef.current || !previewRef.current || !showPreview) return
    
    const editor = editorRef.current
    const preview = previewRef.current
    const scrollRatio = editor.scrollTop / (editor.scrollHeight - editor.clientHeight)
    
    preview.scrollTop = scrollRatio * (preview.scrollHeight - preview.clientHeight)
  }, [showPreview])

  useEffect(() => {
    const editor = editorRef.current
    if (editor) {
      editor.addEventListener('scroll', syncScroll)
      return () => editor.removeEventListener('scroll', syncScroll)
    }
  }, [syncScroll])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault()
        downloadMarkdown()
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'c' && e.shiftKey) {
        e.preventDefault()
        copyMarkdown()
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'p') {
        e.preventDefault()
        setShowPreview(!showPreview)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [markdown, showPreview])

  return (
    <div className="flex flex-col h-[calc(100vh-80px)]">
      <ShortcutsModal
        pageName="Markdown Editor"
        shortcuts={[
          { keys: ["Ctrl", "S"], description: "Download markdown" },
          { keys: ["Ctrl", "Shift", "C"], description: "Copy markdown" },
          { keys: ["Ctrl", "P"], description: "Toggle preview" },
          { keys: ["Ctrl", "B"], description: "Bold text" },
          { keys: ["Ctrl", "I"], description: "Italic text" },
          { keys: ["?"], description: "Toggle this panel" },
        ]}
      />

      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border">
        <div className="flex items-center gap-2">
          <div className="rounded-lg border border-border bg-muted/50 p-2">
            <FileText className="h-4 w-4 text-primary" />
          </div>
          <div>
            <h1 className="text-base font-semibold">Markdown Editor</h1>
            <p className="text-xs text-muted-foreground">Write and preview markdown with live rendering</p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setShowPreview(!showPreview)}>
            {showPreview ? <EyeOff className="h-3 w-3 mr-1" /> : <Eye className="h-3 w-3 mr-1" />}
            {showPreview ? 'Hide' : 'Show'} Preview
          </Button>
          
          <div className="h-4 w-px bg-border" />
          
          <Button variant="outline" size="sm" onClick={copyMarkdown}>
            {copied ? <Check className="h-3 w-3 mr-1" /> : <Copy className="h-3 w-3 mr-1" />}
            {copied ? 'Copied!' : 'Copy'}
          </Button>
          
          <Button variant="outline" size="sm" onClick={downloadMarkdown}>
            <Download className="h-3 w-3 mr-1" />
            Download
          </Button>
          
          <div className="relative">
            <input
              type="file"
              accept=".md,.txt"
              onChange={uploadMarkdown}
              className="hidden"
              id="upload-md"
            />
            <Button variant="outline" size="sm" asChild>
              <label htmlFor="upload-md" className="cursor-pointer flex items-center gap-1">
                <Upload className="h-3 w-3" />
                Upload
              </label>
            </Button>
          </div>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-1 p-2 border-b border-border bg-muted/30">
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="sm" onClick={() => insertText('**', '**')} title="Bold (Ctrl+B)">
            <Bold className="h-3 w-3" />
          </Button>
          <Button variant="ghost" size="sm" onClick={() => insertText('*', '*')} title="Italic (Ctrl+I)">
            <Italic className="h-3 w-3" />
          </Button>
          <Button variant="ghost" size="sm" onClick={() => insertText('~~', '~~')} title="Strikethrough">
            <Strikethrough className="h-3 w-3" />
          </Button>
          <div className="h-4 w-px bg-border mx-1" />
          <Button variant="ghost" size="sm" onClick={() => insertText('# ', '')} title="Heading">
            <Hash className="h-3 w-3" />
          </Button>
          <Button variant="ghost" size="sm" onClick={() => insertText('> ', '')} title="Quote">
            <Quote className="h-3 w-3" />
          </Button>
          <Button variant="ghost" size="sm" onClick={() => insertText('`', '`')} title="Inline code">
            <Code className="h-3 w-3" />
          </Button>
          <div className="h-4 w-px bg-border mx-1" />
          <Button variant="ghost" size="sm" onClick={() => insertText('- ', '')} title="Unordered list">
            <List className="h-3 w-3" />
          </Button>
          <Button variant="ghost" size="sm" onClick={() => insertText('1. ', '')} title="Ordered list">
            <ListOrdered className="h-3 w-3" />
          </Button>
          <Button variant="ghost" size="sm" onClick={() => insertText('[', '](url)')} title="Link">
            <Link className="h-3 w-3" />
          </Button>
          <Button variant="ghost" size="sm" onClick={() => insertText('![', '](url)')} title="Image">
            <Image className="h-3 w-3" />
          </Button>
        </div>
      </div>

      {/* Two Column Layout */}
      <div className="flex-1 flex">
        {/* Editor Column */}
        <div className={`${showPreview ? 'w-1/2' : 'w-full'} border-r border-border`}>
          <Textarea
            ref={editorRef}
            value={markdown}
            onChange={(e) => setMarkdown(e.target.value)}
            placeholder="Write your markdown here..."
            className="h-full resize-none border-0 rounded-none focus:ring-0 font-mono text-sm p-4"
          />
        </div>

        {/* Preview Column */}
        {showPreview && (
          <div className="w-1/2 overflow-y-auto p-4 bg-background prose prose-sm max-w-none">
            <div 
              ref={previewRef}
              dangerouslySetInnerHTML={{ __html: html }}
            />
          </div>
        )}
      </div>
    </div>
  )
}