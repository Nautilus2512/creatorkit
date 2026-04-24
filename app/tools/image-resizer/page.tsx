import Link from "next/link"
import { ImageResizer } from "@/components/tools/image-resizer"

export default function ImageResizerPage() {
  return (
    <div className="min-h-screen bg-background">
      <main className="mx-auto w-full max-w-none px-3 py-4 md:px-4">
        <div className="mb-4">
          <Link href="/tools" className="text-sm text-muted-foreground hover:text-foreground">
            ← All Tools
          </Link>
        </div>
        <ImageResizer />
      </main>
    </div>
  )
}
