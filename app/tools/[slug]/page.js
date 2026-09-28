import { notFound } from "next/navigation";
import LegacyPage from "../../LegacyPage";

const toolPages = new Set([
  "audio-trimmer",
  "excel-to-pdf",
  "image-compressor",
  "image-workspace",
  "jpg-png",
  "jpg-to-pdf",
  "media-downloader",
  "pdf-resize",
  "pdf-scale",
  "pdf-to-word",
  "pdf-toolbox",
  "png-to-pdf",
  "qr-generator",
  "video-trimmer",
  "word-to-pdf",
]);

export default async function ToolPage({ params }) {
  const { slug } = await params;
  if (!toolPages.has(slug)) notFound();
  return <LegacyPage file={`tools/${slug}.html`} />;
}