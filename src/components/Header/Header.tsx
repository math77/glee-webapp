/*
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
*/

"use client";

import Link from "next/link";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import WalletButton from "../WalletButton/WalletButton";
import ActivityLog from "../ActivityLog/ActivityLog";

const links = [
  { href: "/about", label: "About" },
  { href: "/create", label: "Paint" },
  { href: "/gallery", label: "Gallery" },
];

interface HeaderProps {
  toggleMusic?: () => void;
  isMusicMuted?: boolean;
  isMusicPlaying?: boolean;
}

const Header = ({ toggleMusic, isMusicMuted }: HeaderProps) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <motion.header
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className="fixed inset-x-0 top-0 z-50 px-3 pt-3 sm:px-6 sm:pt-5"
    >
      <div className="mx-auto flex max-w-7xl items-center justify-between border border-[var(--border-hairline)] bg-[var(--background-2)]/85 px-4 py-3 backdrop-blur-md sm:px-5">
        <Link href="/" className="font-[family-name:var(--font-fraunces)] text-2xl italic tracking-tight text-[var(--foreground)] sm:text-3xl">
          Glee<span className="text-[var(--accent)]">.</span>
        </Link>

        <nav className="hidden items-center gap-1 md:flex" aria-label="Main navigation">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="group relative px-3 py-2 font-[family-name:var(--font-geist-sans)] text-sm text-[var(--foreground-muted)] transition-colors hover:text-[var(--foreground)]"
            >
              {link.label}
              <span className="absolute inset-x-3 -bottom-0.5 h-px scale-x-0 bg-[var(--accent)] transition-transform duration-200 group-hover:scale-x-100" />
            </Link>
          ))}
        </nav>

        <div className="hidden items-center gap-3 md:flex">
          {toggleMusic && (
            <button
              onClick={toggleMusic}
              className="grid h-9 w-9 place-items-center text-[var(--foreground-muted)] transition-colors hover:text-[var(--foreground)]"
              aria-label={isMusicMuted ? "Unmute music" : "Mute music"}
            >
              {isMusicMuted ? "♫̸" : "♫"}
            </button>
          )}
          <ActivityLog />
          <WalletButton iconVersion={false} shape="rounded-none" backgroundColor="quiet-button quiet-button--filled" paddingX="px-4" />
        </div>
        <button
          onClick={() => setIsMenuOpen((open) => !open)}
          className="grid h-9 w-9 place-items-center border border-[var(--border-hairline-strong)] text-[var(--foreground)] md:hidden"
          aria-expanded={isMenuOpen}
          aria-label="Toggle menu"
        >
          <span className="text-xl leading-none">{isMenuOpen ? "×" : "☰"}</span>
        </button>
      </div>
      <AnimatePresence>
        {isMenuOpen && (
          <motion.nav
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="mx-auto overflow-hidden border-x border-b border-[var(--border-hairline)] bg-[var(--background-2)] md:hidden"
            aria-label="Mobile navigation"
          >
            <div className="max-w-7xl p-3">
              {links.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setIsMenuOpen(false)}
                  className="block border-b border-[var(--border-hairline)] px-3 py-3 font-[family-name:var(--font-geist-sans)] text-lg text-[var(--foreground)] last:border-0"
                >
                  {link.label}
                </Link>
              ))}
              <div className="px-3 pt-3">
                <WalletButton iconVersion={false} shape="rounded-none" backgroundColor="quiet-button quiet-button--filled" paddingX="px-4" />
              </div>
            </div>
          </motion.nav>
        )}
      </AnimatePresence>
    </motion.header>
  );
};

export default Header;