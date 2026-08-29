# PMS → L&D Integration Contract

> **Last updated:** August 29, 2026
> **Status:** Integration documented — code alignment needed (see Known Issues)
> **Prepared by:** smart-pms coding agent

---

## ⚠️ Known Issue — Recurring Break on L&D Reconnect (Documented Aug 29, 2026)

### What breaks and why

Every time the L&D system restarts or reconnects to PMS via the HRMO Hub, **two things happen**:

1. The Hub `hrmo_hub_connections` row for `ld` gets a new `base_url` (new ngrok URL) and a new token via the handshake.
2. The `.env` value `LND_BASE_URL` is **not updated automatically**.

`LndHandoffService` reads from `.env` first, Hub second (fallback). So after an L&D reconnect, the service keeps sending to the **old `.env` URL** — which either points to an old ngrok tunnel (dead) or `127.0.0.1:8000` (local, not reachable from PMS). L&D never receives the payload.

### Symptoms
- PMT submits IDP to L&D — PMS shows "Submitted to L&D" / `lnd_sync_status = sent` or even `acknowledged`
- L&D database has no record of the employee
- No error in PMS because the old URL either times out silently or returns a stale 200

### Confirmed occurrence: Aug 29, 2026
- L&D reconnected at 23:00 and again at 23:28 (two reconnects in one day — likely ngrok tunnel cycling)
- `.env` `LND_BASE_URL` was still `http://127.0.0.1:8000`
- Hub `base_url` was `https://subtotal-subdivide-chatter.ngrok-free.dev/`
- All three IDPs (Carlos, Ramon, Liza) were submitted to the wrong URL
- **Fix applied:** Updated `LND_BASE_URL` in `.env` to match current Hub `base_url`, cleared config cache, reverted all three plans to `submitted_to_pmt`

### Permanent fix needed (not yet implemented)

**Option A (recommended):** Remove `.env` as the source of truth for `LndHandoffService`. Always read exclusively from `hrmo_hub_connections` where `pillar = 'ld'` and `status = 'connected'`. The Hub is already the authoritative source — `.env` should only be a fallback for local dev with no Hub connection.

```php
// LndHandoffService::sendDevelopmentPlan() — change this:
$baseUrl = trim((string) ($hubConnection?->base_url ?: config('services.lnd.base_url', '')));
$token   = trim((string) ($hubConnection?->token   ?: config('services.lnd.token', '')));

// To this (Hub is authoritative, .env is last resort):
$baseUrl = trim((string) ($hubConnection?->base_url ?? config('services.lnd.base_url', '')));
$token   = trim((string) ($hubConnection?->token   ?? config('services.lnd.token', '')));
```
Note: `?:` skips empty strings, `??` only skips null. Since `base_url` in Hub is never empty when connected, both work the same here. The real fix is ensuring the Hub row is always authoritative — which it already is as long as `.env` fallback is not set to a stale value.

**Option B:** When L&D reconnects (Hub `connectionAccepted` fires), automatically sync `LND_BASE_URL` and `LND_API_TOKEN` in `.env`. Fragile — avoid.

**Option C (workaround until A is done):** After every L&D reconnect, manually update `LND_BASE_URL` in `.env` to match the new Hub `base_url` and run `php artisan config:clear`.

### Quick manual recovery steps (for future incidents)
```bash
# 1. Check what URL the Hub has vs what .env has
php artisan tinker
> \App\Models\HrmoHubConnection::where('pillar','ld')->first()->base_url
> config('services.lnd.base_url')

# 2. If they differ — update .env LND_BASE_URL to match Hub base_url
# 3. php artisan config:clear
# 4. Revert affected plans via the Revert button on /pmt/idp/{id}
#    or run the revert script if the UI isn't loading
# 5. Re-submit from /pmt/idp/office/{id}
```

---

---

## Overview

The **smart-pms** system identifies low-performing employees from released IPCR results. After their Individual Development Plan (IDP) is approved and reviewed by PMT, PMT submits the employee to the L&D system for training.

This document is the **complete API contract** between the two systems. It reflects the **current database structure** of smart-pms (as of August 2026) where employee-level fields were migrated off the `users` table and onto a separate `employees` table.

---

## Database Architecture (smart-pms — Verified August 22, 2026)

> ⚠️ This section is critical context for any AI agent implementing or modifying PMS-side integration code.
> All column lists below are verified against the **live database** via `Schema::getColumnListing()`.

### Actual Live Column Layout

#### `users` table (live)
```
id, name, role, email, email_verified_at, password,
two_factor_secret, two_factor_recovery_codes, two_factor_confirmed_at,
remember_token, created_at, updated_at,
office_id,   ← re-added by 2026_07_28 migration (also exists on employees)
position     ← re-added by 2026_07_28 migration (also exists on employees)
```

**Not on users:** `training_locked`, `lnd_reference_id`, `employee_id`, `is_active`, `is_disabled`, `activated_at`, `profile_photo_path`

#### `employees` table (live)
```
id, user_id (FK→users, unique),
first_name, middle_name, last_name,
employee_id, hms_employee_id,
office_id,         ← also on users (duplicate — employees is authoritative)
position,          ← also on users (duplicate — employees is authoritative)
is_active, is_disabled, activated_at, profile_photo_path,
training_locked,   ← ★ L&D lock flag — ONLY on employees
lnd_reference_id,  ← ★ L&D reference ID — ONLY on employees
created_at, updated_at
```

### Why `office_id` and `position` Exist on Both Tables

Migration `2026_07_20_000001` moved those columns from `users` → `employees`. But migration `2026_07_28_151206` re-added `office_id` and `position` back to `users` (with `if (!Schema::hasColumn(...))` guards so it's safe). Both tables have these columns.

The `User` model accessors for `office_id` and `position` read from `employees` (the authoritative source). The columns on `users` are a redundancy from the re-add migration. When writing `office_id` or `position`, write to `employees`.

### Accessor Bridge

The `User` model has read-only accessor methods that delegate to `employees` so legacy code like `$user->training_locked`, `$user->office_id`, `$user->position` etc. continues to work. **These accessors are read-only** — calling `$user->update(['training_locked' => false])` will silently fail because `training_locked` is not in `users.$fillable` and has no column on `users`.

### Rule for Agents: How to Read vs Write Employee Fields

| Field | Read | Write |
|---|---|---|
| `training_locked` | `$user->training_locked` (accessor → employees) | `$user->employee->update(['training_locked' => false])` |
| `lnd_reference_id` | `$user->lnd_reference_id` (accessor → employees) | `$user->employee->update(['lnd_reference_id' => '...'])` |
| `office_id` | `$user->office_id` (accessor → employees) | `$user->employee->update(['office_id' => ...])` |
| `position` | `$user->position` (accessor → employees) | `$user->employee->update(['position' => '...'])` |
| `is_active` | `$user->is_active` (accessor → employees) | `$user->employee->update(['is_active' => true])` |
| `office name` | `$user->office->name` (accessor → employees → offices) | — |
| `full name` | `$user->employee->full_name` (computed on Employee) | set `first_name`, `middle_name`, `last_name` on employees |

The `DevelopmentPlan` model's `employee` relationship points to `User`. To reach the `Employee` record from a plan:

```php
$plan->employee              // returns User
$plan->employee->employee    // returns Employee model (the separate record)
$plan->employee->employee->office  // returns Office
```

The `LndHandoffService::buildPayload()` already loads:
```php
'employee.employee.office'
```
This is correct — `plan->employee` = User, `plan->employee->employee` = Employee record, `plan->employee->employee->office` = Office.

---

## How the Handoff Works (Big Picture)

```
PMT clicks "Submit to L&D" in smart-pms
        │
        ▼
DevelopmentPlanningController::submitToLd()
  → LndHandoffService::sendDevelopmentPlan()
  → POSTs full employee payload → L&D API
        │
        ▼
L&D stores the record, returns lnd_reference_id
        │
        ▼
PMS stores lnd_reference_id on development_plans.lnd_reference_id
PMS must also write to employees.training_locked = true
PMS must also write to employees.lnd_reference_id = lnd_reference_id
Employee is redirected to L&D website when they try to log into PMS
        │
        ▼
Employee completes training in L&D system
        │
        ▼
L&D POSTs callback → PMS /api/lnd-callback/complete-training
        │
        ▼
PMS unlocks: employees.training_locked = false
PMS clears:  employees.lnd_reference_id = null (optional)
PMS marks:   development_plans.status = 'completed'
Employee can log into PMS again
```

---

## Known Issues — Code Needs Fixing (Not Yet Done)

These are documented here so the implementing agent knows what to fix. **Do not fix the database — only fix the PHP code.**

### Issue 1 — `LndCallbackController` writes to `users` instead of `employees` (CRITICAL)

**File:** `app/Http/Controllers/Api/LndCallbackController.php`

**Current broken code:**
```php
$employee->update(['training_locked' => false]);
// $employee is a User model — users table no longer has training_locked column
```

**Correct fix:**
```php
$employee->employee?->update(['training_locked' => false]);
// writes to employees table via the hasOne relationship
```

Additionally, after unlocking, optionally clear the lnd_reference_id on the employee:
```php
$employee->employee?->update([
    'training_locked'    => false,
    'lnd_reference_id'   => null,
]);
```

---

### Issue 2 — `DevelopmentPlanningController::submitToLd()` does NOT lock the employee (CRITICAL)

**File:** `app/Http/Controllers/Pmt/DevelopmentPlanningController.php`

**Current state:** After a successful L&D submission, the controller updates `development_plans` only. It never sets `training_locked = true` or `lnd_reference_id` on the `Employee` record.

**What must be added** after the `$developmentPlan->update([...])` call:

```php
// After updating development_plans, lock the employee account
$employeeUser = $developmentPlan->employee; // User model
if ($employeeUser?->employee) {
    $employeeUser->employee->update([
        'training_locked'  => true,
        'lnd_reference_id' => $result['lnd_reference_id'] ?? null,
    ]);
}
```

This ensures `RedirectIfTrainingLocked` middleware correctly redirects the employee to L&D when they try to log in.

---

### Issue 3 — `LndHandoffService::buildPayload()` employee.email chain

**File:** `app/Services/LndHandoffService.php`

**Current code:**
```php
'email' => (string) ($developmentPlan->employee?->email ?? '--'),
```

`$developmentPlan->employee` returns a `User`. `$user->email` is a direct column on `users` — this is **correct and works as-is**. No fix needed here.

---

## Part 1: smart-pms → L&D (Intake Endpoint)

### Endpoint L&D must build

```
POST /api/lnd/development-plans
Authorization: Bearer {LND_API_TOKEN}
Content-Type: application/json
Accept: application/json
```

- `LND_API_TOKEN` — a static Bearer token that L&D defines and shares with the PMS team
- PMS stores this token in its `.env` as `LND_API_TOKEN`
- PMS stores the L&D base URL in its `.env` as `LND_BASE_URL`

---

### Full Request Payload

```json
{
  "external_plan_id": "PMS-DP-42",
  "source_system": "PMS",

  "period": {
    "id": 3,
    "name": "Jan-Jun 2026"
  },

  "employee": {
    "id": 17,
    "name": "Carlos Mendoza",
    "email": "carlos.mendoza@agency.gov.ph",
    "position": "HR Assistant II",
    "office_id": 5,
    "office_name": "Human Resource Management Office"
  },

  "performance": {
    "official_score": 1.50,
    "official_rating": "Poor",
    "pmt_adjusted_score": null,
    "pmt_adjusted_rating": null,
    "released_at": "2026-06-28T00:00:00.000000Z"
  },

  "ipcr": {
    "id": 88,
    "functions": [
      {
        "id": 1,
        "name": "Core Functions",
        "function_type": "core",
        "weight_percent": 70,
        "mfos": [
          {
            "id": 5,
            "title": "Recruitment, Selection and Placement",
            "indicators": [
              {
                "id": 21,
                "indicator_text": "Monthly reports submitted on time",
                "target_quantity": 6,
                "target_timeline": "Monthly",
                "ratings": {
                  "Q": 1.20,
                  "E": 0.83,
                  "T": 1.50,
                  "A": 1.18,
                  "actual_quantity": 1
                },
                "standards": [
                  { "dimension": "quality",    "rating": 5, "standard_text": "100% accurate, zero errors" },
                  { "dimension": "quality",    "rating": 4, "standard_text": "Accurate with 1-2 minor errors" },
                  { "dimension": "quality",    "rating": 3, "standard_text": "Accurate with 3-4 minor errors" },
                  { "dimension": "quality",    "rating": 2, "standard_text": "With major errors" },
                  { "dimension": "quality",    "rating": 1, "standard_text": "Inaccurate, requires full revision" },
                  { "dimension": "timeliness", "rating": 5, "standard_text": "Submitted 2+ days before deadline" },
                  { "dimension": "timeliness", "rating": 3, "standard_text": "Submitted on deadline" },
                  { "dimension": "timeliness", "rating": 1, "standard_text": "Submitted 2+ days after deadline" }
                ]
              }
            ]
          }
        ]
      }
    ],
    "weighted_summary": [
      {
        "function_name": "Core Functions",
        "weight_percent": 70,
        "average_rating": 1.18,
        "weighted_score": 0.83
      }
    ]
  },

  "idp_rows": [
    {
      "performance_gap": "Low output quantity in recruitment processes",
      "developmental_activity": "Attend advanced HR training",
      "support_needed": "Training budget, mentorship",
      "support_from_supervisor": "Weekly coaching sessions",
      "expected_completion": "Q3 2026",
      "results": ""
    }
  ],

  "references": {
    "ipcr_id": 88,
    "opcr_id": null
  }
}
```

### Field Reference

#### `employee` block — field sources (PMS side)

| Field | Source in PMS |
|---|---|
| `id` | `development_plans.employee_id` → `users.id` |
| `name` | `users.name` |
| `email` | `users.email` |
| `position` | `employees.position` (via `$user->position` accessor) |
| `office_id` | `employees.office_id` (via `$user->office_id` accessor) |
| `office_name` | `employees.office_id` → `offices.name` (via `$user->employee->office->name`) |

#### `performance` block

| Field | Source |
|---|---|
| `official_score` | `development_plans.source_score` |
| `official_rating` | `development_plans.source_rating` |
| `pmt_adjusted_score` | `ipcrs.pmt_adjusted_score` |
| `pmt_adjusted_rating` | `ipcrs.pmt_adjusted_rating` |
| `released_at` | `ipcrs.released_at` |

---

### Required Response from L&D

**Success — HTTP 201 Created:**
```json
{
  "status": "acknowledged",
  "lnd_reference_id": "LND-REF-2026-00042"
}
```

**What PMS must do after a successful response:**

| Location | Column | Before | After |
|---|---|---|---|
| `development_plans` | `status` | `draft` or `pending_details` | `submitted_to_ld` |
| `development_plans` | `lnd_sync_status` | `not_sent` | `acknowledged` or `sent` |
| `development_plans` | `lnd_reference_id` | `null` | value from L&D response |
| `development_plans` | `submitted_to_ld_at` | `null` | current timestamp |
| `employees` | `training_locked` | `false` | `true` ← **must write to employees table** |
| `employees` | `lnd_reference_id` | `null` | value from L&D response ← **must write to employees table** |

> ⚠️ `development_plans.lnd_reference_id` and `employees.lnd_reference_id` are separate columns.
> Both should be set. The one on `employees` is what `RedirectIfTrainingLocked` middleware reads
> to build the redirect URL.

---

## Part 2: Employee Redirect to L&D

When a training-locked employee tries to log into smart-pms, `RedirectIfTrainingLocked` middleware fires.

**Middleware reads from:**
- `$user->employee->training_locked` — determines if redirect applies
- `$user->employee->lnd_reference_id` — used as the `plan` parameter in the redirect URL

**Redirect URL format:**
```
https://{LND_HOST}/intake?pms_user_id=17&plan=LND-REF-2026-00042&sig={hmac}
```

| Parameter | Source |
|---|---|
| `pms_user_id` | `users.id` |
| `plan` | `employees.lnd_reference_id` |
| `sig` | HMAC-SHA256 of `pms_user_id + plan` using `LND_REDIRECT_HMAC_SECRET` |

If `employees.lnd_reference_id` is null (because Issue 2 above wasn't fixed), the `plan` param will be blank. This is why Issue 2 must be fixed.

---

## Part 3: L&D → PMS (Training Completion Callback)

### Endpoint (PMS side — already built)

```
POST /api/lnd-callback/complete-training
Authorization: Bearer {PMS_CALLBACK_TOKEN}
Content-Type: application/json
```

### Callback Payload (L&D sends this)

```json
{
  "pms_user_id": 17,
  "lnd_reference_id": "LND-REF-2026-00042",
  "external_plan_id": "PMS-DP-42",
  "completed_at": "2026-09-15T10:30:00Z",
  "courses_completed": [
    {
      "course_code": "LND-HR-101",
      "title": "Advanced HR Fundamentals",
      "completed_at": "2026-09-10T14:00:00Z"
    }
  ],
  "trainer_remarks": "Employee demonstrated marked improvement."
}
```

### What PMS must do after receiving the callback

**Current broken code in `LndCallbackController::completeTraining()`:**
```php
$employee->update(['training_locked' => false]);
// WRONG — $employee is User; training_locked is on employees table
```

**Correct code:**
```php
$employee->employee?->update([
    'training_locked'  => false,
    'lnd_reference_id' => null,  // optional cleanup
]);
```

**Full expected state changes:**

| Location | Column | Before | After |
|---|---|---|---|
| `development_plans` | `status` | `submitted_to_ld` | `completed` |
| `development_plans` | `lnd_completed_at` | `null` | timestamp from callback |
| `development_plans` | `lnd_completion_remarks` | `null` | trainer_remarks |
| `development_plans` | `lnd_courses_completed` | `null` | courses_completed array |
| `employees` | `training_locked` | `true` | `false` ← **write to employees table** |
| `employees` | `lnd_reference_id` | set | `null` (optional cleanup) |

---

## Part 4: PMS Files That Need Code Changes

| File | Method | What to Fix |
|---|---|---|
| `app/Http/Controllers/Pmt/DevelopmentPlanningController.php` | `submitToLd()` | After updating `development_plans`, also write `training_locked = true` and `lnd_reference_id` to `$plan->employee->employee` |
| `app/Http/Controllers/Api/LndCallbackController.php` | `completeTraining()` | Change `$employee->update(['training_locked' => false])` to `$employee->employee?->update([...])` |

**Files that are already correct and do not need changes:**
- `app/Services/LndHandoffService.php` — payload building is correct
- `app/Http/Middleware/RedirectIfTrainingLocked.php` — already reads from `$user->employee?->training_locked`
- `app/Http/Middleware/VerifyLndCallbackToken.php` — correct
- `app/Models/HrmoHubConnection.php` — correct
- `routes/api.php` — correct
- `config/services.php` — correct

---

## Part 5: Database Tables (PMS Side — Verified Live Schema)

> Verified via `Schema::getColumnListing()` on August 22, 2026.

### `users` (auth + role + redundant office/position)
```sql
id
name             VARCHAR
role             VARCHAR nullable
email            VARCHAR unique
email_verified_at TIMESTAMP nullable
password         VARCHAR
two_factor_secret TEXT nullable
two_factor_recovery_codes TEXT nullable
two_factor_confirmed_at TIMESTAMP nullable
remember_token   VARCHAR nullable
created_at, updated_at
office_id        BIGINT nullable FK→offices  ← re-added by 2026_07_28 migration
position         VARCHAR nullable            ← re-added by 2026_07_28 migration
```

**Important:** `training_locked`, `lnd_reference_id`, `employee_id`, `is_active`, `is_disabled`,
`activated_at`, `profile_photo_path` are **NOT** on `users`. They are only on `employees`.

### `employees` (all employee-level fields — authoritative for profile data)
```sql
id
user_id            BIGINT UNIQUE FK→users.id
first_name         VARCHAR nullable
middle_name        VARCHAR nullable
last_name          VARCHAR nullable
employee_id        VARCHAR nullable unique
hms_employee_id    BIGINT nullable unique
office_id          BIGINT nullable FK→offices.id   ← authoritative
position           VARCHAR nullable                ← authoritative
is_active          BOOLEAN default false
is_disabled        BOOLEAN default false
activated_at       TIMESTAMP nullable
profile_photo_path VARCHAR nullable
training_locked    BOOLEAN default false   ← ★ L&D lock — ONLY on employees
lnd_reference_id   VARCHAR nullable        ← ★ L&D reference — ONLY on employees
created_at, updated_at
```

### `development_plans`
```sql
id
ipcr_id                   BIGINT FK→ipcrs
employee_id               BIGINT FK→users.id
office_id                 BIGINT nullable
performance_period_id     BIGINT nullable FK→performance_periods
source_score              DECIMAL(5,2) nullable
source_rating             VARCHAR nullable
status                    VARCHAR default 'draft'
pmt_remarks               TEXT nullable
supervisor_id             BIGINT nullable FK→users.id
supervisor_remarks        TEXT nullable
supervisor_action_at      TIMESTAMP nullable
dept_head_id              BIGINT nullable FK→users.id
dept_head_remarks         TEXT nullable
dept_head_action_at       TIMESTAMP nullable
idp_rows                  JSON nullable
prepared_by_name          VARCHAR nullable
recommended_by_name       VARCHAR nullable
approved_by_name          VARCHAR nullable
lnd_sync_status           VARCHAR default 'not_sent'
lnd_reference_id          VARCHAR nullable     ← copy of L&D reference (for plan lookup)
lnd_synced_at             TIMESTAMP nullable
lnd_last_error            TEXT nullable
submitted_to_ld_at        TIMESTAMP nullable
lnd_completed_at          TIMESTAMP nullable
lnd_completion_remarks    TEXT nullable
lnd_courses_completed     JSON nullable
created_by                BIGINT nullable FK→users.id
updated_by                BIGINT nullable FK→users.id
created_at, updated_at
```

---

## Part 6: Environment Variables

### smart-pms `.env`
```env
LND_BASE_URL=https://{lnd-host}                  # L&D provides their URL
LND_API_TOKEN={token}                            # L&D generates, shares with PMS
LND_TIMEOUT=20
LND_REDIRECT_HMAC_SECRET={shared-secret}         # Both teams agree on same value
PMS_CALLBACK_TOKEN={token}                       # PMS generates, shares with L&D
```

### config/services.php (PMS)
```php
'lnd' => [
    'base_url'             => env('LND_BASE_URL', ''),
    'token'                => env('LND_API_TOKEN', ''),
    'timeout'              => env('LND_TIMEOUT', 20),
    'redirect_hmac_secret' => env('LND_REDIRECT_HMAC_SECRET', ''),
],
'pms' => [
    'callback_token' => env('PMS_CALLBACK_TOKEN', ''),
],
```

---

## Part 7: What Each Side Still Needs to Fix

### smart-pms must fix:
- [ ] `DevelopmentPlanningController::submitToLd()` — after plan update, write `training_locked = true` and `lnd_reference_id` to `$plan->employee->employee` (the Employee model, not User)
- [ ] `LndCallbackController::completeTraining()` — change `$employee->update(['training_locked' => false])` to `$employee->employee?->update(['training_locked' => false, 'lnd_reference_id' => null])`

### L&D (CapstoneFinalSystem) must fix:
- [ ] See `L&D.md` in CapstoneFinalSystem for L&D-side issues

### Already working on both sides:
- [x] API routes and middleware
- [x] Payload structure and validation
- [x] `LndHandoffService` payload building
- [x] `PmsCallbackService` outbound callback
- [x] `RedirectIfTrainingLocked` middleware (already reads from `employee` record correctly)
- [x] Token verification on both sides
- [x] `.env` tokens already set and matching

---

## Part 8: Shared Secrets (Current Values Set)

Tokens are already configured in both `.env` files. For local cross-machine testing:
- Use ngrok to expose L&D's local server → put the ngrok URL in PMS's `LND_BASE_URL`
- Use ngrok or Herd's local URL for PMS → put it in L&D's `PMS_BASE_URL`
- `PMS_BASE_URL=http://smart-pms.test` in L&D's `.env` only works if both systems run on the same machine

---

*Document updated: August 22, 2026*
*Both systems: Laravel + Inertia stack*
*PMS stack: Laravel 11, Inertia, React (JSX), Spatie Permissions*
