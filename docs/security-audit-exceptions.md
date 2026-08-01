# Security audit exceptions

## React Router RSC advisory

Webownik uses React Router in client-only Declarative Mode (`BrowserRouter`, `Routes`, `Route`).
It does not use React Server Components, Framework Mode, server actions, SSR hydration, or any RSC
request handlers.

As of 2026-08-01, `npm audit` reports `GHSA-qwww-vcr4-c8h2` for React Router 7.18.2. The advisory
affects only RSC Mode action execution. There is no reachable affected feature in this application.
The suggested downgrade to 7.11.0 would reintroduce older navigation vulnerabilities fixed in
7.18.0, so the project intentionally stays on 7.18.2 until an upstream version outside the affected
RSC range is available.

Review this exception on every dependency update and remove it as soon as a patched release is
published. Application code must never pass user-controlled values to `navigate()` or React Router
`Link` destinations.
