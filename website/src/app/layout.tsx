import { RootProvider } from "fumadocs-ui/provider/next";
import localFont from "next/font/local";
import { Inter } from "next/font/google";
import type { ReactNode } from "react";
import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://hyos.io"),
  title: {
    default: "HyOS - Hytale Server Management",
    template: "%s | HyOS",
  },
  description:
    "Open-source Docker-based Hytale dedicated server management ecosystem with web dashboard, mod support, and automated updates.",
  openGraph: {
    title: "HyOS - Hytale Server Management",
    description:
      "Open-source Docker-based Hytale dedicated server management ecosystem.",
    url: "https://hyos.io",
    siteName: "HyOS",
    type: "website",
    images: [{ url: "/og-image.png", width: 1200, height: 630 }],
  },
  twitter: {
    card: "summary_large_image",
    title: "HyOS - Hytale Server Management",
    description:
      "Open-source Docker-based Hytale dedicated server management ecosystem.",
    images: ["/og-image.png"],
  },
  icons: {
    icon: "/favicon.ico",
  },
};

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

const cablefied = localFont({
  src: "../../cablefied.woff2",
  variable: "--font-cablefied",
  display: "swap",
});

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${cablefied.variable}`}
      suppressHydrationWarning
    >
      <body className="flex min-h-screen flex-col">
        <RootProvider
          theme={{
            enabled: true,
            defaultTheme: "dark",
            forcedTheme: "dark",
          }}
        >
          {children}
        </RootProvider>
      </body>
    </html>
  );
}
