import type { MetadataRoute } from "next";

// Extended manifest type — includes fields newer than Next.js bundled types
type ManifestExtended = MetadataRoute.Manifest & {
  id?: string;
  display_override?: string[];
  handle_links?: "auto" | "preferred";
  shortcuts?: Array<{
    name: string;
    short_name?: string;
    description?: string;
    url: string;
    icons?: Array<{ src: string; sizes: string; type?: string }>;
  }>;
};

export default function manifest(): ManifestExtended {
  return {
    // Stable PWA identity — prevents re-install confusion if start_url changes
    id: "/nexo-pms",
    name: "Nexo PMS",
    short_name: "Nexo",
    description:
      "Product Management System — จัดการสินค้า, Content, Ads และยอดขาย",
    start_url: "/dashboard",
    display: "standalone",
    // Prefer standalone, fall back to minimal-ui on older browsers
    display_override: ["standalone", "minimal-ui"],
    // "natural" allows both orientations — better for tablets
    orientation: "natural",
    background_color: "#0f172a",
    theme_color: "#0f172a",
    categories: ["business", "productivity"],
    lang: "th",
    dir: "ltr",
    scope: "/",
    // Tells Android Chrome: if this PWA is installed, intercept these links
    handle_links: "preferred",
    // Don't push users toward a native app store listing
    prefer_related_applications: false,
    // Long-press app icon shortcuts (Android Chrome, Edge)
    shortcuts: [
      {
        name: "Dashboard",
        short_name: "Dashboard",
        description: "ภาพรวม KPI และสถานะ",
        url: "/dashboard",
        icons: [{ src: "/icon-96x96.png", sizes: "96x96", type: "image/png" }],
      },
      {
        name: "งานของฉัน",
        short_name: "งานของฉัน",
        description: "Content ที่มอบหมายให้ฉัน",
        url: "/my-tasks",
        icons: [{ src: "/icon-96x96.png", sizes: "96x96", type: "image/png" }],
      },
      {
        name: "สินค้า",
        short_name: "Products",
        description: "รายการสินค้าทั้งหมด",
        url: "/products",
        icons: [{ src: "/icon-96x96.png", sizes: "96x96", type: "image/png" }],
      },
    ],
    icons: [
      {
        src: "/icon-96x96.png",
        sizes: "96x96",
        type: "image/png",
      },
      {
        src: "/icon-192x192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icon-512x512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icon-512x512-maskable.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
      {
        src: "/apple-touch-icon.png",
        sizes: "180x180",
        type: "image/png",
      },
    ],
    screenshots: [],
  };
}
