# Employee Show Page — Feature Specification
**Smart PMS · Admin Module**

---

## Overview

The Employee Show Page is a detailed profile view accessible from the **Top Performing Employees** dashboard widget or admin employee list. It gives a full picture of an employee: personal info, current performance standing, IPCR history across periods, accomplishment submission statuses, development plans, and activity log.

---

## Data Model (Existing Schema)

### `users` (Employee Record)
| Column | Type | Notes |
|---|---|---|
| id | bigint PK | |
| employee_id | string nullable unique | PMS-assigned ID |
| hms_employee_id | integer nullable | HRIS sync key |
| name | string | Full name |
| email | string unique | |
| role | string nullable | `employee` / `supervisor` / `dept-head` / `admin` |
| is_active | boolean | Account status |
| is_disabled | boolean | Disabled without deletion |
| activated_at | timestamp nullable | When account was activated |
| profile_photo_path | string nullable | Storage path |
| office_id | bigint FK → offices | Assigned office |
| position | string nullable | Job position/title |
| created_at / updated_at | timestamps | |

### Related tables (used in this page)
| Table | Relation | Purpose |
|---|---|---|
| `offices` | `office_id` FK | Office name, code, head |
| `ipcrs` | `employee_id` FK | IPCR per period (commitments & scores) |
| `ipcr_items` | via `ipcr_id` | Individual IPCR success indicators |
| `accomplishment_submissions` | `employee_id` FK | Rated submission per period |
| `development_plans` | `employee_id` FK | IDP records per period |
| `activity_log` | `causer_id` FK | Audit trail for this employee's record |
| `performance_periods` | via ipcrs/submissions | Period names and dates |

---

## Page Entry Points

- **Top Performers widget** on the dashboard → click employee card/row → opens Show page
- **Admin > Users list** → "View Profile" action on any employee row
- **Office Show > People tab** → click employee name

**Route:** `GET /admin/employees/{id}`

---

## Pages

### Show — `/admin/employees/{id}`

**Layout:** Header + 5 tabs: Overview | Performance History | IPCR | Development Plans | Activity Log

---

#### Header (all screen sizes)

- Avatar (profile photo or initials fallback)
- Full Name + Employee ID badge (e.g., `EMP-0042`)
- Position title
- Office name + code badge (links to Office Show page)
- Role badge (`employee` / `supervisor` / `dept-head`)
- Active / Inactive / Disabled status pill
- **Back button**
- **Edit button** (Admin only — opens edit modal)

---

#### Tab 1: Overview

**Employee Details card**
| Field | Source |
|---|---|
| Employee ID | `users.employee_id` |
| Full Name | `users.name` |
| Email | `users.email` |
| Position | `users.position` |
| Role | `users.role` |
| Office | `offices.name` + `offices.code` |
| Account Status | `users.is_active` + `users.is_disabled` |
| Activated On | `users.activated_at` (formatted date) |
| HRIS ID | `users.hms_employee_id` (if present, with sync icon) |
| Member Since | `users.created_at` |

**Current Performance Snapshot** (latest finalized period)
- Latest IPCR Score (`ipcrs.pmt_adjusted_score` if available, else `ipcrs.final_score`)
- Adjectival Rating badge (Outstanding / Very Satisfactory / Satisfactory / Unsatisfactory / Poor)
- Accomplishment Submission Status for current period
- IDP Status for current period
- Trend arrow vs. previous period (▲ improved / ▼ declined / — no change)

**Quick Stats row** (4 cards)
| Stat | Source |
|---|---|
| Periods with Submissions | Count of `accomplishment_submissions` with `final_rating IS NOT NULL` |
| Average Final Rating | Mean of `accomplishment_submissions.final_rating` across all periods |
| Best Rating | Max `accomplishment_submissions.final_rating` + period name |
| IDPs Submitted | Count of `development_plans` with `status != 'draft'` |

---

#### Tab 2: Performance History

**Per-period timeline** (newest first), collapsible rows.

Each period row shows:

| Item | Source | Display |
|---|---|---|
| Period Name | `performance_periods.name` | e.g., "1st Semester 2025" |
| IPCR Score | `ipcrs.final_score` / `pmt_adjusted_score` | Numeric + Adjectival badge |
| IPCR Status | `ipcrs.status` | Badge |
| Accomplishment Status | `accomplishment_submissions.status` | Badge |
| Final Rating | `accomplishment_submissions.final_rating` | Numeric score |
| Final Adjectival | `accomplishment_submissions.final_adjectival_rating` | Colored badge |
| Flagged for Calibration | `accomplishment_submissions.dept_head_flagged_for_calibration` | ⚑ icon if true |
| IDP Status | `development_plans.status` | Badge |
| IDP LnD Sync | `development_plans.lnd_sync_status` | 🟢/🟡/🔴 icon |

**Rating trend chart** — Line graph of `final_rating` across periods (shown if ≥ 2 rated periods exist)
- X-axis: Period name
- Y-axis: Score (0–5 scale)
- Tooltip: Period name, score, adjectival rating

**Export button** → CSV of history (period, IPCR score, adjectival, final rating, IDP status)

---

#### Tab 3: IPCR

List of all IPCR records for this employee, newest first.

**IPCR table columns:**
| Column | Source |
|---|---|
| Period | `performance_periods.name` |
| Status | `ipcrs.status` badge |
| Committed At | `ipcrs.committed_at` formatted |
| Final Score | `ipcrs.final_score` |
| PMT Adjusted Score | `ipcrs.pmt_adjusted_score` (shown if different) |
| Adjectival Rating | `ipcrs.adjectival_rating` / `pmt_adjusted_rating` |
| Actions | View IPCR items (expand row) |

**Expanded IPCR row** — shows `ipcr_items` table:
| Column | Source |
|---|---|
| Success Indicator | `uwp_success_indicators.title` |
| Target | `ipcr_items` target field |
| Actual | `ipcr_items` actual field |
| Score | `ipcr_items.score` |

---

#### Tab 4: Development Plans

List of all IDPs for this employee, newest first.

**IDP table columns:**
| Column | Source |
|---|---|
| Period | `performance_periods.name` |
| Source Score | `development_plans.source_score` + `source_rating` |
| Status | `development_plans.status` badge |
| LnD Sync | `development_plans.lnd_sync_status` icon |
| LnD Reference | `development_plans.lnd_reference_id` (if synced) |
| Submitted To LD | `development_plans.submitted_to_ld_at` formatted |
| Actions | View IDP rows (expand), Download PDF |

**Expanded IDP row** — renders `development_plans.idp_rows` JSON:
| Column | Notes |
|---|---|
| Competency / Area for Development | from idp_rows |
| Learning Intervention | from idp_rows |
| Mode | from idp_rows |
| Target Date | from idp_rows |
| Status | from idp_rows |

---

#### Tab 5: Activity Log

Audit trail of changes to this employee's own record (not the actions they performed on other records).

**Table columns:**
| Column | Source |
|---|---|
| Date & Time | `activity_log.created_at` |
| Action | `activity_log.description` (e.g., "updated", "activated") |
| Changed Fields | `activity_log.properties.old` vs `properties.attributes` diff |
| Performed By | `activity_log.causer` name + role badge |

- Paginated (15 per page)
- Filter: All | Profile Changes | Status Changes
- Only shows logs where `subject_type = User` and `subject_id = employee.id`

---

## CRUD Rules (from this page)

| Action | Guard |
|---|---|
| Edit Profile | Admin only; email must remain unique; office_id must exist |
| Activate / Deactivate | Admin only; toggle `is_active`; triggers notification to employee |
| Disable Account | Admin only; sets `is_disabled = true`; employee cannot log in |
| Re-enable Account | Admin only; sets `is_disabled = false` |
| Change Role | Admin only; must be valid role value |
| Delete | Not allowed from this page (use User management module) |

---

## API / Controller

**Route:** `GET /admin/employees/{id}` → `Admin\EmployeeController@show`

**Data passed to Show:**

```php
[
  'employee'    => User + office (with head),
  'stats'       => [periods_with_ratings, avg_rating, best_rating, idps_submitted],
  'history'     => per-period array of ipcr + accomplishment_submission + development_plan,
  'ipcrs'       => Ipcr[] with items, paginated,
  'idps'        => DevelopmentPlan[] paginated,
  'activityLog' => ActivityLog[] paginated,
  'currentPeriod' => PerformancePeriod::current(),
]
```

**Controller: `Admin\EmployeeController`**

```php
// Route resource (show only needed here — others already in User management)
Route::get('admin/employees/{user}', [EmployeeController::class, 'show'])
     ->name('admin.employees.show');
```

---

## Top Performers Widget — Entry Point

On the Admin Dashboard, the Top Performers widget shows the **top 5 employees** ranked by `final_rating` for the current (or most recent) performance period.

**Widget card per employee:**
- Avatar + Name
- Office (short name / code)
- Final Rating score (large, colored by adjectival: green = Outstanding, blue = Very Satisfactory)
- Adjectival rating badge
- Trend vs. prior period (▲ / ▼ / —)
- **Clickable** → navigates to `/admin/employees/{id}`

**Ranking logic:**
```php
AccomplishmentSubmission::where('performance_period_id', $currentPeriod->id)
    ->whereNotNull('final_rating')
    ->with('employee.office')
    ->orderByDesc('final_rating')
    ->limit(5)
    ->get();
```

---

## Responsive Behavior

| Breakpoint | Layout |
|---|---|
| **Mobile** (< 640px) | Single column. Header stacks vertically. Tabs as scrollable pill nav. Stats as 2×2 grid. Tables become cards. Chart hidden (show summary text instead). |
| **Tablet** (640–1023px) | 2-column stats grid. Tables with essential columns only. Chart at 100% width. |
| **iPad / Large Tablet** (1024px) | 3-column stats grid. Full tables. Side-by-side employee card + snapshot. |
| **Desktop** (≥ 1280px) | 4-column stats row. Full table columns. Chart side-by-side with stats. |

---

## Status Badges Reference

| Value | Label | Color |
|---|---|---|
| `is_active = true` | Active | Green |
| `is_active = false` | Inactive | Gray |
| `is_disabled = true` | Disabled | Red |
| IPCR `released_by_pmt` | Released | Green |
| IPCR `committed` | Committed | Blue |
| IPCR `draft` | Draft | Gray |
| Submission `approved_by_pmt` | Approved | Green |
| Submission `submitted` | Submitted | Blue |
| Submission `draft` | Draft | Gray |
| Submission `returned_to_employee` | Returned | Amber |
| IDP `submitted_to_ld` | Submitted to L&D | Green |
| IDP `draft` | Draft | Gray |
| Adjectival `Outstanding` | Outstanding | Emerald |
| Adjectival `Very Satisfactory` | Very Satisfactory | Blue |
| Adjectival `Satisfactory` | Satisfactory | Indigo |
| Adjectival `Unsatisfactory` | Unsatisfactory | Amber |
| Adjectival `Poor` | Poor | Red |

---

## Implementation Priority

1. `Admin\EmployeeController@show` — load employee + stats + history
2. Dashboard Top Performers widget — ranking query + 5 employee cards with click-through
3. `Admin/Employees/Show.jsx` — Header + 5 tabs
   - Tab 1: Overview (details card + snapshot + quick stats)
   - Tab 2: Performance History (timeline + chart)
   - Tab 3: IPCR (table + expandable rows)
   - Tab 4: Development Plans (table + expandable rows)
   - Tab 5: Activity Log (paginated table)
4. Edit employee modal (admin only)
5. Activate / Disable toggle with confirmation dialog
