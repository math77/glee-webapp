import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { isAddress } from "viem";
import { generateReferralCode, normalizeReferralCode } from "@/utils/referrals";

const db = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

const walletOf = (value: string | null) => (value && isAddress(value) ? value.toLowerCase() : null);

async function getOrCreateProfile(wallet: string) {
  const { data: existing, error } = await db.from("referral_codes").select("id,wallet_address,code,points").eq("wallet_address", wallet).maybeSingle();
  if (error) throw error;
  if (existing) return existing;

  for (let i = 0; i < 8; i++) {
    const code = generateReferralCode();
    const { data, error: insertError } = await db.from("referral_codes").insert({ wallet_address: wallet, code }).select("id,wallet_address,code,points").maybeSingle();
    if (data && !insertError) return data;
    if (insertError?.code !== "23505") throw insertError;
  }
  throw new Error("Could not generate a unique referral code.");
}

export async function GET(request: NextRequest) {
  const wallet = walletOf(request.nextUrl.searchParams.get("wallet"));
  const code = normalizeReferralCode(request.nextUrl.searchParams.get("code"));

  if (wallet) {
    try {
      const profile = await getOrCreateProfile(wallet);
      return NextResponse.json({ wallet: profile.wallet_address, code: profile.code, points: Number(profile.points ?? 0) });
    } catch (error) {
      return NextResponse.json({ error: error instanceof Error ? error.message : "Referral lookup failed." }, { status: 500 });
    }
  }

  if (code) {
    const { data, error } = await db.from("referral_codes").select("wallet_address,code").eq("code", code).maybeSingle();
    if (error) return NextResponse.json({ valid: false }, { status: 500 });
    return NextResponse.json({ valid: Boolean(data), code: data?.code ?? null });
  }

  return NextResponse.json({ error: "Provide wallet or code." }, { status: 400 });
}

export async function POST(request: NextRequest) {
  const body = await request.json() as { wallet?: string; referralCode?: string | null; transactionHash?: string };
  const wallet = walletOf(body.wallet ?? null);
  const referralCode = normalizeReferralCode(body.referralCode);
  if (!wallet) return NextResponse.json({ error: "Invalid wallet address." }, { status: 400 });
  if (!body.transactionHash) return NextResponse.json({ error: "Transaction hash is required." }, { status: 400 });

  try {
    const profile = await getOrCreateProfile(wallet);
    return NextResponse.json({ verified: false, code: profile.code, points: Number(profile.points ?? 0), message: "Referral transaction verification endpoint is ready; chain verification is handled by the mint reconciler." });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Referral processing failed." }, { status: 500 });
  }
}
