import { createBrowserRouter, Outlet, type RouteObject } from "react-router-dom";
import { AssignmentsPage } from "./features/schedule/AssignmentsPage";
import { DaysOffPage } from "./features/schedule/DaysOffPage";
import { EventsPage } from "./features/schedule/EventsPage";
import { FamilySettingsPage } from "./features/schedule/FamilySettingsPage";
import { ScheduleHub } from "./features/schedule/ScheduleHub";
import { AuthProvider, useAuth } from "./auth/AuthProvider";
import { RequireAuth } from "./auth/RequireAuth";
import { SignedInShell } from "./layout/SignedInShell";
import { KidsPage } from "./routes/KidsPage";
import { LoginPage } from "./routes/LoginPage";
import { NotFoundPage } from "./routes/NotFoundPage";
import { PlanPage } from "./routes/PlanPage";
import { SubjectsPage } from "./routes/SubjectsPage";
import { TimelinePage } from "./routes/TimelinePage";

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
          { path: "/timeline", element: <TimelinePage /> },
          { path: "/kids", element: <KidsPage /> },
          { path: "/subjects", element: <SubjectsPage /> },
          { path: "/schedule", element: <ScheduleHub /> },
          { path: "/schedule/assignments", element: <AssignmentsPage /> },
          { path: "/schedule/days-off", element: <DaysOffPage /> },
          { path: "/schedule/events", element: <EventsPage /> },
          { path: "/schedule/settings", element: <FamilySettingsPage /> },
        ],
      },
      { path: "*", element: <NotFoundPage /> },
    ],
  },
];

export const createRouter = () => createBrowserRouter(routes);
