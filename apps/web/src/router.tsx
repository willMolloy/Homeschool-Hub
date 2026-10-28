import { createBrowserRouter, type RouteObject } from "react-router-dom";
import { AppShell } from "./layout/AppShell";
import { KidsPage } from "./routes/KidsPage";
import { LoginPage } from "./routes/LoginPage";
import { NotFoundPage } from "./routes/NotFoundPage";
import { PlanPage } from "./routes/PlanPage";
import { SubjectsPage } from "./routes/SubjectsPage";

/** Route table, shared by the browser router and tests (createMemoryRouter). */
export const routes: RouteObject[] = [
  { path: "/login", element: <LoginPage /> },
  {
    element: <AppShell />,
    children: [
      { path: "/", element: <PlanPage /> },
      { path: "/kids", element: <KidsPage /> },
      { path: "/subjects", element: <SubjectsPage /> },
    ],
  },
  { path: "*", element: <NotFoundPage /> },
];

export const createRouter = () => createBrowserRouter(routes);
