"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { ArrowRight, Crop, Palette, Shield, Image, FileText, Lock, QrCode, Wand2, Minimize2 } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ShortcutsModal } from "@/components/shortcuts-modal"

const toolCards = [
  {
    icon: Shield,
    title: "Metadata Remover",
    description: "Strip location, device info, and timestamps from your images, PDFs, and audio files locally.",
    href: "/tools/metadata-remover",
    stat: "Batch up to 20 files",
  },
  {
    icon: Crop,
    title: "Image Resizer",
    description: "Resize one image into 40 platform sizes instantly without uploading to any server.",
    href: "/tools/image-resizer",
    stat: "40+ sizes across 12 platforms",
  },
  {
    icon: Palette,
    title: "Design Token Generator",
    description: "Turn your brand colors into a complete CSS design system in seconds.",
    href: "/tools/design-tokens",
    stat: "CSS, Tailwind & JSON export",
  },
  {
    icon: Lock,
    title: "Password Generator",
    description: "Generate strong, random passwords. Nothing is sent anywhere.",
    href: "/tools/password-generator",
    stat: "Cryptographically secure",
  },
  {
    icon: QrCode,
    title: "QR Code Generator",
    description: "Create QR codes for URLs, text, and contact info — all offline.",
    href: "/tools/qr-code-generator",
    stat: "URL, text, email, phone, Wi-Fi",
  },
  {
    icon: Minimize2,
    title: "Image Compressor",
    description: "Reduce image file size without quality loss — entirely in your browser.",
    href: "/tools/image-compressor",
    stat: "JPEG, WebP, PNG · Batch up to 20",
  },
]

const comingSoonCards = [
  {
    icon: Wand2,
    title: "Background Remover",
    description: "Remove image backgrounds using an AI model that runs locally — no upload needed.",
    category: "Image & Visual",
  },
  {
    icon: Image,
    title: "Image Format Converter",
    description: "Convert between JPG, PNG, WebP, and more — instantly client-side.",
    category: "Image & Visual",
  },
  {
    icon: FileText,
    title: "Favicon Generator",
    description: "Generate favicons from text or image for your website — no server required.",
    category: "Design & Branding",
  },
]

export default function ToolsPage() {
  const router = useRouter()

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return
      if (e.key === "1") router.push("/tools/metadata-remover")
      if (e.key === "2") router.push("/tools/image-resizer")
      if (e.key === "3") router.push("/tools/design-tokens")
      if (e.key === "4") router.push("/tools/password-generator")
      if (e.key === "5") router.push("/tools/qr-code-generator")
      if (e.key === "6") router.push("/tools/image-compressor")
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
            <div className="mt-6 flex flex-wrap gap-6 border-t border-border pt-6 text-sm">
              <div><p className="font-semibold">6</p><p className="text-xs text-muted-foreground">Tools available</p></div>
              <div><p className="font-semibold">40+</p><p className="text-xs text-muted-foreground">Image size presets</p></div>
              <div><p className="font-semibold">12</p><p className="text-xs text-muted-foreground">Social platforms</p></div>
              <div><p className="font-semibold">100%</p><p className="text-xs text-muted-foreground">In-browser only</p></div>
            </div>
          </div>

          {/* Active tools */}
          <section className="grid gap-5 md:grid-cols-3">
            {toolCards.map((tool) => (
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

          {/* Coming Soon section */}
          <section className="space-y-5">
            <div className="flex items-center gap-3">
              <div className="h-px flex-1 bg-border" />
              <span className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">Coming Soon</span>
              <div className="h-px flex-1 bg-border" />
            </div>
            <p className="text-sm text-muted-foreground text-center">
              More privacy-first tools are on the way — all client-side, all free.
            </p>
            <div className="grid gap-4 md:grid-cols-3">
              {comingSoonCards.map((tool) => (
                <div key={tool.title} className="rounded-xl border border-border/50 bg-muted/10 p-4 opacity-60">
                  <div className="flex items-center justify-between mb-3">
                    <div className="rounded-lg border border-border bg-muted/50 p-2">
                      <tool.icon className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <Badge variant="outline" className="text-[10px] text-muted-foreground">
                      {tool.category}
                    </Badge>
                  </div>
                  <p className="text-sm font-medium">{tool.title}</p>
                  <p className="text-xs text-muted-foreground mt-1">{tool.description}</p>
                </div>
              ))}
            </div>
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
          { keys: ["?"], description: "Toggle this shortcuts panel" },
        ]}
      />
    </>
  )
}