# Individual Development Plan (IDP) — Redesign Documentation

## Overview

The IDP module covers the process of identifying low-performing employees (based on IPCR results), having them fill out a development plan, routing it through supervisors and department heads for review, and ultimately submitting it to the Learning & Development (L&D) section.

This document captures the redesigned flow agreed upon on **June 29, 2026**.

---

## Context

IDP is triggered for employees with **low performance ratings** (Unsatisfactory or Poor) based on released IPCR results. Good-performing employees are **not included** in the IDP process.

The redesign shifts both the Dept Head and PMT views to **office-level** (grouped by office) — modeled after the existing QAR → MPOR flow pattern already in the system.

---

## Process Flow

```
PMT identifies low performers from released IPCR results
↓
PMT creates IDP drafts per employee
↓
Employee fills in IDP rows & submits
↓
Supervisor receives IDP
  ├── Return → Employee revises → resubmits to Supervisor
  └── Recommend → Dept Head receives IDP
                  ├── Return → Employee revises → resubmits to Supervisor
                  └── Approve (per employee, with optional remarks)
                      ↓
                      Approved IDPs accumulate at Dept Head (office level)
                      ↓
                      Dept Head batch submits office IDPs → PMT
                      ↓
PMT receives office-level IDP batch
  ├── Reviews per employee (add PMT remarks, view performance details)
  └── Batch submits to L&D (per office)
      ↓
      Employee notified → Process complete
```

### Key Rules
- Supervisor acts **individually** per employee IDP
- Dept Head acts **individually** (approve/return per employee) but **submits as a batch** to PMT
- PMT receives and reviews everything **grouped by office**
- Returns (by supervisor or dept head) always go back to the **employee**, not the previous reviewer
- Dept Head can approve/return IDPs **as they arrive** — no need to wait for all employees in the office
- Only **low-performing employees** are included; good performers are excluded from IDP tracking

---

## Status Lifecycle

| Status | Set By | Meaning |
|---|---|---|
| `draft` | PMT | IDP record created, employee has not yet filled it |
| `pending_details` | Employee | Employee is saving/editing their IDP rows |
| `submitted` | Employee | Employee submitted to supervisor for review |
| `supervisor_recommended` | Supervisor | Supervisor recommended, forwarded to Dept Head |
| `returned` | Supervisor or Dept Head | Returned to employee for revision |
| `dept_head_approved` | Dept Head | Dept Head approved individually |
| `submitted_to_pmt` | Dept Head | Batch submitted to PMT (new status) |
| `submitted_to_ld` | PMT | PMT submitted to L&D section |

---

## Role Responsibilities

### PMT
- Identifies low performers from released IPCR results
- Creates IDP draft records per employee
- Can add PMT remarks per employee IDP
- Views IDPs grouped by office
- Batch submits approved IDPs to L&D per office

### Employee
- Fills in IDP rows (performance gap, developmental activity, support needed, support from supervisor, expected completion, results)
- Submits IDP to supervisor
- Revises and resubmits when returned

### Supervisor
- Reviews submitted IDPs individually
- Can **Recommend** (forwards to Dept Head) or **Return** (with required remarks back to employee)
- Receives notifications when employee submits or resubmits

### Department Head
- Reviews supervisor-recommended IDPs individually as they arrive
- Can **Approve** (with optional remarks) or **Return** (with required remarks back to employee)
- After reviewing, performs a **batch submit** of all approved IDPs from their office to PMT
- Receives notifications when supervisor recommends an IDP

---

## Page Structure

### Employee
- `/employee/idp` — View own IDP status, fill in rows, submit

### Supervisor
- `/supervisor/idp` — List of employee IDPs assigned to them
- `/supervisor/idp/{idp}` — Individual IDP review page

### Department Head
- `/dept-head/idp` — Office-level list of IDPs (grouped view)
- `/dept-head/idp/{idp}` — Individual employee IDP review (approve/return)

### PMT
- `/pmt/idp` — **Office card list** (redesigned, was a flat list)
- `/pmt/idp/office/{office}` — Office show page with list of low-performing employees and their IDP statuses + "Submit to L&D" batch button
- `/pmt/idp/{idp}` — Individual employee IDP show page with performance details for the period and PMT remarks field

---

## PMT Office Card (UI)

The PMT index page shows a **card grid** of offices that have active IDPs. Each card displays:

```
┌─────────────────────────────────────────────────┐
│  🏢 Office of the Regional Director             │
│                                                  │
│  Period: 2025 Mid-Year                           │
│                                                  │
│  Office Score:  3.28        Rating: Satisfactory │
│                                                  │
│  ┌──────────┬──────────┬──────────┐             │
│  │  Total   │ Approved │ Pending  │             │
│  │    5     │    3     │    2     │             │
│  └──────────┴──────────┴──────────┘             │
│                                                  │
│                          [ View Office IDPs → ]  │
└─────────────────────────────────────────────────┘
```

Cards are color-coded by office rating:
- 🟢 Green — Outstanding / Very Satisfactory
- 🟡 Yellow — Satisfactory / Fair
- 🔴 Red — Unsatisfactory / Poor

---

## Dept Head — Submit to PMT Validation

When Dept Head clicks **"Submit to PMT"**, the system checks all low-performing employees under their office for the period.

If any employee has an incomplete IDP, the **`ValidationModal`** is triggered (existing reusable component at `resources/js/Components/ValidationModal.jsx`).

### Validation Rules

| Condition | Reason Shown | Notify Target |
|---|---|---|
| Employee has not submitted IDP | "Has not submitted IDP yet" | Employee |
| Supervisor has not recommended | "Awaiting supervisor recommendation" | Supervisor |
| IDP was returned, not resubmitted | "IDP was returned, awaiting revision" | Employee |

### ValidationModal Behavior
- Lists all affected employees with avatar, name, position, and reason
- Each item has a **Notify** button that sends a reminder notification to the relevant person
- Notify button POSTs to `/api/notify/reminder`
- Shows "✓ Notified" state after sending
- Dept Head can close the modal with "Understood"
- **Submit is blocked** until all low-performing employees under the office have `dept_head_approved` status

---

## IDP Rows Structure

Each IDP contains an array of rows (`idp_rows`) stored as JSON:

```json
[
  {
    "performance_gap": "string",
    "developmental_activity": "string",
    "support_needed": "string",
    "support_from_supervisor": "string",
    "expected_completion": "string",
    "results": "string"
  }
]
```

---

## Notifications Summary

| Event | Recipient | Message |
|---|---|---|
| Employee submits IDP | Supervisor | "Employee X has submitted their IDP for your review." |
| Supervisor recommends | Dept Head | "Employee X's IDP has been recommended and awaits your approval." |
| Supervisor recommends | Employee | "Your IDP has been reviewed and recommended by your supervisor." |
| Supervisor returns | Employee | "Your IDP was returned by your supervisor. Please review remarks and resubmit." |
| Dept Head approves | Employee | "Your IDP has been approved." |
| Dept Head returns | Employee | "Your IDP was returned by the Department Head. Please review remarks and resubmit." |
| Dept Head submits to PMT | PMT (system) | IDPs appear in PMT office queue |
| PMT submits to L&D | Employee | "Your IDP has been submitted to the Learning & Development Section." |

---

## Database Changes Required

### `development_plans` table
- Add status `dept_head_approved` to the status enum/set
- Add status `submitted_to_pmt` to the status enum/set
- Existing columns for `dept_head_id`, `dept_head_remarks`, `dept_head_action_at` remain

### New Constant in `DevelopmentPlan` model
```php
public const STATUS_DEPT_HEAD_APPROVED = 'dept_head_approved';
public const STATUS_SUBMITTED_TO_PMT   = 'submitted_to_pmt';
```

---

## Files to Modify

### Backend
- `app/Models/DevelopmentPlan.php` — Add new status constants
- `app/Http/Controllers/DeptHead/IdpController.php` — Add `submitToPmt` batch action
- `app/Http/Controllers/Pmt/IdpController.php` — Refactor to office-level (add `officeIndex`, `officeShow` methods)
- `app/Services/DevelopmentPlanningService.php` — Add office grouping logic
- `routes/web.php` — Add new routes for office-level PMT views and dept head batch submit

### Frontend
- `resources/js/Pages/DeptHead/Idp/Index.jsx` — Office-level grouped view with batch submit + ValidationModal
- `resources/js/Pages/Pmt/Idp/Index.jsx` — Replace flat list with office card grid
- `resources/js/Pages/Pmt/Idp/OfficeShow.jsx` — New page: office employees list + Submit to L&D
- `resources/js/Pages/Pmt/Idp/Show.jsx` — Add employee performance details section

---

*Document created: June 29, 2026*
*Status: Approved for implementation*
