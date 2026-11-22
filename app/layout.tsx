import type { Metadata, Viewport } from "next";
import "./globals.css";
import { SiteFooter } from "@/components/site-footer";

export const metadata: Metadata = {
  title: "EA Trade Mobile VPS",
  description: "A secure control centre for Expert Advisor hosting, mentor licensing and trading-system telemetry.",
  applicationName: "EA Trade Mobile VPS",
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, statusBarStyle: "black-translucent", title: "EA Trade VPS" }
};

export const viewport: Viewport = {
  themeColor: "#090D14",
  width: "device-width",
  initialScale: 1
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body><div className="flex min-h-screen flex-col"><div className="flex-1">{children}</div><SiteFooter /></div></body></html>;
}
