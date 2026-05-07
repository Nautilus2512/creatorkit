import XmlFormatter from "@/components/tools/xml-formatter"
import { Metadata } from "next"

export const metadata: Metadata = {
  title: "XML Formatter - CreatorKit",
  description: "Format or minify XML with validation. Supports indentation options and file upload. Runs entirely in your browser.",
}

export default function XmlFormatterPage() {
  return <XmlFormatter />
}
