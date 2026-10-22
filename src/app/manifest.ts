import type { MetadataRoute } from "next";

// Lets staff "Add to Home Screen" and open the app full screen.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "NASCO Lunch",
    short_name: "Lunch",
    description: "See today's menu and order your lunch.",
    start_url: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#000000",
    theme_color: "#000000",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
