"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  AlertCircle,
  ArrowLeft,
  Bot,
  CheckCircle2,
  Loader2,
  Lock,
  Mail,
} from "lucide-react";
import Image from "next/image";

// ── View States ───────────────────────────────────────────────────────────────
// 'login'       → standard email + password form
// 'forgot'      → email-only form requesting a Supabase password-reset link
// 'forgot-sent' → success state shown after the reset email is dispatched
type View = "login" | "forgot" | "forgot-sent";

const CARD_DESCRIPTIONS: Record<View, string> = {
  login: "Masukkan email dan password untuk mengakses fitur premium.",
  forgot:
    "Masukkan email Anda dan kami akan mengirimkan link untuk mereset password.",
  "forgot-sent":
    "Cek kotak masuk email Anda dan klik tautan yang dikirim AGRI-KARTA.",
};

const CARD_TITLES: Record<View, string> = {
  login: "Masuk ke AGRI-KARTA",
  forgot: "Lupa Password?",
  "forgot-sent": "Email Terkirim! 📬",
};

export default function LoginPage() {
  const router = useRouter();
  const supabase = createClient();

  // ── UI state ────────────────────────────────────────────────────────────────
  const [view, setView] = useState<View>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  // ── Helpers ─────────────────────────────────────────────────────────────────
  const clearMessages = () => setErrorMessage("");

  const switchToForgot = () => {
    clearMessages();
    setPassword("");
    setView("forgot");
  };

  const switchToLogin = () => {
    clearMessages();
    setView("login");
  };

  // ── Login handler ────────────────────────────────────────────────────────────
  const doLogin = async (loginEmail: string, loginPass: string) => {
    setIsLoading(true);
    clearMessages();

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
    const dummyEmail = "admin@agrikarta.com";
    const dummyPass = "agrikarta123";
    setEmail(dummyEmail);
    setPassword(dummyPass);
    doLogin(dummyEmail, dummyPass);
  };

  // ── Forgot-password handler ──────────────────────────────────────────────────
  // Uses Supabase's built-in resetPasswordForEmail().
  // The `redirectTo` value points to the /update-password page where the user
  // will enter their new password after clicking the email link.
  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    clearMessages();

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/update-password`,
    });

    setIsLoading(false);

    if (error) {
      setErrorMessage(error.message);
    } else {
      setView("forgot-sent");
    }
  };

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <Card className="w-full max-w-md">
        {/* ── Card Header ──────────────────────────────────────────────────── */}
        <CardHeader className="space-y-2 items-center pb-6">
          <Image
            src="/tipografi.png"
            alt="AGRI-KARTA"
            width={200}
            height={53}
            className="h-12 w-auto object-contain mb-1"
            priority
          />
          <CardTitle className="text-base font-semibold text-foreground text-center">
            {CARD_TITLES[view]}
          </CardTitle>
          <CardDescription className="text-center text-sm leading-relaxed">
            {CARD_DESCRIPTIONS[view]}
          </CardDescription>
        </CardHeader>

        {/* ── Card Body ────────────────────────────────────────────────────── */}
        <CardContent className="space-y-4">
          {/* ── Shared error banner ─────────────────────────────────────────── */}
          {errorMessage && (
            <div className="bg-destructive/10 text-destructive text-sm p-3 rounded-xl flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* ════════════════════════════════════════════════════════════════
              VIEW: Login
          ════════════════════════════════════════════════════════════════ */}
          {view === "login" && (
            <form onSubmit={handleLogin} className="space-y-3">
              {/* Email */}
              <div className="relative">
                <label htmlFor="email" className="sr-only">
                  Email
                </label>
                <Mail className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground pointer-events-none" />
                <Input
                  id="email"
                  type="email"
                  placeholder="nama@contoh.com"
                  className="pl-9"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={isLoading}
                  autoComplete="email"
                />
              </div>

              {/* Password */}
              <div className="relative">
                <label htmlFor="password" className="sr-only">
                  Password
                </label>
                <Lock className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground pointer-events-none" />
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  className="pl-9"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={isLoading}
                  autoComplete="current-password"
                />
              </div>

              {/* Forgot password toggle */}
              <div className="flex justify-end -mt-1">
                <Button
                  type="button"
                  variant="link"
                  size="sm"
                  className="h-auto p-0 text-xs text-muted-foreground hover:text-primary"
                  onClick={switchToForgot}
                  disabled={isLoading}
                >
                  Lupa password?
                </Button>
              </div>

              {/* Primary CTA */}
              <Button
                type="submit"
                size="lg"
                className="w-full"
                disabled={isLoading}
              >
                {isLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  "Masuk"
                )}
              </Button>

              {/* Dummy account shortcut */}
              <Button
                type="button"
                variant="outline"
                size="lg"
                className="w-full"
                onClick={handleDummyLogin}
                disabled={isLoading}
              >
                Gunakan Akun Dummy
              </Button>
            </form>
          )}

          {/* ════════════════════════════════════════════════════════════════
              VIEW: Forgot Password — email-only form
          ════════════════════════════════════════════════════════════════ */}
          {view === "forgot" && (
            <form onSubmit={handleForgotPassword} className="space-y-3">
              {/* Email */}
              <div className="relative">
                <label htmlFor="reset-email" className="sr-only">
                  Email
                </label>
                <Mail className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground pointer-events-none" />
                <Input
                  id="reset-email"
                  type="email"
                  placeholder="nama@contoh.com"
                  className="pl-9"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={isLoading}
                  autoFocus
                  autoComplete="email"
                />
              </div>

              {/* Send reset link */}
              <Button
                type="submit"
                size="lg"
                className="w-full"
                disabled={isLoading}
              >
                {isLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  "Kirim Link Reset"
                )}
              </Button>

              {/* Back to login */}
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="w-full text-muted-foreground hover:text-foreground"
                onClick={switchToLogin}
                disabled={isLoading}
              >
                <ArrowLeft className="w-3.5 h-3.5 mr-1.5" />
                Kembali ke Login
              </Button>
            </form>
          )}

          {/* ════════════════════════════════════════════════════════════════
              VIEW: Forgot Sent — success state
          ════════════════════════════════════════════════════════════════ */}
          {view === "forgot-sent" && (
            <div className="space-y-4">
              {/* Success card */}
              <div className="bg-accent rounded-2xl p-5 flex flex-col items-center gap-3 text-center">
                <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
                  <CheckCircle2 className="w-6 h-6 text-primary" />
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-semibold text-foreground">
                    Link reset berhasil dikirim!
                  </p>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Silakan buka email{" "}
                    <span className="font-semibold text-foreground">
                      {email}
                    </span>{" "}
                    dan klik tautan yang kami kirimkan. Link akan kedaluwarsa
                    dalam <strong className="text-foreground">1 jam</strong>.
                  </p>
                </div>
              </div>

              {/* Back to login */}
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="w-full text-muted-foreground hover:text-foreground"
                onClick={switchToLogin}
              >
                <ArrowLeft className="w-3.5 h-3.5 mr-1.5" />
                Kembali ke Login
              </Button>
            </div>
          )}

          {/* ── MVP info banner (login view only) ───────────────────────── */}
          {view === "login" && (
            <div className="pt-2 border-t border-border/60">
              <div className="bg-muted/70 p-3.5 rounded-xl flex gap-2.5 text-xs text-muted-foreground">
                <Bot className="w-4 h-4 shrink-0 text-primary mt-0.5" />
                <p>
                  Sebagai MVP, fitur login ini terhubung langsung dengan
                  Supabase Auth. Gunakan akun dummy untuk keperluan tes.
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
