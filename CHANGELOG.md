# CreatorKit Changelog

---

## All Tools by Category (71 Total)

### Security (7 tools)
- Metadata Remover — Strip location, device info, timestamps from images, PDFs, audio
- Password Generator — Cryptographically secure passwords
- QR Code Generator — URL, text, email, phone, Wi-Fi
- File Checksum Verifier — MD5, SHA-1, SHA-256, SHA-512
- AES Encrypt / Decrypt — AES-256-GCM with PBKDF2-SHA256
- RSA Key Generator — RSA-OAEP 2048/4096-bit key pairs
- TOTP / 2FA Generator — RFC 6238 compatible

### Image & Visual (9 tools)
- Image Resizer — 40+ sizes across 12 platforms
- Image Compressor — JPEG, WebP, PNG with quality control
- Image Format Converter — JPEG, PNG, WebP, AVIF conversion
- Image Watermark Adder — Text watermarks with position/size
- Image to Text — AI OCR 100% in-browser
- Screenshot to Mockup — Device frames with custom backgrounds
- Background Remover — AI-powered (desktop) / color removal (mobile)
- Image Grid / Collage — 2×2, 3×3, 1×3, 3×1 layouts
- Color Palette Extractor — Dominant colors with percentages

### Design (9 tools)
- Design Token Generator — Brand colors to CSS/Tailwind/JSON
- Favicon Generator — 6 sizes + site.webmanifest
- Color Converter — HEX, RGB, HSL, OKLCH with picker
- Gradient Generator — Linear, radial, conic gradients
- Box Shadow Generator — Multiple layers, inset support
- Border Radius Visualizer — Per-corner sliders with presets
- Font Pairer — 70 Google Fonts, 14 curated pairings
- OG Image Generator — 4 templates, 1200×630 PNG
- Pixel → REM Converter — px/rem with reference table

### Productivity (13 tools)
- Anki Flashcards — SM-2 algorithm, local storage
- Whiteboard Drawing — Pen, shapes, text, PNG export
- Markdown Editor — Live preview, scroll sync, file upload
- Notes — Multiple notes, auto-save, word count
- Word & Character Counter — Words, chars, sentences, paragraphs
- CV Maker — Classic/Modern templates, PDF export
- Invoice Generator — Multi-currency, line items, PDF export
- Pomodoro Timer — 25/5/15 cycles, Web Audio bell
- Game Controller Tester — Gamepad API, real-time states
- Doc Scanner — Perspective warp, brightness/contrast
- Electrical Calculator — Ohm's Law, AC reactance, three-phase
- Engineering Calculator — DEG/RAD trig, constants, memory
- Math Calculator — REPL-style, variables, matrices

### Media (7 tools)
- BPM Detector — Audio tempo detection
- Audio Converter — MP3, WAV, OGG, FLAC, AAC, M4A, WMA, OPUS
- Voice Recorder — MediaRecorder API, WebM export
- Audio Waveform Visualizer — Web Audio API, seek controls
- Screen Recorder — getDisplayMedia, mic mixing
- Video Thumbnail Extractor — Grid/interval mode, ZIP download
- Video Compressor — ffmpeg.wasm, quality presets

### PDF (5 tools)
- PDF Compressor — Quality settings, size targets
- PDF Merger & Splitter — Merge/split by page ranges
- Image to PDF — A4, Letter, fit options
- PDF Organizer — Reorder, delete, thumbnails
- PDF to Image — Adjustable resolution, ZIP export

### Developer (17 tools)
- Code Playground — HTML/CSS/JS live editor
- Text Compare — Diff highlighting, export options
- Regex Tester — Real-time matching, pattern library
- JSON Formatter — Validate, format, minify
- CSV ↔ JSON Converter — Table preview, file upload
- Text Case Converter — Upper, lower, title, camel, snake, kebab
- UUID Generator — Single/bulk v4 generation
- Base64 Encoder / Decoder — Text and file support
- URL Encoder / Decoder — encodeURIComponent, encodeURI
- Lorem Ipsum Generator — Paragraphs, sentences, words
- Timestamp Converter — Unix, ISO 8601, UTC, local, relative
- JWT Decoder — Header, payload, expiry inspection
- HTML Entity Encoder / Decoder — Special characters
- CSS Minifier — Whitespace, comments, byte savings
- Cron Expression Generator — Presets, descriptions, next runs
- XML Formatter — Format, minify, validation
- YAML ↔ JSON Converter — js-yaml powered
- JS Formatter — Prettier 2.8.8, 8 languages
- Markdown → HTML — marked powered

---

## v1.71.0 — May 2026
### Batch Image Editor — Rules Compliance, UX Restructure, and Accessibility

#### Rules compliance fixes (`batch-image-editor.tsx`) — 12 issues
- Hard-conflict shortcuts replaced: `Ctrl+Shift+O/C` → `Ctrl+Shift+U/X`
- Mobile bottom bar: `shrink-0` → `fixed bottom-0 left-0 right-0 z-20 backdrop-blur-sm`
- Footer spacer `h-[60px]` added inside scrollable area
- Panels wrapped in `flex-1 overflow-y-auto p-4` scrollable wrapper + `rounded-xl border` card
- Keyboard handler: capture phase (`true`) removed; `Ctrl+Shift` shortcuts now fire inside inputs
- `focus:` → `focus-visible:` on format radio buttons and number inputs
- `aria-label="Panel selection"` added to mobile tablist
- Focus-visible rings added to mobile tab buttons
- Mobile header `pb-1` → `pb-2`
- Removed redundant `<>` fragment wrapper

#### UX restructure
- Upload area and Clear All moved into the Settings (left) panel — visible as the first tab on mobile
- Preview panel shows a placeholder hint ("Add images from the Settings panel") when empty
- Auto-switches to Preview tab after processing completes

#### Accessibility additions
- `role="progressbar"` with `aria-valuenow / aria-valuemin / aria-valuemax` during processing
- Two-badge `Tab` + `← →` hints on Quality, Brightness, Contrast sliders and Output Format radiogroup (desktop only)
- Two-badge `Tab` + `Space` hints on Resize and Grayscale switch labels (desktop only)
- All hints are `hidden md:inline-flex` and `aria-hidden="true"`

#### Usage guide added
- Ordered steps (upload, format, resize/filter, download) and tips (PNG quality note, resize behaviour, privacy)

#### Files changed
- `components/tools/batch-image-editor.tsx`

---

## v1.70.0 — May 2026
### Background Remover — Download Button Visual Feedback + PRD

#### Download button flash effect (`background-remover.tsx`)
- Added `downloading` state: button flips from white (`variant="default"`) to dark (`variant="outline"`) for 1500ms on click, then resets automatically
- Root cause of original bug documented: in this app's dark theme `variant="default"` = white/primary and `variant="outline"` = dark. Initial implementation had them swapped. Fixed by inverting the condition.
- Conditional kbd badge class updated to match each state: `border-primary-foreground/30 bg-primary-foreground/20` when white, `border-border bg-muted` when dark
- Applied to both desktop and mobile Download buttons
- Removed pre-existing unused imports (`Minus`, `Plus`) and unused `handleImageClick` function

#### PRD.md created
- Product Requirements Document added to project root in Markdown format
- Standard sections: Executive Summary, Problem Statement, Goals (with metrics), Target User personas (3), Scope (in/out), Feature Requirements, Non-Functional Requirements, User Stories, Technical Constraints, Success Metrics, Roadmap, Risks and Assumptions, Open Questions, Appendix with glossary

#### Files changed
- `components/tools/background-remover.tsx`
- `PRD.md` (created)

---

## v1.69.0 — May 2026
### Base64 Encoder / Decoder — Rules Compliance, Shortcuts, and Usage Guide

#### Rules compliance fixes (`base64-encoder.tsx`)
- Hard-conflict shortcuts replaced per Section 5: `Ctrl+Shift+C` → `Ctrl+Shift+V` (copy), `Ctrl+Shift+D` → `Ctrl+Shift+S` (download), `Ctrl+Shift+O` → `Ctrl+Shift+U` (upload)
- Mobile bottom bar changed from `shrink-0` flow to `fixed bottom-0 left-0 right-0 z-20 backdrop-blur-sm`
- Footer spacer `h-[60px]` moved inside scrollable area
- Keyboard handler: `Ctrl+Shift` shortcuts now fire from inside textarea; capture phase (`true`) removed
- Error display rebuilt to Section 18 styled card: `rounded-lg border border-destructive/50 bg-destructive/5`
- Download button kbd blackout fixed: `border-border bg-muted` → `border-primary-foreground/30 bg-primary-foreground/20`
- Encode/Decode toggle buttons: conditional kbd class applied to match active/inactive state
- Mobile header row 1 padding: `pb-1` → `pb-2`
- Mobile Enc/Dec buttons: `aria-label` added ("Switch to Encode mode" / "Switch to Decode mode")
- Mobile tab buttons: `focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-inset` added
- Deprecated `unescape`/`escape` replaced with `TextEncoder`/`TextDecoder`

#### New shortcuts
- `Ctrl+Shift+E` — Switch to Encode mode (with conditional kbd label on button)
- `Ctrl+Shift+Z` — Switch to Decode mode (with conditional kbd label on button)
- `Ctrl+Shift+F` — Focus the input textarea; also switches to input tab on mobile
- Subtle focus-input hint label at bottom-right of empty input panel (desktop only, disappears on typing)

#### Usage guide and layout restructure
- Panels wrapped in `rounded-xl border min-h-[500px]` card per Type A layout rules (Section 3)
- Scrollable content area: `flex-1 overflow-y-auto p-4 space-y-4`
- Usage guide card with four sections: What it does, How to use (5 ordered steps), Keyboard shortcuts (inline kbd), Tips (privacy note last)

#### Files changed
- `components/tools/base64-encoder.tsx`

---

## v1.68.0 — May 2026
### Background Remover — Full Rebuild: Three Methods, Unified Canvas, Repair Mode

#### Full rebuild (`background-remover.tsx`)

**Rules compliance fixes (standalone commit):**
- Layout aligned to rules.md standard: `flex flex-1 flex-col min-h-0` root, scrollable `p-4` wrapper, panels in `rounded-xl border` card
- Mobile bottom bar changed to `fixed bottom-0 z-20` with `env(safe-area-inset-bottom)` padding
- All `bg-white/20` kbd badges replaced with conditional class pattern (blackout fix on toggle buttons)
- Focus rings corrected from `focus:` to `focus-visible:` throughout

**Three removal methods:**
- **Auto** — AI removal via HuggingFace RMBG-1.4 on desktop; color-threshold removal on mobile (existing feature, now one of three methods)
- **Magic Eraser** — Background Eraser Tool behavior: samples the color at the brush tip center; erases only pixels within radius that match the sampled color within tolerance; dragging near a foreground object of a different color is safe because the tip reads a different color and stops erasing
- **Brush Eraser** — freehand manual eraser with adjustable brush size

**Unified canvas architecture:**
- `canvasRef` activates immediately on image upload; no separate input/output state
- All three methods (Auto / Magic / Brush) and Repair all operate on the same canvas
- Phase state machine: `"idle" | "loading-model" | "processing" | "canvas"` — enters `"canvas"` on upload, not only after removal
- Download always captures current canvas state
- `originalDataRef` stores post-removal image data so Repair brush references the correct baseline

**Repair mode (global, all methods):**
- Repair button always visible in header once an image is loaded; works on top of Auto, Magic, and Brush methods
- `restoreActive` flag overrides canvas interactions to `runRestoreBrush()` regardless of active method
- Canvas handlers changed from `if (removalMethod === "auto") return` to `if (removalMethod === "auto" && !restoreActive) return` so Repair works in Auto mode
- Renamed from "Restore" to "Repair" in all UI strings; internal variable names (`restoreActive`, `runRestoreBrush`) kept unchanged to avoid rename collisions
- `Ctrl+Shift+Z` shortcut added

**Smooth Edge:**
- Available once an image is loaded (no `hasApplied` gate needed)
- Box blur (radius 2) applied to alpha channel only; feathers cut edges without touching RGB values
- `Ctrl+Shift+F` shortcut

**Header and flow simplification:**
- Upload button removed from header (upload card is sufficient)
- Apply button removed (methods apply directly to canvas; Download captures current state)
- Desktop action bar order: tool name | Repair (Ctrl+Shift+Z) | Smooth Edge (Ctrl+Shift+F) | Download (Ctrl+Shift+S) | `ml-auto`: ShortcutsModal + Remove Background (Auto only)
- All em dashes removed from the entire file

**Mobile layout (3-row header):**
- Row 1: title | ShortcutsModal
- Row 2 (conditional on `imageEl`): `role="group"` wrapper with labeled Repair + Smooth Edge buttons (icon + text label)
- Row 3: Upload / Canvas tab switcher
- Fixed footer: Remove Background + Download (Auto); Download only (Magic / Brush)
- Upload button removed from footer

**Accessibility compliance:**
- Method selector uses `role="radiogroup"` on wrapper and `role="radio"` + `aria-checked` on each button; `aria-pressed` is reserved for toggle buttons, not exclusive-choice selectors
- All focus rings use `focus-visible:` variant (not `focus:`)
- `aria-live="polite"` region for all phase transition announcements
- Canvas labeled with `role="img"` and descriptive `aria-label`
- `role="progressbar"` with `aria-valuenow / aria-valuemin / aria-valuemax` on progress indicator
- All icon buttons have `aria-label`; all icons are `aria-hidden="true"`

#### Files changed
- `components/tools/background-remover.tsx`

---

## v1.67.0 — May 2026
### Audio Waveform Visualizer — Full Rebuild + Touch Scrubbing

#### Full rebuild (`audio-waveform-visualizer.tsx`)

**Rules compliance fixes:**
- Layout rebuilt to rules.md standard: scrollable `p-4` wrapper, panels in `rounded-xl border` card, usage guide card below
- Mobile bottom bar changed from `shrink-0` flow to `fixed bottom-0 z-20` with safe-area inset
- All `bg-white/20` kbd badges replaced with `border-border bg-muted` (blackout fix on outline buttons)
- Keyboard shortcut `Ctrl+Shift+O` (Bookmarks conflict in Chrome/Firefox) changed to `Ctrl+Shift+U`

**Audio playback restored** (was previously removed due to broken blob URL playback — now fixed by the CSP `media-src` directive added in v1.66.0):
- File blob URL created on upload → `new Audio(url)` element with `timeupdate` and `ended` listeners
- Play/Pause button + progress bar with `currentTime / total` display below the waveform
- Red playhead line drawn on canvas at current position
- Played-portion overlay (subtle white wash on the completed section)
- `Space` key plays/pauses globally
- Blob URL and audio element cleaned up on new file load and component unmount

**Touch and mouse drag-to-seek:**
- Canvas replaced `onClick` with full mouse drag: `onMouseDown` → `onMouseMove` → `onMouseUp` / `onMouseLeave`
- Touch scrubbing: `onTouchStart` / `onTouchMove` / `onTouchEnd` with `e.preventDefault()` to block scroll
- `style={{ touchAction: "none" }}` on canvas so the browser does not intercept the gesture for scroll
- `select-none` on canvas prevents text-selection highlight during drag
- Shared `seekTo(clientX)` helper used by both mouse and touch handlers

**Canvas buffer bug fixed:**
- `drawWaveform` was reading `canvas.width` (pixel buffer) and multiplying by `dpr` every call, causing exponential buffer growth during playback redraws
- Fixed to use `canvas.clientWidth` / `canvas.clientHeight` (CSS layout size) instead

#### Files changed
- `components/tools/audio-waveform-visualizer.tsx`

---

## v1.66.0 — May 2026
### Audio Converter Rebuild, AES Encryptor Improvements, CSP Fix

#### Audio Converter — full rebuild (`audio-converter.tsx`)
- **WAV** now converts instantly using the Web Audio API — no download, no dependencies, correct duration
- **MP3** now converts instantly using lamejs (~100KB) — no 25MB download, correct duration
- **OGG, FLAC, AAC, M4A, WMA, OPUS** still use ffmpeg.wasm as a fallback
- Format selector split into two labelled groups: "Instant — no download" (WAV, MP3) and "Requires ~25MB download" (the rest)
- Fixed garbled `âœ"` checkmark — replaced with a proper `<Check>` icon
- Fixed audio playback duration — now read from `AudioBuffer.duration` instead of the blob URL (which never had metadata)
- Fixed keyboard shortcuts: `Ctrl+Shift+O` (Bookmarks conflict) → `Ctrl+Shift+U`; `Ctrl+Shift+D` (Bookmarks conflict) → `Ctrl+Shift+S`; `Ctrl+Shift+T` (new tab conflict) removed
- Layout rebuilt to rules.md standard: scrollable wrapper with `p-4`, panels in `rounded-xl border` card, usage guide card below
- Mobile bottom bar changed from `shrink-0` flow to `fixed bottom-0` with safe-area inset
- Active tab text corrected from `text-primary` to `text-foreground`
- Warning notice moved from panel card into the header — conditional, only shown when an ffmpeg format is selected
- Format kbd number badges hidden on mobile (`hidden md:inline`)
- ShortcutsModal added to mobile header
- Installed `lamejs@1.2.1`

#### CSP fix — audio/video blob URL playback (`next.config.mjs`)
- Added `media-src 'self' blob:` directive
- Without this, browsers silently block `<audio>` and `<video>` elements from playing blob URLs (fallback to `default-src 'self'` blocks `blob:`)
- Fixes playback in Audio Converter, Voice Recorder, Audio Waveform Visualizer, Screen Recorder, and Video Compressor

#### AES Encryptor improvements (`aes-encryptor.tsx`)
- Added `Ctrl+Shift+E` (switch to Encrypt mode) and `Ctrl+Shift+L` (switch to Decrypt mode) shortcuts with conditional kbd badges
- Fixed copy shortcut from `Ctrl+Shift+C` (DevTools Inspector conflict in all major browsers) to `Ctrl+Shift+V`
- Added usage guide below panels: encrypting, decrypting, how AES-256-GCM works, passphrase tips
- Layout updated: panels in `rounded-xl border min-h-[500px]` card, scrollable `p-4` wrapper
- Removed all em dashes from guide text
- ShortcutsModal added to mobile header

#### rules.md — CreatorKit standards document created
- 20 sections covering all repeated patterns: layout, shortcuts, accessibility, component patterns, writing standards, color conventions, SSR hydration, portal modals, tool layout types, WASM loading, stats display, copy pattern, error display, badges, responsive breakpoints

#### Files changed
- `components/tools/audio-converter.tsx`
- `components/tools/aes-encryptor.tsx`
- `components/tools/anki-card.tsx`
- `next.config.mjs`
- `rules.md` (created)
- `package.json` + `pnpm-lock.yaml` (lamejs added)

---

## v1.65.0 — May 2026
### Anki Flashcards — Mobile Header & Browse Button Fix

#### Mobile header layout
- Split the single crowded mobile header row into two rows:
  - **Row 1**: Tool title ("Anki Flashcards") + action icons (Browse, Clear data, Shortcuts) right-aligned
  - **Row 2** (conditional): Streak and total-reviewed stats displayed as a smaller secondary line, only shown when study history exists
- Removes the cramped appearance when title, stats, and icons were all in one row on narrow screens

#### Browse button kbd blackout fix
- Fixed the `Ctrl+Shift+Y` kbd badge on the Browse button appearing blacked-out when the button is active (`variant="default"`, dark background)
- Applied the same fix already used on Study and Add Card buttons: `border-primary-foreground/30 bg-primary-foreground/20` when active, `border-border bg-muted` when inactive

#### Files changed
- `components/tools/anki-card.tsx`

---

## v1.64.0 — May 2026
### Layout Standardization — All 70 Tools (Desktop + Mobile)
Complete standardization of layout pattern across all 70 tool components for consistent UX on both desktop and touchscreen devices.

#### Desktop layout
- Sticky top action bar (`hidden md:flex`) with tool name + primary action buttons always visible without scrolling
- Side-by-side split panels with `border-r` divider (edge-to-edge, no card borders)
- `ShortcutsModal` always accessible in the top action bar

#### Mobile layout
- Compact header + tab switcher at top (Input/Output tabs with `border-b-2` active indicator)
- Sticky bottom action bar in thumb zone with 44px (`h-11`) touch targets
- `style={{ paddingBottom: "max(0.5rem, env(safe-area-inset-bottom))" }}` for virtual keyboard safe area
- `<kbd>` labels hidden on mobile to save space
- Auto-switches to Output tab when primary action completes

#### Structural changes applied to all 70 files
- Old: `flex h-full flex-col gap-3 p-4` outer wrapper → new: `flex h-full flex-col` (no padding)
- Old: inline `h2` title + `p` description header → moved to action bars
- Old: `grid grid-cols-1 lg:grid-cols-2 gap-4` panels → `flex-1 min-h-0 flex flex-col md:flex-row overflow-hidden`
- Panels lost `rounded-xl border border-border` (edge-to-edge separated by `border-r`)
- Left panel: `${activeTab === "input" ? "flex" : "hidden"} md:flex flex-col flex-1 min-h-0 overflow-hidden`
- Right panel: `${activeTab === "output" ? "flex" : "hidden"} md:flex flex-col flex-1 min-h-0 overflow-hidden`
- Added `const [activeTab, setActiveTab] = useState<"input" | "output">("input")` to all split-panel tools
- `ShortcutsModal` moved from end/start of fragment to both desktop and mobile action bars
- Fragment `<>` wrappers replaced with single `<div className="flex h-full flex-col">`

### Build Verification
- 79/79 pages compiled successfully ✓

---

## v1.63.0 — May 2026
### Keyboard Shortcut Format Standardization
- **Standardized shortcut display format** — Converted 40+ shortcuts across 17 files from separate `<span>` elements to compact `Ctrl+Shift+X` format:
  - Changed from `<kbd><span>Ctrl</span><span>Shift</span><span>X</span></kbd>` to `<kbd>Ctrl+Shift+X</kbd>`
  - Applied across all action buttons for consistent, compact display

### Files Updated
- components/tools/word-counter.tsx
- components/tools/xml-formatter.tsx (4 shortcuts)
- components/tools/yaml-converter.tsx (6 shortcuts)
- components/tools/regex-tester.tsx
- components/tools/rsa-key-generator.tsx (3 shortcuts)
- components/tools/screen-recorder.tsx (2 shortcuts)
- components/tools/rubiks-timer.tsx
- components/tools/screenshot-to-mockup.tsx
- components/tools/text-case-converter.tsx (2 shortcuts)
- components/tools/text-compare.tsx (4 shortcuts)
- components/tools/timestamp-converter.tsx
- components/tools/totp-generator.tsx (2 shortcuts)
- components/tools/url-encoder.tsx (5 shortcuts including dynamic)
- components/tools/uuid-generator.tsx (5 shortcuts)
- components/tools/video-compressor.tsx (5 shortcuts including dynamic)
- components/tools/voice-recorder.tsx (2 shortcuts)
- components/tools/video-thumbnail-extractor.tsx (2 shortcuts)

### Bug Fixes
- Fixed duplicate closing tag in video-compressor.tsx (caused build error)

### Build Verification
- 79/79 pages compiled successfully


## v1.62.0 — May 2026
### Keyboard Shortcut Fixes
- **Systematic fix** — Replaced all standard browser keyboard shortcuts across 18+ tools with Ctrl+Shift combinations to avoid conflicts:
  - Changed `Ctrl+C` → `Ctrl+Shift+C` (copy)
  - Changed `Ctrl+S` → `Ctrl+Shift+S` (save/download)
  - Changed `Ctrl+O` → `Ctrl+Shift+O` (open file)
  - Changed `Ctrl+N` → `Ctrl+Shift+N` (new)
  - Changed `Ctrl+Z/Y` → `Ctrl+Shift+Z/Y` (undo/redo)
  - Changed `Ctrl+P` → `Ctrl+Shift+P` (print/projects)
  - Changed `Ctrl+E` → `Ctrl+Shift+E` (export/example)
  - Changed `Ctrl+D` → `Ctrl+Shift+D` (download)
  - Changed `Ctrl+K` → `Ctrl+Shift+K` (focus)
  - Changed `Ctrl+R` → `Ctrl+Shift+R` (random)
  - Changed `Ctrl+L` → `Ctrl+Shift+L` (linked)
  - Changed `Ctrl+U` → `Ctrl+Shift+U` (unit)
  - Changed `Ctrl+T` → `Ctrl+Shift+T` (toggle)

### Accessibility Improvements
- **Anki Flashcards** — Complete accessibility overhaul:
  - Keyboard shortcuts: Ctrl+Shift+N (new deck), Ctrl+Shift+A (add card), Ctrl+Shift+S (study), Ctrl+Shift+D (switch deck), Ctrl+Shift+Enter (add), Space (flip), 1-4 (rate)
  - Visible kbd labels on all action buttons
  - aria-live announcements for study session progress
  - role="listbox", role="radiogroup", role="article" on UI sections
  
- **Audio Converter** — Complete accessibility overhaul:
  - Keyboard shortcuts: Ctrl+Shift+O (upload), Ctrl+Shift+Enter (convert), Ctrl+Shift+D (download), Ctrl+Shift+T (test mode), 1-8 (format), Q (quality cycle)
  - Visible kbd labels on all buttons
  - aria-live progress announcements
  
- **Audio Waveform Visualizer** — Complete accessibility overhaul:
  - Keyboard shortcuts: Ctrl+Shift+O (open), Ctrl+Shift+E (PNG), Ctrl+Alt+E (SVG), Ctrl+Shift+S (settings)
  - Visible kbd labels on export buttons
  - role="img" with detailed aria-label on canvas
  
- **Background Remover** — Complete accessibility overhaul:
  - Keyboard shortcuts: Ctrl+Shift+O (open), Ctrl+Shift+Enter (process), Ctrl+Shift+S (download), Escape (cancel)
  - Visible kbd labels on action buttons
  - Fixed useEffect dependencies to resolve build error

### UI Improvements
- **Removed em dashes** — Cleaned up tool page descriptions to remove em dash symbols (—) and made sentences flow better:
  - Updated 13 tool pages in app/tools directory
  - Replaced em dashes with periods or rephrased sentences
  - Made descriptions more readable

### Bug Fixes
- Fixed useEffect dependencies in background-remover.tsx using phase state directly
- Fixed aria-label syntax in anki-card.tsx (template literal in attribute issue)
- Fixed keyboard shortcut conflicts across 18+ tools

### Affected Files
- components/tools/anki-card.tsx
- components/tools/audio-converter.tsx
- components/tools/audio-waveform-visualizer.tsx
- components/tools/background-remover.tsx
- components/tools/base64-encoder.tsx
- components/tools/batch-image-editor.tsx
- components/tools/border-radius-visualizer.tsx
- components/tools/color-converter.tsx
- components/tools/color-palette-extractor.tsx
- components/tools/css-minifier.tsx
- components/tools/csv-json-converter.tsx
- components/tools/cv-maker.tsx
- components/tools/doc-scanner.tsx
- components/tools/favicon-generator.tsx
- components/tools/file-checksum-verifier.tsx
- components/tools/markdown-editor.tsx
- components/tools/shadow-generator.tsx
- app/tools/batch-image-editor/page.tsx
- app/tools/doc-scanner/page.tsx
- app/tools/electrical-calculator/page.tsx
- app/tools/engineering-calculator/page.tsx
- app/tools/font-pairer/page.tsx
- app/tools/gamepad-tester/page.tsx
- app/tools/invoice-generator/page.tsx
- app/tools/js-formatter/page.tsx
- app/tools/jwt-decoder/page.tsx
- app/tools/math-evaluator/page.tsx
- app/tools/og-image-generator/page.tsx
- app/tools/page.tsx
- app/tools/pomodoro-timer/page.tsx


## v1.61.0 — May 2026
### Accessibility Improvements
- **URL Encoder / Decoder** — Complete accessibility overhaul:
  - Keyboard shortcuts: Ctrl+Shift+E (encode mode), Ctrl+Shift+D (decode mode), Ctrl+Shift+S (swap), Ctrl+Shift+C (copy output), Ctrl+Shift+1 (encodeURIComponent), Ctrl+Shift+2 (encodeURI)
  - Visible kbd shortcut labels on all action buttons
  - aria-live announcements for mode switching and actions
  - Full focus-visible ring states, role attributes on all elements

- **UUID Generator** — Complete accessibility overhaul:
  - Keyboard shortcuts: Ctrl+Shift+G (generate single), Ctrl+Shift+B (bulk), Ctrl+Shift+C (copy), Ctrl+Shift+D (download), Ctrl+Shift+H (toggle hyphens)
  - Visible kbd labels on Generate, Copy All, Download buttons
  - aria-live announcements, role="list" on bulk UUIDs

- **Video Compressor** — Complete accessibility overhaul:
  - Keyboard shortcuts: Ctrl+Shift+C (compress), Ctrl+Shift+D (download), Ctrl+Shift+1/2/3 (presets)
  - Visible kbd labels on Compress, Download, preset buttons
  - aria-live progress announcements, role="progressbar"

- **Video Thumbnail Extractor** — Complete accessibility overhaul:
  - Keyboard shortcuts: Ctrl+Shift+E (extract), Ctrl+Shift+D (download ZIP), Ctrl+Shift+G (grid mode), Ctrl+Shift+I (interval mode)
  - Visible kbd labels on action buttons
  - aria-live announcements for mode switching

- **Voice Recorder** — Complete accessibility overhaul:
  - Keyboard shortcuts: Ctrl+Shift+R (start recording), Ctrl+Shift+S (stop recording)
  - Visible kbd labels on Start/Stop buttons
  - aria-live announcements for recording states

- **Whiteboard Drawing** — Complete accessibility overhaul:
  - Keyboard shortcuts: Ctrl+Shift+Z (undo), Ctrl+Shift+Y (redo), Ctrl+Shift+D (download), Ctrl+Shift+X (clear)
  - Single-column action buttons with compact kbd labels (C+S+Z format)
  - aria-live announcements, role="img" on canvas

- **Word Counter** — Complete accessibility overhaul:
  - Keyboard shortcuts: Ctrl+Shift+X (clear text)
  - Visible kbd label on Clear button
  - aria-live statistics updates

- **XML Formatter** — Complete accessibility overhaul:
  - Keyboard shortcuts: Ctrl+Shift+F (format), Ctrl+Shift+M (minify), Ctrl+Shift+C (copy), Ctrl+Shift+D (download)
  - Visible kbd labels on all action buttons
  - aria-live announcements, role="alert" on errors

- **YAML ↔ JSON Converter** — Complete accessibility overhaul:
  - Keyboard shortcuts: Ctrl+Shift+Y (YAML→JSON), Ctrl+Shift+J (JSON→YAML), Ctrl+Shift+S (swap), Ctrl+Shift+C (copy), Ctrl+Shift+D (download)
  - Visible kbd labels on mode buttons and actions
  - aria-live announcements for mode switching

### Bug Fixes
- Whiteboard kbd labels adjusted for button space constraints (changed from symbols to compact format like "C+S+Z")

### Note
- 80+ tools now have accessibility features including screen reader announcements, aria labels, and keyboard shortcuts
- All keyboard shortcuts use Ctrl+Shift+ modifiers to avoid browser conflicts
- Each tool includes ShortcutsModal for reference


## v1.60.0 — May 2026
### Accessibility Improvements
- **Markdown → HTML** — Complete accessibility overhaul:
  - Keyboard shortcuts: Ctrl+Shift+O (upload), Ctrl+Shift+E (load example), Ctrl+Shift+V (toggle view), Ctrl+Shift+C (copy), Ctrl+Shift+S (download)
  - Visible kbd shortcut labels on all buttons
  - aria-live announcements for all actions (input changes, copy, download, view toggle)
  - Full focus-visible ring states on all interactive elements
  - Proper role and aria attributes throughout

### Bug Fixes
- Fixed React.Children.only error in Markdown → HTML (Button asChild had multiple children)
- Console "Extra attributes from the server: script" warning confirmed as pre-existing ThemeProvider issue (not from our changes)

### Note
- 70+ tools now have accessibility features including screen reader announcements, aria labels, and keyboard shortcuts
- All keyboard shortcuts use Ctrl+Shift+ modifiers to avoid browser conflicts


## v1.59.0 — May 2026
### Accessibility Improvements
- **Electrical Calculator** — Complete accessibility overhaul:
  - Keyboard shortcut labels on all input fields (V, I, R, P, L, C, F)
  - Number shortcuts on frequency presets and circuit type buttons
  - Tab navigation hint and enhanced aria-labels
  - Filter/resizer shortcuts with "press X to switch" titles
- **Engineering Calculator** — Complete accessibility overhaul:
  - Keyboard shortcuts on calculator buttons (S, C, T, P, E, Enter, Escape)
  - 1-4 keys to switch between Graph/Calculus/Constants/History tabs
  - DEG/RAD toggle with proper radio role
  - Memory buttons with focus states and titles
  - Enhanced aria-live regions for calculator display

### Note
- Image Compressor's "Lossy PNG" feature was removed due to performance issues
- Pure JavaScript color quantization was too slow for large images (>1MB)
- Caused "page unresponsive" on older PCs and mobile devices
- Works fine for small images (~0.5MB) but problematic for larger files
- Will revisit when a lightweight WASM solution is available

## v1.58.0 — May 2026
### New Tools
- **Electrical Calculator** — Ohm's Law (auto-solve any 2 of V/I/R/P), AC reactance (XL/XC/Z/PF), single-phase power, three-phase Star/Delta, resistor color codes (4/5-band), and RC/RL time constants. IEC/IEEE standards with SI units.

### Improvements
- 6 calculator tabs: Ohm's Law · AC Reactance · Power · Three-Phase · Resistor Colors · RC/RL τ
- 70 total tools now available

## v1.57.0 — May 2026
### New Tools
- **Game Controller Tester** — Test any gamepad in the browser. Real-time button states, analog axis values, D-pad/face/trigger visual layout. Uses the Gamepad API — no software needed. Safari warning included.

### Improvements
- 69 total tools now available

## v1.56.0 — May 2026
### New Tools
- **Pomodoro Timer** — 25/5/15 minute work/break cycles. Web Audio API bell chime (no audio file), browser notifications, session dot tracking, and configurable durations. Updates document title while running.

### Improvements
- Settings + session count persisted to localStorage
- 68 total tools now available

## v1.55.0 — May 2026
### New Tools
- **Invoice Generator** — Professional invoice creator with live preview, multi-currency support, line items, tax rate, and PDF export via browser print. Auto-saved to localStorage.

### Improvements
- 67 total tools now available

## Improvements — May 2026
### Responsive Layout & Category Reorganisation

**Category reorganisation** — Tools page split from 4 broad categories into 7 focused ones:
- **Image & Visual** (9) — image manipulation and processing tools
- **Design** (9) — CSS generators, colors, fonts, OG images
- **PDF** (5) — all PDF tools extracted from Security
- **Developer** (17) — formatters, encoders, converters, code tools
- **Media** (7) — audio and video tools
- **Security** (8) — encryption, privacy, and authentication tools
- **Productivity** (11) — notes, timers, calculators, doc scanner, CV maker
- Added back-to-top button (appears after 400px scroll, smooth scroll)

**Mobile / vertical screen support** — 46 tool components updated:
- On mobile: panels stack vertically, page scrolls naturally
- On desktop: original side-by-side dual-scroll layout preserved
- Fixed-width sidebars become full-width on mobile
- Border direction adapts (bottom on mobile → right on desktop)
- Textarea and output panels have minimum height on mobile

**CSP fix** — Added `unpkg.com` to script-src (JS Formatter Prettier CDN), `fonts.googleapis.com` to style-src, and `fonts.gstatic.com` to font-src (Font Pairer).

## v1.54.0 — May 2026
### New Tools
- **Doc Scanner** — Scan documents with your camera or an uploaded photo. Drag 4 corner handles to align with document edges, apply perspective correction via homography, adjust brightness/contrast/grayscale, download as JPEG.

### Improvements
- Implemented full perspective warp (bilinear interpolation + inverse homography) in pure JavaScript — no dependencies
- Handles images up to 2MP; auto-downsamples larger sources
- 66 total tools now available

## v1.53.0 — May 2026
### New Tools
- **OG Image Generator** — Generate Open Graph images for social media. 4 templates (Minimal, Dark, Gradient, Split), custom colors with presets, 5 font choices. Download as 1200×630 PNG.

### Improvements
- All rendering done on HTML canvas — no server, no uploads
- Live preview updates on every keystroke
- 65 total tools now available

## v1.52.0 — May 2026
### New Tools
- **Engineering Calculator** — Scientific calculator with DEG/RAD trig, logarithms, physical constants (c, G, ℏ, kB, Nₐ), memory, and history. Powered by mathjs.

### Improvements
- Added Engineering Calculator with button grid and constants panel
- 64 total tools now available

## v1.51.0 — May 2026
### New Tools
- **Math Calculator** — REPL-style expression evaluator. Assign variables, convert units, evaluate matrices and complex numbers. Powered by mathjs.

### Improvements
- Added Math Calculator with persistent scope, variables panel, and 10 examples
- 63 total tools now available

## v1.50.0 — May 2026
### New Tools
- **JS Formatter** — Format JavaScript, TypeScript, CSS, HTML, JSON, and Markdown with Prettier 2.8.8. Loaded via CDN — no bundle impact.

### Improvements
- Added JS Formatter with 8 language parsers, auto-format toggle, file upload/download
- Installed mathjs@15.2.0 for Math and Engineering Calculator tools
- 62 total tools now available

## v1.49.0 — May 2026
### New Tools
- **Font Pairer** — Browse and pair Google Fonts for headings and body text. 70 curated fonts, 14 suggested pairings, light/dark/sepia preview themes, weight specimens, and CSS import code output.

### Improvements
- Added Font Pairer with FontSelector (search + category filter), heading/body size sliders, random pairing button, and copy-ready CSS @import output
- Fonts loaded via injected `<link>` tags — no API key required
- 61 total tools now available

## v1.48.0 — May 2026
### New Tools
- **CV Maker** — Build a professional CV with live preview, Classic and Modern templates, and one-click PDF export. Auto-saves to localStorage.

### Improvements
- Added CV Maker with Personal Info, Experience, Education, Skills, and Projects sections
- Collapsible form sections for better UX
- Two templates: Classic (black) and Modern (indigo)
- 60 total tools now available

## v1.47.0 — May 2026
### New Tools
- **Batch Image Editor** — Apply resize, format conversion, brightness/contrast to multiple images at once. Download as ZIP.

### Improvements
- Added Batch Image Editor with format, quality, resize, and filter controls
- 59 total tools now available

## v1.46.0 — May 2026
### New Tools
- **Video Compressor** — Compress videos using ffmpeg.wasm with high/balanced/small quality presets. Outputs MP4.

### Improvements
- Added Video Compressor with lazy-loaded ffmpeg and progress tracking
- 58 total tools now available

## v1.45.0 — May 2026
### New Tools
- **Image Grid / Collage** — Arrange multiple images in 2×2, 3×3, 1×3, or 3×1 grid layouts. Export as PNG.

### Improvements
- Added Image Grid with gap control, background color picker, and size options
- 57 total tools now available

## v1.44.0 — May 2026
### New Tools
- **Screen Recorder** — Record your screen with optional audio using getDisplayMedia. Download as WebM.

### Improvements
- Added Screen Recorder with mic mixing and in-memory playback
- 56 total tools now available

## v1.43.0 — May 2026
### New Tools
- **Audio Waveform Visualizer** — Visualize audio waveforms using Web Audio API. Clickable seek and playback controls.

### Improvements
- Added Audio Waveform Visualizer with downsampled waveform rendering and seek
- 55 total tools now available

## v1.42.0 — May 2026
### New Tools
- **Video Thumbnail Extractor** — Extract frames from any video as JPG. Grid or interval mode. Download as ZIP.

### Improvements
- Added Video Thumbnail Extractor using canvas + HTMLVideoElement
- 54 total tools now available

## v1.41.0 — May 2026
### New Tools
- **Color Palette Extractor** — Extract dominant colors from images with frequency percentages. Copy HEX, RGB, or HSL.

### Improvements
- Added Color Palette Extractor with canvas pixel quantization
- 53 total tools now available

## v1.40.0 — May 2026
### New Tools
- **PDF to Image** — Convert PDF pages to PNG images with adjustable resolution. Download all as ZIP.

### Improvements
- Added PDF to Image using pdfjs-dist with CDN worker
- 52 total tools now available

## v1.39.0 — May 2026
### New Tools
- **PDF Organizer** — Reorder and delete PDF pages with visual thumbnails. Powered by pdfjs-dist + pdf-lib.

### Improvements
- Added PDF Organizer with thumbnail previews and page reordering
- 51 total tools now available

## v1.38.0 — May 2026
### New Tools
- **Image to PDF** — Combine images into a PDF with page size options (A4, Letter, fit). Supports JPG, PNG, WebP.

### Improvements
- Added Image to PDF using pdf-lib with portrait/landscape and ordering controls
- 50 total tools now available

## v1.37.0 — May 2026
### New Tools
- **Notes** — Quick notes saved to localStorage. Multiple notes with titles, auto-save, and word count.

### Improvements
- Added Notes with sidebar note list and auto-save on blur
- 49 total tools now available

## v1.36.0 — May 2026
### New Tools
- **Voice Recorder** — Record audio in the browser using MediaRecorder API. Play back and download as WebM.

### Improvements
- Added Voice Recorder — no uploads, recordings stay in memory until downloaded
- 48 total tools now available

## v1.35.0 — May 2026
### New Tools
- **Rubik's Cube Timer** — Speedcubing timer with random WCA scrambles, 15s inspection, Ao5, Ao12, and session history.

### Improvements
- Added Rubik's Cube Timer with Space-key control and session statistics
- 47 total tools now available

## v1.34.0 — May 2026
### New Tools
- **Markdown → HTML** — Convert Markdown to HTML with live preview and raw HTML output. File upload and download supported.

### Improvements
- Added Markdown to HTML converter powered by marked
- 46 total tools now available

## v1.33.0 — May 2026
### New Tools
- **Border Radius Visualizer** — Build CSS border-radius values with per-corner sliders, presets, and live preview.

### Improvements
- Added Border Radius Visualizer with linked/unlinked corner mode and px/% toggle
- Added symbol key shortcuts: , . ; ' [ for the 5 new tools
- 45 total tools now available

## v1.32.0 — May 2026
### New Tools
- **Box Shadow Generator** — Build CSS box-shadows visually with multiple layers, inset support, and live preview.

### Improvements
- Added Box Shadow Generator with layered shadow system and background/box color pickers
- 44 total tools now available

## v1.31.0 — May 2026
### New Tools
- **Gradient Generator** — Build CSS linear, radial, and conic gradients visually with adjustable color stops.

### Improvements
- Added Gradient Generator with stop editor, direction presets, and angle control
- 43 total tools now available

## v1.30.0 — May 2026
### New Tools
- **Pixel → REM Converter** — Convert between px and rem with a configurable root font size and reference table.

### Improvements
- Added Pixel to REM Converter with clickable reference table and quick presets
- 42 total tools now available

## v1.29.0 — May 2026
### New Tools
- **YAML ↔ JSON Converter** — Convert between YAML and JSON formats with file upload, download, and indent control.

### Improvements
- Added YAML ↔ JSON Converter powered by js-yaml
- 41 total tools now available

## v1.28.0 — May 2026
### New Tools
- **TOTP / 2FA Generator** — Generate time-based OTP codes from a base32 secret. Compatible with Google Authenticator and RFC 6238.

### Improvements
- Added TOTP Generator with live countdown, next-code preview, and demo secret
- 40 total tools now available

## v1.27.0 — May 2026
### New Tools
- **RSA Key Generator** — Generate RSA-OAEP key pairs (2048 or 4096-bit) in PEM format with download support.

### Improvements
- Added RSA Key Generator using Web Crypto API — nothing leaves the browser
- 39 total tools now available

## v1.26.0 — May 2026
### New Tools
- **AES Encrypt / Decrypt** — AES-256-GCM encryption with PBKDF2-SHA256 key derivation (100k iterations).

### Improvements
- Added AES Encryptor with random salt + IV per encryption and swap mode
- 38 total tools now available

## v1.25.0 — May 2026
### New Tools
- **XML Formatter** — Format or minify XML with structure validation. Supports indentation options and file upload.

### Improvements
- Added XML Formatter using browser's built-in DOMParser — no dependencies needed
- 37 total tools now available

## v1.24.0 — May 2026
### New Tools
- **Cron Expression Generator** — Build cron expressions with presets, human-readable descriptions, and next 5 run times.

### Improvements
- Added Cron Generator with 12 presets and quick reference guide
- 36 total tools now available

## v1.23.0 — May 2026
### New Tools
- **CSS Minifier** — Remove whitespace and comments from CSS with exact byte savings shown. Upload or paste.

### Improvements
- Added CSS Minifier with file upload and .min.css download
- 35 total tools now available

## v1.22.0 — May 2026
### New Tools
- **HTML Entity Encoder / Decoder** — Encode special characters to HTML entities or decode them back with quick-insert reference.

### Improvements
- Added HTML Entity Encoder with common entity reference bar and swap mode
- 34 total tools now available

## v1.21.0 — May 2026
### New Tools
- **JWT Decoder** — Decode JSON Web Tokens and inspect header, payload, expiry, and issued-at time.

### Improvements
- Added JWT Decoder with expiry status indicator and per-section copy
- 33 total tools now available

## v1.20.0 — May 2026
### New Tools
- **Timestamp Converter** — Convert between Unix timestamps and human-readable date formats (ISO 8601, UTC, local, relative).

### Improvements
- Added Timestamp Converter with current-time shortcut and 8 output formats
- 32 total tools now available

## v1.19.0 — May 2026
### New Tools
- **Word & Character Counter** — Count words, characters, sentences, paragraphs, and estimate reading and speaking time.

### Improvements
- Added Word & Character Counter with live real-time statistics
- 31 total tools now available

## v1.18.0 — May 2026
### New Tools
- **Color Converter** — Convert colors between HEX, RGB, HSL, and OKLCH with a visual color picker and live preview.

### Improvements
- Added Color Converter with color picker, swatch preview, and one-click copy per format
- 30 total tools now available

## v1.17.0 — May 2026
### New Tools
- **Lorem Ipsum Generator** — Generate placeholder text by paragraphs, sentences, or words with "Lorem ipsum..." start option.

### Improvements
- Added Lorem Ipsum Generator with paragraph/sentence/word modes and download support
- 29 total tools now available

## v1.16.0 — May 2026
### New Tools
- **URL Encoder / Decoder** — Encode or decode URL components and full URLs using encodeURIComponent and encodeURI.

### Improvements
- Added URL Encoder / Decoder with component and full-URL modes
- 28 total tools now available

## v1.15.0 — May 2026
### New Tools
- **Base64 Encoder / Decoder** — Encode text or files to Base64, or decode Base64 back to plain text.

### Improvements
- Added Base64 Encoder / Decoder with file upload support and swap mode
- Fixed "text-compare" display name on tools grid (now "Text Compare")
- Removed duplicate text-compare entry in sitemap
- 27 total tools now available

## v1.14.0 — May 2026
### New Tools
- **UUID Generator** — Generate cryptographically secure UUID v4s with bulk generation options.

### Improvements
- Added UUID Generator with single and bulk generation
- 26 total tools now available

## v1.13.0 — May 2026
### New Tools
- **Text Case Converter** — Convert text between upper, lower, title, camel, snake, and kebab cases with real-time preview.

### Improvements
- Added Text Case Converter with 5 case conversions
- 25 total tools now available

## v1.12.0 — May 2026
### New Tools
- **CSV ↔ JSON Converter** — Convert between CSV and JSON formats with table preview and file upload support.

### Improvements
- Added CSV ↔ JSON Converter with bidirectional conversion
- 24 total tools now available

## v1.11.0 — May 2026
### New Tools
- **JSON Formatter** — Format, validate, and minify JSON with real-time error highlighting and syntax checking.

### Improvements
- Added JSON Formatter with validation and formatting options
- 23 total tools now availables

## v1.10.0 — May 2026
### New Tools
- **Regex Tester** — Test and debug regular expressions with real-time matching, highlighting, and common pattern library.

### Improvements
- Added Regex Tester with comprehensive flag support
- 22 total tools now available

## v1.9.0 — May 2026
### New Tools
- **Text Compare** — Compare two text blocks side-by-side with highlighted differences, character/word/line counts, and export options.

### Improvements
- Added Text Compare tool for diff analysis
- 21 total tools now available

## v1.8.0 — May 2026
### New Tools
- **Markdown Editor** — Write and preview markdown with live rendering, scroll sync, GitHub-style formatting, and file upload/download.

### Improvements
- Added Markdown Editor with two-column layout and formatting toolbar
- 20 total tools now available
- First medium complexity tool implemented

## v1.7.0 — May 2026
### New Tools
- **Whiteboard Drawing** — Draw with pen, shapes, and text. Export as PNG. All client-side with undo/redo functionality.
 
### Improvements
- Added Whiteboard Drawing with full drawing toolkit
- All 4 hard tools now implemented (Audio Converter, Background Remover, Code Playground, Whiteboard)
- 19 total tools now available

## v1.6.0 — May 2026
### New Tools
- **Audio Converter** — Convert between MP3, WAV, OGG, FLAC, AAC, M4A, WMA, and OPUS formats. Powered by ffmpeg.wasm, runs entirely in browser.
 
### Improvements
- Added Audio Converter with 8 format support and quality settings
- All tools remain client-side and privacy-focused

## v1.5.0 — May 2026
### New Tools
- **PDF Merger & Splitter** — Merge multiple PDFs or split by page ranges, all client-side
- **Code Playground** — Live HTML/CSS/JS editor with instant preview and ZIP download
 
### Improvements
- Added 2 new productivity tools (17 total tools)
- All tools follow privacy-first, client-side architecture

## v1.4.0 — May 2026
### New Tools
- **PDF Compressor** — Compress PDFs with quality settings, size targets, and metadata removal
- **File Checksum Verifier** — Compute MD5, SHA-1, SHA-256, SHA-512 hashes locally
- **Image Watermark Adder** — Add text watermarks to images with position/size controls
- **Screenshot to Mockup** — Wrap screenshots in device frames with custom backgrounds
- **Anki Flashcards** — Spaced repetition cards with SM-2 algorithm, local storage
- **Background Remover** — AI-powered background removal (desktop) and color removal (mobile)
- **BPM Detector** — Detect audio tempo in beats per minute

### Improvements
- Enhanced PDF compression with quality levels and size targets
- Added keyboard shortcuts for all new tools
- Updated sitemap with all 15 tools

## v1.3.0 — May 2026
### New Tools
- **Image Compressor** — Compress JPEG, WebP, PNG images locally with quality control
- **Image Format Converter** — Convert between JPEG, PNG, WebP, AVIF client-side
- **Favicon Generator** — Generate all favicon sizes + site.webmanifest from image or text

## v1.2.0 — May 2026
### New Tools
- **Password Generator** — Cryptographically secure passwords with custom character sets
- **QR Code Generator** — QR codes for URL, text, email, phone, Wi-Fi — all offline

## v1.1.0 — May 2026
### Security
- Added HTTP security headers (CSP, X-Frame-Options, HSTS, Referrer-Policy, Permissions-Policy)
- Moved ffmpeg audio engine from CDN to local hosting — removed external dependency
- Switched audio processing to pure JS ID3 stripping for MP3 (no WASM, works on mobile)

### Legal
- Privacy Policy: disclosed Vercel Analytics, clarified cookies, added age section and analytics opt-out
- Terms of Service: added age requirement, copyright compliance, and governing law sections
- Added LICENSES.md documenting all open-source dependencies
- Added CHANGELOG.md and OWNERSHIP-NOTES.md for project documentation

### Improvements
- Mobile warning banner on Metadata Remover (tool is desktop-optimized)
- Loading progress UI for audio processor

## v1.0.0 — April 2026
### Launch
- Launched with 3 tools: Metadata Remover, Image Resizer, Design Token Generator
- Deployed at creatorkit-tools.vercel.app
- Google Search Console verified, sitemap submitted
