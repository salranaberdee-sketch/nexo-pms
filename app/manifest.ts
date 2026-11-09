import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Nexo PMS",
    short_name: "Nexo",
    description:
      "Product Management System — จัดการสินค้า, Content, Ads และยอดขาย",
    start_url: "/dashboard",
    display: "standalone",
    orientation: "portrait-primary",
    background_color: "#0f172a",
    theme_color: "#0f172a",
    categories: ["business", "productivity"],
    lang: "th",
    dir: "ltr",
    scope: "/",
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
