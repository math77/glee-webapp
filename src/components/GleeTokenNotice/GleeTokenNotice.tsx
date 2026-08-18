import { GLEE_TOKEN_LAUNCHED, GLEE_NOT_LAUNCHED_MESSAGE } from "../../../utils/gleeToken";

interface GleeTokenNoticeProps {
  /** "banner" for prose sections (About, Home, Gallery); "inline" for tight UI like the tip form */
  variant?: "banner" | "inline";
  className?: string;
}

// Renders nothing once GLEE_TOKEN_LAUNCHED is flipped to true — every call site listed
// in the redesign notes stays as-is, it just stops rendering anything.
export default function GleeTokenNotice({ variant = "banner", className = "" }: GleeTokenNoticeProps) {
  if (GLEE_TOKEN_LAUNCHED) return null;

  if (variant === "inline") {
    return <p className={`text-xs leading-relaxed text-[#c17a72] ${className}`}>{GLEE_NOT_LAUNCHED_MESSAGE}</p>;
  }

  return (
    <p className={`border-l-2 border-[#c17a72] bg-[#c17a72]/10 px-4 py-3 text-sm leading-relaxed text-[#c17a72] ${className}`}>
      {GLEE_NOT_LAUNCHED_MESSAGE}
    </p>
  );
}