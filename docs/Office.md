# Office Management — Feature Specification
**Smart PMS · Admin Module**

---

## Overview

The Office Management module allows Admin to perform full CRUD on organizational offices, view per-office details (people + performance history), and sync with HRIS via API. Offices are the root organizational unit that ties together UWPs, OPCRs, IPCRs, QARs, and Accomplishment Reviews.

---

## Data Model (Existing Schema)

### `offices`
| Column | Type | Notes |
|---|---|---|
| id | bigint PK | |
| name | string unique | e.g. "Human Resource Management Office" |
| code | string nullable | e.g. "HRMO" |
| head_id | bigint FK → users | Department Head |
| hris_id | string nullable | External HRIS sync key *(to be added)* |
| is_active | boolean | Soft-disable without deleting |
| created_at / updated_at | timestamps | |

### Related tables (read-only in this module)
| Table | Relation | Purpose in history |
|---|---|---|
| `users` | `office_id` FK | Employees & supervisor assigned to office |
| `unit_work_plans` | `office_id` FK | UWP per period |
| `opcrs` | `office_id` FK | OPCR per period |
| `opcr_accomplishment_submissions` | `office_id` FK | Office final rating per period |
| `accomplishment_submissions` | `office_id` FK | Per-employee ratings in this office |
| `ipcrs` | via employees | Individual commitments |
| `development_plans` | `office_id` nullable | IDP records of employees in this office |

---

## Pages

### 1. Index — `/admin/offices`

**Purpose:** List all offices with live search, status filters, and quick actions.

**Features:**
- Live search (debounced, searches `name` + `code`)
- Filter: All | Active | Inactive | HRIS-synced
- Sortable columns: Name, Code, Employee Count, Head
- Each row shows: Office name, Code badge, Head name + avatar, Employee count, Active status pill, HRIS sync status icon
- Actions per row: View (→ Show), Edit (inline modal), Deactivate/Activate toggle
- **Add Office** button → Create modal (name, code, head assignment)
- Pagination (25 per page)
- **Import from HRIS** button → triggers sync (read-only, handled by HRIS Integration module)

**Destructive actions:**
- Delete only allowed if office has 0 employees AND 0 UWPs/OPCRs
- Deactivate is preferred over delete; requires confirmation dialog

---

### 2. Show — `/admin/offices/{id}`

**Layout:** Header + 4 tabs: Overview | People | Performance History | Settings

#### Header (all screen sizes)
- Office name + Code badge
- HRIS sync indicator (synced / manual / not synced)
- Active/Inactive status badge
- Edit button (opens modal)
- Back button

---

#### Tab 1: Overview
- Office card: Name, Code, Created date, HRIS ID (if any)
- Department Head card: Avatar, Name, Position, Contact
- Quick stats row:
  - Total Employees
  - Active UWPs (current period)
  - OPCR Status (current period)
  - Latest Office Rating (from `opcr_accomplishment_submissions.final_office_rating`)

---

#### Tab 2: People

Three sub-sections:

**Department Head**
- Avatar, Full Name, Position, Email, Role badge
- Link to User profile

**Supervisors** (role = 'supervisor' in this office)
- Card list: Avatar, Name, Position, Employee count they manage
- Link to each User profile

**Employees** (role = 'employee' in this office)
- Searchable table: Name, Position, Latest IPCR score, Latest Adjectival Rating, Status
- Sortable by name / rating
- Paginated (10 per page in table, cards on mobile)

---

#### Tab 3: Performance History

**Per-period timeline** (newest first):

Each period row expands to show:

| Item | Source | Display |
|---|---|---|
| UWP Status | `unit_work_plans.status` | Badge (draft/approved/returned) |
| OPCR Status | `opcrs.status` | Badge |
| Office Rating | `opcr_accomplishment_submissions.final_office_rating` | Numeric score + Adjectival |
| Employee Ratings | `accomplishment_submissions` | Mini table: Employee name, Score, Adjectival |
| Development Plans | `development_plans` count | Count of IDPs submitted |

- Chart: Line graph of office rating across periods (if ≥ 2 periods exist)
- Export button → CSV of history

---

#### Tab 4: Settings

- Edit Office Name
- Edit Code
- Assign / Change Department Head (user picker, filtered to dept-head role)
- Activate / Deactivate toggle
- HRIS Sync: Show last sync date, Manual sync trigger button
- **Danger Zone:** Delete office (guarded — only if no related records)

---

## CRUD Rules

| Action | Guard |
|---|---|
| Create | Name must be unique; code optional but unique if provided |
| Update | Name/code uniqueness enforced; head_id must be a user with dept-head role |
| Deactivate | Marks `is_active = false`; employees remain but cannot create new UWPs |
| Delete | Blocked if office has any `unit_work_plans`, `opcrs`, or `users` |
| HRIS Sync | Read-only import; admin cannot override HRIS data directly |

---

## API / Controller

**Routes:** `admin/offices` resource (index, store, show, update, destroy) + `POST admin/offices/{id}/toggle-status`

**Controller:** `Admin\OfficeController`

**Data passed to Show:**
```php
[
  'office'     => Office + head + employee/supervisor counts,
  'people'     => [head, supervisors[], employees[] paginated],
  'history'    => per-period array of UWP/OPCR/ratings/dev_plans,
  'stats'      => [total_employees, active_uwp, opcr_status, latest_rating],
]
```

---

## Responsive Behavior

| Breakpoint | Layout |
|---|---|
| **Mobile** (< 640px) | Single column. Cards instead of tables. Tabs become bottom sheet or top scroll nav. Search bar full width. Stats as 2×2 grid. |
| **Tablet** (640–1023px) | 2-column card grid. People in cards. History as accordion. |
| **iPad / Large Tablet** (1024px) | 3-column grid for stats. Table layout for employees. Side-scrollable history. |
| **Desktop** (≥ 1280px) | Full sidebar layout. Tables with all columns. Expandable history rows. Side-by-side head + stats. |

---

## HRIS Integration Notes

- Offices that originate from HRIS will have `hris_id` populated
- HRIS-sourced fields (name, code) are **read-only** in the UI (shown with lock icon)
- Admin can only edit non-HRIS fields (head assignment, active status)
- Manual offices (created in Smart PMS) are fully editable
- Sync status indicator: 🟢 Synced | 🟡 Pending | 🔴 Not synced | ⚪ Manual

---

## Migration Needed

```php
// Add to offices table:
$table->boolean('is_active')->default(true)->after('code');
$table->string('hris_id')->nullable()->unique()->after('is_active');
$table->timestamp('hris_synced_at')->nullable()->after('hris_id');
```

---

---

## Implementation Priority

1. `is_active` + `hris_id` migration
2. `Admin\OfficeController` — index (search/filter), show (people + history), store, update, destroy
3. `Admin/Offices/Index.jsx` — search, table/cards, add modal
4. `Admin/Offices/Show.jsx` — 4 tabs, responsive layout
5. Add `is_active` scope to Office model
