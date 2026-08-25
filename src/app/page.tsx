/*
"use client";

import Image from "next/image";
import Link from "next/link";
import { motion, type Variants } from "framer-motion";
import { useReadContract } from "wagmi";
import Header from "@/components/Header/Header";
import MintCanvas from "@/components/MintCanvas/MintCanvas";
import Pending from "@/components/Pending/Pending";
import GleeTokenNotice from "@/components/GleeTokenNotice/GleeTokenNotice";
import NftLaunchNotice from "@/components/NftLaunchNotice/NftLaunchNotice";
import { pixelatedDelightsABI, PIXELATED_DELIGHTS_CONTRACT_ADDRESS } from "../utils/contractAbi";
import { NFT_MINT_LAUNCHED } from "../utils/nftLaunch";

const artworks = ["image1", "image2", "image3", "image4", "image5", "image6", "image7", "image8", "image9"];

const stats: [string, string][] = [
  ["9 × 9", "pixels per canvas"],
  ["8", "paint colors"],
  ["Robinhood", "built onchain"],
];

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: "easeOut" } },
};

export default function Home() {
  const { isPending } = useReadContract({ abi: pixelatedDelightsABI, address: PIXELATED_DELIGHTS_CONTRACT_ADDRESS, functionName: "totalSupply" });

  return (
    <div className="site-shell min-h-screen overflow-hidden text-[var(--foreground)]">
      <Header />
      <main>
        <section className="relative mx-auto grid max-w-7xl gap-12 px-6 pb-24 pt-36 lg:grid-cols-[1.03fr_.97fr] lg:px-8 lg:pt-48">
          <motion.div
            initial="hidden"
            animate="show"
            variants={{ show: { transition: { staggerChildren: 0.08 } } }}
            className="relative z-10 flex max-w-2xl flex-col items-start"
          >
            <motion.p variants={fadeUp} className="eyebrow-quiet">An onchain art garden · Robinhood Chain</motion.p>
            <motion.h1 variants={fadeUp} className="mt-6 font-[family-name:var(--font-fraunces)] text-5xl italic leading-[1.05] text-[var(--foreground)] sm:text-6xl">
              Make a tiny<br /><span className="text-[var(--accent)]">masterpiece.</span>
            </motion.h1>
            <motion.p variants={fadeUp} className="mt-7 max-w-xl text-lg leading-relaxed text-[var(--foreground-muted)]">
              A shared garden of 9 × 9 canvases. Choose from eight colors, paint your idea, and turn a small square into a collectible delight.
            </motion.p>
            <motion.div variants={fadeUp} className="mt-9 flex flex-wrap gap-3">
              <motion.a whileHover={{ y: -1 }} whileTap={{ scale: 0.98 }} href="#mint" className="quiet-button quiet-button--filled px-6 py-3 text-sm">
                Get a canvas <span className="ml-1">↘</span>
              </motion.a>
              <Link href="/gallery">
                <motion.span whileHover={{ y: -1 }} whileTap={{ scale: 0.98 }} className="quiet-button inline-flex px-6 py-3 text-sm">
                  Explore the garden
                </motion.span>
              </Link>
            </motion.div>
            <motion.div variants={fadeUp} className="mt-12 grid w-full max-w-lg grid-cols-3 border border-[var(--border-hairline)]">
              {stats.map(([value, label]) => (
                <div className="border-r border-[var(--border-hairline)] px-4 py-4 last:border-0" key={value}>
                  <strong className="block font-[family-name:var(--font-geist-mono)] text-xl text-[var(--foreground)]">{value}</strong>
                  <span className="mt-1 block text-xs uppercase tracking-wider text-[var(--foreground-muted)]">{label}</span>
                </div>
              ))}
            </motion.div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, ease: "easeOut", delay: 0.15 }}
            className="relative mx-auto grid w-full max-w-[510px] grid-cols-3 gap-2 self-center border border-[var(--border-hairline)] bg-[var(--background-2)]/60 p-3 sm:gap-3 sm:p-5"
          >
            {artworks.map((artwork, index) => (
              <motion.div
                key={artwork}
                whileHover={{ scale: 1.04 }}
                transition={{ duration: 0.25, ease: "easeOut" }}
                className={`relative aspect-square overflow-hidden border ${index === 4 ? "border-[var(--accent)]" : "border-[var(--border-hairline)]"} bg-[#fbf8f2]`}
              >
                <Image src={`/images/${artwork}.png`} alt={`Canvas ${index + 1}`} fill sizes="(max-width: 640px) 30vw, 160px" className="object-cover" />
              </motion.div>
            ))}
            <span className="absolute -right-3 -top-3 hidden border border-[var(--border-hairline-strong)] bg-[var(--background-2)] px-3 py-1.5 font-[family-name:var(--font-fraunces)] text-sm italic text-[var(--foreground)] sm:block">
              Plant an idea
            </span>
          </motion.div>
        </section>

        <motion.section
          id="mint"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className="relative scroll-mt-24 border-y border-[var(--border-hairline)] bg-[var(--background-2)]/40 px-6 py-20 sm:py-28"
        >
          <div className="mx-auto grid max-w-5xl gap-12 lg:grid-cols-[.8fr_1.2fr] lg:items-center">
            <div>
              <p className="eyebrow-quiet">Your plot awaits</p>
              <h2 className="mt-5 font-[family-name:var(--font-fraunces)] text-4xl italic leading-tight text-[var(--foreground)] sm:text-5xl">
                Start with<br />a blank canvas.
              </h2>
              <p className="mt-5 max-w-sm leading-relaxed text-[var(--foreground-muted)]">
                Mint as many canvases as you want, then bring them to life in the painting room.
              </p>
            </div>
            <div className="studio-panel mx-auto w-full max-w-md p-6">
              {!NFT_MINT_LAUNCHED ? (
                <NftLaunchNotice className="border-0 bg-transparent p-0" />
              ) : isPending ? (
                <div className="flex justify-center py-8">
                  <Pending className="animate-spin" />
                </div>
              ) : (
                <MintCanvas />
              )}
            </div>
          </div>
        </motion.section>

        <motion.section
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className="px-6 py-20 sm:py-28"
        >
          <div className="mx-auto grid max-w-5xl gap-12 lg:grid-cols-[1.1fr_.9fr] lg:items-center">
            <div>
              <p className="eyebrow-quiet">The $GLEE token</p>
              <h2 className="mt-5 font-[family-name:var(--font-fraunces)] text-4xl italic leading-tight text-[var(--foreground)] sm:text-5xl">
                Support what<br />moves you.
              </h2>
              <p className="mt-5 max-w-md leading-relaxed text-[var(--foreground-muted)]">
                Every finished canvas in the gallery can receive $GLEE tips. It's how the community rewards good work — value passed straight to the people who made it.
              </p>
              <GleeTokenNotice className="mt-5 max-w-md" />
              <div className="mt-8 flex flex-wrap gap-3">
                <Link href="/gallery">
                  <motion.span whileHover={{ y: -1 }} whileTap={{ scale: 0.98 }} className="quiet-button quiet-button--filled inline-flex px-6 py-3 text-sm">
                    Browse the gallery <span className="ml-1">↘</span>
                  </motion.span>
                </Link>
                <Link href="/about">
                  <motion.span whileHover={{ y: -1 }} whileTap={{ scale: 0.98 }} className="quiet-button inline-flex px-6 py-3 text-sm">
                    Learn more about $GLEE
                  </motion.span>
                </Link>
              </div>
            </div>
            <div className="studio-panel p-7 sm:p-9">
              <p className="eyebrow-quiet">How a tip splits</p>
              <div className="mt-6 space-y-4">
                <div className="flex items-center justify-between border-b border-[var(--border-hairline)] pb-4">
                  <span className="text-[var(--foreground)]">Original painter</span>
                  <span className="font-[family-name:var(--font-geist-mono)] text-lg text-[var(--accent)]">50%</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[var(--foreground)]">Current owner</span>
                  <span className="font-[family-name:var(--font-geist-mono)] text-lg text-[var(--accent)]">50%</span>
                </div>
              </div>
              <p className="mt-6 text-sm leading-relaxed text-[var(--foreground-muted)]">
                Every tip splits evenly between the two — the maker, and whoever holds the piece now.
              </p>
            </div>
          </div>
        </motion.section>
      </main>

      <footer className="mx-auto flex max-w-7xl flex-col gap-4 px-6 py-8 text-sm text-[var(--foreground-muted)] sm:flex-row sm:items-center sm:justify-between">
        <span className="font-[family-name:var(--font-fraunces)] italic text-[var(--foreground)]">Glee<span className="text-[var(--accent)]">.</span> onchain pixel art</span>
        <div className="flex gap-5">
          <a href="https://x.com/GLEEproj" target="_blank" className="transition-colors hover:text-[var(--foreground)]">X</a>
          <a href="https://x.com/GLEEproj" target="_blank" className="transition-colors hover:text-[var(--foreground)]">PONS</a>
        </div>
      </footer>
    </div>
  );
}
  */



"use client";
 
import Image from "next/image";
import Link from "next/link";
import { motion, type Variants } from "framer-motion";
import { useReadContract } from "wagmi";
import Header from "@/components/Header/Header";
import MintCanvas from "@/components/MintCanvas/MintCanvas";
import Pending from "@/components/Pending/Pending";
import GleeTokenNotice from "@/components/GleeTokenNotice/GleeTokenNotice";
import NftLaunchNotice from "@/components/NftLaunchNotice/NftLaunchNotice";
import { pixelatedDelightsABI, PIXELATED_DELIGHTS_CONTRACT_ADDRESS } from "../utils/contractAbi";
import { NFT_MINT_LAUNCHED } from "../utils/nftLaunch";
 
const artworks = ["image1", "image2", "image3", "image4", "image5", "image6", "image7", "image8", "image9"];
 
const stats: [string, string][] = [
  ["9 × 9", "pixels per canvas"],
  ["8", "paint colors"],
  ["Robinhood", "built onchain"],
];
 
const whitelistCommunities = ["Chain Mancers", "RH Machines", "Chain Raiders", "Quotrons"];
 
const fadeUp: Variants = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: "easeOut" } },
};
 
export default function Home() {
  const { isPending } = useReadContract({ abi: pixelatedDelightsABI, address: PIXELATED_DELIGHTS_CONTRACT_ADDRESS, functionName: "totalSupply" });
 
  return (
    <div className="site-shell min-h-screen overflow-hidden text-[var(--foreground)]">
      <Header />
      <main>
        <section className="relative mx-auto grid max-w-7xl gap-12 px-6 pb-24 pt-36 lg:grid-cols-[1.03fr_.97fr] lg:px-8 lg:pt-48">
          <motion.div
            initial="hidden"
            animate="show"
            variants={{ show: { transition: { staggerChildren: 0.08 } } }}
            className="relative z-10 flex max-w-2xl flex-col items-start"
          >
            <motion.p variants={fadeUp} className="eyebrow-quiet">An onchain art garden · Robinhood Chain</motion.p>
            <motion.h1 variants={fadeUp} className="mt-6 font-[family-name:var(--font-fraunces)] text-5xl italic leading-[1.05] text-[var(--foreground)] sm:text-6xl">
              Make a tiny<br /><span className="text-[var(--accent)]">masterpiece.</span>
            </motion.h1>
            <motion.p variants={fadeUp} className="mt-7 max-w-xl text-lg leading-relaxed text-[var(--foreground-muted)]">
              A shared garden of 9 × 9 canvases. Choose from eight colors, paint your idea, and turn a small square into a collectible delight.
            </motion.p>
            <motion.div variants={fadeUp} className="mt-9 flex flex-wrap gap-3">
              <motion.a whileHover={{ y: -1 }} whileTap={{ scale: 0.98 }} href="#mint" className="quiet-button quiet-button--filled px-6 py-3 text-sm">
                Get a canvas <span className="ml-1">↘</span>
              </motion.a>
              <Link href="/gallery">
                <motion.span whileHover={{ y: -1 }} whileTap={{ scale: 0.98 }} className="quiet-button inline-flex px-6 py-3 text-sm">
                  Explore the garden
                </motion.span>
              </Link>
            </motion.div>
            <motion.div variants={fadeUp} className="mt-12 grid w-full max-w-lg grid-cols-3 border border-[var(--border-hairline)]">
              {stats.map(([value, label]) => (
                <div className="border-r border-[var(--border-hairline)] px-4 py-4 last:border-0" key={value}>
                  <strong className="block font-[family-name:var(--font-geist-mono)] text-xl text-[var(--foreground)]">{value}</strong>
                  <span className="mt-1 block text-xs uppercase tracking-wider text-[var(--foreground-muted)]">{label}</span>
                </div>
              ))}
            </motion.div>
          </motion.div>
 
          <motion.div
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, ease: "easeOut", delay: 0.15 }}
            className="relative mx-auto grid w-full max-w-[510px] grid-cols-3 gap-2 self-center border border-[var(--border-hairline)] bg-[var(--background-2)]/60 p-3 sm:gap-3 sm:p-5"
          >
            {artworks.map((artwork, index) => (
              <motion.div
                key={artwork}
                whileHover={{ scale: 1.04 }}
                transition={{ duration: 0.25, ease: "easeOut" }}
                className={`relative aspect-square overflow-hidden border ${index === 4 ? "border-[var(--accent)]" : "border-[var(--border-hairline)]"} bg-[#fbf8f2]`}
              >
                <Image src={`/images/${artwork}.png`} alt={`Canvas ${index + 1}`} fill sizes="(max-width: 640px) 30vw, 160px" className="object-cover" />
              </motion.div>
            ))}
            <span className="absolute -right-3 -top-3 hidden border border-[var(--border-hairline-strong)] bg-[var(--background-2)] px-3 py-1.5 font-[family-name:var(--font-fraunces)] text-sm italic text-[var(--foreground)] sm:block">
              Plant an idea
            </span>
          </motion.div>
        </section>
 
        <motion.section
          id="mint"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className="relative scroll-mt-24 border-y border-[var(--border-hairline)] bg-[var(--background-2)]/40 px-6 py-20 sm:py-28"
        >
          <div className="mx-auto grid max-w-5xl gap-12 lg:grid-cols-[.8fr_1.2fr] lg:items-center">
            <div>
              <p className="eyebrow-quiet">Your plot awaits</p>
              <h2 className="mt-5 font-[family-name:var(--font-fraunces)] text-4xl italic leading-tight text-[var(--foreground)] sm:text-5xl">
                Start with<br />a blank canvas.
              </h2>
              <p className="mt-5 max-w-sm leading-relaxed text-[var(--foreground-muted)]">
                Mint as many canvases as you want, then bring them to life in the painting room.
              </p>
            </div>
            <div className="studio-panel mx-auto w-full max-w-md p-6">
              {!NFT_MINT_LAUNCHED ? (
                <NftLaunchNotice className="border-0 bg-transparent p-0" />
              ) : isPending ? (
                <div className="flex justify-center py-8">
                  <Pending className="animate-spin" />
                </div>
              ) : (
                <MintCanvas />
              )}
            </div>
          </div>
        </motion.section>
 
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className="border-b border-[var(--border-hairline)] px-6 py-20 sm:py-28"
        >
          <div className="mx-auto max-w-5xl">
            <p className="eyebrow-quiet">The whitelist</p>
            <h2 className="mt-5 max-w-xl font-[family-name:var(--font-fraunces)] text-4xl italic leading-tight text-[var(--foreground)] sm:text-5xl">
              Whitelist and public,<br />minting together.
            </h2>
            <p className="mt-5 max-w-xl leading-relaxed text-[var(--foreground-muted)]">
              There&apos;s no separate phase — whitelisted or not, you can mint from the moment it opens. Whitelisted
              wallets just get a guaranteed allocation held for them at the same price as public mint. Once the
              whitelist window closes, whatever&apos;s left of that reserved supply opens up to public mint too.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              {whitelistCommunities.map((name) => (
                <span key={name} className="border border-[var(--border-hairline-strong)] px-4 py-2 text-sm text-[var(--foreground)]">
                  {name}
                </span>
              ))}
            </div>
          </div>
        </motion.section>
 
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className="px-6 py-20 sm:py-28"
        >
          <div className="mx-auto grid max-w-5xl gap-12 lg:grid-cols-[1.1fr_.9fr] lg:items-center">
            <div>
              <p className="eyebrow-quiet">The $GLEE token</p>
              <h2 className="mt-5 font-[family-name:var(--font-fraunces)] text-4xl italic leading-tight text-[var(--foreground)] sm:text-5xl">
                Support what<br />moves you.
              </h2>
              <p className="mt-5 max-w-md leading-relaxed text-[var(--foreground-muted)]">
                Every finished canvas in the gallery can receive $GLEE tips. It's how the community rewards good work — value passed straight to the people who made it.
              </p>
              <GleeTokenNotice className="mt-5 max-w-md" />
              <div className="mt-8 flex flex-wrap gap-3">
                <Link href="/gallery">
                  <motion.span whileHover={{ y: -1 }} whileTap={{ scale: 0.98 }} className="quiet-button quiet-button--filled inline-flex px-6 py-3 text-sm">
                    Browse the gallery <span className="ml-1">↘</span>
                  </motion.span>
                </Link>
                <Link href="/about">
                  <motion.span whileHover={{ y: -1 }} whileTap={{ scale: 0.98 }} className="quiet-button inline-flex px-6 py-3 text-sm">
                    Learn more about $GLEE
                  </motion.span>
                </Link>
              </div>
            </div>
            <div className="studio-panel p-7 sm:p-9">
              <p className="eyebrow-quiet">How a tip splits</p>
              <div className="mt-6 space-y-4">
                <div className="flex items-center justify-between border-b border-[var(--border-hairline)] pb-4">
                  <span className="text-[var(--foreground)]">Original painter</span>
                  <span className="font-[family-name:var(--font-geist-mono)] text-lg text-[var(--accent)]">50%</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[var(--foreground)]">Current owner</span>
                  <span className="font-[family-name:var(--font-geist-mono)] text-lg text-[var(--accent)]">50%</span>
                </div>
              </div>
              <p className="mt-6 text-sm leading-relaxed text-[var(--foreground-muted)]">
                Every tip splits evenly between the two — the maker, and whoever holds the piece now.
              </p>
            </div>
          </div>
        </motion.section>
      </main>
 
      <footer className="mx-auto flex max-w-7xl flex-col gap-4 px-6 py-8 text-sm text-[var(--foreground-muted)] sm:flex-row sm:items-center sm:justify-between">
        <span className="font-[family-name:var(--font-fraunces)] italic text-[var(--foreground)]">Glee<span className="text-[var(--accent)]">.</span> onchain pixel art</span>
        <div className="flex gap-5">
          <a href="https://x.com/GLEEproj" target="_blank" className="transition-colors hover:text-[var(--foreground)]">X</a>
          <a href="https://x.com/GLEEproj" target="_blank" className="transition-colors hover:text-[var(--foreground)]">PONS</a>
        </div>
      </footer>
    </div>
  );
}