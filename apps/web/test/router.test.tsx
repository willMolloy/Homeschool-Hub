import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { renderAt } from "./render";

describe("routes", () => {
  it("/kids shows Kids", async () => {
    renderAt("/kids");
    expect(await screen.findByRole("heading", { name: "Kids" })).toBeInTheDocument();
  });
  it.each([["/login", "Login"], ["/", "Plan"], ["/subjects", "Subjects"]])("%s shows %s", async (path, name) => {
    renderAt(path);
    expect(await screen.findByRole("heading", { name })).toBeInTheDocument();
  });
  it("unknown URL shows the 404 page", async () => {
    renderAt("/nope/deeper");
    expect(await screen.findByRole("heading", { name: "Page not found" })).toBeInTheDocument();
  });
});
