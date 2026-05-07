import AudioWaveformVisualizer from "@/components/tools/audio-waveform-visualizer"
import { Metadata } from "next"
export const metadata: Metadata = { title: "Audio Waveform Visualizer - CreatorKit", description: "Visualize audio waveforms and play back any audio file directly in your browser." }
export default function Page() { return <AudioWaveformVisualizer /> }
