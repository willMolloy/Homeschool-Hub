import type { FastifyInstance } from "fastify";

type Cookies = { hh_session: string };

/** Create a child and a subject through the API; returns their ids. */
export async function rosterFor(app: FastifyInstance, cookies: Cookies, kids: string[] = ["Kid"], subjects: string[] = ["Math"]) {
  const childIds: string[] = [];
  const subjectIds: string[] = [];
  for (const name of kids) childIds.push((await app.inject({ method: "POST", url: "/api/children", payload: { name }, cookies })).json().id);
  for (const name of subjects) subjectIds.push((await app.inject({ method: "POST", url: "/api/subjects", payload: { name }, cookies })).json().id);
  return { childIds, subjectIds };
}

export const inject = (app: FastifyInstance, cookies: Cookies | null) =>
  (method: "GET" | "POST" | "PATCH" | "DELETE", url: string, payload?: unknown) =>
    app.inject({ method, url, ...(payload !== undefined ? { payload: payload as object } : {}), ...(cookies ? { cookies } : {}) });
