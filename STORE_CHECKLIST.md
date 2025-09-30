This file has been deleted.
# Chrome Web Store Launch Checklist

## Technical
- [x] Manifest v3 with minimized permissions (storage, tabs, clipboardWrite, contextMenus, notifications, sidePanel)
- [x] Host permissions restricted to required AI domains
- [x] Single active background script (legacy stubs neutralized)
- [x] Build passes (`npm run build`)
- [ ] Manifest CSP matches `default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self'; object-src 'self'`
- [x] No TypeScript errors
- [ ] Final manual QA on target domains

## Privacy & Compliance
- [x] Privacy policy updated & hosted (GitHub)
- [x] README documents permissions
- [ ] Replace placeholder support email with production contact

## UI/UX
- [x] Settings includes Privacy & Support links
- [ ] Verify keyboard shortcuts function after install
- [ ] Visual scan for truncated text / overflow at 400x580 popup size

## Assets
- [ ] Screenshots (min 3): popup, side panel, context menu capture
- [ ] Optional promo tile 440x280
- [ ] Icon set (16–128) present

## Store Listing Copy
- [ ] Short description (<=132 chars)
- [ ] Long description (feature bullets + privacy statement)
- [ ] Category chosen (Productivity / Developer Tools)

## Versioning & Release
- [x] CHANGELOG entry for 1.0.0
- [ ] Tag release `v1.0.0` in repository
- [ ] Upload zip (npm run zip) to dashboard

## Post-Submission
- [ ] Monitor review feedback
- [ ] Prepare quick patch plan for any requested changes

---
Generated automatically; update as tasks are completed.
