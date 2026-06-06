# Smart PMS — Responsiveness Guide

A practical reference for making every screen in this project responsive.
Derived from patterns established in the ORS Monitoring and Employee ORS modules.

---

## Breakpoints

| Name      | Width        | Devices                        |
|-----------|-------------|-------------------------------|
| `mobile`  | < 768px      | Phones (portrait & landscape) |
| `tablet`  | 768–1023px   | iPad Mini, iPad, Android tabs |
| `desktop` | ≥ 1024px     | Laptops, desktops, iPad Pro   |

### The `useBreakpoint` Hook (copy into any page that needs it)

```jsx
function useBreakpoint() {
    const [w, setW] = useState(() => window.innerWidth);
    useEffect(() => {
        const h = () => setW(window.innerWidth);
        window.addEventListener('resize', h);
        return () => window.removeEventListener('resize', h);
    }, []);
    if (w >= 1024) return 'desktop';
    if (w >= 768)  return 'tablet';
    return 'mobile';
}
```

Use it: `const bp = useBreakpoint();`
Then branch: `bp === 'desktop'`, `bp === 'tablet'`, `bp === 'mobile'`.

---

## Core Rules

1. **Desktop is the source of truth.** Never change the desktop layout. Only add responsive layers for tablet and mobile.
2. **Inline styles only.** This project uses inline style objects — no Tailwind classes, no new CSS files.
3. **CSS variables always.** Use `var(--admin-*)` tokens for colors, borders, radii, shadows. Never hardcode colors that exist as variables.
4. **Sidebar offset.** On tablet/desktop the sidebar is always visible. Any `position: fixed` element (modals, bottom sheets, FABs) must offset its `left` by the sidebar width. Read it from the DOM:
   ```js
   const left = window.innerWidth >= 768
       ? parseInt(getComputedStyle(document.querySelector('.app-main')).marginLeft) || 0
       : 0;
   ```
5. **No horizontal scroll.** Every layout must be fully usable without horizontal scrolling.
6. **Touch targets ≥ 44px.** Buttons and tappable rows on mobile must have enough padding.

---

## Layout Patterns by Page Type

### Pattern A — Two-Column Split (Index + Detail side by side)
*Used in: ORS Monitoring*

| Breakpoint | Layout |
|------------|--------|
| Desktop    | Fixed left panel (380px) + right detail panel fills remaining width. Both always visible. |
| Tablet     | Left panel full width. Tapping a row opens detail as a **bottom sheet** (82vh, slides up). |
| Mobile     | Same as tablet — full width list, bottom sheet for detail. |

**Bottom Sheet rules:**
- `position: fixed`, `bottom: 0`, `left: {sidebarWidth}`, `right: 0`
- `border-radius: 20px 20px 0 0`
- Drag handle: `4×36px` pill centered at top
- ✕ close button top-right
- Scrollable content, action row sticky at bottom
- Backdrop covers only the content area (same `left` offset)
- Animate with `@keyframes slideUp { from { transform: translateY(100%) } }`
- Sidebar collapse/expand: re-read `marginLeft` reactively (see `useSidebarLeft` in OrsMonitoring/Index.jsx)

---

### Pattern B — Full-Width Calendar / Grid
*Used in: Employee ORS*

| Breakpoint | Layout |
|------------|--------|
| Desktop    | Full 7-column calendar grid with text chips per day. "Log Task" in header. |
| Tablet     | Same grid, shorter weekday labels (1 letter), **dot indicators** instead of text chips, **FAB** replaces header button. |
| Mobile     | Replace grid entirely with a **horizontal day strip** (scrollable, auto-centers today) + **vertical day list** (only days with entries + today). **FAB** for quick action. |

**FAB (Floating Action Button) rules:**
- `position: fixed`, `bottom: 1.5rem`, `right: 1.5rem`, `z-index: 50`
- `width/height: 56px`, `border-radius: 50%`
- Background: `var(--admin-accent)`, color: `#fff`
- Box shadow: `0 4px 20px rgba(59,130,246,0.45)`
- Only shown when action is available (not locked/disabled)

---

### Pattern C — Index List Page (table or card list)
*Used in: UWP Index, OPCR Review Index, Accomplishment Index, etc.*

| Breakpoint | Layout |
|------------|--------|
| Desktop    | Full table with all columns, pagination, search/filter toolbar in one row. |
| Tablet     | Table drops lower-priority columns (keep: name, status, date, actions). Filter toolbar wraps to 2 rows if needed. |
| Mobile     | Replace table with **card list**. Each card = one row, shows only essential fields. Action buttons become an icon row or a "⋮" overflow menu. Search full-width, filter pills horizontally scrollable. |

**Card list item structure (mobile):**
```
┌─────────────────────────────────────┐
│ [Avatar/Icon]  Title (bold)         │
│                Subtitle (muted)     │
│                                     │
│ [Status chip]  [Date]  [Actions]    │
└─────────────────────────────────────┘
```

---

### Pattern D — Show/Detail Page (read-only or form)
*Used in: UWP Show, OPCR Show, Accomplishment Show, etc.*

| Breakpoint | Layout |
|------------|--------|
| Desktop    | Content centered with `max-width: 900px` or split into main + sidebar. Action buttons in a sticky top bar or bottom bar. |
| Tablet     | Same as desktop but full width. Sidebar (if any) collapses below main content. |
| Mobile     | Single column. Section cards stack vertically. Action buttons become a sticky bottom bar (`position: sticky, bottom: 0`). Sticky bar style: `border-top: 1px solid var(--admin-border)`, `background: var(--admin-card)`, `padding: 0.75rem 1rem`. |

---

### Pattern E — Editor / Form Page (multi-section)
*Used in: UWP Editor, IPCR Target, etc.*

| Breakpoint | Layout |
|------------|--------|
| Desktop    | Multi-column form sections, inline validation, collapsible panels. |
| Tablet     | Single column, sections stay as cards. Input fields full width. |
| Mobile     | Same as tablet. Modals (if any) go full-screen (`position: fixed, inset: 0`). No side-by-side inputs. Bottom action bar sticky. |

**Full-screen modal on mobile:**
```js
const modalStyle = bp === 'mobile'
    ? { position: 'fixed', inset: 0, borderRadius: 0, zIndex: 200 }
    : { position: 'fixed', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200 };
```

---

## Component-Level Rules

### Stats / Metric Cards
```js
gridTemplateColumns: bp === 'mobile' ? 'repeat(2, 1fr)' : 'repeat(4, 1fr)'
```
On mobile: 2×2 grid. On tablet/desktop: 4-in-a-row.

### Data Tables
```js
// Hide columns on tablet/mobile via conditional rendering
{bp === 'desktop' && <td>{row.detail_column}</td>}
```
Always keep: primary identifier, status, primary action.
Always hide on mobile: secondary dates, IDs, computed fields.

### Search + Filter Toolbar
- Desktop: single row — `[Search input] [Filter pills] [Action button]`
- Tablet: search + filters in one row, action button moves to right or FAB
- Mobile: search full width on top row, filter pills horizontally scrollable below

```js
// Filter pills scroll on mobile
<div style={{ display: 'flex', gap: 4, overflowX: bp === 'mobile' ? 'auto' : 'visible',
    flexWrap: bp === 'mobile' ? 'nowrap' : 'wrap', scrollbarWidth: 'none' }}>
```

### Modals
- Desktop/Tablet: centered overlay, max-width (e.g. 600px), `border-radius: var(--admin-radius)`
- Mobile: full-screen or bottom sheet, no border-radius on sides

```js
const modalInner = bp === 'mobile'
    ? { position: 'fixed', bottom: 0, left: 0, right: 0, borderRadius: '20px 20px 0 0', maxHeight: '90vh', overflowY: 'auto' }
    : { background: 'var(--admin-card)', borderRadius: 'var(--admin-radius)', width: '100%', maxWidth: 600, maxHeight: '90vh', overflowY: 'auto' };
```

### Navigation Headers / Page Titles
- Desktop: title + description in topbar (handled by AppLayout)
- Tablet/Mobile: topbar collapses, shows hamburger — AppLayout already handles this

### Star Ratings
- All breakpoints: same interactive stars, no change needed
- On mobile ensure `fontSize: '1.6rem'` (already set) — big enough for touch

### Avatar / Profile Photos
- All sizes: keep the 22–24px round avatar in list cards
- Detail pages: can go larger (48–64px) on all breakpoints

---

## Spacing Adjustments by Breakpoint

| Element          | Desktop       | Tablet        | Mobile        |
|------------------|--------------|--------------|--------------|
| Page padding     | `1.75rem`    | `1.25rem`    | `1rem`       |
| Card padding     | `1rem 1.25rem` | `0.9rem 1rem` | `0.75rem`  |
| Gap between cards| `1rem`       | `0.75rem`    | `0.5rem`     |
| Section gap      | `0.75rem`    | `0.5rem`     | `0.5rem`     |

AppLayout already handles page padding via `.admin-content`. For card-level padding, apply conditionally:
```js
const cardPad = bp === 'mobile' ? '0.75rem' : '1rem 1.25rem';
```

---

## Checklist Before Shipping a Screen

- [ ] Desktop layout unchanged
- [ ] No horizontal scroll on mobile or tablet
- [ ] All tap targets ≥ 44px on mobile
- [ ] Fixed/absolute elements account for sidebar offset on tablet
- [ ] Tables replaced or column-reduced on mobile
- [ ] Action buttons accessible on mobile (FAB or sticky bottom bar)
- [ ] Modals usable on mobile (full-screen or bottom sheet)
- [ ] Search/filter toolbar usable on mobile (no overflow)
- [ ] Stats grid 2-col on mobile
- [ ] Legend/metadata rows scrollable horizontally if they overflow
- [ ] Tested with sidebar collapsed AND expanded on tablet
