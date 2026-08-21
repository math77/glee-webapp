import { NFT_MINT_LAUNCHED, NFT_NOT_LAUNCHED_MESSAGE } from "../../utils/nftLaunch";

interface NftLaunchNoticeProps {
  variant?: "banner" | "inline";
  className?: string;
}

// Mirrors GleeTokenNotice's on/off pattern, but this is a neutral "not open yet" status,
// not a scam warning, so it keeps the app's normal quiet palette rather than the warning red.
export default function NftLaunchNotice({ variant = "banner", className = "" }: NftLaunchNoticeProps) {
  if (NFT_MINT_LAUNCHED) return null;

  if (variant === "inline") {
    return <p className={`text-xs leading-relaxed text-[var(--foreground-muted)] ${className}`}>{NFT_NOT_LAUNCHED_MESSAGE}</p>;
  }

  return (
    <div className={`border border-[var(--border-hairline-strong)] bg-[var(--background-2)] px-5 py-6 text-center ${className}`}>
      <p className="eyebrow-quiet">Coming soon</p>
      <p className="mt-3 text-sm leading-relaxed text-[var(--foreground-muted)]">{NFT_NOT_LAUNCHED_MESSAGE}</p>
    </div>
  );
}