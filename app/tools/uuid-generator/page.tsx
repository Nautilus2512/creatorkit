import UuidGenerator from "@/components/tools/uuid-generator"
import { Metadata } from "next"

export const metadata: Metadata = {
  title: "UUID Generator - CreatorKit",
  description: "Generate cryptographically secure UUID v4s with bulk generation",
}

export default function UuidGeneratorPage() {
  return <UuidGenerator />
}