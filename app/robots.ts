import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/join", "/privacy", "/terms"],
        disallow: [
          "/dashboard",
          "/analytics",
          "/settings",
          "/sessions",
          "/pricing",
          "/learning-hub",
          "/admin",
          "/auth",
          "/api",
        ],
      },
    ],
    sitemap: "https://learnfastapp.com/sitemap.xml",
  };
}
