import { NextRequest, NextResponse } from "next/server";
import { isAddress, getAddress } from "viem";

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL! as string;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY! as string;

const supabase = createClient(
  supabaseUrl, 
  supabaseKey
);

export async function GET(request: NextRequest) {
  const address = request.nextUrl.searchParams.get("address");

  if (!address || !isAddress(address)) {
    return NextResponse.json({ eligible: false, proof: [] }, { status: 400 });
  }

  const normalized = getAddress(address).toLowerCase();

  const { data, error } = await supabase
    .from("whitelist_proofs")
    .select("proof")
    .eq("wallet_address", normalized)
    .maybeSingle();

  if (error) {
    console.error("whitelist lookup failed:", error.message);
    return NextResponse.json({ eligible: false, proof: [] }, { status: 500 });
  }

  if (!data) {
    return NextResponse.json({ eligible: false, proof: [] });
  }

  return NextResponse.json({ eligible: true, proof: data.proof as string[] });
}