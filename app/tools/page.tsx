"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { ArrowRight, Crop, Palette, Shield, Image, Lock, QrCode, Minimize2, Globe, Hash, Layers, Monitor, Brain, Wand2, Music2, FileDown, Combine, Code, Pen, FileText, GitCompare, Search, FileJson, FileSpreadsheet, Type, Binary, Link2, AlignLeft, Pipette, BookType, Timer, KeyRound, Braces, Minimize, CalendarClock } from "lucide-react"
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
          { keys: ["?"], description: "Toggle this shortcuts panel" },
        ]}
      />
    </>
  )
}