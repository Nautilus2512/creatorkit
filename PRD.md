# Product Requirements Document — CreatorKit

| Field | Value |
|---|---|
| Document version | 1.0 |
| Status | Active |
| Last updated | May 2026 |
| Author | Nautilus2512 |
| Repository | github.com/Nautilus2512/creatorkit |
| Live URL | creatorkit-tools.vercel.app |

---

## 1. Executive Summary

CreatorKit is a free, privacy-first, browser-based utility suite for content creators, developers, and everyday users. Every tool runs entirely client-side — no data ever leaves the user's device. The product requires no account, no subscription, and no installation. Users open a URL and the tool works immediately.

---

## 2. Problem Statement

### 2.1 User problem
Content creators, developers, and small business owners regularly need simple utility tools — resizing images, encoding data, converting files, generating passwords, and more. The available options fall into two categories, both with significant drawbacks:

- **Desktop software** — requires installation, often paid, not available across devices.
- **Web-based tools** — require uploading sensitive files to a server, raise privacy concerns, show ads, require logins, and often charge for basic features.

### 2.2 Gap
There is no widely available, comprehensive, ad-free, privacy-safe utility suite that runs entirely in the browser without any server involvement.

### 2.3 Opportunity
A single product covering 70+ categories — image editing, encoding, encryption, PDF, media, design, and developer tools — with a consistent UI, zero cost to the user, and a strong privacy guarantee creates meaningful differentiation.

---

## 3. Goals and Objectives

### 3.1 Product goals

| Goal | Metric | Target |
|---|---|---|
| Privacy | % of tools with zero server calls | 100% |
| Breadth | Number of tools available | 80+ by end of 2026 |
| Accessibility | WCAG 2.1 AA compliance per tool | 100% of tools |
| Performance | Page load time (no WASM tools) | Under 2 seconds on 4G |
| Reliability | Vercel uptime | 99.9% |

### 3.2 Business goals

| Goal | Metric | Target |
|---|---|---|
| Organic traffic | Monthly unique visitors | 10,000 by end of 2026 |
| SEO | Google Search Console impressions | Growing month-over-month |
| Monetisation readiness | Payment infrastructure in place | Lemon Squeezy integrated |

---

## 4. Target Users

### 4.1 Primary persona — Content Creator

- **Who**: Freelance designers, video editors, social media managers, YouTubers
- **Devices**: Desktop (primary), mobile (secondary)
- **Pain points**: Need to resize images, remove backgrounds, compress files, generate QR codes. Do not want to install software or upload files to unknown servers.
- **Key tools used**: Image Resizer, Background Remover, QR Code Generator, Image Compressor

### 4.2 Secondary persona — Developer / Technical User

- **Who**: Front-end and full-stack developers, DevOps, students
- **Devices**: Desktop only
- **Pain points**: Need quick encoding, formatting, and conversion tools without leaving the browser or installing CLI tools.
- **Key tools used**: Base64 Encoder, JSON Formatter, UUID Generator, Regex Tester, JWT Decoder, AES Encryptor

### 4.3 Tertiary persona — General User / Small Business

- **Who**: Office workers, small business owners, students
- **Devices**: Mixed
- **Pain points**: Need PDF tools, invoice generation, and productivity utilities without paying for a subscription.
- **Key tools used**: PDF Merger, Invoice Generator, Word Counter, Pomodoro Timer, CV Maker

---

## 5. Scope

### 5.1 In scope

- 80+ browser-based utility tools across 7 categories
- Responsive layout supporting desktop and mobile screens
- Keyboard shortcuts and full accessibility (WCAG 2.1 AA) on every tool
- Vercel deployment with automatic CI/CD on push to `main`
- Privacy policy and terms of service pages
- Sitemap and SEO metadata for all tool pages

### 5.2 Out of scope

- User accounts, login, or authentication
- Cloud storage or file sync
- Server-side processing of user files
- Native mobile apps (iOS / Android)
- Browser extensions
- Real-time collaboration
- Paid tiers (deferred — infrastructure ready but not activated)

---

## 6. Feature Requirements

### 6.1 Tool categories and feature coverage

| Category | Current tools | Target |
|---|---|---|
| Image and Visual | 9 | 10 |
| Design | 9 | 10 |
| Developer | 19 | 20 |
| Productivity | 13 | 15 |
| Media | 7 | 8 |
| PDF | 5 | 6 |
| Security | 7 | 8 |

### 6.2 Per-tool requirements

Every tool must satisfy the following before it can be considered complete:

**Layout**
- Desktop: sticky top action bar, scrollable content area, panels in `rounded-xl border` card, usage guide card below
- Mobile: compact two-row header, tab switcher (for split-panel tools), fixed bottom action bar with 44px touch targets

**Keyboard shortcuts**
- All shortcuts use `Ctrl+Shift+` modifiers (no plain `Ctrl+` conflicts)
- No hard-conflict letters: A, B, C, D, G, I, J, K, M, N, O, R, T, W
- `ShortcutsModal` present in both desktop toolbar and mobile header

**Accessibility (WCAG 2.1 AA)**
- All buttons have `aria-label`
- All icons are `aria-hidden="true"`
- Toggle buttons have `aria-pressed`
- Errors use `role="alert"` with `aria-live="assertive"`
- Screen reader announcements on all significant actions
- Focus-visible rings on every interactive element

**Privacy**
- Zero network requests carrying user data
- No file uploads to any server
- WASM libraries loaded lazily from local hosting where possible

**Usage guide**
- Every tool includes a guide card with: what it does, how to use (ordered steps), keyboard shortcuts, tips (including privacy note)

### 6.3 Global product requirements

- All pages compile with zero build errors
- `pnpm build` must pass before any push to `main`
- Content Security Policy (CSP) headers on all responses
- No tracking beyond Vercel Analytics (anonymised, no personal data)
- No ads

---

## 7. Non-Functional Requirements

### 7.1 Performance

| Requirement | Target |
|---|---|
| Time to Interactive (non-WASM tools) | Under 2 seconds on 4G |
| WASM library load (ffmpeg, RMBG) | Lazy — only on user trigger, with loading indicator |
| Bundle size (per tool page) | No heavy imports at module level |

### 7.2 Security

| Requirement | Detail |
|---|---|
| CSP | Strict policy covering script-src, style-src, font-src, media-src, connect-src |
| No server routes | All tool logic is client-side only |
| No third-party data sharing | User files and inputs never leave the browser |
| HTTPS | Enforced by Vercel; HSTS header present |

### 7.3 Compatibility

| Requirement | Target |
|---|---|
| Browsers | Chrome, Firefox, Edge, Safari (latest 2 versions) |
| Screen sizes | 320px (mobile) to 2560px (large desktop) |
| Primary responsive breakpoint | 768px (`md:` in Tailwind) |

### 7.4 Accessibility

- WCAG 2.1 Level AA compliance on all tools
- Keyboard-navigable (Tab/Shift+Tab through all interactive elements)
- Screen reader compatible (VoiceOver, NVDA)
- Minimum touch target size: 44×44px on mobile

---

## 8. User Stories

### Image tools
- As a content creator, I want to resize my image to Instagram dimensions so that I can post without cropping manually.
- As a designer, I want to remove the background from a product photo so that I can place it on a custom backdrop.

### Developer tools
- As a developer, I want to encode a string to Base64 so that I can embed it in a data URL or API request.
- As a developer, I want to format and validate JSON so that I can read API responses clearly.
- As a developer, I want to decode a JWT so that I can inspect its claims without writing code.

### Security tools
- As a user, I want to generate a cryptographically secure password so that I do not reuse weak passwords.
- As a developer, I want to encrypt a message with AES-256 so that I can share it securely.

### Productivity tools
- As a student, I want to use spaced repetition flashcards so that I can study more efficiently.
- As a freelancer, I want to generate a professional invoice so that I can bill clients without buying software.

### PDF tools
- As an office worker, I want to merge two PDFs so that I can send one combined file.

---

## 9. Technical Constraints

| Constraint | Detail |
|---|---|
| Framework | Next.js 16 (App Router), React 19, TypeScript |
| Styling | Tailwind CSS v4, shadcn/ui components |
| Package manager | pnpm only |
| Hosting | Vercel free tier |
| Budget | $0 — all libraries must be free and open source |
| No backend | No API routes that carry user content |
| WASM | Allowed but must load lazily; ffmpeg.wasm currently loads from CDN (technical debt — should move to local /public/) |

---

## 10. Success Metrics

| Metric | How measured | Target |
|---|---|---|
| Monthly active users | Vercel Analytics | 10,000 by end of 2026 |
| Tool page visits | Vercel Analytics per-page | Even distribution across categories |
| Search impressions | Google Search Console | Growing month-over-month |
| Build health | `pnpm build` on push | Zero errors, always |
| Accessibility coverage | Manual audit per tool | 100% of tools complete |

---

## 11. Roadmap and Milestones

| Milestone | Description | Status |
|---|---|---|
| v1.0 | Launch with 3 tools | Done |
| v1.55 | 67 tools across 7 categories | Done |
| v1.64 | Responsive layout standardised across all tools | Done |
| v1.66 | rules.md standards document created | Done |
| v1.69 | Full compliance pass on Base64 Encoder | Done |
| v1.70+ | Remaining tools brought to full rules.md compliance | In progress |
| TBD | Custom domain and rebrand | Planned |
| TBD | Monetisation activation (Lemon Squeezy) | Planned |
| TBD | Move ffmpeg.wasm to local hosting | Planned |

---

## 12. Risks and Assumptions

### Risks

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| CDN dependency for ffmpeg.wasm | Medium | High — tool fails if CDN is down | Host locally in `/public/ffmpeg/` |
| HuggingFace API unavailable (Background Remover) | Low | Medium — desktop AI removal fails | Color-threshold fallback already in place |
| Vercel free tier limits hit | Low | High — site goes down | Monitor usage; upgrade plan if needed |
| Browser API deprecation (e.g. `unescape`, `escape`) | Medium | Low — TypeScript hints flag these | Replace with modern equivalents as found |

### Assumptions

- Users are on modern browsers (Chrome/Firefox/Edge/Safari, last 2 versions)
- Users accept that WASM tools require a one-time library download (~25MB for ffmpeg)
- Vercel Analytics provides sufficient insight without needing a third-party analytics platform
- The free tier of all dependencies remains available

---

## 13. Open Questions

| Question | Owner | Priority |
|---|---|---|
| When to activate paid tiers and what features to gate? | Product | Medium |
| Should ffmpeg.wasm be hosted locally or replaced with a lighter alternative? | Engineering | High |
| Which custom domain to use after rebranding? | Product | Low |
| Should a blog be added for SEO keyword targeting? | Product | Low |

---

## 14. Appendix

### 14.1 Key files

| File | Purpose |
|---|---|
| `rules.md` | Single source of truth for all code, design, and UX standards |
| `CHANGELOG.md` | Version history and per-release change log |
| `chat-session-history.md` | Full development session log |
| `PRD.md` | This document |

### 14.2 Glossary

| Term | Definition |
|---|---|
| Client-side | Code that runs in the user's browser, not on a server |
| WASM | WebAssembly — binary format allowing near-native performance in the browser |
| CSP | Content Security Policy — HTTP header restricting which resources a page can load |
| WCAG 2.1 AA | Web Content Accessibility Guidelines, Level AA — the international accessibility standard |
| shadcn/ui | Component library built on Radix UI primitives and Tailwind CSS |
| Type A layout | Split-panel (input/output) tool layout defined in rules.md Section 14 |

### 14.3 Related standards

- WCAG 2.1: https://www.w3.org/TR/WCAG21/
- WAI-ARIA 1.2: https://www.w3.org/TR/wai-aria-1.2/
- RFC 6238 (TOTP): https://datatracker.ietf.org/doc/html/rfc6238
