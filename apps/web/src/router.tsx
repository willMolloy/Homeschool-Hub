import { createBrowserRouter, Outlet, type RouteObject } from "react-router-dom";
import { FamilySettingsPage } from "./features/schedule/FamilySettingsPage";
import { ScheduleHub, SchedulePlaceholder } from "./features/schedule/ScheduleHub";
import { AuthProvider, useAuth } from "./auth/AuthProvider";
import { RequireAuth } from "./auth/RequireAuth";
import { SignedInShell } from "./layout/SignedInShell";
import { KidsPage } from "./routes/KidsPage";
import { LoginPage } from "./routes/LoginPage";
import { NotFoundPage } from "./routes/NotFoundPage";
import { PlanPage } from "./routes/PlanPage";
import { SubjectsPage } from "./routes/SubjectsPage";

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
          { path: "/", element: <PlanPage /> },
          { path: "/kids", element: <KidsPage /> },
          { path: "/subjects", element: <SubjectsPage /> },
          { path: "/schedule", element: <ScheduleHub /> },
          { path: "/schedule/assignments", element: <SchedulePlaceholder title="Assignments" /> },
          { path: "/schedule/days-off", element: <SchedulePlaceholder title="Days off" /> },
          { path: "/schedule/events", element: <SchedulePlaceholder title="Events" /> },
          { path: "/schedule/settings", element: <FamilySettingsPage /> },
        ],
      },
      { path: "*", element: <NotFoundPage /> },
    ],
  },
];

export const createRouter = () => createBrowserRouter(routes);
