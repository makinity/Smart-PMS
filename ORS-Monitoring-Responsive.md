# ORS Monitoring — Responsive Design Spec (Stitch Prototype)

Generate frame-by-frame prototypes for the Supervisor ORS Monitoring screen across all breakpoints listed below. Each frame is a distinct screen state. Use the color system and component style defined at the end of this document.

---

## Breakpoints to Generate

| Label       | Width        | Device Example            |
|-------------|-------------|---------------------------|
| `xs`        | 375px        | iPhone SE, small Android  |
| `sm`        | 430px        | iPhone 15 Pro Max         |
| `md`        | 768px        | iPad Mini (portrait)      |
| `lg`        | 1024px       | iPad Pro (landscape)      |
| `xl`        | 1280px+      | Laptop / Desktop          |

---

## Frames to Generate Per Breakpoint

### Frame 1 — Queue List View (default landing)
The submission queue is the first thing the user sees. On small screens the right panel is hidden.

**Content:**
- App topbar: hamburger menu icon (mobile), page title "ORS Monitoring", notification bell, avatar
- Section header: "Submission Queue", count badge "X NEW" (red pill)
- Subtext: "X pending · X rated"
- Search bar (full width) with magnifier icon placeholder "Search employee or task…"
- Filter pills in a row: **All** · **Pending** · **Rated** (active pill = blue outlined)
- List of queue cards (show 4–5 cards):
  - Left accent border (red = URGENT, green = STANDARD)
  - Row 1: URGENT/STANDARD badge + "Requires Rating"/"Rated" chip + relative time (right-aligned)
  - Row 2: Round avatar (24px) + Employee full name — Office name (truncated)
  - Row 3: Task indicator text (truncated, 1 line, muted)

**Layout rules by breakpoint:**
- `xs/sm`: Full-width single column. Queue list takes 100% width. No right panel visible. Bottom of each card tappable.
- `md`: Full-width single column. Queue list takes 100%. Tapping a card slides in the rating panel from bottom (bottom sheet, 75vh).
- `lg/xl`: Two-column grid — queue list (380px fixed) + rating panel (remaining width). Both visible simultaneously.

---

### Frame 2 — Rating Panel Open (entry selected, unrated)
User tapped a "Requires Rating" card. Rating panel is now visible.

**Content (right panel / bottom sheet):**
- Label: "TASK REVIEW IN PROGRESS" (small, accent color, uppercase)
- Heading: "Reviewing: {Employee Name}" + Office name (muted)
- Task indicator text + MFO output title badge (blue pill)
- Meta row: calendar icon + work_date · stopwatch icon + duration · send icon + "Submitted X ago"
- **Evidence section card:**
  - Section label: "VIEW EVIDENCE" + attachment count (right)
  - Evidence grid: 1 column on xs/sm, 2 columns on md+
  - Each evidence card: file-type icon (colored, 40px rounded square) + filename + file size + download button (right, appears on hover/tap)
- **Rating form card** (muted background):
  - Two columns on md+, stacked on xs/sm
  - Left: "QUALITY RATING" label + description text + 5 interactive stars + rating label ("4 / 5 — VERY SATISFACTORY")
  - Right: "TIMELINESS RATING" label + description text + 5 interactive stars + rating label
- **Remarks card:**
  - Label "Remarks & Feedback (optional)"
  - Textarea (4 rows) with placeholder
  - Character counter "0 / 2000" right-aligned below
- **Action row:**
  - Left: "Discard Changes" button (outlined)
  - Right: "★ Save Rating" button (solid accent blue)

**Layout rules by breakpoint:**
- `xs/sm`: Bottom sheet slides up from bottom (75vh, rounded top corners 20px). Has drag handle at top. Scrollable. Action row sticky at bottom of sheet.
- `md`: Bottom sheet (65vh). Ratings stacked vertically (not 2-col).
- `lg/xl`: Right panel, full height, scrollable. Ratings in 2-col grid. Action row at bottom.

---

### Frame 3 — Rating Panel Open (entry already rated — View Mode)
User tapped a "Rated" card. Shows read-only view of existing rating.

**Content (same panel structure as Frame 2, but rating section replaced by):**
- Green banner: "✓ Rating Submitted · X ago" with small **Edit** button (outlined, pencil icon) on the right
- Quality Rating: label + 5 filled stars (amber) + "4 / 5 — VERY SATISFACTORY" label (read-only, no interaction)
- Timeliness Rating: same read-only display
- Remarks block (if present): label "Remarks" + paragraph text (not textarea)
- **No action buttons shown** (no Save/Discard)

**Layout rules:** Same as Frame 2 by breakpoint.

---

### Frame 4 — Edit Mode (supervisor updating an existing rating)
User clicked "Edit" on a rated entry.

**Content:** Same as Frame 2 (unrated entry) except:
- Left discard button labeled **"Cancel"** instead of "Discard Changes"
- Right save button labeled **"★ Update Rating"** instead of "Save Rating"
- Stars pre-filled with existing rating values

---

### Frame 5 — Empty State (no entries)
No submissions assigned to this supervisor yet.

**Content:**
- Center-aligned in the content area
- Inbox icon (large, 48px, muted)
- Bold heading: "No Submissions Yet"
- Subtext: "Submitted task entries from your team will appear here for review."

---

### Frame 6 — Search Active / Filtered (xs/sm only)
User typed in the search box. Queue list shows filtered results.

**Content:**
- Search box has active text "Carlos"
- "Pending" filter pill is active (blue)
- Queue list shows 2 matching cards
- Below the list: small muted text "Showing 2 of 5 results"

---

### Frame 7 — Mobile Navigation (xs/sm — sidebar open)
User tapped hamburger menu. Sidebar slides in from left as an overlay.

**Content:**
- Left sidebar (280px wide) overlays the screen with dark semi-transparent backdrop
- Sidebar contains: app logo + nav links (Dashboard, UWP, ORS Monitoring active, Team Tasks, Accomplishment, Profile)
- "ORS Monitoring" link highlighted with accent background
- Close button (×) or tap-backdrop to dismiss

---

## Component & Color Reference

Use these CSS variable values for all components:

### Colors (Dark Theme — default)
```
Background:        #0a0f1a  (--admin-bg-primary)
Card:              rgba(16,23,34,0.96)  (--admin-card)
Border:            rgba(140,171,214,0.12)  (--admin-border)
Border strong:     rgba(59,130,246,0.22)  (--admin-border-strong)
Text primary:      #f4f8ff
Text secondary:    #a5b4cf
Text muted:        #6f83a6
Accent blue:       #3b82f6
Success green:     #10b981
Error red:         #ef4444
Amber (stars):     #f59e0b
```

### Colors (Light Theme — alternate frame)
```
Background:        #f0f4ff
Card:              rgba(255,255,255,0.96)
Border:            rgba(59,130,246,0.14)
Text primary:      #0f172a
Text muted:        #64748b
Accent blue:       #2563eb
```

### Badge / Chip Styles
- **URGENT badge**: red-tinted bg `rgba(239,68,68,0.12)`, red text `#ef4444`, font-size 10px, bold, pill shape, 3px left border on card `#ef4444`
- **STANDARD badge**: gray-tinted bg `rgba(100,116,139,0.12)`, muted text `#94a3b8`, 3px left border on card `#10b981`
- **Requires Rating chip**: amber bg `rgba(251,191,36,0.15)`, amber text `#d97706`, clock icon
- **Rated chip**: green bg `rgba(16,185,129,0.12)`, green text `#10b981`, check-circle icon

### Avatar Fallback
When no profile photo: 24px circle, accent blue background, white 2-letter initials, font-size 9px bold.

### Star Rating
5 stars, 24px each, amber `#f59e0b` when active, muted `rgba(140,171,214,0.3)` when inactive. Below stars: "X / 5 — LABEL" in 11px bold uppercase accent blue.

### Bottom Sheet (mobile)
- Background: card color
- Border-radius top: 20px
- Drag handle: 4px × 36px rounded pill, centered, muted color, 8px from top
- Box shadow: `0 -8px 32px rgba(0,0,0,0.3)`
- Height: 75vh (draggable)
- Scrollable content inside

### Action Row (sticky bottom)
- `padding: 12px 16px`
- `border-top: 1px solid var(--admin-border)`
- `background: var(--admin-card)`
- `display: flex; justify-content: space-between`
- Discard: outlined button, border `var(--admin-border-strong)`, transparent bg
- Save/Update: solid accent blue `#3b82f6`, white text, star icon prefix

---

## Generation Instructions for Stitch

1. Generate **one frame per row** in the output.
2. Label each frame: `[Breakpoint] Frame N — Description` (e.g. `[xs 375px] Frame 1 — Queue List`).
3. Show both **dark theme** and **light theme** variants for Frame 1 and Frame 2 at `xl` breakpoint only.
4. For `xs` and `sm`, show Frame 1 and Frame 2 separately (queue list then rating panel as bottom sheet).
5. For `md`, show Frame 1 (queue) and Frame 2 (bottom sheet open) as separate frames.
6. For `lg` and `xl`, show Frames 1+2 combined (two-column layout, entry selected).
7. Always show Frame 3 (view mode) and Frame 4 (edit mode) at `xl` only.
8. Show Frame 5 (empty state) at `xs` and `xl`.
9. Show Frame 6 (search active) at `xs` only.
10. Show Frame 7 (sidebar open) at `xs` only.
