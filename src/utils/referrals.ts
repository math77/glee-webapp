import { randomInt } from "crypto";

export const REFERRAL_CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
export const REFERRAL_CODE_LENGTH = 6;

export function generateReferralCode(): string {
  let code = "";
  for (let i = 0; i < REFERRAL_CODE_LENGTH; i += 1) {
    code += REFERRAL_CODE_ALPHABET[randomInt(REFERRAL_CODE_ALPHABET.length)];
  }
  return code;
}

export const PUBLIC_MINT_POINTS_PER_NFT = 100;
export const WHITELIST_MINT_POINTS_PER_NFT = 125;
export const REFERRER_BONUS_NUMERATOR = BigInt(5);
export const REFERRER_BONUS_DENOMINATOR = BigInt(4);

export function calculateReferralPoints(quantity: number, mintType: "whitelist" | "public") {
  const minterPerNft = mintType === "whitelist" ? WHITELIST_MINT_POINTS_PER_NFT : PUBLIC_MINT_POINTS_PER_NFT;
  const minterPoints = BigInt(quantity * minterPerNft);
  const referrerPoints = (minterPoints * REFERRER_BONUS_NUMERATOR) / REFERRER_BONUS_DENOMINATOR;

  return { minterPoints, referrerPoints };
}

export function normalizeReferralCode(value: string | null | undefined): string | null {
  if (!value) return null;
  const normalized = value.trim().toUpperCase();
  if (!/^[A-Z2-9]{6}$/.test(normalized)) return null;
  return normalized;
}
