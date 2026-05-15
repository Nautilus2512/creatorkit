# CreatorKit Development History - Complete Session Log

## Project Overview

**CreatorKit** is a privacy-first, browser-based tool suite for content creators. All tools run entirely client-side with no server processing, no data collection, and no tracking.

- **Status**: Live at creatorkit-tools.vercel.app
- **Tech Stack**: Next.js 16.2.4, React 19, TypeScript 5.7.3, Tailwind CSS v4, shadcn/ui
- **Package Manager**: pnpm

---

## 📋 Table of Contents

1. [Phase 1: Initial Setup (Account Creation)](#phase-1-initial-setup)
2. [Phase 2: Core Tools Development](#phase-2-core-tools-development)
3. [Phase 3: Security & Legal Fixes](#phase-3-security--legal-fixes)
4. [Phase 4: Accessibility & Shortcut Improvements](#phase-4-accessibility--shortcut-improvements)
5. [All Tools List (Current & Planned)](#all-tools-list)
6. [Known Issues & Technical Debt](#known-issues--technical-debt)

---

## Phase 1: Initial Setup

### Accounts Created

| Platform | Purpose | Status |
|----------|---------|--------|
| GitHub (Nautilus2512) | Code repository | ✅ Done |
| Vercel | Deployment hosting | ✅ Done |
| v0.dev | AI UI generation | ✅ Done |
| Cursor | Code editor | ✅ Done |
| Lemon Squeezy | Payment gateway | ✅ Done (account only) |
| Google Search Console | SEO verification | ✅ Done |

### First Deployment

- Created Next.js project with TypeScript
- Set up shadcn/ui components
- Initial commit to GitHub
- Deploy to Vercel: `creatorkit-tools.vercel.app`
- Verified with Google Search Console

---

## Phase 2: Core Tools Development

### Tool 1: Metadata Remover

**File**: `components/tools/metadata-remover.tsx`

**Features implemented:**
- Image EXIF stripping (GPS, Device, Date, Software, Lens, Exposure/ISO)
- PDF metadata removal (Author, Title, Creator, Producer, Subject, Keywords)
- Office document metadata (Creator, Last Modified By, Dates, Company, Description)
- Audio metadata removal via ffmpeg.wasm (MP3, FLAC, WAV, M4A, OGG)
- Batch processing (up to 20 files)
- ZIP download for batch results
- CSV export of cleaned files
- Keyboard shortcuts: Ctrl+O (upload), Ctrl+Enter (clean), Ctrl+D (download), Ctrl+E (export), Ctrl+Backspace (clear)

**Key technical implementations:**
- Lazy-loaded ffmpeg.wasm for audio processing
- Split panel layout with sticky action bars
- forwardRef pattern for FileDropzone to trigger file input via keyboard

---

### Tool 2: Image Resizer

**File**: `components/tools/image-resizer.tsx`

**Features implemented:**
- 12 social platforms (Instagram, Facebook, Twitter/X, TikTok, LinkedIn, YouTube, Pinterest, Threads, Snapchat, Bluesky, WhatsApp, Reddit)
- 40+ preset sizes
- Custom size input with aspect ratio calculation
- Draggable crop overlay with ResizeObserver for accuracy
- Output format selection (JPEG, PNG, WebP)
- Quality slider
- Batch processing with multiple outputs per image
- Split panel layout

**Key technical implementations:**
- Custom StyledSelect component (no native `<select>`)
- Pointer Events API with setPointerCapture for mobile drag
- ResizeObserver for accurate pixel-based crop overlay
- touchAction: "none" for mobile support

---

### Tool 3: Design Token Generator

**File**: `components/tools/design-token-generator.tsx`

**Features implemented:**
- Custom HSL color picker (2D saturation/lightness area + hue slider)
- Brand colors management (up to 5 colors)
- Automatic shade generation (50-900 scale, 10 steps)
- Live preview with light/dark mode toggle
- Export formats: CSS (with :root and .dark), Tailwind config, JSON

**Key technical implementations:**
- hexToHSL(), hslToHex(), hslToRgb() helper functions
- Pointer event handlers with touchAction: "none" for mobile
- Live preview with real-time updates

---

### Landing Page & Dashboard

**Files**: `app/page.tsx`, `app/tools/page.tsx`

**Features:**
- Custom SVG shield logo with three colored circles
- Privacy-first messaging ("100% client-side. No server. No tracking.")
- Keyboard shortcuts (1/2/3 keys) on landing page
- Shortcuts modal (hidden on mobile via hidden md:flex)
- Coming Soon section with 6 tools
- Stats display: "3 Tools | 40+ Image size presets | 12 Social platforms | 100% In-browser only"

---

## Phase 3: Security & Legal Fixes

### Fix 1: Security Headers

**File**: `next.config.mjs`

Added HTTP security headers:
- Content-Security-Policy (CSP)
- X-Frame-Options: DENY
- X-Content-Type-Options: nosniff
- Referrer-Policy: strict-origin-when-cross-origin
- Permissions-Policy (camera, microphone, geolocation = disabled)
- Strict-Transport-Security (HSTS)

---

### Fix 2: Privacy Policy Updates

**File**: `app/privacy/page.tsx`

Added/updated sections:
- Third party services: Disclosed Vercel Web Analytics
- Cookies: Clarified theme preference stored in localStorage only
- Analytics opt-out: Added DNT instructions
- Age: Added 13+ requirement

---

### Fix 3: Terms of Service Updates

**File**: `app/terms/page.tsx`

Added sections:
- Age requirement: 13+ with parental permission for under 18
- Copyright compliance: DMCA-style contact for infringement reports
- Governing law: Indonesian jurisdiction

---

### Fix 4: Licenses Documentation

**File**: `LICENSES.md`

Documented all open-source libraries and their licenses. Explicitly noted that jszip is used under MIT license (not GPL-3.0).

---

## Phase 4: Accessibility & Shortcut Improvements (v1.59.0 - v1.62.0)

### Session v1.62.0 (May 2026) - Keyboard Shortcut Fixes & More Accessibility

#### Systematic Keyboard Shortcut Fixes

Fixed 18+ files to use Ctrl+Shift+ modifiers instead of standard browser shortcuts:

| Original | Changed To | Purpose |
|----------|------------|---------|
| Ctrl+C | Ctrl+Shift+C | Copy |
| Ctrl+S | Ctrl+Shift+S | Save/Download |
| Ctrl+O | Ctrl+Shift+O | Open file |
| Ctrl+N | Ctrl+Shift+N | New |
| Ctrl+Z/Y | Ctrl+Shift+Z/Y | Undo/Redo |
| Ctrl+P | Ctrl+Shift+P | Print/Projects |
| Ctrl+E | Ctrl+Shift+E | Export/Example |
| Ctrl+D | Ctrl+Shift+D | Download |
| Ctrl+K | Ctrl+Shift+K | Focus |
| Ctrl+R | Ctrl+Shift+R | Random |
| Ctrl+L | Ctrl+Shift+L | Linked |
| Ctrl+U | Ctrl+Shift+U | Unit |
| Ctrl+T | Ctrl+Shift+T | Toggle |

#### New Accessibility Improvements

##### Anki Flashcards (anki-card.tsx)

**Features implemented:**
- Keyboard shortcuts: Ctrl+Shift+N (new deck), Ctrl+Shift+A (add card), Ctrl+Shift+S (study), Ctrl+Shift+D (switch deck), Ctrl+Shift+Enter (add card)
- Space key to flip cards in study mode
- Number keys 1-4 to rate cards (Again/Hard/Good/Easy)
- Delete/Backspace to delete cards from list
- Visible kbd labels on all action buttons

**Accessibility features:**
- aria-live="polite" for study session progress
- role="listbox", "radiogroup", "article" on UI sections
- role="button" with proper aria-pressed on deck selections
- aria-describedby for form help text
- Screen reader announcements for state changes

---

##### Audio Converter (audio-converter.tsx)

**Features implemented:**
- Keyboard shortcuts: Ctrl+Shift+O (upload), Ctrl+Shift+Enter (convert), Ctrl+Shift+D (download), Ctrl+Shift+T (test mode)
- Number keys 1-8 to select format
- Q key to cycle quality levels
- Visible kbd labels on all action buttons

**Accessibility features:**
- aria-live="polite" progress announcements
- role="radiogroup" on format and quality selectors
- aria-required on input fields
- Proper focus management

---

##### Audio Waveform Visualizer (audio-waveform-visualizer.tsx)

**Features implemented:**
- Keyboard shortcuts: Ctrl+Shift+O (open), Ctrl+Shift+E (export PNG), Ctrl+Alt+E (export SVG), Ctrl+Shift+S (settings)
- Arrow keys to navigate between style options
- Visible kbd labels on export buttons

**Accessibility features:**
- role="img" with detailed aria-label on canvas
- role="region" with aria-labelledby on panels
- aria-live announcements for file loading

---

##### Background Remover (background-remover.tsx)

**Features implemented:**
- Keyboard shortcuts: Ctrl+Shift+O (open), Ctrl+Shift+Enter (process), Ctrl+Shift+S (download)
- Escape to cancel color picking mode

**Accessibility features:**
- Fixed useEffect dependencies (was causing build error)
- role="progressbar" with proper aria attributes
- aria-live announcements for processing states

---

#### UI Improvements - Em Dash Removal

Removed em dashes (—) from 13 tool page descriptions:
- app/tools/page.tsx (6 descriptions)
- app/tools/electrical-calculator/page.tsx
- app/tools/gamepad-tester/page.tsx
- app/tools/pomodoro-timer/page.tsx
- app/tools/invoice-generator/page.tsx
- app/tools/og-image-generator/page.tsx
- app/tools/math-evaluator/page.tsx
- app/tools/jwt-decoder/page.tsx
- app/tools/js-formatter/page.tsx
- app/tools/font-pairer/page.tsx
- app/tools/engineering-calculator/page.tsx
- app/tools/doc-scanner/page.tsx
- app/tools/batch-image-editor/page.tsx

---

#### Files Modified in This Session

| File | Changes |
|------|---------|
| components/tools/anki-card.tsx | Full accessibility overhaul + new shortcuts |
| components/tools/audio-converter.tsx | Full accessibility overhaul + new shortcuts |
| components/tools/audio-waveform-visualizer.tsx | Full accessibility overhaul + new shortcuts |
| components/tools/background-remover.tsx | Full accessibility overhaul + new shortcuts |
| components/tools/base64-encoder.tsx | Ctrl+O → Ctrl+Shift+O |
| components/tools/batch-image-editor.tsx | Ctrl+O → Ctrl+Shift+O |
| components/tools/border-radius-visualizer.tsx | Ctrl+C/L/U → Ctrl+Shift+C/L/U |
| components/tools/color-converter.tsx | Ctrl+C → Ctrl+Shift+C |
| components/tools/color-palette-extractor.tsx | Ctrl+O/C → Ctrl+Shift+O/C |
| components/tools/css-minifier.tsx | Ctrl+O/E → Ctrl+Shift+O/E |
| components/tools/csv-json-converter.tsx | Ctrl+O/C/S → Ctrl+Shift+O/C/S |
| components/tools/cv-maker.tsx | Ctrl+E/D/K/P → Ctrl+Shift+E/D/K/P |
| components/tools/doc-scanner.tsx | Ctrl+D → Ctrl+Shift+D |
| components/tools/favicon-generator.tsx | Ctrl+O/D → Ctrl+Shift+O/D |
| components/tools/file-checksum-verifier.tsx | Ctrl+O → Ctrl+Shift+O |
| components/tools/markdown-editor.tsx | Ctrl+Z/Y → Ctrl+Shift+Z/Y |
| components/tools/shadow-generator.tsx | Ctrl+C/N → Ctrl+Shift+C/N |
| app/tools/*.tsx (13 files) | Removed em dashes |

---

### Tools Fixed (v1.61.0)

#### 1. url-encoder.tsx ✅

**Accessibility features added:**
- Keyboard shortcuts: Ctrl+Shift+E (encode), Ctrl+Shift+D (decode), Ctrl+Shift+S (swap), Ctrl+Shift+C (copy), Ctrl+Shift+1 (encodeURIComponent), Ctrl+Shift+2 (encodeURI)
- Screen reader announcements via announceToScreenReader for mode switching and actions
- aria-live="polite" on status messages and character counts
- aria-pressed on mode buttons (Encode/Decode)
- role="radiogroup" + aria-checked on encode mode selectors
- role="region" + aria-labelledby on input/output panels
- Focus-visible rings on all interactive elements
- ShortcutsModal with all keyboard shortcuts

---

#### 2. uuid-generator.tsx ✅

**Accessibility features added:**
- Keyboard shortcuts: Ctrl+Shift+G (single), Ctrl+Shift+B (bulk), Ctrl+Shift+C (copy), Ctrl+Shift+D (download), Ctrl+Shift+H (hyphens)
- Screen reader announcements for generation and copy actions
- aria-live="polite" on bulk UUID list
- role="list" + role="listitem" on generated UUIDs
- Focus-visible rings on all buttons
- ShortcutsModal with all keyboard shortcuts

---

#### 3. video-compressor.tsx ✅

**Accessibility features added:**
- Keyboard shortcuts: Ctrl+Shift+C (compress), Ctrl+Shift+D (download), Ctrl+Shift+1/2/3 (presets)
- Screen reader announcements for compression progress and completion
- aria-live="polite" on progress updates
- role="progressbar" + aria-valuenow/min/max on progress bar
- role="radiogroup" on preset buttons
- Focus-visible rings on all interactive elements
- ShortcutsModal with all keyboard shortcuts

---

#### 4. video-thumbnail-extractor.tsx ✅

**Accessibility features added:**
- Keyboard shortcuts: Ctrl+Shift+E (extract), Ctrl+Shift+D (download ZIP), Ctrl+Shift+G (grid), Ctrl+Shift+I (interval)
- Screen reader announcements for frame extraction
- aria-live="polite" on thumbnail list
- role="list" + role="listitem" on extracted frames
- tabIndex + onKeyDown for keyboard download on frames
- Focus-visible rings on all buttons
- ShortcutsModal with all keyboard shortcuts

---

#### 5. voice-recorder.tsx ✅

**Accessibility features added:**
- Keyboard shortcuts: Ctrl+Shift+R (start), Ctrl+Shift+S (stop)
- Screen reader announcements for recording states
- aria-live="polite" on recording duration and playback
- aria-pressed on record/stop button
- role="list" on recordings
- Focus-visible rings on all buttons
- ShortcutsModal with all keyboard shortcuts

---

#### 6. whiteboard-drawing.tsx ✅

**Accessibility features added:**
- Keyboard shortcuts: Ctrl+Shift+Z (undo), Ctrl+Shift+Y (redo), Ctrl+Shift+D (download), Ctrl+Shift+X (clear)
- Screen reader announcements for tool/color changes and actions
- aria-live="polite" on canvas
- role="img" + detailed aria-label on canvas element
- role="radiogroup" on tools and colors
- Focus-visible rings on all buttons and color swatches
- Single-column action buttons with compact kbd labels (C+S+Z format)
- ShortcutsModal with all keyboard shortcuts

---

#### 7. word-counter.tsx ✅

**Accessibility features added:**
- Keyboard shortcuts: Ctrl+Shift+X (clear text)
- Screen reader announcements for text clearing
- aria-live="polite" on statistics updates
- aria-describedby on textarea for word count
- Focus-visible rings on all buttons
- ShortcutsModal with keyboard shortcut

---

#### 8. xml-formatter.tsx ✅

**Accessibility features added:**
- Keyboard shortcuts: Ctrl+Shift+F (format), Ctrl+Shift+M (minify), Ctrl+Shift+C (copy), Ctrl+Shift+D (download)
- Screen reader announcements for mode switching and actions
- aria-pressed on Format/Minify buttons
- role="radiogroup" on indent selectors
- role="alert" + aria-live="assertive" on parse errors
- Focus-visible rings on all buttons
- ShortcutsModal with all keyboard shortcuts

---

#### 9. yaml-converter.tsx ✅

**Accessibility features added:**
- Keyboard shortcuts: Ctrl+Shift+Y (YAML→JSON), Ctrl+Shift+J (JSON→YAML), Ctrl+Shift+S (swap), Ctrl+Shift+C (copy), Ctrl+Shift+D (download)
- Screen reader announcements for mode switching and actions
- aria-pressed on mode buttons
- role="radiogroup" on indent selectors
- Focus-visible rings on all buttons
- ShortcutsModal with all keyboard shortcuts

---

### Tools Fixed (v1.60.0)

#### 10. markdown-to-html.tsx ✅

**Accessibility features added:**
- Screen reader announcements via announceToScreenReader for all actions
- aria-live="polite" on status messages and output areas
- aria-label on all buttons and interactive elements
- Focus-visible rings on all interactive elements
- aria-hidden="true" on decorative icons (Upload, Download, Copy)
- role="region" + aria-labelledby on input and output panels

**Keyboard shortcuts added:**
- Ctrl+Shift+O — Upload file
- Ctrl+Shift+E — Load example markdown
- Ctrl+Shift+V — Toggle between input/preview/split view
- Ctrl+Shift+C — Copy HTML output
- Ctrl+Shift+S — Download HTML file

**Bug fix:**
- Fixed React.Children.only error: Button asChild component had multiple children (span + kbd), combined into single element

---

### Tools Fixed (v1.59.0)

#### 1-10. Previous Accessibility Work

#### 1. font-pairer.tsx ✅

**Accessibility features added:**
- Keyboard shortcuts: Ctrl+Shift+R (random pairing), Ctrl+Shift+T (cycle theme)
- aria-pressed on type selector buttons
- role="group" + aria-label on gradient type, direction button groups
- aria-label on direction buttons with title tooltips
- aria-label and aria-describedby on angle inputs
- role="region" + aria-labelledby on color stops section
- aria-label on color picker, hex input, slider, and remove buttons
- Focus-visible rings on all interactive elements
- aria-hidden="true" on decorative icons
- aria-live="polite" on CSS output
- ShortcutsModal with all keyboard shortcuts

**Keyboard shortcuts fixed:**
- Changed from Ctrl+R → Ctrl+Shift+R (browser conflict: refresh)
- Changed from Ctrl+T → Ctrl+Shift+T (browser conflict: new tab)
- Changed from Ctrl+C → Ctrl+Shift+C (browser conflict: copy)

---

#### 2. gamepad-tester.tsx ✅

**Accessibility features added:**
- Screen reader announcements via announceToScreenReader
- aria-live="polite" on connection status badge
- role="alert" on Safari warning
- Tablist/tab/tabpanel pattern for controller tabs
- role="img" + detailed aria-label on visual button indicators
- role="group" + aria-label on D-Pad, Face buttons, Center buttons
- role="list" and role="listitem" on buttons list with full state descriptions
- role="meter" + aria-valuenow/min/max on axis bars
- role="region" + aria-labelledby on controller ID and no-controller sections
- aria-hidden="true" on decorative icons
- Focus-visible rings on all interactive elements
- ShortcutsModal with "?" key

**Keyboard shortcuts:**
- "C" - Cycle between controllers (no conflict - no text inputs)

---

#### 3. gradient-generator.tsx ✅

**Accessibility features added:**
- Screen reader announcements via announceToScreenReader for all actions
- aria-pressed on type selector buttons
- role="group" + aria-label on gradient type, direction button groups
- aria-label on direction buttons with title tooltips
- aria-label and aria-describedby on angle inputs
- role="region" + aria-labelledby on color stops section
- aria-label on color picker, hex input, slider, and remove buttons
- Focus-visible rings on all interactive elements
- aria-hidden="true" on decorative icons
- aria-live="polite" on CSS output
- ShortcutsModal with all keyboard shortcuts

**Keyboard shortcuts fixed:**
- Changed from Ctrl+C → Ctrl+Shift+C (browser conflict: copy)
- Changed from Ctrl+T → Ctrl+Shift+T (browser conflict: new tab)
- Changed from Ctrl+N → Ctrl+Shift+N (browser conflict: new window)

---

## Browser Shortcuts to Avoid

When implementing keyboard shortcuts in CreatorKit tools, avoid these browser default shortcuts:

| Shortcut | Browser Action |
|----------|----------------|
| Ctrl+R | Refresh page |
| Ctrl+T | New tab |
| Ctrl+N | New window |
| Ctrl+S | Save page |
| Ctrl+O | Open file |
| Ctrl+C | Copy |
| Ctrl+V | Paste |
| Ctrl+Z | Undo |
| Ctrl+Enter | Submit form |

**Recommended approach**: Use `Ctrl+Shift+` modifiers (e.g., Ctrl+Shift+R, Ctrl+Shift+T)

---

### Session v1.68.0 (May 2026) - Background Remover Full Rebuild

#### Overview
Comprehensive rebuild of `background-remover.tsx` across 10 commits: three removal methods, unified canvas architecture, global Repair mode, Smooth Edge post-processing, mobile layout simplification, and full accessibility compliance.

#### Rules Compliance Fixes (Standalone Commit)
- Layout aligned to rules.md: `flex flex-1 flex-col min-h-0` root, scrollable `p-4` wrapper, `rounded-xl border` panels card
- Mobile footer changed to `fixed bottom-0 z-20` with `env(safe-area-inset-bottom)` inset
- Conditional kbd class pattern applied (blackout fix on toggle buttons)
- Focus rings corrected from `focus:` to `focus-visible:` throughout

#### Three Removal Methods
- **Auto** — HuggingFace RMBG-1.4 AI on desktop; color-threshold on mobile (existing feature, now one of three)
- **Magic Eraser** — Photoshop Background Eraser behavior: samples color at brush tip center; erases only pixels within radius matching sampled color within tolerance; safe near foreground objects because the tip reads a different color
- **Brush Eraser** — Freehand manual eraser with adjustable brush size

#### Unified Canvas Architecture
- `canvasRef` activates immediately on image upload; no separate input/output state
- All methods and Repair operate on the same canvas; Download captures current canvas state
- Phase state machine: `"idle" | "loading-model" | "processing" | "canvas"`
- `originalDataRef` stores post-removal image data so Repair brush references the correct baseline

#### Repair Mode (Global)
- Repair button always visible in header once an image is loaded; works on top of all three methods
- `restoreActive` flag overrides canvas interactions regardless of active method
- Canvas handlers: `if (removalMethod === "auto" && !restoreActive) return` (was blocking Auto mode repair)
- Renamed "Restore" to "Repair" in all UI strings; internal names kept as `restoreActive` / `runRestoreBrush` to avoid rename collisions
- `Ctrl+Shift+Z` shortcut

#### Smooth Edge
- Box blur on alpha channel only (radius 2); feathers transparent cut edges without touching RGB values
- Always available when `imageEl` is set; `Ctrl+Shift+F` shortcut

#### UX Simplification
- Removed Upload button from header and footer
- Removed Apply button (direct-to-canvas model: methods apply immediately, Download captures state)
- No em dashes anywhere in the file

#### Mobile Layout (3-Row Header)
- Row 1: title + ShortcutsModal
- Row 2 (conditional on `imageEl`): `role="group"` wrapper with labeled Repair + Smooth Edge buttons (icon + text label)
- Row 3: Upload / Canvas tab switcher
- Footer: Remove Background + Download (Auto); Download only (Magic / Brush)

#### Accessibility
- Method selector: `role="radiogroup"` + `role="radio"` + `aria-checked` (not `aria-pressed`, which is for toggles)
- All focus rings use `focus-visible:` variant
- `aria-live="polite"` region for all phase transition announcements
- `role="img"` + descriptive `aria-label` on canvas
- `role="progressbar"` with `aria-valuenow / aria-valuemin / aria-valuemax`

#### Commits
| Hash | Description |
|------|-------------|
| e349ad9 | rules.md compliance fixes |
| 7d3f3d1 | manual brush eraser edit mode |
| 19dee48 | magic eraser + method selector (initial flood fill) |
| 34b1087 | corrected magic eraser to hotspot-sampling behavior |
| 2b80f4e | unified canvas + instant erase/repair + smooth edge |
| e4f1409 | global Repair button for all methods |
| ac6f8d2 | rename Restore to Repair + Ctrl+Shift+Z + header tidy |
| c3246c2 | remove Upload+Apply from header, strip em dashes |
| 2975899 | mobile layout: Repair+Smooth in header, simple footer |
| dd34f8f | accessibility compliance pass |

---

## Session v1.76.0 (May 2026) — Color Converter Compliance Pass + Custom Color Picker

### Overview
Full rules.md compliance pass (14 issues) on `color-converter.tsx`, followed by replacing the browser-native `<input type="color">` with a custom visual color picker matching the design from `design-token-generator.tsx`.

### Rules Compliance Fixes (14 issues)
| Issue | Fix |
|---|---|
| Named export | → `export default` |
| `Ctrl+Shift+C` Copy All — `C` hard-conflict | → `Ctrl+Shift+V` |
| Keyboard handler: capture phase | Removed; input guard added |
| Mobile bottom bar: `shrink-0` | → `fixed bottom-0 left-0 right-0 z-20 backdrop-blur-sm` |
| No scrollable layout | Panels wrapped in `rounded-xl border` card in `flex-1 overflow-y-auto` |
| `focus:` on all interactive elements | → `focus-visible:` |
| Color swatch missing accessible label | `role="img"` + `aria-label` added |
| RGB breakdown no group label | `role="group"` + `aria-label` + `aria-live="polite"` |
| Format code blocks no live region | `aria-live="polite"` added |
| No screen reader announcements | `announceToScreenReader` added for copy + invalid color |
| No usage guide | Added: How to use, Keyboard shortcuts, Tips |
| No footer spacer | `md:hidden h-[60px]` spacer added |
| Mobile tablist no `aria-label` | Added `aria-label="Panel selection"` |
| Action bar kbd badge color | → `border-primary-foreground/30 bg-primary-foreground/20` |

### Custom Color Picker Feature
| Decision | Rationale |
|---|---|
| Replaced native `<input type="color">` | Native browser picker is visually inconsistent across platforms and lacks the split SL + hue UX |
| Matches design-token-generator pattern exactly | Design consistency; reuses proven drag logic |
| Pointer Events API with `setPointerCapture` | Single unified handler for mouse and touch; no separate touch event listeners needed |
| `useMemo` for initial HSL + separate h/s/l state | Prevents stale closure; allows picker to re-initialise when `value` prop changes externally |
| Swatch trigger button with `aria-haspopup="dialog"` | Screen readers announce expandable picker correctly |
| Separate text input preserved below picker | Allows pasting `rgb()` / `hsl()` values which the picker alone cannot accept |

### Commits
| Hash | Message |
|---|---|
| 657eae2 | fix: full compliance pass on color-converter |
| b44e9cf | feat: replace native color input with custom visual picker in color-converter |

---

## Session v1.75.0 (May 2026) — Code Playground Overhaul

### Overview
Full rules.md compliance pass (12 issues), mobile bottom bar fix, tool title, usage guide, and layout refactor for `code-playground.tsx`. Multiple design iterations refined the guide placement before landing on the standard scrollable layout.

### Rules Compliance Fixes (12 issues)
| Issue | Fix |
|---|---|
| Named export | → `export default`; `page.tsx` updated |
| `Ctrl+S` bare shortcut | → `Ctrl+Shift+S` |
| `Ctrl+R` bare shortcut | → `Ctrl+Enter` |
| `Ctrl+Shift+R` unimplemented + R hard-conflict | → `Ctrl+Shift+E` for Reset, wired in handler |
| Keyboard handler: capture phase + stopPropagation | Removed; input guard added |
| Mobile Preview tab showed placeholder text | Now renders live iframe |
| Tab buttons `focus:` | → `focus-visible:` |
| Clear All button `focus:` | → `focus-visible:` |
| Textarea editors `focus:` | → `focus-visible:` |
| Checkbox `focus:` | → `focus-visible:` |
| Download ZIP kbd badge wrong class | → `border-primary-foreground/30 bg-primary-foreground/20` |
| Unused `iframeRef` | Removed |

### Mobile Bottom Bar Fix
Split into `hidden md:flex shrink-0` (desktop) and `md:hidden fixed bottom-0 left-0 right-0 z-20` (mobile). Textareas use `flex-1 min-h-0`; tabpanel is `flex flex-col`; `h-14` spacer prevents content hiding behind fixed bar.

### Accessibility Additions
Tab buttons have `id` + `aria-controls="editor-panel"`. Tabpanel has `id="editor-panel"` + `aria-labelledby` for proper ARIA tab/panel relationship.

### Tool Title
Desktop: inline in toolbar. Mobile: dedicated compact header row above the toolbar.

### Guide Placement — Design Iteration
Three approaches explored before landing on the correct one:
1. **Modal (Info button)** — discarded: required user to find and click an icon
2. **Embedded in right panel below preview** — discarded: shrank the live preview at 100% zoom, felt distracting
3. **Standard scrollable layout with guide below panels card** — adopted: matches `aes-encryptor` and `base64-encoder` exactly; preview gets full `min-h-[500px]` height; guide accessible by scrolling

### Key lesson documented
For full-screen editor tools, the standard scrollable layout with `min-h-[500px]` panels card is still the right approach. The card grows to fill the viewport; the guide sits below it; users scroll to access it without disrupting the editor.

### Commits
| Hash | Message |
|---|---|
| 1da608f | fix: full compliance pass on code-playground |
| 8311a6e | fix: mobile bottom bar + accessibility |
| c586bbd | feat: add usage guide modal (later replaced) |
| a8975bb | feat: inline guide + tool title |
| f2049ca | refactor: move guide below panels card (final) |

---

## Session v1.74.0 (May 2026) — BPM Detector Compliance Pass + Three New Features

### Overview
Full rules.md compliance pass (20 issues) on `bpm-detector.tsx` plus three fully client-side feature additions: tap tempo, ½×/2× BPM correction, and copy BPM.

### Rules Compliance Fixes (20 issues)
| Issue | Fix |
|---|---|
| `Ctrl+O` bare shortcut + `O` hard-conflict | → `Ctrl+Shift+U` |
| Named export | → `export default`; `page.tsx` updated |
| No keyboard input guard | Added |
| No `announceToScreenReader` | Added (analyze start + BPM result) |
| "Analyze again" visible on mobile | Hidden with `hidden md:inline` |
| Mobile bottom bar `shrink-0` | → fixed viewport bottom |
| Missing scrollable wrapper + panels card | Added |
| Missing usage guide | Added |
| Missing footer spacer | Added |
| Redundant `<>` wrapper | Removed |
| Mobile header `pb-1` | → `pb-2` |
| Mobile tablist missing `aria-label` | Added |
| Mobile tab buttons no focus ring | Added |
| Error display plain `<p>` | → `role="alert"` pattern |
| Drop zone not keyboard accessible | Added `role="button"` + `tabIndex` + `onKeyDown` + `aria-label` |
| "Analyze again" no `aria-label` or focus ring | Added |
| Confidence bar no progressbar ARIA | Added `role="progressbar"` with full aria values |
| Detect BPM kbd badge wrong class | → `border-primary-foreground/30 bg-primary-foreground/20` |
| Drop zone hint showed `Ctrl+O` | Updated to `Ctrl+Shift+U` |

### New Features
- **Tap Tempo** — large dashed tap button in left panel; averages last 8 intervals; resets after 2.5 s; live BPM shown; Copy BPM button appears after 2+ taps
- **½× / 2× BPM correction** — two buttons below the result; each previews target value; tempo label and genre update live; disabled at extremes (< 30 or > 300)
- **Copy BPM** — copy icon next to "BPM" label; copies `displayBpm` (reflects corrections); `Ctrl+Shift+V` shortcut; separate `fileCopied` and `tapCopied` states

### Commits
| Hash | Message |
|---|---|
| f1f2ac2 | fix: full compliance pass on bpm-detector |
| 9184eec | feat: add tap tempo, BPM correction, and copy BPM |

---

## Session v1.73.0 (May 2026) — Box Shadow Generator Full Compliance Pass

### Overview
Full rules.md compliance audit and rewrite of `shadow-generator.tsx`. 18 issues identified and fixed.

### Rules Compliance Fixes (18 issues)
| Issue | Fix |
|---|---|
| `Ctrl+Shift+C` hard conflict (copy CSS) | → `Ctrl+Shift+V` |
| `Ctrl+Shift+N` hard conflict (add layer) | → `Ctrl+Shift+X` |
| ShortcutsModal showed `["Ctrl", "N"]` | → `["Ctrl", "Shift", "X"]` and `["Ctrl", "Shift", "V"]` |
| Keyboard handler: capture phase + stopPropagation | Removed; input guard added |
| Arrow keys switched layers even when slider focused | Added `role === "slider"` guard to skip |
| Mobile bottom bar `shrink-0` | → `fixed bottom-0 left-0 right-0 z-20 backdrop-blur-sm` |
| Missing scrollable wrapper + panels card | Added `flex-1 overflow-y-auto p-4` + `rounded-xl border` |
| Missing usage guide | Added (How to use, Keyboard shortcuts, Tips) |
| Missing footer spacer | Added |
| Redundant `<>` wrapper | Removed |
| Mobile header `pb-1` | → `pb-2` |
| Mobile tablist missing `aria-label` | Added `aria-label="Panel selection"` |
| Mobile tab buttons no focus ring | Added `focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-inset` |
| Layer tab buttons `focus:` | → `focus-visible:` |
| Remove layer button `focus:` | → `focus-visible:` |
| All three color inputs `focus:` | → `focus-visible:` |
| Inset switch label missing hint | Added `Tab + Space` two-badge hint |
| All 5 slider labels missing hints | Added `Tab + ← →` two-badge hints |

### Commits
| Hash | Message |
|---|---|
| 0960839 | fix: full compliance pass on shadow-generator |

---

## Session v1.72.0 (May 2026) — Border Radius Visualizer Full Compliance Pass

### Overview
Full rules.md compliance audit and rewrite of `border-radius-visualizer.tsx`. 16 issues identified and fixed across layout, accessibility, keyboard shortcuts, and mobile UX.

### Rules Compliance Fixes (16 issues)
| Issue | Fix |
|---|---|
| `Ctrl+Shift+C` hard conflict | → `Ctrl+Shift+V` (Copy CSS) |
| Keyboard handler capture phase `true` | Removed; Ctrl+Shift shortcuts now fire inside inputs |
| Mobile bottom bar `shrink-0` | → `fixed bottom-0 left-0 right-0 z-20 backdrop-blur-sm` |
| Missing footer spacer | Added `h-[60px]` inside scrollable area |
| Panels not in scrollable wrapper | Wrapped in `flex-1 overflow-y-auto p-4` + `rounded-xl border` card |
| Mobile header `pb-1` | → `pb-2` |
| Mobile tablist missing `aria-label` | Added `aria-label="Panel selection"` |
| Mobile tab buttons missing focus ring | Added `focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-inset` |
| Preset buttons `focus:` | → `focus-visible:` |
| Box color input `focus:` | → `focus-visible:` |
| Mobile unit radios missing ARIA | Added `role="radio"` and `aria-checked` |
| Corner sliders missing nav hints | Added two-badge `Tab` + `← →` hints (desktop only) |
| Linked button kbd badge not conditional | Added conditional class for active/inactive states |
| Redundant `<>` wrapper | Removed |
| ShortcutsModal stale shortcut | Updated to show `Ctrl+Shift+V` |
| Missing usage guide | Added 3-section guide (How to use, Keyboard shortcuts, Tips) |

### Commits
| Hash | Message |
|---|---|
| 5ebb9f2 | fix: full compliance pass on border-radius-visualizer |

---

## Session v1.71.0 (May 2026) — Batch Image Editor Full Compliance Pass

### Overview
Full rules.md compliance audit, UX restructure, and accessibility additions for `batch-image-editor.tsx` across four commits.

### Rules Compliance Fixes (12 issues)
| Issue | Fix |
|---|---|
| `Ctrl+Shift+O` / `Ctrl+Shift+C` hard conflicts | → `Ctrl+Shift+U` / `Ctrl+Shift+X` |
| Mobile bottom bar `shrink-0` | → `fixed bottom-0 left-0 right-0 z-20 backdrop-blur-sm` |
| Missing footer spacer | Added `h-[60px]` inside scrollable area |
| Edge-to-edge layout | → scrollable `p-4` wrapper + `rounded-xl border` panels card |
| Keyboard handler capture phase | Removed `true`; `Ctrl+Shift` shortcuts work inside inputs |
| `focus:` on format buttons + number inputs | → `focus-visible:` throughout |
| `tablist` missing `aria-label` | Added `aria-label="Panel selection"` |
| Tab buttons missing focus rings | Added `focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-inset` |
| Mobile header `pb-1` | → `pb-2` |
| Redundant `<>` fragment | Removed |

### UX Restructure
- Upload area and Clear All moved into the Settings (left) panel — first tab on mobile
- Preview empty state shows hint pointing to Settings
- Auto-switches to Preview tab after processing completes

### Accessibility Additions
- `role="progressbar"` with `aria-valuenow/min/max` shown in Settings panel during processing
- Two-badge `Tab + ← →` hints on Quality, Brightness, Contrast, Output Format labels (desktop only)
- Two-badge `Tab + Space` hints on Resize and Grayscale switch labels (desktop only)
- Lesson learned: a single `← →` badge looks like a clickable arrow button. Two-badge format (`Tab` then `← →`) makes the Tab-first sequence unambiguous. Documented in rules.md Section 3.

### Usage Guide Added
- Steps and tips card below panels

### Commits
| Hash | Description |
|---|---|
| 08d1ca2 | fix: rules compliance + UX pass for batch-image-editor |
| 938cfc7 | fix: add role=progressbar to batch-image-editor during processing |
| 6d95559 | feat: add keyboard nav hint labels to settings controls (desktop only) |
| 67e41bf | fix: show Tab+key hint on settings controls, not key alone |

---

## Session v1.70.0 (May 2026) — Background Remover Download Flash + PRD

### Background Remover: Download Button Visual Feedback
Added `downloading` boolean state. On click the Download button flips from `variant="default"` (white) to `variant="outline"` (dark) for 1500ms, then resets.

**Root cause of initial bug:** the first implementation had the variants swapped — the button was dark at rest and flashed white on click. Root insight: in this app's dark theme `variant="default"` = white/primary and `variant="outline"` = dark with border. Inverting the condition fixed it. This is now documented in rules.md Section 17.

Conditional kbd badge class also updated for each state to avoid the blackout bug.

Also cleaned up three pre-existing unused hints: `Minus` and `Plus` imports, and the `handleImageClick` function.

### PRD.md Created
Product Requirements Document written in Markdown following international PM standard format. Sections: Executive Summary, Problem Statement, Goals with metrics, three Target User personas, Scope (in/out), per-tool feature requirements, Non-Functional Requirements (performance, security, compatibility, accessibility), User Stories, Technical Constraints, Success Metrics, Roadmap with status, Risks and Assumptions table, Open Questions, Appendix with glossary and external standards links.

### Commits
| Hash | Description |
|---|---|
| 9bd2c44 | feat: flash download button dark on trigger in background-remover |
| c4a3db5 | fix: correct download button white/black states in background-remover |

---

## Session v1.69.0 (May 2026) — Base64 Encoder Full Compliance Pass

### Overview
Full rules.md compliance audit and feature pass on `base64-encoder.tsx` across two commits: rules compliance and accessibility fixes, then usage guide and layout restructure.

### Rules Compliance Fixes
| Issue | Fix |
|---|---|
| Hard-conflict shortcuts C/D/O | Replaced with V/S/U per Section 5 |
| Mobile bottom bar `shrink-0` | Changed to `fixed bottom-0 left-0 right-0 z-20 backdrop-blur-sm` |
| Footer spacer outside scrollable area | Moved inside `overflow-y-auto` wrapper |
| Keyboard handler blocked all shortcuts in textarea | Now only blocks non-Ctrl shortcuts; capture phase removed |
| Error display plain text | Rebuilt to Section 18 styled card (`rounded-lg border border-destructive/50 bg-destructive/5`) |
| Download btn kbd blackout | Changed to `border-primary-foreground/30 bg-primary-foreground/20` |
| Encode/Decode kbd blackout on active state | Conditional kbd class applied |
| Mobile header `pb-1` | Corrected to `pb-2` |
| Mobile Enc/Dec no `aria-label` | Added "Switch to Encode/Decode mode" |
| Mobile tab buttons no focus ring | Added `focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-inset` |
| Deprecated `unescape`/`escape` | Replaced with `TextEncoder`/`TextDecoder` |

### New Shortcuts
- `Ctrl+Shift+E` — encode mode (conditional kbd on button)
- `Ctrl+Shift+Z` — decode mode (conditional kbd on button)
- `Ctrl+Shift+F` — focus input textarea; switches to input tab on mobile
- Focus hint label: subtle `Ctrl+Shift+F` overlay at bottom-right of empty input panel, desktop only, disappears on typing

### Usage Guide and Layout Restructure
- Panels wrapped in `rounded-xl border min-h-[500px]` card per Type A layout (Section 3)
- Scrollable content area: `flex-1 overflow-y-auto p-4 space-y-4`
- Usage guide card: four sections — What it does, How to use (5 ordered steps), Keyboard shortcuts (inline kbd), Tips with privacy note last

### Commits
| Hash | Description |
|---|---|
| d0fbdc7 | fix: rules compliance and accessibility audit for base64-encoder |
| 3422787 | feat: add usage guide and scrollable layout to base64-encoder |

---

## All Tools List (71 Total)

### Security (7 tools)
- **Metadata Remover** — Strip location, device info, timestamps from images, PDFs, audio
- **Password Generator** — Cryptographically secure passwords
- **QR Code Generator** — URL, text, email, phone, Wi-Fi
- **File Checksum Verifier** — MD5, SHA-1, SHA-256, SHA-512
- **AES Encrypt / Decrypt** — AES-256-GCM with PBKDF2-SHA256
- **RSA Key Generator** — RSA-OAEP 2048/4096-bit key pairs
- **TOTP / 2FA Generator** — RFC 6238 compatible

### Image & Visual (9 tools)
- **Image Resizer** — 40+ sizes across 12 platforms
- **Image Compressor** — JPEG, WebP, PNG with quality control
- **Image Format Converter** — JPEG, PNG, WebP, AVIF conversion
- **Image Watermark Adder** — Text watermarks with position/size
- **Image to Text** — AI OCR 100% in-browser
- **Screenshot to Mockup** — Device frames with custom backgrounds
- **Background Remover** — AI-powered (desktop) / color removal (mobile)
- **Image Grid / Collage** — 2×2, 3×3, 1×3, 3×1 layouts
- **Color Palette Extractor** — Dominant colors with percentages

### Design (9 tools)
- **Design Token Generator** — Brand colors to CSS/Tailwind/JSON
- **Favicon Generator** — 6 sizes + site.webmanifest
- **Color Converter** — HEX, RGB, HSL, OKLCH with picker
- **Gradient Generator** — Linear, radial, conic gradients
- **Box Shadow Generator** — Multiple layers, inset support
- **Border Radius Visualizer** — Per-corner sliders with presets
- **Font Pairer** — 70 Google Fonts, 14 curated pairings
- **OG Image Generator** — 4 templates, 1200×630 PNG
- **Pixel → REM Converter** — px/rem with reference table

### Productivity (13 tools)
- **Anki Flashcards** — SM-2 algorithm, local storage
- **Whiteboard Drawing** — Pen, shapes, text, PNG export
- **Markdown Editor** — Live preview, scroll sync, file upload
- **Notes** — Multiple notes, auto-save, word count
- **Word & Character Counter** — Words, chars, sentences, paragraphs
- **CV Maker** — Classic/Modern templates, PDF export
- **Invoice Generator** — Multi-currency, line items, PDF export
- **Pomodoro Timer** — 25/5/15 cycles, Web Audio bell
- **Game Controller Tester** — Gamepad API, real-time states
- **Doc Scanner** — Perspective warp, brightness/contrast
- **Electrical Calculator** — Ohm's Law, AC reactance, three-phase
- **Engineering Calculator** — DEG/RAD trig, constants, memory
- **Math Calculator** — REPL-style, variables, matrices

### Media (7 tools)
- **BPM Detector** — Audio tempo detection
- **Audio Converter** — MP3, WAV, OGG, FLAC, AAC, M4A, WMA, OPUS
- **Voice Recorder** — MediaRecorder API, WebM export
- **Audio Waveform Visualizer** — Web Audio API, seek controls
- **Screen Recorder** — getDisplayMedia, mic mixing
- **Video Thumbnail Extractor** — Grid/interval mode, ZIP download
- **Video Compressor** — ffmpeg.wasm, quality presets

### PDF (5 tools)
- **PDF Compressor** — Quality settings, size targets
- **PDF Merger & Splitter** — Merge/split by page ranges
- **Image to PDF** — A4, Letter, fit options
- **PDF Organizer** — Reorder, delete, thumbnails
- **PDF to Image** — Adjustable resolution, ZIP export

### Developer (17 tools)
- **Code Playground** — HTML/CSS/JS live editor
- **Text Compare** — Diff highlighting, export options
- **Regex Tester** — Real-time matching, pattern library
- **JSON Formatter** — Validate, format, minify
- **CSV ↔ JSON Converter** — Table preview, file upload
- **Text Case Converter** — Upper, lower, title, camel, snake, kebab
- **UUID Generator** — Single/bulk v4 generation
- **Base64 Encoder / Decoder** — Text and file support
- **URL Encoder / Decoder** — encodeURIComponent, encodeURI
- **Lorem Ipsum Generator** — Paragraphs, sentences, words
- **Timestamp Converter** — Unix, ISO 8601, UTC, local, relative
- **JWT Decoder** — Header, payload, expiry inspection
- **HTML Entity Encoder / Decoder** — Special characters
- **CSS Minifier** — Whitespace, comments, byte savings
- **Cron Expression Generator** — Presets, descriptions, next runs
- **XML Formatter** — Format, minify, validation
- **YAML ↔ JSON Converter** — js-yaml powered
- **JS Formatter** — Prettier 2.8.8, 8 languages
- **Markdown → HTML** — marked powered

---

### Currently Live (71 tools)

All tools now include:
- Screen reader announcements (aria-live regions)
- Keyboard shortcuts using Ctrl+Shift+ modifiers (non-conflicting)
- Visible kbd shortcut labels on buttons
- Focus-visible ring states
- Proper role and aria attributes
- ShortcutsModal component for reference

### v1.63.0 Achievements

This session standardized keyboard shortcut display format across 17 tools:
- Converted 40+ shortcuts from `<span>Ctrl</span><span>Shift</span><span>X</span>` to `Ctrl+Shift+X` format
- Fixed build error in video-compressor.tsx
- Build verified: 79/79 pages compiled successfully

### v1.62.0 Achievements

This session added:
- 4 more tools with full accessibility (anki-card, audio-converter, audio-waveform-visualizer, background-remover)
- Fixed keyboard shortcut conflicts in 18+ tools
- Removed em dashes from 13 tool page descriptions
- Total 71 tools with accessibility features

---

## Known Issues & Technical Debt

### High Priority

1. **ffmpeg.wasm CDN dependency**: Loaded from unpkg.com at runtime - supply chain risk. Should host locally in /public/ffmpeg/

### Completed

- **80+ tools have accessibility features**: All tools now include screen reader announcements (aria-live regions), keyboard shortcuts using Ctrl+Shift+ modifiers (non-conflicting), visible kbd shortcut labels on buttons, focus-visible ring states, proper role and aria attributes, and ShortcutsModal component for reference
- **Keyboard shortcut conflicts resolved**: All standard browser shortcuts replaced with Ctrl+Shift+ combinations across 18+ tools

### Medium Priority

1. Vercel Analytics needs continued monitoring
2. TypeScript ignoreBuildErrors should be removed eventually
3. No rate limiting on batch processing (process 3-5 at a time recommended)

### Low Priority

1. JavaScript obfuscation (optional)
2. No max dimension limit on custom image sizes (cap at 9999)
3. Blog posts for SEO keyword targeting

---

## Session Notes

- Added ShortcutsModal component to tools that didn't have it
- Used aria-hidden="true" on decorative icons (Lucide icons)
- Added focus-visible rings for keyboard navigation
- Used role="region" with aria-labelledby for section labeling
- Screen reader announcements via announceToScreenReader function
- Wrapped return statements in React Fragment (<>) for multiple siblings

---

## Files Created/Modified This Session

| File | Action |
|------|--------|
| components/tools/font-pairer.tsx | Fixed accessibility + shortcuts |
| components/tools/gamepad-tester.tsx | Fixed accessibility + shortcuts |
| components/tools/gradient-generator.tsx | Fixed accessibility + shortcuts |
| chat-session-history.md | Created comprehensive history |

---

## Next Steps (Pending)

1. Host ffmpeg.wasm locally to reduce CDN dependency
2. Build new tools from roadmap
3. Buy custom domain and rebrand

## Session Summary

### This Session (v1.62.0)
Added accessibility features to 4 more tools and fixed keyboard shortcut conflicts:
- anki-card.tsx
- audio-converter.tsx
- audio-waveform-visualizer.tsx
- background-remover.tsx

Fixed keyboard shortcuts in 18+ tools to use Ctrl+Shift+ modifiers:
- base64-encoder, batch-image-editor, border-radius-visualizer, color-converter, color-palette-extractor, css-minifier, csv-json-converter, cv-maker, doc-scanner, favicon-generator, file-checksum-verifier, markdown-editor, shadow-generator

Removed em dashes from 13 tool page descriptions for better readability.

---

### Previous Session (v1.61.0)
Added accessibility features to 9 more tools:
- url-encoder.tsx
- uuid-generator.tsx
- video-compressor.tsx
- video-thumbnail-extractor.tsx
- voice-recorder.tsx
- whiteboard-drawing.tsx
- word-counter.tsx
- xml-formatter.tsx
- yaml-converter.tsx

All keyboard shortcuts now use Ctrl+Shift+ modifiers to avoid browser conflicts. Each tool includes:
- Screen reader announcements via announceToScreenReader
- aria-live regions for status updates
- role and aria attributes throughout
- Focus-visible ring states on all interactive elements
- ShortcutsModal component for keyboard shortcut reference

---

## Technical Investigation Notes

### Console Script Tag Warning
- **Issue**: "Encountered a script tag while rendering React component"
- **Investigation**: Confirmed NOT caused by markdown-to-html.tsx changes
- **Root cause**: Pre-existing script tags in code-playground.tsx (lines 85, 109 in srcDoc template literals) AND next-themes ThemeProvider
- **Status**: Pre-existing issue, unrelated to accessibility work

---

---

## Session v1.63.0 (May 2026) - Keyboard Shortcut Format Standardization

### Task Completed
Converted 40+ keyboard shortcuts across 17 files from separate `<span>` elements to compact `Ctrl+Shift+X` format.

**Format change:**
- Before: `<kbd className="..."><span>Ctrl</span><span>Shift</span><span>X</span></kbd>`
- After: `<kbd className="...">Ctrl+Shift+X</kbd>`

### Files Updated

| File | Shortcuts Converted |
|------|---------------------|
| word-counter.tsx | Ctrl+Shift+X (Clear) |
| xml-formatter.tsx | Ctrl+Shift+F, Ctrl+Shift+M, Ctrl+Shift+C, Ctrl+Shift+D |
| yaml-converter.tsx | Ctrl+Shift+Y, Ctrl+Shift+J, Ctrl+Shift+S, Ctrl+Shift+C, Ctrl+Shift+D |
| regex-tester.tsx | Ctrl+Shift+C |
| rsa-key-generator.tsx | Ctrl+Shift+G, Ctrl+Shift+P, Ctrl+Shift+L |
| screen-recorder.tsx | Ctrl+Shift+R, Ctrl+Shift+S |
| rubiks-timer.tsx | Ctrl+Shift+S |
| screenshot-to-mockup.tsx | Ctrl+Shift+D |
| text-case-converter.tsx | Ctrl+Shift+C, Ctrl+Shift+D |
| text-compare.tsx | Ctrl+Shift+S, Ctrl+Shift+X, Ctrl+Shift+C, Ctrl+Shift+D |
| timestamp-converter.tsx | Ctrl+Shift+N |
| totp-generator.tsx | Ctrl+Shift+D, Ctrl+Shift+C |
| url-encoder.tsx | Ctrl+Shift+E, Ctrl+Shift+D, Ctrl+Shift+S, Ctrl+Shift+{shortcut}, Ctrl+Shift+C |
| uuid-generator.tsx | Ctrl+Shift+H, Ctrl+Shift+G, Ctrl+Shift+C, Ctrl+Shift+B, Ctrl+Shift+D |
| video-compressor.tsx | Ctrl+Shift+C, Ctrl+Shift+D, Ctrl+Shift+{index+1} (×3 presets) |
| voice-recorder.tsx | Ctrl+Shift+R, Ctrl+Shift+S |
| video-thumbnail-extractor.tsx | Ctrl+Shift+E, Ctrl+Shift+D |

### Build Fix
- Fixed duplicate closing `</kbd>` tag in video-compressor.tsx that caused build error
- After fix: Build passed with 79/79 pages compiled successfully

### Technical Details
- Changed kbd class from complex inline styles to simplified: `rounded border border-border bg-muted px-1 text-[10px]`
- Maintained accessibility by keeping kbd elements visible
- Dynamic shortcuts (e.g., Ctrl+Shift+{index + 1}) handled separately in url-encoder and video-compressor

---

---

## Session v1.65.0 (May 2026) — Anki Flashcards Mobile Header & Browse Button Fix

### Changes Made

#### 1. Mobile header layout refactor (`anki-card.tsx`)
The mobile header was crowded with title + streak stats + History icon + Trash icon + ShortcutsModal all in one row.

**Before:**
```
[Anki Flashcards  1d streak  3 total]  [🕐 🗑️ ⌨️ ?]
```

**After — two rows:**
```
Row 1: [Anki Flashcards]               [🕐 🗑️ ⌨️ ?]
Row 2: [1d streak · 3 total reviewed]               (only shown when history exists)
```

Implementation: Changed the mobile header `<div>` from `flex items-center justify-between` (single row) to `flex flex-col` (two stacked rows). Stats row uses `pb-2` and renders conditionally on `Object.keys(studyLog).length > 0`.

#### 2. Browse button kbd blackout fix (`anki-card.tsx`)
The `Ctrl+Shift+Y` keyboard shortcut badge on the Browse button appeared black/opaque when Browse was active.

**Root cause**: Same issue as Study and Add Card buttons — `variant="default"` gives the button a dark primary background, but the `kbd` was using `border-border bg-muted` which rendered as a dark/black box on that dark background.

**Fix**: Made the `kbd` class conditional:
- Active (dark bg): `border-primary-foreground/30 bg-primary-foreground/20`
- Inactive (ghost): `border-border bg-muted`

### Commit
`d20e4d2` — fix: unclutter mobile header and fix Browse kbd blackout in anki-card

---

---

## Session v1.66.0 (May 2026) — Audio Converter Rebuild, AES Improvements, CSP Fix

### 1. Audio Converter — full rebuild (`audio-converter.tsx`)

**Problem**: The tool relied entirely on ffmpeg.wasm (~25MB CDN download) for all formats. This caused: CDN failures, long load times, and audio playback not working (blob URL duration = 0:00).

**Root cause of playback bug**: ffmpeg output streams lack seek-index metadata, so `<audio src={blobUrl}>` can't determine duration. Also, the CSP had no `media-src` directive, so browsers silently blocked blob URL playback entirely.

**Solution**:
- WAV: pure Web Audio API (`AudioContext.decodeAudioData` → PCM → RIFF header written in JS). Zero deps, instant, correct duration.
- MP3: lamejs (`pnpm add lamejs`). Encodes decoded PCM to MP3. ~100KB, instant, correct duration.
- OGG/FLAC/AAC/M4A/WMA/OPUS: kept ffmpeg.wasm as fallback — these need a proper encoder library that doesn't exist in pure JS.
- Format UI split into two labelled groups so users know upfront which formats require a download.

**Other fixes in this file**:
- Garbled `âœ"` checkmark → `<Check>` icon from lucide
- Keyboard shortcuts: `O` (Bookmarks) → `U`; `D` (Bookmarks) → `S`; `T` (new tab) removed
- Layout rebuilt to rules.md: `rounded-xl border` card, scrollable `p-4` wrapper, usage guide
- Mobile bottom bar: `shrink-0` flow → `fixed bottom-0 z-20`
- Active tab: `text-primary` → `text-foreground`
- Warning now conditional (header only, only when ffmpeg format selected)
- Format kbd numbers: `hidden md:inline`

### 2. CSP fix — `next.config.mjs`

Added `media-src 'self' blob:`. Without this directive, the browser falls back to `default-src 'self'` which blocks blob URLs for `<audio>` and `<video>`. This was silently preventing playback in Audio Converter, Voice Recorder, Screen Recorder, Audio Waveform Visualizer, and Video Compressor.

### 3. AES Encryptor improvements (`aes-encryptor.tsx`)

- New shortcuts: `Ctrl+Shift+E` (encrypt mode), `Ctrl+Shift+L` (decrypt mode)
- Copy shortcut: `Ctrl+Shift+C` → `Ctrl+Shift+V` (C conflicts with DevTools Inspector in Chrome/Firefox/Edge)
- Usage guide card added below panels
- Layout: `rounded-xl border min-h-[500px]` panels card, `p-4 space-y-4` scrollable wrapper
- Em dashes removed from all guide sentences
- ShortcutsModal added to mobile header

### 4. rules.md created

New file documenting all CreatorKit standards. 20 sections:
1. Core Principles, 2. Tech Stack, 3. Desktop Layout, 4. Mobile Layout, 5. Keyboard Shortcuts, 6. Accessibility, 7. Component Patterns, 8. Writing Standards, 9. Color Conventions, 10. File Conventions, 11. Build & Deploy, 12. SSR Hydration, 13. Modal/Portal Pattern, 14. Tool Layout Types, 15. WASM Loading, 16. Stats Display, 17. Copy Pattern, 18. Error Display, 19. Badge Pattern, 20. Responsive Breakpoints

### Key commits
- `990b373` — refactor: rebuild audio-converter with native WAV/MP3
- `acfc62d` — fix: hide format kbd number badges on mobile
- `bac8ba7` — fix: use direct src on audio element for blob URL playback
- `0fb5ceb` — fix: add media-src blob: to CSP (root cause of silent playback block)
- `a3b3812` — feat: improve aes-encryptor shortcuts, layout, and usage guide
- `cbdb5a7` — fix: add ShortcutsModal to aes-encryptor mobile header
- `c69f0b3` — docs: add CreatorKit standards and rules reference (rules.md)

---

---

## Session v1.67.0 (May 2026) — Audio Waveform Visualizer Full Rebuild

### Changes Made

#### 1. Rules compliance audit and fixes (`audio-waveform-visualizer.tsx`)

Ran full rules.md audit. Issues found and fixed:

| Issue | Fix |
|---|---|
| Layout edge-to-edge (v1.64 style) | Rebuilt with scrollable `p-4`, panels in `rounded-xl border` card, usage guide below |
| Mobile bottom bar `shrink-0` | Changed to `fixed bottom-0 left-0 right-0 z-20` |
| `bg-white/20` on outline buttons (blackout bug) | Changed all to `border-border bg-muted` |
| `Ctrl+Shift+O` (Bookmarks conflict) | Changed to `Ctrl+Shift+U` |
| No usage guide | Added usage guide card with steps, export format guide, tips |

#### 2. Audio playback restored

Previously removed because blob URL playback was broken. Root cause was the missing `media-src blob:` CSP directive (fixed in v1.66.0). Playback now works correctly.

**Implementation:**
- `URL.createObjectURL(file)` → stored in `blobUrlRef`
- `new Audio(url)` → stored in `audioRef`
- `timeupdate` listener → `setCurrentTime(audio.currentTime)`
- `ended` listener → reset to start, set `isPlaying(false)`
- `togglePlay()` calls `audio.play()` / `audio.pause()`
- Cleanup: `audio.pause()` + `URL.revokeObjectURL()` on new file load and component unmount
- Canvas redraws on every `currentTime` change with playhead position
- `Space` key triggers `togglePlay()`

**Visual playhead:**
- Red `#ef4444` vertical line at `playPct * canvasWidth`
- Subtle `rgba(255,255,255,0.12)` overlay on the played region
- Progress bar below the canvas mirrors the playhead position

#### 3. Canvas drag-to-seek (mouse + touch)

**Problem with click-only:** On touchscreen, a "click" fires after `touchend` and is imprecise. Users expect to drag/scrub the playhead like in Spotify or SoundCloud.

**Solution:**
```tsx
const isDragging = useRef(false)

const seekTo = (clientX: number) => {
  const rect = canvasRef.current!.getBoundingClientRect()
  const pct = (clientX - rect.left) / rect.width
  audio.currentTime = pct * duration
  setCurrentTime(pct * duration)
}

// Mouse
onMouseDown → isDragging=true + seekTo
onMouseMove → if isDragging: seekTo
onMouseUp / onMouseLeave → isDragging=false

// Touch
onTouchStart → e.preventDefault() + isDragging=true + seekTo
onTouchMove  → e.preventDefault() + if isDragging: seekTo
onTouchEnd   → isDragging=false
```

Key: `style={{ touchAction: "none" }}` on the canvas + `e.preventDefault()` in touch handlers stop the browser from scrolling the page while the user is scrubbing. `select-none` prevents text-selection highlight during drag.

#### 4. Canvas buffer sizing bug fixed

**Bug:** `drawWaveform` read `canvas.width` (pixel buffer size) then set `canvas.width = W * dpr`. With `dpr=2`, each call doubled the buffer: 300 → 600 → 1200 → 2400 → exponential growth. During playback (`timeupdate` fires ~4 times/sec), this would crash the tab within seconds.

**Fix:** Use `canvas.clientWidth` / `canvas.clientHeight` (CSS layout size, stable) instead:
```tsx
// Before (bug)
const { width: W, height: H } = canvas  // reads buffer, not layout
// After (fix)
const W = canvas.clientWidth || 800
const H = canvas.clientHeight || 200
```

### Key commits
- `bf9a561` — refactor: rebuild audio-waveform-visualizer — rules compliance + playback restored
- `6e72acb` — feat: add drag-to-seek and touch scrubbing to waveform canvas

---

*Last updated: 2026-05-14*
*This file should be updated after each development session for future reference.*