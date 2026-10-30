import type { Metadata, Viewport } from "next";
import "./globals.css";
import { siteConfig } from "@/lib/seo/config";

export const metadata: Metadata = {
  metadataBase: new URL(siteConfig.url),
  title: {
    default: "Elvora — Universal Business Management, GST Billing & Inventory SaaS",
    template: "%s | Elvora",
  },
  description: siteConfig.description,
  applicationName: siteConfig.name,
  authors: [{ name: "Elvora Technologies Pvt Ltd", url: siteConfig.url }],
  creator: "Elvora Technologies",
  publisher: "Elvora Technologies",
  keywords: siteConfig.keywords,
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  alternates: {
    canonical: siteConfig.url,
  },
  openGraph: {
    type: "website",
    locale: "en_IN",
    url: siteConfig.url,
    title: "Elvora — Simpler Business. Smarter Growth.",
    description: siteConfig.description,
    siteName: siteConfig.name,
    images: [
      {
        url: siteConfig.logo,
        width: 800,
        height: 600,
        alt: "Elvora Business Management SaaS",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Elvora — Simpler Business. Smarter Growth.",
    description: siteConfig.description,
    images: [siteConfig.logo],
    creator: "@elvorahq",
  },
  icons: {
    icon: "/elvora-logo.png",
    shortcut: "/elvora-logo.png",
    apple: "/elvora-logo.png",
  },
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
        {children}
      </body>
    </html>
  );
}
