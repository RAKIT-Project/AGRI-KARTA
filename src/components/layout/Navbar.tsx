"use client";

import Image from "next/image";
import Link from "next/link";
import { Menu, UserCircle } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/layout/ThemeToggle";
import { ChatbotSlideOver } from "@/components/layout/ChatbotSlideOver";

export function Navbar() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  return (
    <nav className="sticky top-0 z-50 w-full border-b border-border bg-background/80 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 md:px-8">
        <div className="flex h-16 items-center justify-between">
          <div className="flex items-center gap-6">
            <Link href="/" className="flex items-center gap-2">
              <Image 
                src="/tipografi.png"
                alt="AGRI-KARTA Logo"
                width={150}
                height={40}
                className="h-8 w-auto object-contain"
                priority
              />
            </Link>

            <div className="hidden md:flex items-center gap-4 text-sm font-medium">
              <Link href="/dashboard" className="text-muted-foreground hover:text-foreground transition-colors">
                Dashboard
              </Link>
              <Link href="/alerts" className="text-muted-foreground hover:text-foreground transition-colors">
                Price Alerts
              </Link>
              <Link href="/kelola" className="text-muted-foreground hover:text-foreground transition-colors">
                Kelola
              </Link>
              <Link href="/profile" className="text-muted-foreground hover:text-foreground transition-colors">
                Profil
              </Link>
            </div>
          </div>

          <div className="hidden md:flex items-center gap-4">
            <ThemeToggle />
            <ChatbotSlideOver />
          </div>

          <div className="flex items-center gap-2 md:hidden">
            <ThemeToggle />
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            >
              <Menu className="h-6 w-6" />
              <span className="sr-only">Menu</span>
            </Button>
          </div>
        </div>
      </div>

      {isMobileMenuOpen && (
        <div className="md:hidden border-t border-border bg-background p-4 flex flex-col gap-4 shadow-lg absolute w-full left-0">
          <div className="flex flex-col gap-2 font-medium">
            <Link 
              href="/dashboard" 
              className="px-2 py-1.5 text-foreground hover:bg-muted rounded-md"
              onClick={() => setIsMobileMenuOpen(false)}
            >
              Dashboard
            </Link>
            <Link 
              href="/alerts" 
              className="px-2 py-1.5 text-foreground hover:bg-muted rounded-md"
              onClick={() => setIsMobileMenuOpen(false)}
            >
              Price Alerts
            </Link>
            <Link 
              href="/kelola" 
              className="px-2 py-1.5 text-foreground hover:bg-muted rounded-md"
              onClick={() => setIsMobileMenuOpen(false)}
            >
              Kelola
            </Link>
            <Link 
              href="/profile" 
              className="px-2 py-1.5 text-foreground hover:bg-muted rounded-md flex items-center gap-2"
              onClick={() => setIsMobileMenuOpen(false)}
            >
              <UserCircle className="w-4 h-4" />
              Profil
            </Link>
          </div>
          <div className="pt-2 border-t border-border">
            <ChatbotSlideOver />
          </div>
        </div>
      )}
    </nav>
  );
}
