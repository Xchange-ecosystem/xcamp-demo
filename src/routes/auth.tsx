import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/auth";
import { useBrand } from "@/lib/brand";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign in — Xcamp Journal" },
      { name: "description", content: "Sign in to Xcamp Journal to capture and manage your notes." },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const { user, loading, signIn, signUp } = useAuth();
  const navigate = useNavigate();
  const brand = useBrand();
  const [mode, setMode] = useState<"signin" | "register">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [confirmationSent, setConfirmationSent] = useState(false);

  useEffect(() => {
    if (!loading && user) navigate({ to: "/" });
  }, [loading, user, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setConfirmationSent(false);
    setSubmitting(true);

    try {
      if (mode === "register") {
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

  const toggleMode = () => {
    setMode((m) => (m === "signin" ? "register" : "signin"));
    setFormError(null);
    setConfirmationSent(false);
  };

  return (
    <div className="flex min-h-screen items-center justify-center px-4" style={{ background: "var(--skin-surface)" }}>
      <div className="w-full max-w-sm">
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
            {mode === "signin" ? "Sign in to capture your notes." : "Create your account to get started."}
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
          <div className="space-y-1.5">
            <label className="text-xs font-medium" style={{ color: "var(--skin-ink-soft)" }}>
              Password
            </label>
            <input
              type="password"
              required
              className="x-input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              autoComplete={mode === "register" ? "new-password" : "current-password"}
            />
          </div>

          {mode === "register" && (
            <div className="space-y-1.5">
              <label className="text-xs font-medium" style={{ color: "var(--skin-ink-soft)" }}>
                Confirm password
              </label>
              <input
                type="password"
                required
                className="x-input"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                autoComplete="new-password"
              />
            </div>
          )}

          {formError && (
            <p className="text-sm" style={{ color: "var(--danger)" }}>
              {formError}
            </p>
          )}

          <button type="submit" className="x-btn-primary w-full" disabled={submitting}>
            {submitting ? (mode === "register" ? "Creating account…" : "Signing in…") : mode === "register" ? "Create account" : "Sign in"}
          </button>
        </form>

        <div className="mt-4 text-center text-sm" style={{ color: "var(--skin-ink-soft)" }}>
          {mode === "signin" ? (
            <>
              Don&apos;t have an account?{" "}
              <button type="button" onClick={toggleMode} className="font-medium underline" style={{ color: "var(--skin-accent)" }}>
                Register
              </button>
            </>
          ) : (
            <>
              Already have an account?{" "}
              <button type="button" onClick={toggleMode} className="font-medium underline" style={{ color: "var(--skin-accent)" }}>
                Sign in
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
