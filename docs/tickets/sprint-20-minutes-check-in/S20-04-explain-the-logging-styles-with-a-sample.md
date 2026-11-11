# S20-04 — Explain the logging styles with a sample

**Source:** DeeDee, 2026-11-11. **Depends on:** S20-05. **Size:** M

## Goal

Each logging style says what she is choosing, and a sample log updates as she turns options on or off.

## Context

Log setup offers styles whose subtitles mostly repeat the title. She wants to see what she will be asked to type. Books read is already gone (S20-05), so the sample does not grow a books line. The switches under the styles stay; they are how she adjusts a style.

## Steps

1. Each style has a plain explanation of what she will log, not a restatement of its name.
2. A sample log is on the same screen. It is a made-up day, not her real entries. Turning a style or a switch on or off changes the sample immediately.
3. **Default, not a blocker,** the explanations:
   - Hours by subject: "You write how long each subject took."
   - Core and non-core: "The same, with each subject marked core or not, and a total for each."
   - Days attended: "You mark which days counted as school. No hours."
   - Days and hours: "Which days counted, plus one total for the day."
   - Detailed: "Hours by subject, plus a note if you want one."
4. **Default, not a blocker:** the sample is a Tuesday for a child named Frank. Hours by subject shows Math 30 min and Reading 20 min. Core and non-core splits those. Days attended shows the day and "School day". Days and hours shows the day and 50 min. Detailed adds a one-line note. Switches add or remove those lines.
5. Saving still stores the switches, and changing them still keeps entries she has already logged.

## Done when

- Picking Days attended shows a sample with a school day and no hours.
- Turning on hours by subject changes that sample to subject lines.
- No style mentions books read.

## Tests

- Web: each style sets the switches it does today, the sample text changes with each style and with each switch, and the saved setup matches the switches. No books field and no books line in the sample.

## Out of scope

- Naming a state, or recommending a style for a state.
- The one-day versus several-days log form (S20-06). The sample can be a single day.
