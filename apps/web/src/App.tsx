import { ENGINE_VERSION, planChild, type Assignment } from "@hh/engine";

// Placeholder shell. Real screens (timeline, This Week) wait for the pilot results.
const sample: Assignment = {
  id: "sample",
  childIds: ["frank"],
  subjectId: "lit",
  title: "Treasure Island",
  unitType: "pages",
  totalUnits: 270,
  start: "2026-10-19",
  end: "2026-11-06",
};

export function App() {
  const p = planChild(sample, "frank", { calendar: { weekStart: "mon", schoolDays: [1, 2, 3, 4, 5] } });
  return (
    <main style={{ fontFamily: "system-ui, sans-serif", padding: 24, maxWidth: 640, margin: "0 auto" }}>
      <h1>Homeschool Hub</h1>
      <p>Placeholder shell. Engine v{ENGINE_VERSION}.</p>
      <p>
        Sample: {sample.title}, {sample.totalUnits} pages from {sample.start} to {sample.end} = {p.rate.toFixed(1)} pages per school day
        (about {Math.round(p.rate * p.minutesPerUnit)} min{p.minutesPerUnitEstimated ? ", estimated" : ""}).
      </p>
    </main>
  );
}
