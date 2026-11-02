import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Registration Pending Approval | Elvora",
  description:
    "Your Elvora business workspace registration is under administrative verification. Check approval status in real time.",
};

export default function PendingApprovalLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
