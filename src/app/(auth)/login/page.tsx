"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Bot, Mail, Lock, Loader2, AlertCircle } from "lucide-react";
import Image from "next/image";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const supabase = createClient();

  const doLogin = async (loginEmail: string, loginPass: string) => {
    setIsLoading(true);
    setErrorMessage("");
    
    const { error } = await supabase.auth.signInWithPassword({
      email: loginEmail,
      password: loginPass,
    });

    if (error) {
      setErrorMessage(error.message);
      setIsLoading(false);
    } else {
      router.refresh();
      router.push("/dashboard");
    }
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    doLogin(email, password);
  };

  const handleDummyLogin = () => {
    setEmail("admin@agrikarta.com");
    setPassword("agrikarta123");
    doLogin("admin@agrikarta.com", "agrikarta123");
  };

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
          <form onSubmit={handleLogin} className="space-y-4">
            
            {errorMessage && (
              <div className="bg-destructive/15 text-destructive text-sm p-3 rounded-md flex items-start gap-2">
                <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

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
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={isLoading}
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
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={isLoading}
                />
              </div>
            </div>
            <Button 
              type="submit" 
              className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
              disabled={isLoading}
            >
              {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Masuk"}
            </Button>
            
            <Button 
              type="button" 
              variant="outline" 
              className="w-full border-primary text-primary hover:bg-primary/10"
              onClick={handleDummyLogin}
              disabled={isLoading}
            >
              Gunakan Akun Dummy
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
