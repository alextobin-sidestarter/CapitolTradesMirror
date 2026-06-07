import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Navbar from "@/components/Navbar";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'https://capitolmirror.com'

export const metadata: Metadata = {
  title: {
    default: "Capitol Mirror — Congressional Stock Trading Tracker",
    template: "%s | Capitol Mirror",
  },
  description: "Track congressional stock trades in real time. See what politicians are buying and selling under the STOCK Act.",
  keywords: ['congressional trades', 'political stock trading', 'STOCK Act', 'congress insider trading', 'politician stocks'],
  metadataBase: new URL(BASE_URL),
  openGraph: {
    title: "Capitol Mirror — Congressional Stock Trading Tracker",
    description: "Track what politicians are buying and selling in the stock market.",
    url: BASE_URL,
    siteName: "Capitol Mirror",
    type: "website",
    images: [{ url: `/api/og?title=Capitol+Mirror&sub=Congressional+Stock+Trading+Tracker`, width: 1200, height: 630 }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Capitol Mirror",
    description: "Track congressional stock trades in real time.",
  },
  robots: { index: true, follow: true },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
      <body className="bg-[#0a0a0a] text-gray-100 min-h-screen">
        <Navbar />
        <main className="max-w-7xl mx-auto px-4 py-8">
          {children}
        </main>
      </body>
    </html>
  );
}
