import CsvJsonConverter from "@/components/tools/csv-json-converter"
import { Metadata } from "next"

export const metadata: Metadata = {
  title: "CSV ↔ JSON Converter - CreatorKit",
  description: "Convert between CSV and JSON formats with table preview",
}

export default function CsvJsonConverterPage() {
  return <CsvJsonConverter />
}