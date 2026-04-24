import Link from "next/link"
import { ArrowRight, Crop, Palette, Shield } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

const toolCards = [
  {
    icon: Shield,
    title: "Metadata Remover",
    description: "Detect EXIF data and remove sensitive metadata from images.",
    href: "/tools/metadata-remover",
  },
  {
    icon: Crop,
    title: "Image Resizer",
    description: "Generate social media-ready image sizes from a single upload.",
    href: "/tools/image-resizer",
  },
  {
    icon: Palette,
    title: "Design Token Generator",
    description: "Create color, typography, spacing, and radius design tokens.",
    href: "/tools/design-tokens",
  },
]

export default function ToolsPage() {
  return (
    <div className="min-h-screen bg-background">
      <main className="mx-auto max-w-6xl px-6 py-12 lg:px-8 lg:py-14">
        <div className="mb-8 rounded-2xl border border-border bg-muted/20 p-6 sm:p-8">
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">
            CreatorKit Dashboard
          </p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
            Welcome back. Choose a tool to start.
          </h1>
          <p className="mt-3 max-w-2xl text-muted-foreground">
            Privacy-first utilities built for quick workflows. Every tool runs in-browser with no file uploads.
          </p>
        </div>

        <section className="grid gap-5 md:grid-cols-3">
          {toolCards.map((tool) => (
            <Card
              key={tool.href}
              className="h-full border-border/80 bg-card/60 transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/50 hover:shadow-lg hover:shadow-primary/10"
            >
              <CardHeader className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="rounded-lg border border-border bg-muted/50 p-2">
                    <tool.icon className="h-5 w-5 text-primary" />
                  </div>
                  <Badge variant="secondary">Free</Badge>
                </div>
                <div>
                  <CardTitle className="text-xl">{tool.title}</CardTitle>
                  <CardDescription>{tool.description}</CardDescription>
                </div>
              </CardHeader>
              <CardContent>
                <Button asChild className="w-full justify-between">
                  <Link href={tool.href}>
                    Open Tool
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
              </CardContent>
            </Card>
          ))}
        </section>
      </main>
    </div>
  )
}
