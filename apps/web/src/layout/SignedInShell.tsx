import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth, useMe } from "../auth/AuthProvider";
import { AppShell } from "./AppShell";

/** The app shell filled in with the signed-in family and a Sign out button. */
export function SignedInShell() {
  const me = useMe();
  const { signOut } = useAuth();
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);

  async function onSignOut() {
    setBusy(true);
    await signOut();
    navigate("/login", { replace: true });
  }

  return (
    <AppShell
      familyName={me.name}
      headerActions={<button type="button" onClick={() => void onSignOut()} disabled={busy}>Sign out</button>}
    />
  );
}
