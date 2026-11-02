import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Sign In & Register Workspace | Elvora",
  description:
    "Sign in to your Elvora business workspace or register a new store to manage GST billing, inventory, and accounting.",
};

export default function AuthRouteLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
