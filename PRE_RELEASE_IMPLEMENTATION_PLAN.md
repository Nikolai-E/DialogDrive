This file has been deleted.
# DialogDrive Pre-Release Implementation Plan

This revision expands the PRE_RELEASE_TODO items into actionable work while keeping DialogDrive fast, privacy-forward, and policy compliant. Each section highlights where we should pause and have the user (you) perform hands-on verification before continuing.

---

## 1. Sanitize Floating Save Tag Rendering (`entrypoints/floating-save.content.ts:213`)
- **Status:** ✅ Completed (Aug 2025)
- **Goal**: Eliminate DOM XSS risk in floating save modal without regressing tag UX.
- **Implementation**
  - Replace `innerHTML` usage with explicit node construction and `textContent` for tag labels and aria strings.
  - Introduce a small `sanitizeTagLabel(tag: string)` helper shared across popup/floating UI to strip control characters before storage and display.
  - Review other tag render paths (popup, side panel) and swap any remaining `dangerouslySetInnerHTML`/template strings with the helper for consistency.
  - Retain SVG remove icon by injecting static markup and attaching event listeners programmatically.
- **Manual verification checkpoint**
  - After coding, create a tag named `<img onerror=alert(1)>`, reopen modal, confirm literal text display and intact removal keyboard handling.
  - Pause for user confirmation before moving on.

## 2. Lock Down Extension Page CSP (`wxt.config.ts`)
- **Status:** ✅ Completed (Aug 2025)
- **Goal**: Adopt MV3-aligned CSP while ensuring current UI keeps functioning.
- **Implementation**
  - Update `content_security_policy.extension_pages` to: `default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self'; object-src 'self'`.
  - Run the standard build (`npm run build`) and inspect the generated `dist/manifest.json` to confirm CSP output.
  - Smoke-test popup and side panel for blocked resource warnings.
  - Document the CSP expectation inside `STORE_CHECKLIST.md`.
- **Manual verification checkpoint**
  - Share build output summary and wait for user to confirm the popup loads cleanly before continuing.

## 3. Add One-Click “Clear Local Data” Control (`entrypoints/popup/components/Settings.tsx`)
- **Status:** ✅ Completed (Aug 2025)
- **Goal**: Provide an in-product reset that wipes all stored prompts, chats, preferences (local + sync if still in use) with deliberate confirmation.
- **Implementation**
  - Add a prominent destructive button in Settings with supporting copy (“Type DELETE to confirm”) and a modal requiring the user to type `DELETE` before enabling the final action.
  - Implement `clearAllData()` in `useUnifiedStore` (or equivalent) that:
    - Clears `secureStorage` / `browser.storage.local` entries.
    - Checks whether `browser.storage.sync` is currently used; if so, clears those entries too. If not required, plan to migrate any remaining sync usage to local storage during this work and remove sync writes entirely.
    - Resets in-memory state, usage counters, and pinned flags.
    - Records a `lastClearedAt` timestamp in local storage to show users when the wipe happened.
  - Display `lastClearedAt` near the button (e.g., “Last cleared: — / 12 Aug 2025”) so users can see confirmation history.
  - Trigger a success toast (`“DialogDrive data deleted from this browser.”`).
  - Add a subtle info icon beside the button that clarifies data lives on-device and (if Chrome Sync remains) that preferences may sync via the user’s Google account; keep tone reassuring.
- **Manual verification checkpoint**
  - After implementation, populate sample data, use the clear flow, and ensure all surfaces show the empty state and the timestamp updates. Pause so the user can test the clear experience personally before proceeding.

## 4. Expand In-Product Privacy Copy (`entrypoints/popup/components/Settings.tsx`)
- **Status:** ✅ Completed (Aug 2025)
- **Goal**: Accurately describe stored data in approachable language and surface the privacy policy link.
- **Implementation**
  - Rewrite the Settings privacy paragraph to mention prompts, chat snippets/URLs, usage counts, and cleaner preferences while reiterating everything stays on-device.
  - If Chrome Sync remains for lightweight preferences, mention it briefly with the new info icon tooltip; if we finish migrating to local-only, explicitly state “No Chrome Sync — data stays on this device.”
  - Link to the published privacy policy via a button or inline link; ensure link text is friendly (e.g., “Read the Privacy Policy”).
  - Check layout to avoid intimidating tone—focus on clarity and the benefit of local control.
- **Manual verification checkpoint**
  - Preview the popup copy update and request user feedback on tone/accuracy before locking it in.

## 5. Clarify Storage Practices in Privacy Policy (`PRIVACY_POLICY.md`)
- **Status:** ✅ Completed (Aug 2025)
- **Goal**: Ensure policy language matches actual storage behavior and removes overstated claims.
- **Implementation**
  - Audit the codebase for any remaining `browser.storage.sync` usage. If unnecessary, remove it and update the policy to state that all data resides in `chrome.storage.local` and is wiped on uninstall/clear.
  - If some preferences must stay in sync, document what fields sync, why, and how users can opt out (via the new clear control and by disabling Chrome Sync).
  - Replace the “All user input sanitized” guarantee with a softer accuracy statement (“We sanitize user-provided content in interfaces to reduce security risks, but you control the content you save.”).
  - Add a short GDPR-oriented paragraph explaining that local-only storage keeps DialogDrive outside the controller role unless sync is enabled by the browser, referencing the new delete control.
- **Manual verification checkpoint**
  - Share the revised sections for user review and sign-off before updating the repo.

## 6. Prepare Chrome Listing Privacy Matrix (`STORE_LISTING_DRAFT.md`)
- **Status:** ✅ Completed (Aug 2025)
- **Goal**: Provide accurate answers for the Chrome Web Store privacy form.
- **Implementation**
  - Insert a `## Privacy Practices Matrix` section that lists: Data type, Purpose, Retention (“Until you delete”), Shared (“No” if staying local-only), Storage (“chrome.storage.local on device”).
  - Double-check the matrix aligns with the updated privacy policy and in-app copy.
  - Add a note referencing the new delete control and last-cleared timestamp.
  - Flag any items needing legal review and capture them in `STORE_CHECKLIST.md`.
- **Manual verification checkpoint**
  - Review matrix with the user for completeness and adjust language if needed before moving forward.

## 7. Extend QA Plan with Manual Security Regression Steps (`QA_TEST_PLAN.md`)
- **Status:** ✅ Completed (Aug 2025)
- **Goal**: Capture manual checks for the new security/privacy behaviors.
- **Implementation**
  - Add a “Security Regression” section containing:
    - `S1` HTML injection attempt in floating tags (expected literal rendering).
    - `S2` Clear Local Data flow (expected purge + toast + timestamp update).
    - `S3` CSP verification (build, inspect manifest, load popup for console warnings).
  - Mention that automated tests are optional; rely on user-led manual verification and note where to pause (e.g., after step 3 and 4 changes).
  - Update the sign-off checklist to require acknowledging these scenarios before release.
- **Manual verification checkpoint**
  - Have the user skim the updated plan to confirm the manual testing flow reflects their expectations.

## 8. Document Publisher Security Hygiene (`RELEASE_PLAN.md`)
- **Status:** ✅ Completed (Aug 2025)
- **Goal**: Demonstrate account-level security practices for Chrome Web Store submission.
- **Implementation**
  - Add a “Publisher Account Security” section covering 2FA/security key usage, collaborator access review cadence, and release approval steps.
  - Include a reminder to confirm these items during the release dry run.
  - Reference any private documents/screenshots stored outside the repo without including sensitive info directly.
- **Manual verification checkpoint**
  - Once drafted, request user confirmation that the checklist matches current practices.

## 9. Produce Final Creative Assets Kit (`LISTING_COPY_DRAFT.md` + `/docs/assets/`)
- **Status:** ✅ Completed (Aug 2025)
- **Goal**: Deliver submission-ready visuals and copy consistent with the polished privacy story.
- **Implementation**
  - Convert the existing asset table into an actionable production checklist with owners/due dates and output location (`/docs/assets/final/…`).
  - Ensure one screenshot showcases the sanitized tag rendering (plain text `<img onerror>` chip) to reinforce the security fix.
  - Outline a concise promo video script emphasizing on-device storage and the new clear control without sounding alarmist.
  - Run a manual pass on each asset for contrast and legibility; note in checklist for user sign-off.
- **Manual verification checkpoint**
  - Gather assets, then pause for user review before packaging.

## 10. Align Messaging with Actual Host Support (README, UI, Listing, Assets)
- **Status:** ✅ Completed (Aug 2025)
- **Goal**: Promise only the functionality we ship today (ChatGPT) while keeping future roadmap language clearly aspirational.
- **Implementation**
  - `rg 'Gemini|Claude|provider'` to locate and update references—ensure live messaging says “ChatGPT today” and reserves other providers for roadmap notes.
  - Update README, Settings copy, listing drafts, and creative overlays accordingly.
  - Add a line in QA/Test plan to spot-check messaging across popup, README, and listing before submission.
- **Manual verification checkpoint**
  - Provide updated text snippets for user approval, especially in public-facing docs.

---

## Cross-Cutting Execution Notes
- Sequence items roughly in order (1 → 10). After each major feature (1, 3, 4/5, and 10), pause so the user can install/test the build before moving on.
- Stick to manual validation—no new automated/unit tests unless explicitly requested. Document manual results in the relevant markdown files.
- Keep CHANGELOG and STORE_CHECKLIST entries updated as steps complete to maintain a clear release trail.
- Maintain reassuring, user-friendly language across all privacy messaging; emphasize local control and the optional nature of any sync features.
