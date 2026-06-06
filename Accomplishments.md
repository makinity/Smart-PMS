    # Employee Accomplishments — Functionality Documentation

    This document covers the full Accomplishments module: what triggers it, what it's made of (SMPOR + IPCR), how data flows from QAR through to submission, the complete submission workflow across all roles, and a full description of the current UI/UX for redesign.

    ---

    ## What "Accomplishments" Is

    The Accomplishments module is the **end-of-period formal submission** where an employee packages two documents and sends them through an approval chain:

    1. **SMPOR** (Summary MPOR) — aggregated quantity/quality/timeliness data pulled from all the employee's MPORs for the performance period, organized by output and function type (Core/Support).
    2. **IPCR Accomplishment** — the employee's committed IPCR targets with actual performance scores (Q/E/T/A ratings) populated from rated ORS entries.

    Neither document requires manual data entry from the employee — both are **system-generated** from existing ORS/MPOR data.

    ---

    ## When Accomplishments Becomes Available / When It Triggers

    The Accomplishments page is always accessible, but the data it shows depends on the pipeline state:

    ### SMPOR data source priority (3 levels, checked in order)

    **Level 1 — Submission snapshot (if already submitted)**
    If the employee has already submitted and the submission status is past `draft/returned`, the SMPOR uses the MPORs that were linked at submission time. Locked forever.

    **Level 2 — PMT-approved QAR (preferred live source)**
    If the office has a `QarHeader` with `status = pmt_approved` for the active performance period, and that QAR's `mporLinks` include MPORs belonging to this employee, those MPORs are used as the authoritative dataset (`dataset_source = 'qar_official'`).

    This is the intended trigger: **SMPOR becomes "official" once the QAR is PMT-approved.**

    **Level 3 — Fallback preview**
    If neither of the above is available, the SMPOR is populated from the employee's own MPORs with `status` in `[submitted, approved, endorsed]`. This is a preview mode, not an official dataset.

    ### IPCR data
    Always live from the employee's committed IPCR for the active performance period, with ratings computed from rated ORS entries.

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
    | `submitted_at` | timestamp (nullable) | |
    | `supervisor_id` | FK → users (nullable) | Auto-assigned from office |
    | `supervisor_remarks` | text (nullable) | |
    | `supervisor_action_at` | timestamp (nullable) | |
    | `dept_head_id` | FK → users (nullable) | Auto-assigned from office head |
    | `dept_head_remarks` | text (nullable) | |
    | `dept_head_action_at` | timestamp (nullable) | |
    | `pmt_id` | FK → users (nullable) | |
    | `pmt_remarks` | text (nullable) | |
    | `pmt_action_at` | timestamp (nullable) | |

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
    draft → submitted_to_supervisor → supervisor_endorsed → dept_head_endorsed
                                                                ↓
                                                        recommended_by_pmt / pmt_approved
                                                                ↓
                                                            released_by_pmt
        ↑___________returned_to_employee___________________|
    ```

    | Status | Label Shown | Who Sets It |
    |---|---|---|
    | `draft` | Draft | Initial / returned |
    | `submitted_to_supervisor` | Submitted to Supervisor | Employee |
    | `supervisor_endorsed` | Supervisor Endorsed | Supervisor |
    | `dept_head_endorsed` | Awaiting PMT Recommendation | Dept Head |
    | `recommended_by_pmt` / `pmt_approved` | Recommended by PMT | PMT |
    | `released_by_pmt` | Officially Released | PMT |
    | `returned_to_employee` | Returned to Employee | Any reviewer |

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
    The SMPOR table has 3 views switchable by tabs:
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
    The system computes an overall `computedScore` and `computedRating` using `PerformanceRatingService`, derived from the IPCR ratings. This is displayed prominently on the Accomplishments page.

    ### Standards
    Each IPCR indicator has a `standards_payload` (JSON) with a rating rubric for ratings 1–5, with sub-fields Q/E/T. The Standards modal shows this rubric in a table (Rating | Quality | Efficiency | Timeliness).

    ---

    ## Employee Accomplishments Page — Current UI/UX

    ### Page URL
    `/employee/accomplishment-submission`

    ### Layout (current — messy, not responsive)

    **Page header:** Title "Accomplishments" + Performance Period label. Status badge top-right (Draft / Submitted / Calibrated).

    **SMPOR Card:**
    - Shows: Period, Status (Preview/Official), Data Source
    - Eye icon button → opens SMPOR Preview Modal
    - No inline data shown — must click to see the table

    **IPCR Card:**
    - Shows: Rating Period, Status (system-generated), Performance Score, Performance Rating
    - Eye icon button → opens IPCR Preview Modal
    - Score and Rating in green highlighted boxes

    **Supporting Documents section:**
    - Multi-file upload input
    - Shows list of already-submitted attachment filenames if submitted
    - Disabled once submitted

    **Employee Remarks section:**
    - Textarea, optional, max 5000 chars
    - Disabled once submitted

    **Submit button:** Opens a confirmation modal → "Submit Accomplishments" with loading spinner on confirm.

    **After submit:** Button becomes disabled "Already Submitted", remarks disabled, success toast appears.

    ### SMPOR Preview Modal (inline on same page)
    - Opens as overlay modal
    - 4 info chips: Employee, Office, Period, Source
    - 3-tab switcher: Efficiency/Quantity | Quality/Effectiveness | Timeliness
    - Each tab shows a table: Expected Outputs (rows) × Months (columns) + Total
    - Section headers separate Core from Support rows
    - Export button → downloads SMPOR Excel file

    ### IPCR Preview Modal (inline on same page)
    - Opens as overlay modal
    - Info chips: Employee, Office, Period, Source
    - Sections with weight badge (e.g. "80%")
    - Table: Major Output | Success Indicators count (eye button) | Timeline
    - Clicking eye → opens Indicators sub-modal (stacked)

    ### IPCR Indicators Sub-modal (stacked on IPCR modal)
    - Shows indicators for selected major output
    - Table: Indicator | Q | E | T | A | Standards (eye button)
    - Q/E/T/A populated from rated ORS entries
    - Standards eye → opens Standards sub-modal (stacked further)

    ### IPCR Standards Sub-modal (stacked 3 levels deep)
    - Shows the IPCR `standards_payload` rubric for the selected indicator
    - Table: Rating (5→1) | Quality | Efficiency | Timeliness
    - Each cell is a bulleted list of criteria

    ### Current UI Problems
    - 3 levels of stacked full-screen modals — confusing UX, hard to close correctly
    - SMPOR table has no sticky columns — horizontal scroll required
    - No month navigation — period months are always all shown (up to 6 columns)
    - No summary stats showing totals before opening modal
    - SMPOR and IPCR cards are minimal info cards that require clicking to see anything
    - Status badge shows generic "Submitted to Supervisor & Dept Head" instead of current pipeline step
    - No visual progress indicator for the submission workflow
    - IPCR score and rating cards are the only inline data — not enough to understand status at a glance

    ---

    ## Submit Action

    **Route:** `POST /employee/accomplishment/submit`

    ### Pre-conditions
    - Active performance period must exist.
    - Employee must have an IPCR for the period.
    - Eligible MPORs must be found (QAR-official or fallback submitted/approved/endorsed).
    - Submission must not already be in a non-returnable status.

    ### Validation
    | Field | Rules |
    |---|---|
    | `remarks` | nullable, string, max 5000 |
    | `supporting_files` | nullable, array |
    | `supporting_files.*` | file, max 51,200 KB (50 MB per file) |

    ### Dataset resolution at submit time
    Same 3-level priority as the page:
    1. Already-submitted snapshot (blocked if so)
    2. PMT-approved QAR-linked MPORs (`dataset_source = 'qar_official'`)
    3. Fallback: MPORs with `status = submitted` (only `submitted` — not approved/endorsed — stricter than preview)

    If no MPORs found → blocked with error message.

    ### On success
    - Files uploaded to `accomplishment_submissions/period_{id}/employee_{id}/` (public disk)
    - `AccomplishmentSubmission` created or updated with `status = submitted_to_supervisor`
    - Pivot table `accomplishment_submission_mpor` synced with selected MPOR IDs
    - Supervisor (first user with `role = supervisor` in the office) receives **WorkflowEventNotification** (event: `accomplishment.submitted_to_supervisor`, type: `info`)

    ---

    ## Submission Workflow (Full Chain)

    | Step | Actor | Action | Next Status |
    |---|---|---|---|
    | 1 | Employee | Submit | `submitted_to_supervisor` |
    | 2 | Supervisor | Endorse or Return | `supervisor_endorsed` or `returned_to_employee` |
    | 3 | Dept Head | Review and endorse | `dept_head_endorsed` |
    | 4 | PMT | Recommend / Calibrate | `recommended_by_pmt` or `pmt_approved` |
    | 5 | PMT | Release | `released_by_pmt` |
    | Any | Reviewer | Return | `returned_to_employee` |

    When `returned_to_employee`, the employee can re-submit (same endpoint, resets to `submitted_to_supervisor`).

    ---

    ## Exports

    | Export | Route | Format | What It Contains |
    |---|---|---|---|
    | SMPOR Excel | `GET /smpor/export` | `.xlsx` | Full SMPOR data (qty/quality/timeliness by month per output, grouped by function) |
    | IPCR Excel | `GET /ipcr/export-excel` | `.xlsx` | IPCR accomplishment report with standards, indicators, Q/E/T/A ratings |

    IPCR Excel export **fails with 422** if any IPCR indicator is missing `standards_payload` — all indicators must have their rubric defined.

    ---

    ## Key Business Rules

    1. SMPOR data becomes "official" once the office QAR is PMT-approved — before that it's a preview.
    2. Submission is blocked if no eligible MPORs exist for the period.
    3. One submission per employee per performance period (upserted, not created new each time).
    4. Once submitted past `draft`, supporting files and remarks are locked/read-only.
    5. A returned submission can be resubmitted — re-links MPORs and resets timestamps.
    6. The IPCR export requires all indicators to have `standards_payload` — missing rubrics block the download.
    7. Performance score/rating is computed live from rated ORS entries — not stored in `accomplishment_submissions`.
    8. Supporting files are stored per-period per-employee, not deleted on return/resubmit.

    ---

    ## Redesign Recommendations for Stitch AI

    **Main Accomplishments page:**
    - Show a clear submission pipeline progress bar: Draft → Submitted → Endorsed → PMT → Released
    - Show the current status in plain language with who needs to act next
    - Show SMPOR and IPCR as inline preview panels (not modal-gated) with a "View Full" option
    - Show key summary stats on the main page: total quantity, performance score, rating, data source badge
    - Replace modal previews with side drawers or full-width collapsible panels

    **SMPOR redesign:**
    - Show all metric views in a single scrollable page (not tabs) — tabs hide context
    - Add sticky first column (Expected Outputs)
    - Show grand total row at the bottom
    - Color-code cells (zero = dim, high values = brighter)
    - On mobile: collapse to cards per output with monthly sparkline

    **IPCR redesign:**
    - Show indicators inline (accordion per major output) instead of a 3-level deep modal stack
    - Show Q/E/T/A ratings next to each indicator inline
    - Standards rubric as a small expandable panel within the indicator row
    - Section weight badges should be prominent (Core 80% / Support 20%)

    **Submit flow:**
    - Single confirm step (not a modal — just a slide-down confirmation panel or inline confirm)
    - After submit: replace the button with a timeline card showing submission timestamp and who reviews next
    - File upload should show selected file names with size and remove buttons before submitting
