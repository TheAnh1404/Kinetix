import type { Metadata } from "next";
import "./globals.css";
import "./member.css";
import "./vault-experience.css";
import { AppProviders } from "@/context/AppProviders";

export const metadata: Metadata = {
  title: "Kinetix - The Multi-Space Vault OS on Avalanche",
  description:
    "Quản lý hũ gia đình trên Avalanche Fuji: hỗ trợ người thân, việc nhà và góp vốn minh bạch với sổ giao dịch có thể đối soát.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="vi" suppressHydrationWarning>
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
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var saved = localStorage.getItem('kinetix_theme');
                  var isDark = saved === 'dark' || (!saved && window.matchMedia('(prefers-color-scheme: dark)').matches);
                  if (isDark) {
                    document.documentElement.classList.add('dark');
                  } else {
                    document.documentElement.classList.remove('dark');
                  }
                } catch (e) {}
              })();
            `,
          }}
        />
      </head>
      <body className="bg-surface text-on-surface dark:bg-[#0b111d] dark:text-slate-100 min-h-screen flex flex-col font-body-md text-body-md transition-colors duration-200">
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}
