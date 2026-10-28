import { useState, type FormEvent } from "react";
import { useLocation, useNavigate, type Location } from "react-router-dom";
import { ApiError, apiPost } from "../api/client";
import type { LoginResponse } from "../api/types";
import "../ui/forms.css";
import "./login.css";

export interface LoginPageProps {
  /** Called after a successful login, before navigating (AuthProvider refreshes /api/me). */
  onLoggedIn?: () => Promise<void> | void;
}

function messageFor(e: unknown): string {
  if (e instanceof ApiError) {
    if (e.status === 401) return "Email or password is incorrect.";
    if (e.status === 429) return "Too many attempts, wait a minute.";
    if (e.status === 0) return "Can't reach the server.";
  }
  return "Something went wrong. Please try again.";
}

export function LoginPage({ onLoggedIn }: LoginPageProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const from = (location.state as { from?: Location } | null)?.from;
  const target = from && from.pathname !== "/login" ? `${from.pathname}${from.search ?? ""}${from.hash ?? ""}` : "/";

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (pending) return;
    setPending(true);
    setError(null);
    try {
      await apiPost<LoginResponse>("/api/auth/login", { email, password });
      await onLoggedIn?.();
      navigate(target, { replace: true });
    } catch (err) {
      setError(messageFor(err));
      setPending(false);
    }
  }

  return (
    <main className="login">
      <form className="card" onSubmit={submit} noValidate={false}>
        <p className="login-app">Homeschool Hub</p>
        <h1>Sign in</h1>
        {error ? <p className="form-error" role="alert">{error}</p> : null}
        <div className="field">
          <label htmlFor="login-email">Email</label>
          <input id="login-email" type="email" autoComplete="username" required value={email}
            onChange={(e) => setEmail(e.target.value)} />
        </div>
        <div className="field">
          <label htmlFor="login-password">Password</label>
          <input id="login-password" type="password" autoComplete="current-password" required value={password}
            onChange={(e) => setPassword(e.target.value)} />
        </div>
        <button className="btn" type="submit" disabled={pending}>{pending ? "Signing in…" : "Sign in"}</button>
      </form>
    </main>
  );
}
