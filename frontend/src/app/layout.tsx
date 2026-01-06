import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "AISTER | Multi-Agent AI Trading Platform",
    template: "%s | AISTER"
  },
  description: "AISTER is an autonomous AI trading platform powered by 3 specialized AI agents (Strategy Consultant, Risk Officer, Market Analyst) that deliberate on every trade with Chain-of-Thought reasoning. Supports SMC, ICT, and Gann methodologies.",
  keywords: [
    "AI trading",
    "multi-agent AI",
    "autonomous trading",
    "crypto trading bot",
    "AI trading platform",
    "Chain-of-Thought trading",
    "SMC trading",
    "ICT trading",
    "Gann methodology",
    "algorithmic trading",
    "AISTER",
    "trading AI agents",
    "risk management AI",
    "DeepSeek trading",
    "AI governance trading",
    "transparent AI trading",
    "multi-agent deliberation",
    "AI risk officer",
    "trading bot with veto",
    "AI hallucination prevention",
    "autonomous crypto trading",
    "AI trading transparency"
  ],
  authors: [{ name: "AISTER Team" }],
  creator: "AISTER",
  publisher: "AISTER",
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
    },
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://aiaster.cc",
    siteName: "AISTER",
    title: "AISTER - Multi-Agent AI Trading Platform",
    description: "A council of 3 AI agents deliberates on every trade. Strategy Consultant, Risk Officer, and Market Analyst work together with Chain-of-Thought reasoning.",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "AISTER - Multi-Agent AI Trading Platform"
      }
    ]
  },
  twitter: {
    card: "summary_large_image",
    title: "AISTER - Multi-Agent AI Trading Platform",
    description: "A council of 3 AI agents deliberates on every trade with transparent Chain-of-Thought reasoning.",
    images: ["/og-image.png"]
  },
  alternates: {
    canonical: "https://aiaster.cc"
  },
  icons: {
    icon: "/favicon.ico",
  },
  category: "Finance",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
