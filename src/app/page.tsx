"use client";

import Image from "next/image";
import Link from "next/link";
import { useReadContract } from "wagmi";
import Header from "@/components/Header/Header";
import MintCanvas from "@/components/MintCanvas/MintCanvas";
import Pending from "@/components/Pending/Pending";
import { pixelatedDelightsABI, PIXELATED_DELIGHTS_CONTRACT_ADDRESS } from "../../utils/contractAbi";

const artworks = ["image1", "image2", "image3", "image4", "image5", "image6", "image7", "image8", "image9"];

export default function Home() {
  const { isPending } = useReadContract({ abi: pixelatedDelightsABI, address: PIXELATED_DELIGHTS_CONTRACT_ADDRESS, functionName: "totalSupply" });

  return (
    <div className="site-shell min-h-screen overflow-hidden text-white">
      <Header />
      <main>
        <section className="relative mx-auto grid max-w-7xl gap-12 px-6 pb-24 pt-36 lg:grid-cols-[1.03fr_.97fr] lg:px-8 lg:pt-48">
          <div className="relative z-10 flex max-w-2xl flex-col items-start">
            <p className="eyebrow">An onchain art garden · Robinhood Chain</p>
            <h1 className="mt-6 font-[family-name:var(--font-pixelify-sans)] text-5xl font-bold leading-[.95] tracking-tight sm:text-7xl">
              Make a tiny<br /><span className="text-[#a8f85b]">masterpiece.</span>
            </h1>
            <p className="mt-7 max-w-xl text-lg leading-relaxed text-slate-300 sm:text-xl">A shared garden of 9 × 9 canvases. Choose from eight colors, paint your idea, and turn a small square into a collectible delight.</p>
            <div className="mt-9 flex flex-wrap gap-3">
              <Link href="#mint" className="pixel-button bg-[#a8f85b] text-[#08101c]">Get a canvas <span>↘</span></Link>
              <Link href="/gallery" className="pixel-button border border-white/25 bg-white/5 text-white">Explore the garden</Link>
            </div>
            <div className="mt-12 grid w-full max-w-lg grid-cols-3 border border-white/10 bg-white/[.03]">
              {[['9 × 9', 'pixels per canvas'], ['8', 'paint colors'], ['Robinhood', 'built onchain']].map(([value, label]) => <div className="border-r border-white/10 px-4 py-4 last:border-0" key={value}><strong className="block font-[family-name:var(--font-pixelify-sans)] text-2xl text-[#f8d65d]">{value}</strong><span className="mt-1 block text-xs uppercase tracking-wider text-slate-400">{label}</span></div>)}
            </div>
          </div>
          <div className="art-grid relative mx-auto grid w-full max-w-[510px] grid-cols-3 gap-2 self-center p-3 sm:gap-3 sm:p-5">
            {artworks.map((artwork, index) => <div className={`relative aspect-square overflow-hidden border border-white/15 bg-[#111c2e] ${index === 4 ? "scale-110 shadow-[0_0_0_4px_#a8f85b]" : ""}`} key={artwork}><Image src={`/images/${artwork}.png`} alt={`Canvas ${index + 1}`} fill sizes="(max-width: 640px) 30vw, 160px" className="object-cover transition duration-500 hover:scale-110" /></div>)}
            <span className="absolute -right-5 -top-5 hidden border border-[#a8f85b]/50 bg-[#142414] px-3 py-2 font-[family-name:var(--font-pixelify-sans)] text-sm text-[#a8f85b] sm:block">PLANT AN IDEA</span>
          </div>
        </section>
        <section id="mint" className="relative scroll-mt-24 border-y border-white/10 bg-[#0d1827]/80 px-6 py-20 sm:py-28">
          <div className="mx-auto grid max-w-5xl gap-12 lg:grid-cols-[.8fr_1.2fr] lg:items-center">
            <div><p className="eyebrow">Your plot awaits</p><h2 className="mt-5 font-[family-name:var(--font-pixelify-sans)] text-4xl font-bold leading-none sm:text-5xl">Start with<br />a blank canvas.</h2><p className="mt-5 max-w-sm leading-relaxed text-slate-400">Mint as many canvases as you want, then bring them to life in the painting room.</p></div>
            <div className="mint-frame">{isPending ? <Pending className="animate-spin" /> : <MintCanvas basePrice={0.0011} />}</div>
          </div>
        </section>
      </main>
      <footer className="mx-auto flex max-w-7xl flex-col gap-4 px-6 py-8 text-sm text-slate-500 sm:flex-row sm:items-center sm:justify-between"><span className="font-[family-name:var(--font-pixelify-sans)] text-slate-300">GLEE · ONCHAIN PIXEL ART</span><div className="flex gap-5"><a href="https://x.com/hibyded">X</a><a href="https://warpcast.com/byded">Warpcast</a><a href="https://t.me/+0KcxEHKK2QZlMmUx">Telegram</a></div></footer>
    </div>
  );
}
