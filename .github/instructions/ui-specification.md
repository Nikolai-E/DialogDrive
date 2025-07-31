---
applyTo: '**'
---

# DialogDrive UI Specification - Locked Design Baseline
*Established: July 31, 2025*

## 🔒 CORE DESIGN PRINCIPLES - DO NOT CHANGE

This document defines the **locked baseline** for DialogDrive's UI. These specifications should be maintained regardless of future feature requests unless explicitly overridden by the user.

### 📐 **Layout Constraints - FIXED**
- **Popup dimensions**: Exactly 400px × 580px (no scrollbars)
- **Card height**: 52px minimum (compact, efficient)
- **No horizontal scrolling**: All content must fit within 400px width
- **Vertical scrolling**: Only within the main content area

### 🎨 **Visual Hierarchy - ESTABLISHED**
- **Header**: White background with gray border, brand logo + actions
- **Search area**: Light gray background (`bg-gray-50`) with white controls
- **Content area**: White background with gray dividers between items
- **Action buttons**: Float above content without affecting layout

### 🖱️ **Interaction Model - LOCKED**
- **Primary action**: Click anywhere on card to copy/paste
- **Secondary actions**: Hover to reveal pin/edit/delete buttons
- **No layout shift**: Hover actions must not move underlying content
- **Progressive disclosure**: Actions appear as floating overlay

### 📏 **Component Specifications**

#### PromptItem Component - BASELINE
```tsx
// REQUIRED: Maintain these exact dimensions and layout
min-h-[52px]           // Card height
px-4 py-3              // Card padding
gap-2                  // Header spacing
text-base font-semibold // Title styling
text-xs font-medium    // Tag styling
px-1.5 py-0.5          // Tag padding
```

#### Category Color System - FIXED
```tsx
const colors = {
  'General': '#3b82f6',     // blue-500
  'Work': '#10b981',        // green-500
  'Personal': '#8b5cf6',    // purple-500
  'Development': '#f97316', // orange-500
  'Research': '#14b8a6',    // teal-500
  'Writing': '#ec4899',     // pink-500
};
// 4px solid left border for category indication
```

#### Action Button Overlay - LOCKED
```tsx
// REQUIRED: Floating buttons that don't affect layout
className="absolute right-3 top-1/2 -translate-y-1/2 
           opacity-0 group-hover:opacity-100 
           bg-white/95 backdrop-blur-sm rounded-lg 
           px-2 py-1.5 shadow-lg border border-gray-200 z-10"

// Button sizes: p-1.5 with w-3.5 h-3.5 icons
```

### 📱 **Content Strategy - ESTABLISHED**
- **No prompt text preview**: Saves critical vertical space
- **Smart tag display**: Max 3 tags with "+N" overflow counter
- **Efficient metadata**: Usage count and date on same row
- **Title truncation**: `truncate` with `flex-1` for responsive width

### 🎯 **Performance Standards**
- **Smooth transitions**: 150-200ms duration max
- **No animation overload**: Minimal motion to prevent motion sickness
- **Instant feedback**: Click responses under 100ms
- **Efficient rendering**: React.memo for list items

## 📋 **IMMUTABLE RULES**

### ✅ ALWAYS MAINTAIN
1. **52px card height** - Never increase unless explicitly requested
2. **No layout shift on hover** - Actions must float above
3. **400px width constraint** - No horizontal scrolling ever
4. **Compact tag styling** - Small, efficient badges
5. **Single-click copy/paste** - Primary interaction model
6. **Category color borders** - 4px left border visual system

### ❌ NEVER CHANGE WITHOUT EXPLICIT REQUEST
1. Card dimensions or spacing
2. Action button positioning (must stay floating)
3. Color category system
4. Primary click-to-copy behavior
5. Width constraints or overflow handling
6. Tag display logic (3 max + counter)

### 🔧 **SAFE TO MODIFY** (with user request)
- Colors within the established system
- Text content and labels
- Animation timing (keep minimal)
- Additional features (if they don't break layout)
- Form components (separate from list view)

## 📝 **BASELINE CODE REFERENCES**

### Key Components Locked:
- `PromptItem.tsx` - Core list item design
- `PromptList.tsx` - Container and overflow handling  
- `SearchControls.tsx` - Compact control layout
- `Header.tsx` - Brand and navigation design
- `App.tsx` - Main container constraints

### Layout Structure:
```
[Header: 60px height, white bg]
[SearchControls: ~120px height, gray bg]  
[PromptList: flex-1, white bg, scrollable]
  └── [PromptItem: 52px each, hover actions]
```

## 🛡️ **ENFORCEMENT GUIDELINES**

When making future changes:

1. **Check this document first** - Ensure changes don't violate locked specs
2. **Maintain proportions** - New features must fit within constraints
3. **Test on 400px width** - Verify no horizontal scroll introduced
4. **Preserve hover model** - Keep floating action buttons
5. **Verify card height** - Must stay at 52px minimum

## 📞 **OVERRIDE PROTOCOL**

To change locked specifications:
1. User must explicitly request override of specific locked element
2. State clearly: "Override the locked UI spec for [specific element]"
3. Update this document with new baseline if permanently changed
4. Maintain backward compatibility with existing prompts

---

**Last Updated**: July 31, 2025  
**Status**: 🔒 LOCKED BASELINE  
**Version**: 1.0 - Compact Professional Design
