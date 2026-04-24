import Link from "next/link"
import { DesignTokenGenerator } from "@/components/tools/design-token-generator"

export default function DesignTokensPage() {
  return (
    <div className="min-h-screen bg-background">
      <main className="mx-auto max-w-3xl px-6 py-10 lg:px-8">
        <div className="mb-6">
          <Link href="/" className="text-sm text-muted-foreground hover:text-foreground">
            ← Back to home
          </Link>
        </div>
        <DesignTokenGenerator />
      </main>
    </div>
  )
}
