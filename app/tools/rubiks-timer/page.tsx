import RubiksTimer from "@/components/tools/rubiks-timer"
import { Metadata } from "next"

export const metadata: Metadata = {
  title: "Rubik's Cube Timer - CreatorKit",
  description: "Speedcubing timer with random scrambles, inspection countdown, and session statistics.",
}

export default function RubiksTimerPage() {
  return <RubiksTimer />
}
