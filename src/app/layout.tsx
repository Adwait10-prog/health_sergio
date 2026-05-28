import type { Metadata } from "next";
import "./globals.css";
import Sidebar from "@/components/layout/Sidebar";
import BottomNav from "@/components/layout/BottomNav";

export const metadata: Metadata = {
  title: "Personal OS",
  description: "Adwait's personal operating system",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="h-full">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700;0,9..40,800;1,9..40,400&display=swap" rel="stylesheet" />
      </head>
      <body className="h-full flex" style={{ background: "var(--bg)", color: "var(--text-1)", fontFamily: "'DM Sans', system-ui, sans-serif" }}>
        <Sidebar />
        <main className="flex-1 overflow-y-auto pb-20 lg:pb-0" style={{ overflowX: "hidden" }}>
          {children}
        </main>
        <BottomNav />
      </body>
    </html>
  );
}
