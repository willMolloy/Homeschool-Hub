/**
 * S15-03: the shell a viewer gets: the bar or rail holds Schedule and Records only, a "View only" label with the account's name sits
 * above the page, and an Account button opens the little menu (who is signed in, Switch to {other}, Leave, Sign out). No Home, Set up,
 * family menu, undo bar or needs-you dot exists here. Any address outside Schedule and Records goes to Schedule.
 */
import { useState } from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { useAuth, useMe } from "../auth/AuthProvider";
import { ResponsiveSheet } from "../components/ui/ResponsiveSheet";
import { AccountSwitcher } from "../features/account/AccountSwitcher";
import { Button } from "../ui/components";
import { AppShell } from "./AppShell";
import { EngineFooter } from "./EngineVersion";
import { VIEWER_TABS } from "./nav";
import "../features/view/view.css";

export const VIEWER_PATHS: readonly string[] = ["/schedule", "/records"];

export function ViewerShell() {
  const { pathname } = useLocation();
  const path = pathname.length > 1 ? pathname.replace(/\/+$/, "") : pathname;
  if (!VIEWER_PATHS.includes(path)) return <Navigate to="/schedule" replace />;
  return <AppShell tabs={VIEWER_TABS} banner={<ViewerBar />} footer={<EngineFooter />} />;
}

function ViewerBar() {
  const me = useMe();
  const { signOut } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  return (
    <header className="viewer-bar">
      <span className="viewer-badge">View only</span>
      <span className="viewer-name">{me.name}</span>
      <button type="button" className="viewer-menu-btn" aria-haspopup="dialog" onClick={() => setOpen(true)}>Account</button>
      <ResponsiveSheet open={open} onOpenChange={setOpen} title={me.name}>
        {me.parentName ? <p className="viewer-signed-in">Signed in as {me.parentName}</p> : null}
        <p className="viewer-note">View only: you can look at the Schedule and Records, and print or export them. Nothing here can be changed.</p>
        <AccountSwitcher onDone={() => setOpen(false)} />
        <div className="btn-row viewer-signout">
          <Button variant="secondary" disabled={busy} onClick={() => { setBusy(true); void signOut().then(() => navigate("/login", { replace: true })); }}>Sign out</Button>
        </div>
      </ResponsiveSheet>
    </header>
  );
}
