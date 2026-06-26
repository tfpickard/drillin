import type { Metadata, Viewport } from "next";
import { SiteHeader } from "@/components/SiteHeader";
import "./globals.css";

export const metadata: Metadata = {
  title: "Drillin — Professional Networking",
  description: "Source the right people. Align offline.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-dvh">
        <SiteHeader />
        <main className="mx-auto max-w-md px-4 pb-24 pt-4">{children}</main>
      </body>
    </html>
  );
}
