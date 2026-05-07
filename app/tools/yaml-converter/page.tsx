import YamlConverter from "@/components/tools/yaml-converter"
import { Metadata } from "next"

export const metadata: Metadata = {
  title: "YAML ↔ JSON Converter - CreatorKit",
  description: "Convert between YAML and JSON formats with file upload and download. Runs entirely in your browser.",
}

export default function YamlConverterPage() {
  return <YamlConverter />
}
