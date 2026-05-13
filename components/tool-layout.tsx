"use client"

import { ReactNode } from "react"

interface ToolLayoutProps {
  title: string
  description?: string
  leftPanel: ReactNode
  rightPanel: ReactNode
  minLeftPanelWidth?: string
  minRightPanelWidth?: string
  leftPanelLabel?: string
  rightPanelLabel?: string
}

export function ToolLayout({
  title,
  description,
  leftPanel,
  rightPanel,
  minLeftPanelWidth = "400px",
  minRightPanelWidth = "400px",
  leftPanelLabel,
  rightPanelLabel,
}: ToolLayoutProps) {
  return (
    <div className="flex h-full flex-col gap-3 p-4">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">{title}</h2>
        {description && <p className="text-muted-foreground">{description}</p>}
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-2 2xl:grid-cols-2 gap-4 flex-1 min-h-0" style={{ minHeight: 0 }}>
        <div 
          className="flex flex-col rounded-xl border border-border bg-card overflow-hidden"
          style={{ minWidth: minLeftPanelWidth }}
          role="region"
          aria-label={leftPanelLabel}
        >
          <div className="flex-1 overflow-y-auto p-4 min-h-0">
            {leftPanel}
          </div>
        </div>
        
        <div 
          className="flex flex-col rounded-xl border border-border bg-card overflow-hidden"
          style={{ minWidth: minRightPanelWidth }}
          role="region"
          aria-label={rightPanelLabel}
        >
          <div className="flex-1 overflow-y-auto p-4 min-h-0">
            {rightPanel}
          </div>
        </div>
      </div>
    </div>
  )
}

interface SinglePanelLayoutProps {
  title: string
  description?: string
  children: ReactNode
  panelLabel?: string
}

export function SinglePanelLayout({
  title,
  description,
  children,
  panelLabel,
}: SinglePanelLayoutProps) {
  return (
    <div className="flex h-full flex-col gap-3 p-4">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">{title}</h2>
        {description && <p className="text-muted-foreground">{description}</p>}
      </div>
      
      <div 
        className="flex flex-col rounded-xl border border-border bg-card overflow-hidden flex-1"
        role="region"
        aria-label={panelLabel}
      >
        <div className="flex-1 overflow-y-auto p-4 min-h-0">
          {children}
        </div>
      </div>
    </div>
  )
}

interface ThreePanelLayoutProps {
  title: string
  description?: string
  leftPanel: ReactNode
  middlePanel: ReactNode
  rightPanel: ReactNode
}

export function ThreePanelLayout({
  title,
  description,
  leftPanel,
  middlePanel,
  rightPanel,
}: ThreePanelLayoutProps) {
  return (
    <div className="flex h-full flex-col gap-3 p-4">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">{title}</h2>
        {description && <p className="text-muted-foreground">{description}</p>}
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 flex-1 min-h-0" style={{ minHeight: 0 }}>
        <div className="flex flex-col rounded-xl border border-border bg-card overflow-hidden">
          <div className="flex-1 overflow-y-auto p-4 min-h-0">
            {leftPanel}
          </div>
        </div>
        
        <div className="flex flex-col rounded-xl border border-border bg-card overflow-hidden">
          <div className="flex-1 overflow-y-auto p-4 min-h-0">
            {middlePanel}
          </div>
        </div>
        
        <div className="flex flex-col rounded-xl border border-border bg-card overflow-hidden">
          <div className="flex-1 overflow-y-auto p-4 min-h-0">
            {rightPanel}
          </div>
        </div>
      </div>
    </div>
  )
}