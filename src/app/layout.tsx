import type { Metadata } from "next";
import Script from "next/script";
import { Inter, Noto_Sans_Tamil, Noto_Sans_Mono } from "next/font/google";
import "./globals.css";
import LanguageProvider from "@/components/LanguageProvider";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const notoSansTamil = Noto_Sans_Tamil({
  subsets: ["tamil"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-noto-tamil",
  display: "swap",
});

const notoSansMono = Noto_Sans_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-noto-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "LabourSeva — Labour Welfare Services",
  description:
    "Access government welfare schemes, certificates, financial assistance and more — all in one place. LabourSeva is committed to the well-being and growth of every worker in Tamil Nadu.",
  keywords: ["labour welfare", "Tamil Nadu", "government services", "LabourSeva", "worker registration"],
  openGraph: {
    title: "LabourSeva — Labour Welfare Services",
    description: "Access labour welfare services online. Register, apply and track applications securely.",
    locale: "en_IN",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      data-theme="light"
      suppressHydrationWarning
      className={`${inter.variable} ${notoSansTamil.variable} ${notoSansMono.variable}`}
    >
      <head>
        <Script
          id="google-adsense"
          async
          strategy="afterInteractive"
          src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-3642883735997037"
          crossOrigin="anonymous"
        />
      </head>
      <body style={{ fontFamily: "var(--font-sans)" }} suppressHydrationWarning>
        <a href="#main-content" className="skip-link">
          Skip to main content
        </a>
        <LanguageProvider>{children}</LanguageProvider>
      </body>
    </html>
  );
}
