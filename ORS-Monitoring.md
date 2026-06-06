# Supervisor ORS Monitoring — Feature Spec

## Purpose

The Supervisor ORS Monitoring screen allows a supervisor to:
1. See all ORS (Output Rating Sheet) entries submitted by their team members that are awaiting rating or already rated.
2. Review each submission in detail — including task info, evidence files, and time duration.
3. Rate each entry on **Quality** and **Timeliness** (1–5 star scale) and optionally leave **Remarks**.
4. Save the rating, which transitions the entry status from `submitted` → `rated` and notifies the employee.

---

## Access Rule

- Only users with `role = 'supervisor'` can access this screen.
- The supervisor only sees entries where `ors_entries.supervisor_id = auth()->id()`.

---

## Screen Layout

The screen has two main zones side by side:

### Left: Submission Queue (list/sidebar)
A scrollable list of all `submitted` and `rated` entries assigned to the logged-in supervisor.

Each card in the list shows:
- Employee full name
- Task name (from `ipcr_items.indicator_text`)
- Submission timestamp (relative: "2h ago", "1d ago")
- Priority badge — `URGENT` if status is `submitted` (needs rating), `STANDARD` if already `rated`
- Status chip — "Requires Rating" (submitted) or "Pending Verification" / "Rated" (rated)

Clicking a card loads the entry in the right panel.

Supports `?ors_entry_id=` query param to auto-open a specific entry (used by notification links).

### Right: Rating Panel
Shows the selected entry's details and the rating form.

#### Header
- Section title: "Reviewing: {employee name}"
- Subtitle: task name (`indicator_text`)
- Action icons: history (view previous ratings if any), print, share

#### Evidence Section
- Label: "VIEW EVIDENCE"
- Each attached file shown as a card:
  - File icon based on type (PDF, image, doc)
  - File name
  - File size + type label
  - Download button (for files)
  - External link button (for URLs, if applicable)

#### Rating Fields
Two side-by-side sections:

**Quality Rating**
- Label: "Quality Rating"
- Description: "Degree to which expectations were met based on standards."
- Input: 5-star interactive component (1–5, integer)

**Timeliness Rating**
- Label: "Timeliness Rating"
- Description: "Adherence to the scheduled deadline and milestones."
- Input: 5-star interactive component (1–5, integer)

#### Remarks
- Label: "Remarks"
- Textarea with placeholder: "Provide constructive feedback for {employee name} regarding this task submission..."
- Max 2000 characters

#### Action Buttons
- **Discard Changes** — resets the rating form to its saved state (or clears if unrated)
- **Save Rating** — submits the rating

#### Already-Rated State
If the entry already has a rating (`status = 'rated'`), the panel should:
- Pre-fill the star ratings and remarks from the existing `ors_entry_monitorings` record
- Show `rated_at` timestamp
- Still allow the supervisor to update/overwrite the rating (the system does `updateOrCreate`)

---

## Data Flow

### Loading the Queue
```
GET /supervisor/ors-monitoring
```
Fetches all `ors_entries` where:
- `supervisor_id = auth()->id()`
- `status IN ('submitted', 'rated')`

Eager-loads:
- `employee` (name, office)
- `employee.office` (name)
- `ipcrItem` (output_title, indicator_text)
- `monitoring` (filtered to current supervisor)
- `evidences` (count)

Ordered by `work_date DESC`, then `id DESC`.

### Loading a Single Entry
```
GET /supervisor/ors-monitoring/{orsEntry}
```
Same eager loads as above. Aborts 403 if `orsEntry.supervisor_id ≠ auth()->id()`.

### Saving a Rating
```
POST /supervisor/ors-monitoring/{orsEntry}
```

Request body:
| Field | Rules |
|---|---|
| `quality_rating` | required, integer, 1–5 |
| `timeliness_rating` | required, integer, 1–5 |
| `remarks` | nullable, string, max:2000 |

Server behavior:
1. Validates `orsEntry.supervisor_id = auth()->id()` (403 otherwise).
2. Validates `orsEntry.status = 'submitted'` (only submitted entries can be rated for first time; rated entries can be updated).
3. `OrsEntryMonitoring::updateOrCreate` on `(ors_entry_id, supervisor_id)`.
4. Updates `ors_entries.status → 'rated'` if it was `submitted`.
5. Dispatches `WorkflowEventNotification` to the employee (`ors.rated_by_supervisor`).
6. Returns JSON `{ success, status, monitoring, orsEntry }` for SPA/Inertia flow.

---

## Tables Involved

### `ors_entries` (primary)
| Column | Used For |
|---|---|
| `id` | PK, route param |
| `employee_id` | → users: display name, office |
| `supervisor_id` | Access control (must match auth user) |
| `ipcr_item_id` | → ipcr_items: task name, output title |
| `work_date` | Display |
| `notes` | Display |
| `quantity` | Display ("12 transactions") |
| `total_seconds` | Display (formatted duration) |
| `status` | `submitted` = needs rating, `rated` = done |
| `submitted_at` | Display ("submitted 2h ago") |

### `ors_entry_monitorings`
| Column | Used For |
|---|---|
| `ors_entry_id` | FK to ors_entries |
| `supervisor_id` | FK to users (auth check + filter) |
| `quality_rating` | Pre-fill stars on rated entries |
| `timeliness_rating` | Pre-fill stars on rated entries |
| `remarks` | Pre-fill textarea on rated entries |
| `rated_at` | Display timestamp |

### `ors_entry_evidences`
| Column | Used For |
|---|---|
| `ors_entry_id` | FK to ors_entries |
| `file_name` | Display filename |
| `file_path` | Download link |
| `mime_type` | Icon/type label |
| `file_size` | Display size |
| `uploaded_at` | Display |

### `ipcr_items` (read-only lookup)
| Column | Used For |
|---|---|
| `indicator_text` | Task name displayed in panel header and list card |
| `output_title` | MFO/UWP output label shown under task name |

### `users` (read-only lookup)
| Column | Used For |
|---|---|
| `name` | Employee name in panel header and list cards |
| `office_id` | → offices.name for display context |

### `offices` (read-only lookup)
| Column | Used For |
|---|---|
| `name` | Shown alongside employee name (e.g. "Maria Dela Cruz — IT Office") |

---

## Status Priority / Sorting Logic

In the submission queue, entries should be sorted:
1. `submitted` entries first (require action)
2. `rated` entries after
3. Within each group, newest `submitted_at` / `work_date` first

The "URGENT" badge maps to `submitted`, "STANDARD" maps to `rated`.

---

## Notifications Triggered

| Event | Recipient | Trigger |
|---|---|---|
| `ors.rated_by_supervisor` | Employee | Supervisor saves a rating |

Notification payload includes:
- `title`: "ORS Task Rated"
- `body`: "{supervisor name} rated your submitted ORS task."
- `url`: link to employee's task view (`?task_id={ors_entry_id}`)
- `type`: "success"

---

## Inertia/SPA Props (suggested shape for new project)

```js
// Page props passed from controller
{
  submittedEntries: [
    {
      id: Number,
      status: 'submitted' | 'rated',
      work_date: String,          // "2026-06-04"
      submitted_at: String,       // ISO timestamp
      notes: String | null,
      quantity: String | null,
      total_seconds: Number,
      employee: { id, name, office: { name } },
      ipcr_item: { indicator_text, output_title },
      evidences_count: Number,
      evidences: [{ id, file_name, file_path, mime_type, file_size, uploaded_at }],
      monitoring: {               // null if not yet rated
        quality_rating: Number | null,
        timeliness_rating: Number | null,
        remarks: String | null,
        rated_at: String | null,
      }
    }
  ],
  autoOpenEntryId: Number | null, // from ?ors_entry_id= query param
}
```

---

## Key Business Rules

1. Supervisor can only rate entries assigned to them (`supervisor_id = auth id`).
2. Only `submitted` entries can receive a first-time rating — but ratings can be updated even after `rated`.
3. Both `quality_rating` and `timeliness_rating` are required (1–5). Remarks are optional.
4. Saving a rating on a `submitted` entry transitions it to `rated` and notifies the employee.
5. The `ors_entry_monitorings` table uses `updateOrCreate` — re-rating overwrites the previous record.
6. The queue shows both `submitted` (pending) and `rated` (completed) entries so the supervisor has full history.
7. Evidence files are read-only on this screen — supervisor can download/view but not upload.
