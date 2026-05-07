import VoiceRecorder from "@/components/tools/voice-recorder"
import { Metadata } from "next"

export const metadata: Metadata = {
  title: "Voice Recorder - CreatorKit",
  description: "Record audio directly in your browser. Play back and download recordings. Nothing is uploaded.",
}

export default function VoiceRecorderPage() {
  return <VoiceRecorder />
}
