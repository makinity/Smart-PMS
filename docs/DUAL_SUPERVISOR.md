# Dual Supervisor Per Office — Design Specification

> **Status:** Approved for implementation
> **Date:** July 14, 2026
> **Scope:** Affects Supervisor module workflows across Smart PMS

---

## Overview

An office can have **two supervisors** sharing the same `office_id`. No new roles or database columns are introduced. The system determines the supervisor's authority level based on who created the UWP.

### Core Rule

> Both supervisors share the same `role = supervisor` and `office_id`.
> **Whoever creates the UWP first becomes the primary supervisor for that document.**
> The other supervisor in the same office is the secondary supervisor.

---

## 1. Unit Work Plan (UWP)

### Primary vs Secondary Supervisor

| Action | Primary (Creator) | Secondary (Other Supervisor in Office) |
|---|---|---|
| Create UWP | ✅ Yes | ❌ No — can only access after primary creates it |
| Create / Edit / Delete Functions | ✅ Yes | ❌ No |
| Add / Edit / Delete MFOs | ✅ Yes | ✅ Yes |
| Add / Edit / Delete Success Indicators | ✅ Yes | ✅ Yes |
| Set QET Standards | ✅ Yes | ✅ Yes |
| Assign Employees | ✅ Yes | ✅ Yes |
| Submit UWP to Dept Head | ✅ Yes (creator only) | ❌ No |
| Save as Draft | ✅ Yes | ✅ Yes |

### How the System Determines Primary vs Secondary

```
Is Auth::id() === $uwp->created_by ?
  YES → Primary Supervisor → full access including Functions
  NO  → Check if same office_id → Secondary Supervisor → blocked from Functions & Submit
```

### Code Impact — `UwpEditorController`

Gates to add on:
- `storeFunction()` — must be `created_by`
- `updateFunction()` — must be `created_by`
- `destroyFunction()` — must be `created_by`
- `submit()` — must be `created_by`

MFO, Indicator, QET, Assign endpoints remain open to **any supervisor of the same office**.

### UWP Index Page

Both supervisors see the **same list** of UWPs for their office (scoped by `office_id`). No change needed here.

---

## 2. Team Tasks

### Current Behavior
Scoped by `ors_entries.supervisor_id` — each supervisor only sees tasks submitted to them.

### New Behavior
Scoped by `office_id` via the employee's office — **both supervisors see all tasks** for the office.

```php
// Before
OrsEntry::where('supervisor_id', $supervisor->id)

// After
OrsEntry::whereHas('employee', fn ($q) => $q->where('office_id', $supervisor->office_id))
```

### Rationale
Both supervisors co-manage the same office team. Visibility should be shared.

---

## 3. ORS Rating (Output Recording Sheet)

### Behavior — UNCHANGED

ORS rating stays **per assigned supervisor**. When an employee submits an ORS entry, the `supervisor_id` stored on that entry is the only supervisor who can rate it.

```php
// Stays as-is
OrsEntry::where('supervisor_id', $supervisor->id)
```

### Rationale
The employee independently chooses which supervisor rates their ORS output. This is intentional and unaffected by the dual-supervisor setup.

---

## 4. MPOR Approval (Monthly Progress and Output Report)

### Behavior — NO CHANGE NEEDED

MPOR is already scoped by `office_id`. Both supervisors already see and can act on all MPORs in their office. This is the desired behavior.

```php
// Already correct
Mpor::where('office_id', $user->office_id)
```

---

## 5. Accomplishment Submission (Endorsement)

### Current Behavior
Scoped by `accomplishment_submissions.supervisor_id` — only the assigned supervisor can see and endorse.

### New Behavior
Scoped by `office_id` — **both supervisors can see and act on all accomplishment submissions** for their office.

```php
// Before
AccomplishmentSubmission::where('supervisor_id', $supervisor->id)

// After
AccomplishmentSubmission::where('office_id', $supervisor->office_id)
```

### Notification Rule
When an employee submits their accomplishment, **both supervisors are notified**.

```php
$supervisors = User::where('office_id', $employee->office_id)
    ->where('role', 'supervisor')
    ->get();

foreach ($supervisors as $sup) {
    $sup->notify(new WorkflowEventNotification(...));
}
```

### Credit / Audit Rule
Whoever acts first is recorded as the endorsing supervisor. The `supervisor_id` and `supervisor_action_at` fields are updated to reflect **who actually acted**, not who was originally assigned.

### Conflict Prevention
Once status moves to `supervisor_endorsed`, the existing `abort_if` check blocks any further action from either supervisor — no double-endorsement possible.

---

## 6. IDP (Individual Development Plan — Recommendation)

### Current Behavior
Scoped by `development_plans.supervisor_id` — only the assigned supervisor can see and recommend.

### New Behavior
Scoped by `office_id` — **both supervisors can see and act on all IDPs** for their office.

```php
// Before
DevelopmentPlan::where('supervisor_id', $supervisor->id)

// After
DevelopmentPlan::where('office_id', $supervisor->office_id)
```

### Notification Rule
When an employee submits their IDP, **both supervisors are notified**.

### Credit / Audit Rule
Same as Accomplishment — whoever acts first gets recorded as `supervisor_id` with `supervisor_action_at` timestamp.

### Conflict Prevention
Same as Accomplishment — status gate prevents double-action.

---

## 7. Dashboard

The supervisor dashboard currently shows counts scoped to the supervisor's own records. With the dual-supervisor setup, dashboard counts should reflect the **full office** — not just records tied to the logged-in supervisor.

Review and update any `supervisor_id` scoping in `DashboardController` to use `office_id` where applicable.

---

## Summary of Changes

| Module | Change Type | Scope Change |
|---|---|---|
| UWP — Functions | Gate (creator only) | None |
| UWP — Submit | Gate (creator only) | None |
| UWP — MFO/Indicator/QET/Assign | No change | Already office-scoped |
| Team Tasks | Query change | `supervisor_id` → `office_id` |
| ORS Rating | No change | Stays `supervisor_id` |
| MPOR | No change | Already `office_id` |
| Accomplishment | Query + notification change | `supervisor_id` → `office_id` |
| IDP | Query + notification change | `supervisor_id` → `office_id` |
| Dashboard | Review counts | `supervisor_id` → `office_id` where applicable |

---

## Files to Modify

| File | What Changes |
|---|---|
| `app/Http/Controllers/Supervisor/UwpEditorController.php` | Add `created_by` gate on Function and Submit endpoints |
| `app/Http/Controllers/StageTwo/Monitoring/TeamTasksController.php` | Change query scope to `office_id` |
| `app/Http/Controllers/Supervisor/AccomplishmentController.php` | Change query scope + notify both supervisors |
| `app/Http/Controllers/Supervisor/IdpController.php` | Change query scope + notify both supervisors |
| `app/Http/Controllers/Supervisor/DashboardController.php` | Review and update counts |

---

## What Does NOT Change

- Database schema — no migrations needed
- User roles — no new roles
- Employee workflows — unaffected
- Dept Head workflows — unaffected
- ORS entry flow — unaffected
- MPOR flow — unaffected

---

## Branch Name Suggestion

```
feature/dual-supervisor-office
```
