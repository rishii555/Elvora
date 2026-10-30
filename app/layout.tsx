import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Elvora — Simpler Business. Smarter Growth.",
  description: "Next-generation multi-tenant billing, inventory & accounting SaaS for Indian retail and wholesale businesses. Simpler Business. Smarter Growth.",
  icons: {
    icon: "/elvora-logo.png",
  },
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
