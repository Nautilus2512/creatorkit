import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import PomodoroTimer from "@/components/tools/pomodoro-timer"
import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Pomodoro Timer - CreatorKit",
  description: "Focus timer with 25/5/15 minute cycles, bell sound, browser notifications, and session tracking. Settings saved locally.",
}

export default function PomodoroTimerPage() {
  return (
    <div className="h-screen flex flex-col bg-background">
      <div className="shrink-0 border-b border-border px-4 py-2.5">
        <Link href="/tools" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="h-3.5 w-3.5" />
          All Tools
          <kbd className="ml-1 rounded border border-border bg-muted px-1 text-[10px] opacity-50">Alt+Left Arrow</kbd>
        </Link>
      </div>
      <div className="flex flex-1 flex-col min-h-0 overflow-hidden">
        <PomodoroTimer />
      </div>
    </div>
  )
}
