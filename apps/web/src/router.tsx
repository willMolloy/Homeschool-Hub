import { createBrowserRouter, Navigate, Outlet, useLocation, type RouteObject } from "react-router-dom";
import { AssignmentsPage } from "./features/schedule/AssignmentsPage";
import { DaysOffPage } from "./features/schedule/DaysOffPage";
import { EventsPage } from "./features/schedule/EventsPage";
import { FamilySettingsPage } from "./features/schedule/FamilySettingsPage";
import { SchedulePage } from "./features/schedule/SchedulePage";
import { SetupPage } from "./features/setup/SetupPage";
import { HomePage } from "./features/home/HomePage";
import { AuthProvider, useAuth } from "./auth/AuthProvider";
import { RequireAuth } from "./auth/RequireAuth";
import { SignedInShell } from "./layout/SignedInShell";
import { REDIRECTS } from "./layout/nav";
import { KidsPage } from "./routes/KidsPage";
import { LoginPage } from "./routes/LoginPage";
import { NotFoundPage } from "./routes/NotFoundPage";
import { SubjectsPage } from "./routes/SubjectsPage";
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
  return <LoginPage onLoggedIn={refresh} />;
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
      {
        element: (
          <RequireAuth>
            <SignedInShell />
          </RequireAuth>
        ),
        children: [
          { path: "/", element: <HomePage /> },
          { path: "/schedule", element: <SchedulePage /> },
          { path: "/records", element: <RecordsPage /> },
          { path: "/setup", element: <SetupPage /> },
          { path: "/setup/children", element: <KidsPage /> },
          { path: "/setup/subjects", element: <SubjectsPage /> },
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
