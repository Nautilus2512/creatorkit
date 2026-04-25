import Link from "next/link"
import { MetadataRemover } from "@/components/tools/metadata-remover"
import { ArrowLeft } from "lucide-react"

export default function MetadataRemoverPage() {
  return (
    <div className="min-h-screen bg-background">
      <main className="mx-auto w-full max-w-none px-3 py-4 md:px-4">
        <div className="mb-4">
          <Link href="/tools" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="h-3.5 w-3.5" />
            All Tools
          </Link>
        </div>
        <MetadataRemover />
      </main>
    </div>
  )
}
