# Individual Development Plan (IDP) Module — Planning Document

## Overview

The IDP module is the **employee-facing stage** of the Development Planning workflow.
After PMT releases an official performance score that lands a user in "Low Performer" status,
the employee receives an IDP record (created by PMT) and is required to fill it out.
The module lives at `/employee/idp`.

---

## Page Count Decision: 1 Page (with conditional states)

**1 page is enough.** The IDP module is simple in scope. The page should adapt its
layout to three _states_:

| State | Condition | What Employee Sees |
|---|---|---|
| **Empty** | No IDP record exists for current period | Informational illustration, "No IDP assigned yet" message |
| **Fill-up** | IDP record exists, status is `pending_details` | Editable IDP form |
| **Submitted/Locked** | Status is `submitted_to_ld` | Read-only view + Excel export button |

No need for a list/index page since an employee can only have **one IDP per performance period**
(the DB already enforces `UNIQUE(ipcr_id)`).

---

## Page Architecture

```
/employee/idp
└── IdpIndex.jsx
    ├── State: EmptyState       → "No IDP assigned" card
    ├── State: IdpForm          → Editable card-based form (pending_details)
    │   ├── HeaderCard          → Employee info + score ring + PMT remarks banner
    │   ├── GoalCards           → One card per IDP row (dynamic add/remove)
    │   │   └── GoalCard        → 6 fields in 2-col (desktop) or 1-col (mobile) grid
    │   ├── AddGoalButton       → Dashed full-width button
    │   └── StickyActionBar     → Save Draft + Submit IDP
    └── State: IdpReadOnly      → Locked card view + Export to Excel button
```

> **Note:** The digital form has NO signature section. Signatures (Prepared by / Recommended by / Approved by) are generated automatically in the **Excel export only** based on the employee, their supervisor, and the PGDH from the office record.

---

## UI Layout — Responsive Behavior

### Desktop (≥1024px)
- Full-width page with `max-width: 960px` centered content
- Header card: employee avatar + info on the left, score ring + rating badge on the right (flex row)
- IDP rows as a **scrollable horizontal table** (all 6 columns visible)
- Signature section: 3 columns side-by-side
- Sticky action bar at the bottom

### Tablet (768–1023px)
- Header card: stacked (avatar + info top, score ring below)
- IDP rows table: horizontally scrollable with column headers pinned to left
- Signature section: 2 columns + 1 below
- Action bar: full-width sticky bottom buttons

### Mobile (<768px)
- Header card: compact horizontal strip (small avatar + name + badge)
- IDP rows: **Card-per-row layout** (each row becomes a card with labeled fields stacked vertically)
  — much better than a tiny horizontal-scrolling table on small screens
- Add row button: full width bottom CTA
- Signature section: 1 column stacked
- Sticky bottom bar with Save + Submit

---

## Components to Use / Reuse

| Component | Source | Usage |
|---|---|---|
| `AppLayout` | existing | Page wrapper |
| `useBreakpoint` | existing (`Components/useBreakpoint.js`) | Desktop/tablet/mobile layout switching |
| `Snackbar / useToast` | existing (`Components/Snackbar.jsx`) | Save / submit success & error feedback |
| `ConfirmDialog` | existing (`Components/ConfirmDialog.jsx`) | Confirm before final submit (irreversible) |
| `ScoreRing` (inline) | pattern from History/Index.jsx | Show the performance score that triggered IDP |
| Badge (inline) | pattern from History/Index.jsx | Show rating label (Poor / Unsatisfactory) |
| ReturnRemarksBanner | existing | Show PMT remarks if any |
| Bootstrap Icons (`bi-*`) | existing | All icons |

**New components to create inside `Pages/Employee/Idp/`:**
- `GoalCard.jsx` — single IDP goal card with 2-col (desktop) / 1-col (mobile) field layout
- No table component needed — card layout is used on all screen sizes

---

## IDP Form Fields (Annex H columns)

Each row in `idp_rows` JSON array:

| Field | Label | Input Type | Required |
|---|---|---|---|
| `performance_gap` | Performance Gap | `textarea` | Yes |
| `developmental_activity` | Developmental Activities | `textarea` | Yes |
| `support_needed` | Support Needed (financial, technical, etc.) | `textarea` | No |
| `support_from_supervisor` | Support Needed from Immediate Supervisor | `textarea` | No |
| `expected_completion` | Expected Date of Completion | `date` input | Yes |
| `results` | Results | `textarea` | No — filled AFTER IDP implemented |

**Minimum 1 row, max 10 rows.** Employee can add/remove rows dynamically.

---

## UX Flow

```
PMT initiates IDP  →  DevelopmentPlan record created (status: pending_details)
        ↓
Employee logs in   →  Notification badge on "My IDP" sidebar link
        ↓
Employee opens /employee/idp  →  Sees form with pre-filled header info
        ↓
Employee fills rows  →  Can Save Draft anytime (auto-save every 30s optional)
        ↓
Employee clicks Submit  →  ConfirmDialog: "Once submitted you cannot edit"
        ↓
Status → submitted_to_ld  →  Page shows read-only locked view
        ↓
Employee can Export to Excel (Annex H format)
```

---

## Database

### Existing Table: `development_plans` ✅ Already covers everything needed

```
development_plans
├── id
├── ipcr_id          FK → ipcrs (unique — 1 IDP per IPCR)
├── employee_id      FK → users
├── office_id        FK → offices
├── performance_period_id  FK → performance_periods
├── source_score     decimal  — snapshot of the score that triggered IDP
├── source_rating    string   — e.g. "Poor", "Unsatisfactory"
├── status           string   — draft | pending_details | submitted_to_ld
├── pmt_remarks      text     — PMT's note when initiating
├── idp_rows         json     — array of IDP row objects (see fields above)
├── prepared_by_name string   — auto-set to employee full name on submit
├── recommended_by_name string — supervisor name (from user relationship)
├── approved_by_name string   — PGDH name (from office head)
├── lnd_sync_status  string   — not_sent | sent | acknowledged | failed
├── submitted_to_ld_at  timestamp
└── timestamps
```

**No new migration needed.** The existing `idp_rows` JSON column stores all row data.
`prepared_by_name` is auto-populated from `auth()->user()->full_name`.
`recommended_by_name` can be pulled from the user's supervisor relationship.

### Relationships (already in model)
```
DevelopmentPlan
  belongsTo  Ipcr
  belongsTo  User (employee)
  belongsTo  Office
  belongsTo  PerformancePeriod
  belongsTo  User (creator / updater)
```

---

## API Endpoints (New)

```
GET    /employee/idp           → IdpController@index   (show current period IDP)
PATCH  /employee/idp/{id}      → IdpController@update  (save draft rows)
POST   /employee/idp/{id}/submit → IdpController@submit (finalize)
GET    /employee/idp/{id}/export → IdpExcelExportController@export (Excel download)
```

---

## Excel Export — Annex H Format

Follows the same PhpSpreadsheet pattern as `MporExcelExportController.php`:

**Sheet layout:**
```
Row 1:    [Logo]           Individual Development Plan Form | Annex H
Row 2-4:  Employee Name, Position, Office, Rating Period
Row 5:    Column headers (bold, dark navy BG_HDR = FF1F3864, white text)
Row 6+:   IDP data rows (alternating subtle background)
Last rows: Prepared by / Recommended by / Approved by signature block
```

**Styling constants (same as existing exports):**
```php
BG_HDR     = 'FF1F3864'  // dark navy headers
BG_SECTION = 'FF2F5597'  // accent blue
FG_WHITE   = 'FFFFFFFF'
BDR_BLACK  = 'FF000000'
```

**Column widths:**
| Col | Label | Width |
|---|---|---|
| A | Performance Gap | 35 |
| B | Developmental Activities | 35 |
| C | Support Needed | 25 |
| D | Support from Supervisor | 25 |
| E | Expected Date of Completion | 18 |
| F | Results | 25 |

Excel file name: `IDP_{EmployeeName}_{Period}.xlsx`

---

## Notification Integration

Add to `EVENT_ROUTE` in `AppLayout.jsx` and `Sidebar.jsx`:
```js
'development_plan.assigned_to_employee': '/employee/idp',
```

The PMT side already dispatches `development_plan.submitted_to_ld` — a matching
employee notification event `development_plan.assigned_to_employee` should be fired
when PMT creates/initiates the IDP record.

---

## Status Badges

| Status | Label | Color |
|---|---|---|
| `pending_details` | Pending Fill-up | Amber `#f59e0b` |
| `submitted_to_ld` | Submitted | Green `#10b981` |
| `draft` | Draft | Muted gray |

---

## Stitch AI Prototype Prompt

```
Design a responsive web app page called "My IDP" (Individual Development Plan) for a government HR employee portal.
Do NOT include a sidebar — design only the main content area to the right of it.

DESIGN SYSTEM:
- Font: Inter
- Accent color: #3b82f6 (blue)
- Background: #0a0f1a (dark), cards: #0f1724, borders: rgba(140,171,214,0.12)
- Text primary: #f4f8ff, text muted: #6f83a6
- Border radius: 12px
- Show DARK MODE

Show TWO artboards side by side: Desktop (1280px wide) and Mobile (390px wide).

═══════════════════════════════════════
DESKTOP ARTBOARD
═══════════════════════════════════════

[PAGE HEADER]
- Page title "My IDP" (bold, 1.4rem) + subtitle "Individual Development Plan · Jan–Jun 2026"
- Right side: a blue outlined "Export to Excel" button with a download/spreadsheet icon

[EMPLOYEE INFO CARD]
- Horizontal card, subtle left border in red (#ef4444, 3px)
- Left: circular avatar (40px), name "Carlos Mendoza" (bold), "HR Assistant II · Human Resource Management Office"
- Right: a small circular score ring showing "0.68" in red, label "PERFORMANCE SCORE" in tiny caps, red pill badge "Poor"
- Full-width amber/yellow info bar below the name row:
  icon ⚠ + text "PMT Remarks: Please fill out your IDP based on your performance gaps this period."

[SECTION TITLE]
- "Development Goals" label (small caps, muted, with a horizontal rule)
- Muted helper text: "Add one goal per performance gap. Be specific about activities and support needed."

[GOAL CARDS — 2 example cards stacked vertically, full width]
Each card:
- Card background slightly lighter than page bg, border 1px solid border color, border-radius 12px, padding 1.25rem
- Top row: bold label "Goal #1" on the left + small red trash/delete icon button on the right
- Below: a 2-column grid layout (left col and right col, equal width, gap 1rem):
  LEFT COLUMN:
    - Label "Performance Gap" (small, muted, uppercase) + multiline textarea (3 rows, filled with example text like "Lack of proficiency in financial reporting and data analysis")
    - Label "Support Needed" (small, muted, uppercase) + multiline textarea (2 rows, placeholder "e.g. financial resources, training materials...")
    - Label "Support from Immediate Supervisor" (small, muted, uppercase) + multiline textarea (2 rows, placeholder "e.g. weekly check-ins, coaching sessions...")
  RIGHT COLUMN:
    - Label "Developmental Activities" (small, muted, uppercase) + multiline textarea (4 rows, filled with "Attend online course on financial reporting. Shadow senior analyst for 2 weeks.")
    - Label "Expected Date of Completion" (small, muted, uppercase) + date input field (styled, value "2026-09-30")
    - Label "Results" (small, muted, uppercase) + multiline textarea (2 rows, placeholder "To be filled after implementation...") with a muted italic hint below: "Fill this in after the activity is completed"

Second card same layout, "Goal #2", slightly different example text. Textareas are empty/placeholder state.

[ADD GOAL BUTTON]
- Full-width dashed-border button, blue text, "＋ Add Development Goal", border-radius 12px, height 48px

[STICKY BOTTOM ACTION BAR]
- Fixed to bottom of the content area, blurred background
- Left side: small muted text with a lock icon: "Submitted forms cannot be edited"
- Right side: "Save Draft" outlined button + "Submit IDP" solid blue button (with arrow icon)

═══════════════════════════════════════
MOBILE ARTBOARD (390px)
═══════════════════════════════════════

[PAGE HEADER]
- "My IDP" title + "Jan–Jun 2026" subtitle stacked
- "Export Excel" icon-only button (top right, icon only, no label)

[EMPLOYEE INFO CARD]
- Compact: avatar + name + rating stacked, score ring small (48px) top right
- PMT Remarks amber bar below, wraps text

[SECTION TITLE + helper text — same as desktop]

[GOAL CARDS — same card design but single column layout]
Each card:
- "Goal #1" + delete icon
- All 6 fields stacked vertically in single column
- Field order: Performance Gap → Developmental Activities → Support Needed → Support from Supervisor → Expected Date → Results
- Textareas slightly smaller

[ADD GOAL — full width dashed button]

[STICKY BOTTOM BAR]
- Stacked on mobile: full-width "Submit IDP" button on top, full-width "Save Draft" below it
- Lock disclaimer above both buttons, centered, small

Use Bootstrap Icons (bi-*) for all icons.
Clean, modern aesthetic. Subtle glassmorphism on cards. No table layout anywhere.
No signature/footer section in this form — signatures only appear in the exported Excel.
```

---

## Implementation Order (when ready to code)

1. `IdpController.php` — index, update (draft save), submit
2. `IdpExcelExportController.php` — Annex H Excel export
3. Add routes to `web.php`
4. `IdpIndex.jsx` — main page with 3 states (empty, form, read-only)
5. `IdpRowsTable.jsx` — desktop table component
6. `IdpRowCard.jsx` — mobile card component per row
7. Notification event wiring
8. Sidebar badge wiring
