# DialogDrive Browser Extension - AI Agent Instructions

## Project Overview
DialogDrive is a browser extension for managing and pasting AI prompts into ChatGPT, Claude, and Gemini. Built with WXT framework, React 19, and TypeScript for cross-browser compatibility.

## General Guidelines
- You are an expert in Chrome Extension Development, JavaScript, TypeScript, React, Tailwind CSS, and Web APIs
- Follow WXT framework documentation and Chrome Extension best practices
- Always consider the whole project context and avoid duplicating functionality
- Ensure new code integrates seamlessly with existing architecture
- Review current project state before adding or modifying features

## Architecture Pattern: 3-Layer Extension
- **Popup UI** (`entrypoints/popup/`): React app with Tailwind CSS styling
- **Background Script** (`entrypoints/background.ts`): Message routing and OpenAI API calls  
- **Content Scripts** (`entrypoints/content.ts`): DOM injection for supported AI sites

## Development Workflows
```bash
npm run build              # Creates .output/ directory
npm run dev               # Development with hot reload
npm run build:firefox     # Firefox-specific build
# Load .output/chrome-mv3 as unpacked extension in browser
```

## Browser API Usage
- Use browser.* APIs (chrome.tabs, chrome.storage, chrome.runtime) with WXT framework compatibility
- Implement proper error handling for all API calls with fallback strategies
- Use message passing for popup ↔ background ↔ content script communication
- Manage state with chrome.storage.local (prompts) and chrome.storage.sync (API keys)

## Code Style & TypeScript
- Write concise, technical TypeScript code with accurate examples
- Use modern JS/React features and functional programming patterns
- Use descriptive variable names and TypeScript interfaces
- Leverage union types and type guards for runtime checks
- Use interfaces for message structures and API responses

## Styling Strategy: Tailwind-First

### Primary Approach: Tailwind CSS
```tsx
// Preferred - Clean, maintainable, consistent
<button className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-md transition-colors font-medium">
  Save Prompt
</button>
```

### Inline Styles Only When Required
Use inline styles sparingly for truly dynamic values:
```tsx
// Only for runtime-computed values
<div 
  className="transition-all duration-200"
  style={{ maxHeight: isExpanded ? calculateHeight() : 0 }}
/>
```

## Extension Architecture & Security
- Separate concerns between extension components (background, content, popup)
- Use manifest v3 with proper Content Security Policy (CSP)
- Implement least privilege for permissions; validate all external data
- Use HTTPS for OpenAI API calls with proper error handling
- Sanitize user inputs before DOM injection or storage

## Performance Considerations
- Minimize resource usage in background scripts
- Optimize content scripts for minimal web page impact
- Use event-based communication instead of polling
- Implement proper cleanup in content scripts

## Project-Specific Patterns

### 1. Message Passing Pattern
```typescript
// Popup → Background → Content Script communication
browser.runtime.sendMessage({ type: 'IMPROVE_PROMPT', promptText: text });
browser.tabs.sendMessage(tabId, { type: 'PASTE_PROMPT', text: transformed });
```

### 2. Dual Storage Strategy
```typescript
// Always try browser.storage first, localStorage as fallback
try {
  await browser.storage.local.set(data);
} catch (error) {
  localStorage.setItem(key, JSON.stringify(data));
}
```

### 3. Constraint-Driven Design
- Popup max size: 400x580px (browser enforced)
- Use Tailwind responsive prefixes for compact UI
- Prefer `text-xs` and `text-sm` for space efficiency
- Use `truncate` and `line-clamp-2` for text overflow

## Key Integration Points

### Content Script Injection
Sites: `chatgpt.com`, `claude.ai`, `gemini.google.com`
```typescript
// Finds contenteditable or textarea elements
const chatInput = document.querySelector('[contenteditable="true"]');
```

### OpenAI API Integration
Background script handles all API calls using gpt-4o model for prompt improvement.

### Tailwind Configuration
- JIT mode enabled for minimal bundle size
- Content purging: `./entrypoints/**/*.{html,js,ts,jsx,tsx}`
- Custom design tokens extend default theme

## Data Model
Core entity: `Prompt` interface with workspace categorization, tagging, usage tracking, and timestamp/voice transformations.

## Development Anti-Patterns to Avoid
- Don't use inline styles for static values (use Tailwind classes)
- Don't use `innerHTML` (security policy)
- Don't make direct API calls from popup (use background script)
- Don't assume browser.storage exists (always provide localStorage fallback)

## Migration Strategy
When refactoring existing inline styles:
1. Replace static values with Tailwind utilities first
2. Keep dynamic values as inline styles
3. Use CSS custom properties for theme values that need JS access

## Testing Focus Areas
1. Cross-site content injection (ChatGPT, Claude, Gemini)
2. Tailwind CSS loading in extension context
3. Storage persistence across browser sessions
4. Popup size constraints across browsers
