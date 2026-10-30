# S5-04 — Add the bulk-create days off endpoint

**Source:** ROADMAP.md, "Calendar templates for the year's shape"  
**Depends on:** none  
**Size:** S

## Goal
`POST /api/blocked-ranges/bulk` creates up to 100 days off in one all-or-nothing transaction.

## Context
- Follow the bulk assignments endpoint (S3a-03): validate all first, errors name the item ("Day off 3: …"), one transaction, 201 with the created rows in order.

## Steps
1. Body `{ blockedRanges: <the create body>[] }`, 1 to 100 items, strict.
2. Share the single create's logic, as S3a-03 did.

## Done when
- Valid input creates all; one invalid item creates none; another family's child id fails the request.

## Tests
- API integration: 3 valid → 201 in order; one bad → 400 naming it and 0 created; foreign child → error, 0 created; 101 items → 400; unknown field → 400.

## Out of scope
- Bulk delete.
