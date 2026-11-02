import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Platform Admin Sign In | Elvora",
  description: "Administrative portal sign in for Elvora platform operators.",
};

export default function AdminLoginLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
