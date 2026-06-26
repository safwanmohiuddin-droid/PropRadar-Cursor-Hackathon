import type { Metadata } from "next";
import { Inter } from "next/font/google";
import localFont from "next/font/local";
import "./globals.css";
import AppShell from "@/components/layout/AppShell";
import { getServerData } from "@/lib/data";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  weight: "100 900",
});

export const metadata: Metadata = {
  title: "DealFlow — UAE Distressed Property Exchange",
  description:
    "AI-powered, credibility-gated marketplace connecting distressed UAE real estate to qualified investors.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const serverData = getServerData();
  return (
    <html lang="en" className="dark">
      <body className={`${inter.variable} ${geistMono.variable} font-sans antialiased`}>
        <AppShell serverData={serverData}>{children}</AppShell>
      </body>
    </html>
  );
}
