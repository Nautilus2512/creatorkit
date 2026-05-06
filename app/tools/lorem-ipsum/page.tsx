import LoremIpsum from "@/components/tools/lorem-ipsum"
import { Metadata } from "next"

export const metadata: Metadata = {
  title: "Lorem Ipsum Generator - CreatorKit",
  description: "Generate placeholder text by paragraphs, sentences, or words for your designs and mockups.",
}

export default function LoremIpsumPage() {
  return <LoremIpsum />
}
