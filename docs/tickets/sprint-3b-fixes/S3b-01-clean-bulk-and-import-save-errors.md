# S3b-01 — Show clean messages for bulk and import save errors

**Finding:** L1  
**Depends on:** none  
**Size:** XS

## Goal
When the server rejects an Add several or CSV import save, the message names the row and says what's wrong, without an internal field name.

## Context
- Today a server 400 can read "Row 1: subjectId: every id must be one of your active subjects." `saveError` only strips a leading `field: ` with no spaces, so the field name survives after the row prefix.
- S3a-04 rewrites "Assignment N:" to "Row N:"; S3a-06 rewrites it to the row's title.

## Steps
1. After the row prefix is rewritten, strip a following `fieldName: ` (a single identifier and colon) the same way `saveError` does for single forms.
2. Use one helper for both Add several and Import.

## Done when
- The example above reads "Row 1: every id must be one of your active subjects." (and the title form for Import).
- Single-form messages are unchanged.

## Tests
- Web: a mocked 400 with "Assignment 1: subjectId: …" shows "Row 1: …" in Add several and "<title>: …" in Import, with no `subjectId`.

## Out of scope
- Rewording the API's messages.
