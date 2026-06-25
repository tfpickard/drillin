import type { Metadata, Viewport } from "next";
import Link from "next/link";
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
        <header className="sticky top-0 z-30 border-b border-border bg-surface/95 backdrop-blur">
          <div className="mx-auto flex h-14 max-w-md items-center justify-between px-4">
            <Link href="/" className="flex items-center gap-1 text-brand">
              <span className="grid h-7 w-7 place-items-center rounded bg-brand text-sm font-bold text-white">
                in
              </span>
              <span className="text-lg font-bold tracking-tight text-ink">Drillin</span>
            </Link>
            <nav className="flex items-center gap-4 text-sm text-ink-muted">
              <Link href="/" className="hover:text-brand">
                Source
              </Link>
              <Link href="/me" className="hover:text-brand">
                My Profile
              </Link>
            </nav>
          </div>
        </header>
        <main className="mx-auto max-w-md px-4 pb-24 pt-4">{children}</main>
      </body>
    </html>
  );
}
