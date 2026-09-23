import type { Metadata } from "next";
import "./globals.css";
import Sidebar from "@/components/layout/Sidebar";
import BottomNav from "@/components/layout/BottomNav";
import Shortcuts from "@/components/layout/Shortcuts";

export const metadata: Metadata = {
  title: "Personal OS",
  description: "Adwait's personal operating system",
};

// Runs before paint so there's no light→dark flash. Stored choice wins; otherwise follow the
// OS setting, and default to dark at night (21:00–06:00 IST), when the app is mostly opened.
const THEME_SCRIPT = `(function(){try{var s=localStorage.getItem('os-theme');var h=new Date(Date.now()+19800000).getUTCHours();var d=s?s==='dark':(matchMedia('(prefers-color-scheme: dark)').matches||h>=21||h<6);if(d)document.documentElement.classList.add('dark')}catch(e){}})();`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="h-full" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Geist:wght@400;500;600;700&family=Geist+Mono:wght@400;500;600&display=swap" rel="stylesheet" />
      </head>
      <body className="h-full flex">
        <Sidebar />
        <main className="app-main">{children}</main>
        <BottomNav />
        <Shortcuts />
      </body>
    </html>
  );
}
