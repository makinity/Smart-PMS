# OPCR Accomplishment Module — Design & Implementation Plan

## Overview

The OPCR Accomplishment module handles the **office-level performance rating** at the end of each performance period (CSC SPMS Stage 3). Once all individual employee accomplishments are released by PMT, the Dept Head submits an office accomplishment report and PMT reviews, calibrates, and releases the official office rating.

---

## Module Scope

**3 pages total:**

| # | Role | Page | URL |
|---|---|---|---|
| 1 | Dept Head | OPCR Accomplishment (Submit) | `/dept-head/opcr-accomplishment` |
| 2 | PMT | OPCR Accomplishment List | `/pmt/opcr-accomplishment` |
| 3 | PMT | OPCR Accomplishment Detail | `/pmt/opcr-accomplishment/{id}` |

---

## Data Model

### `opcr_accomplishment_submissions` table

| Column | Type | Description |
|---|---|---|
| `id` | bigint PK | |
| `office_id` | FK → offices | |
| `performance_period_id` | FK → performance_periods | |
| `status` | string | `draft`, `submitted`, `released`, `returned` |
| `computed_office_rating` | decimal(5,2) nullable | Auto-computed average of all released employee ratings |
| `final_office_rating` | decimal(5,2) nullable | PMT-approved final rating (may differ if calibrated) |
| `final_adjectival_rating` | string nullable | Outstanding / Very Satisfactory / Satisfactory / Unsatisfactory / Poor |
| `dept_head_remarks` | text nullable | Optional notes from Dept Head |
| `pmt_member_id` | FK → users nullable | PMT who acted on it |
| `pmt_remarks` | text nullable | PMT calibration notes |
| `submitted_at` | timestamp nullable | |
| `pmt_action_at` | timestamp nullable | |
| `flagged_for_calibration` | boolean default false | Dept Head can flag before submitting |

Unique: `(office_id, performance_period_id)`

### Computed Rating Formula

```
computed_office_rating = AVG(final_rating) of all AccomplishmentSubmissions
                         WHERE office_id = this office
                         AND performance_period_id = this period
                         AND status = 'released_by_pmt'
```

### CSC Adjectival Scale

| Score | Rating |
|---|---|
| 4.500 – 5.000 | Outstanding |
| 3.500 – 4.499 | Very Satisfactory |
| 2.500 – 3.499 | Satisfactory |
| 1.500 – 2.499 | Unsatisfactory |
| Below 1.500 | Poor |

---

## Status Lifecycle

```
draft → submitted → released
   ↑___returned___|
```

| Status | Set By | Meaning |
|---|---|---|
| `draft` | System | Default; Dept Head has not yet submitted |
| `submitted` | Dept Head | Submitted to PMT for review |
| `released` | PMT | Official office rating released |
| `returned` | PMT | Returned to Dept Head for revision |

---

## Business Rules

1. Dept Head cannot submit until **at least 1 employee** in the office has `released_by_pmt` status.
2. The submit button shows a progress indicator: **X of Y employees released**.
3. If some employees are not yet released, Dept Head can still submit — PMT will see incomplete data.
4. PMT can Release directly (use computed rating) or Calibrate & Release (adjust the rating).
5. Once `released`, no further actions. Terminal state.
6. One submission per office per performance period.

---

## Page 1 — Dept Head: OPCR Accomplishment

### Purpose
Single page for the Dept Head to view their office's employee release progress and submit the OPCR accomplishment to PMT.

### Data Shown
- Office name + performance period
- Summary stats: X employees released / Y total employees
- Table of all employees in the office with columns: Name, Position, Individual Rating, Adjectival Rating, Status (Released / Pending)
- Computed office average score (live, updates as employees get released)
- Dept Head remarks textarea (optional)
- Submit button (with readiness check)

### Sidebar Entry
**Name:** `OPCR Accomplishment`
**Icon:** `bi-building-check`
**Position:** After `Accomplishment Review` in the Dept Head sidebar

---

## Page 2 — PMT: OPCR Accomplishment List

### Purpose
PMT overview of all office OPCR accomplishment submissions.

### Data Shown
- List of all offices with their submission status
- Columns: Office Name, Period, Employees Released (X/Y), Computed Rating, Status badge, Action button
- Filter pills: All / Pending Review / Released / Returned

### Sidebar Entry
**Name:** `OPCR Accomplishment`
**Icon:** `bi-building-check`
**Position:** After `Accomplishment Review` in PMT sidebar

---

## Page 3 — PMT: OPCR Accomplishment Detail

### Purpose
PMT reviews one office's submission, sees all employee ratings, and releases the official office rating.

### Data Shown
- Office name, period, Dept Head name
- Computed office rating with score circle
- Full employee ratings table: Name, Position, Individual Rating, Adjectival, Released Date
- Dept Head remarks
- PMT action buttons: Release (as-is) | Calibrate & Release | Return

---

## UI/UX Specifications

### Design System (matches existing app)

**Colors — Dark Mode (default)**
```
Background primary:   #0a0f1a
Background secondary: #0f1724
Card background:      rgba(16,23,34,0.96)
Border:               rgba(140,171,214,0.12)
Border strong:        rgba(59,130,246,0.22)
Text primary:         #f4f8ff
Text secondary:       #a5b4cf
Text muted:           #6f83a6
Accent (blue):        #3b82f6
Success (green):      #4ade80
Warning (amber):      #f59e0b
Danger (red):         #ef4444
Purple (calibration): #a78bfa
```

**Colors — Light Mode**
```
Background primary:   #f0f4ff
Background secondary: #e8edf8
Card background:      rgba(255,255,255,0.96)
Border:               rgba(59,130,246,0.14)
Text primary:         #0f172a
Text secondary:       #334155
Text muted:           #64748b
Accent (blue):        #2563eb
```

**Typography:** Inter, system-ui, sans-serif
**Border radius:** 12px (cards), 99px (pills/badges), 8px (inputs/buttons)
**Shadow:** `0 18px 40px rgba(0,0,0,0.28)` dark / `0 18px 40px rgba(0,0,0,0.08)` light

---

## Responsive Layout Specifications

### Page 1 — Dept Head OPCR Accomplishment

#### Desktop (1280px+)
```
┌─────────────────────────────────────────────────────────┐
│  OPCR Accomplishment          Period: FY 2026    [Draft] │
├──────────────────────┬──────────────────────────────────┤
│  Office Summary      │  Computed Office Rating           │
│  ┌────────────────┐  │  ┌────────────────────────────┐  │
│  │ 4 / 6          │  │  │   ◉ 3.85                   │  │
│  │ Employees      │  │  │   Very Satisfactory        │  │
│  │ Released       │  │  │   (based on 4 released)    │  │
│  └────────────────┘  │  └────────────────────────────┘  │
├──────────────────────┴──────────────────────────────────┤
│  Employee Ratings                                        │
│  ┌──────────────────────────────────────────────────┐   │
│  │ Name       Position    Rating  Adjectival  Status │   │
│  │ Juan D.    Analyst     4.00    VS           ✅     │   │
│  │ Maria S.   Clerk       3.50    VS           ✅     │   │
│  │ Pedro R.   Encoder     —       —            ⏳     │   │
│  └──────────────────────────────────────────────────┘   │
├─────────────────────────────────────────────────────────┤
│  Remarks (optional)                                      │
│  ┌─────────────────────────────────────────────────┐    │
│  │ textarea                                        │    │
│  └─────────────────────────────────────────────────┘    │
│                              [Submit to PMT →]           │
└─────────────────────────────────────────────────────────┘
```
- Layout: 2-column grid for summary cards (top), full-width table (middle), full-width form (bottom)
- Table: all columns visible, sticky header
- Submit button: right-aligned, bottom of page

#### iPad (768px – 1279px)
```
┌──────────────────────────────────────────┐
│  OPCR Accomplishment   FY 2026   [Draft] │
├──────────────┬───────────────────────────┤
│  4/6 Released│  ◉ 3.85 Very Satisfactory │
├──────────────┴───────────────────────────┤
│  Employee Ratings Table                  │
│  (Name | Rating | Adjectival | Status)   │
│  (Position column hidden on iPad)        │
├──────────────────────────────────────────┤
│  Remarks textarea                        │
│  [Submit to PMT]                         │
└──────────────────────────────────────────┘
```
- Summary cards: side-by-side row (2 cols)
- Table: hide Position column, keep Name/Rating/Adjectival/Status
- Sidebar: collapsible (icon-only mode available)

#### Mobile (< 768px)
```
┌──────────────────────────┐
│ ← OPCR Accomplishment    │
│ FY 2026 · [Draft badge]  │
├──────────────────────────┤
│ ┌────────┐  ┌──────────┐ │
│ │ 4/6    │  │ ◉ 3.85   │ │
│ │Released│  │ Vry Sat. │ │
│ └────────┘  └──────────┘ │
├──────────────────────────┤
│ Employee Ratings         │
│ ┌──────────────────────┐ │
│ │ Juan D.              │ │
│ │ 4.00 · VS · ✅       │ │
│ ├──────────────────────┤ │
│ │ Maria S.             │ │
│ │ 3.50 · VS · ✅       │ │
│ ├──────────────────────┤ │
│ │ Pedro R.             │ │
│ │ — · — · ⏳ Pending   │ │
│ └──────────────────────┘ │
├──────────────────────────┤
│ Remarks (optional)       │
│ [textarea]               │
├──────────────────────────┤
│ [Submit to PMT →] (full) │
└──────────────────────────┘
```
- Summary cards: 2-column grid (small cards)
- Table replaced with: stacked card list per employee (name bold, rating + adjectival + status on second line)
- Submit button: full width, sticky bottom on mobile
- Sidebar: hamburger overlay (existing behavior)

---

### Page 2 — PMT OPCR Accomplishment List

#### Desktop (1280px+)
```
┌──────────────────────────────────────────────────────────┐
│  OPCR Accomplishment                    [search input]   │
│  5 pending review · 12 total                             │
├──────────────────────────────────────────────────────────┤
│  [All] [Pending Review] [Released] [Returned]            │
├──────────────────────────────────────────────────────────┤
│  Office Name          Period   Released  Rating  Status  │
│  ────────────────────────────────────────────────────── │
│  HRMO                 FY 2026  6/6       3.85 VS  ●      │
│  Finance              FY 2026  5/8       3.20 S   ●      │
│  Records              FY 2026  4/4       4.10 VS  ●      │
└──────────────────────────────────────────────────────────┘
```
- Table layout with sortable columns
- Status badge color: amber=pending, green=released, red=returned
- Each row clickable → navigates to detail

#### iPad (768px – 1279px)
- Same table but Released column shows as "X/Y" chip
- Rating column shows score only (adjectival hidden)
- Full-width table, horizontal scroll if needed

#### Mobile (< 768px)
- Table replaced with card list:
```
┌──────────────────────────┐
│ Human Resource Mgmt      │
│ FY 2026 · 6/6 Released   │
│ 3.85 · ● Pending Review  │
└──────────────────────────┘
```
- Each card: office name (bold), period + released count, rating + status badge
- Filter pills: horizontal scroll row

---

### Page 3 — PMT OPCR Accomplishment Detail

#### Desktop (1280px+)
```
┌──────────────────────────────────────────────────────────┐
│ ← Back    HRMO — FY 2026         [Pending Review badge] │
│ Head of Office: Maria Santos                             │
├─────────────────────────────────────────┬────────────────┤
│  Computed Office Rating                 │  Dept Head     │
│  ┌──────────────────────────────────┐   │  Remarks card  │
│  │  ◉ 3.85   Very Satisfactory     │   │                │
│  │  Based on 6 of 6 employees      │   │                │
│  └──────────────────────────────────┘   │                │
├─────────────────────────────────────────┴────────────────┤
│  Employee Ratings Breakdown                              │
│  ┌────────────────────────────────────────────────────┐  │
│  │ Name         Position   Rating  Adjectival  Date   │  │
│  │ Juan D.      Analyst    4.00    VS           Jun 5  │  │
│  │ Maria S.     Clerk      3.50    VS           Jun 5  │  │
│  │ Pedro R.     Encoder    4.20    VS           Jun 6  │  │
│  └────────────────────────────────────────────────────┘  │
├──────────────────────────────────────────────────────────┤
│  [Return]       [Calibrate & Release]    [Release →]     │
└──────────────────────────────────────────────────────────┘
```
- 2-column top section: score circle left, remarks right
- Full-width employee table below
- 3 action buttons bottom-right (Return left, Calibrate & Release center, Release right)

#### iPad (768px – 1279px)
- Summary card: full width (score circle + rating side by side)
- Dept Head remarks below summary card
- Employee table: hide Date column, keep Name/Rating/Adjectival/Status
- Action buttons: full width row

#### Mobile (< 768px)
```
┌──────────────────────────┐
│ ← Back                   │
│ HRMO                     │
│ FY 2026 · [Pending badge]│
├──────────────────────────┤
│ ◉ 3.85 Very Satisfactory │
│ Based on 6/6 employees   │
├──────────────────────────┤
│ Dept Head Remarks        │
│ "..."                    │
├──────────────────────────┤
│ Employee Ratings         │
│ ┌──────────────────────┐ │
│ │ Juan D.              │ │
│ │ 4.00 · VS            │ │
│ ├──────────────────────┤ │
│ │ Maria S.             │ │
│ │ 3.50 · VS            │ │
│ └──────────────────────┘ │
├──────────────────────────┤
│ [Return]                 │
│ [Calibrate & Release]    │
│ [Release] ← full width   │
└──────────────────────────┘
```
- Score circle: centered, prominent
- Employee list: stacked cards (name + rating on one line)
- Action buttons: stacked full-width on mobile (Release on top, most prominent)

---

## Component Inventory

| Component | Used On | Notes |
|---|---|---|
| `ScoreCircle` | All pages | SVG ring chart, reuse from Accomplishment module |
| `PipelineStepper` | Not used | OPCR accomplishment has simpler flow (no stepper needed) |
| Status Badge (pill) | All pages | Amber/green/red/blue pills |
| Progress Chip | Dept Head page | "X/Y Released" chip with color fill |
| Employee Rating Table | All pages | Responsive: table on desktop, cards on mobile |
| Calibrate & Release Modal | PMT Detail | Reuse pattern from individual accomplishment |
| Return Modal | PMT Detail | Reuse pattern from individual accomplishment |
| Remarks card | PMT Detail | Read-only italic text card with colored left border |
| Submit Confirmation Modal | Dept Head | Simple confirm before submitting |

---

## Color Usage by Status

| Status | Badge Color | Left Border | Background Tint |
|---|---|---|---|
| `draft` | `#94a3b8` grey | grey | none |
| `submitted` (pending PMT) | `#f59e0b` amber | amber | `rgba(245,158,11,0.05)` |
| `released` | `#4ade80` green | green | `rgba(74,222,128,0.04)` |
| `returned` | `#f87171` red | red | `rgba(239,68,68,0.04)` |

**Rating score color coding:**
- 4.5–5.0 → `#10b981` green (Outstanding)
- 3.5–4.49 → `#3b82f6` blue (Very Satisfactory)
- 2.5–3.49 → `#f59e0b` amber (Satisfactory)
- 1.5–2.49 → `#ef4444` red (Unsatisfactory)
- < 1.5 → `#ef4444` red (Poor)

---

## Light/Dark Mode Compatibility

All colors use CSS variables (`var(--admin-card)`, `var(--admin-text-primary)`, etc.) — no hardcoded background/text colors except for status/rating indicators which are semantic colors that remain consistent in both modes.

Cards: `background: var(--admin-card)` — auto switches between dark `rgba(16,23,34,0.96)` and light `rgba(255,255,255,0.96)`.

Borders: `var(--admin-border)` — subtle in both modes.

---

## Stitch AI Prototype Prompt

---

### FRAME 1 — Dept Head: OPCR Accomplishment (Desktop Dark Mode)

```
Design a desktop web app screen (1440x900) in dark mode for a Philippine government Performance Management System (PMS).

App shell:
- Left sidebar (280px wide, dark navy #0a0f1a) with navigation links. Active link highlighted in blue (#3b82f6) with blue left accent bar. Links: Dashboard, OPCR, QAR, UWP, Accomplishment Review, OPCR Accomplishment (active), Profile. Each link has a Bootstrap icon on the left.
- Top bar: page title "OPCR Accomplishment" left-aligned in white bold, user avatar + name "Maria Santos / Dept Head" right-aligned.
- Main content area background: dark navy with subtle blue radial gradient top-left.

Main content (inside cards with dark background rgba(16,23,34,0.96), border rgba(59,130,246,0.22), border-radius 12px):

TOP SECTION — two cards side by side:
Left card "Employee Release Progress":
- Large number "4 / 6" in white bold (2.5rem)
- Label "Employees Released" in muted blue-grey
- Progress bar below: 66% filled in blue (#3b82f6), grey track
- Small text "2 employees still pending PMT review"

Right card "Computed Office Rating":
- SVG ring chart (64px) showing score 3.85 in blue, ring 77% filled
- Label "PERFORMANCE SCORE" in muted uppercase tiny text
- Bold text "Very Satisfactory" below
- Small muted text "(based on 4 released employees)"

MIDDLE SECTION — full width card "Employee Ratings":
Table with columns: Name | Position | Individual Rating | Adjectival Rating | Status
4 rows of data:
Row 1: Juan dela Cruz | Administrative Analyst | 4.00 | Very Satisfactory | green checkmark badge "Released"
Row 2: Maria Reyes | Records Clerk | 3.50 | Very Satisfactory | green checkmark badge "Released"
Row 3: Pedro Santos | Data Encoder | — | — | amber clock badge "Pending"
Row 4: Ana Garcia | Administrative Aide | — | — | amber clock badge "Pending"
Table header in dark secondary background, sticky.

BOTTOM SECTION — full width card:
- Label "Remarks" uppercase muted small
- Textarea placeholder "Add optional remarks for PMT..."
- Right-aligned button "Submit to PMT →" in solid blue (#3b82f6), rounded-lg, white text, bold

Overall feel: clean dark government dashboard, professional, spacious padding, Inter font.
```

---

### FRAME 2 — Dept Head: OPCR Accomplishment (Mobile Dark Mode)

```
Design a mobile screen (390x844, iPhone 14 size) in dark mode for the same government PMS app.

Top: hamburger menu icon left, page title "OPCR Accomplishment" center, notification bell right. Background dark navy.

Content (scrollable, 16px padding):

SUMMARY ROW — two small cards side by side (equal width, gap 8px):
Left: "4/6" large white bold, "Released" muted small below
Right: "3.85" large blue bold, "Very Satisfactory" small below

EMPLOYEE LIST — card with title "Employee Ratings" (small uppercase muted label):
Stacked rows with bottom border divider. Each row:
- Employee name bold left (e.g. "Juan dela Cruz")
- Second line: score + adjectival + status badge (e.g. "4.00 · Very Satisfactory · ✅ Released")
- Pending rows show "— · Pending PMT" with amber clock icon
4 rows total.

REMARKS — card with textarea "Add remarks (optional)..."

SUBMIT BUTTON — full width, solid blue, "Submit to PMT →", 48px height, rounded-lg, sticky at bottom of screen above device home indicator bar.

Tight spacing, mobile-first, finger-friendly touch targets (min 44px).
```

---

### FRAME 3 — Dept Head: OPCR Accomplishment (iPad Light Mode)

```
Design an iPad screen (1024x768, landscape) in LIGHT mode for the same government PMS app.

Light mode colors:
- Background: #f0f4ff
- Cards: white rgba(255,255,255,0.96)
- Text primary: #0f172a
- Text muted: #64748b
- Accent: #2563eb
- Borders: rgba(59,130,246,0.14)

Left sidebar (collapsed to 68px icon-only mode): white background, active icon highlighted blue.
Top bar: white, shadow, "OPCR Accomplishment" title, user info right.

Two-column layout (60/40 split):
Left column:
- Summary card: "4 of 6 employees released" with blue progress bar
- Employee table (compact): Name | Rating | Status columns only (3 cols fit on iPad)

Right column:
- Score circle card: 3.85 blue ring, "Very Satisfactory" bold
- Remarks textarea
- "Submit to PMT" blue button (full width of right column)

Clean, airy light mode feel. Blue accent on active elements. Cards with light shadow.
```

---

### FRAME 4 — PMT: OPCR Accomplishment List (Desktop Dark Mode)

```
Design a desktop web app screen (1440x900) in dark mode for the PMT (Performance Management Team) role.

Same app shell as Frame 1 but PMT sidebar links: Dashboard, OPCR Review, QAR, Accomplishment Review, OPCR Accomplishment (active, highlighted blue), Development, Top Performers, Profile.

Main content — single card:

HEADER:
- Title "OPCR Accomplishment" bold white
- Subtitle "3 pending review · 8 total" muted
- Right: search input with search icon

FILTER PILLS (horizontal row):
[All] [Pending Review] [Released] [Returned]
"Pending Review" pill active: blue fill, blue border. Others: transparent with muted text.

OFFICE LIST (card rows, not a table):
Each office row (full width, 16px padding, rounded-lg, dark secondary background, blue left border for pending):
- Left: office initials avatar circle (blue background, white 2-letter initials)
- Center: office name bold, period + "X of Y employees released" muted below
- Right side: computed rating badge (e.g. "3.85 VS" in blue), status badge (amber "Pending Review"), chevron right icon

3 visible rows:
Row 1: "HRMO" | FY 2026 · 6/6 released | 3.85 VS | amber "Pending Review" | →
Row 2: "Finance Office" | FY 2026 · 5/8 released | 3.20 S | amber "Pending Review" | →  
Row 3: "Records Section" | FY 2026 · 4/4 released | 4.10 VS | green "Released" | →

Rows are clickable. Hover state: slight blue tint background.
```

---

### FRAME 5 — PMT: OPCR Accomplishment Detail (Desktop Dark Mode)

```
Design a desktop web app screen (1440x900) in dark mode for PMT reviewing one office's OPCR accomplishment.

Same PMT sidebar as Frame 4.

TOP CARD (full width):
- "← Back" small link top-left in muted blue
- Office name "Human Resource Management Office" bold large white
- Period "FY 2026" muted below
- Right: "Flagged for Calibration" purple pill badge + "Pending PMT Review" amber pill badge
- Pipeline: 3 steps inline — Draft (checked blue) → Submitted (checked blue) → Released (current, award icon, blue glow ring, label "Released" blue bold)

SECOND ROW — two cards side by side:
Left card (60%) "Computed Office Rating":
- Large ScoreCircle (80px) showing 3.85 in blue (#3b82f6), ring 77% filled
- "COMPUTED SCORE" tiny uppercase muted label
- "Very Satisfactory" bold white 1.1rem
- "Based on 6 of 6 employees" muted small

Right card (40%) "Dept Head Remarks" (if any):
- Green left border (3px)
- "DEPT HEAD REMARKS" tiny uppercase green label
- Italic text content

EMPLOYEE RATINGS TABLE — full width card:
Header: "Employee Ratings Breakdown" bold
Table columns: Name | Position | Individual Rating | Adjectival Rating | Released Date
6 data rows with alternating subtle row backgrounds.
Rating cells color-coded: green for Outstanding/VS, amber for Satisfactory, red for US/Poor.

ACTION BAR — bottom, flex row space-between:
Left: [Return] button — red border, red text, red tint background
Right group: [Calibrate & Release] purple button (outline) | [Release] solid blue button large

Generous spacing, professional PMT review screen feel.
```

---

### FRAME 6 — PMT: Calibrate & Release Modal (Desktop Dark Mode)

```
Design a modal overlay on top of the OPCR Accomplishment Detail screen (Frame 5) in dark mode.

Background: Frame 5 blurred and darkened (rgba(0,0,0,0.55) overlay).

Modal card (480px wide, centered, dark background rgba(16,23,34,0.98), border rgba(59,130,246,0.22), border-radius 12px):

MODAL HEADER:
- "Calibrate & Release" bold white left
- "Human Resource Management Office — FY 2026" muted small below title
- X close button top-right

BODY:

Computed vs Calibrated side-by-side comparison:
Left box (dark secondary): 
- "COMPUTED SCORE" tiny muted uppercase
- "3.85" large white bold
- "Very Satisfactory" muted small

Arrow icon → center

Right box (purple tinted: rgba(167,139,250,0.08), purple border):
- "CALIBRATED RATING" tiny purple uppercase
- "4.00" large purple bold (updates live as user types)
- "Very Satisfactory" purple small

Rating input:
- Label "Final Rating (1.00 – 5.00)" muted uppercase small, required asterisk red
- Number input, large font, blue border on focus

Adjectival rating pills row:
[Outstanding] [Very Satisfactory] [Satisfactory] [Unsatisfactory] [Poor]
Active pill: purple fill + purple border. "Very Satisfactory" active.

Calibration Remarks textarea:
- Label "Calibration Remarks *" muted uppercase
- Placeholder "Explain the basis for the calibrated rating..."
- Red border when empty

FOOTER:
- [Cancel] grey outline left
- [Calibrate & Release] purple solid right, patch-check icon, bold

Modal shadow: 0 24px 60px rgba(0,0,0,0.5)
```

---

### FRAME 7 — PMT: OPCR Accomplishment Detail (Mobile Dark Mode)

```
Design a mobile screen (390x844) in dark mode for PMT reviewing one office's OPCR accomplishment.

Top bar: "← Back" left, "OPCR Accomplishment" center, bell icon right.

Scrollable content (16px side padding):

HEADER CARD:
- Office name "HRMO" bold large
- "FY 2026" muted below
- Status badges: amber "Pending Review" + purple "Flagged" stacked or wrapped

SCORE CARD (centered):
- Large ScoreCircle (80px) center-aligned, 3.85 blue
- "Very Satisfactory" bold centered below
- "Based on 6/6 employees" muted small centered

DEPT HEAD REMARKS card (if any): green left border, italic text

EMPLOYEE RATINGS — stacked card list (not table):
Each employee card row (rounded, dark secondary, bottom divider):
- Name bold
- "4.00 · Very Satisfactory" below in blue/green
- Released date muted right

ACTION BUTTONS — stacked full width at bottom:
[Return] — red outline, full width
[Calibrate & Release] — purple outline, full width  
[Release] — solid blue, full width, most prominent, 52px height
```

---

### FRAME 8 — Dept Head: Submit Confirmation Modal (Mobile Dark Mode)

```
Design a mobile modal (bottom sheet style, 390px wide) in dark mode.

Background: previous screen darkened.

Bottom sheet slides up from bottom (border-radius 20px top corners only):
- Drag handle bar at top center (small grey pill)
- Icon: large send icon in blue circle (52px circle, blue tint background)
- Title "Submit OPCR Accomplishment?" bold white 1rem
- Body text: "This will submit your office's accomplishment report to PMT for review. You will not be able to edit after submission." muted grey 0.85rem, line-height 1.55
- Two buttons full-width:
  [Cancel] — grey outline, 48px height
  [Confirm Submit] — solid blue, 48px height, send icon left, bold white text, blue background
- 24px bottom padding for safe area
```

---

## Implementation Checklist

### Backend
- [ ] Migration: `create_opcr_accomplishment_submissions_table`
- [ ] Model: `OpcraAccomplishmentSubmission`
- [ ] `DeptHead\OpcraAccomplishmentController` — index, submit, return
- [ ] `Pmt\OpcraAccomplishmentController` — index, show, release, calibrateAndRelease, return
- [ ] Routes: dept-head and pmt route groups
- [ ] Sidebar: add entries to both dept-head and pmt roleLinks in Sidebar.jsx

### Frontend
- [ ] `DeptHead/OpcraAccomplishment/Index.jsx`
- [ ] `Pmt/OpcraAccomplishment/Index.jsx`
- [ ] `Pmt/OpcraAccomplishment/Show.jsx` (with Calibrate & Release modal + Return modal)
