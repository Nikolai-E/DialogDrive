# QA Test Plan

## Environments
- Chrome Stable (Windows, macOS)
- (Optional) Edge Stable

## Core Scenarios
| ID | Scenario | Steps | Expected |
|----|----------|-------|----------|
| P1 | First install | Install, open popup | Empty state loads without errors |
| P2 | Add prompt | Add sample prompt | Appears in list, usage=0 |
| P3 | Paste latest prompt | Use shortcut Ctrl+Shift+P in ChatGPT | Prompt text inserted or clipboard fallback succeeds |
| P4 | Capture chat bookmark | Open AI chat, use save button/context menu | Bookmark stored with title & URL |
| P5 | Search filter | Enter partial title/tag | List filters instantly |
| P6 | Tag add/remove | Edit prompt tags | Tags update & persist |
| P7 | Workspace filter | Switch workspace filter | Only matching items shown |
| P8 | Pin prompt | Pin/unpin | Ordering reflects pin priority |
| P9 | Delete prompt | Remove item | Item gone, no residual errors |
| P10 | Context menu actions | Right-click selection → save | New prompt created |
| P11 | Side panel open | Shortcut or command | Side panel displays list |
| P12 | Resize constraints | Inspect popup height | Layout within 400x580, no overflow |
| P13 | Permission scope | Navigate unrelated site | No injections / console noise |
| P14 | Export (if present) | Trigger export (future) | File downloads JSON |
| P15 | Notifications | Save selection/bookmark | Notification appears (if enabled) |

## Edge Cases
- Large prompt body (>5k chars) still saves
- Many tags (20) do not break layout
- Rapid add/delete cycle doesn’t corrupt store
- Offline mode (no network) still functional

## Regression Checks
- No network requests to external domains (verify DevTools Network)
- No errors in background console
- Host permissions honored (only specified domains)

## Performance
- Popup initial render <200ms subjective
- Search filter updates under 50ms for 500 items (emanual observation)

## Security
- User-entered text rendered safely (no HTML injection)
- Clipboard operations only on explicit action

## Security Regression
| ID | Scenario | Steps | Expected |
|----|----------|-------|----------|
| S1 | Floating save tags treat input as text | Create tag named `<img onerror=1>`, reopen floating modal | Tag chip shows literal text, remove icon works with mouse & keyboard |
| S2 | Clear Local Data wipes everything | Seed prompts/chats, run Settings → Clear Local Data | Library empties, toast appears, "Last cleared" timestamp updates |
| S3 | CSP enforces self-only resources | Build extension, load popup, inspect DevTools console | No blocked resource errors; dev websocket may be blocked during local development |

## Sign-off
Complete P1–P13 and S1–S3 before submission.
