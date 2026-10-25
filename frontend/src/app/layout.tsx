import type { Metadata, Viewport } from "next";
import "@fontsource-variable/inter";
import "./globals.css";
import Header from "@/components/Header";
import ChatWidget from "@/components/ChatWidget";

export const metadata: Metadata = {
  title: "IDM Eswatini: Apply online",
  description: "Check which IDM programmes you qualify for, see fees, and apply online.",
};
export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: "#00623c" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen antialiased">
        <Header />
        <main>{children}</main>
        <footer className="mt-16 border-t border-line px-4 pb-24 pt-8 text-sm text-muted">
          <p className="mx-auto max-w-4xl">
            IDM Eswatini, Kwaluseni, Lozitha Road, opposite UNESWA. Admissions: admissions@idmbls.ac.sz, +268 2550 4085.
          </p>
        </footer>
        <ChatWidget />
      </body>
    </html>
  );
}
