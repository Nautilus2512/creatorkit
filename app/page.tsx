import Link from "next/link"
import { ShieldCheck } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export default function Home() {
  return (
    <div id="top" className="min-h-screen bg-background">
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
            <Link href="/tools/metadata-remover">Try Free Tools</Link>
          </Button>
        </section>

        <section
          id="features"
          className="mt-14 grid gap-4 md:mt-16 md:grid-cols-3"
        >
          <Card>
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
          <Card>
            <CardHeader>
              <CardTitle>Image Resizer</CardTitle>
              <CardDescription>
                Generate optimized dimensions for major social platforms instantly.
              </CardDescription>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              Create Instagram, LinkedIn, YouTube, and Facebook-ready assets from one upload.
            </CardContent>
          </Card>
          <Card>
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
            <Link href="#features" className="hover:text-foreground">
              Features
            </Link>
            <Link href="/privacy" className="hover:text-foreground">
              Privacy
            </Link>
            <Link href="/terms" className="hover:text-foreground">
              Terms
            </Link>
            <Link href="#top" className="hover:text-foreground">
              Back to top
            </Link>
          </div>
        </div>
      </footer>
    </div>
  )
}
