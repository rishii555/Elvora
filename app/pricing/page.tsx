import type { Metadata } from "next";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: "Pricing Plans & Business Editions | Elvora",
  description:
    "Explore Elvora pricing plans and editions for Indian retail shops, wholesale distributors, and growing enterprises. Get started free with Elvora.",
};

export default function PricingPage() {
  redirect("/register");
}
