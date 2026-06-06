# Monthly Performance Output Report (MPOR) — Functionality Documentation

This document covers the full functionality of the Employee MPOR module, including how it receives and aggregates rated ORS entries, the submission/approval/endorsement workflow, supervisor actions, and a description of the current UI/UX so you can redesign it cleanly in Stitch AI.

---

## What MPOR Is

The MPOR is a **read-only aggregation report** that summarizes an employee's rated ORS entries for a given calendar month. It is automatically computed from rated ORS entries — the employee does not input any numbers manually. The employee's only action is to **Submit** the MPOR once they're satisfied that all ORS entries for the month have been rated.

---

## Database Tables

### `mpors`
One row per employee per month.

| Column | Type | Description |
|---|---|---|
| `id` | bigint PK | |
| `employee_id` | FK → users | |
| `office_id` | unsigned bigint | |
| `month` | string(7) | Format: `YYYY-MM` (e.g. `2026-01`). Unique per employee. |
| `status` | string | `draft`, `submitted`, `approved`, `endorsed`, `returned` |
| `generated_at` | timestamp (nullable) | When the MPOR record was first created |
| `submitted_at` | timestamp (nullable) | When the employee submitted |
| `approved_by` | FK → users (nullable) | Supervisor who approved |
| `approved_at` | timestamp (nullable) | |
| `endorsed_by` | FK → users (nullable) | Supervisor who endorsed to dept head |
| `endorsed_at` | timestamp (nullable) | |
| `returned_by` | FK → users (nullable) | Supervisor who returned |
| `returned_at` | timestamp (nullable) | |
| `return_remarks` | text (nullable) | Reason for returning |
| `created_by` | FK → users (nullable) | |

Unique constraint on `(employee_id, month)` — one MPOR per employee per month.

---

## How MPOR Data Is Computed (from ORS)

The MPOR **does not store aggregated numbers** in its own table. Every time the MPOR page loads, it queries `ors_entries` live and computes the display.

### What entries are included

Only `ors_entries` that satisfy **all** of the following:
- `status = 'rated'`
- `quantity > 0` (numeric, employee-entered before submitting ORS)
- `work_date` falls within the MPOR month (e.g. 2026-01-01 to 2026-01-31)
- Has an `ors_entry_monitorings` record with both `quality_rating` and `timeliness_rating` not null

Everything else is excluded (draft, submitted-but-not-yet-rated, entries without quantity, entries without supervisor ratings).

### MPOR Calculation Formula

For each rated ORS entry:
- **Quantity column** = `entry.quantity` (raw value, e.g. 12 transactions)
- **Quality column** = `entry.quantity × monitoring.quality_rating`
- **Timeliness column** = `entry.quantity × monitoring.timeliness_rating`

### Week Assignment

The week number is determined by the day of the `work_date`:
- Day 1–7 → Week 1
- Day 8–14 → Week 2
- Day 15–21 → Week 3
- Day 22–31 → Week 4

### Row Grouping

ORS entries are grouped by `ipcr_item.output_title` (normalized to lowercase, trimmed). Each unique output title becomes one row in the MPOR table. The row label is the `output_title` from the committed IPCR.

### Section Grouping

Each row belongs to a section based on `ipcr_item.function_type`:
- `core` → Core Functions (typically 80%)
- `support` → Support Functions (typically 20%)

The weight percentages in the section labels come from `uwp_functions.weight_percent` via `ipcr_items.uwp_function_id`. If not available, defaults to `Core (80%)` / `Support (20%)`.

### Grand Totals

Sum of all sections per week and overall for qty, quality, timeliness.

---

## MPOR Status Lifecycle

```
[no record] → draft (implicit) → submitted → approved → endorsed
                                      ↕
                                  returned → (employee logs more ORS) → submitted (resubmit)
```

| Status | Who Sets It | Meaning |
|---|---|---|
| `draft` | (implicit / no MPOR record yet) | Employee hasn't submitted yet |
| `submitted` | Employee | Sent to supervisor for review |
| `returned` | Supervisor | Sent back to employee with optional remarks |
| `approved` | Supervisor | Supervisor verified the MPOR |
| `endorsed` | Supervisor | Forwarded to Department Head for QAR |

---

## Employee MPOR Page — Current UI/UX Description

> This section describes what the current UI does so you can redesign it in Stitch AI.

### Page URL
`/employee/mpor?month=YYYY-MM`

The month defaults to the current calendar month. There is no month-picker UI in the current implementation — the month is passed via URL query param only.

### Page Layout (current — messy, not responsive)

**Top section:** Page title "MONTHLY PERFORMANCE OUTPUT REPORT" in all-caps large text + 3 info chips (Name, Office/Division, Month). Action buttons (Submit MPOR / Export PDF) to the right of the title.

**Mobile view (< lg):** A separate "Mobile Workspace" section with:
- 3 tabs to switch metric view: Quantity / Quality / Timeliness
- A dropdown to filter by section (All / Core / Support)
- Accordion-style cards, one per output row, that expand to show weekly breakdown (W1–W4 + Total)

**Desktop view (>= lg):** A full-width overflow-scrollable table with sticky first column and sticky header.
- Column groups: Output/Task | Efficiency/Quantity (W1 W2 W3 W4 Total) | Quality/Effectiveness (W1 W2 W3 W4 Total) | Timeliness (W1 W2 W3 W4 Total)
- Section header rows within the table body (Core Functions / Support Functions)
- Sticky left column for output label

**Bottom section (below table):**
- Left card: Grand total row (qty per week, total), count of included vs excluded ORS entries
- Right card: Confirmation signatures block (Supervisor name, Employee name)

**Alerts:**
- Amber warning banner if there is no committed IPCR or no data
- Rose/red banner if MPOR was returned by supervisor, with return remarks visible

**Submit MPOR button:** Opens a confirmation modal dialog. The modal has a Cancel and Proceed Submission button. On submit, the button shows a loading spinner.

**After submit:** Submit button is replaced by a disabled "Submitted" button. No page redirect.

### Problems with current UI (to fix in redesign)
- Mobile tabs + accordion work but are visually cluttered and hard to scan
- Desktop table is extremely wide (15 data columns) — horizontal scroll required on most screens
- No month selector/switcher on the page (only via URL)
- Signature block is static placeholder text, not interactive
- Export PDF button actually routes to Excel export (mislabeled)
- No visual distinction between zero values and actual data
- Grand totals card is plain and lacks visual hierarchy
- Action buttons are inconsistently sized between mobile and desktop

---

## Employee MPOR: Submit Action

**Route:** `POST /employee/mpor/submit`

### Validation / Pre-conditions

1. Month must be in `YYYY-MM` format.
2. Employee must have an active IPCR (`status` in `committed` or `for_commitment`) for the active performance period.
3. There must be at least one rated ORS entry (status = `rated`, quantity > 0, work_date in the month, monitoring ratings not null).
4. MPOR must not already be `submitted`, `approved`, or `endorsed`.

### On Success

- If an MPOR record exists for the employee+month → updates status to `submitted`, sets `submitted_at`.
- If no record exists → creates a new MPOR with `status = submitted`.
- Clears `approved_*`, `endorsed_*`, `returned_*` fields (fresh submission).
- All supervisors in the **same office** (`office_id` match, `role = supervisor`) receive a **WorkflowEventNotification** (event: `mpor.submitted_to_supervisor`, type: `info`) with a link to the supervisor MPOR list.

### Resubmit (after return)

Same endpoint + same logic. Works because the guard only blocks `submitted/approved/endorsed`, not `returned`.

---

## Supervisor MPOR Module

### MPOR List Page
**Route:** `GET /supervisor/mpor`

Shows a table of MPORs from employees in the **same office** as the supervisor (`office_id` match).

**Filters:**
- **Search** (text input): filters by employee name (debounced, 300ms)
- **Month** (month picker input): filters by `mpor.month` — reloads the table via AJAX (returns JSON `{ html: '...' }`)

**Table columns:**
- Employee avatar + name + position
- Status badge (blue = submitted, green = approved, violet = endorsed)
- View button → navigates to MPOR detail page

Only MPORs with `status` in `[submitted, approved, endorsed]` are shown.

### MPOR Detail / Review Page
**Route:** `GET /supervisor/mpor/{mpor}`

Read-only mirror of the employee MPOR view. Same table layout (desktop table + mobile cards). Same grand totals and KPI cards. Shows return remarks if any. Has a status badge at the top.

**Action panel at bottom (depends on status):**

| MPOR Status | Actions Available |
|---|---|
| `submitted` | **Approve MPOR** + **Return to Employee** (with optional remarks textarea) |
| `approved` | **Endorse to Department Head** |
| `endorsed` | View-only, no actions |
| `returned` | View-only |

All actions are AJAX (JSON). The action panel updates in-place without a page reload.

---

## Supervisor MPOR Actions

### Approve
**Route:** `POST /supervisor/mpor/{mpor}/approve`
- MPOR must be `submitted`.
- Sets `status = approved`, `approved_at = now()`, `approved_by = supervisor_id`.
- Clears `endorsed_*` and `returned_*` fields.
- No notification sent (current implementation).

### Return to Employee
**Route:** `POST /supervisor/mpor/{mpor}/return`

**Validation:**
- `return_remarks` — nullable, string, max 2000

- MPOR must be `submitted`.
- Security: supervisor's `office_id` must match the MPOR employee's `office_id`.
- Sets `status = returned`, `returned_at`, `returned_by`, `return_remarks`.
- Clears `submitted_at`, `approved_*`, `endorsed_*`.
- Employee receives **WorkflowEventNotification** (event: `mpor.returned_to_employee`, type: `alert`) with link back to their MPOR page.

### Endorse to Department Head
**Route:** `POST /supervisor/mpor/{mpor}/endorse`
- MPOR must be `approved`.
- Sets `status = endorsed`, `endorsed_at = now()`, `endorsed_by = supervisor_id`.
- Department Head receives **WorkflowEventNotification** (event: `mpor.endorsed_to_dept_head`, type: `info`) with link to the QAR page.

---

## Notifications Summary

| Event | Trigger | Recipient | Type |
|---|---|---|---|
| `mpor.submitted_to_supervisor` | Employee submits MPOR | All supervisors in same office | `info` |
| `mpor.returned_to_employee` | Supervisor returns MPOR | Employee | `alert` |
| `mpor.endorsed_to_dept_head` | Supervisor endorses MPOR | Department Head | `info` |

---

## Key Business Rules

1. MPOR is **computed on-the-fly** from rated ORS entries — no separate data entry by the employee.
2. An entry is only included if it is `rated`, has `quantity > 0`, has both quality and timeliness ratings from the supervisor.
3. The month format stored is `YYYY-MM`. The unique constraint `(employee_id, month)` means one MPOR per employee per month.
4. Only supervisors in the **same office** can see and act on an employee's MPOR.
5. Submitting is blocked if there are zero qualifying rated ORS entries.
6. A returned MPOR can be resubmitted (same endpoint, status resets to `submitted`).
7. Approval → Endorsement is sequential: must be approved before it can be endorsed.
8. MPOR locking (from ORS perspective): once MPOR is `submitted/approved/endorsed`, the employee's ORS entries for that month are MPOR-locked (see ORS.md).

---

## What to Build in the Redesign

When rebuilding in Stitch AI (or your new project), keep the following in mind:

### Data Model — no changes needed
The 3-table approach (ors_entries → ors_entry_monitorings → mpors) is clean. Just rebuild the UI.

### Recommended UI improvements

**Employee MPOR page:**
- Add a month picker/switcher on the page itself (not just URL)
- Use a single responsive table that collapses on mobile (not a separate mobile/desktop layout)
- Use visual color coding for zero vs non-zero cells
- Show the included/excluded entry count prominently as a summary stat
- Make the Grand Totals row a visually distinct "footer" row in the table
- Make the Submit MPOR confirm modal cleaner (show what month, current count of included entries)
- "Export" label should say what format it actually exports (PDF or Excel)

**Supervisor MPOR list:**
- Add pagination or virtual scrolling for large offices
- Show employee's total rated entries count in the list (it's already queried as `rated_ors_entries_count`)
- Filter by status tabs (currently all three statuses are shown together)

**Supervisor MPOR detail:**
- Make the action panel a sticky footer or sidebar, not buried at the bottom of a long page
- Return remarks textarea should be shown inline, not hidden until you scroll
- Status timeline / breadcrumb (Submitted → Approved → Endorsed) so supervisor knows where they are
