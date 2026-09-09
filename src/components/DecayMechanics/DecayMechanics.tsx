"use client";

import { motion } from "framer-motion";

const cards: [string, string, string][] = [
  [
    "01",
    "Decay",
    "Every canvas has a life of its own. As time passes, and as the collection moves through more transfers, the garden accumulates decay. The more active the market becomes, the faster the visual state can deteriorate.",
  ],
  [
    "02",
    "The closer to death",
    "Eventually the collection can approach a point where its visuals are heavily degraded. A GLEE canvas is not meant to stay frozen forever — its appearance is tied to the life and activity of the collection.",
  ],
  [
    "03",
    "The Savior",
    "When the collection is close to dying, anyone can call the Savior function. It restores the NFTs' visuals to their original state, but the rescue comes with a price: the collection becomes soulbound and the NFTs can no longer be transferred. (at least not until the next chapters...)",
  ],
  [
    "04",
    "The continuation",
    " ",
  ],
];

export default function DecayMechanics() {
  return (
    <motion.section
      initial={{ opacity: 0, y: 18 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.45, ease: "easeOut" }}
      className="mt-24 border-y border-[var(--border-hairline)] bg-[var(--background-2)]/40"
    >
      <div className="px-7 py-12 sm:px-9 sm:py-16">
        <p className="eyebrow-quiet">Life, decay, survival</p>
        <h2 className="mt-5 max-w-3xl font-[family-name:var(--font-fraunces)] text-4xl italic leading-tight text-[var(--foreground)] sm:text-5xl">
          GLEE is alive.<br /><span className="text-[var(--accent)]">And living things decay.</span>
        </h2>
        <p className="mt-6 max-w-3xl text-lg leading-relaxed text-[var(--foreground-muted)]">
          GLEE&apos;s visuals are designed to change over time. Decay is driven by the passage of time between activity and by the collection&apos;s transfer activity, so a busy garden deteriorates faster than a quiet one.
        </p>
      </div>

      <div className="grid gap-px border-t border-[var(--border-hairline)] bg-[var(--border-hairline)] md:grid-cols-3">
        {cards.map(([number, title, description]) => (
          <motion.article
            key={number}
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-40px" }}
            transition={{ duration: 0.35, ease: "easeOut" }}
            className="bg-[var(--background)] p-7 sm:p-9"
          >
            <span className="font-[family-name:var(--font-geist-mono)] text-sm text-[var(--accent)]">{number}</span>
            <h3 className="mt-8 font-[family-name:var(--font-fraunces)] text-2xl italic text-[var(--foreground)]">{title}</h3>
            <p className="mt-4 leading-relaxed text-[var(--foreground-muted)]">{description}</p>
          </motion.article>
        ))}
      </div>
    </motion.section>
  );
}
