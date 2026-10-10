import type { Metadata } from "next";
import { Noto_Sans, Noto_Sans_Tamil, Noto_Sans_Mono } from "next/font/google";
import "./globals.css";

const notoSans = Noto_Sans({
  subsets: ["latin", "latin-ext"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-noto-sans",
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
      className={`${notoSans.variable} ${notoSansTamil.variable} ${notoSansMono.variable}`}
    >
      <head>
        <style>{`
          :root {
            --font-sans: var(--font-noto-sans), system-ui, -apple-system, "Segoe UI", sans-serif;
            --font-sans-ta: var(--font-noto-tamil), var(--font-noto-sans), system-ui, sans-serif;
            --font-mono: var(--font-noto-mono), ui-monospace, Menlo, Consolas, monospace;
          }
        `}</style>
      </head>
      <body style={{ fontFamily: "var(--font-sans)" }}>
        <a href="#main-content" className="skip-link">
          Skip to main content
        </a>
        {children}
      </body>
    </html>
  );
}
