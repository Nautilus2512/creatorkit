import WordCounter from "@/components/tools/word-counter"
import { Metadata } from "next"

export const metadata: Metadata = {
  title: "Word & Character Counter - CreatorKit",
  description: "Count words, characters, sentences, paragraphs, and estimate reading and speaking time.",
}

export default function WordCounterPage() {
  return <WordCounter />
}
