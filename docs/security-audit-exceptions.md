# Security audit exceptions

## Tailwind CSS 3 build toolchain

As of 2026-10-08, `npm audit` reports high/moderate advisories in `braces`, `micromatch`,
`fast-glob`, `chokidar`, `postcss-nested` and `postcss-selector-parser`. All of them are pulled in
only by `tailwindcss@3` and run exclusively at build time on trusted source files from this
repository. None of them ship in the production bundle (`npm audit --omit=dev` reports 0
vulnerabilities, and CI enforces that).

The only offered fix is `tailwindcss@4`, a breaking migration (new config format, PostCSS plugin
and class changes). Plan it as a separate task and remove this exception afterwards.

## React Router RSC advisory (resolved)

`GHSA-qwww-vcr4-c8h2` (React Router RSC Mode) was previously accepted for React Router 7.18.2
because Webownik uses only client-side Declarative Mode. As of 2026-10-08 `npm audit` no longer
reports it. Application code must still never pass user-controlled values to `navigate()` or
React Router `Link` destinations.
