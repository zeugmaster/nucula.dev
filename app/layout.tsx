import type { Metadata, Viewport } from "next";
import { Inter_Tight, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const interTight = Inter_Tight({
  variable: "--font-inter-tight",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600"],
  display: "swap",
});

const jbMono = JetBrains_Mono({
  variable: "--font-jb-mono",
  subsets: ["latin"],
  weight: ["400", "500", "700"],
  display: "swap",
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#f4f4f4",
};

const description =
  "Nucula is a small, open-source Cashu ecash wallet built on an ESP32. NFC tap-to-pay, Lightning in and out, and it doesn't mind being offline.";

export const metadata: Metadata = {
  metadataBase: new URL("https://nucula.dev"),
  title: "nucula — a hardware wallet for ecash",
  description,
  openGraph: {
    title: "nucula — a hardware wallet for ecash",
    description,
    siteName: "nucula",
    type: "website",
    images: [{ url: "/og.png", width: 1200, height: 630 }],
  },
  twitter: {
    card: "summary_large_image",
    title: "nucula — a hardware wallet for ecash",
    description,
    images: ["/og.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" data-theme="light" suppressHydrationWarning>
      <body
        className={`${interTight.variable} ${jbMono.variable} antialiased`}
      >
        <script
          dangerouslySetInnerHTML={{
            __html: "document.documentElement.classList.add('js')",
          }}
        />
        {children}
      </body>
    </html>
  );
}
