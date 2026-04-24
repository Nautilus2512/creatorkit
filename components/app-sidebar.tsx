"use client"

import { FileX2, ImageIcon, Palette } from "lucide-react"
import { ThemeToggle } from "@/components/theme-toggle"

const tools = [
  {
    id: "metadata-remover",
    name: "Metadata Remover",
    description: "Remove EXIF data from images",
    icon: FileX2,
  },
  {
    id: "image-resizer",
    name: "Image Resizer",
    description: "Resize images to any dimension",
    icon: ImageIcon,
  },
  {
    id: "design-tokens",
    name: "Design Tokens",
    description: "Generate design token systems",
    icon: Palette,
  },
]

interface AppSidebarProps {
  activeTool: string
  onToolChange: (toolId: string) => void
}

export function AppSidebar({ activeTool, onToolChange }: AppSidebarProps) {
  return (
    <aside className="flex h-screen w-64 flex-col border-r border-border bg-sidebar">
      <div className="flex h-14 items-center justify-between border-b border-border px-4">
        <h1 className="text-lg font-semibold text-sidebar-foreground">
          CreatorKit
        </h1>
        <ThemeToggle />
      </div>

      <nav className="flex-1 space-y-1 p-3">
        {tools.map((tool) => {
          const isActive = activeTool === tool.id
          return (
            <button
              key={tool.id}
              onClick={() => onToolChange(tool.id)}
              className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors ${
                isActive
                  ? "bg-sidebar-accent text-sidebar-accent-foreground"
                  : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
              }`}
            >
              <tool.icon className="h-5 w-5 shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{tool.name}</p>
                <p className="truncate text-xs text-muted-foreground">
                  {tool.description}
                </p>
              </div>
            </button>
          )
        })}
      </nav>

      <div className="border-t border-border p-4">
        <p className="text-xs text-muted-foreground">
          All processing happens locally in your browser.
        </p>
      </div>
    </aside>
  )
}
