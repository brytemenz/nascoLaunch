import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { appUrl } from "@/lib/share";
import { ConfirmProvider } from "@/components/Confirm";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });

export async function generateMetadata(): Promise<Metadata> {
  const description = "See today's menu and order your lunch in seconds.";
  return {
    metadataBase: new URL(await appUrl()),
    title: { default: "NASCO Lunch", template: "%s · NASCO Lunch" },
    description,
    // Full-screen "app" when added to the iPhone home screen
    appleWebApp: { capable: true, statusBarStyle: "black-translucent", title: "Lunch" },
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
  viewportFit: "cover", // draw under the iPhone notch; we pad with safe-area insets
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={inter.variable}>
      <body>
        <div className="ambient" aria-hidden />
        <div className="relative z-10">
          <ConfirmProvider>{children}</ConfirmProvider>
        </div>
      </body>
    </html>
  );
}
