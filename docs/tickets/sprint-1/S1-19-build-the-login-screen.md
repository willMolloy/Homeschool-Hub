# S1-19 — Build the login screen

**Depends on:** S1-17, S1-18, S1-12  
**Size:** S

## Goal
`/login` shows an email + password form that calls `POST /api/auth/login` and goes to `/` on success.

## Context
Single family login, no signup link (accounts are created with the CLI from S1-10).

## Steps
1. Form with labelled inputs (`type=email autocomplete=username`, `type=password autocomplete=current-password`) and a submit button.
2. Disable the button while submitting. On 401 show 'Email or password is incorrect.' On 429 show 'Too many attempts, wait a minute.' On network error show 'Can't reach the server.'
3. On success navigate to the page the user originally wanted (`location.state.from`) or `/`.
4. Works at 360 px; input font-size ≥ 16 px so iOS doesn't zoom.

## Done when
- [ ] Logging in with the demo account lands on Plan.

## Tests
- Render test with mocked api: success navigates; 401 shows the message; button disabled while pending

## Out of scope
- Forgot password.
- Signup.
