/**
 * S15-01: a view-only link (kind "viewer") makes the person a viewer of that family: a new login (name, email, password), or "I already have an
 * account" (sign in here, and the family joins the logins' accounts), or, when already signed in, one button for that login.
 * S14-02 / S14-03: the page behind an invite link, `/join/<token>`. A calm form (name, email, password) that makes the family's first
 * parent (a link from the command) or adds a parent to a family (a link from Family settings), then signs them in. A link that does
 * not work, for any reason, shows the one plain sentence from the API; the page never says why. The token is never shown, stored
 * or sent anywhere but this app's API.
 */
import { useEffect, useState, type FormEvent } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ApiError, apiGet, apiPost } from "../../api/client";
import { useAuth } from "../../auth/AuthProvider";
import { Field } from "../../ui/components";
import { THROTTLED } from "../schedule/formBits";
import "../../ui/forms.css";
import "../../routes/login.css";

export const INVITE_UNAVAILABLE = "This invite link has expired or was already used. Ask the person who sent it for a new one.";

interface Preview { kind: "new_family" | "parent" | "viewer"; familyName: string | null }
type Look = Preview | "loading" | "unavailable" | "error";

function messageFor(e: unknown): string {
  if (e instanceof ApiError) {
    if (e.status === 429) return THROTTLED;
    if (e.status === 0) return "Can't reach the server.";
    if ((e.status === 400 || e.status === 409) && e.message) return e.message;
  }
  return "Something went wrong. Please try again.";
}

export function JoinPage() {
  const { token = "" } = useParams();
  const navigate = useNavigate();
  const { me, refresh } = useAuth();
  const [mode, setMode] = useState<"new" | "signin">("new");
  const signedIn = typeof me === "object" && me !== null ? me : null;
  const [look, setLook] = useState<Look>("loading");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // The link is a secret in the address: no referrer leaves this page, and (S17-01, Sprint 15 N6) search engines are told not to index it.
  useEffect(() => {
    const metas = [["referrer", "no-referrer"], ["robots", "noindex, nofollow"]].map(([name, content]) => {
      const meta = document.createElement("meta");
      meta.name = name!;
      meta.content = content!;
      document.head.appendChild(meta);
      return meta;
    });
    return () => { metas.forEach((m) => m.remove()); };
  }, []);

  useEffect(() => {
    let live = true;
    apiGet<Preview>(`/api/join/${encodeURIComponent(token)}`)
      .then((p) => { if (live) setLook(p); })
      .catch((e) => { if (live) setLook(e instanceof ApiError && e.status === 404 ? "unavailable" : "error"); });
    return () => { live = false; };
  }, [token]);

  async function submit(e: FormEvent, body?: object) {
    e.preventDefault();
    if (pending || typeof look === "string") return;
    setPending(true);
    setError(null);
    try {
      await apiPost(`/api/join/${encodeURIComponent(token)}`, body ?? (mode === "signin" ? { existing: true, email, password } : { name, email, password }));
      await refresh();
      navigate("/", { replace: true }); // a new family lands in the setup flow (Home sends it); another parent lands Home
    } catch (err) {
      if (err instanceof ApiError && err.status === 404) setLook("unavailable");
      else if (err instanceof ApiError && err.status === 401 && err.code === "invalid_credentials") setError("Email or password is incorrect.");
      else setError(messageFor(err));
      setPending(false);
    }
  }

  if (look === "loading") return <main className="login"><div className="card"><p aria-busy="true">Loading…</p></div></main>;
  if (look === "unavailable") {
    return (
      <main className="login">
        <div className="card">
          <p className="login-app">Homeschool Hub</p>
          <h1>This link can&apos;t be used</h1>
          <p role="alert">{INVITE_UNAVAILABLE}</p>
          <p><Link to="/login">Sign in</Link></p>
        </div>
      </main>
    );
  }
  if (look === "error") {
    return (
      <main className="login">
        <div className="card">
          <p className="login-app">Homeschool Hub</p>
          <h1>Something went wrong</h1>
          <p role="alert">We couldn&apos;t check this link. Check your connection and try again.</p>
          <button className="btn" type="button" onClick={() => window.location.reload()}>Try again</button>
        </div>
      </main>
    );
  }

  if (look.kind === "viewer") {
    const family = look.familyName ?? "this account";
    const signin = mode === "signin";
    return (
      <main className="login">
        <form className="card" onSubmit={(e) => void submit(e, signedIn && mode === "new" ? { useSession: true } : undefined)}>
          <p className="login-app">Homeschool Hub</p>
          <h1>View {family}</h1>
          <p>You can look at the Schedule and Records for {family}, print and export them. You can&apos;t change anything.</p>
          {error ? <p className="form-error" role="alert">{error}</p> : null}
          {signedIn && !signin ? (
            <>
              <p>You are signed in as {signedIn.parentName ?? "yourself"}. {family} will be added to your accounts.</p>
              <button className="btn" type="submit" disabled={pending}>{pending ? "Joining…" : `Join as ${signedIn.parentName ?? "me"}`}</button>
              <p><button className="btn btn-quiet" type="button" onClick={() => setMode("signin")}>Use a different sign-in</button></p>
            </>
          ) : (
            <>
              {signin ? null : <Field label="Your name" type="text" autoComplete="name" required maxLength={100} value={name} onChange={(e) => setName(e.target.value)} />}
              <Field label="Email" type="email" autoComplete="username" required value={email} onChange={(e) => setEmail(e.target.value)} />
              <Field label="Password" type="password" autoComplete={signin ? "current-password" : "new-password"} required minLength={signin ? undefined : 8} hint={signin ? undefined : "At least 8 characters."} value={password} onChange={(e) => setPassword(e.target.value)} />
              <button className="btn" type="submit" disabled={pending}>{pending ? (signin ? "Joining…" : "Creating…") : signin ? "Sign in and join" : "Create my sign-in"}</button>
              <p><button className="btn btn-quiet" type="button" onClick={() => { setMode(signin ? "new" : "signin"); setError(null); }}>{signin ? "I'm new here" : "I already have an account"}</button></p>
            </>
          )}
        </form>
      </main>
    );
  }

  const joining = look.kind === "parent";
  return (
    <main className="login">
      <form className="card" onSubmit={submit}>
        <p className="login-app">Homeschool Hub</p>
        <h1>{joining ? `Join ${look.familyName ?? "your family"}` : "Welcome"}</h1>
        <p>{joining ? "Make your own sign-in. You will see the same family, with the same things." : "Make your sign-in, then we will set up your family together."}</p>
        {error ? <p className="form-error" role="alert">{error}</p> : null}
        <Field label="Your name" type="text" autoComplete="name" required maxLength={100} value={name} onChange={(e) => setName(e.target.value)} />
        <Field label="Email" type="email" autoComplete="username" required value={email} onChange={(e) => setEmail(e.target.value)} />
        <Field label="Password" type="password" autoComplete="new-password" required minLength={8} hint="At least 8 characters." value={password} onChange={(e) => setPassword(e.target.value)} />
        <button className="btn" type="submit" disabled={pending}>{pending ? "Creating…" : joining ? "Join" : "Create my sign-in"}</button>
        <p><Link to="/login">I already have a sign-in</Link></p>
      </form>
    </main>
  );
}
