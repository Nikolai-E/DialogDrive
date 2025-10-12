# DialogDrive License Compliance Report

**Verdict:** Safe to publish under PolyForm Noncommercial – **Yes** (no copyleft or share-alike obligations in the shipped bundle).  
**Blockers:** None identified.  
**Remediations:**  
- [ ] Add explicit CC-BY-4.0 attribution for `caniuse-lite` wherever notices accompany the PolyForm license.  
- [ ] Document ownership (or upstream license) for the DialogDrive icon set and marketing screenshots/videos before release.  
- [ ] Keep MPL-2.0 dev tooling (`fx-runner`, `web-ext-run`) strictly out of distributed artifacts.  
**Residual obligations:** Include MIT/Apache/ISC license notices, CC-BY attribution text, and retain this report (plus `THIRD_PARTY_NOTICES.md`) with release documentation.

## Risk Table

| Name | Version | License (SPDX) | Where used | Why needed | Risk | Required Actions / Attribution | Links |
| --- | --- | --- | --- | --- | --- | --- | --- |
| @radix-ui/react-checkbox | 1.3.2 | MIT | Extension popup & side panel UI | Accessible checkbox primitive | OK | Covered by MIT notice | https://www.npmjs.com/package/@radix-ui/react-checkbox |
| @radix-ui/react-label | 2.1.7 | MIT | Extension UI labels | Associates form fields with labels | OK | Covered by MIT notice | https://www.npmjs.com/package/@radix-ui/react-label |
| @radix-ui/react-slot | 1.2.3 | MIT | Extension UI composition | Slot helper for Radix components | OK | Covered by MIT notice | https://www.npmjs.com/package/@radix-ui/react-slot |
| @radix-ui/react-switch | 1.2.5 | MIT | Popup toggle controls | Switch component for feature flags | OK | Covered by MIT notice | https://www.npmjs.com/package/@radix-ui/react-switch |
| @tanstack/react-virtual | 3.13.12 | MIT | Prompt/library lists | Efficient list virtualization | OK | Covered by MIT notice | https://tanstack.com/virtual |
| class-variance-authority | 0.7.1 | Apache-2.0 | Styling helpers in UI bundle | Utility for Tailwind class composition | OK | Apache 2.0 text/notice captured in THIRD_PARTY_NOTICES.md | https://github.com/joe-bell/cva |
| clsx | 2.1.1 | MIT | UI conditional classes | Lightweight className combiner | OK | Covered by MIT notice | https://www.npmjs.com/package/clsx |
| framer-motion | 12.23.12 | MIT | Popup animations | Declarative animation library | OK | Covered by MIT notice | https://www.framer.com/motion/ |
| lucide-react | 0.417.0 | ISC | Icon rendering | React wrapper for Lucide icons | OK | ISC notice included (permissive) | https://lucide.dev |
| react | 18.3.1 | MIT | Core UI runtime | React framework | OK | Covered by MIT notice | https://react.dev |
| react-dom | 18.3.1 | MIT | UI rendering bridge | React DOM renderer | OK | Covered by MIT notice | https://react.dev |
| sonner | 1.7.4 | MIT | Toast notifications | Display transient alerts | OK | Covered by MIT notice | https://www.npmjs.com/package/sonner |
| tailwind-merge | 2.6.0 | MIT | Styling helpers | Tailwind class deduper | OK | Covered by MIT notice | https://github.com/dcastil/tailwind-merge |
| tailwindcss-animate | 1.0.7 | MIT | Styling helpers | Tailwind animation presets | OK | Covered by MIT notice | https://github.com/joe-bell/tailwindcss-animate |
| uuid | 11.1.0 | MIT | Storage identifiers | Generate unique IDs for data | OK | Covered by MIT notice | https://github.com/uuidjs/uuid |
| zod | 4.0.15 | MIT | Schema validation | Runtime validation for storage | OK | Covered by MIT notice | https://zod.dev |
| zustand | 5.0.7 | MIT | State management | Lightweight store for UI state | OK | Covered by MIT notice | https://github.com/pmndrs/zustand |
| caniuse-lite (transitive) | 1.0.30001731 | CC-BY-4.0 | Build pipeline via browserslist/tailwind | Browser compatibility data | REVIEW | Add CC-BY attribution in notices (see THIRD_PARTY_NOTICES.md) | https://github.com/browserslist/caniuse-lite |
| @playwright/test | 1.55.1 | Apache-2.0 | Dev/test tooling only | E2E test runner | OK | Keep Apache notice in dev docs; not shipped | https://playwright.dev |
| typescript | 5.9.2 | Apache-2.0 | Dev build tooling | TypeScript compiler | OK | Apache notice captured | https://www.typescriptlang.org/ |
| wxt | 0.20.7 | MIT | Build tooling | Extension bundler (Vite-based) | OK | Covered by MIT notice | https://wxt.dev |
| fx-runner | 1.4.0 | MPL-2.0 | Dev-only (Firefox runner) | Launches Firefox for testing | REVIEW | Ensure package stays dev-only; no modifications bundled | https://github.com/mozilla-extensions/fx-runner |
| web-ext-run | 0.2.3 | MPL-2.0 | Dev-only (Firefox helper) | Invokes `web-ext` under the hood | REVIEW | Keep out of release ZIP; provide source if modified (currently unmodified) | https://github.com/NikVv/web-ext-run |
| jszip | 3.10.1 | MIT OR GPL-3.0-or-later | Dev-only (packaging) | Creates ZIP artifacts (via tooling) | OK | Rely on MIT option; no GPL code distributed | https://stuk.github.io/jszip/ |
| node-forge | 1.3.1 | BSD-3-Clause OR GPL-2.0 | Dev-only (tooling dependency) | Cryptography helpers for tooling | OK | Use BSD-3-Clause option; no GPL obligations | https://github.com/digitalbazaar/forge |
| DialogDrive icon set | n/a | Proprietary (DialogDrive) | `public/icon/*.png`, `.output/.../icon/*.png` | Extension icons required by Chrome manifest | REVIEW | Document authorship or add explicit license grant before release | repo assets |
| Marketing screenshots | n/a | Proprietary (DialogDrive) | `website/assets/screenshot-*.png` | Promotional imagery | REVIEW | Confirm in-house capture; ensure no third-party content | repo assets |
| Marketing demo videos | n/a | Proprietary (DialogDrive) | `website/assets/*.mp4` | Product demo clips | REVIEW | Confirm in-house capture; retain originals for provenance | repo assets |
| Playwright Codicon font | n/a | MIT | `playwright-report/trace/codicon.DCmgc-ay.ttf` (test artifacts only) | Generated by Playwright reporter | OK | Exclude Playwright reports from release bundles to avoid accidental redistribution | https://github.com/microsoft/vscode-codicons |

## Additional observations

- **Bundling model:** `wxt` (Vite-based) statically bundles runtime dependencies into the extension. Because all shipped code is permissively licensed (MIT/ISC/Apache), bundling is compatible with PolyForm Noncommercial. Continue to avoid adding GPL/AGPL/LGPL dependencies, as they would become blockers once bundled.
- **Development-only packages:** `fx-runner` and `web-ext-run` are MPL-2.0, but remain outside the distributed Chrome package (`dist/` or `.output`). No modifications were detected; if you ever redistribute tooling binaries, include MPL notices and make modified sources available.
- **SPDX headers:** No `SPDX-License-Identifier` headers were found in project sources. This is optional, but adding a top-level license file (PolyForm Noncommercial once adopted) plus per-file headers for new files can help future audits.
- **Automated data collection:** `npm ls --all --json` succeeded (`reports/npm-tree.json`). Network restrictions blocked `cyclonedx-npm` and third-party license scanners; `reports/license-checker.json` (custom generated) captures equivalent metadata from installed packages.
- **Assets:** Only first-party imagery and videos ship with the extension/website. Playwright-generated assets stay in developer reports; ensure those directories are excluded from packaged builds.

## Packaging / distribution review

- Chrome extension builds (`wxt build` / `wxt zip`) package bundled code plus the `public/icon` assets. No `node_modules` or dev/test artifacts are copied, mitigating risk from MPL or GPL-optional tooling.
- The marketing site (`website/`) is static and references only first-party assets; confirm hosting complies with CC-BY attribution obligations (add credit in footer or notices page).
- No modified third-party files were detected. If you fork any MPL/Apache packages in future, document the changes and expected notice updates in `THIRD_PARTY_NOTICES.md`.

## Recommended follow-up

1. Add CC-BY-4.0 attribution (for `caniuse-lite`) to the README, marketing site footer, or extension about dialog.
2. Capture explicit provenance for the DialogDrive icon/screenshot/video assets (e.g., include a short statement in `THIRD_PARTY_NOTICES.md` or separate `ASSETS-INVENTORY.md` footnotes).
3. When migrating to PolyForm Noncommercial, add the PolyForm license file at repo root and reference it in package metadata.
