# User ↔ Employee Table Separation Plan

**Goal:** Split the single fat `users` table into two tables:
- `users` — auth concerns only (login identity)
- `employees` — employment/HR concerns (office, position, activation state, etc.)

Relationship: `users` **has one** `employees` (one-to-one, `employees.user_id → users.id`).

---

## Current State

### What lives in `users` today

| Column | Nature |
|---|---|
| `id` | PK |
| `name` | Auth + display |
| `email` | Auth |
| `email_verified_at` | Auth |
| `password` | Auth |
| `remember_token` | Auth |
| `two_factor_*` | Auth (Fortify) |
| `role` | App-level role (auth boundary) |
| `employee_id` | ← Employee field |
| `hms_employee_id` | ← Employee field |
| `office_id` | ← Employee field |
| `position` | ← Employee field |
| `is_active` | ← Employee field |
| `is_disabled` | ← Employee field |
| `activated_at` | ← Employee field |
| `profile_photo_path` | ← Employee field |
| `training_locked` | ← Employee field |
| `lnd_reference_id` | ← Employee field |

### Migration already drafted

`database/migrations/2026_07_20_000001_create_employees_table.php` — already exists and looks correct. It:
1. Creates `employees` table with a `user_id` FK (unique, cascade-delete).
2. Copies all employee rows from `users` → `employees`.
3. Drops those columns from `users`.

The `Employee` model (`app/Models/Employee.php`) is also already scaffolded.
The `EmployeeFactory` is also done.

---

## Status: What's Already Done vs. What Still Needs Updating

### ✅ Already Done
- `database/migrations/2026_07_20_000001_create_employees_table.php` — migration
- `app/Models/Employee.php` — model with `user()` and `office()` relationships
- `database/factories/EmployeeFactory.php` — factory

### ❌ Still Needs Work (the main bulk of changes)

---

## Files That Need Changes

### 1. `app/Models/User.php`
**What to do:**
- Remove all employee fields from `$fillable` (`employee_id`, `hms_employee_id`, `office_id`, `position`, `is_active`, `is_disabled`, `activated_at`, `profile_photo_path`, `training_locked`, `lnd_reference_id`).
- Remove from `$activitylogAttributes`.
- Remove from `casts()`.
- Remove `$appends` profile photo accessor (moves to Employee).
- Remove `office()` and `supervisedOffice()` relationships (office is on Employee now).
- Add `employee()` hasOne relationship.
- Keep `role`, `name`, `email`, `password`, and auth-related fields.
- Decide: keep `profile_photo_url` accessor on User as a delegate to `$this->employee->profile_photo_url`? Or remove it? Many places use `$user->profile_photo_url` via Inertia shared data.

**Decision point:** The `HandleInertiaRequests` middleware shares `employee_id`, `office_id`, `office_name`, `position`, `is_active`, `is_disabled`, `activated_at`, `profile_photo_url` from `$request->user()`. These must either use eager-loaded employee data or be proxied through accessors.

**Recommended approach:** Add read-through accessors on `User` that delegate to `$this->employee` — this is a bridge pattern that avoids touching every controller at once. Mark them `@deprecated` once the migration is complete.

---

### 2. `app/Models/Employee.php`
**What to add:**
- `HasOne` or `HasMany` relationship back to `Ipcr`, `AccomplishmentSubmission`, `Mpor`, `OrsEntry`, etc.? Actually no — those models point to `user_id` under the column name `employee_id`. They should stay pointing to `users.id` (the FK semantics are "the user acting as employee"). Only add what's needed.
- `getInitialsAttribute()` accessor (currently on User).
- Possibly `isSupervisor()`, `isDepartmentHead()` etc. if ever called on Employee — but probably not needed.

---

### 3. `app/Http/Middleware/HandleInertiaRequests.php`
**What to do:**
- Eager load `employee` on `$request->user()` (`$request->user()->loadMissing('employee')`).
- Change all references (`employee_id`, `office_id`, etc.) to go through `$user->employee->...`.
- Or: if you use accessors on User as delegates, no change needed here at all.

---

### 4. `app/Http/Middleware/RedirectIfTrainingLocked.php`
**What to do:**
- `$user->training_locked` → `$user->employee->training_locked`.
- `$user->lnd_reference_id` → `$user->employee->lnd_reference_id`.
- Or delegate via accessor.

---

### 5. `app/Http/Controllers/Admin/UsersController.php`
**What to do:**
- `$user->employee_id`, `$user->position`, `$user->office_id`, `$user->is_active`, `$user->is_disabled`, `$user->activated_at`, `$user->profile_photo_url` — redirect through employee relationship.
- Validation rules that say `Rule::unique('users', 'employee_id')` must change to `Rule::unique('employees', 'employee_id')`.
- Eager load: `->with(['office:id,name,code'])` becomes `->with(['employee.office:id,name,code'])`.
- Stats queries like `User::where('is_active', true)` become `User::whereHas('employee', fn($q) => $q->where('is_active', true))`.
- Filter logic for `office`, `status` must go through employee join.

---

### 6. `app/Services/AdminUserManagementService.php`
**What to do:**
This is the most complex service. It creates and updates users with all the employee fields:
- `User::create([...])` with employee fields → must instead create User first, then create Employee record separately.
- `$user->fill([...])` with employee fields → must `$user->employee->fill([...])`.
- `$user->is_active`, `$user->is_disabled` etc. throughout `setActive()`, `setDisabled()`, `assertAdminSafety()` → employee delegation.
- `User::query()->where('is_active', ...)` in `assertAdminSafety()` → `whereHas('employee', ...)`.
- `$user->employee_id` in `sendEmployeeId()` → `$user->employee->employee_id`.

---

### 7. `app/Services/HmsEmployeeSyncService.php`
**What to do:**
- `User::query()->where('hms_employee_id', ...)` → search via employee relationship.
- All `$user->hms_employee_id`, `$user->office_id`, `$user->position`, `$user->is_active` assignments → go through `$user->employee`.
- `User::query()->create([...])` with employee fields → split into User::create + Employee::create.
- `generateNextEmployeeId()` queries `users.employee_id` → must query `employees.employee_id`.

---

### 8. `app/Services/HmsUserImportService.php`
Similar to HmsEmployeeSyncService — likely creates User records with employee columns.

---

### 9. `app/Http/Controllers/Auth/ActivationController.php`
**What to do:**
- `User::query()->whereRaw('LOWER(TRIM(employee_id)) = ?', ...)` → `User::whereHas('employee', fn($q) => $q->whereRaw(...))`.
- `$user->is_active` check → `$user->employee->is_active`.
- `$user->profile_photo_path = $path` → `$user->employee->profile_photo_path = $path`.
- `$user->forceFill(['is_active' => true, 'activated_at' => now()])` → update employee.

---

### 10. `app/Actions/Fortify/UpdateUserProfileInformation.php`
**What to do:**
- `$user->profile_photo_path` assignment → `$user->employee->profile_photo_path`.
- Profile photo deletion logic uses the path from User — redirect to Employee.

---

### 11. `app/Http/Responses/LoginResponse.php`
**What to do:**
- Likely reads `$user->role` and `$user->is_active` / `$user->is_disabled` for routing after login.
- `is_active` / `is_disabled` → delegate to employee.

---

### 12. `app/Http/Controllers/Supervisor/DashboardController.php`
- `User::where('office_id', $user->office_id)->where('role', 'employee')->count()` → query via employee relationship: `User::whereHas('employee', fn($q) => $q->where('office_id', $officeId))->where('role', 'employee')->count()`.

---

### 13. `app/Http/Controllers/Supervisor/UwpEditorController.php`
- `abort_unless($uwp->office_id === Auth::user()->office_id, 403)` → `Auth::user()->employee->office_id`.
- `User::where('office_id', $uwp->office_id)->where('role', 'dept-head')->first()` → query via employee.

---

### 14. `app/Http/Controllers/Supervisor/UnitWorkPlanController.php`
- `$user->office_id` references → `$user->employee->office_id`.

---

### 15. `app/Http/Controllers/DeptHead/DashboardController.php`
- Heavy `User::where('office_id', ...)` and `$user->office_id` usage → delegate to employee.

---

### 16. `app/Http/Controllers/DeptHead/QarController.php`
- `User::where('office_id', ...)` queries → employee relationship.
- `$user->office_id` references.

---

### 17. `app/Http/Controllers/DeptHead/OpcrController.php`
- `$user->office_id` → employee.

---

### 18. `app/Http/Controllers/DeptHead/UnitWorkPlanController.php`
- `$user->office_id` → employee.

---

### 19. `app/Http/Controllers/DeptHead/OpcraAccomplishmentController.php`
- `$user->office_id` → employee.

---

### 20. `app/Http/Controllers/Pmt/PerformancePeriodsController.php`
- `User::where('is_active', ...)` etc. → employee join.

---

### 21. `app/Http/Controllers/Pmt/QarController.php`
- `User::where('is_active', ...)`, `$user->office_id` → employee.

---

### 22. `app/Http/Controllers/Pmt/OpcrController.php`
- `User::where('is_active', ...)`, `$user->office_id` → employee.

---

### 23. `app/Http/Controllers/Pmt/OpcraAccomplishmentController.php`
- `$user->office_id` → employee.

---

### 24. `app/Http/Controllers/Pmt/TopPerformersController.php`
- `$user->position`, `$user->office_id`, etc. → employee.

---

### 25. `app/Http/Controllers/Pmt/IdpController.php`
- `$user->is_active` or similar → employee.

---

### 26. `app/Http/Controllers/Employee/MporController.php`
- `$user->office_id` → employee.

---

### 27. `app/Http/Controllers/Employee/HistoryController.php`
- `$user->office_id`, `$user->position` → employee.

---

### 28. `app/Http/Controllers/Employee/SmporIpcrAccomplishmentController.php`
- `$user->office_id`, `$user->position` → employee.

---

### 29. `app/Http/Controllers/Employee/IdpController.php`
- `$user->is_active` → employee.

---

### 30. `app/Http/Controllers/Employee/IdpExcelExportController.php`
- `$user->profile_photo_path` or `position` → employee.

---

### 31. `app/Http/Controllers/StageTwo/Forms/SmporExcelExportController.php`
- `$user->office_id`, `$user->position` → employee.

---

### 32. `app/Http/Controllers/StageTwo/Forms/MporExcelExportController.php`
- `$user->office_id` → employee.

---

### 33. `app/Http/Controllers/StageTwo/Forms/QarExportController.php`
- `$user->office_id` → employee.

---

### 34. `app/Observers/IpcrObserver.php`
- `User::where('office_id', $employee->office_id)->count()` — `$employee` here is a `User` model; after split this should become `User::whereHas('employee', fn($q) => $q->where('office_id', $officeId))->count()`.
- `$employee->office_id`, `$employee->position` → `$employee->employee->office_id` (or rename variable to `$user` and access via `$user->employee->...`).

---

### 35. `app/Services/LndHandoffService.php`
- `$developmentPlan->employee?->office_id` — `employee()` on DevelopmentPlan currently points to `User`. After split: `$developmentPlan->employee?->employee?->office_id` (awkward). Better: rename the DevelopmentPlan relationship to `user()` and add a proper `employee()` pointing to `Employee`.
- `$developmentPlan->employee?->position` → same issue.

---

### 36. `app/Services/WorkflowNotificationDispatcher.php`
- May reference employee fields.

---

### 37. `app/Services/AdminDatabaseService.php`
- Likely has `User` queries with employee column filters.

---

### 38. `app/Services/AdminReportService.php`
- Likely has `User` queries with employee column filters.

---

### 39. `app/Providers/FortifyServiceProvider.php`
- `$user->is_active` / `$user->is_disabled` for login guard.

---

### 40. `database/seeders/UserSeeder.php`
**Critical.** Currently seeds employee fields directly on User:
```php
User::updateOrCreate(['email' => ...], [
    'employee_id'        => ...,
    'is_active'          => ...,
    'office_id'          => ...,
    'position'           => ...,
    'profile_photo_path' => ...,
]);
```
After migration: must create User first, then create Employee record.

---

### 41. `database/seeders/SpmsFullSeeder.php`
- `User::where('office_id', ...)` → `User::whereHas('employee', fn($q) => $q->where('office_id', ...))`.

---

### 42. `database/seeders/UwpSampleSeeder.php`
- Same as above.

---

### 43. `tests/Feature/Admin/UserManagementTest.php`
- Creates users with employee fields directly → must create Employee after.

---

### 44. `tests/Feature/Profile/ProfileSettingsTest.php`
- May reference `profile_photo_path` on User.

---

### 45. Other tests in `tests/Feature/`
- Any test using `UserFactory` and assuming employee fields exist on User.

---

## Key Design Decisions to Make Before Starting

### Decision 1: Accessor bridge vs. full rewrite
**Option A — Accessor bridge (recommended for incremental migration):**
Add delegating accessors on `User` that read from `$this->employee`:
```php
public function getEmployeeIdAttribute()     { return $this->employee?->employee_id; }
public function getOfficeIdAttribute()       { return $this->employee?->office_id; }
public function getIsActiveAttribute()       { return $this->employee?->is_active ?? false; }
// ... etc
```
This lets most existing code continue working without touching every file, but it adds N+1 query risk unless you always eager-load `employee`.

**Option B — Full rewrite:**
Update every reference across all 45+ files. More work upfront but cleaner long-term.

**Recommendation:** Start with Option A (accessor bridge) to get the migration running, then progressively replace bridge calls with direct employee relationship access file by file.

---

### Decision 2: What stays on User vs. what moves to Employee
**Stays on `users`:**
- `id`, `name`, `email`, `email_verified_at`, `password`, `remember_token`
- `two_factor_secret`, `two_factor_recovery_codes`, `two_factor_confirmed_at`
- `role` (auth boundary — controls which dashboard the user sees)

**Moves to `employees`:**
- `employee_id` (HR identifier)
- `hms_employee_id`
- `office_id` + FK
- `position`
- `is_active`
- `is_disabled`
- `activated_at`
- `profile_photo_path`
- `training_locked`
- `lnd_reference_id`

---

### Decision 3: DevelopmentPlan.employee relationship naming
`DevelopmentPlan::employee()` currently returns a `User`. The field `employee_id` is a `users.id` FK.
After split, this is confusing because `employee` on DevelopmentPlan returns a `User`, but Employee is a separate model.

**Options:**
- Keep `DevelopmentPlan::employee()` → `User` (just rename to `user()` in a follow-up).
- Add `DevelopmentPlan::employeeProfile()` → `Employee` for HR data.

For now the simplest is to leave `employee_id` on `development_plans` pointing to `users.id` (since it's really "the user acting as employee"). Add a convenience method to get the Employee profile through the User.

---

### Decision 4: `employees` table — does every user need an employee row?
Admin and PMT users don't have "employment" attributes in the same way. You have two choices:
- **All users get an employee row** (simpler, no null checks needed).
- **Only non-admin users get an employee row** (purer but requires null safety everywhere).

**Recommendation:** All users get an employee row (even admin gets a sparse one). This avoids `$user->employee?->office_id` null-guards everywhere.

---

## Suggested Migration Sequence

### Phase 1 — Run the DB migration (already drafted)
```bash
php artisan migrate
```
This creates `employees` table, copies data, drops columns from `users`.

### Phase 2 — Add accessor bridge on User model
Add delegating getters so existing code doesn't break immediately.

### Phase 3 — Fix seeders (required for `db:seed` to work)
`UserSeeder` must split User creation from Employee creation.

### Phase 4 — Fix `AdminUserManagementService` and `HmsEmployeeSyncService`
These are the core data-mutation paths.

### Phase 5 — Fix Middleware (`HandleInertiaRequests`, `RedirectIfTrainingLocked`)
These affect every page load.

### Phase 6 — Fix remaining controllers one group at a time
Auth → Admin → Supervisor → DeptHead → Pmt → Employee → StageTwo.

### Phase 7 — Remove accessor bridge, do final cleanup
Once all files are updated, remove the delegate accessors from User.

### Phase 8 — Update tests

---

## Summary of File Count

| Category | Count |
|---|---|
| Models | 2 (User, Employee) |
| Migrations | 1 (already written) |
| Factories | 2 (User, Employee) |
| Seeders | 3 (UserSeeder, SpmsFullSeeder, UwpSampleSeeder) |
| Middleware | 2 |
| Actions (Fortify) | 2 |
| Services | 5 (AdminUserManagement, HmsEmployeeSync, HmsUserImport, LndHandoff, AdminDatabase/Report) |
| Controllers | ~25 |
| Tests | ~5+ |
| **Total** | **~45+ files** |
