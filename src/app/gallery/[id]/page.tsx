import type { Metadata } from "next";
import GalleryView from "@/components/GalleryView/GalleryView";
import { getCanvasForMetadata } from "@/utils/canvasServer";
import { canvasShareUrl } from "@/utils/siteConfig";

interface CanvasPageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: CanvasPageProps): Promise<Metadata> {
  const { id } = await params;
  const canvas = await getCanvasForMetadata(id);

  const title = canvas ? `${canvas.title} — GLEE` : `Canvas #${id} — GLEE`;
  const description = canvas?.description ?? "A tiny onchain masterpiece, painted pixel by pixel on GLEE.";
  const url = canvasShareUrl(id);

  return {
    title,
    description,
    openGraph: { title, description, url },
    twitter: { card: "summary_large_image", title, description },
  };
}

export default async function GalleryCanvasPage({ params }: CanvasPageProps) {
  const { id } = await params;
  return <GalleryView initialCanvasId={id} />;
}