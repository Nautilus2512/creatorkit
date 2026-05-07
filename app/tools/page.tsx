"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { ArrowRight, Crop, Palette, Shield, Image, Lock, QrCode, Minimize2, Globe, Hash, Layers, Monitor, Brain, Wand2, Music2, FileDown, Combine, Code, Pen, FileText, GitCompare, Search, FileJson, FileSpreadsheet, Type, Binary, Link2, AlignLeft, Pipette, BookType, Timer, KeyRound, Braces, Minimize, CalendarClock, FileCode, ShieldCheck, KeySquare, Smartphone, ArrowRightLeft, Ruler, Blend, BoxSelect, SquareDashedBottom, FileCode2, Clock4, Mic, NotebookPen, Images, Paintbrush2, Film, Music, ScreenShare, LayoutGrid, Video, SlidersHorizontal, FileStack, FileImage, Contact, ALargeSmall } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ShortcutsModal } from "@/components/shortcuts-modal"

const toolCards = [
  {
    icon: Shield,
    title: "Metadata Remover",
    description: "Strip location, device info, and timestamps from your images, PDFs, and audio files locally.",
    href: "/tools/metadata-remover",
    stat: "Batch up to 20 files",
    category: "Privacy & Security",
  },
  {
    icon: Crop,
    title: "Image Resizer",
    description: "Resize one image into 40 platform sizes instantly without uploading to any server.",
    href: "/tools/image-resizer",
    stat: "40+ sizes across 12 platforms",
    category: "Image & Visual",
  },
  {
    icon: Palette,
    title: "Design Token Generator",
    description: "Turn your brand colors into a complete CSS design system in seconds.",
    href: "/tools/design-tokens",
    stat: "CSS, Tailwind & JSON export",
    category: "Design & Branding",
  },
  {
    icon: Lock,
    title: "Password Generator",
    description: "Generate strong, random passwords. Nothing is sent anywhere.",
    href: "/tools/password-generator",
    stat: "Cryptographically secure",
    category: "Privacy & Security",
  },
  {
    icon: QrCode,
    title: "QR Code Generator",
    description: "Create QR codes for URLs, text, and contact info. Fully offline, nothing is sent.",
    href: "/tools/qr-code-generator",
    stat: "URL, text, email, phone, Wi-Fi",
    category: "Privacy & Security",
  },
  {
    icon: Minimize2,
    title: "Image Compressor",
    description: "Compress images and reduce file size without quality loss. Runs entirely in your browser.",
    href: "/tools/image-compressor",
    stat: "JPEG, WebP, PNG · Batch up to 20",
    category: "Image & Visual",
  },
  {
    icon: Image,
    title: "Image Format Converter",
    description: "Convert between JPG, PNG, WebP, AVIF, and more. Instant conversion with no uploads.",
    href: "/tools/image-format-converter",
    stat: "JPEG, PNG, WebP, AVIF · Batch up to 20",
    category: "Image & Visual",
  },
  {
    icon: Globe,
    title: "Favicon Generator",
    description: "Generate favicons in all sizes from text or an image. No server required.",
    href: "/tools/favicon-generator",
    stat: "6 sizes + site.webmanifest",
    category: "Design & Branding",
  },
  {
    icon: Hash,
    title: "File Checksum Verifier",
    description: "Compute MD5, SHA-1, SHA-256, and SHA-512 hashes for any file. Paste an expected hash to verify integrity.",
    href: "/tools/file-checksum-verifier",
    stat: "MD5 · SHA-1 · SHA-256 · SHA-512",
    category: "Privacy & Security",
  },
  {
    icon: Layers,
    title: "Image Watermark Adder",
    description: "Add custom text watermarks to your images. Choose position, size, opacity, and font. Fully local.",
    href: "/tools/image-watermark-adder",
    stat: "JPG, PNG, WebP · Live preview",
    category: "Image & Visual",
  },
  {
    icon: Monitor,
    title: "Screenshot to Mockup",
    description: "Wrap any screenshot inside a browser, phone, laptop, or tablet frame with a custom background.",
    href: "/tools/screenshot-to-mockup",
    stat: "4 device frames · 10 backgrounds",
    category: "Design & Branding",
  },
  {
    icon: Brain,
    title: "Anki Flashcards",
    description: "Spaced repetition flashcards powered by the SM-2 algorithm. Your decks live in your browser, never on a server.",
    href: "/tools/anki-card",
    stat: "SM-2 algorithm · localStorage · offline",
    category: "Productivity",
  },
  {
    icon: Wand2,
    title: "Background Remover",
    description: "Remove image backgrounds automatically with AI on desktop, or by color on mobile. Outputs transparent PNG.",
    href: "/tools/background-remover",
    stat: "AI model on desktop · color removal on mobile",
    category: "Image & Visual",
  },
  {
    icon: Music2,
    title: "BPM Detector",
    description: "Detect the tempo of any audio file in beats per minute. Works entirely in your browser.",
    href: "/tools/bpm-detector",
    stat: "MP3, WAV, OGG, M4A · First 60s analyzed",
    category: "Productivity",
  },
  {
    icon: FileDown,
    title: "PDF Compressor",
    description: "Compress PDFs by removing metadata and optimizing structure. All processing happens locally in your browser.",
    href: "/tools/pdf-compress",
    stat: "Metadata removal · Object streams",
    category: "Privacy & Security",
  },
  {
    icon: Combine,
    title: "PDF Merger & Splitter",
    description: "Merge multiple PDFs into one or split a PDF by page ranges. All processing happens locally in your browser.",
    href: "/tools/pdf-merger",
    stat: "Merge unlimited · Split by ranges",
    category: "Privacy & Security",
  },
  {
    icon: Code,
    title: "Code Playground",
    description: "Live HTML/CSS/JS editor with instant preview. Write, test, and download your code. Runs entirely in your browser.",
    href: "/tools/code-playground",
    stat: "Live preview · Download as ZIP",
    category: "Productivity",
  },
    {
    icon: Music2,
    title: "Audio Converter",
    description: "Convert between MP3, WAV, OGG, FLAC, AAC, M4A, WMA, and OPUS formats. Powered by ffmpeg.wasm, runs entirely in your browser.",
    href: "/tools/audio-converter",
    stat: "8 formats · Quality settings",
    category: "Productivity",
  },
  {
    icon: Pen,
    title: "Whiteboard Drawing",
    description: "Draw, sketch, and create diagrams with shapes, colors, and text. Export as PNG. All client-side, no server required.",
    href: "/tools/whiteboard-drawing",
    stat: "Drawing tools · Export PNG",
    category: "Productivity",
  },
  {
    icon: FileText,
    title: "Markdown Editor",
    description: "Write and preview markdown with live rendering, scroll sync, and GitHub-style formatting.",
    href: "/tools/markdown-editor",
    stat: "Live preview · GitHub-style",
    category: "Productivity",
  },
  {
    icon: GitCompare,
    title: "Text Compare",
    description: "Compare text and files with visual diff highlighting, line-by-line analysis, and export options.",
    href: "/tools/text-compare",
    stat: "Visual diff · File support",
    category: "Productivity",
  },
  {
    icon: Search,
    title: "Regex Tester",
    description: "Test and debug regular expressions with real-time matching, highlighting, and common pattern library.",
    href: "/tools/regex-tester",
    stat: "Real-time matching · Common patterns",
    category: "Productivity",
  },
  {
    icon: FileJson,
    title: "JSON Formatter",
    description: "Format, validate, and minify JSON with real-time error highlighting and syntax checking.",
    href: "/tools/json-formatter",
    stat: "Format · Validate · Minify",
    category: "Productivity",
  },
  {
    icon: FileSpreadsheet,
    title: "CSV ↔ JSON Converter",
    description: "Convert between CSV and JSON formats with table preview and file upload support.",
    href: "/tools/csv-json-converter",
    stat: "CSV ↔ JSON · File upload",
    category: "Productivity",
  },
  {
    icon: Type,
    title: "Text Case Converter",
    description: "Convert text between upper, lower, title, camel, snake, and kebab cases with real-time preview.",
    href: "/tools/text-case-converter",
    stat: "5 cases · Real-time",
    category: "Productivity",
  },
  {
    icon: Hash,
    title: "UUID Generator",
    description: "Generate cryptographically secure UUID v4s with bulk generation options.",
    href: "/tools/uuid-generator",
    stat: "v4 UUIDs · Bulk generation",
    category: "Productivity",
  },
  {
    icon: Binary,
    title: "Base64 Encoder / Decoder",
    description: "Encode text or files to Base64, or decode Base64 back to plain text. Everything runs in your browser.",
    href: "/tools/base64-encoder",
    stat: "Encode · Decode · File upload",
    category: "Productivity",
  },
  {
    icon: Link2,
    title: "URL Encoder / Decoder",
    description: "Encode or decode URL components and full URLs with encodeURIComponent and encodeURI.",
    href: "/tools/url-encoder",
    stat: "encodeURIComponent · encodeURI",
    category: "Productivity",
  },
  {
    icon: AlignLeft,
    title: "Lorem Ipsum Generator",
    description: "Generate placeholder text by paragraphs, sentences, or words for your designs and mockups.",
    href: "/tools/lorem-ipsum",
    stat: "Paragraphs · Sentences · Words",
    category: "Productivity",
  },
  {
    icon: Pipette,
    title: "Color Converter",
    description: "Convert colors between HEX, RGB, HSL, and OKLCH formats. Use the color picker or type any format.",
    href: "/tools/color-converter",
    stat: "HEX · RGB · HSL · OKLCH",
    category: "Design & Branding",
  },
  {
    icon: BookType,
    title: "Word & Character Counter",
    description: "Count words, characters, sentences, paragraphs, and estimate reading and speaking time instantly.",
    href: "/tools/word-counter",
    stat: "Words · Chars · Reading time",
    category: "Productivity",
  },
  {
    icon: Timer,
    title: "Timestamp Converter",
    description: "Convert between Unix timestamps and human-readable dates. Supports ISO 8601, UTC, and local time.",
    href: "/tools/timestamp-converter",
    stat: "Unix · ISO 8601 · UTC · Local",
    category: "Productivity",
  },
  {
    icon: KeyRound,
    title: "JWT Decoder",
    description: "Decode and inspect JSON Web Tokens — view header, payload, expiry, and issued-at time. Nothing leaves your browser.",
    href: "/tools/jwt-decoder",
    stat: "Header · Payload · Expiry check",
    category: "Privacy & Security",
  },
  {
    icon: Braces,
    title: "HTML Entity Encoder / Decoder",
    description: "Encode special characters to HTML entities or decode them back. Includes a quick-insert reference bar.",
    href: "/tools/html-entity-encoder",
    stat: "Encode · Decode · Swap",
    category: "Productivity",
  },
  {
    icon: Minimize,
    title: "CSS Minifier",
    description: "Remove whitespace and comments from CSS. See exact byte savings. Upload a .css file or paste directly.",
    href: "/tools/css-minifier",
    stat: "Comments · Whitespace · Download .min.css",
    category: "Productivity",
  },
  {
    icon: CalendarClock,
    title: "Cron Expression Generator",
    description: "Build cron expressions with presets, human-readable descriptions, and next 5 scheduled run times.",
    href: "/tools/cron-generator",
    stat: "Presets · Description · Next runs",
    category: "Productivity",
  },
  {
    icon: FileCode,
    title: "XML Formatter",
    description: "Format or minify XML with structure validation. Adjust indentation, upload files, or paste directly.",
    href: "/tools/xml-formatter",
    stat: "Format · Minify · Validate",
    category: "Productivity",
  },
  {
    icon: ShieldCheck,
    title: "AES Encrypt / Decrypt",
    description: "Encrypt and decrypt text with AES-256-GCM and PBKDF2 key derivation. Nothing leaves your browser.",
    href: "/tools/aes-encryptor",
    stat: "AES-256-GCM · PBKDF2 · 100k iterations",
    category: "Privacy & Security",
  },
  {
    icon: KeySquare,
    title: "RSA Key Generator",
    description: "Generate RSA-OAEP key pairs in PEM format. Choose 2048 or 4096-bit. Download public and private keys.",
    href: "/tools/rsa-key-generator",
    stat: "2048 / 4096-bit · PKCS#8 · SPKI",
    category: "Privacy & Security",
  },
  {
    icon: Smartphone,
    title: "TOTP / 2FA Generator",
    description: "Generate time-based OTP codes from a base32 secret. Compatible with Google Authenticator.",
    href: "/tools/totp-generator",
    stat: "HMAC-SHA1 · RFC 6238 · 30s · 6 digits",
    category: "Privacy & Security",
  },
  {
    icon: ArrowRightLeft,
    title: "YAML ↔ JSON Converter",
    description: "Convert between YAML and JSON formats with file upload, download, and indent control.",
    href: "/tools/yaml-converter",
    stat: "YAML → JSON · JSON → YAML · Swap",
    category: "Productivity",
  },
  {
    icon: Ruler,
    title: "Pixel → REM Converter",
    description: "Convert between px and rem units with a configurable root font size and clickable reference table.",
    href: "/tools/pixel-to-rem",
    stat: "px ↔ rem · Reference table · Custom base",
    category: "Design & Branding",
  },
  {
    icon: Blend,
    title: "Gradient Generator",
    description: "Build CSS linear, radial, and conic gradients visually. Add color stops and copy the CSS instantly.",
    href: "/tools/gradient-generator",
    stat: "Linear · Radial · Conic · Copy CSS",
    category: "Design & Branding",
  },
  {
    icon: BoxSelect,
    title: "Box Shadow Generator",
    description: "Build CSS box-shadows visually with multiple layers. Adjust offsets, blur, spread, color, and opacity.",
    href: "/tools/shadow-generator",
    stat: "Multi-layer · Inset · Live preview",
    category: "Design & Branding",
  },
  {
    icon: SquareDashedBottom,
    title: "Border Radius Visualizer",
    description: "Build CSS border-radius values visually. Control each corner independently with presets and sliders.",
    href: "/tools/border-radius-visualizer",
    stat: "Per-corner · Presets · px or %",
    category: "Design & Branding",
  },
  {
    icon: FileCode2,
    title: "Markdown → HTML",
    description: "Convert Markdown to HTML with live preview and raw HTML output. File upload and download supported.",
    href: "/tools/markdown-to-html",
    stat: "Live preview · Raw HTML · Download",
    category: "Productivity",
  },
  {
    icon: Clock4,
    title: "Rubik's Cube Timer",
    description: "Speedcubing timer with random scrambles, 15s inspection countdown, and session statistics.",
    href: "/tools/rubiks-timer",
    stat: "Scrambles · Ao5 · Ao12 · Best",
    category: "Productivity",
  },
  {
    icon: Mic,
    title: "Voice Recorder",
    description: "Record audio directly in your browser. Play back and download recordings. Nothing is uploaded.",
    href: "/tools/voice-recorder",
    stat: "Record · Playback · Download",
    category: "Productivity",
  },
  {
    icon: NotebookPen,
    title: "Notes",
    description: "Quick notes saved to your browser's localStorage. Multiple notes with titles and auto-save.",
    href: "/tools/notes",
    stat: "localStorage · Auto-save · Multi-note",
    category: "Productivity",
  },
  {
    icon: Images,
    title: "Image to PDF",
    description: "Combine multiple images into a PDF. Arrange order, choose page size (A4, Letter, or fit). All in your browser.",
    href: "/tools/image-to-pdf",
    stat: "JPG · PNG · WebP · Page size options",
    category: "Privacy & Security",
  },
  {
    icon: FileStack,
    title: "PDF Organizer",
    description: "Reorder and delete PDF pages using visual thumbnails. Download the reorganized PDF instantly.",
    href: "/tools/pdf-organizer",
    stat: "Visual thumbnails · Reorder · Delete pages",
    category: "Privacy & Security",
  },
  {
    icon: FileImage,
    title: "PDF to Image",
    description: "Convert PDF pages to PNG images. Adjust export resolution and download all pages as a ZIP.",
    href: "/tools/pdf-to-image",
    stat: "PNG export · Resolution control · ZIP download",
    category: "Privacy & Security",
  },
  {
    icon: Paintbrush2,
    title: "Color Palette Extractor",
    description: "Extract dominant colors from any image. Copy as HEX, RGB, or HSL with frequency percentages.",
    href: "/tools/color-palette-extractor",
    stat: "HEX · RGB · HSL · Up to 12 colors",
    category: "Design & Branding",
  },
  {
    icon: Film,
    title: "Video Thumbnail Extractor",
    description: "Extract frames from any video as JPG images. Choose grid mode or time interval. Download as ZIP.",
    href: "/tools/video-thumbnail-extractor",
    stat: "Grid or interval · JPG · ZIP download",
    category: "Productivity",
  },
  {
    icon: Music,
    title: "Audio Waveform Visualizer",
    description: "Visualize audio waveforms and play back any audio file. Click the waveform to seek.",
    href: "/tools/audio-waveform-visualizer",
    stat: "MP3 · WAV · OGG · FLAC · Clickable seek",
    category: "Productivity",
  },
  {
    icon: ScreenShare,
    title: "Screen Recorder",
    description: "Record your screen directly in the browser with optional microphone audio. Download as WebM.",
    href: "/tools/screen-recorder",
    stat: "Screen + audio · WebM · Nothing uploaded",
    category: "Productivity",
  },
  {
    icon: LayoutGrid,
    title: "Image Grid / Collage",
    description: "Arrange multiple images in a grid layout and export as a single PNG. Choose gap, background, and size.",
    href: "/tools/image-grid",
    stat: "2×2 · 3×3 · 1×3 · Export PNG",
    category: "Image & Visual",
  },
  {
    icon: Video,
    title: "Video Compressor",
    description: "Compress videos using ffmpeg.wasm with quality presets. No uploads — runs entirely in your browser.",
    href: "/tools/video-compressor",
    stat: "High · Balanced · Small · MP4 output",
    category: "Productivity",
  },
  {
    icon: SlidersHorizontal,
    title: "Batch Image Editor",
    description: "Resize, convert format, and adjust brightness/contrast on multiple images at once. Download as ZIP.",
    href: "/tools/batch-image-editor",
    stat: "Resize · Format · Filters · ZIP download",
    category: "Image & Visual",
  },
  {
    icon: Contact,
    title: "CV Maker",
    description: "Build a professional CV with live preview, Classic and Modern templates, and PDF export. Auto-saved locally.",
    href: "/tools/cv-maker",
    stat: "Live preview · 2 templates · PDF export",
    category: "Productivity",
  },
  {
    icon: ALargeSmall,
    title: "Font Pairer",
    description: "Browse and pair Google Fonts visually. Preview heading + body combos in light, dark, or sepia. Copy the CSS import instantly.",
    href: "/tools/font-pairer",
    stat: "70 fonts · 14 pairings · Light · Dark · Sepia",
    category: "Design & Branding",
  },
]


export default function ToolsPage() {
  const router = useRouter()
  const [activeCategory, setActiveCategory] = useState("All")
  const categories = ["All", "Image & Visual", "Privacy & Security", "Design & Branding", "Productivity"]
  const filtered = activeCategory === "All" ? toolCards : toolCards.filter(t => t.category === activeCategory)

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return
      if (e.key === "1") router.push("/tools/metadata-remover")
      if (e.key === "2") router.push("/tools/image-resizer")
      if (e.key === "3") router.push("/tools/design-tokens")
      if (e.key === "4") router.push("/tools/password-generator")
      if (e.key === "5") router.push("/tools/qr-code-generator")
      if (e.key === "6") router.push("/tools/image-compressor")
      if (e.key === "7") router.push("/tools/image-format-converter")
      if (e.key === "8") router.push("/tools/favicon-generator")
      if (e.key === "9") router.push("/tools/file-checksum-verifier")
      if (e.key === "0") router.push("/tools/image-watermark-adder")
      if (e.key === "m") router.push("/tools/screenshot-to-mockup")
      if (e.key === "a") router.push("/tools/anki-card")
      if (e.key === "b") router.push("/tools/background-remover")
      if (e.key === "t") router.push("/tools/bpm-detector")
      if (e.key === "p") router.push("/tools/pdf-compress")
      if (e.key === "x") router.push("/tools/pdf-merger")
      if (e.key === "c") router.push("/tools/code-playground")
      if (e.key === "a") router.push("/tools/audio-converter")
      if (e.key === "w") router.push("/tools/whiteboard-drawing")
      if (e.key === "m") router.push("/tools/markdown-editor")
      if (e.key === "d") router.push("/tools/text-compare")
      if (e.key === "r") router.push("/tools/regex-tester")
      if (e.key === "j") router.push("/tools/json-formatter")
      if (e.key === "c") router.push("/tools/csv-json-converter")
      if (e.key === "t") router.push("/tools/text-case-converter")
      if (e.key === "u") router.push("/tools/uuid-generator")
      if (e.key === "e") router.push("/tools/base64-encoder")
      if (e.key === "l") router.push("/tools/url-encoder")
      if (e.key === "i") router.push("/tools/lorem-ipsum")
      if (e.key === "o") router.push("/tools/color-converter")
      if (e.key === "n") router.push("/tools/word-counter")
      if (e.key === "s") router.push("/tools/timestamp-converter")
      if (e.key === "k") router.push("/tools/jwt-decoder")
      if (e.key === "h") router.push("/tools/html-entity-encoder")
      if (e.key === "f") router.push("/tools/css-minifier")
      if (e.key === "g") router.push("/tools/cron-generator")
      if (e.key === "v") router.push("/tools/xml-formatter")
      if (e.key === "z") router.push("/tools/aes-encryptor")
      if (e.key === "q") router.push("/tools/rsa-key-generator")
      if (e.key === "y") router.push("/tools/totp-generator")
      if (e.key === ",") router.push("/tools/border-radius-visualizer")
      if (e.key === ".") router.push("/tools/markdown-to-html")
      if (e.key === ";") router.push("/tools/rubiks-timer")
      if (e.key === "'") router.push("/tools/voice-recorder")
      if (e.key === "[") router.push("/tools/notes")
      if (e.key === "]") router.push("/tools/cv-maker")
      if (e.key === "-") router.push("/tools/font-pairer")
    }
    window.addEventListener("keydown", handler)
    return () => window.removeEventListener("keydown", handler)
  }, [router])

  return (
    <>
      <div className="min-h-screen bg-background">
        {/* Top Nav */}
        <header className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur-sm">
          <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3 lg:px-8">
            <Link href="/" className="flex items-center gap-2 font-semibold tracking-tight">
              <svg width="24" height="26" viewBox="0 0 48 54" fill="none">
                <path d="M24 0 L48 9 L48 28 C48 41 37 50 24 54 C11 50 0 41 0 28 L0 9 Z" fill="#0f172a"/>
                <circle cx="11" cy="28" r="7" fill="#3b82f6"/>
                <circle cx="24" cy="28" r="7" fill="#8b5cf6"/>
                <circle cx="37" cy="28" r="7" fill="#f59e0b"/>
              </svg>
              CreatorKit
            </Link>
            <nav className="hidden items-center gap-6 text-sm text-muted-foreground sm:flex">
              <Link href="/#features" className="hover:text-foreground transition-colors">Features</Link>
              <Link href="/privacy" className="hover:text-foreground transition-colors">Privacy</Link>
            </nav>
            <Badge variant="outline" className="text-xs">All tools free</Badge>
          </div>
        </header>

        <main className="mx-auto max-w-6xl px-6 py-12 lg:px-8 lg:py-14 space-y-12">
          {/* Header banner */}
          <div className="rounded-2xl border border-border bg-muted/20 p-6 sm:p-8">
            <p className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">
              CreatorKit Tools
            </p>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
              Pick a tool to get started.
            </h1>
            <p className="mt-3 max-w-2xl text-muted-foreground">
              Privacy-first utilities for creators. Every tool runs 100% in your browser, no uploads to server anywhere and no tracking.
            </p>
          </div>

          {/* Category filter */}
          <div className="flex flex-wrap gap-2">
            {categories.map(cat => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`rounded-full border px-4 py-1.5 text-sm font-medium transition-colors ${
                  activeCategory === cat
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-muted/30 text-muted-foreground hover:border-primary/50 hover:text-foreground"
                }`}
              >
                {cat}
                {cat !== "All" && (
                  <span className="ml-1.5 text-xs opacity-60">
                    {toolCards.filter(t => t.category === cat).length}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Active tools */}
          <section className="grid gap-5 md:grid-cols-3">
            {filtered.map((tool) => (
              <Link key={tool.href} href={tool.href} className="group block">
                <Card className="h-full border-border/80 bg-card/60 transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/50 hover:shadow-lg hover:shadow-primary/10 cursor-pointer">
                  <CardHeader className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="rounded-lg border border-border bg-muted/50 p-2 transition-colors group-hover:border-primary/30 group-hover:bg-primary/5">
                        <tool.icon className="h-5 w-5 text-primary" />
                      </div>
                      <Badge variant="secondary">Free</Badge>
                    </div>
                    <div>
                      <CardTitle className="text-xl">{tool.title}</CardTitle>
                      <CardDescription className="mt-1">{tool.description}</CardDescription>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <p className="text-xs text-muted-foreground border-t border-border pt-3">{tool.stat}</p>
                    <div className="flex items-center justify-between rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground">
                      Open Tool
                      <ArrowRight className="h-4 w-4" />
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </section>

          {/* Feedback link — tambahkan di sini */}
          <div className="mt-8 text-center text-xs text-muted-foreground">
            Have feedback or a tool suggestion?{" "}
            <a href="mailto:creatorkit.hello@gmail.com?subject=CreatorKit Feedback" className="underline hover:text-foreground">
              Send us a message
            </a>
          </div>
        </main>
      </div>

      <ShortcutsModal
        pageName="Tools Dashboard"
        shortcuts={[
          { keys: ["1"], description: "Open Metadata Remover" },
          { keys: ["2"], description: "Open Image Resizer" },
          { keys: ["3"], description: "Open Design Token Generator" },
          { keys: ["4"], description: "Open Password Generator" },
          { keys: ["5"], description: "Open QR Code Generator" },
          { keys: ["6"], description: "Open Image Compressor" },
          { keys: ["7"], description: "Image Format Converter" },
          { keys: ["8"], description: "Open Favicon Generator" },
          { keys: ["9"], description: "Open File Checksum Verifier" },
          { keys: ["0"], description: "Open Image Watermark Adder" },
          { keys: ["M"], description: "Open Screenshot to Mockup" },
          { keys: ["A"], description: "Open Anki Flashcards" },
          { keys: ["B"], description: "Open Background Remover" },
          { keys: ["T"], description: "Open BPM Detector" },
          { keys: ["p"], description: "Open PDF Compressor" },
          { keys: ["x"], description: "Open PDF Merger" },
          { keys: ["c"], description: "Open Code Playground" },
          { keys: ["a"], description: "Open Audio Converter" },
          { keys: ["w"], description: "Open Whiteboard Drawing" },
          { keys: ["m"], description: "Open Markdown Editor" },
          { keys: ["d"], description: "Open text-compare" },
          { keys: ["r"], description: "Open Regex Tester" },
          { keys: ["j"], description: "Open JSON Formatter" },
          { keys: ["c"], description: "Open CSV ↔ JSON Converter" },
          { keys: ["t"], description: "Open Text Case Converter" },
          { keys: ["u"], description: "Open UUID Generator" },
          { keys: ["e"], description: "Open Base64 Encoder / Decoder" },
          { keys: ["l"], description: "Open URL Encoder / Decoder" },
          { keys: ["i"], description: "Open Lorem Ipsum Generator" },
          { keys: ["o"], description: "Open Color Converter" },
          { keys: ["n"], description: "Open Word & Character Counter" },
          { keys: ["s"], description: "Open Timestamp Converter" },
          { keys: ["k"], description: "Open JWT Decoder" },
          { keys: ["h"], description: "Open HTML Entity Encoder" },
          { keys: ["f"], description: "Open CSS Minifier" },
          { keys: ["g"], description: "Open Cron Expression Generator" },
          { keys: ["v"], description: "Open XML Formatter" },
          { keys: ["z"], description: "Open AES Encrypt / Decrypt" },
          { keys: ["q"], description: "Open RSA Key Generator" },
          { keys: ["y"], description: "Open TOTP / 2FA Generator" },
          { keys: [","], description: "Open Border Radius Visualizer" },
          { keys: ["."], description: "Open Markdown → HTML" },
          { keys: [";"], description: "Open Rubik's Cube Timer" },
          { keys: ["'"], description: "Open Voice Recorder" },
          { keys: ["["], description: "Open Notes" },
          { keys: ["]"], description: "Open CV Maker" },
          { keys: ["-"], description: "Open Font Pairer" },
          { keys: ["?"], description: "Toggle this shortcuts panel" },
        ]}
      />
    </>
  )
}