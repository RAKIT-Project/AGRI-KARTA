import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "AGRI-KARTA",
  description: "Agro-Intelligence for Yogyakarta",
  manifest: "/manifest.json",
  icons: {
    icon: "/logo.jpg",
  },
};

export const viewport: Viewport = {
  themeColor: "#0B0914",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

import { ThemeProvider } from "@/components/theme-provider";
import { Navbar } from "@/components/layout/Navbar";
import Image from "next/image";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="id"
      className={`${inter.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col bg-background text-foreground">
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <Navbar />
          <main className="flex-1 overflow-y-auto px-4 py-6 md:px-8 md:py-8 w-full max-w-7xl mx-auto flex flex-col">
            <div className="flex-1">
              {children}
            </div>
            <footer className="mt-12 py-6 border-t border-border flex flex-col md:flex-row items-center justify-between gap-4">
              <Image 
                src="/tipografi.jpg"
                alt="AGRI-KARTA"
                width={120}
                height={32}
                className="h-6 w-auto object-contain dark:brightness-200"
              />
              <p className="text-sm text-muted-foreground text-center md:text-left">
                &copy; {new Date().getFullYear()} AGRI-KARTA (Agro-Intelligence for Yogyakarta). All rights reserved.
              </p>
            </footer>
          </main>
        </ThemeProvider>
      </body>
    </html>
  );
}
