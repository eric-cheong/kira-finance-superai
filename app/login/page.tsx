"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import styles from "./login.module.css";

const REMEMBER_KEY = "kira-remembered-login";

function KiraMark() {
  return (
    <svg viewBox="0 0 32 32" fill="none" aria-hidden="true">
      <path d="M7 5h5.2v22H7V5Z" fill="currentColor" opacity="0.92" />
      <path d="M13.9 16 25.4 5h-7.1L8.7 14.2 13.9 16Z" fill="currentColor" opacity="0.78" />
      <path d="m14.1 16.2 11.6 10.8h-7.3L9 18.1l5.1-1.9Z" fill="currentColor" />
    </svg>
  );
}

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [login, setLogin] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(false);
  const [pending, setPending] = useState(false);
  const [status, setStatus] = useState<{ kind: "error" | "ok"; message: string } | null>(null);

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(REMEMBER_KEY);
      if (saved) {
        setLogin(saved);
        setRemember(true);
      }
    } catch {
      // Storage unavailable; skip prefill.
    }
  }, []);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    if (!login.trim()) {
      setStatus({ kind: "error", message: "Enter your email or username to continue." });
      return;
    }
    if (!password) {
      setStatus({ kind: "error", message: "Enter your password to continue." });
      return;
    }

    setPending(true);
    setStatus(null);
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ login: login.trim(), password }),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok || payload?.ok === false) {
        setStatus({
          kind: "error",
          message: payload?.error?.message ?? "Sign-in failed. Try 123 for username and 123 for password.",
        });
        return;
      }

      try {
        if (remember) window.localStorage.setItem(REMEMBER_KEY, login.trim());
        else window.localStorage.removeItem(REMEMBER_KEY);
      } catch {
        // Storage unavailable; ignore.
      }

      const name = payload?.data?.user?.name;
      setStatus({ kind: "ok", message: name ? `Signed in as ${name}.` : "Signed in." });
      const from = searchParams?.get("from");
      router.replace(from && from.startsWith("/") ? from : "/");
      router.refresh();
    } catch {
      setStatus({ kind: "error", message: "Network error. Is the server running?" });
    } finally {
      setPending(false);
    }
  }

  return (
    <main className={styles.page}>
      <section className={styles.shell} aria-label="Kira account login">
        <div className={styles.card}>
          <header>
            <div className={styles.logoRow}>
              <span className={styles.mark}>
                <KiraMark />
              </span>
              <h1 className={styles.title}>Kira</h1>
            </div>
            <p className={styles.subtitle}>
              AI assistant for <span>finance operating intelligence.</span>
            </p>
          </header>

          <form onSubmit={onSubmit} noValidate>
            <div className={styles.field}>
              <label htmlFor="login">Email or username</label>
              <div className={styles.inputWrap}>
                <svg className={styles.fieldIcon} viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path d="M4.75 6.75h14.5v10.5H4.75V6.75Z" stroke="currentColor" strokeWidth="1.8" />
                  <path d="m5.25 7.25 6.75 5.2 6.75-5.2" stroke="currentColor" strokeWidth="1.8" />
                </svg>
                <input
                  id="login"
                  className={styles.input}
                  name="login"
                  type="text"
                  autoComplete="username"
                  placeholder="you@company.com or 123"
                  value={login}
                  onChange={(event) => setLogin(event.target.value)}
                  required
                />
              </div>
            </div>

            <div className={styles.field}>
              <label htmlFor="password">Password</label>
              <div className={styles.inputWrap}>
                <svg className={styles.fieldIcon} viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path d="M7.75 10.75V8.8a4.25 4.25 0 0 1 8.5 0v1.95" stroke="currentColor" strokeWidth="1.8" />
                  <path d="M6.25 10.75h11.5v8.5H6.25v-8.5Z" stroke="currentColor" strokeWidth="1.8" />
                  <path d="M12 14.3v2.3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                </svg>
                <input
                  id="password"
                  className={styles.input}
                  name="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  required
                />
                <button
                  type="button"
                  className={styles.iconButton}
                  onClick={() => setShowPassword((value) => !value)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  aria-pressed={showPassword}
                >
                  {showPassword ? (
                    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                      <path d="M4 4.5 20 19.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                      <path d="M3.75 12s2.75-5.25 8.25-5.25c1.36 0 2.58.32 3.65.82M20.25 12s-2.75 5.25-8.25 5.25c-1.36 0-2.58-.32-3.65-.82" stroke="currentColor" strokeWidth="1.8" />
                    </svg>
                  ) : (
                    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                      <path d="M3.75 12s2.75-5.25 8.25-5.25S20.25 12 20.25 12 17.5 17.25 12 17.25 3.75 12 3.75 12Z" stroke="currentColor" strokeWidth="1.8" />
                      <path d="M12 14.75a2.75 2.75 0 1 0 0-5.5 2.75 2.75 0 0 0 0 5.5Z" stroke="currentColor" strokeWidth="1.8" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            <div className={styles.optionRow}>
              <label className={styles.remember} htmlFor="remember">
                <input
                  id="remember"
                  name="remember"
                  type="checkbox"
                  checked={remember}
                  onChange={(event) => setRemember(event.target.checked)}
                />
                <span className={styles.checkbox} aria-hidden="true">
                  <svg viewBox="0 0 16 16" fill="none">
                    <path d="m3.5 8.15 2.7 2.7 6.3-6.7" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </span>
                <span>Remember me</span>
              </label>
            </div>

            <p
              className={`${styles.status} ${status ? (status.kind === "error" ? styles.statusError : styles.statusOk) : ""}`}
              aria-live="polite"
            >
              {status ? `${status.kind === "error" ? "Error: " : ""}${status.message}` : ""}
            </p>

            <button className={styles.submit} type="submit" disabled={pending}>
              <span>{pending ? "Signing in…" : "Log In"}</span>
              {!pending && (
                <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path d="M5 12h13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                  <path d="m13 6 6 6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              )}
            </button>
          </form>

          <div className={styles.demoNote}>
            <p>Demo workspace — use 123 / 123, or sign in as a seeded teammate (any password):</p>
            <ul className={styles.demoList}>
              {["123", "amir@kiraroasters.my", "meiling@kiraroasters.my", "devi.menon@crowe.my"].map((account) => (
                <li key={account}>
                  <button
                    type="button"
                    className={styles.demoChip}
                    onClick={() => {
                      setLogin(account);
                      setPassword(account === "123" ? "123" : "demo-pass");
                      setStatus(null);
                    }}
                  >
                    {account}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <aside className={styles.sidePanel} aria-label="About Kira">
          <div className={styles.sideHeading}>
            <span className={styles.mark}>
              <KiraMark />
            </span>
            <span>Kira</span>
          </div>
          <p>
            Fast access to approval-gated workflows, intelligence briefings, and operating visibility across finance
            teams.
          </p>
          <ul className={styles.trustList}>
            <li>
              <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path d="M5 12.5 9.2 16.7 19 6.8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              Built for desktop and mobile
            </li>
            <li>
              <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path d="M12 3.75 18.25 6v5.4c0 4.1-2.55 7.25-6.25 8.85-3.7-1.6-6.25-4.75-6.25-8.85V6L12 3.75Z" stroke="currentColor" strokeWidth="1.8" />
              </svg>
              Every action is approval-gated and audit-logged
            </li>
          </ul>
        </aside>
      </section>
    </main>
  );
}
