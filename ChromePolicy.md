Must-pass policy fundamentals (will be reviewed)

Manifest V3 only; no remotely hosted code (no loading JS from your server/CDN, no eval). Bundle all executable code.
Chrome for Developers
+1

Request only necessary permissions; prefer activeTab, host_permissions scoped to needed origins, and optional permissions where possible. (This is a core theme in program policies and best-practices.)
Chrome for Developers
+1

Single-purpose extension (no “Swiss-army knife” spam or duplicate listings).
Chrome for Developers

No deceptive behavior / keyword stuffing / dark patterns; everything your extension does must be clear to the user.
Chrome for Developers

User-data & privacy (high-scrutiny area)

Publish a clear Privacy Policy linked in your listing if you collect or transmit user data; disclose what you collect, why, how it’s used/shared, and deletion instructions. Your listing’s “Privacy practices” must match reality.
Chrome for Developers
+1

Use data only for the purposes you disclosed (“Limited Use” policy) and comply with applicable laws.
Chrome for Developers

Product quality (aiming for the Featured badge)

Google’s Featured badge looks for a polished product and listing that follow store best practices:

Design a high-quality extension (fast, reliable, minimal resource use, clean UI, clear onboarding).
Chrome for Developers
+1

Create a great listing page: strong title, concise value prop in first 1–2 lines, high-quality screenshots (and a promo tile), accurate categories, and no hype or misleading claims.
Chrome for Developers

Transparency in UX: explain permissions at first run, give obvious controls (on/off, per-site), and clear support links.
Chrome for Developers

Store listing: what to prepare

Title & short description (crisp benefit), long description (features, limitations, privacy), screenshots/promo, support email/site, privacy policy URL, category, language.
Chrome for Developers

Complete the Privacy practices questionnaire truthfully (data types, purposes, handling).
Chrome for Developers

Technical pre-flight (MV3 sanity checks)

manifest.json uses MV3 with a service worker (not background page); content scripts are least-privilege; use declarativeNetRequest when applicable.
Chrome for Developers

No dynamic code execution; CSP is tight; third-party libraries are vendored and pinned (again: no remote code).
Chrome for Developers

Ask for permissions at runtime where possible (optional permissions / user gesture).
Chrome for Developers

Release & maintenance hygiene

Provide test instructions for reviewers if your flows require setup or credentials.
Chrome for Developers

Ship small, frequent updates that don’t flirt with policy gray areas; keeping a clean review history helps the Established publisher status.
Chrome for Developers

Keep a changelog, respond to user reviews, and fix policy feedback fast (Chrome is actively curating for safety and honesty).
Chrome for Developers
