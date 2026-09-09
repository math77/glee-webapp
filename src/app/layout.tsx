/*
import type { Metadata } from "next";
import { Geist, Geist_Mono, Pixelify_Sans } from "next/font/google";
import "./globals.css";

import Web3Provider from "./Web3Provider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const pixelify = Pixelify_Sans({ variable: "--font-pixelify-sans" , subsets: ['latin'], weight: ['400', '400'] });

export const metadata: Metadata = {
  title: "GLEE — Onchain Pixel Art",
  description: "Create a tiny onchain masterpiece on a 9×9 pixel canvas.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${pixelify.variable} antialiased`}
      >
        <Web3Provider>
          {children}
        </Web3Provider>
      </body>
    </html>
  );
}
*/

import type { Metadata } from "next";
import { Geist, Geist_Mono, Pixelify_Sans, Fraunces } from "next/font/google";
import "./globals.css";

import Web3Provider from "./Web3Provider";
import { ToastProvider } from "@/components/Toast/ToastProvider";
import AttributionBanner from "@/components/AttributionBanner/AttributionBanner";
import HomeMintSuccessWatcher from "@/components/HomeMintSuccessWatcher/HomeMintSuccessWatcher";
import { SITE_URL } from "@/utils/siteConfig";



const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// fixed: previously ['400','400'] (a duplicate) meant no bold instance ever loaded,
// so every `font-bold` on this family was browser-synthesized. Loading 400 + 700 gives real bold.
const pixelify = Pixelify_Sans({ variable: "--font-pixelify-sans", subsets: ['latin'], weight: ['400', '700'] });

// new: editorial display serif for the gallery direction. Used sparingly for headlines and plaque captions.
const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  style: ["normal", "italic"],
  weight: ["400", "500", "600"],
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: "GLEE — Onchain Pixel Art",
  description: "Create a tiny onchain masterpiece on a 9×9 pixel canvas.",
  openGraph: {
    title: "GLEE — Onchain Pixel Art",
    description: "Create a tiny onchain masterpiece on a 9×9 pixel canvas.",
    url: SITE_URL,
    siteName: "GLEE",
  },
  twitter: {
    card: "summary_large_image",
    title: "GLEE — Onchain Pixel Art",
    description: "Create a tiny onchain masterpiece on a 9×9 pixel canvas.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${pixelify.variable} ${geistSans.variable} ${geistMono.variable} ${fraunces.variable} antialiased`}
      >
        <Web3Provider>
          <ToastProvider>
            {children}
            <AttributionBanner />
            <HomeMintSuccessWatcher />
          </ToastProvider>
        </Web3Provider>
      </body>
    </html>
  );
}