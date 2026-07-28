# Accomplishment Flow Change Plan

## Summary

Change the accomplishment review flow so that **Supervisor approval is the final step** before an
employee's accomplishment enters the OPCR Accomplishment pool. The dept-head review/approval step
is removed. Calibration flagging moves to the dept-head's existing OPCR Accomplishment page.

---

## Old Flow
```
Employee submits → Supervisor endorses (supervisor_endorsed) → Dept-head approves (dept_head_approved) → OPCR pool
```

## New Flow
```
Employee submits → Supervisor approves (supervisor_approved) → OPCR pool
                                                              ↑
                                          (Dept-head can flag for calibration here,
                                           inside the existing OpcraAccomplishment page)
```

---

## Confirmed Decision

**Dept-head calibration flagging lives inside `DeptHead/OpcraAccomplishment` (EmployeeShow).**
The dept-head's separate Accomplishment Review page is removed entirely.

---

## Status String Changes

| Old | New |
|-----|-----|
| `supervisor_endorsed` | `supervisor_approved` |
| `dept_head_approved` | stays as-is (used by OPCR pool, PMT, calibration) |

> Note: `dept_head_approved` is NOT removed — it is still used by the IDP flow and PMT OPCR
> release. Only its usage in the **accomplishment submission approval gate** is removed.
> The OPCR pool will now pick up `supervisor_approved` instead of waiting for `dept_head_approved`.

---

## Implementation Steps

### 1. Migration — rename status value in existing data
**File:** create new migration `database/migrations/YYYY_MM_DD_rename_supervisor_endorsed_to_approved.php`

```php
// Up
DB::table('accomplishment_submissions')
    ->where('status', 'supervisor_endorsed')
    ->update(['status' => 'supervisor_approved']);

// Down
DB::table('accomplishment_submissions')
    ->where('status', 'supervisor_approved')
    ->update(['status' => 'supervisor_endorsed']);
```

---

### 2. Supervisor AccomplishmentController
**File:** `app/Http/Controllers/Supervisor/AccomplishmentController.php`

- Rename method `endorse()` → `approve()`
- Change status written from `supervisor_endorsed` → `supervisor_approved`
- Change notification event from `accomplishment.supervisor_endorsed` → `accomplishment.supervisor_approved`
- Notification target: remove dept-head notification (or change to FYI-only if desired)
- Update `index()` status filter: replace `supervisor_endorsed` → `supervisor_approved`
- Update `orderByRaw` FIELD() list accordingly

---

### 3. Supervisor Routes
**File:** `routes/web.php`

- Rename route: `POST /accomplishment/{accomplishment}/endorse` → `POST /accomplishment/{accomplishment}/approve`
- Rename route name: `accomplishment.endorse` → `accomplishment.approve`
- No other route changes needed for supervisor

---

### 4. Delete DeptHead AccomplishmentReviewController + routes
**Files to delete:**
- `app/Http/Controllers/DeptHead/AccomplishmentReviewController.php`
- `resources/js/Pages/DeptHead/AccomplishmentReview/Index.jsx`
- `resources/js/Pages/DeptHead/AccomplishmentReview/Show.jsx`

**File:** `routes/web.php` — remove these routes from the `dept-head` prefix group:
```php
Route::get('/accomplishment-review', ...)
Route::get('/accomplishment-review/{accomplishment}', ...)
Route::post('/accomplishment-review/{accomplishment}/approve', ...)
Route::post('/accomplishment-review/{accomplishment}/return', ...)
```

---

### 5. DeptHead OpcraAccomplishmentController
**File:** `app/Http/Controllers/DeptHead/OpcraAccomplishmentController.php`

- Change pool query: `->whereIn('status', ['dept_head_approved', 'released_by_pmt'])` 
  → `->whereIn('status', ['supervisor_approved', 'released_by_pmt'])`
- Update `approved` flag check: `in_array($status, ['dept_head_approved', 'released_by_pmt'])`
  → `in_array($status, ['supervisor_approved', 'released_by_pmt'])`
- Update calibration reset: status `dept_head_approved` → `supervisor_approved`
- Add calibration flag action (`dept_head_flagged_for_calibration`) to this controller if not already present

---

### 6. PMT OpcraAccomplishmentController
**File:** `app/Http/Controllers/Pmt/OpcraAccomplishmentController.php`

- Update all `dept_head_approved` references for accomplishment submissions → `supervisor_approved`
  - Pool query
  - `approved` flag check
  - Calibration draft status check
  - Finalize on OPCR release query

---

### 7. PMT PerformancePeriodsController
**File:** `app/Http/Controllers/Pmt/PerformancePeriodsController.php` (line ~118)

- Change `->whereIn('status', ['supervisor_endorsed'])` → `->whereIn('status', ['supervisor_approved'])`

---

### 8. Frontend — Remove DeptHead AccomplishmentReview pages
**Delete:**
- `resources/js/Pages/DeptHead/AccomplishmentReview/Index.jsx`
- `resources/js/Pages/DeptHead/AccomplishmentReview/Show.jsx`

---

### 9. Supervisor Accomplishment pages
**Files:**
- `resources/js/Pages/Supervisor/Accomplishment/Index.jsx`
- `resources/js/Pages/Supervisor/Accomplishment/Show.jsx`

Changes:
- Status label: `supervisor_endorsed` → `supervisor_approved`, label `'Endorsed'` → `'Approved'`
- Filter tab label: `'Endorsed'` → `'Approved'`
- Button: "Endorse" → "Approve"
- Route call: `route('supervisor.accomplishment.endorse', id)` → `route('supervisor.accomplishment.approve', id)`
- Step indicator: update `supervisor_endorsed` key → `supervisor_approved`

---

### 10. Employee Accomplishment page
**File:** `resources/js/Pages/Employee/Accomplishment/Index.jsx`

- Status label: `supervisor_endorsed` key → `supervisor_approved`
  - Old label: `'Supervisor Endorsed'` → New label: `'Supervisor Approved'`
- Step indicator: update key `supervisor_endorsed` → `supervisor_approved`

---

### 11. Employee History page
**File:** `resources/js/Pages/Employee/History/Index.jsx`

- Remove `supervisor_endorsed` entry (no longer a visible intermediate step)
- Rename `dept_head_approved` label from `'Dept Head ✓'` → `'Approved'` (optional cosmetic)

---

### 12. DeptHead OpcraAccomplishment pages
**Files:**
- `resources/js/Pages/DeptHead/OpcraAccomplishment/Index.jsx`
- `resources/js/Pages/DeptHead/OpcraAccomplishment/EmployeeShow.jsx`

Changes:
- Replace status key `supervisor_endorsed` → `supervisor_approved` in status maps
- Replace status label `'Pending Approval'` → `'Supervisor Approved'` (or just `'Approved'`)
- Update `canAct` check: `status === 'supervisor_endorsed'` → `status === 'supervisor_approved'`
- Update filter tab key `supervisor_endorsed` → `supervisor_approved`
- The calibration flag button remains here on `EmployeeShow`

---

### 13. PMT OpcraAccomplishment pages
**Files:**
- `resources/js/Pages/Pmt/OpcraAccomplishment/EmployeeShow.jsx`
- `resources/js/Pages/Pmt/OpcraAccomplishment/Index.jsx`
- `resources/js/Pages/Pmt/OpcraAccomplishment/Show.jsx`

Changes:
- Replace `supervisor_endorsed` → `supervisor_approved` in status maps and step indicators
- Replace `dept_head_approved` → `supervisor_approved` where it refers to accomplishment
  submissions entering the pool (leave IDP-related `dept_head_approved` references untouched)

---

### 14. Sidebar — notification route
**File:** `resources/js/Components/Sidebar.jsx`

- Remove or remap: `'accomplishment.supervisor_endorsed': '/dept-head/accomplishment-review'`
  → Either remove entirely or change to point to `/dept-head/opcr-accomplishment`

---

### 15. AppLayout — notification route
**File:** `resources/js/Layouts/AppLayout.jsx`

- Same as step 14: remove/remap `'accomplishment.supervisor_endorsed'` entry

---

### 16. WorkflowEventNotification event names (optional cleanup)
If the notification event string `accomplishment.supervisor_endorsed` is used anywhere as a
stored value (DB notifications), consider whether to rename or just add the new event name
alongside the old one for backward compatibility.

---

## Files Touched (Summary)

### Backend (PHP)
| File | Action |
|------|--------|
| `app/Http/Controllers/Supervisor/AccomplishmentController.php` | Edit |
| `app/Http/Controllers/DeptHead/AccomplishmentReviewController.php` | **Delete** |
| `app/Http/Controllers/DeptHead/OpcraAccomplishmentController.php` | Edit |
| `app/Http/Controllers/Pmt/OpcraAccomplishmentController.php` | Edit |
| `app/Http/Controllers/Pmt/PerformancePeriodsController.php` | Edit |
| `routes/web.php` | Edit |
| `database/migrations/YYYY_MM_DD_rename_supervisor_endorsed.php` | **Create** |

### Frontend (JSX)
| File | Action |
|------|--------|
| `resources/js/Pages/DeptHead/AccomplishmentReview/Index.jsx` | **Delete** |
| `resources/js/Pages/DeptHead/AccomplishmentReview/Show.jsx` | **Delete** |
| `resources/js/Pages/Supervisor/Accomplishment/Index.jsx` | Edit |
| `resources/js/Pages/Supervisor/Accomplishment/Show.jsx` | Edit |
| `resources/js/Pages/Employee/Accomplishment/Index.jsx` | Edit |
| `resources/js/Pages/Employee/History/Index.jsx` | Edit |
| `resources/js/Pages/DeptHead/OpcraAccomplishment/Index.jsx` | Edit |
| `resources/js/Pages/DeptHead/OpcraAccomplishment/EmployeeShow.jsx` | Edit |
| `resources/js/Pages/Pmt/OpcraAccomplishment/EmployeeShow.jsx` | Edit |
| `resources/js/Pages/Pmt/OpcraAccomplishment/Index.jsx` | Edit |
| `resources/js/Pages/Pmt/OpcraAccomplishment/Show.jsx` | Edit |
| `resources/js/Components/Sidebar.jsx` | Edit |
| `resources/js/Layouts/AppLayout.jsx` | Edit |

---

## Notes for Hermes Agent

- The `dept_head_approved` status string appears in **IDP flow** as well — do NOT change those
  references. Only change accomplishment submission usages.
- The `dept_head_flagged_for_calibration` column on `accomplishment_submissions` stays — it is
  now set by the dept-head from within the OPCR Accomplishment page.
- Run `php artisan migrate` after creating the migration.
- No schema changes needed — only data/status string changes and logic updates.
- Confirm the open question about calibration flagging UI before implementing steps 5 and 12.
