"use client";

import Header from "@/components/Header/Header";
import { motion } from "framer-motion";

export default function NextChapter() {
  return (
    <div className="site-shell min-h-screen text-[var(--foreground)]">
      <Header />
      <main className="mx-auto flex min-h-screen max-w-6xl items-center justify-center px-6 pb-24 pt-36 sm:pt-48">
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease: "easeOut" }}
          className="w-full border border-[var(--border-hairline)] bg-[var(--background-2)]/60 p-10 text-center sm:p-16"
        >
          <p className="eyebrow-quiet">Glee Next Chapter</p>
          <h1 className="mt-6 font-[family-name:var(--font-fraunces)] text-6xl italic leading-none text-[var(--foreground)] sm:text-8xl">
            Coming soon
          </h1>
        </motion.div>
      </main>
    </div>
  );
}
