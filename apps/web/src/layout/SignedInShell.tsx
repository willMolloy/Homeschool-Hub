import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth, useMe } from "../auth/AuthProvider";
import { AppShell } from "./AppShell";
import { UndoBar } from "../features/undo/UndoBar";
import { UndoProvider, useUndo } from "../features/undo/UndoProvider";
import { EngineFooter, EngineMismatchBanner, useApiEngineVersion } from "./EngineVersion";

/** The app shell filled in with the signed-in family and a Sign out button, and S6-08's undo bar. */
export function SignedInShell() {
  return (
    <UndoProvider>
      <Shell />
    </UndoProvider>
  );
}

function Shell() {
  const me = useMe();
  const { signOut } = useAuth();
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const apiEngineVersion = useApiEngineVersion();
  const { round } = useUndo();

  async function onSignOut() {
    setBusy(true);
    await signOut();
    navigate("/login", { replace: true });
  }

  return (
    <AppShell
      familyName={me.name}
      headerActions={<button type="button" onClick={() => void onSignOut()} disabled={busy}>Sign out</button>}
      banner={<><EngineMismatchBanner apiVersion={apiEngineVersion} /><UndoBar /></>}
      contentKey={round}
      footer={<EngineFooter />}
    />
  );
}
