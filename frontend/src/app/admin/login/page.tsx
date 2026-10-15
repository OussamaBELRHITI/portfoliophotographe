"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { EyeIcon, EyeOffIcon } from "@/components/admin/icons";
import { Alert, Button, Input } from "@/components/admin/ui";
import { ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { useSiteName } from "@/lib/useSiteName";

export default function LoginPage() {
  const { login, token, ready } = useAuth();
  const siteName = useSiteName();
  const router = useRouter();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // Already signed in? Skip the form.
  useEffect(() => {
    if (ready && token) router.replace("/admin");
  }, [ready, token, router]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      await login(username, password);
      router.replace("/admin");
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.status === 401
            ? "Wrong username or password."
            : err.message
          : "Could not reach the server. Please try again in a moment.",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-ink px-4 py-12">
      {/* Soft warm glow so the card isn't floating in flat black. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-40 left-1/2 h-120 w-120 -translate-x-1/2 rounded-full bg-accent/10 blur-3xl"
      />

      <div className="relative w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-accent text-lg font-bold text-ink shadow-lg shadow-accent/20">
            {siteName.trim().charAt(0).toUpperCase()}
          </div>
          <h1 className="mt-5 text-xl font-semibold tracking-tight">Sign in to your dashboard</h1>
          <p className="mt-1.5 text-sm text-fg-muted">{siteName}</p>
        </div>

        <form
          onSubmit={onSubmit}
          className="space-y-5 rounded-2xl border border-line bg-surface p-7 shadow-2xl shadow-black/60"
        >
          {error && <Alert kind="error">{error}</Alert>}

          <Input
            label="Username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            autoComplete="username"
            autoFocus
            required
          />

          <div className="relative">
            <Input
              label="Password"
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              required
              className="pr-11"
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              aria-label={showPassword ? "Hide password" : "Show password"}
              className="absolute right-2 bottom-1.5 rounded-md p-1.5 text-fg-subtle transition-colors hover:text-fg"
            >
              {showPassword ? <EyeOffIcon size={17} /> : <EyeIcon size={17} />}
            </button>
          </div>

          <Button type="submit" disabled={busy} className="w-full">
            {busy ? "Signing in…" : "Sign in"}
          </Button>
        </form>

        <p className="mt-6 text-center text-sm">
          <Link href="/" className="text-fg-subtle transition-colors hover:text-accent">
            ← Back to website
          </Link>
        </p>
      </div>
    </div>
  );
}
