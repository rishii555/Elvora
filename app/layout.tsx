import type { Metadata, Viewport } from "next";
import "./globals.css";
import { siteConfig } from "@/lib/seo/config";
import { GoogleAnalytics } from "@/components/seo/analytics";

export const metadata: Metadata = {
  metadataBase: new URL(siteConfig.url),
  title: {
    default: "Elvora – GST Billing, Inventory & Business Management Software",
    template: "%s | Elvora",
  },
  description: siteConfig.description,
  applicationName: siteConfig.name,
  authors: [{ name: "Elvora", url: siteConfig.url }],
  creator: "Elvora",
  publisher: "Elvora",
  keywords: siteConfig.keywords,
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  alternates: {
    canonical: siteConfig.url,
    languages: {
      "en-IN": `${siteConfig.url}`,
      "en": `${siteConfig.url}`,
      "x-default": `${siteConfig.url}`,
    },
  },
  verification: {
    google: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION || undefined,
  },
  openGraph: {
    type: "website",
    locale: "en_IN",
    url: siteConfig.url,
    title: "Elvora – GST Billing, Inventory & Business Management Software",
    description: siteConfig.description,
    siteName: siteConfig.name,
    images: [
      {
        url: `${siteConfig.url}/og-image.png`,
        width: 1200,
        height: 630,
        alt: "Elvora – Business Management, GST Billing & Inventory SaaS",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Elvora – GST Billing, Inventory & Business Management Software",
    description: siteConfig.description,
    images: [`${siteConfig.url}/og-image.png`],
  },
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/icon.png", type: "image/png", sizes: "96x96" },
      { url: "/icon-192.png", type: "image/png", sizes: "192x192" },
    ],
    shortcut: "/favicon.ico",
    apple: [
      { url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    ],
  },
  manifest: "/manifest.webmanifest",
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
};

export const viewport: Viewport = {
  themeColor: "#2563EB",
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-slate-50 text-slate-900 antialiased">
        <GoogleAnalytics />
        {children}
      </body>
    </html>
  );
}
