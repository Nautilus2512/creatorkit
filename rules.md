# CreatorKit — Standards & Rules

This document is the single source of truth for all design, code, accessibility, and UX standards. Every tool must follow these rules. When in doubt, check here first.

---

## 1. Core Principles

### Privacy-first
- Every tool runs **100% in the browser**. No data is ever sent to a server.
- No user input, files, or output may leave the client.
- localStorage is allowed for persistence (notes, flashcards, settings).
- When describing a tool to the user, always include: "Everything runs in your browser. Nothing is sent to a server."
- No ads. No tracking beyond Vercel Analytics (anonymised, no personal data).

### Client-side only
- No backend routes, no API calls that carry user content.
- All libraries must run in-browser. WASM (e.g. ffmpeg.wasm) is allowed but must load lazily.
- Budget is $0 — all libraries must be free and open source.

### Simplicity
- One tool, one job. Do not add features not asked for.
- No half-finished implementations. If a feature cannot be completed, do not add it.
- No backwards-compatibility shims or commented-out code.

---

## 2. Tech Stack

| Item | Value |
|------|-------|
| Framework | Next.js 16 (App Router) |
| Language | TypeScript |
| Styling | Tailwind CSS v4 |
| Components | shadcn/ui |
| Icons | lucide-react |
| Package manager | pnpm (never npm) |
| Hosting | Vercel (free tier) |

---

## 3. Desktop Layout (Horizontal Screen)

### Outer wrapper
```tsx
<div className="flex flex-1 flex-col min-h-0">
```
This is the root of every tool component. It fills the available height without overflow.

### Top action bar (desktop only)
```tsx
<div className="hidden md:flex shrink-0 items-center gap-2 border-b border-border bg-card/95 backdrop-blur-sm px-4 py-2">
```
- Always `shrink-0` so it never collapses.
- Tool name: `<span className="text-sm font-semibold shrink-0 mr-1">Tool Name</span>`
- Primary action button is always at the far right: `<div className="ml-auto flex items-center gap-1.5">`
- `ShortcutsModal` always lives inside `ml-auto` div.
- Mode/toggle buttons go between the name and the passphrase/controls.

### Scrollable content area
```tsx
<div className="flex-1 overflow-y-auto p-4 space-y-4">
```
All panels and the usage guide live inside this scrollable wrapper.

### Panels card (when tool has two panels)
```tsx
<div className="flex flex-col md:flex-row min-h-[500px] rounded-xl border border-border overflow-hidden">
```
- Left panel divider: `md:border-r border-border`
- Panels fill the card; no extra outer borders needed.
- Panel header label: `<div className="shrink-0 border-b border-border px-4 py-3">`

### Usage guide card (always at the bottom)
```tsx
<div className="rounded-xl border border-border bg-card p-4 space-y-4">
```
- Always placed after the panels, inside the scrollable content area.
- Section heading: `<p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">`
- Body text: `<p className="text-xs text-muted-foreground leading-relaxed">`
- Highlighted terms: `<span className="text-foreground font-medium">term</span>`
- Inline kbd in guide: `<kbd className="rounded border border-border bg-muted px-1 text-[10px]">Ctrl+Enter</kbd>`
- Ordered steps use `<ol className="space-y-1.5 text-xs text-muted-foreground list-decimal list-inside">`
- Tips/notes use `<ul className="space-y-1 text-xs text-muted-foreground list-disc list-inside">`
- **No em dashes (—) anywhere in guide text.** Use periods or commas for flowing sentences.

### kbd labels on buttons (desktop)
- Always `hidden md:inline` so they only show on desktop.
- On `variant="outline"` or `variant="ghost"` buttons: `rounded border border-border bg-muted px-1 text-[10px]`
- On `variant="default"` (dark/primary background) buttons: `rounded border border-primary-foreground/30 bg-primary-foreground/20 px-1 text-[10px]`
- When a button toggles between default and outline, the kbd class must be **conditional** to avoid the blackout bug:
```tsx
<kbd className={`ml-1 hidden md:inline rounded border px-1 text-[10px] ${
  isActive
    ? "border-primary-foreground/30 bg-primary-foreground/20"
    : "border-border bg-muted"
}`}>Ctrl+Shift+X</kbd>
```

---

## 4. Mobile Layout (Vertical Screen)

### Compact header (mobile only)
```tsx
<div className="flex md:hidden flex-col shrink-0 border-b border-border">
```
Always **two rows**:
- **Row 1**: Tool title on the left, action icons on the right.
```tsx
<div className="flex items-center justify-between px-4 pt-3 pb-2">
  <h2 className="text-base font-semibold">Tool Name</h2>
  <div className="flex items-center gap-1.5">
    {/* icon buttons + ShortcutsModal */}
  </div>
</div>
```
- **Row 2** (conditional): Secondary info such as stats, shown only when data exists.
```tsx
{hasData && (
  <div className="flex items-center gap-3 px-4 pb-2 text-xs">
    {/* stats */}
  </div>
)}
```
Never put title + stats + icons all in one row — it becomes too crowded on narrow screens.

### Tab switcher (mobile, for two-panel tools)
```tsx
<div className="flex" role="tablist" aria-label="Panel selection">
  <button role="tab" aria-selected={activeTab === "input"}
    className={`flex-1 py-2.5 text-sm font-medium border-b-2 transition-colors
      ${activeTab === "input" ? "border-primary text-foreground" : "border-transparent text-muted-foreground"}`}>
    Input
  </button>
  <button role="tab" aria-selected={activeTab === "output"} ...>
    Output
  </button>
</div>
```
- Active tab uses `border-b-2 border-primary`.
- Automatically switch to output tab after a primary action completes.

### Panel visibility (mobile tab switching)
```tsx
<div className={`${activeTab === "input" ? "flex" : "hidden"} md:flex flex-col flex-1 ...`}>
```
Both panels are always `md:flex` (always shown on desktop). On mobile, one is hidden based on the active tab.

### Bottom action bar (mobile, sticky)
```tsx
<div
  className="md:hidden fixed bottom-0 left-0 right-0 flex items-center gap-1.5 border-t border-border bg-card/95 backdrop-blur-sm px-3 py-2 z-20"
  style={{ paddingBottom: "max(0.5rem, env(safe-area-inset-bottom))" }}
>
```
- Always `fixed` to the bottom of the viewport.
- `z-20` to stay above all content.
- `env(safe-area-inset-bottom)` handles iPhone notch/home indicator.
- Touch targets must be at minimum **44px tall**: `h-11`.
- For study/review mode tools (like Anki), the bottom bar is conditional — only shown when in that mode.

### Spacer for fixed footer
Place this inside the scrollable content area so the footer does not cover the last line:
```tsx
<div className="md:hidden h-[60px]" aria-hidden="true" />
```

### No kbd labels on mobile
All `<kbd>` labels on buttons must use `hidden md:inline` so they never appear on mobile where space is tight.

### Mobile icon buttons (header)
```tsx
<button
  className="rounded p-1.5 text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
  aria-label="Descriptive label"
>
  <Icon className="h-4 w-4" aria-hidden="true" />
</button>
```
Use `p-1.5` for comfortable tap area. Always include `aria-label`.

---

## 5. Keyboard Shortcuts

### Rule: always use Ctrl+Shift+ modifiers
Plain `Ctrl+` shortcuts conflict with browser defaults. All tool shortcuts must use `Ctrl+Shift+` or `Ctrl+Enter`.

### Safe Ctrl+Shift letters (confirmed across all major browsers)

| Letter | Status | Notes |
|--------|--------|-------|
| V | ✅ Safe | Use for copy, add |
| X | ✅ Safe | Use for new, clear, swap |
| E | ⚠️ Acceptable | Edge search sidebar only |
| L | ⚠️ Acceptable | Edge reading list only |
| S | ⚠️ Acceptable | Edge Save As in some versions |
| Y | ⚠️ Acceptable | Firefox downloads only |
| Z | ⚠️ Acceptable | Redo in text fields only; safe at page level |
| F | ⚠️ Acceptable | Firefox fullscreen only |
| U | ⚠️ Acceptable | Firefox view source only |
| P | ⚠️ Acceptable | Firefox private window only |

### Hard conflicts — never use these
`A`, `B`, `C`, `D`, `G`, `I`, `J`, `K`, `M`, `N`, `O`, `R`, `T`, `W`

### Always-safe patterns
- `Ctrl+Enter` — primary action (encrypt, submit, add)
- `Ctrl+Shift+Enter` — secondary submit (add card in form)
- `Space` / `1` `2` `3` `4` / `Enter` — scoped to a focused tool panel (e.g. study mode), never global

### ShortcutsModal
Every tool must include a `ShortcutsModal`. It lives in:
- The desktop top action bar inside `ml-auto`
- The mobile compact header row 1 alongside icon buttons

Toggle key: `?` (handled by ShortcutsModal internally).

The `?` handler uses a module-level `_keyHandled` flag to prevent double-firing when multiple instances are mounted.

### ShortcutsModal uses createPortal
The modal renders via `createPortal(modal, document.body)` to escape ancestor `backdrop-filter` containing blocks that would trap `position: fixed` modals off-screen.

---

## 6. Accessibility

Every tool must include all of the following.

### Screen reader announcements
```tsx
// Option A — React state (preferred for components with many announcements)
const [announcement, setAnnouncement] = useState("")
const announceToScreenReader = useCallback((msg: string) => {
  setAnnouncement(msg)
  setTimeout(() => setAnnouncement(""), 1000)
}, [])
// In JSX:
<div aria-live="polite" aria-atomic="true" className="sr-only">{announcement}</div>

// Option B — DOM injection (for simple tools)
function announceToScreenReader(message: string) {
  const el = document.createElement("div")
  el.setAttribute("role", "status")
  el.setAttribute("aria-live", "polite")
  el.setAttribute("aria-atomic", "true")
  el.className = "sr-only"
  el.textContent = message
  document.body.appendChild(el)
  setTimeout(() => document.body.removeChild(el), 1000)
}
```

### Required aria attributes
- All buttons: `aria-label="Descriptive action"`
- Toggle buttons: `aria-pressed={isActive}`
- All icons: `aria-hidden="true"` (they are decorative)
- Tab panels: `role="tablist"`, `role="tab"`, `aria-selected`
- Form groups: `role="group"` with `aria-label`
- Radio groups: `role="radiogroup"` with `aria-checked` on items
- Regions: `role="region"` with `aria-labelledby` pointing to a heading
- Alerts/errors: `role="alert"` with `aria-live="assertive"`
- Progress: `role="progressbar"` with `aria-valuenow`, `aria-valuemin`, `aria-valuemax`
- Lists: `role="list"` / `role="listitem"` when using `<div>` instead of `<ul>`

### Focus states
Every interactive element must have a visible focus ring:
```tsx
className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
```
For inset rings (inside panels): `focus-visible:ring-inset`

### Keyboard navigation
- Tab/Shift+Tab must move logically through all interactive elements.
- Arrow keys for navigating within a group (deck list, radio group).
- Enter or Space to activate a focused button.
- Escape to cancel, close, or return to a previous state.

---

## 7. Component Patterns

### Loading state on primary button
```tsx
{loading
  ? <><span className="mr-1 h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent inline-block" aria-hidden="true" />Working…</>
  : <>Action Label <kbd className="...">Ctrl+Enter</kbd></>
}
```

### Destructive / clear actions
- Color: `text-muted-foreground hover:text-destructive`
- Always show a `confirm()` dialog before deleting data.
- Describe exactly what will be deleted: `"Delete all 3 decks (12 cards) and study history? This cannot be undone."`

### localStorage persistence
```tsx
const KEY = "creatorkit-tool-name"
function load() {
  try { return JSON.parse(localStorage.getItem(KEY) || "[]") } catch { return [] }
}
function save(data: unknown) {
  try { localStorage.setItem(KEY, JSON.stringify(data)) } catch {}
}
```
Always wrap in try/catch. Always use the prefix `creatorkit-` in storage keys.

### Keyboard event handler pattern
```tsx
const handleKeyDown = useCallback((e: KeyboardEvent) => {
  // Skip shortcuts when typing in inputs/textareas, except Ctrl+Enter
  if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
    if (!(e.ctrlKey || e.metaKey)) return
  }
  if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === "X") {
    e.preventDefault()
    // action
  }
}, [deps])

useEffect(() => {
  window.addEventListener("keydown", handleKeyDown)
  return () => window.removeEventListener("keydown", handleKeyDown)
}, [handleKeyDown])
```

---

## 8. Writing Standards

### Guide text rules
- **No em dashes (—)**. Replace with a period, comma, or rewrite the sentence.
- **No passive voice** where active is clearer.
- Highlight key terms with `<span className="text-foreground font-medium">term</span>`.
- Keep sentences short. One idea per sentence.
- End each section with practical tips the user can act on immediately.
- Always include a privacy note in the guide: "Everything runs in your browser. Nothing is sent to a server."

### Tool description (page metadata)
- No em dashes in `<p>` descriptions on tool pages.
- One sentence describing what the tool does, one sentence on key features.

### Changelog entries
- Format: `## vX.Y.Z — Month Year`
- List what changed, which files were affected, and whether the build passed.

---

## 9. Color & Status Conventions

| Meaning | Color token |
|---------|-------------|
| Active / selected | `text-primary`, `border-primary` |
| Muted / secondary text | `text-muted-foreground` |
| Overdue / error | `text-red-500`, `border-red-500/30`, `bg-red-500/10` |
| Due today / warning | `text-amber-500`, `border-amber-500/30`, `bg-amber-500/10` |
| Good / upcoming | `text-green-600`, `border-green-500/30`, `bg-green-500/10` |
| Hard / caution | `text-orange-600`, `border-orange-500/30`, `bg-orange-500/10` |
| Info / neutral | `text-blue-600`, `border-blue-500/30`, `bg-blue-500/10` |
| Destructive | `text-destructive`, `hover:text-destructive` |

---

## 10. File & Folder Conventions

- Tool components: `components/tools/tool-name.tsx`
- Tool page: `app/tools/tool-name/page.tsx`
- Shared components: `components/ui/` (shadcn) and `components/` (custom)
- Storage key prefix: `creatorkit-`
- All components are `"use client"` (no server components in tools)
- Default export for tool components, named export for shared components

---

## 11. Build & Deploy

- Package manager: **pnpm only**. Never run `npm install`.
- Always verify the build locally before pushing: `pnpm build`
- All 79+ pages must compile with zero errors.
- `typescript.ignoreBuildErrors` is currently `true` in next.config — do not rely on this; fix type errors when found.
- Push to `main` branch deploys automatically to Vercel.
- Do not force-push to `main`.

### CSP requirements for media tools
Any tool that creates a blob URL and plays it in an `<audio>` or `<video>` element requires `media-src 'self' blob:` in the CSP. Without this directive, browsers fall back to `default-src 'self'` which silently blocks blob URL playback — the player renders but shows `0:00 / 0:00` and refuses to load. This directive is already present in `next.config.mjs` and covers all media tools.

---

## 12. SSR / Hydration Safety

Tools that read from `localStorage` or use browser-only APIs must guard against server-side rendering mismatches using a `mounted` state:

```tsx
const [mounted, setMounted] = useState(false)
useEffect(() => { setMounted(true) }, [])
if (!mounted) return null
```

Return `null` until the component is mounted. This prevents hydration errors from state that only exists in the browser (localStorage, crypto, Date).

---

## 13. Modal / Portal Pattern

Any modal or overlay that is a descendant of an element with `backdrop-filter` (e.g. `backdrop-blur-sm` on the action bar) must use `createPortal` to render directly into `document.body`. Without this, `position: fixed` is trapped inside the ancestor's containing block and the modal appears off-screen or clipped.

```tsx
import { createPortal } from "react-dom"

{mounted && open && createPortal(
  <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true">
    {/* backdrop */}
    <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setOpen(false)} aria-hidden="true" />
    {/* modal content */}
    <div className="relative ...">...</div>
  </div>,
  document.body
)}
```

The `mounted` guard is required so `document.body` is only referenced client-side.

---

## 14. Tool Layout Types

There are three structural patterns used across all tools. Choose based on the tool's needs.

### Type A — Split panel (input / output)
Used by: AES Encryptor, URL Encoder, Base64 Encoder, Text Compare, etc.

- Desktop: two panels side by side, separated by `md:border-r`.
- Mobile: tab switcher (Input / Output tabs) with active tab visible, inactive tab hidden.
- Primary action in the top action bar or triggers auto-switching to output tab.

```
[Desktop action bar]
[Left panel: input] | [Right panel: output]
[Usage guide]
```

### Type B — Sidebar + content (list / editor)
Used by: Notes, Anki Flashcards, PDF Organizer, etc.

- Desktop: fixed-width sidebar on the left, main content on the right.
- Mobile: sidebar stacks above the content, or is hidden in favour of the content.
- Sidebar typically `md:w-56` or `md:w-64`.

```
[Desktop action bar]
[Sidebar list] | [Main content / editor]
[Usage guide]
```

### Type C — Single panel (full-width tool)
Used by: Whiteboard, Code Playground, Markdown Editor, etc.

- No panel split — the tool fills the full content area.
- May have a toolbar row inside the content area itself.
- No tab switcher needed on mobile.

```
[Desktop action bar]
[Full-width content area]
```

---

## 15. WASM / Heavy Library Loading

Libraries like `@ffmpeg/ffmpeg` must never be imported at module level. Load them lazily only when the user triggers an action (file upload, convert button):

```tsx
const ffmpegRef = useRef<FFmpeg | null>(null)

async function loadFfmpeg() {
  if (ffmpegRef.current) return ffmpegRef.current
  const { FFmpeg } = await import("@ffmpeg/ffmpeg")
  const { fetchFile, toBlobURL } = await import("@ffmpeg/util")
  const ff = new FFmpeg()
  await ff.load({ ... })
  ffmpegRef.current = ff
  return ff
}
```

Show a loading indicator while WASM initialises. Announce progress to screen readers via `announceToScreenReader`.

---

## 16. Stats & Streak Display

When a tool tracks session stats (study count, streak, totals), display them as follows.

**Desktop** — inline in the top action bar, between the tool name and the `ml-auto` controls:
```tsx
<span className="text-sm font-semibold shrink-0 mr-1">Tool Name</span>
{hasStats && (
  <div className="flex items-center gap-3 text-xs">
    <span className="text-amber-500 font-medium">{streak}d streak</span>
    <span className="text-muted-foreground">{total} total</span>
  </div>
)}
<div className="ml-auto ...">...</div>
```

**Mobile** — second row of the compact header (never in row 1 with the title and icons):
```tsx
{hasStats && (
  <div className="flex items-center gap-3 px-4 pb-2 text-xs" aria-label="Study stats">
    <span className="text-amber-500 font-medium">{streak}d streak</span>
    <span className="text-muted-foreground">{total} total reviewed</span>
  </div>
)}
```

---

## 17. Copy-to-Clipboard Pattern

```tsx
const [copied, setCopied] = useState(false)

const copy = useCallback(() => {
  if (!output) return
  navigator.clipboard.writeText(output)
  setCopied(true)
  announceToScreenReader("Copied to clipboard")
  setTimeout(() => setCopied(false), 2000)
}, [output])
```

Button appearance:
```tsx
<Button variant="ghost" size="sm" onClick={copy} disabled={!output} aria-label="Copy output to clipboard">
  {copied
    ? <><Check className="h-4 w-4 mr-1" aria-hidden="true" />Copied!</>
    : <><Copy className="h-4 w-4 mr-1" aria-hidden="true" />Copy<kbd className="ml-1 hidden md:inline rounded border border-border bg-muted px-1 text-[10px]" aria-hidden="true">Ctrl+Shift+V</kbd></>
  }
</Button>
```

Use `Ctrl+Shift+V` as the standard copy shortcut across all tools (not `Ctrl+Shift+C` which conflicts with DevTools Inspector in Chrome, Firefox, and Edge).

---

## 18. Error Display Pattern

Inline validation errors inside the output panel:
```tsx
{error ? (
  <div className="flex-1 p-4" role="alert" aria-live="assertive">
    <div className="rounded-lg border border-destructive/50 bg-destructive/5 p-4 text-sm text-destructive">
      {error}
    </div>
  </div>
) : (
  <Textarea readOnly value={output} ... />
)}
```

- Use `role="alert"` and `aria-live="assertive"` so screen readers announce the error immediately.
- Clear the error whenever the user changes input.
- Escape key should dismiss the error if nothing else uses Escape.

---

## 19. Badge / Status Chip Pattern

Small status counts on deck/list items:
```tsx
<Badge className="text-[10px] py-0 px-1.5" variant="secondary">{count}</Badge>
```

Color-coded status text (not badges):
```tsx
<span className={overdue ? "text-red-500 font-medium" : due ? "text-amber-500 font-medium" : "text-green-600"}>
  {overdue ? "Overdue" : due ? "Due today" : dateString}
</span>
```

---

## 20. Responsive Breakpoint Reference

| Breakpoint | Class prefix | When it applies |
|------------|-------------|-----------------|
| Mobile (default) | (no prefix) | Screens narrower than 768px |
| Desktop | `md:` | Screens 768px and wider |
| Large desktop | `lg:` | Screens 1024px and wider (used for 2-column grids) |

The primary responsive split is always at `md:`. Use `lg:` only for grid layouts where a third column or larger panel makes sense (e.g. the Anki left/right panels use `lg:grid-cols-2`).

**Common responsive pairs used throughout the codebase:**

| Mobile | Desktop |
|--------|---------|
| `flex md:hidden` | `hidden md:flex` |
| `border-b md:border-b-0 md:border-r` | Panel divider direction |
| `flex-col md:flex-row` | Stack vs side-by-side |
| `px-3 md:px-4` | Tighter mobile padding |
| `h-11` touch targets | `size="sm"` buttons |

---

## 21. Canvas Tools — Buffer Sizing and Touch Drag

### Canvas buffer sizing (prevent exponential growth)

Never read `canvas.width` to set `canvas.width`. The attribute returns the current pixel buffer size, not the CSS layout size. Multiplying by `devicePixelRatio` on every draw call doubles the buffer each time.

```tsx
// ❌ Bug — exponential growth on repeated calls
const { width: W, height: H } = canvas  // reads pixel buffer
canvas.width  = W * dpr                 // doubles every call

// ✅ Correct — stable CSS layout size
const W = canvas.clientWidth  || 800
const H = canvas.clientHeight || 200
canvas.width  = W * dpr
canvas.height = H * dpr
ctx.scale(dpr, dpr)
```

### Touch drag and mouse drag on canvas

For canvas elements that need click-to-seek or drag-to-scrub (waveform, whiteboard, etc.), replace `onClick` with the full mouse + touch handler set:

```tsx
const isDragging = useRef(false)

const seekTo = useCallback((clientX: number) => {
  if (!canvasRef.current) return
  const rect = canvasRef.current.getBoundingClientRect()
  const pct = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width))
  // apply seek...
}, [deps])

// Mouse handlers
const handleMouseDown  = (e) => { isDragging.current = true;  seekTo(e.clientX) }
const handleMouseMove  = (e) => { if (isDragging.current) seekTo(e.clientX) }
const handleMouseUp    = ()  => { isDragging.current = false }
const handleMouseLeave = ()  => { isDragging.current = false }

// Touch handlers — e.preventDefault() stops page scroll while scrubbing
const handleTouchStart = (e) => { e.preventDefault(); isDragging.current = true;  seekTo(e.touches[0].clientX) }
const handleTouchMove  = (e) => { e.preventDefault(); if (isDragging.current) seekTo(e.touches[0].clientX) }
const handleTouchEnd   = ()  => { isDragging.current = false }
```

Canvas element:
```tsx
<canvas
  ref={canvasRef}
  className="w-full h-40 cursor-pointer select-none"
  style={{ touchAction: "none" }}
  onMouseDown={handleMouseDown}
  onMouseMove={handleMouseMove}
  onMouseUp={handleMouseUp}
  onMouseLeave={handleMouseLeave}
  onTouchStart={handleTouchStart}
  onTouchMove={handleTouchMove}
  onTouchEnd={handleTouchEnd}
/>
```

- `touchAction: "none"` tells the browser not to handle the touch for scrolling.
- `e.preventDefault()` in touch handlers blocks the page scroll during the gesture.
- `select-none` prevents the browser text-selection highlight during a mouse drag.
- Use a `ref` for `isDragging` (not state) to avoid triggering re-renders on every mouse move.
