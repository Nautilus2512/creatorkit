import Notes from "@/components/tools/notes"
import { Metadata } from "next"

export const metadata: Metadata = {
  title: "Notes - CreatorKit",
  description: "Quick notes saved to your browser's localStorage. Nothing leaves your device.",
}

export default function NotesPage() {
  return <Notes />
}
