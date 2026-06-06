# Output Rating Sheet (ORS) — Functionality Documentation

This document describes all functionality of the Employee ORS module as implemented in the prototype.
Use this as the reference spec when rebuilding ORS in the new project.

---

## Overview

The ORS is a **calendar-based task logging and time tracking system** for employees.
Every entry is tied to a committed IPCR — meaning the employee must have a committed IPCR for the active performance period before they can log any task.
Logged tasks flow upstream to the MPOR (Monthly Performance Output Report) and then to the SMPOR (Summary MPOR), which is eventually validated by the supervisor.

---

## Access Gate (IPCR Committed Check)

**Logging tasks is fully blocked unless:**
1. There is an active `PerformancePeriod` (`is_active = true`).
2. The employee has a committed IPCR (`status = 'committed'`) for that active period.

If either condition is not met, the entire Log Task form and the calendar's date click are disabled.
The UI shows a reason message explaining why ORS is locked.

Additionally, **per-month locking** applies when the employee's MPOR for a given month has a status of `submitted`, `approved`, or `endorsed`. When a month is MPOR-locked, the employee cannot log, start, pause, resume, stop, or submit any ORS entry whose `work_date` falls in that month.

---

## Database Tables

### `ors_entries`
The core table. One row = one logged task.

| Column | Type | Description |
|---|---|---|
| `id` | bigint PK | |
| `employee_id` | FK → users | The employee who logged it |
| `supervisor_id` | FK → users | The assigned supervisor |
| `office_id` | FK → offices (nullable) | |
| `performance_period_id` | FK → performance_periods | |
| `ipcr_id` | FK → ipcrs | The committed IPCR the task belongs to |
| `ipcr_item_id` | FK → ipcr_items | The specific IPCR indicator/activity |
| `mpor_id` | FK → mpors (nullable) | Set when the entry is pulled into an MPOR |
| `work_date` | date | The date the work was performed |
| `notes` | text (nullable) | Optional notes from the employee |
| `quantity` | string (nullable) | Required before submitting (e.g. "12 transactions") |
| `started_at` | timestamp (nullable) | When the timer was last started/resumed |
| `stopped_at` | timestamp (nullable) | When the timer was last paused/stopped |
| `total_seconds` | unsigned int | Accumulated duration in seconds |
| `status` | string | `draft`, `recording`, `paused`, `submitted`, `rated` |
| `submitted_at` | timestamp (nullable) | When the employee submitted for review |
| `locked_at` | timestamp (nullable) | Set when submitted; prevents further edits |

### `ors_entry_evidences`
Uploaded evidence files attached to an entry. Many-to-one with `ors_entries`.

| Column | Type | Description |
|---|---|---|
| `id` | bigint PK | |
| `ors_entry_id` | FK → ors_entries | |
| `file_name` | string | Original filename |
| `file_path` | string | Storage path |
| `mime_type` | string (nullable) | |
| `file_size` | unsigned int (nullable) | Bytes |
| `uploaded_at` | timestamp (nullable) | |

### `ors_entry_monitorings`
Supervisor ratings for a submitted entry. One row per (entry, supervisor) pair.

| Column | Type | Description |
|---|---|---|
| `id` | bigint PK | |
| `ors_entry_id` | FK → ors_entries | |
| `supervisor_id` | FK → users | |
| `quality_rating` | tinyint (nullable) | 1–5 scale |
| `timeliness_rating` | tinyint (nullable) | 1–5 scale |
| `remarks` | text (nullable) | |
| `rated_at` | timestamp (nullable) | |

Unique constraint on `(ors_entry_id, supervisor_id)`.

---

## Entry Lifecycle / Statuses

```
[logged] → draft → recording → paused → draft (stopped)
                                              ↓
                                         submitted (locked)
                                              ↓
                                           rated
```

| Status | Meaning |
|---|---|
| `draft` | Created or stopped. Editable. Timer is not running. |
| `recording` | Timer is actively running. Only one entry may be recording at a time across the whole account. |
| `paused` | Timer paused mid-session. Accumulated seconds are saved. |
| `submitted` | Employee submitted for supervisor review. Entry is locked (no further edits, no timer). |
| `rated` | Supervisor rated the entry (quality + timeliness). |

`validated` / `locked` are treated as aliases for `rated`/`submitted` in the frontend.

---

## Log Task Form

Opened by clicking **"Log Task"** button or clicking an empty calendar date.
Blocked if the ORS gate is locked or if the month is MPOR-locked.

### Fields

| Field | Input Type | Required | Notes |
|---|---|---|---|
| `work_date` | Read-only text (auto-filled from calendar date click) | Yes | Pre-filled from the clicked date |
| `uwp_output_key` | Select dropdown | Yes | Groups IPCR items by `output_title` (the MFO/UWP output) |
| `ipcr_item_id` | Select dropdown | Yes | Populated dynamically when UWP output is selected; lists `indicator_text` values from the selected output group |
| `supervisor_id` | Select dropdown | Yes | All active users with `role = 'supervisor'`; displayed as "Name - Office" |
| `notes` | Textarea (2 rows) | No | Max 1000 characters |

### Validation (server-side)

- `work_date` — required, valid date, must be within the IPCR performance period start/end dates, must not fall in a MPOR-locked month.
- `ipcr_item_id` — required, integer, must exist in `ipcr_items`, and must belong to the employee's committed IPCR.
- `supervisor_id` — required, integer, must exist in `users`, and must have `role = 'supervisor'`.
- `notes` — nullable, string, max 1000.

### On Success
- Entry is created with `status = 'draft'`.
- Timer is automatically started immediately after logging (transitions entry to `recording`).
- Calendar is refreshed with the new entry.
- If another timer is already recording, auto-start is blocked and entry stays as `draft`.

---

## Time Tracking

### Rules
- **Only one entry may be `recording` at any time** per employee account. Attempting to start a second while another is recording returns an error.
- The system tracks time server-side using `started_at`, `stopped_at`, and `total_seconds`.
- When paused/stopped, elapsed seconds since `started_at` are added to `total_seconds` and `started_at` is set to null.
- When resumed/started again, `started_at` is set to `now()`.
- The frontend displays a live elapsed timer that re-computes every second as `total_seconds + (now - started_at)`.

### Timer Actions

| Action | From Status | To Status | Server Behavior |
|---|---|---|---|
| **Start** | `draft` | `recording` | Sets `started_at = now()`, `status = recording` |
| **Pause** | `recording` | `paused` | Accumulates elapsed into `total_seconds`, clears `started_at`, sets `stopped_at` |
| **Resume** | `paused` | `recording` | Checks no other entry is recording; sets `started_at = now()` |
| **Stop** | `recording` or `paused` | `draft` | Same as pause + sets `status = draft` |

---

## Task Details Modal

Opened by clicking any entry on the calendar (via Day Summary) or by URL parameter `?ors_entry_id=`.

### Information displayed
- Task title (from `ipcr_item.indicator_text`)
- Date
- Status badge
- Supervisor name
- MFO / UWP Output label (from `ipcr_item.output_title`)
- Quantity (editable input until submitted)
- Duration (live updating if recording)
- Notes
- Output state (no output / submitted / validated)
- Evidence state (attached / none), file count, filename, upload date
- Submitted at timestamp

### Actions available (depend on status)

| Button | Visible When | Behavior |
|---|---|---|
| **Start Task** | `draft`, no other active timer | Starts the timer |
| **Pause** | `recording` | Pauses the timer |
| **Resume** | `paused` | Resumes the timer |
| **Stop (Draft)** | `recording` or `paused` | Stops the timer, status → `draft` |
| **Submit for Review** | `draft` | Submits the entry (requires quantity + evidence) |

### Quantity field
- Editable while status is `draft`, `recording`, or `paused`.
- Disabled when `submitted` or `rated`, or when the month is MPOR-locked.
- Required before submitting.

### Evidence Upload
- File input (multiple files allowed).
- Accepted formats: `pdf, jpg, jpeg, png, doc, docx, xlsx`.
- Max file size per file: 10 MB.
- Disabled once submitted or MPOR-locked.
- At least one evidence file is required before the entry can be submitted.

### Locking Messages
- If `submitted` or `rated`: shows "Submitted (Locked) — visible in MPOR monthly summary."
- If MPOR-locked month: shows the MPOR lock reason.

---

## Submit for Review

**Endpoint:** `POST /employee/ors/{orsEntry}/submit`

### Pre-conditions
- Entry must be `draft`.
- Entry must not be MPOR-locked.
- Entry must not already have `locked_at` set.

### Required fields
| Field | Validation |
|---|---|
| `quantity` | Required, numeric, min 0 |
| `evidence[]` | Nullable array; each file max 10 MB, mimes: pdf/jpg/jpeg/png/doc/docx/xlsx |
| `notes` | Nullable, string, max 1000 |

### On Success
- All selected evidence files are stored to `ors_evidences/{employee_id}/{entry_id}/` (public disk).
- Evidence filenames are sanitized using slugify + timestamp + random suffix.
- Entry `status` → `submitted`, `submitted_at` and `locked_at` are set to `now()`.
- If the entry was still `recording`, remaining elapsed seconds are accumulated before locking.
- The assigned supervisor receives a **WorkflowEventNotification** (type: `info`, event: `ors.submitted_to_supervisor`) with a link to the supervisor's ORS monitoring page.

---

## ORS Calendar

- Powered by **FullCalendar v6** (dayGridMonth view).
- Each day cell shows summary chips grouped by status (e.g., "Draft (2)", "Submitted (1)").
- Summary chip colors:
  - Blue border = submitted
  - Cyan border = rated/locked
  - Amber = recording/paused/draft
- Clicking a day with entries opens the **Day Summary Modal**.
- Clicking an empty day opens the **Log Task Modal** (date pre-filled).
- Calendar is blocked from opening the log modal if ORS gate is locked or month is MPOR-locked.

---

## Day Summary Modal

Opened when clicking a calendar day that already has entries, or clicking a summary chip.

- Shows the date label (e.g., "June 5, 2026").
- Lists all entries for that day grouped by status.
- Each entry row shows: title, live duration, status badge, evidence state.
- Clicking an entry row opens the **Task Details Modal** stacked on top (both modals stay open).
- "Log Task for this date" button at the bottom pre-fills the date and opens the Log Task Modal.

---

## Active Task Timer Panel

Always-visible panel on the ORS page (above the calendar).
Shows the currently recording or paused task with live elapsed time.

- Displays: task name, start time, elapsed duration, status.
- Buttons: **Pause/Resume**, **Stop (Draft)**, **Submit for Review**.
- If no task is active, shows a placeholder message.
- Disabled with error message if the active task's month is MPOR-locked.

---

## Stats Overview

4 stat cards shown above the active timer:

| Card | Counts |
|---|---|
| This Week | ORS entries with `work_date` in the current Mon–Sun week |
| Drafts | Entries with `status = draft` |
| Submitted | Entries with `status = submitted` |
| Validated | Entries with `status` in `validated`, `locked`, or `rated` |

---

## Supervisor ORS Monitoring

Supervisors see all `submitted` and `rated` entries assigned to them.

### Rating Form
- **Quality Rating** — integer 1–5 (required)
- **Timeliness Rating** — integer 1–5 (required)
- **Remarks** — textarea, max 2000 chars (optional)

### On Save
- `OrsEntryMonitoring` row is created/updated (`updateOrCreate`).
- Entry `status` → `rated`.
- Employee receives a **WorkflowEventNotification** (type: `success`, event: `ors.rated_by_supervisor`).

### Auto-open
The supervisor monitoring page supports `?ors_entry_id=` query param to automatically open a specific entry (linked from the notification).

---

## MPOR Month Locking

When an employee's MPOR for a month has `status` in `[submitted, approved, endorsed]`:
- All ORS entries whose `work_date` falls in that month are **read-only**.
- The Log Task form, Start, Pause, Resume, Stop, and Submit actions are all blocked.
- A banner message is shown on the ORS page if the **current month** is locked.
- Calendar dates in locked months still show existing entries but cannot be clicked to log new tasks.

---

## Notifications

| Event | Recipient | Trigger |
|---|---|---|
| `ors.submitted_to_supervisor` | Supervisor | Employee submits an ORS entry |
| `ors.rated_by_supervisor` | Employee | Supervisor rates the entry |

Both use `WorkflowEventNotification` with a direct URL link.

---

## UWP Output Grouping (orsOptions)

The Log Task dropdown for "UWP Output / Major Final Output" is built by:
1. Loading all `ipcr_items` for the employee's committed IPCR.
2. Grouping by `output_title` (case-insensitive).
3. Each group gets a synthetic `output_key` (md5 hash of the lowercase title).
4. Each group's `indicators` array contains the `ipcr_item_id` and `indicator_text`.
5. When the employee picks an output, the second dropdown ("Task / Activity") is populated with that group's indicators.
6. Both dropdowns are sorted alphabetically.

---

## Key Business Rules Summary

1. No committed IPCR → entire ORS is blocked.
2. Only one timer can run at a time per employee.
3. Quantity is required before submitting.
4. At least one evidence file is required before submitting.
5. Once submitted (`locked_at` is set), the entry cannot be edited, started, paused, or stopped.
6. MPOR-locked months block all write operations on entries in that month.
7. Work date must fall within the IPCR performance period start/end dates.
8. The `ipcr_item_id` must belong to the employee's own committed IPCR (not any other).
9. The selected supervisor must have `role = 'supervisor'`.
10. After submitting, the supervisor is notified; after rating, the employee is notified.
