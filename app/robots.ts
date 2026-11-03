import type { MetadataRoute } from "next";

// A private classroom tool: nothing here should be indexed.
export default function robots(): MetadataRoute.Robots {
  return { rules: { userAgent: "*", disallow: "/" } };
}
