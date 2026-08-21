import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { useAuth } from "@/contexts/auth";
import { useBrand } from "@/lib/brand";
import { useTheme } from "@/lib/theme";
import { supabase } from "@/lib/supabase";
import { useHeroImage } from "@/lib/useHeroImage";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign in" },
      { name: "description", content: "Sign in to capture and manage your notes." },
    ],
  }),
  component: AuthPage,
});

type AuthMode = "signin" | "register" | "forgot";

function AuthPage() {
  const { user, loading, signIn, signUp } = useAuth();
  const navigate = useNavigate();
  const brand = useBrand();
  const { resolved, setMode: setThemeMode } = useTheme();
  // Same mechanism as the Welcome screen (ProjectEntryScreen): random image
  // from the "App media/Hero" bucket, no seed.
  const { url: heroBgUrl } = useHeroImage();

  const [mode, setMode] = useState<AuthMode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [confirmationSent, setConfirmationSent] = useState(false);
  const [resetSent, setResetSent] = useState(false);

  useEffect(() => {
    if (!loading && user) navigate({ to: "/" });
  }, [loading, user, navigate]);

  useEffect(() => {
    const action = mode === "register" ? "Register" : mode === "forgot" ? "Reset password" : "Sign in";
    document.title = `${action} — ${brand.name} App`;
  }, [mode, brand.name]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setConfirmationSent(false);
    setResetSent(false);
    setSubmitting(true);

    try {
      if (mode === "forgot") {
        const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
          redirectTo: `${window.location.origin}/auth`,
        });
        if (error) throw error;
        setResetSent(true);
        setEmail("");
      } else if (mode === "register") {
        if (password !== confirmPassword) {
          throw new Error("Passwords do not match.");
        }
        const result = await signUp(email.trim(), password);
        if (result.session) {
          navigate({ to: "/" });
        } else {
          setConfirmationSent(true);
          setEmail("");
          setPassword("");
          setConfirmPassword("");
        }
      } else {
        await signIn(email.trim(), password);
        navigate({ to: "/" });
      }
    } catch (err) {
      setFormError((err as Error).message || "Something went wrong.");
    } finally {
      setSubmitting(false);
    }
  };

  const switchMode = (next: AuthMode) => {
    setMode(next);
    setFormError(null);
    setConfirmationSent(false);
    setResetSent(false);
    setShowPassword(false);
    setShowConfirmPassword(false);
  };

  const switchLabel = resolved === "dark" ? "Switch to Xcamp" : "Switch to Nox";

  return (
    <div
      className="relative flex min-h-screen items-center justify-center overflow-hidden px-4"
      style={{ background: "#0f1c1f" }}
    >
      {/* Background photo — same random-from-"App media/Hero" mechanism as the Welcome screen */}
      {heroBgUrl && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            backgroundImage: `url("${heroBgUrl}")`,
            backgroundSize: "cover",
            backgroundPosition: "center",
          }}
        />
      )}

      {/* Brand gradient wash — mirrors the Welcome screen's overlay */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          pointerEvents: "none",
          background:
            "linear-gradient(160deg, rgba(52,172,191,0.55), rgba(77,224,193,0.45) 55%, rgba(15,28,31,0.6))",
        }}
      />

      {/* Mode switcher pill */}
      <button
        type="button"
        onClick={() => setThemeMode(resolved === "dark" ? "light" : "dark")}
        className="absolute right-4 top-4 rounded-full px-3 py-1.5 text-xs font-medium text-white transition-colors"
        style={{
          background: "rgba(0,0,0,0.35)",
          border: "1px solid rgba(255,255,255,0.15)",
          backdropFilter: "blur(8px)",
          WebkitBackdropFilter: "blur(8px)",
        }}
      >
        {switchLabel}
      </button>

      {/* Frosted glass card — same treatment as the Welcome screen's container */}
      <div
        className="relative w-full max-w-sm"
        style={{
          padding: "40px 32px 36px",
          borderRadius: 28,
          border: "1px solid rgba(255,255,255,0.45)",
          background: "rgba(255,255,255,0.34)",
          backdropFilter: "blur(26px)",
          WebkitBackdropFilter: "blur(26px)",
          boxShadow: "0 24px 60px rgba(10,25,30,0.28)",
        }}
      >
        <div className="mb-6 text-center">
          <img
            src={brand.iconUrl}
            alt={brand.name}
            className="mx-auto mb-3 h-11 w-11 rounded-md object-cover"
          />
          <h1 className="text-xl font-semibold" style={{ color: "var(--skin-ink)" }}>
            {brand.name} App
          </h1>
          <p className="mt-1 text-sm" style={{ color: "var(--skin-ink-soft)" }}>
            {mode === "signin"
              ? "Sign in to capture your notes."
              : mode === "register"
              ? "Create your account to get started."
              : "Enter your email to receive a password reset link."}
          </p>
        </div>

        {confirmationSent && (
          <div
            className="mb-4 rounded-md px-4 py-3 text-sm"
            style={{ background: "var(--skin-accent-soft)", color: "var(--skin-ink)" }}
          >
            Registration successful. Please check your email to confirm your account before signing in.
          </div>
        )}

        {resetSent && (
          <div
            className="mb-4 rounded-md px-4 py-3 text-sm"
            style={{ background: "var(--skin-accent-soft)", color: "var(--skin-ink)" }}
          >
            Reset link sent. Check your email and follow the link to set a new password.
          </div>
        )}

        <form onSubmit={handleSubmit} className="x-editor space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-medium" style={{ color: "var(--skin-ink-soft)" }}>
              Email
            </label>
            <input
              type="email"
              required
              className="x-input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              autoComplete="email"
            />
          </div>

          {mode !== "forgot" && (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-medium" style={{ color: "var(--skin-ink-soft)" }}>
                  Password
                </label>
                {mode === "signin" && (
                  <button
                    type="button"
                    onClick={() => switchMode("forgot")}
                    className="text-xs"
                    style={{ color: "var(--skin-accent)" }}
                  >
                    Forgot password?
                  </button>
                )}
              </div>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  className="x-input pr-10"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  autoComplete={mode === "register" ? "new-password" : "current-password"}
                />
                <button
                  type="button"
                  tabIndex={-1}
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2"
                  style={{ color: "var(--skin-ink-faint)" }}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {mode === "register" && (
                <p className="text-xs" style={{ color: "var(--skin-ink-faint)" }}>
                  Minimum 6 characters.
                </p>
              )}
            </div>
          )}

          {mode === "register" && (
            <div className="space-y-1.5">
              <label className="text-xs font-medium" style={{ color: "var(--skin-ink-soft)" }}>
                Confirm password
              </label>
              <div className="relative">
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  required
                  className="x-input pr-10"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  tabIndex={-1}
                  onClick={() => setShowConfirmPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2"
                  style={{ color: "var(--skin-ink-faint)" }}
                  aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                >
                  {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
          )}

          {formError && (
            <p className="text-sm" style={{ color: "var(--danger)" }}>
              {formError}
            </p>
          )}

          <button type="submit" className="x-btn-primary w-full" disabled={submitting}>
            {submitting
              ? mode === "register"
                ? "Creating account…"
                : mode === "forgot"
                ? "Sending…"
                : "Signing in…"
              : mode === "register"
              ? "Create account"
              : mode === "forgot"
              ? "Send reset link"
              : "Sign in"}
          </button>
        </form>

        <div className="mt-4 text-center text-sm" style={{ color: "var(--skin-ink-soft)" }}>
          {mode === "signin" ? (
            <>
              Don&apos;t have an account?{" "}
              <button
                type="button"
                onClick={() => switchMode("register")}
                className="font-medium underline"
                style={{ color: "var(--skin-accent)" }}
              >
                Register
              </button>
            </>
          ) : (
            <>
              {mode === "register" ? "Already have an account?" : "Remembered it?"}{" "}
              <button
                type="button"
                onClick={() => switchMode("signin")}
                className="font-medium underline"
                style={{ color: "var(--skin-accent)" }}
              >
                Sign in
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
