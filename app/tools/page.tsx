import Link from "next/link"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

const toolCards = [
  {
    title: "Metadata Remover",
    description: "Detect EXIF data and remove sensitive metadata from images.",
    href: "/tools/metadata-remover",
  },
  {
    title: "Image Resizer",
    description: "Generate social media-ready image sizes from a single upload.",
    href: "/tools/image-resizer",
  },
  {
    title: "Design Token Generator",
    description: "Create color, typography, spacing, and radius design tokens.",
    href: "/tools/design-tokens",
  },
]

export default function ToolsPage() {
  return (
    <div className="min-h-screen bg-background">
      <main className="mx-auto max-w-5xl px-6 py-16 lg:px-8 lg:py-20">
        <div className="mb-10 space-y-4 text-center">
          <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
            CreatorKit Tools
          </h1>
          <p className="mx-auto max-w-2xl text-muted-foreground">
            Pick a tool to get started. All processing runs locally in your browser.
          </p>
        </div>

        <section className="grid gap-4 md:grid-cols-3">
          {toolCards.map((tool) => (
            <Link key={tool.href} href={tool.href} className="group block">
              <Card className="h-full transition-colors group-hover:border-primary/60">
                <CardHeader>
                  <CardTitle>{tool.title}</CardTitle>
                  <CardDescription>{tool.description}</CardDescription>
                </CardHeader>
                <CardContent className="text-sm text-muted-foreground">
                  Open tool
                </CardContent>
              </Card>
            </Link>
          ))}
        </section>
      </main>
    </div>
  )
}
