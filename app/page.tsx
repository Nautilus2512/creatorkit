"use client"

import { useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { ShieldCheck, Search } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ShortcutsModal } from "@/components/shortcuts-modal"

export default function Home() {
  const router = useRouter()
  const [search, setSearch] = useState("")
  const searchRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return
      if ((e.target as HTMLElement).tagName === "INPUT") return
      if (e.key === "1") router.push("/tools/metadata-remover")
      if (e.key === "2") router.push("/tools/image-resizer")
      if (e.key === "3") router.push("/tools/design-tokens")
    }
    window.addEventListener("keydown", handler)
    return () => window.removeEventListener("keydown", handler)
  }, [router])

  const handleSearch = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const q = search.trim()
    router.push(q ? `/tools?q=${encodeURIComponent(q)}` : "/tools")
  }

  return (
    <>
      <div id="top" className="min-h-screen bg-background">
        {/* Top Navigation */}
        <header className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur-sm">
          <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-3 lg:px-8">
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
              <Link href="#features" className="hover:text-foreground transition-colors">Features</Link>
              <Link href="/privacy" className="hover:text-foreground transition-colors">Privacy</Link>
              <Link href="/terms" className="hover:text-foreground transition-colors">Terms</Link>
            </nav>
            <Button asChild size="sm">
              <Link href="/tools">Try Free Tools</Link>
            </Button>
          </div>
        </header>

        <main className="mx-auto max-w-5xl px-6 py-16 lg:px-8 lg:py-20">
          <section className="space-y-6 text-center">
            <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">
              Fast, privacy-first tools for creatives and teams
            </h1>
            <p className="mx-auto max-w-2xl text-muted-foreground sm:text-lg">
              66+ browser-based utilities for creators. No uploads, no tracking — everything runs locally.
            </p>

            {/* Search bar */}
            <form onSubmit={handleSearch} className="mx-auto flex max-w-lg gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                <input
                  ref={searchRef}
                  type="text"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Search 66+ tools…"
                  className="w-full rounded-xl border border-border bg-muted/30 pl-10 pr-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50 transition-colors"
                />
              </div>
              <Button type="submit" size="lg">
                {search.trim() ? "Search" : "Browse All"}
              </Button>
            </form>
            <p className="text-xs text-muted-foreground">
              or{" "}
              <Link href="/tools" className="underline hover:text-foreground transition-colors">
                browse all 66 tools →
              </Link>
            </p>
          </section>

          <section id="features" className="mt-14 grid gap-4 md:mt-16 md:grid-cols-3">
            <Link href="/tools/metadata-remover" className="group block">
              <Card className="h-full transition-colors group-hover:border-primary/60">
                <CardHeader>
                  <CardTitle>Metadata Remover</CardTitle>
                  <CardDescription>Detect EXIF data and strip sensitive metadata directly in your browser.</CardDescription>
                </CardHeader>
                <CardContent className="text-sm text-muted-foreground">
                  Protect privacy by removing GPS location, device details, and timestamps before sharing images.
                </CardContent>
              </Card>
            </Link>
            <Link href="/tools/image-resizer" className="group block">
              <Card className="h-full transition-colors group-hover:border-primary/60">
                <CardHeader>
                  <CardTitle>Image Resizer</CardTitle>
                  <CardDescription>Generate optimized dimensions for major social platforms instantly.</CardDescription>
                </CardHeader>
                <CardContent className="text-sm text-muted-foreground">
                  Create Instagram, LinkedIn, YouTube, TikTok, and more with over 40+ sizes from one upload.
                </CardContent>
              </Card>
            </Link>
            <Link href="/tools/design-tokens" className="group block">
              <Card className="h-full transition-colors group-hover:border-primary/60">
                <CardHeader>
                  <CardTitle>Design Token Generator</CardTitle>
                  <CardDescription>Turn one brand color into production-ready design tokens.</CardDescription>
                </CardHeader>
                <CardContent className="text-sm text-muted-foreground">
                  Export consistent palettes, typography, spacing, and radius tokens as CSS or Tailwind config.
                </CardContent>
              </Card>
            </Link>
          </section>

          <section id="privacy" className="mt-10 flex items-center justify-center rounded-xl border border-border bg-muted/30 px-4 py-3 text-sm">
            <ShieldCheck className="mr-2 h-4 w-4 text-green-600" />
            Client-side. No server. No tracking.
          </section>
        </main>

        <footer className="border-t border-border">
          <div className="mx-auto flex max-w-5xl flex-col items-center justify-between gap-3 px-6 py-6 text-sm text-muted-foreground sm:flex-row lg:px-8">
            <p>© 2026 CreatorKit</p>
            <div className="flex items-center gap-4">
              <Link href="#features" className="hover:text-foreground">Features</Link>
              <Link href="/privacy" className="hover:text-foreground">Privacy</Link>
              <Link href="/terms" className="hover:text-foreground">Terms</Link>
              <Link href="#top" className="hover:text-foreground">Back to top</Link>
            </div>
          </div>
          <div className="mx-auto max-w-5xl px-6 pb-6 text-center text-xs text-muted-foreground lg:px-8">
            <a href="mailto:creatorkit.hello@gmail.com?subject=CreatorKit Feedback" className="hover:text-foreground underline">
              Send Feedback
            </a>
          </div>
        </footer>
      </div>

      <ShortcutsModal
        pageName="Landing Page"
        shortcuts={[
          { keys: ["1"], description: "Go to Metadata Remover" },
          { keys: ["2"], description: "Go to Image Resizer" },
          { keys: ["3"], description: "Go to Design Token Generator" },
          { keys: ["?"], description: "Toggle this shortcuts panel" },
        ]}
      />
    </>
  )
}