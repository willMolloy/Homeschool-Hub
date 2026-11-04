import { createBrowserRouter, Navigate, Outlet, useLocation, type RouteObject } from "react-router-dom";
import { AssignmentsPage } from "./features/schedule/AssignmentsPage";
import { DaysOffPage } from "./features/schedule/DaysOffPage";
import { EventsPage } from "./features/schedule/EventsPage";
import { FamilySettingsPage } from "./features/schedule/FamilySettingsPage";
import { SchedulePage } from "./features/schedule/SchedulePage";
import { SetupPage } from "./features/setup/SetupPage";
import { SchoolYearPage } from "./features/setup/SchoolYearPage";
import { HomePage } from "./features/home/HomePage";
import { WelcomePage } from "./features/welcome/WelcomePage";
import { clearSetupLater, setupLaterThisSession } from "./features/welcome/setupLater";
import { AuthProvider, useAuth, useMe } from "./auth/AuthProvider";
import { RequireAuth } from "./auth/RequireAuth";
import { SignedInShell } from "./layout/SignedInShell";
import { REDIRECTS } from "./layout/nav";
import { KidsPage } from "./routes/KidsPage";
import { LoginPage } from "./routes/LoginPage";
import { NotFoundPage } from "./routes/NotFoundPage";
import { SubjectsPage } from "./routes/SubjectsPage";
import { PrintDayPage, PrintWeekPage } from "./features/print/PrintPage";
import { RecordsPage } from "./features/records/RecordsPage";

function Root() {
  return (
    <AuthProvider>
      <Outlet />
    </AuthProvider>
  );
}

function LoginRoute() {
  const { refresh } = useAuth();
  // A new sign-in is a new chance to finish setting up: "Finish later" only lasted the last one (S11-01).
  return <LoginPage onLoggedIn={() => { clearSetupLater(); return refresh(); }} />;
}

/** S11-01: opening Home while the family has not finished setting up goes to the setup flow, at the step it reached,
 *  unless the parent chose "Finish later" in this sign-in. A family that has finished (and every family from before it) is never sent. */
function HomeRoute() {
  const me = useMe();
  if (me.setupDone === false && !setupLaterThisSession()) return <Navigate to="/welcome" replace />;
  return <HomePage />;
}

/** An old route's replacement (S8-04): the new path, with the old link's own query kept (`?child=`, `?week=`). */
function Redirect({ to }: { to: string }) {
  const { search } = useLocation();
  const [path, own = ""] = to.split("?");
  // The old link's own query is kept, but what the redirect says (view=year) wins over a stray `view=` of the old link.
  const merged = new URLSearchParams(search);
  new URLSearchParams(own).forEach((v, k) => merged.set(k, v));
  const query = merged.toString();
  return <Navigate to={query ? `${path}?${query}` : path!} replace />;
}

/** Route table, shared by the browser router and tests (createMemoryRouter). */
export const routes: RouteObject[] = [
  {
    element: <Root />,
    children: [
      { path: "/login", element: <LoginRoute /> },
      // S11-01: the setup flow is signed-in but outside the shell (no tab bar while setting up).
      { path: "/welcome", element: <RequireAuth><WelcomePage /></RequireAuth> },
      // S13-01: the print pages are signed-in but outside the shell (no bar or rail on the sheets).
      { path: "/print/week", element: <RequireAuth><PrintWeekPage /></RequireAuth> },
      { path: "/print/day", element: <RequireAuth><PrintDayPage /></RequireAuth> },
      {
        element: (
          <RequireAuth>
            <SignedInShell />
          </RequireAuth>
        ),
        children: [
          { path: "/", element: <HomeRoute /> },
          { path: "/schedule", element: <SchedulePage /> },
          { path: "/records", element: <RecordsPage /> },
          { path: "/setup", element: <SetupPage /> },
          { path: "/setup/children", element: <KidsPage /> },
          { path: "/setup/subjects", element: <SubjectsPage /> },
          { path: "/setup/school-year", element: <SchoolYearPage /> },
          { path: "/setup/assignments", element: <AssignmentsPage /> },
          { path: "/setup/days-off", element: <DaysOffPage /> },
          { path: "/setup/events", element: <EventsPage /> },
          { path: "/setup/settings", element: <FamilySettingsPage /> },
          ...REDIRECTS.map((r) => ({ path: r.from, element: <Redirect to={r.to} /> })),
          // The old Schedule hub's other addresses go Home (`/schedule` itself is the Schedule tab).
          { path: "/schedule/*", element: <Navigate to="/" replace /> },
        ],
      },
      { path: "*", element: <NotFoundPage /> },
    ],
  },
];

export const createRouter = () => createBrowserRouter(routes);
