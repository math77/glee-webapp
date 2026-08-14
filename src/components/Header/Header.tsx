"use client";

import Link from "next/link";
import { useState } from "react";
import WalletButton from "../WalletButton/WalletButton";

const links = [
  { href: "/about", label: "About" },
  { href: "/create", label: "Paint" },
  { href: "/gallery", label: "Gallery" },
];

interface HeaderProps {
  toggleSound?: () => void;
  isSoundMuted?: boolean;
  toggleMusic?: () => void;
  isMusicMuted?: boolean;
  isMusicPlaying?: boolean;
}

const Header = ({ toggleSound, isSoundMuted, toggleMusic, isMusicMuted }: HeaderProps) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <header className="fixed inset-x-0 top-0 z-50 px-3 pt-3 sm:px-6 sm:pt-5">
      <div className="mx-auto flex max-w-7xl items-center justify-between border border-white/15 bg-[#0b1220]/85 px-4 py-3 shadow-[0_8px_0_rgba(0,0,0,0.24)] backdrop-blur-md sm:px-5">
        <Link href="/" className="font-[family-name:var(--font-pixelify-sans)] text-2xl font-bold tracking-tight text-white sm:text-3xl">
          G<span className="text-[#a8f85b]">LEE</span>
        </Link>

        <nav className="hidden items-center gap-1 md:flex" aria-label="Main navigation">
          {links.map((link) => (
            <Link key={link.href} href={link.href} className="px-3 py-2 font-[family-name:var(--font-pixelify-sans)] text-lg text-slate-300 transition hover:bg-white/10 hover:text-[#a8f85b]">
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="hidden items-center gap-1 md:flex">
          {toggleSound && <button onClick={toggleSound} className="grid h-9 w-9 place-items-center text-slate-300 hover:bg-white/10 hover:text-white" aria-label={isSoundMuted ? "Unmute sound effects" : "Mute sound effects"}>{isSoundMuted ? "🔇" : "🔊"}</button>}
          {toggleMusic && <button onClick={toggleMusic} className="grid h-9 w-9 place-items-center text-slate-300 hover:bg-white/10 hover:text-white" aria-label={isMusicMuted ? "Unmute music" : "Mute music"}>{isMusicMuted ? "♫̸" : "♫"}</button>}
          <WalletButton iconVersion={false} shape="rounded-none" backgroundColor="bg-[#a8f85b]" paddingX="px-4" />
        </div>
        <button onClick={() => setIsMenuOpen((open) => !open)} className="grid h-9 w-9 place-items-center border border-white/20 text-white md:hidden" aria-expanded={isMenuOpen} aria-label="Toggle menu">
          <span className="text-xl leading-none">{isMenuOpen ? "×" : "☰"}</span>
        </button>
      </div>
      {isMenuOpen && (
        <nav className="mx-auto max-w-7xl border-x border-b border-white/15 bg-[#0b1220] p-3 md:hidden" aria-label="Mobile navigation">
          {links.map((link) => (
            <Link key={link.href} href={link.href} onClick={() => setIsMenuOpen(false)} className="block border-b border-white/10 px-3 py-3 font-[family-name:var(--font-pixelify-sans)] text-xl text-white last:border-0">
              {link.label}
            </Link>
          ))}
          <div className="px-3 pt-3"><WalletButton iconVersion={false} shape="rounded-none" backgroundColor="bg-[#a8f85b]" paddingX="px-4" /></div>
        </nav>
      )}
    </header>
  );
};

export default Header;
