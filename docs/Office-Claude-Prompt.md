# Claude Implementation Prompt — Admin Office Management

Paste this entire prompt to Claude to implement the Office Management module.

---

## Context

You are implementing the **Admin Office Management** module for **Smart PMS** — a Laravel 11 + React (Inertia.js) performance management system for a Philippine Local Government Unit.

### Tech stack
- **Backend:** Laravel 11, Inertia.js, Eloquent ORM
- **Frontend:** React (JSX, no TypeScript), inline styles only (no Tailwind, no CSS modules)
- **Icons:** Bootstrap Icons (`bi bi-*` className)
- **Routing:** Inertia `router` + Laravel web routes
- **Toasts:** `useToast()` from `@/Components/Snackbar`
- **Confirm dialogs:** `useConfirm()` from `@/Components/ConfirmDialog`
- **Layout:** `AppLayout` from `@/Layouts/AppLayout`

---

## Styling System — MUST FOLLOW

All styles use **CSS custom properties** defined in `AppLayout.jsx`. These automatically switch between dark and light mode via `data-theme` attribute on `<html>`. **Never hardcode colors** — always use these variables:

```css
/* Backgrounds */
--admin-bg-primary       /* page background */
--admin-bg-secondary     /* subtle section bg, table rows */
--admin-sidebar          /* sidebar bg */
--admin-card             /* card/panel bg */

/* Borders */
--admin-border           /* subtle border */
--admin-border-strong    /* emphasized border */

/* Text */
--admin-text-primary     /* headings, main content */
--admin-text-secondary   /* body text */
--admin-text-muted       /* labels, hints, timestamps */

/* Accent */
--admin-accent           /* blue — buttons, links, active states */

/* Shape */
--admin-radius           /* 12px */
--admin-radius-lg        /* 18px */
--admin-shadow           /* card drop shadow */
```

**Light/dark compatible color pairs for semantic states (use rgba, they work in both modes):**
```js
// Active / success
bg: 'rgba(74,222,128,0.12)', color: '#4ade80', border: 'rgba(74,222,128,0.3)'
// Warning / pending
bg: 'rgba(234,179,8,0.12)', color: '#ca8a04', border: 'rgba(234,179,8,0.3)'
// Danger / error
bg: 'rgba(239,68,68,0.12)', color: '#f87171', border: 'rgba(239,68,68,0.3)'
// Info / accent
bg: 'rgba(59,130,246,0.12)', color: 'var(--admin-accent)', border: 'rgba(59,130,246,0.3)'
// Neutral
bg: 'var(--admin-bg-secondary)', color: 'var(--admin-text-muted)', border: 'var(--admin-border)'
```

**Standard card style:**
```js
const card = {
    background: 'var(--admin-card)',
    border: '1px solid var(--admin-border-strong)',
    borderRadius: 'var(--admin-radius)',
    boxShadow: 'var(--admin-shadow)',
};
```

**Font:** `Inter, system-ui, sans-serif` inherited from body.

---

## Breakpoint Hook — MUST USE

```jsx
function useBreakpoint() {
    const [w, setW] = useState(() => window.innerWidth);
    useEffect(() => {
        const h = () => setW(window.innerWidth);
        window.addEventListener('resize', h);
        return () => window.removeEventListener('resize', h);
    }, []);
    if (w >= 1024) return 'desktop';
    if (w >= 768)  return 'tablet';
    return 'mobile';
}
```

Use `bp === 'desktop'` / `bp === 'tablet'` / `bp === 'mobile'` to switch layouts inline.

---

## Prototype Reference

HTML prototypes for each screen are in `public/stitch/`:
- `offices_index_card_view/` — Index list page
- `office_overview/` — Show page, Overview tab
- `office_personnel/` — Show page, People tab
- `performance_history/` — Show page, Performance History tab
- `office_settings/` — Show page, Settings tab
- `add_office_modal/` — Create/Edit modal

**Use the prototypes as visual reference only.** Translate their structure and layout into React JSX with inline styles using the CSS vars above. Do NOT copy their CSS or colors directly.

Full feature spec is in `docs/Office.md`.

---

## What to Implement

### 1. Migration

Create `database/migrations/[timestamp]_add_is_active_hris_to_offices_table.php`:
```php
$table->boolean('is_active')->default(true)->after('code');
$table->string('hris_id')->nullable()->unique()->after('is_active');
$table->timestamp('hris_synced_at')->nullable()->after('hris_id');
```

### 2. Office Model (`app/Models/Office.php`)

Add:
- `is_active`, `hris_id`, `hris_synced_at` to `$fillable`
- `scopeActive($query)` local scope
- `$casts`: `is_active` → `boolean`, `hris_synced_at` → `datetime`
- Keep existing relationships: `head()`, `employees()`, `unitWorkPlans()`
- Add: `opcrs()` hasMany, `opcrAccomplishments()` hasMany OpcraAccomplishmentSubmission

### 3. Backend — `app/Http/Controllers/Admin/OfficeController.php`

Implement these methods:

**`index(Request $request)`**
- Accept: `search` (name/code), `filter` (all/active/inactive/hris)
- Load: offices with `head` (name, position, profile_photo_url), employee count, supervisor count
- Return paginated (25/page) to `Admin/Offices/Index`
- Props: `offices` (paginated), `filters` (current search/filter values)

**`show(Office $office)`**
- Load people: head, supervisors (role=supervisor, office_id), employees (role=employee, office_id) paginated 10
- Load history: per period — UWP status, OPCR status, office rating from `opcr_accomplishment_submissions`, employee ratings from `accomplishment_submissions` (name, final_rating, final_adjectival_rating), dev plan count from `development_plans`
- Load stats: total_employees, active_uwp (current period), opcr_status (current period), latest_rating
- Return to `Admin/Offices/Show`

**`store(Request $request)`**
- Validate: name (required, unique), code (nullable, unique), head_id (nullable, exists users)
- Create office, return redirect with flash success

**`update(Request $request, Office $office)`**
- Validate same as store (ignore self for unique checks)
- Block updating name/code if `hris_id` is set (return 422 with message)
- Update, return redirect with flash success

**`destroy(Office $office)`**
- Block if office has any users, unit_work_plans, or opcrs — return 422
- Delete, return redirect with flash success

**`toggleStatus(Office $office)`**
- Toggle `is_active`, return back with flash

### 4. Routes (`routes/web.php`)

Replace the single GET route with:
```php
Route::resource('offices', OfficeController::class)->only(['index','store','show','update','destroy']);
Route::post('offices/{office}/toggle-status', [OfficeController::class, 'toggleStatus'])->name('offices.toggle-status');
```

### 5. Frontend — `resources/js/Pages/Admin/Offices/Index.jsx`

**Full replacement** of the stub. Implements:

- `useBreakpoint()` hook
- Live search (debounced 300ms, updates URL via `router.get` with `preserveState`)
- Filter chips: All | Active | Inactive | HRIS Synced
- **Desktop:** Full table — Office Name (link), Code badge, Head (avatar+name), Employees count, Status badge, HRIS icon, Actions (View / Edit / Toggle)
- **Tablet:** 2-column card grid
- **Mobile:** Single-column card list
- Pagination links at bottom
- **Add Office** button → opens `OfficeFormModal`
- `OfficeFormModal` component (inline in file): centered modal on desktop, slides up from bottom on mobile. Fields: Name, Code, Head picker. Uses `router.post`.
- Flash success/error via `useToast()`
- Skeleton loading state while navigating

### 6. Frontend — `resources/js/Pages/Admin/Offices/Show.jsx`

New file. Implements:

**Sticky header:**
- Back button (`router.visit('/admin/offices')`)
- Office name + Code badge + HRIS sync dot (green/gray)
- Active/Inactive status badge
- Edit button → opens `OfficeFormModal` pre-filled

**Tab navigation:**
- Desktop/tablet: horizontal tab bar (Overview | People | Performance History | Settings)
- Mobile: horizontally scrollable tab pills

**Tab 1: Overview**
- Stats row: Total Employees, Active UWPs, OPCR Status, Latest Rating — 4-col on desktop, 2×2 on tablet/mobile
- Department Head card: avatar, name, position, email, "View Profile" link
- Office info: created date, HRIS ID (with lock icon if set), last sync

**Tab 2: People**
- Department Head — compact horizontal card
- Supervisors — horizontal scroll cards on mobile, table on desktop (Name, Position, Manages N employees)
- Employees — search input + table (desktop) or cards (mobile): Name, Position, Latest IPCR Score, Adjectival Rating badge. Paginated 10/page via `router.get` with `?emp_page=`.

**Tab 3: Performance History**
- Vertical list newest-first, each period is an accordion card
- Period header: Period name | UWP badge | OPCR badge | Office Rating (large, color-coded) | Dev Plans count
- Expanded: mini-table of employee name + score + adjectival
- If ≥ 2 periods with ratings: simple SVG sparkline chart of office rating trend
- Export CSV button (POST to a dedicated route, download response)

**Tab 4: Settings**
- Edit form (Name, Code — locked with lock icon if `hris_id` set, Head picker, is_active toggle)
- HRIS section: last synced timestamp, sync status dot, "Manual Sync" button (placeholder, shows toast "HRIS sync triggered")
- Danger Zone card (red border): Deactivate button (amber), Delete button (red, disabled + tooltip if has records)
- All destructive actions use `useConfirm()` before proceeding

---

## Code Patterns to Follow

**Inertia navigation:**
```jsx
router.visit('/admin/offices');
router.get('/admin/offices', { search, filter }, { preserveState: true, replace: true });
router.post('/admin/offices', formData, { onSuccess: () => { toast.success('Created'); setModalOpen(false); } });
router.put(`/admin/offices/${id}`, formData, { onSuccess: () => toast.success('Updated') });
router.delete(`/admin/offices/${id}`, { onSuccess: () => toast.success('Deleted') });
```

**Toast:**
```jsx
const toast = useToast();
toast.success('Office created.');
toast.error('Cannot delete — office has employees.');
```

**Confirm:**
```jsx
const confirm = useConfirm();
confirm('Delete this office? This cannot be undone.').then(ok => {
    if (ok) router.delete(`/admin/offices/${office.id}`);
});
```

**Flash messages** from backend:
```jsx
const { flash } = usePage().props;
useEffect(() => {
    if (flash?.success) toast.success(flash.success);
    if (flash?.error)   toast.error(flash.error);
}, [flash]);
```

**Avatar fallback:**
```jsx
import { avatarSrc, onAvatarError } from '@/Components/defaultAvatar';
<img src={avatarSrc(user.avatar, user.profile_photo_url)} onError={onAvatarError} />
```

---

## Important Constraints

1. **No Tailwind, no external CSS** — inline styles only using CSS vars
2. **No new npm packages** — use only what's already installed
3. **Light/dark mode** — every color must use CSS vars or semantic rgba pairs listed above. Never `#hex` or `rgb()` literals for UI colors (scores/charts may use semantic colors)
4. **Inline `<style>` blocks** are acceptable for `@media` queries and hover states (same pattern as existing pages)
5. The `is_active` migration must be run — add a note to run `php artisan migrate` after creating the file
6. Keep `OfficeFormModal` as a local component inside `Index.jsx` and `Show.jsx` (not a separate file) to avoid prop-drilling complexity
7. Preserve existing `OfficeController` namespace and file location
8. All delete/deactivate must confirm via `useConfirm()` — never fire destructive actions directly on click
