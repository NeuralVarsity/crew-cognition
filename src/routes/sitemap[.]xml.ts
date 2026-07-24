import { createFileRoute } from "@tanstack/react-router";
import type {} from "@tanstack/react-start";

const BASE_URL = "";

interface SitemapEntry {
  path: string;
  changefreq?: "weekly" | "monthly";
  priority?: string;
}

export const Route = createFileRoute("/sitemap.xml")({
  server: {
    handlers: {
      GET: async () => {
        const entries: SitemapEntry[] = [
          { path: "/", changefreq: "weekly", priority: "1.0" },
          { path: "/employees", changefreq: "weekly", priority: "0.8" },
          { path: "/teams", changefreq: "weekly", priority: "0.7" },
          { path: "/departments", changefreq: "weekly", priority: "0.7" },
          { path: "/projects", changefreq: "weekly", priority: "0.8" },
          { path: "/github", changefreq: "monthly", priority: "0.6" },
          { path: "/jira", changefreq: "monthly", priority: "0.6" },
          { path: "/clickup", changefreq: "monthly", priority: "0.6" },
          { path: "/excel-upload", changefreq: "monthly", priority: "0.5" },
          { path: "/analytics", changefreq: "weekly", priority: "0.7" },
          { path: "/reports", changefreq: "weekly", priority: "0.7" },
          { path: "/notifications", changefreq: "monthly", priority: "0.4" },
          { path: "/settings", changefreq: "monthly", priority: "0.3" },
          { path: "/administration", changefreq: "monthly", priority: "0.3" },
        ];

        const urls = entries.map((e) =>
          [
            `  <url>`,
            `    <loc>${BASE_URL}${e.path}</loc>`,
            e.changefreq ? `    <changefreq>${e.changefreq}</changefreq>` : null,
            e.priority ? `    <priority>${e.priority}</priority>` : null,
            `  </url>`,
          ]
            .filter(Boolean)
            .join("\n"),
        );

        const xml = [
          `<?xml version="1.0" encoding="UTF-8"?>`,
          `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`,
          ...urls,
          `</urlset>`,
        ].join("\n");

        return new Response(xml, {
          headers: {
            "Content-Type": "application/xml",
            "Cache-Control": "public, max-age=3600",
          },
        });
      },
    },
  },
});