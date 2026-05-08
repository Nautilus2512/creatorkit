"use client"

import { useState, useEffect } from "react"
import { Plus, Trash2, Save } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"

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

  useEffect(() => {
    const loaded = load()
    setNotes(loaded)
    if (loaded.length > 0) {
      setActiveId(loaded[0].id)
      setTitle(loaded[0].title)
      setContent(loaded[0].content)
    }
  }, [])

  const commit = (id: string, t: string, c: string, ns: Note[]) => {
    const updated = ns.map(n => n.id === id ? { ...n, title: t, content: c, updatedAt: Date.now() } : n)
    setNotes(updated)
    save(updated)
    setUnsaved(false)
    return updated
  }

  const newNote = () => {
    if (unsaved && activeId) commit(activeId, title, content, notes)
    const note: Note = { id: crypto.randomUUID(), title: "Untitled", content: "", updatedAt: Date.now() }
    const updated = [note, ...notes]
    setNotes(updated)
    save(updated)
    setActiveId(note.id)
    setTitle(note.title)
    setContent("")
    setUnsaved(false)
  }

  const selectNote = (note: Note) => {
    if (unsaved && activeId) commit(activeId, title, content, notes)
    setActiveId(note.id)
    setTitle(note.title)
    setContent(note.content)
    setUnsaved(false)
  }

  const manualSave = () => {
    if (activeId) commit(activeId, title, content, notes)
  }

  const deleteNote = (id: string) => {
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
  }

  const active = notes.find(n => n.id === activeId) || null
  const wordCount = content.trim().split(/\s+/).filter(Boolean).length

  return (
    <div className="flex h-full flex-col gap-3 p-4">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">Notes</h2>
          <p className="text-muted-foreground">Quick notes saved to your browser's localStorage.</p>
        </div>
        <div className="flex items-center gap-2">
          {unsaved && <Button variant="outline" size="sm" onClick={manualSave}><Save className="h-4 w-4 mr-1" />Save</Button>}
          <Button size="sm" onClick={newNote}><Plus className="h-4 w-4 mr-1" />New Note</Button>
        </div>
      </div>

      <div className="flex gap-4 flex-1 min-h-0">
        {/* Sidebar */}
        <div className="shrink-0 flex flex-col overflow-hidden rounded-xl border border-border bg-card w-56">
          <div className="shrink-0 border-b border-border px-4 py-3">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{notes.length} Note{notes.length !== 1 ? "s" : ""}</span>
          </div>
          <div className="flex-1 overflow-y-auto">
            {notes.length === 0 ? (
              <div className="p-4 text-xs text-muted-foreground text-center">No notes yet</div>
            ) : (
              notes.map(note => (
                <div key={note.id} onClick={() => selectNote(note)}
                  className={`px-4 py-3 border-b border-border/50 cursor-pointer group transition-colors ${activeId === note.id ? "bg-primary/5 border-l-2 border-l-primary pl-3.5" : "hover:bg-muted/30"}`}
                >
                  <div className="flex items-start justify-between gap-1">
                    <p className="text-sm font-medium truncate flex-1">{note.title || "Untitled"}</p>
                    <button onClick={(e) => { e.stopPropagation(); deleteNote(note.id) }} className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-opacity shrink-0 mt-0.5">
                      <Trash2 className="h-3.5 w-3.5" />
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
        <div className="flex-1 flex flex-col overflow-hidden rounded-xl border border-border bg-card">
          {activeId ? (
            <>
              <div className="shrink-0 border-b border-border px-4 py-3">
                <Input value={title} onChange={(e) => { setTitle(e.target.value); setUnsaved(true) }} onBlur={manualSave} placeholder="Note title..." className="border-0 text-lg font-semibold px-0 focus-visible:ring-0 bg-transparent" />
              </div>
              <Textarea value={content} onChange={(e) => { setContent(e.target.value); setUnsaved(true) }} onBlur={manualSave} placeholder="Start writing..." className="flex-1 resize-none border-0 rounded-none text-sm focus-visible:ring-0 leading-relaxed p-4" />
              <div className="shrink-0 border-t border-border bg-card/95 backdrop-blur-sm px-4 py-2 text-xs text-muted-foreground flex gap-4">
                <span>Stored in localStorage</span>
                <span>{wordCount} words · {content.length} chars</span>
                {unsaved && <span className="text-yellow-600">Unsaved changes</span>}
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-muted-foreground">
              <div className="text-center space-y-3">
                <p className="text-sm">No note selected</p>
                <Button onClick={newNote}><Plus className="h-4 w-4 mr-1" />Create your first note</Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
