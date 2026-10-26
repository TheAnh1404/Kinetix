import type { Metadata } from "next";
import "./globals.css";
import { LanguageProvider } from "@/context/LanguageContext";

export const metadata: Metadata = {
  title: "Kinetix - Family Finance OS on Avalanche",
  description:
    "Multi-Generational Family Finance OS on Avalanche L1: Zero Gas, Anti-Scam Multisig 2/3, and Real DeFi Yield.",
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
        <LanguageProvider>{children}</LanguageProvider>
      </body>
    </html>
  );
}
