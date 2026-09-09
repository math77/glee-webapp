import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { isAddress } from "viem";
import { normalizeReferralCode, calculateReferralPoints } from "@/utils/referrals";
import { verifyMintTransaction } from "@/utils/referralVerifier";

const db = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as { wallet?: string; referralCode?: string; transactionHash?: `0x${string}` };
    if (!body.wallet || !isAddress(body.wallet) || !body.transactionHash) {
      return NextResponse.json({ error: "wallet and transactionHash are required" }, { status: 400 });
    }

    const wallet = body.wallet.toLowerCase();
    const code = normalizeReferralCode(body.referralCode);
    const mint = await verifyMintTransaction(body.transactionHash, wallet);
    if (!mint) return NextResponse.json({ error: "Mint transaction could not be verified" }, { status: 400 });

    const { data: ownCode, error: ownCodeError } = await db
      .from("referral_codes")
      .select("id,code,points")
      .eq("wallet_address", wallet)
      .maybeSingle();
    if (ownCodeError) throw ownCodeError;

    if (!ownCode) {
      return NextResponse.json({ error: "Referral profile missing; create profile first" }, { status: 409 });
    }

    if (!code) return NextResponse.json({ verified: true, attributed: false, code: ownCode.code, points: Number(ownCode.points ?? 0) });

    const { data: referrer, error: referrerError } = await db
      .from("referral_codes")
      .select("id,wallet_address")
      .eq("code", code)
      .maybeSingle();
    if (referrerError) throw referrerError;
    if (!referrer) return NextResponse.json({ error: "Referral code not found" }, { status: 400 });
    if (referrer.wallet_address.toLowerCase() === wallet) return NextResponse.json({ error: "Self-referrals are not allowed" }, { status: 400 });

    const { minterPoints, referrerPoints } = calculateReferralPoints(mint.quantity, mint.mintType);
    const { data, error } = await db.rpc("process_referral_mint", {
      p_transaction_hash: mint.transactionHash,
      p_contract_address: mint.contractAddress,
      p_minter_wallet: wallet,
      p_referrer_wallet: referrer.wallet_address,
      p_referral_code_id: referrer.id,
      p_quantity: mint.quantity,
      p_mint_type: mint.mintType,
      p_minter_points: Number(minterPoints),
      p_referrer_points: Number(referrerPoints),
    });
    if (error) throw error;

    const inserted = Array.isArray(data) ? Boolean(data[0]?.inserted) : Boolean(data?.inserted);
    const { data: updated, error: updatedError } = await db
      .from("referral_codes")
      .select("code,points")
      .eq("wallet_address", wallet)
      .single();
    if (updatedError) throw updatedError;

    return NextResponse.json({ verified: true, attributed: inserted, transactionHash: mint.transactionHash, quantity: mint.quantity, mintType: mint.mintType, minterPoints: Number(minterPoints), referrerPoints: Number(referrerPoints), code: updated.code, points: Number(updated.points ?? 0) });
  } catch (error) {
    console.error("referral processing failed", error);
    return NextResponse.json({ error: "Referral processing failed" }, { status: 500 });
  }
}
