"use client";

import Link from "next/link";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import WalletButton from "../WalletButton/WalletButton";
import ActivityLog from "../ActivityLog/ActivityLog";
import { GLEE_TOKEN_LAUNCHED, LAUNCHPAD_URL } from "@/utils/gleeToken";

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

function GetGleeButton({ className = "" }: { className?: string }) {
  return (
    <a
      href={GLEE_TOKEN_LAUNCHED ? LAUNCHPAD_URL : undefined}
      target="_blank"
      rel="noopener noreferrer"
      aria-disabled={!GLEE_TOKEN_LAUNCHED}
      onClick={(event) => {
        if (!GLEE_TOKEN_LAUNCHED) event.preventDefault();
      }}
      className={`quiet-button quiet-button--filled text-sm aria-disabled:pointer-events-none aria-disabled:opacity-40 ${className}`}
    >
      Get $GLEE
    </a>
  );
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
          <GetGleeButton className="px-4 py-2" />
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
              <div className="flex flex-col gap-2 px-3 pt-3">
                <GetGleeButton className="w-full py-3 text-center" />
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