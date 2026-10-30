import { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://elvora.com";

  return {
    rules: [
      {
        userAgent: "*",
        allow: [
          "/",
          "/gst-billing-software",
          "/inventory-management-software",
          "/pos-software",
          "/invoice-generator",
          "/pricing",
          "/blog",
          "/blog/*",
          "/privacy",
          "/terms",
        ],
        disallow: [
          "/dashboard",
          "/dashboard/*",
          "/pos",
          "/pos/*",
          "/inventory",
          "/inventory/*",
          "/invoices",
          "/invoices/*",
          "/purchases",
          "/purchases/*",
          "/customers",
          "/customers/*",
          "/payments",
          "/payments/*",
          "/expenses",
          "/expenses/*",
          "/reports",
          "/reports/*",
          "/settings",
          "/settings/*",
          "/setup",
          "/setup/*",
          "/admin",
          "/admin/*",
          "/api",
          "/api/*",
          "/login",
          "/register",
          "/forgot-password",
          "/reset-password",
        ],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
