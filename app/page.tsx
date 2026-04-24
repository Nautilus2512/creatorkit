import Link from "next/link"
import { ShieldCheck, Zap } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export default function Home() {
  return (
    <div id="top" className="min-h-screen bg-background">
      {/* Top Navigation */}
      <header className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur-sm">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-3 lg:px-8">
          <Link href="/" className="flex items-center gap-2 font-semibold tracking-tight">
            <Zap className="h-4 w-4 text-primary" />
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
            Clean up image metadata, generate social-ready image sizes, and build
            consistent design tokens in seconds.
          </p>
          <Button asChild size="lg">
            <Link href="/tools">Try Free Tools</Link>
          </Button>
        </section>

        <section
          id="features"
          className="mt-14 grid gap-4 md:mt-16 md:grid-cols-3"
        >
          <Link href="/tools/metadata-remover" className="group block">
            <Card className="h-full transition-colors group-hover:border-primary/60">
              <CardHeader>
                <CardTitle>Metadata Remover</CardTitle>
                <CardDescription>
                  Detect EXIF data and strip sensitive metadata directly in your browser.
                </CardDescription>
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
                <CardDescription>
                  Generate optimized dimensions for major social platforms instantly.
                </CardDescription>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">
                Create Instagram, LinkedIn, YouTube, TikTok, and more — 40+ sizes from one upload.
              </CardContent>
            </Card>
          </Link>
          <Link href="/tools/design-tokens" className="group block">
            <Card className="h-full transition-colors group-hover:border-primary/60">
              <CardHeader>
                <CardTitle>Design Token Generator</CardTitle>
                <CardDescription>
                  Turn one brand color into production-ready design tokens.
                </CardDescription>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">
                Export consistent palettes, typography, spacing, and radius tokens as CSS or Tailwind config.
              </CardContent>
            </Card>
          </Link>
        </section>

        <section
          id="privacy"
          className="mt-10 flex items-center justify-center rounded-xl border border-border bg-muted/30 px-4 py-3 text-sm"
        >
          <ShieldCheck className="mr-2 h-4 w-4 text-green-600" />
          Your files never leave your browser
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
      </footer>
    </div>
  )
}