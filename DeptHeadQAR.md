# Department Head — QAR (Quality Assurance Review / MPOR Consolidation)

This document covers every piece of functionality in the Dept Head QAR module: what it receives, how it consolidates, the database schema, the endorsement workflow, and a full description of the current UI/UX so you can redesign it cleanly.

---

## What This Module Does

The Dept Head QAR page is the **quarterly consolidation point** for all endorsed MPORs in the Dept Head's office. It aggregates rated ORS data from multiple employees across a full quarter (3 months) into a single **Annex I QAR** table — one row per IPCR indicator, showing actual performance vs target. Once the Dept Head is satisfied, they **endorse** the QAR to PMT for validation.

Your screenshot shows exactly this: the QAR list page filtering by `endorsed` status, with Employee name, Month, Endorsed date, Status badge, and a View button.

---

## Who Can Access It

Role: `dept_head`. The Dept Head only sees MPORs and QARs from their **own office** (`office_id` match).

---

## Database Tables

### `qar_headers`
One row per office per performance period per quarter. The "container" for a QAR.

| Column | Type | Description |
|---|---|---|
| `id` | bigint PK | |
| `office_id` | FK → offices | |
| `performance_period_id` | FK → performance_periods | |
| `quarter_key` | string(20) | Format: `YYYY-QN` e.g. `2026-Q1` |
| `status` | string | `draft`, `dept_head_endorsed`, `returned`, `pmt_approved` |
| `generated_at` | timestamp (nullable) | When QAR data was first computed |
| `generated_by` | FK → users (nullable) | |
| `approved_at` | timestamp (nullable) | When Dept Head endorsed |
| `approved_by` | FK → users (nullable) | |
| `pmt_status` | string | `pending`, `validated`, `returned` |
| `pmt_validated_at` | timestamp (nullable) | |
| `pmt_validated_by` | FK → users (nullable) | |

Unique constraint: `(office_id, performance_period_id, quarter_key)` — one QAR per office per quarter.

### `qar_rows`
The actual data rows of the Annex I QAR table. Written when Dept Head endorses.

| Column | Type | Description |
|---|---|---|
| `id` | bigint PK | |
| `qar_header_id` | FK → qar_headers | |
| `ppa_code` | string(50) | `ipcr_item.id` used as code |
| `mfo_title` | string | `ipcr_item.output_title` |
| `indicator_text` | text | `ipcr_item.indicator_text` |
| `target_quantity` | decimal (nullable) | From `ipcr_item.target_quantity` |
| `target_timeline` | string (nullable) | Formatted target sentence |
| `actual_performance` | decimal | Sum of `ors_entry.quantity` for all rated entries matching this indicator |
| `variance` | decimal (nullable) | `target_quantity - actual_performance` |
| `remarks` | text (nullable) | "Consolidated from multiple employee MPORs" |
| `sort_order` | integer | |

### `qar_mpor_links`
Snapshot of which MPORs were included in the QAR at the time of endorsement.

| Column | Type | Description |
|---|---|---|
| `id` | bigint PK | |
| `qar_header_id` | FK → qar_headers | |
| `mpor_id` | FK → mpors | |
| `employee_name` | string (nullable) | Snapshot of employee name |
| `month_label` | string (nullable) | e.g. "Jan 2026" |
| `status_label` | string (nullable) | MPOR status at time of link |

Unique: `(qar_header_id, mpor_id)`.

---

## Which MPORs Feed Into the QAR

The Dept Head QAR only ingests MPORs that are:
- `status = 'endorsed'` (supervisor has already endorsed them)
- `office_id` matches the Dept Head's office
- `month` falls within the selected quarter's 3-month range

The quarter months are computed from the active `PerformancePeriod`. Quarter N covers months `(N-1)*3+1` to `(N-1)*3+3` of the period's start year (e.g. Q1 = Jan/Feb/Mar, Q2 = Apr/May/Jun, etc.).

---

## How QAR Data Is Computed (Annex I)

The Annex I QAR table is built **on-the-fly** from rated ORS entries at page load time and again when endorsing. It is **not stored** until the Dept Head clicks Endorse.

### Process
For each endorsed MPOR in the quarter, pull all `ors_entries` where:
- `status = 'rated'`
- `quantity > 0`
- `work_date` in the MPOR's month
- Has `ors_entry_monitorings` record

For each matching entry, look up `ipcrItem.output_title` and `ipcrItem.indicator_text`. Group by `(output_title, indicator_text)` (normalized to lowercase). Sum `entry.quantity` into `actual_performance`.

### Row structure per output-indicator pair
- **PPA Code** — `ipcr_item.id`
- **MFO/PPA** — `ipcr_item.output_title`
- **Performance Indicator** — `ipcr_item.indicator_text`
- **Target / Timeline** — formatted as `"{target_quantity} {target_timeline}"` from IPCR item
- **Actual Performance** — sum of all matching `ors_entry.quantity` values across all included employees
- **Variance** — `target_quantity - actual_performance` (null if no target)
- **Remarks** — "Consolidated from multiple employee MPORs"

---

## Quarter Navigation

The page supports multiple quarters from the active performance period. Quarter tabs/links are rendered automatically based on the period's `start_date` and `end_date`. The `q` query parameter (1–4) selects the active quarter.

Quarter switching is done client-side via AJAX (fetches the page HTML, swaps the `#qarPageRoot` div content, pushes URL history state) — no full page reload.

---

## QAR Status Lifecycle

```
draft → dept_head_endorsed → (pmt_approved or returned)
```

| Status | Set By | Meaning |
|---|---|---|
| `draft` | Initial | QAR not yet endorsed |
| `dept_head_endorsed` | Dept Head | Endorsed to PMT; Annex I rows saved to DB |
| `pmt_approved` | PMT | Validated by PMT |
| `returned` | PMT | Returned by PMT for revision |

---

## Endorse QAR Action

**Route:** `POST /dept-head/qar/endorse`

### Pre-conditions
- Dept Head must have a valid `office_id`.
- Active `PerformancePeriod` must exist.
- At least one endorsed MPOR must exist for the quarter in the same office.
- QAR must not already be `dept_head_endorsed` or `pmt_approved`.

### What happens on Endorse
1. `QarHeader` is created or updated (`updateOrCreate`) with `status = dept_head_endorsed`, `approved_at`, `approved_by`.
2. All existing `QarRow` records for this header are **deleted and recreated** from the current live computation.
3. All existing `QarMporLink` records are **deleted and recreated** — one per included MPOR.
4. The office's OPCR and employee IPCRs (all `committed` status) are moved to `pending_pmt_calibration` status — this triggers the next workflow stage.
5. PMT role users receive a **WorkflowEventNotification** (event: `qar.endorsed_to_pmt`, type: `info`) with a link to the PMT QAR review page.

The endorse form submits via AJAX (JSON response). On success, the status badge updates in-place and the Endorse button disappears without a page reload.

---

## MPOR Detail View (inside QAR)

From the Incoming MPORs table, the Dept Head can click **View** on any MPOR. This navigates to a dedicated MPOR detail page (`/dept-head/qar/mpor/{mpor}`).

This is a **read-only** view of that employee's MPOR — same table layout as the supervisor MPOR detail (Qty/Quality/Timeliness by week, Core/Support sections, grand totals, KPI counters). No actions available — Dept Head cannot approve or return individual MPORs (that's the supervisor's job).

The page has a **Back to QAR** link that returns to the QAR page with the correct quarter.

Security: Dept Head can only view MPORs where the employee's `office_id` or the MPOR's `office_id` matches the Dept Head's own `office_id`.

---

## Current UI/UX — QAR List Page (your screenshot)

This is what your new project already shows. Here's what it maps to:

**Header:** "QAR — MPOR Review" title + Dept Head name/role in the top bar.

**Page card:** "QUALITY ASSURANCE REVIEW / MPOR Review" subtitle with icon.

**Filters row:**
- Search input (employee name)
- Month picker (date input, shows "---------- ----" when empty)
- Status dropdown ("All Status")

**Table columns:** Employee (avatar + name + position), Month, Endorsed (date), Status badge, View button.

The "Endorsed" column shows when the supervisor endorsed the MPOR (i.e. `mpor.endorsed_at`). The status badge shown is `ENDORSED` (violet).

### What's missing from your new UI vs the prototype

Your new design is **already better** than the prototype. The prototype QAR page is organized into 3 heavy sections (A, B, C) on a single scrolling page. Your design separates the list view cleanly. Here's what the prototype's QAR page has that needs to be in the full detail/consolidation view:

---

## Current UI/UX — QAR Consolidation Page (prototype, to redesign)

The prototype puts everything on one page at `/dept-head/qar`. It's split into 3 panels:

**Panel A — Incoming MPORs table**
- Columns: Employee, Month, Status badge (endorsed/approved/draft), Notes ("Auto-populated to QAR"), Actions (View button)
- Scrollable to `45vh` max height
- View button links to `/dept-head/qar/mpor/{id}` full MPOR detail page

**Panel B — QAR Summary stats**
- 4 stat cards: Included MPORs count, Included Employees count, Included Months (X/3), Data Source
- "Last updated" timestamp
- List of approved MPOR records (employee + month + status)

**Panel C — Annex I QAR Table**
- Columns: PPA Code, MFO/PPA, Performance Indicator, Target/Timeline, Actual Performance, Variance, Remarks
- Scrollable to `65vh`
- "Endorse QAR" button (top-right of this panel, disabled if no consolidated data)
- Footer: Prepared/Approved by (Dept Head name + date) | Validated by (PMT + status label)

**Endorse confirmation modal:** "Endorse QAR to PMT validation?" with Cancel and Proceed Endorse button + spinner.

**Quarter switcher:** Links for Q1/Q2/Q3/Q4 rendered at the top-right. Clicking switches via AJAX without full reload.

**Status badge:** Shows current QAR status (Draft / Dept Head Endorsed / PMT Approved).

**Problems with current UI:**
- All 3 panels on one long scrolling page — overwhelming
- No month filter on the list (only quarter tabs)
- Annex I table has 7 columns but no sticky columns — hard to scan horizontally
- The MPOR modal (inline in the same page) is extremely wide (15 data columns) and not readable on narrow screens
- No empty state design when there are no endorsed MPORs
- Quarter switcher doesn't show which quarter is selected visually enough
- The "Back to QAR" from MPOR detail navigates to a full separate page instead of a panel/drawer

---

## Notifications

| Event | Trigger | Recipient | Type |
|---|---|---|---|
| `qar.endorsed_to_pmt` | Dept Head endorses QAR | All PMT users | `info` |

---

## Key Business Rules

1. Only MPORs with `status = endorsed` are included — submitted/approved-only MPORs are not picked up.
2. The QAR consolidates **across employees** — all endorsed MPORs in the office for the quarter, not just one employee.
3. Annex I rows are grouped by `(output_title, indicator_text)` and summed — if 3 employees all did the same indicator, their quantities add up into one row.
4. Data is computed live at page load. It is only **persisted** (written to `qar_rows`) when the Dept Head endorses.
5. On endorse, OPCR and IPCR statuses for the office are automatically advanced to `pending_pmt_calibration`.
6. One QAR header per office per quarter — re-endorsing overwrites rows.
7. The Dept Head has **no approve/return action** on individual MPORs. That belongs to the supervisor. The Dept Head only endorses the consolidated QAR.
8. Dept Head can view any individual MPOR detail (read-only) from the incoming MPORs list.

---

## Redesign Recommendations for Stitch AI

Based on your screenshot (which is already a clean improvement), here's what to add for the full consolidation flow:

**QAR List page** (what you have):
- Add an "Endorse QAR" button at the top once all required MPORs are present
- Show a "X of 3 months covered" progress indicator per quarter
- Status filter should default to "Endorsed" (since that's what Dept Head acts on)

**QAR Consolidation / Detail page** (what you need to build):
- Show the quarter selector as tabs (Q1/Q2/Q3/Q4) with active state
- Summary stats row: MPORs included, Employees, Months covered, Last updated
- Annex I table: sticky first column (indicator text), clear Variance column with color (red = over target, green = met)
- Endorse button should be sticky/fixed or prominent — not buried below a long table
- Individual MPOR preview should be a side drawer or modal, not a separate page navigation
- Show the QAR status badge clearly (Draft → Endorsed → PMT Approved)
- On mobile: collapse the Annex I table into cards, hide variance until expanded
