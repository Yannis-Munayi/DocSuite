"use client";

import { useState, useTransition } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";

export default function LoginPage() {
  const [tab, setTab] = useState<"login" | "register">("login");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") ?? "/";

  const handleLogin = () => {
    setError("");
    startTransition(async () => {
      const result = await signIn("credentials", {
        username,
        password,
        redirect: false,
      });
      if (result?.error) {
        setError("Invalid username or password.");
      } else {
        router.push(callbackUrl);
        router.refresh();
      }
    });
  };

  const handleRegister = () => {
    setError("");
    if (!username.trim() || !password.trim()) {
      setError("Username and password are required.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    startTransition(async () => {
      const res = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: username.trim(), password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Registration failed.");
        return;
      }
      // Auto-login after register
      const result = await signIn("credentials", {
        username: username.trim(),
        password,
        redirect: false,
      });
      if (result?.error) {
        setError("Registered but could not sign in. Please log in.");
        setTab("login");
      } else {
        router.push(callbackUrl);
        router.refresh();
      }
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") tab === "login" ? handleLogin() : handleRegister();
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-gray-50 to-brand-50 px-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">DocSuite</h1>
          <p className="mt-1 text-sm text-gray-500">AI-powered document agents</p>
        </div>

        {/* Card */}
        <div className="rounded-2xl bg-white p-8 shadow-sm ring-1 ring-gray-200">
          {/* Tabs */}
          <div className="mb-6 flex rounded-xl bg-gray-100 p-1">
            {(["login", "register"] as const).map((t) => (
              <button
                key={t}
                onClick={() => { setTab(t); setError(""); }}
                className={`flex-1 rounded-lg py-1.5 text-sm font-medium transition-all ${
                  tab === t
                    ? "bg-white text-gray-900 shadow-sm"
                    : "text-gray-500 hover:text-gray-700"
                }`}
              >
                {t === "login" ? "Sign In" : "Register"}
              </button>
            ))}
          </div>

          {/* Fields */}
          <div className="space-y-4">
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-600">
                Username
              </label>
              <input
                type="text"
                autoComplete="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Enter username"
                className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-100"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-gray-600">
                Password
              </label>
              <input
                type="password"
                autoComplete={tab === "login" ? "current-password" : "new-password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Enter password"
                className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-100"
              />
            </div>

            {tab === "register" && (
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-600">
                  Confirm Password
                </label>
                <input
                  type="password"
                  autoComplete="new-password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Confirm password"
                  className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-100"
                />
              </div>
            )}

            {error && (
              <p className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600">
                {error}
              </p>
            )}

            <button
              onClick={tab === "login" ? handleLogin : handleRegister}
              disabled={isPending}
              className="w-full rounded-xl bg-brand-600 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-700 disabled:opacity-50"
            >
              {isPending
                ? "Please wait…"
                : tab === "login"
                ? "Sign In"
                : "Create Account"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
