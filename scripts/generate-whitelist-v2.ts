/**
 * Generates the WL Merkle tree from NFT holders,
 * writes an auditable snapshot artifact,
 * and pushes per-wallet proofs to Supabase.
 *
 * Usage:
 *
 *   1. Create:
 *
 *        scripts/whitelist-collections.json
 *
 *   2. Example:
 *
 *        [
 *          {
 *            "name": "Collection C1",
 *            "chain": "base-mainnet",
 *            "contract": "0x..."
 *          },
 *          {
 *            "name": "Collection C2",
 *            "chain": "eth-mainnet",
 *            "contract": "0x..."
 *          }
 *        ]
 *
 *   3. Set in .env.local:
 *
 *        ALCHEMY_API_KEY=...
 *        SUPABASE_URL=...
 *        SUPABASE_SERVICE_ROLE_KEY=...
 *
 *   4. Run:
 *
 *        npx tsx scripts/generate-whitelist.ts
 *
 * The script produces:
 *
 *   - Merkle root
 *   - Unique WL wallet count
 *   - Duplicate count
 *   - Snapshot JSON artifact
 *   - Supabase whitelist proofs
 */

import dotenv from "dotenv";
import { join } from "path";
import { createClient } from "@supabase/supabase-js";
import {
  keccak256,
  encodeAbiParameters,
  parseAbiParameters,
  getAddress,
  type Address,
} from "viem";
import { MerkleTree } from "merkletreejs";
import { readFileSync, writeFileSync, mkdirSync } from "fs";

// NOTE: this must resolve to the .env file at your project root. The previous
// version pointed at path.resolve(process.cwd(), "../.env.local") — since
// process.cwd() is already the project root when run as documented above
// (`npx tsx scripts/generate-whitelist.ts` from the root), "../.env.local"
// resolved to a directory ABOVE the project, and to a different filename
// than the .env you're actually using. Plain dotenv.config() below loads
// .env from cwd, matching your working setup.
dotenv.config();

/* -------------------------------------------------------------------------- */
/* Paths                                                                      */
/* -------------------------------------------------------------------------- */

const COLLECTIONS_FILE = join(
  __dirname,
  "whitelist-collections.json"
);

const SNAPSHOTS_DIR = join(
  __dirname,
  "snapshots"
);

/* -------------------------------------------------------------------------- */
/* Environment                                                                */
/* -------------------------------------------------------------------------- */

const ALCHEMY_API_KEY =
  process.env.ALCHEMY_API_KEY;

/* -------------------------------------------------------------------------- */
/* Types                                                                      */
/* -------------------------------------------------------------------------- */

type CollectionConfig = {
  name: string;
  chain: string;
  contract: Address;
};

// Without withTokenBalances=true, Alchemy's getOwnersForContract returns
// `owners` as a plain array of address strings, NOT objects with an
// ownerAddress field. We don't use token balances anywhere in this script,
// so we deliberately don't request them (smaller, cheaper response) —
// the type here reflects the actual default response shape.
type AlchemyOwnersResponse = {
  owners: string[];

  pageKey?: string | null;
};

type CollectionSnapshot = {
  name: string;
  chain: string;
  contract: Address;

  holderCount: number;

  holders: string[];
};

type WhitelistSnapshot = {
  snapshotVersion: 1;

  generatedAt: string;

  generatedAtUnix: number;

  source: {
    provider: "alchemy";
    endpoint: "getOwnersForContract";
  };

  collections: CollectionSnapshot[];

  statistics: {
    collectionCount: number;

    totalHolderEntriesAcrossCollections: number;

    uniqueWalletCount: number;

    duplicatesRemoved: number;
  };

  wallets: string[];

  merkle: {
    root: string;
    walletCount: number;
  };
};

/* -------------------------------------------------------------------------- */
/* Merkle helpers                                                             */
/* -------------------------------------------------------------------------- */

// Must match the contract exactly:
//
// keccak256(bytes.concat(keccak256(abi.encode(wallet))))

function leafOf(address: Address): Buffer {
  const inner = keccak256(
    encodeAbiParameters(
      parseAbiParameters("address"),
      [address]
    )
  );

  const leaf = keccak256(inner);

  return Buffer.from(
    leaf.slice(2),
    "hex"
  );
}

/**
 * Sorted-pair keccak256.
 *
 * Matches OpenZeppelin's MerkleProof._hashPair
 * and the tree configuration used by the contract.
 */
function hashPair(data: Buffer): Buffer {
  const hex =
    `0x${data.toString("hex")}` as `0x${string}`;

  return Buffer.from(
    keccak256(hex).slice(2),
    "hex"
  );
}

/* -------------------------------------------------------------------------- */
/* Alchemy                                                                    */
/* -------------------------------------------------------------------------- */

function getAlchemyNftBaseUrl(
  chain: string
): string {
  if (!ALCHEMY_API_KEY) {
    throw new Error(
      "ALCHEMY_API_KEY is not set."
    );
  }

  return (
    `https://${chain}.g.alchemy.com/nft/v3/` +
    `${ALCHEMY_API_KEY}`
  );
}

/**
 * Fetch every holder of one NFT contract.
 *
 * getOwnersForContract is paginated through pageKey.
 */
async function getCollectionHolders(
  collection: CollectionConfig
): Promise<string[]> {
  const baseUrl =
    getAlchemyNftBaseUrl(
      collection.chain
    );

  const holders: string[] = [];

  let pageKey: string | undefined;

  let pageNumber = 0;

  console.log(
    `\nFetching holders for ${collection.name}`
  );

  console.log(
    `  Chain:    ${collection.chain}`
  );

  console.log(
    `  Contract: ${collection.contract}`
  );

  do {
    pageNumber++;

    const params =
      new URLSearchParams();

    params.set(
      "contractAddress",
      collection.contract
    );

    if (pageKey) {
      params.set(
        "pageKey",
        pageKey
      );
    }

    const url =
      `${baseUrl}/getOwnersForContract?` +
      params.toString();

    const response =
      await fetch(url);

    if (!response.ok) {
      const body =
        await response.text();

      throw new Error(
        [
          `Alchemy request failed.`,
          `Collection: ${collection.name}`,
          `Chain: ${collection.chain}`,
          `Contract: ${collection.contract}`,
          `HTTP: ${response.status} ${response.statusText}`,
          body,
        ].join("\n")
      );
    }

    const data =
      (await response.json()) as
        AlchemyOwnersResponse;

    for (const ownerAddress of data.owners ?? []) {
      holders.push(
        getAddress(
          ownerAddress
        )
      );
    }

    console.log(
      `  Page ${pageNumber}: ` +
      `${data.owners?.length ?? 0} holders`
    );

    pageKey =
      data.pageKey ?? undefined;

  } while (pageKey);

  console.log(
    `  Total holders: ${holders.length}`
  );

  return holders;
}

/* -------------------------------------------------------------------------- */
/* Snapshot helpers                                                           */
/* -------------------------------------------------------------------------- */

function timestampForFilename(
  date: Date
): string {
  return date
    .toISOString()
    .replace(/:/g, "-")
    .replace(/\./g, "-");
}

function writeSnapshot(
  snapshot: WhitelistSnapshot,
  generatedAt: Date
): string {
  mkdirSync(
    SNAPSHOTS_DIR,
    {
      recursive: true,
    }
  );

  const filename =
    `whitelist-snapshot-${timestampForFilename(
      generatedAt
    )}.json`;

  const filepath =
    join(
      SNAPSHOTS_DIR,
      filename
    );

  writeFileSync(
    filepath,
    JSON.stringify(
      snapshot,
      null,
      2
    ),
    "utf-8"
  );

  return filepath;
}

/* -------------------------------------------------------------------------- */
/* Main                                                                       */
/* -------------------------------------------------------------------------- */

async function main() {
  const collections =
    JSON.parse(
      readFileSync(
        COLLECTIONS_FILE,
        "utf-8"
      )
    ) as CollectionConfig[];

  if (!Array.isArray(collections)) {
    throw new Error(
      "whitelist-collections.json must contain an array."
    );
  }

  if (collections.length === 0) {
    throw new Error(
      "No NFT collections configured."
    );
  }

  console.log(
    `\nConfigured collections: ${collections.length}`
  );

  const generatedAt =
    new Date();

  const collectionSnapshots:
    CollectionSnapshot[] = [];

  const allHolderAddresses:
    string[] = [];

  for (const collection of collections) {
    const holders =
      await getCollectionHolders(
        collection
      );

    collectionSnapshots.push({
      name: collection.name,

      chain: collection.chain,

      contract:
        getAddress(
          collection.contract
        ),

      holderCount:
        holders.length,

      holders: holders
        .map((address) =>
          getAddress(address)
        )
        .sort(),
    });

    allHolderAddresses.push(
      ...holders
    );
  }

  const uniqueLowercase =
    new Set(
      allHolderAddresses.map(
        (address) =>
          address.toLowerCase()
      )
    );

  const unique =
    Array.from(
      uniqueLowercase
    )
      .map((address) =>
        getAddress(address)
      )
      .sort();

  const duplicatesRemoved =
    allHolderAddresses.length -
    unique.length;

  console.log(
    `\nTotal holder entries across collections: ` +
    `${allHolderAddresses.length}`
  );

  console.log(
    `Unique wallets: ${unique.length}`
  );

  console.log(
    `Duplicates removed: ${duplicatesRemoved}`
  );

  const leaves =
    unique.map(leafOf);

  const tree =
    new MerkleTree(
      leaves,
      hashPair,
      {
        sortPairs: true,
        sortLeaves: true,
      }
    );

  const root =
    tree.getHexRoot();

  const snapshot:
    WhitelistSnapshot = {
      snapshotVersion: 1,

      generatedAt:
        generatedAt.toISOString(),

      generatedAtUnix:
        Math.floor(
          generatedAt.getTime() / 1000
        ),

      source: {
        provider: "alchemy",
        endpoint:
          "getOwnersForContract",
      },

      collections:
        collectionSnapshots,

      statistics: {
        collectionCount:
          collections.length,

        totalHolderEntriesAcrossCollections:
          allHolderAddresses.length,

        uniqueWalletCount:
          unique.length,

        duplicatesRemoved,
      },

      wallets:
        unique,

      merkle: {
        root,

        walletCount:
          unique.length,
      },
    };

  const snapshotPath =
    writeSnapshot(
      snapshot,
      generatedAt
    );

  console.log(
    `\n========================================`
  );

  console.log(
    `WL SNAPSHOT GENERATED`
  );

  console.log(
    `========================================`
  );

  console.log(
    `Generated at: ${generatedAt.toISOString()}`
  );

  console.log(
    `Collections: ${collections.length}`
  );

  console.log(
    `Raw holder entries: ${allHolderAddresses.length}`
  );

  console.log(
    `Duplicates removed: ${duplicatesRemoved}`
  );

  console.log(
    `Unique wallets: ${unique.length}`
  );

  console.log(
    `Merkle root: ${root}`
  );

  console.log(
    `Snapshot: ${snapshotPath}`
  );

  console.log(
    `========================================\n`
  );

  console.log(
    `On the contract, before opening mint, call:`
  );

  console.log(
    `  setMerkleRoot(${root})`
  );

  console.log(
    `  setTotalWLWallets(${unique.length})`
  );

  console.log(
    `  (plus setWLAllocationPerWallet, setPublicWalletCap, setWLDeadline, updateMintPrice)\n`
  );

  const supabaseUrl =
    process.env.SUPABASE_URL;

  const serviceRoleKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (
    !supabaseUrl ||
    !serviceRoleKey
  ) {
    console.warn(
      "SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY not set."
    );

    console.warn(
      "Skipping DB upload."
    );

    console.warn(
      "Merkle root and snapshot were still generated."
    );

    return;
  }

  const supabase =
    createClient(
      supabaseUrl,
      serviceRoleKey
    );

  const rows =
    unique.map(
      (
        address,
        i
      ) => ({
        wallet_address:
          address.toLowerCase(),

        proof:
          tree.getHexProof(
            leaves[i]
          ),
      })
    );

  const {
    error,
  } = await supabase
    .from(
      "whitelist_proofs"
    )
    .upsert(
      rows,
      {
        onConflict:
          "wallet_address",
      }
    );

  if (error) {
    console.error(
      "Supabase upsert failed:",
      error.message
    );

    process.exit(1);
  }

  console.log(
    `Upserted ${rows.length} proof(s) into whitelist_proofs.`
  );
}

main().catch(
  (err) => {
    console.error(err);
    process.exit(1);
  }
);