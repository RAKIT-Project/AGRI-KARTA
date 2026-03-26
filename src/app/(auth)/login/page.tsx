import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Bot, Mail, Lock } from "lucide-react";
import Image from "next/image";

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <Card className="w-full max-w-md bg-card border-border shadow-2xl">
        <CardHeader className="space-y-1 items-center pb-8">
          <Image 
            src="/tipografi.png"
            alt="AGRI-KARTA"
            width={200}
            height={53}
            className="h-12 w-auto object-contain mb-2"
            priority
          />
          <CardTitle className="sr-only">
            Masuk ke AGRI-KARTA
          </CardTitle>
          <CardDescription className="text-muted-foreground text-center">
            Masukkan email dan password untuk mengakses fitur premium
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form className="space-y-4">
            <div className="space-y-2">
              <div className="relative">
                <label htmlFor="email" className="sr-only">Email</label>
                <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  placeholder="name@example.com"
                  className="pl-9 bg-input border-border focus-visible:ring-primary"
                  aria-label="Email Address"
                  required
                />
              </div>
            </div>
            <div className="space-y-2">
              <div className="relative">
                <label htmlFor="password" className="sr-only">Password</label>
                <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  className="pl-9 bg-input border-border focus-visible:ring-primary"
                  aria-label="Password"
                  required
                />
              </div>
            </div>
            <Button className="w-full bg-primary text-primary-foreground hover:bg-primary/90">
              Masuk
            </Button>
          </form>
          
          <div className="mt-6 border-t border-border pt-6">
            <div className="bg-muted p-4 rounded-lg flex gap-3 text-sm text-muted-foreground">
              <Bot className="w-5 h-5 shrink-0 text-primary" />
              <p>
                Sebagai MVP, fitur login ini terhubung langsung dengan Supabase Auth. Anda bisa menggunakan akun dummy untuk keperluan tes.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
