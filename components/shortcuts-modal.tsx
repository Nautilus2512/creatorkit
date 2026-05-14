"use client"

import { useEffect, useState } from "react"
import { X, Keyboard } from "lucide-react"

export type ShortcutItem = {
  keys: string[]
  description: string
}

export type ShortcutsModalProps = {
  pageName: string
  shortcuts: ShortcutItem[]
}

// Module-level flag: when the first handler fires for a given keypress,
// it sets this true so any other mounted instance skips that same keypress.
let _keyHandled = false

export function ShortcutsModal({ pageName, shortcuts }: ShortcutsModalProps) {
  const [open, setOpen] = useState(false)

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const tag = (document.activeElement as HTMLElement)?.tagName
      if (e.key === "?" && !e.ctrlKey && !e.metaKey && tag !== "INPUT" && tag !== "TEXTAREA") {
        if (_keyHandled) return
        _keyHandled = true
        setTimeout(() => { _keyHandled = false }, 0)
        e.preventDefault()
        setOpen(prev => !prev)
      }
      if (e.key === "Escape") setOpen(false)
    }
    window.addEventListener("keydown", handler)
    return () => window.removeEventListener("keydown", handler)
  }, [])

  return (
    <>
      {/* Inline button — renders wherever placed in the action bar */}
      <button
        type="button"
        onClick={() => setOpen(prev => !prev)}
        aria-label="Show keyboard shortcuts"
        aria-haspopup="dialog"
        aria-expanded={open}
        className="inline-flex items-center gap-1.5 rounded-md border border-border bg-transparent px-2.5 py-1.5 text-xs text-muted-foreground transition-colors hover:border-primary/50 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
      >
        <Keyboard className="h-3.5 w-3.5" aria-hidden="true" />
        <kbd className="rounded border border-border bg-muted px-1 text-[10px]" aria-hidden="true">?</kbd>
      </button>

      {/* Modal overlay */}
      {open && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-end p-5 sm:items-center sm:justify-center"
          role="dialog"
          aria-modal="true"
          aria-label={`Keyboard shortcuts for ${pageName}`}
        >
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => setOpen(false)}
            aria-hidden="true"
          />

          {/* Modal */}
          <div className="relative w-full max-w-sm rounded-xl border border-border bg-background shadow-xl">
            <div className="flex items-center justify-between border-b border-border px-4 py-3">
              <div>
                <p className="text-sm font-semibold">Keyboard Shortcuts</p>
                <p className="text-xs text-muted-foreground">{pageName}</p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-md p-1 hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                aria-label="Close shortcuts panel"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>

            <div className="divide-y divide-border max-h-[60vh] overflow-y-auto">
              {shortcuts.map((shortcut, i) => (
                <div key={i} className="flex items-center justify-between px-4 py-2.5">
                  <span className="text-sm text-muted-foreground">{shortcut.description}</span>
                  <div className="flex items-center gap-1">
                    {shortcut.keys.map((key, j) => (
                      <span key={j} className="flex items-center gap-1">
                        <kbd className="rounded border border-border bg-muted px-1.5 py-0.5 text-xs font-medium">{key}</kbd>
                        {j < shortcut.keys.length - 1 && <span className="text-xs text-muted-foreground">+</span>}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <div className="border-t border-border px-4 py-2.5">
              <p className="text-xs text-muted-foreground">Press <kbd className="rounded border border-border bg-muted px-1 text-[10px]">?</kbd> or <kbd className="rounded border border-border bg-muted px-1 text-[10px]">Esc</kbd> to close</p>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
