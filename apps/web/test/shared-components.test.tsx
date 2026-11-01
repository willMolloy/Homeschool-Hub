// S8-03: the shared Soft Paper components.
import { readFileSync } from "node:fs";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import { Button, Card, Chip, Field, ListRow, Segmented, SelectField } from "../src/ui/components";

describe("Button", () => {
  it("is a primary fern pill by default, with secondary and quiet variants", () => {
    render(<><Button>Save</Button><Button variant="secondary">Cancel</Button><Button variant="quiet">Skip</Button></>);
    expect(screen.getByRole("button", { name: "Save" })).toHaveClass("btn");
    expect(screen.getByRole("button", { name: "Save" })).not.toHaveClass("btn-secondary");
    expect(screen.getByRole("button", { name: "Cancel" })).toHaveClass("btn", "btn-secondary");
    expect(screen.getByRole("button", { name: "Skip" })).toHaveClass("btn", "btn-quiet");
    expect(screen.getByRole("button", { name: "Save" })).toHaveAttribute("type", "button");
  });

  it("can be disabled and takes focus", async () => {
    const onClick = vi.fn();
    const user = userEvent.setup();
    render(<><Button disabled onClick={onClick}>Off</Button><Button onClick={onClick}>On</Button></>);
    await user.click(screen.getByRole("button", { name: "Off" }));
    expect(onClick).not.toHaveBeenCalled();
    await user.tab();
    expect(screen.getByRole("button", { name: "On" })).toHaveFocus();
    await user.keyboard("{Enter}");
    expect(onClick).toHaveBeenCalledTimes(1);
  });
});

describe("Chip", () => {
  it("exposes its selection as aria-pressed", async () => {
    const onClick = vi.fn();
    const user = userEvent.setup();
    render(<><Chip selected onClick={onClick}>Mon</Chip><Chip>Tue</Chip></>);
    expect(screen.getByRole("button", { name: "Mon" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "Tue" })).toHaveAttribute("aria-pressed", "false");
    await user.click(screen.getByRole("button", { name: "Mon" }));
    expect(onClick).toHaveBeenCalled();
  });
});

describe("Segmented", () => {
  it("marks the chosen option and reports a change", async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<Segmented label="Child" value="frank" onChange={onChange} options={[{ value: "frank", label: "Frank" }, { value: "margaret", label: "Margaret" }, { value: "both", label: "Both" }]} />);
    const group = screen.getByRole("group", { name: "Child" });
    expect(group).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Frank" })).toHaveAttribute("aria-pressed", "true");
    await user.click(screen.getByRole("button", { name: "Both" }));
    expect(onChange).toHaveBeenCalledWith("both");
  });
});

describe("ListRow", () => {
  it("is a link with a chevron, a button, or plain", async () => {
    const onClick = vi.fn();
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <ListRow to="/setup/children" title="Children" description="Who you teach" />
        <ListRow onClick={onClick} title="Import" />
        <ListRow title="Static" />
      </MemoryRouter>,
    );
    const link = screen.getByRole("link", { name: /Children/ });
    expect(link).toHaveAttribute("href", "/setup/children");
    expect(link).toHaveAccessibleName("Children Who you teach");
    expect(link.querySelector("svg")).not.toBeNull();
    await user.click(screen.getByRole("button", { name: "Import" }));
    expect(onClick).toHaveBeenCalled();
    expect(screen.getByText("Static").closest("a, button")).toBeNull();
  });
});

describe("Card and fields", () => {
  it("Card is the cream card class", () => {
    render(<Card data-testid="c">x</Card>);
    expect(screen.getByTestId("c")).toHaveClass("card");
  });

  it("Field labels its input, and wires the hint and error to it", () => {
    render(<Field label="Name" hint="As on the report" error="Name is required." />);
    const input = screen.getByLabelText("Name");
    expect(input).toHaveAttribute("aria-invalid", "true");
    expect(input).toHaveAccessibleDescription("Name is required. As on the report");
  });

  it("SelectField labels its select", () => {
    render(<SelectField label="Subject"><option>Math</option></SelectField>);
    expect(screen.getByLabelText("Subject")).toBeInTheDocument();
  });
});

describe("the shared stylesheet", () => {
  const forms = readFileSync("src/ui/forms.css", "utf8");
  const paper = readFileSync("src/ui/soft-paper.css", "utf8");
  it("buttons are pills at least 44 px high; chips, segments and rows are 44 px or more", () => {
    expect(forms).toMatch(/\.btn \{[^}]*border-radius: 999px/);
    expect(forms).toMatch(/\.btn \{[^}]*min-height: 44px/);
    expect(paper).toMatch(/\.chip \{[^}]*min-height: 44px/);
    expect(paper).toMatch(/\.segmented button \{[^}]*min-height: 44px/);
    expect(paper).toMatch(/\.list-row \{[^}]*min-height: 56px/);
  });
  it("cards are 14 px with a hairline and no shadow; no screen CSS holds a hard-coded white or grey any more", () => {
    expect(forms).toMatch(/\.card \{[^}]*var\(--tl-radius\)/);
    expect(forms).not.toMatch(/\.card \{[^}]*box-shadow/);
    for (const f of ["src/features/schedule/schedule.css", "src/features/roster/roster.css", "src/ui/forms.css", "src/features/checkin/checkin.css", "src/layout/app-shell.css"]) {
      expect(readFileSync(f, "utf8"), f).not.toMatch(/#(fff|b7c0cc|f3f5f8|e8ebf0)\b/i);
    }
  });
  it("the sheet has a grab handle on phones and uses the sheet shadow token", () => {
    expect(readFileSync("src/components/ui/ResponsiveSheet.tsx", "utf8")).toContain("sheet-grab");
    expect(readFileSync("src/components/ui/sheet.css", "utf8")).toContain("var(--tl-sheet-shadow)");
  });
});
