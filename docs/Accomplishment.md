# Accomplishment Module — Flow Documentation

**Last Updated:** 2026-06-24

---

## Overview

The Accomplishment Module handles the end-of-period performance review cycle. It covers individual employee accomplishments (SMPOR + IPCR-based) and consolidates them into an office-level OPCR Accomplishment reviewed by PMT.

This design aligns with the CSC SPMS framework where:
- The **OPCR is the primary review object** at the PMT level — not individual employee submissions.
- Individual IPCRs and SMPOR data feed **into** the OPCR Accomplishment, not separately to PMT.
- **PMT reviews at the office level**, drilling into individual records from within the OPCR Accomplishment — not through a separate employee accomplishment queue.

---

## Pre-conditions (Before Employee Can Submit)

Both must be satisfied:

1. All prior months (from period start up to current month) must have an **approved MPOR** for the employee.
2. Both **Q1 and Q2 QARs** must be **PMT-validated** for the employee's office.

---

## Workflow Flow

```
Employee
  └─ Submit Accomplishment
        ↓
Supervisor
  └─ Endorse → (forwarded to Dept Head)
  └─ Return  → (back to Employee)
        ↓
Dept Head
  └─ Approve → (employee consolidated into OPCR Accomplishment pool)
  └─ Return  → (back to Employee)
        ↓
Dept Head submits OPCR Accomplishment to PMT
        ↓
PMT reviews OPCR Accomplishment (office level)
  └─ Opens each employee's show page from within the OPCR review
  └─ Calibrates individual employee score if needed
        → Office OPCR rating recomputes live (draft, not saved yet)
  └─ Release OPCR Accomplishment
        → Individual final_rating written for each employee
        → Office final_office_rating written
        → IDP auto-initiated for Poor/Unsatisfactory employees
```

---

## Statuses

### AccomplishmentSubmission (Employee Level)

| Status | Description |
|---|---|
| `draft` | Employee has not yet submitted |
| `submitted_to_supervisor` | Employee submitted, awaiting supervisor action |
| `returned_to_employee` | Returned by supervisor or dept head |
| `supervisor_endorsed` | Supervisor forwarded to dept head |
| `dept_head_approved` | Dept head approved; included in OPCR Accomplishment pool |
| `released_by_pmt` | PMT released the OPCR Accomplishment; final rating written |

### OpcraAccomplishmentSubmission (Office Level)

| Status | Description |
|---|---|
| `draft` | Not yet submitted by dept head |
| `submitted` | Dept head submitted to PMT |
| `returned` | PMT returned to dept head |
| `released` | PMT released; final office rating confirmed |

---

## Role Responsibilities

### Employee
- Views SMPOR and IPCR previews before submitting.
- SMPOR data source priority:
  1. `qar_official` — from PMT-validated QARs
  2. `submitted_mpor_preview` — fallback from individually approved MPORs
- Submits with optional remarks and file attachments.
- Can resubmit after a return.

### Supervisor
- Reviews the employee's SMPOR table and IPCR Q/E/T/A ratings.
- **Endorse** → forwards to Dept Head (`supervisor_endorsed`).
- **Return** → sends back to employee (`returned_to_employee`).

### Dept Head
- Reviews endorsed submissions.
- **Approve** → employee status becomes `dept_head_approved`; their data is now part of the OPCR Accomplishment pool. Does NOT forward to PMT individually.
- **Return** → sends back to employee (`returned_to_employee`).
- Once satisfied with the pool, **submits the OPCR Accomplishment** to PMT as a single office-level package.
- Can flag the OPCR Accomplishment for calibration when submitting.
- Can submit with partial employees approved (not all employees need to be approved first).

### PMT
- **No separate Employee Accomplishment Review page.**
- Reviews OPCR Accomplishments (office level) only.
- From within the OPCR Accomplishment show page, can open each employee's accomplishment detail.
- Can **calibrate individual employee scores** from within the OPCR Accomplishment review.
  - Adjusted scores update the computed office rating in real-time (draft state, not persisted until release).
- **Release** → confirms office rating as-is (computed from employee ratings).
- **Calibrate & Release** → overrides the office rating with a manually set value.
- **Return** → sends OPCR Accomplishment back to Dept Head.
- On release, individual `final_rating` and `final_adjectival_rating` are written to each employee's submission.

---

## Score Computation

### Individual (IPCR-based, per indicator)

Each IPCR indicator is computed from rated ORS entries within the performance period:

| Dimension | Formula |
|---|---|
| **Q** (Quality) | Weighted avg quality rating across all rated ORS entries |
| **E** (Efficiency) | `min(5.0, (actual_qty / target_qty) × 5)` |
| **T** (Timeliness) | Weighted avg timeliness rating across all rated ORS entries |
| **A** (Average) | `(Q + E + T) / 3` |

### Overall Employee Score

Weighted average of function-type scores (Core, Support, Strategic) using `weight_percent` from `UwpFunction`.

### Office Score (OPCR Accomplishment)

Computed from all `dept_head_approved` (and later `released_by_pmt`) employees' final ratings under the office for the period. Recomputes whenever PMT adjusts an individual score during calibration.

---

## Adjectival Rating Scale

| Score Range | Rating |
|---|---|
| ≥ 4.5 | Outstanding |
| ≥ 3.5 | Very Satisfactory |
| ≥ 2.5 | Satisfactory |
| ≥ 1.5 | Unsatisfactory |
| < 1.5 | Poor |

---

## IDP Auto-Initiation

Triggered automatically when PMT releases the OPCR Accomplishment, for any employee whose `final_adjectival_rating` is **Poor** or **Unsatisfactory**.

- Creates a `DevelopmentPlan` record linked to the employee's IPCR.
- Notifies the employee to fill out their IDP.
- Idempotent — skipped if a DevelopmentPlan already exists for that IPCR.

---

## Key Design Decisions

- **OPCR Accomplishment is the PMT's primary review object.** PMT does not have a standalone employee accomplishment review queue.
- **Dept Head is the consolidator.** They approve employees one by one; the pool builds up until they're ready to submit to PMT.
- **Individual final ratings are only written at PMT release**, not when Dept Head approves. During PMT calibration, adjusted scores are working/draft values.
- **Live office score recomputation** happens when PMT adjusts any employee score during calibration, giving PMT a real-time view of the office impact before releasing.
- This design is consistent with the **CSC SPMS framework** where the OPCR (office-level document) is the accountability unit reviewed by the PMT, not individual IPCRs reviewed separately.

---

## Affected Controllers

| Controller | Role | Responsibility |
|---|---|---|
| `Employee\SmporIpcrAccomplishmentController` | Employee | Submit, preview SMPOR/IPCR |
| `Supervisor\AccomplishmentController` | Supervisor | Endorse or return |
| `DeptHead\AccomplishmentReviewController` | Dept Head | Approve or return individual submissions |
| `DeptHead\OpcraAccomplishmentController` | Dept Head | Submit office-level OPCR Accomplishment to PMT; serve employee show page |
| `Pmt\OpcraAccomplishmentController` | PMT | Review, calibrate per-employee, release office OPCR Accomplishment |

> `Pmt\AccomplishmentReviewController` — **to be removed** under the new flow.

---

## Page Restructure

### Folder Structure

```
Pages/
├── DeptHead/
│   ├── AccomplishmentReview/
│   │   └── Index.jsx          ← KEEP: pending list (supervisor_endorsed) + Approve/Return
│   │   🗑️ Show.jsx
│   │   🗑️ SmporPreview.jsx
│   │   🗑️ IpcrPreview.jsx
│   └── OpcraAccomplishment/
│       ├── Index.jsx          ✏️ office pool + employee status + submit to PMT
│       ├── EmployeeShow.jsx   🆕 SMPOR + IPCR detail + Approve/Return
│       ├── SmporPreview.jsx   🆕
│       └── IpcrPreview.jsx    🆕
│
├── Pmt/
│   ├── AccomplishmentReview/
│   │   🗑️ Index.jsx
│   │   🗑️ Show.jsx
│   │   🗑️ SmporPreview.jsx
│   │   🗑️ IpcrPreview.jsx
│   └── OpcraAccomplishment/
│       ├── Index.jsx          ✏️ minor: remove old AccomplishmentReview link
│       ├── Show.jsx           ✏️ employee list links to EmployeeShow + live office score
│       ├── EmployeeShow.jsx   🆕 SMPOR + IPCR detail + Calibrate
│       ├── SmporPreview.jsx   🆕
│       └── IpcrPreview.jsx    🆕
```

### Page Summary

| Action | Count | Pages |
|---|---|---|
| 🆕 New | 6 | `DeptHead/OpcraAccomplishment/EmployeeShow.jsx`, `SmporPreview.jsx`, `IpcrPreview.jsx` · `Pmt/OpcraAccomplishment/EmployeeShow.jsx`, `SmporPreview.jsx`, `IpcrPreview.jsx` |
| ✏️ Modified | 4 | `DeptHead/OpcraAccomplishment/Index.jsx` · `DeptHead/AccomplishmentReview/Index.jsx` · `Pmt/OpcraAccomplishment/Show.jsx` · `Pmt/OpcraAccomplishment/Index.jsx` |
| 🗑️ Deleted | 7 | `DeptHead/AccomplishmentReview/Show.jsx`, `SmporPreview.jsx`, `IpcrPreview.jsx` · `Pmt/AccomplishmentReview/Index.jsx`, `Show.jsx`, `SmporPreview.jsx`, `IpcrPreview.jsx` |

> `EmployeeShow.jsx` + `SmporPreview.jsx` + `IpcrPreview.jsx` in both new locations are structurally identical to the current `AccomplishmentReview/Show.jsx` and its sub-pages — only the available actions differ (Approve/Return for Dept Head; Calibrate for PMT).

---

## Pending Implementation Changes

### Backend
- [ ] Rename `dept_head_endorsed` status → `dept_head_approved` in migration and all references.
- [ ] Remove `Pmt\AccomplishmentReviewController` and its routes.
- [ ] Update `DeptHead\AccomplishmentReviewController@endorse` → rename to `approve`, update status to `dept_head_approved`.
- [ ] Add per-employee calibration endpoint in `Pmt\OpcraAccomplishmentController` with live office score recomputation (draft, not persisted until release).
- [ ] Move `final_rating` / `final_adjectival_rating` write from per-employee PMT action → OPCR Accomplishment release.
- [ ] Move IDP auto-initiation trigger to OPCR Accomplishment release.
- [ ] Update `OpcrOfficeRatingService` to compute from `dept_head_approved` employees during calibration, finalize on release.

### Frontend
- [ ] Delete `DeptHead/AccomplishmentReview/Show.jsx`, `SmporPreview.jsx`, `IpcrPreview.jsx`.
- [ ] Delete entire `Pmt/AccomplishmentReview/` folder.
- [ ] Create `DeptHead/OpcraAccomplishment/EmployeeShow.jsx` + `SmporPreview.jsx` + `IpcrPreview.jsx` (mirror of old DeptHead Show, action = Approve/Return).
- [ ] Create `Pmt/OpcraAccomplishment/EmployeeShow.jsx` + `SmporPreview.jsx` + `IpcrPreview.jsx` (mirror of old PMT Show, action = Calibrate).
- [ ] Update `DeptHead/OpcraAccomplishment/Index.jsx` — reflect consolidated employee pool, link to new EmployeeShow.
- [ ] Update `DeptHead/AccomplishmentReview/Index.jsx` — update action labels (Approve/Return).
- [ ] Update `Pmt/OpcraAccomplishment/Show.jsx` — employee list links to new EmployeeShow, show live-computed office score.
- [ ] Update `Pmt/OpcraAccomplishment/Index.jsx` — remove link to old AccomplishmentReview.
