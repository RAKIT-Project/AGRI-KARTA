"use client";

/**
 * /update-password — Supabase Password Reset Landing Page
 * ─────────────────────────────────────────────────────────
 * This page is the `redirectTo` target for Supabase's
 * `auth.resetPasswordForEmail()` call made on the login page.
 *
 * Auth flow:
 *   1. User clicks the link in the reset email.
 *   2. Browser lands here with `?token_hash=...&type=recovery` query params.
 *   3. The Supabase browser client (createBrowserClient from @supabase/ssr)
 *      detects those params automatically because `detectSessionInUrl` is
 *      enabled by default, exchanges them for a short-lived session, and
 *      fires the PASSWORD_RECOVERY auth state-change event.
 *   4. We listen for that event and transition to the 'ready' state so the
 *      form becomes interactive.
 *   5. On submit we call `supabase.auth.updateUser({ password })`.
 *   6. On success we redirect the user to /dashboard.
 *
 * A 2-second safety fallback transitions from 'initializing' to 'ready'
 * regardless of the auth event, so the user always sees the form.
 * Errors from `updateUser` (e.g. expired link) are surfaced in-line.
 */

import { useEffect, useState } from "react";
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
  CheckCircle2,
  Eye,
  EyeOff,
  Loader2,
  Lock,
  ShieldCheck,
} from "lucide-react";
import Image from "next/image";

// ── Page States ───────────────────────────────────────────────────────────────
// 'initializing' → Supabase is exchanging the recovery token from the URL.
//                  A spinner is shown; the form is not yet interactive.
// 'ready'        → Recovery session is established; user can set new password.
// 'success'      → Password updated; showing confirmation before redirect.
type PageState = "initializing" | "ready" | "success";

// Minimum password length enforced client-side (Supabase enforces its own
// policy server-side as well).
const MIN_PASSWORD_LENGTH = 8;

export default function UpdatePasswordPage() {
  const router = useRouter();
  const supabase = createClient();

  // ── Component state ────────────────────────────────────────────────────────
  const [pageState, setPageState] = useState<PageState>("initializing");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  // ── Derived helpers ────────────────────────────────────────────────────────
  const passwordsMatch =
    confirmPassword.length === 0 || password === confirmPassword;
  const passwordStrong = password.length >= MIN_PASSWORD_LENGTH;
  const charsRemaining = MIN_PASSWORD_LENGTH - password.length;

  // ── Session Detection ──────────────────────────────────────────────────────
  useEffect(() => {
    // Listen for the PASSWORD_RECOVERY auth event that the Supabase browser
    // client fires once it successfully exchanges the recovery token from the
    // URL query params (token_hash + type=recovery).
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") {
        setPageState("ready");
      }
    });

    // Also handle the case where the user already has a valid session
    // (e.g., a logged-in user who navigated here directly to change their
    // password — no recovery token in the URL is needed).
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) setPageState("ready");
    });

    // Safety fallback: if no auth event fires within 2 seconds we transition
    // to 'ready' regardless and rely on updateUser() to surface any error
    // (e.g. expired or invalid recovery link).
    const fallback = setTimeout(() => setPageState("ready"), 2000);

    return () => {
      subscription.unsubscribe();
      clearTimeout(fallback);
    };
    // supabase is created on every render (createBrowserClient caches
    // internally), so we intentionally omit it from deps to prevent
    // re-subscription on every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Redirect after success ─────────────────────────────────────────────────
  useEffect(() => {
    if (pageState !== "success") return;
    const timer = setTimeout(() => router.push("/dashboard"), 2200);
    return () => clearTimeout(timer);
  }, [pageState, router]);

  // ── Submit handler ─────────────────────────────────────────────────────────
  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage("");

    // Client-side validation — guard before hitting the network.
    if (!passwordStrong) {
      setErrorMessage(
        `Password harus minimal ${MIN_PASSWORD_LENGTH} karakter.`
      );
      return;
    }
    if (password !== confirmPassword) {
      setErrorMessage(
        "Konfirmasi password tidak cocok. Silakan periksa kembali."
      );
      return;
    }

    setIsLoading(true);

    // `updateUser` works because the PASSWORD_RECOVERY event established a
    // short-lived session tied to the recovery token from the email link.
    const { error } = await supabase.auth.updateUser({ password });

    setIsLoading(false);

    if (error) {
      setErrorMessage(error.message);
    } else {
      setPageState("success");
    }
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <Card className="w-full max-w-md">
        {/* ── Card Header ─────────────────────────────────────────────────── */}
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
            {pageState === "success" ? "Password Diperbarui! 🎉" : "Buat Password Baru"}
          </CardTitle>
          <CardDescription className="text-center text-sm leading-relaxed">
            {pageState === "initializing" &&
              "Memverifikasi link reset password Anda…"}
            {pageState === "ready" &&
              "Masukkan password baru Anda. Gunakan minimal 8 karakter."}
            {pageState === "success" &&
              "Password Anda berhasil diperbarui. Anda akan diarahkan ke dashboard."}
          </CardDescription>
        </CardHeader>

        {/* ── Card Body ───────────────────────────────────────────────────── */}
        <CardContent>
          {/* ════════════════════════════════════════════════════════════════
              STATE: Initializing
              Show a spinner while waiting for the PASSWORD_RECOVERY event.
          ════════════════════════════════════════════════════════════════ */}
          {pageState === "initializing" && (
            <div className="flex flex-col items-center gap-3 py-10 text-muted-foreground">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
              <p className="text-sm">Memverifikasi link reset password…</p>
            </div>
          )}

          {/* ════════════════════════════════════════════════════════════════
              STATE: Ready — password update form
          ════════════════════════════════════════════════════════════════ */}
          {pageState === "ready" && (
            <form onSubmit={handleUpdate} className="space-y-4">
              {/* Error banner */}
              {errorMessage && (
                <div className="bg-destructive/10 text-destructive text-sm p-3 rounded-xl flex items-start gap-2.5">
                  <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                  <span>{errorMessage}</span>
                </div>
              )}

              {/* ── New password ──────────────────────────────────────────── */}
              <div className="space-y-1.5">
                <label
                  htmlFor="new-password"
                  className="text-xs font-medium text-muted-foreground pl-1"
                >
                  Password Baru
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground pointer-events-none" />
                  <Input
                    id="new-password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Minimal 8 karakter"
                    className="pl-9 pr-10"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    disabled={isLoading}
                    autoComplete="new-password"
                    autoFocus
                  />
                  {/* Toggle visibility */}
                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    className="absolute right-3 top-2.5 text-muted-foreground hover:text-foreground transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 rounded"
                    aria-label={
                      showPassword
                        ? "Sembunyikan password"
                        : "Tampilkan password"
                    }
                    tabIndex={-1}
                  >
                    {showPassword ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>

                {/* Password strength hint — only shown when user is typing */}
                {password.length > 0 && (
                  <p
                    className={`text-xs pl-1 transition-colors ${
                      passwordStrong ? "text-primary" : "text-muted-foreground"
                    }`}
                  >
                    {passwordStrong ? (
                      <>✓ Panjang password sudah mencukupi</>
                    ) : (
                      <>Butuh {charsRemaining} karakter lagi</>
                    )}
                  </p>
                )}
              </div>

              {/* ── Confirm password ─────────────────────────────────────── */}
              <div className="space-y-1.5">
                <label
                  htmlFor="confirm-password"
                  className="text-xs font-medium text-muted-foreground pl-1"
                >
                  Konfirmasi Password
                </label>
                <div className="relative">
                  <ShieldCheck className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground pointer-events-none" />
                  <Input
                    id="confirm-password"
                    type={showConfirm ? "text" : "password"}
                    placeholder="Ulangi password baru"
                    className={`pl-9 pr-10 transition-colors ${
                      !passwordsMatch && confirmPassword.length > 0
                        ? "border-destructive/50 focus-visible:ring-destructive/40"
                        : ""
                    }`}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    disabled={isLoading}
                    autoComplete="new-password"
                  />
                  {/* Toggle visibility */}
                  <button
                    type="button"
                    onClick={() => setShowConfirm((prev) => !prev)}
                    className="absolute right-3 top-2.5 text-muted-foreground hover:text-foreground transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 rounded"
                    aria-label={
                      showConfirm
                        ? "Sembunyikan konfirmasi"
                        : "Tampilkan konfirmasi"
                    }
                    tabIndex={-1}
                  >
                    {showConfirm ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>

                {/* Mismatch hint */}
                {!passwordsMatch && confirmPassword.length > 0 && (
                  <p className="text-xs text-destructive pl-1">
                    Password tidak cocok
                  </p>
                )}
              </div>

              {/* ── Submit ────────────────────────────────────────────────── */}
              <Button
                type="submit"
                size="lg"
                className="w-full mt-2"
                disabled={isLoading || !passwordsMatch}
              >
                {isLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  "Simpan Password Baru"
                )}
              </Button>
            </form>
          )}

          {/* ════════════════════════════════════════════════════════════════
              STATE: Success
              Brief confirmation panel before router.push('/dashboard').
          ════════════════════════════════════════════════════════════════ */}
          {pageState === "success" && (
            <div className="flex flex-col items-center gap-4 py-8 text-center">
              {/* Animated success badge */}
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
                <CheckCircle2 className="w-8 h-8 text-primary" />
              </div>

              <div className="space-y-1">
                <p className="text-sm font-semibold text-foreground">
                  Password berhasil diubah!
                </p>
                <p className="text-xs text-muted-foreground">
                  Mengalihkan ke dashboard…
                </p>
              </div>

              {/* Redirect spinner */}
              <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
