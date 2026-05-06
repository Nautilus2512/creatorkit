# CreatorKit Changelog


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
