# DialogDrive - Technical Documentation

## Browser Extension Popup Constraints

### Critical Size Limitations
- **Maximum popup dimensions**: 400x580px (confirmed working across Chrome, Edge, Firefox)
- **Safe height limit**: 580px (browsers enforce ~600px maximum)
- **Content area considerations**: Account for 16px scrollbar width
- **Mobile-like constraints**: Requires mobile-first design approach

### Optimal Layout Structure
```
┌─ Header (32px) ─────────────────────┐
├─ Search/Filters (30px) ─────────────┤  
├─ Content Area (480px, scrollable) ──┤
└─ Footer/Actions (38px) ─────────────┘
Total: 580px
```

## Architecture Decisions

### Phase 1 (Core Functionality)
- **Framework**: React 19.1.0 with TypeScript 5.8.3
- **Build tool**: WXT v0.20.6 for cross-browser compatibility
- **Styling**: Inline styles (more reliable than CSS frameworks in extensions)
- **Storage**: Dual strategy (browser.storage.local + localStorage fallback)

### Phase 2A (Organization Features)
- **Categories**: 8 predefined categories for prompt organization
- **Tags**: Custom tagging system with visual indicators
- **Search**: Real-time search across title, content, and tags
- **Sorting**: Multiple sort options (date, title, usage, last used)
- **Pinning**: Favorites system with visual distinction
- **Usage tracking**: Automatic usage counters and last-used timestamps

## Key Technical Insights

### Storage Strategy
```typescript
// Dual storage approach for maximum compatibility
try {
  await browser.storage.local.set(data);
} catch (error) {
  localStorage.setItem(key, JSON.stringify(data));
}
```

### Content Script Integration
- **Supported sites**: ChatGPT, Claude, Gemini
- **Direct paste**: Finds and fills contenteditable elements
- **Fallback**: Clipboard API for unsupported sites
- **Usage tracking**: Automatically increments counters on paste

### UI Density Requirements
- **Font sizes**: 10-12px (much smaller than typical web apps)
- **Padding**: 2-6px (minimal spacing)
- **Button labels**: Abbreviated ("Del" not "Delete")
- **Tag display**: Limited to first 2 tags + overflow indicator
- **Single-line previews**: Ellipsis truncation for space efficiency

## Performance Optimizations

### Prompt Filtering & Sorting
```typescript
const filteredAndSortedPrompts = useMemo(() => {
  // Real-time filtering without API calls
  // In-memory sorting for instant responses
}, [prompts, searchQuery, selectedCategory, sortBy, sortOrder]);
```

### Scrollbar Styling
```css
::-webkit-scrollbar { width: 8px; }
::-webkit-scrollbar-track { background: #1e293b; }
::-webkit-scrollbar-thumb { background: #4b5563; }
```

## Development Workflow

### Build Process
```bash
npm run build  # Creates .output/ directory with extension files
```

### Testing Strategy
1. Load unpacked extension in Chrome/Edge developer mode
2. Test on supported AI sites (ChatGPT, Claude, Gemini)
3. Verify storage persistence across browser sessions
4. Test popup size constraints across different browsers

## Future Considerations

### Popup Size Strategy
- **Keep core features in popup**: Search, paste, quick actions
- **Move complex features to options page**: Bulk import/export, advanced settings
- **Progressive disclosure**: Hide advanced options behind toggles

### Potential Phase 2B+ Features
- **Bulk operations**: Move to dedicated options page
- **Advanced analytics**: Usage statistics and trends
- **Import/Export**: Full data management tools
- **Team features**: Sharing and collaboration (if needed)

### Cross-Browser Compatibility
- **Manifest V3**: Currently using for Chrome/Edge
- **Firefox adaptation**: May need Manifest V2 fallback
- **Safari**: Additional constraints and testing required

## Error Handling Patterns

### Storage Fallbacks
```typescript
// Always provide localStorage fallback
try {
  await browser.storage.local.get(key);
} catch (error) {
  return JSON.parse(localStorage.getItem(key) || '[]');
}
```

### Content Script Injection
```typescript
// Graceful degradation for unsupported sites
try {
  await browser.tabs.sendMessage(tabId, message);
} catch (error) {
  // Fall back to clipboard copy
  await navigator.clipboard.writeText(text);
}
```

## Lessons Learned

1. **Browser extension popups are severely space-constrained** - treat like mobile screens
2. **Inline styles are more reliable** than external CSS in extension contexts
3. **Dual storage strategy essential** for cross-browser compatibility
4. **Content script injection can fail** - always provide clipboard fallback
5. **Every pixel counts** - aggressive UI density optimization required
6. **Users prefer compact, efficient interfaces** in extension popups

## Version History

- **v1.0.0** (Phase 1): Core prompt library functionality
- **v2.0.0** (Phase 2A): Organization features within popup constraints

---
*Last updated: January 2025*
