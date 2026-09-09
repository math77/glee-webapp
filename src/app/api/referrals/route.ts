import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { isAddress } from "viem";
import { normalizeReferralCode } from "@/utils/referrals";

const db = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

export async function GET(request: NextRequest) {
  const walletParam = request.nextUrl.searchParams.get("wallet");
  const codeParam = normalizeReferralCode(request.nextUrl.searchParams.get("code"));

  if (walletParam) {
    if (!isAddress(walletParam)) return NextResponse.json({ error: "Invalid wallet address." }, { status: 400 });
    const wallet = walletParam.toLowerCase();
    const { data, error } = await db.from("referral_codes").select("wallet_address,code,points").eq("wallet_address", wallet).maybeSingle();
    if (error) return NextResponse.json({ error: "Referral lookup failed." }, { status: 500 });
    return NextResponse.json({ exists: Boolean(data), wallet: data?.wallet_address ?? wallet, code: data?.code ?? null, points: Number(data?.points ?? 0) });
  }

  if (codeParam) {
    const { data, error } = await db.from("referral_codes").select("code").eq("code", codeParam).maybeSingle();
    if (error) return NextResponse.json({ valid: false }, { status: 500 });
    return NextResponse.json({ valid: Boolean(data), code: data?.code ?? null });
  }

  return NextResponse.json({ error: "Provide wallet or code." }, { status: 400 });
}
