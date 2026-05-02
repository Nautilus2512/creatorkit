"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { ArrowRight, Crop, Palette, Shield, Image, Lock, QrCode, Minimize2, Globe, Hash, Layers, Monitor, Brain, Wand2 } from "lucide-react"
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
    description: "Create QR codes for URLs, text, and contact info — all offline.",
    href: "/tools/qr-code-generator",
    stat: "URL, text, email, phone, Wi-Fi",
    category: "Privacy & Security",
  },
  {
    icon: Minimize2,
    title: "Image Compressor",
    description: "Reduce image file size without quality loss — entirely in your browser.",
    href: "/tools/image-compressor",
    stat: "JPEG, WebP, PNG · Batch up to 20",
    category: "Image & Visual",
  },
  {
    icon: Image,
    title: "Image Format Converter",
    description: "Convert between JPG, PNG, WebP, and more — instantly client-side.",
    href: "/tools/image-format-converter",
    stat: "JPEG, PNG, WebP, AVIF · Batch up to 20",
    category: "Image & Visual",
  },
  {
    icon: Globe,
    title: "Favicon Generator",
    description: "Generate favicons from text or image for your website — no server required.",
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
    description: "Add custom text watermarks to your images. Set position, size, opacity, and font — all locally.",
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
          { keys: ["?"], description: "Toggle this shortcuts panel" },
        ]}
      />
    </>
  )
}