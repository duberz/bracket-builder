import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--brand-font" });

export const metadata: Metadata = {
  title: "Bracket Builder | FanDuel Research",
  description: "Build, share, and export tournament brackets. NCAA, NFL, NBA, NHL and more.",
  openGraph: {
    title: "Bracket Builder | FanDuel Research",
    description: "Make your picks. Share your bracket. Export to PNG or PDF.",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="antialiased">{children}</body>
    </html>
  );
}
