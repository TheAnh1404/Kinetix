import type { Metadata } from "next";
import "./globals.css";
import { AppProviders } from "@/context/AppProviders";

export const metadata: Metadata = {
  title: "Kinetix - The Multi-Space Vault OS on Avalanche",
  description:
    "Dynamic & Composable Multi-Space Vault OS on Avalanche: Zero Gas Family L1, Tiered Multisig M/N, and 8% APY DeFi Yield on Fuji C-Chain.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="vi">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200"
        />
      </head>
      <body className="bg-surface text-on-surface min-h-screen flex flex-col font-body-md text-body-md">
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}
