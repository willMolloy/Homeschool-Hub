# S9-06 — Fall and Spring can be renamed and re-dated

**Source:** Will, 2026-11-01 ("Fall/spring default but can be customized. User can pick a name for the time preset and a start/end date")  
**Depends on:** S9-04  
**Size:** S

## Goal
Fall and Spring stay the default term views, but a parent can rename them and set their own first and last day (custom views already exist, S7-05).

## Steps
1. In Edit zoom views, Fall and Spring get a name and dates (defaulting to today's halves), alongside show/hide.
2. Stored with the family's zoom views; Records uses the same views as its date ranges (S9-07).

## Done when
- A parent renames Fall to "Term 1" with Aug 17 – Dec 18; the zoom row and Records both show "Term 1" with those dates.

## Tests
- Web/API: rename and re-date a built-in; reset to default.
