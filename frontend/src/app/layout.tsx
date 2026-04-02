import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Web3Provider } from "@/components/providers/Web3Provider";
import { LitProvider } from "@/components/providers/LitProvider";
import { Navbar } from "@/components/Navbar";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "DEADLOCK Protocol — Trustless Digital Inheritance",
  description:
    "A trustless dead man's switch and digital inheritance protocol. Encrypt and store your vaults, automatically released to beneficiaries when on-chain conditions are met.",
  icons: { icon: "/logo.svg" },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className={inter.className}>
        <Web3Provider>
          <LitProvider>
            <Navbar />
            <main className="min-h-screen">{children}</main>
          </LitProvider>
        </Web3Provider>
      </body>
    </html>
  );
}
