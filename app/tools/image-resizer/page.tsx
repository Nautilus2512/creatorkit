import Link from "next/link"
import { ImageResizer } from "@/components/tools/image-resizer"

export default function ImageResizerPage() {
  return (
    <div className="min-h-screen bg-background">
      <main className="mx-auto max-w-3xl px-6 py-10 lg:px-8">
        <div className="mb-6">
          <Link href="/" className="text-sm text-muted-foreground hover:text-foreground">
            ← Back to home
          </Link>
        </div>
        <ImageResizer />
      </main>
    </div>
  )
}
