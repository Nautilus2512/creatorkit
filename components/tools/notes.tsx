"use client"

import { useState, useEffect, useCallback } from "react"
import { Plus, Trash2, Save } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { ShortcutsModal } from "@/components/shortcuts-modal"

interface Note {
  id: string
  title: string
  content: string
  updatedAt: number
}

const KEY = "creatorkit-notes"

function load(): Note[] {
  if (typeof window === "undefined") return []
  try { return JSON.parse(localStorage.getItem(KEY) || "[]") } catch { return [] }
}

function save(notes: Note[]) {
  localStorage.setItem(KEY, JSON.stringify(notes))
}

function fmtDate(ts: number) {
  return new Date(ts).toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })
}

export default function Notes() {
  const [notes, setNotes] = useState<Note[]>([])
  const [activeId, setActiveId] = useState<string | null>(null)
  const [title, setTitle] = useState("")
  const [content, setContent] = useState("")
  const [unsaved, setUnsaved] = useState(false)
  const [announcement, setAnnouncement] = useState("")

  const announceToScreenReader = useCallback((message: string) => {
    setAnnouncement(message)
    setTimeout(() => setAnnouncement(""), 1000)
  }, [])

  useEffect(() => {
    const loaded = load()
    setNotes(loaded)
    if (loaded.length > 0) {
      setActiveId(loaded[0].id)
      setTitle(loaded[0].title)
      setContent(loaded[0].content)
    }
  }, [])

  const commit = useCallback((id: string, t: string, c: string, ns: Note[]) => {
    const updated = ns.map(n => n.id === id ? { ...n, title: t, content: c, updatedAt: Date.now() } : n)
    setNotes(updated)
    save(updated)
    setUnsaved(false)
    return updated
  }, [])

  const newNote = useCallback(() => {
    if (unsaved && activeId) commit(activeId, title, content, notes)
    const note: Note = { id: crypto.randomUUID(), title: "Untitled", content: "", updatedAt: Date.now() }
    const updated = [note, ...notes]
    setNotes(updated)
    save(updated)
    setActiveId(note.id)
    setTitle(note.title)
    setContent("")
    setUnsaved(false)
    announceToScreenReader("New note created")
  }, [unsaved, activeId, commit, notes, announceToScreenReader])

  const selectNote = useCallback((note: Note) => {
    if (unsaved && activeId) commit(activeId, title, content, notes)
    setActiveId(note.id)
    setTitle(note.title)
    setContent(note.content)
    setUnsaved(false)
    announceToScreenReader(`Selected note: ${note.title || "Untitled"}`)
  }, [unsaved, activeId, commit, notes, announceToScreenReader])

  const manualSave = useCallback(() => {
    if (activeId) {
      commit(activeId, title, content, notes)
      announceToScreenReader("Note saved")
    }
  }, [activeId, commit, notes, title, content, announceToScreenReader])

  const deleteNote = useCallback((id: string) => {
    const updated = notes.filter(n => n.id !== id)
    setNotes(updated)
    save(updated)
    if (activeId === id) {
      if (updated.length > 0) {
        setActiveId(updated[0].id)
        setTitle(updated[0].title)
        setContent(updated[0].content)
      } else {
        setActiveId(null)
        setTitle("")
        setContent("")
      }
    }
    announceToScreenReader("Note deleted")
  }, [activeId, notes, announceToScreenReader])

  const clearAllNotes = useCallback(() => {
    if (!confirm(`Delete all ${notes.length} note${notes.length !== 1 ? "s" : ""}? This cannot be undone.`)) return
    setNotes([])
    save([])
    setActiveId(null)
    setTitle("")
    setContent("")
    setUnsaved(false)
    announceToScreenReader("All notes deleted")
  }, [notes.length, announceToScreenReader])

  const active = notes.find(n => n.id === activeId) || null
  const wordCount = content.trim().split(/\s+/).filter(Boolean).length

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'a') {
        e.preventDefault()
        newNote()
      }
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 's') {
        e.preventDefault()
        manualSave()
      }
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'd' && activeId) {
        e.preventDefault()
        deleteNote(activeId)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [newNote, manualSave, deleteNote, activeId])

  return (
    <>
      <div aria-live="polite" aria-atomic="true" className="sr-only">
        {announcement}
      </div>
      <div className="flex h-full flex-col">

        {/* Desktop: top action bar */}
        <div className="hidden md:flex shrink-0 items-center gap-2 border-b border-border bg-card/95 backdrop-blur-sm px-4 py-2">
          <span className="text-sm font-semibold shrink-0 mr-1">Notes</span>
          <div className="ml-auto flex items-center gap-1.5">
            <ShortcutsModal pageName="Notes" shortcuts={[
              { keys: ["Ctrl", "Shift", "A"], description: "Create new note" },
              { keys: ["Ctrl", "Shift", "S"], description: "Save current note" },
              { keys: ["Ctrl", "Shift", "D"], description: "Delete current note" },
            ]} />
            {unsaved && (
              <Button variant="outline" size="sm" onClick={manualSave} aria-label="Save note">
                <Save className="h-4 w-4 mr-1" aria-hidden="true" />Save
                <kbd className="ml-1 hidden md:inline rounded border border-border bg-muted px-1 text-[10px]" aria-hidden="true">Ctrl+Shift+S</kbd>
              </Button>
            )}
            {notes.length > 0 && (
              <Button variant="ghost" size="sm" onClick={clearAllNotes} aria-label="Clear all notes" className="text-muted-foreground hover:text-destructive">
                <Trash2 className="h-4 w-4 mr-1" aria-hidden="true" />Clear all
              </Button>
            )}
            <Button size="sm" onClick={newNote} aria-label="Create new note">
              <Plus className="h-4 w-4 mr-1" aria-hidden="true" />New Note
              <kbd className="ml-1 hidden md:inline rounded border border-border bg-muted px-1 text-[10px]" aria-hidden="true">Ctrl+Shift+A</kbd>
            </Button>
          </div>
        </div>

        {/* Mobile: compact header */}
        <div className="flex md:hidden shrink-0 items-center justify-between px-4 py-3 border-b border-border">
          <h2 className="text-base font-semibold">Notes</h2>
          <ShortcutsModal pageName="Notes" shortcuts={[
            { keys: ["Ctrl", "Shift", "A"], description: "Create new note" },
            { keys: ["Ctrl", "Shift", "S"], description: "Save" },
          ]} />
        </div>

        <div className="flex flex-col md:flex-row flex-1 min-h-0 overflow-hidden">
          {/* Sidebar */}
          <div className="shrink-0 flex flex-col overflow-hidden border-b md:border-b-0 md:border-r border-border bg-card md:w-56" role="region" aria-labelledby="notes-sidebar-label">
            <div className="shrink-0 border-b border-border px-4 py-3">
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider" id="notes-sidebar-label">{notes.length} Note{notes.length !== 1 ? "s" : ""}</span>
            </div>
            <div className="flex-1 overflow-y-auto" role="list" aria-label="Notes list">
              {notes.length === 0 ? (
                <div className="p-4 text-xs text-muted-foreground text-center" role="status">No notes yet</div>
              ) : (
                notes.map(note => (
                  <div 
                    key={note.id} 
                    onClick={() => selectNote(note)}
                    onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") selectNote(note) }}
                    role="listitem"
                    tabIndex={0}
                    aria-selected={activeId === note.id}
                    className={`px-4 py-3 border-b border-border/50 cursor-pointer group transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-inset ${activeId === note.id ? "bg-primary/5 border-l-2 border-l-primary pl-3.5" : "hover:bg-muted/30"}`}
                  >
                    <div className="flex items-start justify-between gap-1">
                      <p className="text-sm font-medium truncate flex-1">{note.title || "Untitled"}</p>
                      <button 
                        onClick={(e) => { e.stopPropagation(); deleteNote(note.id) }} 
                        className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-opacity shrink-0 mt-0.5 focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-destructive focus-visible:ring-offset-1"
                        aria-label={`Delete note: ${note.title || "Untitled"}`}
                      >
                        <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                      </button>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">{fmtDate(note.updatedAt)}</p>
                    <p className="text-xs text-muted-foreground truncate mt-0.5 opacity-70">{note.content.slice(0, 50) || "Empty"}</p>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Editor */}
          <div className="flex-1 flex flex-col overflow-hidden rounded-xl border border-border bg-card" role="region" aria-labelledby="editor-label">
            {activeId ? (
              <>
                <div className="shrink-0 border-b border-border px-4 py-3">
                  <Input 
                    value={title} 
                    onChange={(e) => { setTitle(e.target.value); setUnsaved(true); announceToScreenReader("Title updated") }} 
                    onBlur={manualSave} 
                    placeholder="Note title..." 
                    className="border-0 text-lg font-semibold px-0 focus-visible:ring-0 bg-transparent"
                    aria-label="Note title"
                  />
                </div>
                <Textarea 
                  value={content} 
                  onChange={(e) => { setContent(e.target.value); setUnsaved(true); announceToScreenReader("Content updated") }} 
                  onBlur={manualSave} 
                  placeholder="Start writing..." 
                  className="flex-1 resize-none border-0 rounded-none text-sm focus-visible:ring-0 leading-relaxed p-4"
                  aria-label="Note content"
                />
                <div className="shrink-0 border-t border-border bg-card/95 backdrop-blur-sm px-4 py-2 text-xs text-muted-foreground flex gap-4" role="status" aria-live="polite">
                  <span>Stored in localStorage</span>
                  <span>{wordCount} words · {content.length} chars</span>
                  {unsaved && <span className="text-yellow-600" role="alert">Unsaved changes</span>}
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center text-muted-foreground" role="status">
                <div className="text-center space-y-3">
                  <p className="text-sm">No note selected</p>
                  <Button 
                    onClick={newNote}
                    className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                    aria-label="Create your first note"
                  >
                    <Plus className="h-4 w-4 mr-1" aria-hidden="true" />Create your first note
                    <kbd className="ml-2 hidden md:inline rounded border border-muted-foreground/30 bg-muted/20 px-1 text-[10px] opacity-60" aria-hidden="true">Ctrl+Shift+A</kbd>
                  </Button>
                </div>
              </div>
            )}
            <span id="editor-label" className="sr-only">Note editor</span>
          </div>
        </div>

        {/* Mobile: bottom action bar */}
        <div
          className="flex md:hidden shrink-0 items-center gap-2 border-t border-border bg-card/95 px-3 py-2"
          style={{ paddingBottom: "max(0.5rem, env(safe-area-inset-bottom))" }}
        >
          {unsaved && (
            <Button variant="outline" size="sm" className="h-11 px-3" onClick={manualSave} aria-label="Save note">
              <Save className="h-4 w-4" aria-hidden="true" /><span className="ml-1 text-xs">Save</span>
            </Button>
          )}
          <div className="flex-1" />
          <Button size="sm" className="h-11 px-4" onClick={newNote} aria-label="Create new note">
            <Plus className="h-4 w-4 mr-1.5" aria-hidden="true" />New Note
          </Button>
        </div>

      </div>
    </>
  )
}
