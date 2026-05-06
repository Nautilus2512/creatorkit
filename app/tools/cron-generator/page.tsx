import CronGenerator from "@/components/tools/cron-generator"
import { Metadata } from "next"

export const metadata: Metadata = {
  title: "Cron Expression Generator - CreatorKit",
  description: "Build cron expressions with presets, human-readable descriptions, and next-run time preview.",
}

export default function CronGeneratorPage() {
  return <CronGenerator />
}
