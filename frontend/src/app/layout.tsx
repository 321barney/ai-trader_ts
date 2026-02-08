import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "CoTrader | Institutional-Grade AI Logic",
    template: "%s | CoTrader"
  },
  description: "Advanced multi-agent trading system with autonomous strategy execution, risk management, and Chain-of-Thought reasoning. Professional grade logic for crypto markets.",
  keywords: [
    "CoTrader",
    "institutional trading",
    "AI trading bot",
    "multi-agent system",
    "autonomous trading",
    "risk management",
    "SMC trading",
    "algorithmic trading",
    "crypto hedge fund",
    "DeepSeek trading",
    "Chain-of-Thought"
  ],
  authors: [{ name: "CoTrader Team" }],
  creator: "CoTrader",
  publisher: "CoTrader",
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
        className={`${inter.variable} ${jetbrainsMono.variable} antialiased bg-[#020408] text-slate-100`}
      >
        {children}
      </body>
    </html>
  );
}
