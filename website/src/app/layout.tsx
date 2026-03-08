import { RootProvider } from "fumadocs-ui/provider/next";
import Script from "next/script";
import localFont from "next/font/local";
import { Inter } from "next/font/google";
import type { ReactNode } from "react";
import type { Metadata } from "next";
import {
  OrganizationSchema,
  SoftwareApplicationSchema,
} from "@/components/seo/json-ld";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://hyos.io"),
  title: {
    default: "HyOS - Hytale Server Management",
    template: "%s | HyOS",
  },
  description:
    "Open-source Docker-based Hytale dedicated server management ecosystem with web dashboard, mod support, and automated updates.",
  keywords: [
    "Hytale server",
    "Hytale dedicated server",
    "Hytale server manager",
    "Hytale Docker",
    "HyOS",
  ],
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  alternates: {
    canonical: "https://hyos.io",
  },
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
    icon: [
      { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
      { url: "/favicon-96x96.png", sizes: "96x96", type: "image/png" },
      { url: "/favicon-192x192.png", sizes: "192x192", type: "image/png" },
    ],
    shortcut: "/favicon.ico",
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180" }],
  },
  manifest: "/site.webmanifest",
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
      <head>
        <Script
          defer
          src="https://stats.hyos.io/script.js"
          data-website-id={process.env.NEXT_PUBLIC_UMAMI_WEBSITE_ID}
          strategy="afterInteractive"
        />
      </head>
      <body className="flex min-h-screen flex-col">
        <OrganizationSchema />
        <SoftwareApplicationSchema />
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
