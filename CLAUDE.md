# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

Smart PMS — a Philippine LGU Performance Management System built on Laravel 12 + Inertia.js + React 19. It digitizes the SPMS workflow (UWP → OPCR/IPCR planning → ORS monitoring → MPOR → accomplishment review → calibration), spread across five roles: `admin`, `pmt`, `dept-head`, `supervisor`, `employee`.

## Commands

```bash
composer dev          # Run the full stack: PHP serve + queue + pail logs + vite + reverb (concurrently)
composer setup        # First-time setup: install, key:gen, migrate, npm install + build
composer test         # Clears config then runs `artisan test`
php artisan test --filter=UserManagementTest   # Run a single test (Pest)
php artisan test tests/Feature/Employee/MyTasksTest.php  # Run one file
./vendor/bin/pint     # Format PHP (Laravel Pint, default ruleset — no pint.json)
npm run build         # Production asset build
php artisan reverb:start --debug   # Websocket server only (real-time notifications)
php artisan queue:listen --tries=1 # Queue worker only (notifications dispatch async)
```

The app expects to be served via **Laravel Herd** at `smart-pms.test`. `composer dev` is the normal way to run everything at once.

## Stack notes that aren't obvious

- **Database is MySQL** (`pms` schema) per `.env`, despite Laravel defaults to sqlite. Tests run against an in-memory sqlite (`phpunit.xml`).
- **No Tailwind.** UI is **inline style objects only**, using `var(--admin-*)` CSS variables for all colors/borders/radii. See `RESPONSIVENESS.md` — desktop layout is the source of truth; responsive layers are added for tablet/mobile via the `useBreakpoint()` hook (`resources/js/Components/useBreakpoint.js`). Never introduce Tailwind classes or new CSS files.
- **Bootstrap 5 + Chart.js** are available; React pages are resolved from `resources/js/Pages/**/*.jsx` by Inertia.
- **Ziggy** exposes named routes to JS (`route()` helper); routes are shared via `HandleInertiaRequests`.
- Auth is **Laravel Fortify** (config in `app/Actions/Fortify`, `FortifyServiceProvider`). Account activation is a custom flow (`ActivationController`, `/send/id` + `/activate/complete`, both CSRF-exempt).

## Architecture

### Routing & roles
`routes/web.php` is the map of the whole app. It's organized into role-prefixed groups (`administrator`, `pmt`, `dept-head`, `supervisor`, `employee`), each guarded by `middleware(['auth', 'role:<role>'])` via **spatie/laravel-permission**. `/dashboard` is a role router that redirects to the correct role dashboard — it also **auto-heals** a missing spatie role from the `users.role` column. When adding a feature, add its route inside the correct role group and create the matching controller under `app/Http/Controllers/<Role>/`.

There are also **stage-prefixed** groups (`stage-one`, `stage-two`, `stage-three`) under `app/Http/Controllers/StageOne|Two|Three/`. These are mostly **export/forms endpoints** (PDF + Excel via phpoffice/phpspreadsheet) and cross-role planning views, not tied to a single role.

### Layered: Controllers → Services → Models
Business logic lives in `app/Services/` (e.g. `IpcrGeneratorService`, `SmporGeneratorService`, `OpcrOfficeRatingService`, `PerformanceRatingService`, `UwpConsolidationSignatureService`, `*ExcelPayloadService`). Controllers stay thin and delegate. When implementing domain logic (rating computation, consolidation, document generation), put it in or alongside a service, not in the controller.

### Workflow state machines
Domain models carry explicit `status` constants that define their lifecycle. E.g. `UnitWorkPlan`: `draft → submitted → consolidated → endorsed → pmt_approved` (+ `returned`). OPCR/IPCR/MPOR/accomplishment models follow similar submit → review → approve/return chains across roles. Editability and locking are enforced by model helpers (e.g. `UnitWorkPlan::isEditableBySupervisor()`, `isLocked()`). Respect these status guards — don't mutate records that the model considers locked.

### Notifications (real-time)
State transitions notify the next actor in the workflow. Use `WorkflowNotificationDispatcher` (`notifyUser` / `notifyRole`) rather than calling `$user->notify()` directly — it skips inactive users. Notifications broadcast over **Reverb** (websocket) and render via `NotificationDropdown.jsx`; `BROADCAST_CONNECTION=reverb` and `QUEUE_CONNECTION=database`, so the queue worker and reverb server must be running for delivery.

### HRIS/HMS integration
Users can be synced from an external HMS via `HmsEmployeeSyncService` / `HmsUserImportService` (admin HRIS page). Synced users get an `hms_employee_id` and a PMS `employee_id`; activation emails are issued on creation.

## Conventions

- Controllers are namespaced by role/stage matching the route groups. Keep that 1:1 mapping.
- React pages live under `resources/js/Pages/<Role>/<Feature>/` mirroring the route names.
- Shared Inertia props (`auth.user`, `flash`, `ziggy`) come from `HandleInertiaRequests::share` — read user role/office from there client-side.
- PHP: 4-space indent, format with Pint before considering work done. Tests are **Pest**, under `tests/Feature` and `tests/Unit`.

## Reference docs in repo

`RESPONSIVENESS.md` and `UWPRedesign.md` are the authoritative UI/UX guides (breakpoints, inline-style rules, sidebar offset math). Consult them before changing any page layout.
