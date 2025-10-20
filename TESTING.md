# Testing Guide

DialogDrive follows a layered test strategy aimed at fast feedback during development and targeted reassurance from end-to-end smoke runs.

## Overview

- **Unit / integration (Vitest + jsdom)**
  Runs with `npm run test:unit`. Covers pure utilities, Zustand stores, schema validation, and the background message router. Shared setup lives in `tests/setupTests.ts`, which seeds deterministic randomness, blocks real network calls, and installs a browser API stub.
- **Component/UI (Testing Library)**
  Co-located under `tests/unit` with the rest of the Vitest suite. These lean on jsdom to exercise popup/overlay components plus store wiring; prefer semantic selectors (`getByRole`, `getByLabelText`) for resilience.
- **Playwright smoke (@smoke)**
  `npm run test:e2e:smoke` drives the built extension inside Chromium: popup CRUD + axe validation, floating-save overlay, and the baseline text cleaner flow. The suite is intentionally small; add new scenarios only when behaviour truly requires a browser context.

## Running Locally

```bash
npm install          # once
npm run lint         # types, eslint, prettier checks
npm run test:unit    # Vitest + coverage artefacts in reports/
npm run build        # extension bundle (reused by e2e)
DD_SKIP_REBUILD=1 npm run test:e2e:smoke
```

## Writing Tests

- **Prefer lower layers:** reach for Vitest before E2E. When an existing Playwright case can be expressed as a deterministic unit test, migrate it downward.
- **Selectors:** stick to [`getByRole`/`getByLabel`/`getByTestId`] across Vitest + Playwright. Avoid brittle `nth-child` or text substring selectors unless no alternative exists.
- **Snapshots:** avoid broad snapshots of rendered markup. Instead, assert targeted behaviour (text, aria attributes, state). If a snapshot is unavoidable, keep it tightly scoped and checked into `tests/__snapshots__`.
- **Network / timers:** the Vitest harness blocks outbound network calls and uses fake timers by default. Provide explicit mocks (`global.fetch = vi.fn().mockResolvedValue(...)`) or switch back to real timers only within the specific test scope.
- **Background handler:** prefer calling `handleBackgroundMessage` directly with stubbed dependencies instead of wiring a full `browser.runtime` environment.

## Playwright Notes

- Tests rely on `tests/e2e/global-setup.ts` to build once and reuse the output. Set `DD_SKIP_REBUILD=1` when running repeatedly to skip redundant builds.
- Floating-save coverage intercepts `https://chatgpt.com/*` requests and serves a local HTML fixture so no external network access is required.
- Accessibility checks use `@axe-core/playwright`. If a failure occurs, capture the resulting violation list in the PR discussion and explain remediation plans.

## Tooling & Reporting

- Coverage reports (lcov/json/text) emit to `reports/coverage`. Upload the `lcov.info` to Codecov or a similar service if you want historical tracking.
- Vitest emits JUnit XML to `reports/vitest-junit.xml` for CI integration.
- Playwright artifacts are stored in `playwright-report/` and `test-results/`; CI uploads both on failure for later inspection.

## Future Enhancements

- When the Azure sync client lands, introduce MSW-powered integration tests alongside the Vitest suite; treat Postman collections or pytest contract checks as optional external layers.
- Consider a nightly CI job that runs the full Playwright matrix while keeping the PR gate limited to lint + unit + smoke.
