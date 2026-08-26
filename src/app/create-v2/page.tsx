import type { Metadata } from "next";
import StudioV2 from "@/components/StudioV2/StudioV2";

// Deliberately not linked from Header/nav — internal test route only.
export const metadata: Metadata = {
  title: "V2 palette test — GLEE",
  robots: { index: false, follow: false },
};

export default function CreateV2Page() {
  return <StudioV2 />;
}