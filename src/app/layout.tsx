import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { appUrl } from "@/lib/share";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });

export async function generateMetadata(): Promise<Metadata> {
  const description = "See today's menu and order your lunch in seconds.";
  return {
    metadataBase: new URL(await appUrl()),
    title: { default: "NASCO Lunch", template: "%s · NASCO Lunch" },
    description,
    // Link preview when the menu is shared on WhatsApp, SMS, etc.
    openGraph: {
      title: "NASCO Lunch — today's menu",
      description,
      images: [{ url: "/menu/jollof-chicken.jpg", width: 1200, height: 800, alt: "Jollof rice with chicken" }],
      type: "website",
    },
  };
}

export const viewport: Viewport = {
  themeColor: "#000000",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={inter.variable}>
      <body>
        <div className="ambient" aria-hidden />
        <div className="relative z-10">{children}</div>
      </body>
    </html>
  );
}
