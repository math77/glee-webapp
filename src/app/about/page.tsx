/*
"use client";

import Header from "@/components/Header/Header";
import GleeTokenNotice from "@/components/GleeTokenNotice/GleeTokenNotice";
import Link from "next/link";
import { motion, type Variants } from "framer-motion";
import { LAUNCHPAD_NAME, LAUNCHPAD_URL } from "@/utils/gleeToken";

const steps: [string, string, string][] = [
  ["01", "Mint a plot", "Claim one or more tiny canvases on Robinhood Chain."],
  ["02", "Paint freely", "Make your mark using a focused eight-color palette."],
  ["03", "Grow the garden", "Share your work and discover the community's creations."],
];

const tokenFeatures: [string, string][] = [
  ["Tip what moves you", "Every finished canvas in the gallery can receive $GLEE tips — a quiet way to say a piece is worth something to you."],
  ["Split with the owner", "Each tip is shared equally between the artist who painted the canvas and whoever holds it now, so support reaches the maker and the collector alike."],
];

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: "easeOut" } },
};

export default function About() {
  return (
    <div className="site-shell min-h-screen text-[var(--foreground)]">
      <Header />
      <main className="mx-auto max-w-6xl px-6 pb-24 pt-36 sm:pt-48">
        <motion.div
          initial="hidden"
          animate="show"
          variants={{ show: { transition: { staggerChildren: 0.08 } } }}
        >
          <motion.p variants={fadeUp} className="eyebrow-quiet">Welcome to GLEE</motion.p>
          <motion.h1 variants={fadeUp} className="mt-6 max-w-3xl font-[family-name:var(--font-fraunces)] text-5xl italic leading-[1.05] text-[var(--foreground)] sm:text-6xl">
            Big ideas<br /><span className="text-[var(--accent)]">in very small squares.</span>
          </motion.h1>
          <motion.p variants={fadeUp} className="mt-8 max-w-2xl text-lg leading-relaxed text-[var(--foreground-muted)] sm:text-xl">
            GLEE is a collaborative, onchain art experiment. The constraint is the point: 81 pixels, eight colors, and your imagination.
          </motion.p>
        </motion.div>

        <motion.div
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-60px" }}
          variants={{ show: { transition: { staggerChildren: 0.1 } } }}
          className="mt-20 grid gap-px border border-[var(--border-hairline)] bg-[var(--border-hairline)] md:grid-cols-3"
        >
          {steps.map(([number, title, description]) => (
            <motion.article variants={fadeUp} className="bg-[var(--background)] p-7 sm:p-9" key={number}>
              <span className="font-[family-name:var(--font-geist-mono)] text-sm text-[var(--accent)]">{number}</span>
              <h2 className="mt-10 font-[family-name:var(--font-fraunces)] text-2xl italic text-[var(--foreground)]">{title}</h2>
              <p className="mt-4 leading-relaxed text-[var(--foreground-muted)]">{description}</p>
            </motion.article>
          ))}
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-60px" }}
          transition={{ duration: 0.4, ease: "easeOut" }}
          className="mt-24"
        >
          <p className="eyebrow-quiet">The $GLEE token</p>
          <h2 className="mt-5 max-w-2xl font-[family-name:var(--font-fraunces)] text-4xl italic leading-tight text-[var(--foreground)] sm:text-5xl">
            Tip the gardens<br />you love.
          </h2>
          <p className="mt-6 max-w-2xl text-lg leading-relaxed text-[var(--foreground-muted)]">
            $GLEE is how the community rewards good work. Tip any finished canvas, and the amount goes straight to the people who made it what it is.
          </p>
          <GleeTokenNotice className="mt-6 max-w-2xl" />
        </motion.div>

        <motion.div
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-60px" }}
          variants={{ show: { transition: { staggerChildren: 0.1 } } }}
          className="mt-10 grid gap-px border border-[var(--border-hairline)] bg-[var(--border-hairline)] sm:grid-cols-2"
        >
          {tokenFeatures.map(([title, description]) => (
            <motion.article variants={fadeUp} className="bg-[var(--background)] p-7 sm:p-9" key={title}>
              <h3 className="font-[family-name:var(--font-fraunces)] text-2xl italic text-[var(--foreground)]">{title}</h3>
              <p className="mt-4 leading-relaxed text-[var(--foreground-muted)]">{description}</p>
            </motion.article>
          ))}
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-60px" }}
          transition={{ duration: 0.4, ease: "easeOut" }}
          className="mt-px flex flex-wrap items-center justify-between gap-6 border border-t-0 border-[var(--border-hairline)] bg-[var(--background-2)]/60 p-7 sm:p-9"
        >
          <p className="max-w-xl text-[var(--foreground-muted)]">
            You can acquire $GLEE on {LAUNCHPAD_NAME ? LAUNCHPAD_NAME : <span className="italic text-[var(--accent)]">[launchpad name]</span>}, where it launched on Robinhood Chain.
          </p>
          <a
            href={LAUNCHPAD_URL}
            target="_blank"
            rel="noopener noreferrer"
            aria-disabled={LAUNCHPAD_URL === "#"}
            onClick={(event) => { if (LAUNCHPAD_URL === "#") event.preventDefault(); }}
            className="quiet-button quiet-button--filled px-6 py-3 text-sm aria-disabled:pointer-events-none aria-disabled:opacity-40"
          >
            Get $GLEE ↗
          </a>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-60px" }}
          transition={{ duration: 0.4, ease: "easeOut" }}
          className="mt-16 flex flex-wrap items-center justify-between gap-6 border-l-2 border-[var(--accent)] bg-[var(--background-2)]/60 p-7"
        >
          <p className="max-w-xl text-lg text-[var(--foreground-muted)]">
            There's no right way to paint a garden. Make something strange, tender, funny, or totally your own.
          </p>
          <Link href="/create">
            <motion.span whileHover={{ y: -1 }} whileTap={{ scale: 0.98 }} className="quiet-button quiet-button--filled inline-flex px-6 py-3 text-sm">
              Enter the studio ↘
            </motion.span>
          </Link>
        </motion.div>
      </main>
    </div>
  );
}
  */


"use client";
 
import Header from "@/components/Header/Header";
import GleeTokenNotice from "@/components/GleeTokenNotice/GleeTokenNotice";
import Link from "next/link";
import { motion, type Variants } from "framer-motion";
import { LAUNCHPAD_NAME, LAUNCHPAD_URL } from "@/utils/gleeToken";
 
const steps: [string, string, string][] = [
  ["01", "Mint a plot", "Claim one or more tiny canvases on Robinhood Chain."],
  ["02", "Paint freely", "Make your mark using a focused eight-color palette."],
  ["03", "Grow the garden", "Share your work and discover the community's creations."],
];
 
const whitelistCommunities = ["Chain Mancers", "RH Machines", "Chain Raiders", "Quotrons"];
 
const tokenFeatures: [string, string][] = [
  ["Tip what moves you", "Every finished canvas in the gallery can receive $GLEE tips — a quiet way to say a piece is worth something to you."],
  ["Split with the owner", "Each tip is shared equally between the artist who painted the canvas and whoever holds it now, so support reaches the maker and the collector alike."],
];
 
const fadeUp: Variants = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: "easeOut" } },
};
 
export default function About() {
  return (
    <div className="site-shell min-h-screen text-[var(--foreground)]">
      <Header />
      <main className="mx-auto max-w-6xl px-6 pb-24 pt-36 sm:pt-48">
        <motion.div
          initial="hidden"
          animate="show"
          variants={{ show: { transition: { staggerChildren: 0.08 } } }}
        >
          <motion.p variants={fadeUp} className="eyebrow-quiet">Welcome to GLEE</motion.p>
          <motion.h1 variants={fadeUp} className="mt-6 max-w-3xl font-[family-name:var(--font-fraunces)] text-5xl italic leading-[1.05] text-[var(--foreground)] sm:text-6xl">
            Big ideas<br /><span className="text-[var(--accent)]">in very small squares.</span>
          </motion.h1>
          <motion.p variants={fadeUp} className="mt-8 max-w-2xl text-lg leading-relaxed text-[var(--foreground-muted)] sm:text-xl">
            GLEE is a collaborative, onchain art experiment. The constraint is the point: 81 pixels, eight colors, and your imagination.
          </motion.p>
        </motion.div>
 
        <motion.div
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-60px" }}
          variants={{ show: { transition: { staggerChildren: 0.1 } } }}
          className="mt-20 grid gap-px border border-[var(--border-hairline)] bg-[var(--border-hairline)] md:grid-cols-3"
        >
          {steps.map(([number, title, description]) => (
            <motion.article variants={fadeUp} className="bg-[var(--background)] p-7 sm:p-9" key={number}>
              <span className="font-[family-name:var(--font-geist-mono)] text-sm text-[var(--accent)]">{number}</span>
              <h2 className="mt-10 font-[family-name:var(--font-fraunces)] text-2xl italic text-[var(--foreground)]">{title}</h2>
              <p className="mt-4 leading-relaxed text-[var(--foreground-muted)]">{description}</p>
            </motion.article>
          ))}
        </motion.div>
        
        {/*
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-60px" }}
          transition={{ duration: 0.4, ease: "easeOut" }}
          className="mt-24"
        >
          <p className="eyebrow-quiet">The whitelist</p>
          <h2 className="mt-5 max-w-2xl font-[family-name:var(--font-fraunces)] text-4xl italic leading-tight text-[var(--foreground)] sm:text-5xl">
            Whitelist and public,<br />minting together.
          </h2>
          <p className="mt-6 max-w-2xl text-lg leading-relaxed text-[var(--foreground-muted)]">
            There&apos;s no separate phase — whitelisted or not, you can mint from the moment it opens. Whitelisted
            wallets get a guaranteed allocation reserved just for them, at the same price as public mint. Once the
            whitelist window closes, whatever&apos;s left of that reserved supply opens up to public mint too.
          </p>
          <p className="eyebrow-quiet mt-8">On the whitelist</p>
          <motion.div
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, margin: "-60px" }}
            variants={{ show: { transition: { staggerChildren: 0.06 } } }}
            className="mt-4 flex flex-wrap gap-3"
          >
            {whitelistCommunities.map((name) => (
              <motion.span
                key={name}
                variants={fadeUp}
                className="border border-[var(--border-hairline-strong)] px-4 py-2 text-sm text-[var(--foreground)]"
              >
                {name}
              </motion.span>
            ))}
          </motion.div>
        </motion.div>
        */}
 
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-60px" }}
          transition={{ duration: 0.4, ease: "easeOut" }}
          className="mt-24"
        >
          <p className="eyebrow-quiet">The $GLEE token</p>
          <h2 className="mt-5 max-w-2xl font-[family-name:var(--font-fraunces)] text-4xl italic leading-tight text-[var(--foreground)] sm:text-5xl">
            Tip the gardens<br />you love.
          </h2>
          <p className="mt-6 max-w-2xl text-lg leading-relaxed text-[var(--foreground-muted)]">
            $GLEE is how the community rewards good work. Tip any finished canvas, and the amount goes straight to the people who made it what it is.
          </p>
          <GleeTokenNotice className="mt-6 max-w-2xl" />
        </motion.div>
 
        <motion.div
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-60px" }}
          variants={{ show: { transition: { staggerChildren: 0.1 } } }}
          className="mt-10 grid gap-px border border-[var(--border-hairline)] bg-[var(--border-hairline)] sm:grid-cols-2"
        >
          {tokenFeatures.map(([title, description]) => (
            <motion.article variants={fadeUp} className="bg-[var(--background)] p-7 sm:p-9" key={title}>
              <h3 className="font-[family-name:var(--font-fraunces)] text-2xl italic text-[var(--foreground)]">{title}</h3>
              <p className="mt-4 leading-relaxed text-[var(--foreground-muted)]">{description}</p>
            </motion.article>
          ))}
        </motion.div>
 
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-60px" }}
          transition={{ duration: 0.4, ease: "easeOut" }}
          className="mt-px flex flex-wrap items-center justify-between gap-6 border border-t-0 border-[var(--border-hairline)] bg-[var(--background-2)]/60 p-7 sm:p-9"
        >
          <p className="max-w-xl text-[var(--foreground-muted)]">
            You can acquire $GLEE on {LAUNCHPAD_NAME ? LAUNCHPAD_NAME : <span className="italic text-[var(--accent)]">[launchpad name]</span>}, where it launched on Robinhood Chain.
          </p>
          <a
            href={LAUNCHPAD_URL}
            target="_blank"
            rel="noopener noreferrer"
            aria-disabled={LAUNCHPAD_URL === "#"}
            onClick={(event) => { if (LAUNCHPAD_URL === "#") event.preventDefault(); }}
            className="quiet-button quiet-button--filled px-6 py-3 text-sm aria-disabled:pointer-events-none aria-disabled:opacity-40"
          >
            Get $GLEE ↗
          </a>
        </motion.div>
 
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-60px" }}
          transition={{ duration: 0.4, ease: "easeOut" }}
          className="mt-16 flex flex-wrap items-center justify-between gap-6 border-l-2 border-[var(--accent)] bg-[var(--background-2)]/60 p-7"
        >
          <p className="max-w-xl text-lg text-[var(--foreground-muted)]">
            There's no right way to paint a garden. Make something strange, tender, funny, or totally your own.
          </p>
          <Link href="/create">
            <motion.span whileHover={{ y: -1 }} whileTap={{ scale: 0.98 }} className="quiet-button quiet-button--filled inline-flex px-6 py-3 text-sm">
              Enter the studio ↘
            </motion.span>
          </Link>
        </motion.div>
      </main>
    </div>
  );
}