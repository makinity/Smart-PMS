# Accomplishments Module — Functionality Documentation

This document covers the full Accomplishments module based on the **Philippine CSC SPMS (Strategic Performance Management System)** as defined under CSC Memorandum Circular No. 6, s. 2012. It describes what the module is made of (SMPOR + IPCR), how data flows from QAR through to final release, the complete submission workflow across all roles, the database design, and UI/UX specifications.

---

## What "Accomplishments" Is

The Accomplishments module is the **end-of-period formal submission** where an employee packages two system-generated documents and submits them through the CSC SPMS approval chain:

1. **SMPOR** (Summary MPOR) — aggregated quantity/quality/timeliness data pulled from all the employee's MPORs for the performance period, organized by output and function type (Core/Support).
2. **IPCR Accomplishment** — the employee's committed IPCR targets with actual performance scores (Q/E/T/A ratings) populated from rated ORS entries.

Neither document requires manual data entry from the employee — both are **system-generated** from existing ORS/MPOR data.

---

## CSC SPMS Context

Under the Philippine CSC SPMS, the performance evaluation cycle has four stages:

1. **Performance Planning and Commitment** — Employee and supervisor agree on targets (IPCR).
2. **Performance Monitoring and Coaching** — Ongoing work tracking (ORS/MPOR).
3. **Performance Review and Evaluation** — End-of-period accomplishment submission and rating. ← This module.
4. **Performance Rewarding and Development Planning** — Results feed into promotions, incentives, L&D.

The Accomplishments module covers **Stage 3** — the formal submission and review chain where the IPCR accomplishment rating is validated, calibrated, and officially released.

---

## Roles in the Workflow

| Role | CSC SPMS Term | Responsibility |
|---|---|---|
| **Employee** | Ratee | Submits IPCR accomplishment report with supporting documents |
| **Supervisor** | Immediate Supervisor / Rater | Validates and endorses the employee's accomplishment based on firsthand observation. First line of review. |
| **Dept Head** | Head of Office / Approving Authority | Reviews all endorsed IPCRs from the office. Acts as the **approving authority** — their endorsement is what officially sends the submission to the PMT. May also flag submissions for calibration. |
| **PMT** | Performance Management Team | A committee (not an individual) that ensures **consistency and fairness of ratings across all employees** in the agency. Calibrates, recommends, and releases final ratings. |

> **Important:** In CSC SPMS, the Head of Office is the **approving authority** for individual IPCR accomplishment ratings. The PMT works under the authority of the Head of Office and exists specifically to normalize ratings before the Head of Office's final approval. In practice for most agencies, the PMT reviews first, then the Head of Office gives final release — but in your system the Dept Head endorses first (as gatekeeper) and the PMT does the calibration/release step.

---

## When Accomplishments Becomes Available

The Accomplishments page is always accessible, but the data it shows depends on the pipeline state:

### SMPOR data source priority (3 levels, checked in order)

**Level 1 — Submission snapshot (if already submitted)**
If the employee has already submitted and the status is past `draft` / `returned_to_employee`, the SMPOR is locked to the MPORs linked at submission time. Never changes after this point.

**Level 2 — PMT-approved QAR (preferred live source)**
If the office has a `QarHeader` with `status = pmt_approved` for the active performance period, and that QAR's `mporLinks` include MPORs belonging to this employee, those MPORs are used as the authoritative dataset (`dataset_source = 'qar_official'`).

This is the intended trigger: **SMPOR becomes "official" once the QAR is PMT-approved.**

**Level 3 — Fallback preview**
If neither of the above is available, the SMPOR is populated from the employee's own MPORs with `status` in `[submitted, approved, endorsed]`. This is a preview mode only — not official.

### IPCR data
Always computed live from the employee's committed IPCR for the active performance period, with ratings derived from rated ORS entries.

---

## Database Tables

### `accomplishment_submissions`
One row per employee per performance period.

| Column | Type | Description |
|---|---|---|
| `id` | bigint PK | |
| `employee_id` | FK → users | |
| `office_id` | FK → offices | |
| `performance_period_id` | FK → performance_periods | |
| `ipcr_id` | FK → ipcrs | The IPCR used at submission time |
| `dataset_source` | string | `qar_official` or `submitted_mpor_preview` |
| `qar_header_id` | FK → qar_headers (nullable) | Set when using QAR-linked MPORs |
| `status` | string | See lifecycle below |
| `employee_remarks` | text (nullable) | Optional notes from employee |
| `attachments` | json (nullable) | Array of `{original_name, path, size, mime}` |
| `submitted_at` | timestamp (nullable) | When employee submitted |
| `supervisor_id` | FK → users (nullable) | Immediate supervisor auto-assigned from office |
| `supervisor_remarks` | text (nullable) | Supervisor's feedback/remarks |
| `supervisor_action_at` | timestamp (nullable) | |
| `dept_head_id` | FK → users (nullable) | Head of Office auto-assigned from office |
| `dept_head_remarks` | text (nullable) | Dept Head's feedback/remarks |
| `dept_head_action_at` | timestamp (nullable) | |
| `dept_head_flagged_for_calibration` | boolean | Default false. If true, PMT is informed this needs a calibration session. |
| `pmt_member_id` | FK → users (nullable) | PMT member who acted on this submission |
| `pmt_remarks` | text (nullable) | PMT's remarks / calibration notes |
| `pmt_action_at` | timestamp (nullable) | |
| `final_rating` | decimal (nullable) | PMT-adjusted or PMT-approved final rating score |
| `final_adjectival_rating` | string (nullable) | e.g. Outstanding, Very Satisfactory, Satisfactory, Unsatisfactory, Poor |

Unique: `(employee_id, performance_period_id)` — one submission per employee per period.

### `accomplishment_submission_mpor` (pivot)
Links a submission to the MPORs that were included in the SMPOR at submission time.

| Column | Description |
|---|---|
| `accomplishment_submission_id` | FK → accomplishment_submissions |
| `mpor_id` | FK → mpors |

---

## Submission Status Lifecycle

```
draft
  ↓  (employee submits)
submitted_to_supervisor
  ↓  (supervisor endorses)        ← supervisor can also return
supervisor_endorsed
  ↓  (dept head endorses)         ← dept head can also return; may flag for calibration
dept_head_endorsed
  ↓  (PMT reviews)
  ├── [flagged_for_calibration = true]  → PMT holds calibration session → pmt_calibrated → released_by_pmt
  └── [flagged_for_calibration = false] → PMT reviews and approves directly → released_by_pmt

  ↑__________returned_to_employee (any reviewer at any stage can return)
```

| Status | Display Label | Who Sets It | Description |
|---|---|---|---|
| `draft` | Draft | System (initial) or any return | Employee has not yet submitted, or was returned |
| `submitted_to_supervisor` | Pending Supervisor Review | Employee | Submitted; waiting for immediate supervisor to act |
| `supervisor_endorsed` | Endorsed by Supervisor | Supervisor | Supervisor has validated and endorsed; now with Dept Head |
| `dept_head_endorsed` | Endorsed by Head of Office | Dept Head | Dept Head has endorsed; now with PMT for final review |
| `pmt_calibrated` | Under PMT Calibration | PMT | PMT is actively calibrating this submission (only reached when `dept_head_flagged_for_calibration = true`) |
| `released_by_pmt` | Officially Released | PMT | PMT has finalized, approved, and released the rating — this is the terminal success state |
| `returned_to_employee` | Returned — Action Required | Supervisor, Dept Head, or PMT | Returned with remarks; employee must revise and resubmit |

---

## Workflow Step-by-Step (CSC SPMS Aligned)

### Step 1 — Employee Submits
- Employee reviews their SMPOR and IPCR accomplishment data (both system-generated).
- Employee may optionally add remarks and upload supporting documents.
- Employee clicks Submit → status becomes `submitted_to_supervisor`.
- Notification sent to the assigned **Supervisor**.

### Step 2 — Supervisor Reviews and Endorses
- Supervisor sees all submissions assigned to them with status `submitted_to_supervisor`.
- Supervisor reviews the SMPOR (actual work output) and IPCR (ratings) against their firsthand observation of the employee's performance.
- **Endorse** → status becomes `supervisor_endorsed`. Notification sent to **Dept Head**.
- **Return** → status becomes `returned_to_employee`. Supervisor must provide remarks. Notification sent to Employee.

> In CSC SPMS, the immediate supervisor is the **primary rater**. They are responsible for the accuracy of the accomplishment report. Their endorsement means they vouch for the accuracy of the data.

### Step 3 — Dept Head Reviews and Endorses
- Dept Head sees all `supervisor_endorsed` submissions from their office.
- Dept Head reviews the submission — they are the **approving authority** in CSC SPMS.
- Dept Head may review any anomalies, inconsistencies, or submissions that appear too high or too low compared to other employees.
- **Endorse (standard)** → `dept_head_flagged_for_calibration = false`, status becomes `dept_head_endorsed`. Notification sent to **PMT**.
- **Endorse and Flag for Calibration** → `dept_head_flagged_for_calibration = true`, status becomes `dept_head_endorsed`. PMT is notified this submission needs calibration.
- **Return** → status becomes `returned_to_employee`. Dept Head must provide remarks. Notification sent to Employee.

> The Dept Head's endorsement is what officially forwards the IPCR to the PMT. They are not just passing it through — they are exercising their role as approving authority. Flagging for calibration signals to the PMT that the rating may need adjustment.

### Step 4 — PMT Reviews, Calibrates, and Releases
- PMT sees all `dept_head_endorsed` submissions across the agency.
- PMT reviews submissions in two groups:
  - **Not flagged** (`dept_head_flagged_for_calibration = false`): PMT reviews and may approve directly.
  - **Flagged for calibration** (`dept_head_flagged_for_calibration = true`): PMT must conduct a calibration session to normalize the rating against other employees.

- **Release (no calibration needed)** → PMT approves the submission as-is → status becomes `released_by_pmt`. Notification sent to Employee (and Dept Head).
- **Calibrate then Release** → PMT conducts calibration session, may adjust `final_rating` and `final_adjectival_rating`, sets status to `pmt_calibrated` while in progress, then `released_by_pmt` when done.
- **Return** → status becomes `returned_to_employee`. PMT must provide remarks. Notification sent to Employee.

> In CSC SPMS, PMT calibration exists to ensure **no supervisor rates all their subordinates Outstanding** or **all Unsatisfactory**. The PMT normalizes ratings across the entire agency so that final ratings are fair and comparable. The PMT is a committee — typically composed of HR, a representative from top management, and subject matter experts.

### Step 5 — Final State: Released
- Status `released_by_pmt` is the **terminal success state**.
- The `final_rating` and `final_adjectival_rating` columns now hold the official PMT-approved score.
- The employee can view their final rating on their Accomplishments page.
- Results feed into rewards, promotions, and development planning (Stage 4 of SPMS).

---

## Return and Resubmission

Any reviewer (Supervisor, Dept Head, or PMT) can return a submission at any stage.

- Status resets to `returned_to_employee`.
- Reviewer must provide remarks (required field).
- Employee is notified with the reviewer's remarks.
- Employee can revise and resubmit — this re-runs the full submit action:
  - MPORs are re-linked.
  - `submitted_at` is reset.
  - Status resets to `submitted_to_supervisor`.
  - Supervisor is notified again.

> Note: Once a submission reaches `released_by_pmt`, it cannot be returned. The final rating is locked.

---

## SMPOR — How It Is Computed

### Input
All rated ORS entries from selected MPORs, filtered to:
- `status = rated`
- `quantity > 0`
- Both `quality_rating` and `timeliness_rating` not null
- `work_date` falls within the performance period month range

### Calculation per entry
- **Quantity** = `entry.quantity`
- **Quality Points** = `entry.quantity × monitoring.quality_rating`
- **Timeliness Points** = `entry.quantity × monitoring.timeliness_rating`

### Grouping
- Entries are grouped by `ipcr_item.output_title` → one row per unique output
- Rows are grouped by function type (`core` / `support`) → section headers
- Each row shows a monthly breakdown (one column per month in the period) + total
- Monthly columns use the entry's `work_date` month label (e.g. "Jan", "Feb")

### Three metric views
1. **Efficiency/Quantity** — raw quantity per output per month
2. **Quality/Effectiveness** — quality points (qty × Q-rating); includes Average column
3. **Timeliness** — timeliness points (qty × T-rating); includes Average column

Average = total_points / total_quantity (weighted average of ratings)

---

## IPCR Accomplishment — How It Is Computed

### Input
The employee's committed IPCR for the active period, loaded with:
- `ipcr_items` (output title, indicator text, function type, standards_payload)
- UWP function definitions (section title, weight percent, sort order)

### Structure
Sections → Rows (major outputs) → Indicators per row

For each IPCR indicator, the system computes Q/E/T/A ratings from rated ORS entries:
- **Q** (Quality) = weighted average quality rating from all rated ORS entries matching this indicator
- **E** (Efficiency) = computed from quantity totals
- **T** (Timeliness) = weighted average timeliness rating
- **A** (Average) = (Q + E + T) / 3

### Performance Score
The system computes an overall `computedScore` and `computedRating` using `PerformanceRatingService`. This is the **pre-PMT computed rating**. The PMT may adjust this to produce the `final_rating` stored on the submission.

### CSC Adjectival Rating Scale
| Score Range | Adjectival Rating |
|---|---|
| 4.500 – 5.000 | Outstanding (O) |
| 3.500 – 4.499 | Very Satisfactory (VS) |
| 2.500 – 3.499 | Satisfactory (S) |
| 1.500 – 2.499 | Unsatisfactory (US) |
| Below 1.500 | Poor (P) |

### Standards
Each IPCR indicator has a `standards_payload` (JSON) with a rating rubric for ratings 1–5, with sub-fields Q/E/T.

---

## Submit Action

**Route:** `POST /employee/accomplishment/submit`

### Pre-conditions
- Active performance period must exist.
- Employee must have a committed IPCR for the period.
- Eligible MPORs must be found (QAR-official or fallback).
- Submission must be in `draft` or `returned_to_employee` status.

### Validation
| Field | Rules |
|---|---|
| `remarks` | nullable, string, max 5000 |
| `supporting_files` | nullable, array |
| `supporting_files.*` | file, max 51,200 KB (50 MB per file) |

### Dataset resolution at submit time
1. Already-submitted snapshot → blocked (employee cannot resubmit unless returned).
2. PMT-approved QAR-linked MPORs → `dataset_source = 'qar_official'`.
3. Fallback: MPORs with `status = submitted` only (stricter than preview).

### On success
- Files uploaded to `accomplishment_submissions/period_{id}/employee_{id}/` (public disk).
- `AccomplishmentSubmission` upserted with `status = submitted_to_supervisor`.
- Pivot table `accomplishment_submission_mpor` synced with selected MPOR IDs.
- Supervisor receives **WorkflowEventNotification** (event: `accomplishment.submitted_to_supervisor`).

---

## Notifications Reference

| Event | Trigger | Recipient |
|---|---|---|
| `accomplishment.submitted_to_supervisor` | Employee submits | Supervisor |
| `accomplishment.supervisor_endorsed` | Supervisor endorses | Dept Head |
| `accomplishment.returned_by_supervisor` | Supervisor returns | Employee |
| `accomplishment.dept_head_endorsed` | Dept Head endorses | PMT |
| `accomplishment.returned_by_dept_head` | Dept Head returns | Employee |
| `accomplishment.released_by_pmt` | PMT releases | Employee + Dept Head |
| `accomplishment.returned_by_pmt` | PMT returns | Employee |

---

## Exports

| Export | Route | Format | What It Contains |
|---|---|---|---|
| SMPOR Excel | `GET /smpor/export` | `.xlsx` | Full SMPOR data (qty/quality/timeliness by month per output, grouped by function) |
| IPCR Excel | `GET /ipcr/export-excel` | `.xlsx` | IPCR accomplishment report with standards, indicators, Q/E/T/A ratings |

IPCR Excel export **fails with 422** if any IPCR indicator is missing `standards_payload` — all indicators must have their rubric defined before export.

---

## Key Business Rules

1. **One submission per employee per period** — upserted, not created new each time.
2. **SMPOR locks at submission time** — once submitted, the MPOR dataset is frozen.
3. **SMPOR is "official" only after QAR is PMT-approved** — before that it is preview only.
4. **Submission is blocked if no eligible MPORs exist** for the period.
5. **Supporting files and remarks are locked once submitted** — read-only until returned.
6. **A returned submission can be fully resubmitted** — MPORs re-linked, timestamps reset.
7. **Supervisor is the primary rater** — their endorsement vouches for accuracy.
8. **Dept Head is the approving authority** — their endorsement formally forwards to PMT.
9. **PMT calibration is triggered by Dept Head flag OR PMT discretion** — PMT can always choose to calibrate regardless of the flag.
10. **`final_rating` is set by PMT** — this is the official CSC SPMS rating. The system-computed score is only the pre-PMT estimate.
11. **`released_by_pmt` is terminal** — no returns possible after this status.
12. **IPCR export requires all indicators to have `standards_payload`** — missing rubrics block the download.
13. **Performance score/rating is computed live** from rated ORS entries — not stored until PMT releases the final rating.
14. **Supporting files are NOT deleted on return/resubmit** — stored files are cumulative.

---

## What Needs to Be Built (Implementation Checklist)

### Already implemented ✅
- Employee submission page (`/employee/accomplishment-submission`)
- SMPOR data computation and preview
- IPCR data computation and preview
- Submit action (POST /employee/accomplishment/submit)
- Supervisor index and show pages
- Supervisor endorse and return actions

### Still needs to be built ❌
- **`dept_head_flagged_for_calibration` column** — add to migration
- **`final_rating` and `final_adjectival_rating` columns** — add to migration
- **`pmt_member_id` column** — rename from `pmt_id` for clarity (or keep `pmt_id`)
- **Dept Head AccomplishmentReviewController** — full implementation:
  - `index()` — list all `supervisor_endorsed` submissions for the Dept Head's office
  - `show()` — view full submission (SMPOR + IPCR + employee info)
  - `endorse()` — endorse to PMT (with optional calibration flag)
  - `return()` — return to employee with required remarks
- **PMT AccomplishmentReviewController** — full implementation:
  - `index()` — list all `dept_head_endorsed` submissions, grouped by flagged/not-flagged
  - `show()` — view full submission
  - `release()` — approve and release directly (no calibration)
  - `calibrate()` — mark as under calibration, adjust rating, then release
  - `return()` — return to employee with required remarks
- **Notification dispatch** for Dept Head and PMT actions
- **UI progress bar** on Employee page showing the full pipeline step
- **Dept Head and PMT pages** (React/Inertia components)

---

## UI/UX Specifications

### Employee Accomplishments Page
- **Pipeline progress bar** at the top: Draft → Supervisor Review → Dept Head Review → PMT Review → Released
- Current step highlighted with actor name (e.g., "With: Juan dela Cruz — Immediate Supervisor")
- If returned: red highlight on current step with reviewer's remarks shown prominently
- SMPOR and IPCR shown as inline collapsible panels (not modal-gated)
- Key stats visible without expanding: Total Quantity, Computed Score, Adjectival Rating, Data Source badge
- Final rating (once released) shown in a prominent green card with `final_adjectival_rating`

### Supervisor Review Page
- List view: employee name, office, period, submitted date, status badge
- Sort: `submitted_to_supervisor` first, then others
- Detail view: SMPOR table + IPCR sections + employee remarks + attachments
- Actions: Endorse button (green) | Return button (red, requires remarks)

### Dept Head Review Page
- List view: employee name, supervisor, period, submitted date, status badge
- Filter tabs: Pending (supervisor_endorsed) | Endorsed | Returned
- Detail view: same as supervisor + supervisor's remarks
- Actions: Endorse to PMT (with checkbox: "Flag for PMT Calibration") | Return (requires remarks)

### PMT Review Page
- List view grouped by: **Needs Calibration** (flagged) | **Standard Review** (not flagged)
- Shows computed score and adjectival rating alongside each employee
- Detail view: full submission + supervisor remarks + dept head remarks
- Actions:
  - **Release** (approve as-is, no rating change)
  - **Calibrate and Release** (adjust `final_rating`, add PMT remarks, release)
  - **Return** (requires remarks)
- Summary dashboard: distribution of ratings across the agency (Outstanding / VS / S / US / Poor count)
