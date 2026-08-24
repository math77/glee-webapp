/**
 * Generates the WL merkle tree and pushes per-wallet proofs to Supabase.
 *
 * Usage:
 *   1. cp scripts/whitelist-addresses.example.json scripts/whitelist-addresses.json
 *      and replace the contents with the real testnet wallet list.
 *   2. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env (NOT the
 *      NEXT_PUBLIC_ ones — this needs the service role key to write past RLS).
 *   3. npm install dotenv   (one-time)
 *      npx tsx scripts/generate-whitelist.ts
 *
 * Prints the merkleRoot and wallet count to feed into setMerkleRoot(...) and
 * setTotalWLWallets(...) on the contract, then upserts (wallet -> proof) rows
 * into the whitelist_proofs table for the API route to serve.
 *
 * NOTE: this runs as a plain Node script outside Next.js's own env loading,
 * so .env isn't picked up automatically the way it is for `next dev`/`next
 * build` — the explicit dotenv import below loads it.
 */
import dotenv from "dotenv";
import path from "path";
import { createClient } from "@supabase/supabase-js";
import { keccak256, encodeAbiParameters, parseAbiParameters, getAddress, type Address } from "viem";
import { MerkleTree } from "merkletreejs";
import { readFileSync } from "fs";
import { join } from "path";

dotenv.config({ path: path.resolve(process.cwd(), '../.env.local') });
const ADDRESSES_FILE = join(__dirname, "whitelist-addresses.json");

// Must match the contract exactly: keccak256(bytes.concat(keccak256(abi.encode(wallet))))
function leafOf(address: Address): Buffer {
  const inner = keccak256(encodeAbiParameters(parseAbiParameters("address"), [address]));
  const leaf = keccak256(inner);
  return Buffer.from(leaf.slice(2), "hex");
}

// Sorted-pair keccak256, matching OpenZeppelin's MerkleProof._hashPair and murky's
// hashLeafPairs — required for on-chain MerkleProof.verify to accept these proofs.
function hashPair(data: Buffer): Buffer {
  const hex = `0x${data.toString("hex")}` as `0x${string}`;
  return Buffer.from(keccak256(hex).slice(2), "hex");
}

async function main() {
  const raw: string[] = JSON.parse(readFileSync(ADDRESSES_FILE, "utf-8"));

  // Checksum + dedupe.
  const unique = Array.from(new Set(raw.map((a) => getAddress(a))));
  if (unique.length !== raw.length) {
    console.warn(`Deduped ${raw.length - unique.length} duplicate address(es).`);
  }

  const leaves = unique.map(leafOf);
  const tree = new MerkleTree(leaves, hashPair, { sortPairs: true, sortLeaves: true });
  const root = tree.getHexRoot();

  console.log(`\nWallets: ${unique.length}`);
  console.log(`merkleRoot: ${root}`);
  console.log(`\nOn the contract, before opening mint, call in order:`);
  console.log(`  setMerkleRoot(${root})`);
  console.log(`  setTotalWLWallets(${unique.length})`);
  console.log(`  (plus setWLAllocationPerWallet, setPublicWalletCap, setWLDeadline, updateMintPrice)\n`);

  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) {
    console.warn("SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY not set — skipping DB upload. Root/proofs above are still valid.");
    return;
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey);

  const rows = unique.map((address, i) => ({
    wallet_address: address.toLowerCase(),
    proof: tree.getHexProof(leaves[i]),
  }));

  const { error } = await supabase.from("whitelist_proofs").upsert(rows, { onConflict: "wallet_address" });
  if (error) {
    console.error("Supabase upsert failed:", error.message);
    process.exit(1);
  }

  console.log(`Upserted ${rows.length} proof(s) into whitelist_proofs.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});