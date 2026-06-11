# Database Management Module — Smart PMS

**Route:** `/administrator/database`  
**Access:** Admin only  
**Platform:** Web (Responsive — Desktop, Tablet, iPad, Mobile)

---

## Overview

The Database Management Module replaces the current placeholder page with a fully functional, tabbed interface for database administration. It is a web-based equivalent of the C# desktop database tool, adapted for any screen size and consistent with Smart PMS's existing dark/light-mode admin UI.

Three tab sections:
1. **Connection** — manage and test DB connection profiles (Local, Network, Remote)
2. **Backup** — create Full / Incremental / Differential backups, view backup history, restore
3. **Data Exports** — export individual tables to CSV (or XLSX), preview table schema, view export history

---

## Design System Alignment

Follows existing Smart PMS admin CSS variables:

| Token | Usage |
|---|---|
| `--admin-card` | Card/panel background |
| `--admin-border`, `--admin-border-strong` | Borders |
| `--admin-accent` (`rgb(59,130,246)`) | Primary blue, active states |
| `--admin-text-primary / secondary / muted` | Text hierarchy |
| `--admin-bg-secondary` | Input backgrounds, table headers |
| `--admin-radius`, `--admin-radius-lg` | Border radius |
| `--admin-shadow` | Card shadows |

Tabs use the same pill/underline active style as OPCR Review and QAR.  
All interactive elements use existing `actionPrimary` / `actionSecondary` button styles.  
Danger actions (restore, overwrite) use red-toned confirmation dialogs consistent with the audit-log destructive pattern.

---

## Responsive Behavior

| Breakpoint | Layout |
|---|---|
| Desktop ≥ 1024px | Two-column panels side by side (e.g., Backup Options + Restore Options) |
| Tablet 640–1023px | Single column, full-width panels stacked |
| Mobile < 640px | Single column, compact inputs, horizontal scroll on tables, sticky tab bar |

Tab bar: on mobile becomes a horizontally scrollable pill row (no wrapping, no truncation).  
Tables: `overflow-x: auto` wrapper so they scroll horizontally on small screens.  
Modals/confirmations: full-width bottom-sheet style on mobile, centered dialog on desktop.

---

## Tab 1 — Connection

### Purpose
Configure and test the remote database connection. Since Smart PMS is a web application, only **Remote** connections are managed here — the admin configures the host, credentials, and port for the production/remote database server.

### UI Elements

```
┌─────────────────────────────────────────────────────┐
│  Remote Connection Details                           │
│  Server (host) ─────────────────  Port [3306]        │
│  Database ──────────────────────                     │
│  Username ──────────  Password ──────────  [👁]      │
├─────────────────────────────────────────────────────┤
│  Connection String Preview (read-only textarea)      │
│  server=db.example.com;port=3306;database=smart...   │
│                                            [Copy]    │
├─────────────────────────────────────────────────────┤
│  Status Banner  ← appears after Test Connection      │
│  ✅ Connection successful — smart_pms (db.example)   │
├─────────────────────────────────────────────────────┤
│  [Test Connection]  [Save]  [Reset Defaults]         │
└─────────────────────────────────────────────────────┘
```

### Behaviors
- **Connection String Preview** → live-updates as user types. Read-only; copy-to-clipboard button.
- **Test Connection** → POST `/administrator/database/test-connection` → shows success (green) or failure (red) banner with error message.
- **Save** → POST `/administrator/database/connection` → persists to encrypted config. Shows toast.
- **Reset Defaults** → resets form to current `.env` values with confirm dialog.
- Password field has show/hide toggle. Saved password shown as `••••••` on load.

### Mobile Adaptation
- Server + Port stack vertically (Port becomes full-width input).
- Username + Password stack vertically.

---

## Tab 2 — Backup

### Purpose
Create database backups (Full, Incremental, Differential, Date-range) and restore from a previous backup file. Mirrors the C# Backup tab.

### UI Layout (Desktop: two columns)

```
┌────────────────────────────┬───────────────────────────┐
│  Backup Options            │  Restore Options           │
│  ─────────────────────     │  ──────────────────────    │
│  From Date  [──────────]   │  Select Backup File        │
│  To Date    [──────────]   │  [Browse / Upload .sql]    │
│                            │                            │
│  [Full Backup]             │  ☑ Safety backup before    │
│  [Incremental]             │    restore                 │
│  [Differential]            │                            │
│  [Backup by Date Range]    │  [Restore Backup]          │
│                            │  ⚠ This will overwrite the │
│  Hint text below buttons   │    current database.       │
└────────────────────────────┴───────────────────────────┘

┌────────────────────────────────────────────────────────┐
│  Backup Information                                     │
│  Last Full: 2026-05-17 09:00 AM                        │
│  Last Incremental: —    Last Differential: —           │
├────────────────────────────────────────────────────────┤
│  Backup History                                        │
│  [Type] [File Name] [Date Range] [Date Created]        │
│  [Status] [Created By]  [⬇ Download]  [🗑 Delete]      │
└────────────────────────────────────────────────────────┘
```

### Backup Types

| Type | Description |
|---|---|
| **Full** | Entire database dump (`.sql` file). |
| **Incremental** | Changes since last backup. |
| **Differential** | Changes since last Full backup. |
| **Backup by Date Range** | Records created/modified between From–To dates. |

### Behaviors
- **Full / Incremental / Differential** → POST `/administrator/database/backup` with `{ type }` → server runs `mysqldump` (or equivalent) → file streamed as download, history row inserted.
- **Backup by Date Range** → same endpoint with `{ type: 'date_range', from, to }`.
- **Restore** → user uploads `.sql` file → POST `/administrator/database/restore` → confirmation modal ("This will overwrite the current database. Are you sure?") → executes restore → toast + history updated.
- "Safety backup before restore" checkbox (default checked) creates a Full backup before restore runs.
- History table: Download re-downloads the stored file; Delete removes with confirmation.
- Progress indicator (spinner + "Backup in progress…" banner) while job runs.

### Backup History Table Columns
`Type` · `File Name` · `Date Range` · `Date Created` · `Status` (Completed / Failed / In Progress) · `Created By` · Actions (Download, Delete)

### Mobile Adaptation
- Backup Options and Restore Options stack vertically.
- Backup history table horizontally scrollable.
- Action buttons (Download/Delete) remain accessible via icon buttons.

---

## Tab 3 — Data Exports

### Purpose
Export any application table to CSV format, with optional XLSX. Preview the table schema and row count before exporting. View export history. Mirrors the C# Exports tab.

### UI Layout (Desktop: two columns)

```
┌────────────────────────────┬───────────────────────────┐
│  Export Options            │  Export Preferences        │
│  ─────────────────────     │  ──────────────────────    │
│  Table Name [dropdown ▼]   │  ☑ Include column headers  │
│  Format     [CSV ▼]        │  ☑ Include date in filename│
│                            │  ☐ Export selected cols    │
│  [Export Table]            │                            │
│                            │  Filename Preview:         │
│  Hint: for reporting and   │  users_2026_06_11_...csv   │
│  admin data review.        │                            │
└────────────────────────────┴───────────────────────────┘

┌────────────────────────────┬───────────────────────────┐
│  Table Preview             │  Export History            │
│  ─────────────────────     │  ──────────────────────    │
│  Selected: users           │  Table | Format | Filename │
│  Est. Rows: 42             │  users | CSV  | users_...  │
│  Est. Size: ~18 KB         │  audit_logs | CSV | ...    │
│  ────────────────────      │                            │
│  Column headers shown as   │                            │
│  chips/tags (schema only,  │                            │
│  no live data preview)     │                            │
└────────────────────────────┴───────────────────────────┘
```

### Available Tables (dropdown)
All application tables exposed by the backend. Examples:
`users`, `offices`, `opcr_headers`, `uwp_tasks`, `accomplishment_submissions`, `qar_headers`, `qar_rows`, `audit_logs`, `performance_periods`

### Behaviors
- **Table dropdown** → on change, GET `/administrator/database/table-info?table=xxx` → updates row count, file size estimate, and column chips.
- **Format dropdown** → CSV (default) or XLSX.
- **Filename Preview** → live-updates as table/format/preferences change.
- **Export Table** → POST `/administrator/database/export` → streams file download → inserts export history row.
- Export History shows last 20 exports. Re-download available if file still on server.
- "Include column headers" — always recommended; when unchecked, data rows only.
- "Export selected columns" — expands a column multi-select checklist.

### Mobile Adaptation
- Export Options and Preferences stack vertically.
- Column chips wrap into multiple rows.
- Export History table scrollable horizontally.

---

## Shared Components

### Tab Bar
```jsx
// Three tabs: Connection | Backup | Data Exports
// Active: blue accent underline + accent text color
// Mobile: horizontal scroll row of pills
```

### Confirmation Modal
Used for: Restore, Reset Defaults, Delete backup.
- Dark overlay, centered card (bottom-sheet on mobile)
- ⚠ Warning icon + message + [Cancel] [Confirm] buttons
- Confirm button is red-toned (`rgba(239,68,68,...)`) for destructive actions

### Progress Banner
```
[spinner]  Backup in progress… This may take a moment.
```
Replaces action buttons area while running. Cannot trigger another action until complete.

### Status/Toast
- Success: green left-border banner (existing Snackbar/toast pattern)
- Error: red left-border banner with error message
- All actions follow existing `useToast()` pattern from the codebase

---

## Backend Endpoints (Laravel)

| Method | Route | Action |
|---|---|---|
| GET | `/administrator/database` | Render page (pass connection info, backup stats) |
| POST | `/administrator/database/test-connection` | Test a connection config |
| POST | `/administrator/database/connection` | Save connection config |
| POST | `/administrator/database/backup` | Run backup (`type`, `from?`, `to?`) |
| POST | `/administrator/database/restore` | Restore from uploaded file |
| GET | `/administrator/database/backups` | List backup history |
| DELETE | `/administrator/database/backups/{id}` | Delete a backup record + file |
| GET | `/administrator/database/backups/{id}/download` | Download backup file |
| GET | `/administrator/database/table-info` | Return table row count + columns |
| POST | `/administrator/database/export` | Export table → download |
| GET | `/administrator/database/exports` | List export history |

All routes are guarded by `auth` + `role:admin` middleware.  
Backup and export operations are logged to `audit_logs`.

---

## Security Considerations
- Restore endpoint requires a second confirmation token (CSRF + re-auth password prompt recommended).
- Connection credentials saved to server-side encrypted config, never returned in full to the frontend (password shown as `••••••`).
- Export access is logged. Large table exports are rate-limited.
- File uploads (restore) validated: `.sql` only, max 500 MB, stored in private storage (not public).

---

## Stitch Prototype Prompt

Use this prompt in **Stitch** to generate a frame-by-frame prototype:

---

**Stitch Prompt:**

> Design a fully responsive web admin module called **"Database Management"** for a web app called **Smart PMS**. It has a dark sidebar navigation on the left (collapsible). The main content area uses a dark navy/slate card-based design with the following CSS tokens: `--admin-card` (dark card bg), `--admin-accent` (blue #3b82f6), `--admin-border-strong`, `--admin-text-primary`, `--admin-text-muted`. Buttons: primary = solid blue, secondary = transparent with border.
>
> **Frame 1 — Page Header + Tab Bar (Desktop)**
> Show the page header card: database icon in a blue icon box, label "Admin Directory" above, title "Database" large and bold, subtitle "Administrative database tools." Below it, a horizontal tab bar with three tabs: **Connection** (active, blue underline), **Backup**, **Data Exports**.
>
> **Frame 2 — Connection Tab (Desktop)**
> Inside a card with title "Remote Connection Details": fields: Server/host (wide) + Port (short) on one row; Database on its own row; Username + Password (with eye icon) side by side. Below: "Connection String Preview" — a read-only dark textarea with a copy icon. Bottom bar: [Test Connection] (secondary) [Save] (primary blue) [Reset Defaults] (secondary). A green success banner: "✅ Connection successful."
>
> **Frame 3 — Connection Tab (Mobile, 390px)**
> Same tab bar as horizontal scrollable pills. All form fields stacked full-width. Buttons stacked full-width. Connection String Preview scrollable horizontally.
>
> **Frame 4 — Backup Tab (Desktop)**
> Two-column layout inside a card. Left: "Backup Options" — From Date + To Date pickers side by side, then four buttons stacked: [Full Backup] (primary), [Incremental Backup], [Differential Backup], [Backup by Date Range]. Right: "Restore Options" — file upload input with Browse button, checkbox "Safety backup before restore" (checked), [Restore Backup] button (red-toned secondary), warning text in amber. Below, full-width: "Backup Information" row with Last Full / Last Incremental / Last Differential stats. Then "Backup History" table: columns Type · File Name · Date Range · Date Created · Status badge · Created By · Actions (Download icon, Delete icon).
>
> **Frame 5 — Backup Tab (Mobile)**
> Backup Options and Restore Options stacked vertically. Backup History table horizontally scrollable. Action icons visible.
>
> **Frame 6 — Data Exports Tab (Desktop)**
> Two-column layout. Left: "Export Options" — Table Name dropdown, Format dropdown (CSV/XLSX), [Export Table] primary button, hint text below. Right: "Export Preferences" — three checkboxes (Include column headers ✓, Include date in filename ✓, Export selected columns), Filename Preview label with generated filename in muted text. Below, two-column: Left "Table Preview" — Selected table name, Estimated Rows count, Estimated Size, then column names shown as small blue chips/tags. Right "Export History" — compact table: Table · Format · File Name · Actions (re-download icon).
>
> **Frame 7 — Data Exports Tab (Mobile)**
> All panels stacked. Column chips wrap. Export History scrollable. Full-width Export button.
>
> **Frame 8 — Confirmation Modal (Restore)**
> Dark overlay, centered card (400px wide). Warning icon (amber). Title "Restore Database". Body text: "This will overwrite the current database with the selected backup file. This action cannot be undone." Two buttons: [Cancel] (secondary) [Confirm Restore] (red/danger primary). On mobile: bottom-sheet style, full width, rounded top corners only.
>
> All frames must follow Smart PMS dark mode aesthetic: dark navy cards, blue accents, muted text hierarchy, 12px border-radius cards, consistent spacing (1rem / 1.25rem padding).

---

## File Structure (to be created)

```
resources/js/Pages/Admin/Database/
├── Index.jsx               ← tabbed page shell
├── tabs/
│   ├── ConnectionTab.jsx
│   ├── BackupTab.jsx
│   └── ExportsTab.jsx

app/Http/Controllers/Admin/
└── DatabaseController.php

routes/web.php              ← add database routes under admin middleware

docs/
└── DB.md                   ← this file
```

---

*Last updated: 2026-06-11*
