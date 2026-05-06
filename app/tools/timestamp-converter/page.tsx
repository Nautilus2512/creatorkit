import TimestampConverter from "@/components/tools/timestamp-converter"
import { Metadata } from "next"

export const metadata: Metadata = {
  title: "Timestamp Converter - CreatorKit",
  description: "Convert between Unix timestamps and human-readable date formats including ISO 8601, UTC, and local time.",
}

export default function TimestampConverterPage() {
  return <TimestampConverter />
}
