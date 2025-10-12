# Third-Party Notices – DialogDrive

DialogDrive bundles third-party libraries and tooling under the permissive licenses listed below. A machine-readable inventory of the current dependency tree is available at `reports/license-checker.json` (derived from the local `node_modules` state).

## Runtime libraries

- **MIT**: React (`react`, `react-dom`), Radix UI primitives (`@radix-ui/*`), Tailwind Merge (`tailwind-merge`), Tailwind Animations (`tailwindcss-animate`), Zustand (`zustand`), Zod (`zod`), Sonner (`sonner`), TanStack React Virtual (`@tanstack/react-virtual`), Framer Motion (`framer-motion`), Clsx (`clsx`), UUID (`uuid`), and numerous transitive utilities.
- **ISC**: `lucide-react`.
- **Apache-2.0**: `class-variance-authority`.
- **CC-BY-4.0**: `caniuse-lite`. Attribution: “caniuse-lite © 2014–present, the Can I Use project authors (https://caniuse.com), licensed under Creative Commons Attribution 4.0 International.”

## Tooling / dev-only dependencies

- **Apache-2.0**: `@playwright/test`, `typescript`.
- **MPL-2.0** (dev-only, not shipped): `fx-runner`, `web-ext-run`. No local modifications; retain license in tooling documentation if redistributed.
- **Dual-licensed libraries**: `jszip` (“MIT OR GPL-3.0-or-later”) and `node-forge` (“BSD-3-Clause OR GPL-2.0”). DialogDrive relies on the permissive option for internal build tooling; no GPL terms are triggered.

## Standard license texts

### MIT License

```
Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the “Software”), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED “AS IS”, WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

### Apache License 2.0

The full license text is available at https://www.apache.org/licenses/LICENSE-2.0. No additional NOTICE files are required by the referenced packages.

### Creative Commons Attribution 4.0 International (CC-BY-4.0)

The full license text is available at https://creativecommons.org/licenses/by/4.0/. Retain attribution (“caniuse-lite © 2014–present, the Can I Use project authors”) in shipped notices.

### Mozilla Public License 2.0 (dev tooling only)

The full license text is available at https://www.mozilla.org/MPL/2.0/. Provide source to any MPL-covered files if they are ever modified and redistributed; currently these packages are unmodified development helpers and excluded from extension bundles.
