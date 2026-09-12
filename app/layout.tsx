import type { Metadata } from "next";
import { Suwannaphum } from "next/font/google";
import { SITE_CONFIG } from "@/content/site";
import "./globals.css";

const suwannaphum = Suwannaphum({
  weight: ["400", "700"],
  variable: "--font-suwannaphum",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: SITE_CONFIG.siteName,
  description: SITE_CONFIG.siteDescription,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" data-theme="light">
      <body className={`${suwannaphum.variable} antialiased`}>{children}</body>
    </html>
  );
}
