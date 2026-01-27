import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import localFont from "next/font/local";
import "./globals.css";
import { TopNav } from "./top-nav";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
});

const cablefied = localFont({
  src: "../../cablefied.woff2",
  variable: "--font-cablefied",
  display: "swap",
});

export const metadata: Metadata = {
  title: "HyOS Server Manager",
  description: "Hytale server management dashboard",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${inter.variable} ${jetbrainsMono.variable} ${cablefied.variable} antialiased`}
      >
        <TopNav />
        {children}
      </body>
    </html>
  );
}
