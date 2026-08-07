# Period Selector — Implementation Guide

## Overview

A reusable `PeriodSelector` component that lets users browse historical performance
data across closed periods. It renders as a compact clock icon button with a floating
dropdown — no wasted toolbar space.

**Component location:** `resources/js/Components/PeriodSelector.jsx`

---

## Visual Behaviour

| State | Appearance |
|---|---|
| Current period, no past selected | Grey clock icon + chevron only |
| Past period selected | Amber clock icon + chevron (signals "viewing history") |
| Dropdown open | Floating card listing all periods; current has green "CURRENT" badge; selected has blue highlight + checkmark |

---

## Completed Pages ✅

| Role | Page | Route | Notes |
|---|---|---|---|
| Supervisor | MPOR | `/supervisor/mpor` | Period + month picker + debounce fix |
| Supervisor | Team Tasks | `/supervisor/team-tasks` | Fixed missing `is_active` |
| Supervisor | Accomplishment | `/supervisor/accomplishment` | ✅ |
| DeptHead | QAR | `/dept-head/qar` | Has own inline select — can migrate to component |
| DeptHead | Office IDP | `/dept-head/idp-office` | Fixed wrong route (`/dept-head/idp-office`) |
| PMT | OPCR Accomplishment | `/pmt/opcr-accomplishment` | ✅ |
| PMT | Performance Overview | `/pmt/performance-overview` | ✅ |
| PMT | IDP | `/pmt/idp` | ✅ |
| PMT | Top Performers | `/pmt/top-performers` | ✅ |
| PMT | Development Planning | `/pmt/development-planning` | Fixed missing `is_active` |

---

## Pending Pages ❌

| Role | Page | Route |
|---|---|---|
| DeptHead | IDP Approval | `/dept-head/idp` |
| DeptHead | OPCR Accomplishment | `/dept-head/opcr-accomplishment` |
| Employee | Accomplishment / SMPOR | `/employee/accomplishment` |
| Employee | IPCR Target | `/employee/ipcr-target` |

---

## How to Add to a New Page

### Step 1 — Backend Controller

```php
use App\Models\PerformancePeriod;

public function index(Request $request)
{
    // 1. All periods for dropdown
    $allPeriods = PerformancePeriod::orderByDesc('start_date')->get();

    // 2. Resolve selected period
    $periodId = $request->get('period_id');
    $period = $periodId
        ? PerformancePeriod::find($periodId) ?? PerformancePeriod::current()
        : PerformancePeriod::current();

    // 3. Scope ALL queries to $period->id

    // 4. Pass to Inertia — is_active MUST be included
    return Inertia::render('...', [
        'period'     => $period ? [
            'id'        => $period->id,
            'name'      => $period->name,
            'is_active' => $period->is_active,   // ← required, omitting causes amber bug
        ] : null,
        'allPeriods' => $allPeriods->map(fn ($p) => [
            'id'        => $p->id,
            'name'      => $p->name,
            'is_active' => $p->is_active,
        ])->values(),
    ]);
}
```

> ⚠️ **Common bug:** If `is_active` is omitted from the `period` prop, `PeriodSelector`
> always shows amber because `!undefined === true`. Always include it.

---

### Step 2 — Frontend Page

```jsx
import PeriodSelector from '@/Components/PeriodSelector';

export default function Index({ ..., period, allPeriods }) {

    // Read-only guard — hide action buttons on past periods
    const isPastPeriod = period && !period.is_active;

    return (
        <>
            {/* Optional: history banner */}
            {isPastPeriod && (
                <div style={{
                    background: 'rgba(245,158,11,0.08)',
                    border: '1px solid rgba(245,158,11,0.25)',
                    color: '#f59e0b',
                    borderRadius: 8,
                    padding: '0.5rem 1rem',
                    fontSize: '0.82rem',
                    marginBottom: '0.75rem',
                }}>
                    Viewing historical data for <strong>{period.name}</strong>. No changes can be made.
                </div>
            )}

            {/* Toolbar: search/filters LEFT, PeriodSelector RIGHT */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                <input placeholder="Search..." style={{ flex: 1 }} />
                {/* other filters */}
                <PeriodSelector
                    period={period}
                    allPeriods={allPeriods}
                    route="/your-route"       // ← exact route string, no trailing slash
                />
            </div>

            {/* Hide action buttons on past periods */}
            {!isPastPeriod && (
                <button onClick={handleSubmit}>Submit</button>
            )}
        </>
    );
}
```

---

### Step 3 — Fix debounced filter navigation (if page has search/filter useEffect)

If the page has a `useEffect` that debounces filter changes and calls `router.get()`,
it must include `period_id` in the params — otherwise navigating away from a past
period resets back to current.

```js
useEffect(() => {
    const t = setTimeout(() => {
        const params = { search, status /*, other filters */ };

        // Preserve period_id when viewing a past period
        if (period && !period.is_active) params.period_id = period.id;

        router.get('/your-route', params, { preserveState: true, replace: true });
    }, 300);
    return () => clearTimeout(t);
}, [search, status /*, other deps */]);
// Note: do NOT add `period` to deps — period changes are handled by PeriodSelector itself
```

---

### Step 4 — Verify the route string

The `route` prop passed to `PeriodSelector` must exactly match the Laravel route.
Check `routes/web.php` for the correct path.

```
✅ route="/dept-head/idp-office"    ← correct (hyphen)
❌ route="/dept-head/idp/office"    ← 404 (slash instead of hyphen)
```

---

## PeriodSelector Props

| Prop | Type | Required | Description |
|---|---|---|---|
| `period` | `object\|null` | Yes | Current period `{ id, name, is_active }` |
| `allPeriods` | `array` | Yes | All periods `[{ id, name, is_active }]` |
| `route` | `string` | Yes | Laravel route string, e.g. `"/supervisor/mpor"` |

The component renders **nothing** if `allPeriods` has 1 or fewer items.

---

## Checklist for Each New Page

- [ ] Controller passes `is_active` on the `period` prop
- [ ] Controller passes `allPeriods` with `is_active`
- [ ] All DB queries scoped to `$period->id` (not hardcoded `current()`)
- [ ] Frontend imports `PeriodSelector`
- [ ] `PeriodSelector` placed at the **right end** of the toolbar
- [ ] Action buttons wrapped in `{!isPastPeriod && ...}` guard
- [ ] History banner shown when `isPastPeriod` is true (optional but recommended)
- [ ] Debounced `useEffect` includes `period_id` in params when past
- [ ] Route string verified against `web.php`
