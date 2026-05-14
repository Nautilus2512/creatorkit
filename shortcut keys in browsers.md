# Browser Keyboard Shortcuts Reference

Use this as a checklist when assigning custom tool shortcuts. Any key listed here is taken by the browser and must not be used for tool shortcuts.

---

## Ctrl+Shift + Letter — Full Cross-Browser Audit

| Key | Chrome | Firefox | Edge | Safari | Opera | Status |
|-----|--------|---------|------|--------|-------|--------|
| A | — | Extensions manager | Search tabs | — | — | ❌ CONFLICT |
| B | Bookmarks bar toggle | Bookmarks toolbar | Favorites bar | — | Bookmarks | ❌ CONFLICT |
| C | Inspector (DevTools) | Inspector (DevTools) | Inspector (DevTools) | Web Inspector | Inspector | ❌ CONFLICT |
| D | Bookmark all tabs | Bookmark all tabs | Add to favorites | — | — | ❌ CONFLICT |
| E | — | — | Search sidebar | — | — | ⚠️ Edge only |
| F | — | Full screen toggle | Find (DevTools) | — | — | ⚠️ Firefox only |
| G | Find previous | Find previous | Find previous | — | Find previous | ❌ CONFLICT |
| H | — | History sidebar | History panel | — | — | ⚠️ Firefox/Edge |
| I | DevTools (Elements) | Web Console | DevTools | Web Inspector | DevTools | ❌ CONFLICT |
| J | Downloads | Browser Console | DevTools Console | — | — | ❌ CONFLICT |
| K | — | Web Console | Duplicate tab | — | — | ❌ CONFLICT |
| L | — | — | Reading list / sidebar | — | — | ⚠️ Edge only |
| M | Device toolbar (DevTools) | Responsive Design Mode | Profile / account menu | — | — | ❌ CONFLICT |
| N | New incognito window | New private window | New InPrivate window | New private window | New private window | ❌ CONFLICT |
| O | Bookmarks manager | Bookmarks library | Favorites | — | — | ❌ CONFLICT |
| P | — | New private window | Print (some versions) | — | — | ⚠️ Firefox only |
| Q | — | — | — | Quit | — | ⚠️ Safari only |
| R | Hard reload | Hard reload | Hard reload | Hard reload | Hard reload | ❌ CONFLICT |
| S | — | — | Save as / Screenshot (some) | — | — | ⚠️ Edge some versions |
| T | Reopen closed tab | Reopen closed tab | Reopen closed tab | — | Reopen closed tab | ❌ CONFLICT |
| U | — | View page source | Report issue | — | — | ⚠️ Firefox only |
| V | — | — | — | — | — | ✅ SAFE |
| W | Close window | Close window | Close window | Close window | Close window | ❌ CONFLICT |
| X | — | — | — | — | — | ✅ SAFE |
| Y | — | Downloads | — | — | — | ⚠️ Firefox only |
| Z | Redo (editing) | Redo (editing) | Redo (editing) | Redo (editing) | Redo (editing) | ⚠️ Editing context only — safe at page level when handler skips inputs |

**Confirmed safe for Ctrl+Shift: V, X**

---

## Other Commonly Conflicting Shortcuts

### Navigation
- `Alt+Left` / `Alt+Right` — Back / Forward (all browsers)
- `F5` / `Ctrl+R` — Reload
- `Ctrl+Shift+R` — Hard reload (bypass cache)
- `Escape` — Stop loading / close overlay (acceptable for tool dialogs)
- `F11` — Toggle fullscreen
- `Alt+F4` — Close window (Windows OS level)

### Tabs & Windows
- `Ctrl+T` — New tab
- `Ctrl+W` — Close tab
- `Ctrl+Shift+T` — Reopen closed tab
- `Ctrl+N` — New window
- `Ctrl+Shift+N` — New incognito/private window
- `Ctrl+1` through `Ctrl+8` — Switch to tab by number
- `Ctrl+9` — Switch to last tab
- `Ctrl+Tab` / `Ctrl+Shift+Tab` — Cycle tabs

### Page
- `Ctrl+L` / `F6` — Focus address bar
- `Ctrl+F` — Find in page
- `Ctrl+G` / `F3` — Find next
- `Ctrl+Shift+G` / `Shift+F3` — Find previous
- `Ctrl+P` — Print
- `Ctrl+S` — Save page
- `Ctrl+U` — View page source
- `Ctrl++` / `Ctrl+-` / `Ctrl+0` — Zoom in / out / reset
- `Space` / `Shift+Space` — Scroll down / up (safe inside focused app panels)

### Editing (universal, all text fields)
- `Ctrl+A` — Select all
- `Ctrl+C` — Copy
- `Ctrl+X` — Cut
- `Ctrl+V` — Paste
- `Ctrl+Z` — Undo
- `Ctrl+Y` / `Ctrl+Shift+Z` — Redo (only inside text fields — safe at page level when handler skips inputs)
- `Ctrl+B` / `Ctrl+I` / `Ctrl+U` — Bold / Italic / Underline

### DevTools (only active when DevTools panel is open)
- `F12` / `Ctrl+Shift+I` — Open DevTools
- `Ctrl+Shift+J` — Console
- `Ctrl+Shift+C` — Inspect element
- `Ctrl+Shift+M` — Device toolbar

---

## Safe Zones for Custom Tool Shortcuts

| Pattern | Notes |
|---------|-------|
| `Ctrl+Shift+V` | ✅ Free in all major browsers |
| `Ctrl+Shift+X` | ✅ Free in all major browsers |
| `Ctrl+Enter` | ✅ Safe — no browser conflict |
| `Ctrl+Shift+Enter` | ✅ Safe |
| `Ctrl+Shift+S` | ⚠️ Minor conflict in Edge (Save As / Screenshot in some versions) — generally acceptable |
| `Ctrl+Shift+L` | ⚠️ Edge uses for Reading List in some versions — generally acceptable |
| `Alt+Letter` | ⚠️ Mostly safe on Windows except Alt+D (address bar), Alt+Left/Right (navigation), Alt+F4 (close) |
| Context keys (`Space`, `1–4`, `Enter`) | ✅ Safe when scoped to a focused tool panel, not firing globally |

---

## Current Tool Shortcut Assignments (anki-card.tsx)

| Shortcut | Action | Safe? |
|----------|--------|-------|
| `Ctrl+Shift+X` | Create new deck | ✅ |
| `Ctrl+Shift+V` | Add new card | ✅ |
| `Ctrl+Shift+S` | Start studying | ✅ (minor Edge caveat) |
| `Ctrl+Shift+L` | Switch to next deck | ✅ (minor Edge caveat) |
| `Ctrl+Shift+Enter` | Submit card form | ✅ |
| `Ctrl+Shift+Z` | Clear all data (with confirm) | ✅ Safe at page level |
| `Space` | Flip card (study mode only) | ✅ |
| `1` `2` `3` `4` | Rate card (study mode only) | ✅ |
| `Escape` | Cancel / close | ✅ |
| `?` | Toggle shortcuts panel | ✅ |
