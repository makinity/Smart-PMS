# Period Selector — History Navigation Plan

## Overview

Add a period dropdown to key pages so users can browse historical performance data
across closed periods, mirroring the existing QAR period selector pattern.

Currently only `DeptHead/Qar/Index` has a period selector. All other pages are
locked to the currently active period.

---

## Design Decisions ✅ Confirmed

1. **Scope** — All pages listed below, implemented all at once.
2. **Read-only mode** — ✅ Yes. When a past period is selected, all action buttons
   (submit, approve, endorse, etc.) are hidden. Only view/export actions remain.
3. **Shared component** — ✅ Yes. A single reusable `PeriodSelector` component
   will be built once and dropped into each page.

---

## Affected Pages

### DeptHead
| Page | Route | Notes |
|---|---|---|
| OPCR Accomplishment | `/dept-head/opcr-accomplishment` | See past office ratings per period |
| Office IDP | `/dept-head/idp-office` | See past IDPs per period |
| IDP Approval | `/dept-head/idp` | See past approved/submitted IDPs |

### Supervisor
| Page | Route | Notes |
|---|---|---|
| MPOR | `/supervisor/mpor` | See past monthly performance reports |
| Accomplishment Review | `/supervisor/accomplishment` | See past rated employee submissions |

### Employee
| Page | Route | Notes |
|---|---|---|
| Accomplishment / SMPOR | `/employee/accomplishment` | See past submitted ratings |
| IPCR Target | `/employee/ipcr-target` | See past committed targets |

### PMT
| Page | Route | Notes |
|---|---|---|
| OPCR Accomplishment | `/pmt/opcr-accomplishment` | See past office ratings |
| Performance Overview | `/pmt/performance-overview` | See past period overview |
| IDP | `/pmt/idp` | See past IDPs by office |
| Top Performers | `/pmt/top-performers` | See past period top performers |

### Pages intentionally excluded (action-only, current period only)
- ORS logging (`/employee/ors`)
- UWP editor (`/supervisor/uwp/*`)
- All dashboards
- Profile pages
- My Tasks

---

## Implementation Pattern

### Shared Component — `resources/js/Components/PeriodSelector.jsx`
Built once, imported into every affected page. Renders nothing if only one period exists.

```jsx
// resources/js/Components/PeriodSelector.jsx
import { router } from '@inertiajs/react';

export default function PeriodSelector({ period, allPeriods, route }) {
    if (!allPeriods || allPeriods.length <= 1) return null;

    function handleChange(e) {
        const selected = allPeriods.find(p => p.id === Number(e.target.value));
        const params = selected?.is_active ? {} : { period_id: selected.id };
        router.get(route, params, { preserveState: false });
    }

    return (
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            {/* Calendar icon */}
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
                stroke="var(--admin-text-muted)" strokeWidth="2" style={{ flexShrink: 0 }}>
                <rect x="3" y="4" width="18" height="18" rx="2"/>
                <line x1="16" y1="2" x2="16" y2="6"/>
                <line x1="8" y1="2" x2="8" y2="6"/>
                <line x1="3" y1="10" x2="21" y2="10"/>
            </svg>
            <span style={{ fontSize: '0.72rem', fontWeight: 600,
                color: 'var(--admin-text-muted)', textTransform: 'uppercase',
                letterSpacing: '0.07em', whiteSpace: 'nowrap' }}>Period</span>
            <select
                value={period?.id ?? ''}
                onChange={handleChange}
                style={{ flex: 1, maxWidth: 260, padding: '0.38rem 0.65rem',
                    borderRadius: 8, border: '1px solid var(--admin-border-strong)',
                    background: 'var(--admin-bg-secondary)', color: 'var(--admin-text-primary)',
                    fontSize: '0.82rem', fontWeight: 600, cursor: 'pointer', outline: 'none' }}
            >
                {allPeriods.map(p => (
                    <option key={p.id} value={p.id}>
                        {p.name}{p.is_active ? ' (Current)' : ''}
                    </option>
                ))}
            </select>
        </div>
    );
}
```

### Read-only guard
```jsx
// period.is_active = false means it's a closed historical period
const isPastPeriod = period && !period.is_active;

// Wrap every action button with this guard — hides on past periods
{!isPastPeriod && (
    <button onClick={handleSubmit}>Submit to PMT</button>
)}

// Optional: show a banner when viewing history
{isPastPeriod && (
    <div style={{ background: 'rgba(234,179,8,0.08)', border: '1px solid rgba(234,179,8,0.25)',
        color: '#ca8a04', borderRadius: 8, padding: '0.5rem 1rem', fontSize: '0.82rem' }}>
        Viewing historical data for <strong>{period.name}</strong>. No changes can be made.
    </div>
)}
```

### Backend pattern (per controller)
```php
// 1. Fetch all periods for the dropdown
$allPeriods = PerformancePeriod::orderByDesc('start_date')->get();

// 2. Resolve selected period (param or current)
$periodId = $request->get('period_id');
$period = $periodId
    ? PerformancePeriod::find($periodId) ?? PerformancePeriod::current()
    : PerformancePeriod::current();

// 3. Scope all queries to $period->id instead of PerformancePeriod::current()->id

// 4. Pass to Inertia
'allPeriods' => $allPeriods->map(fn ($p) => [
    'id'        => $p->id,
    'name'      => $p->name,
    'is_active' => $p->is_active,
])->values(),
'period' => [
    'id'        => $period->id,
    'name'      => $period->name,
    'is_active' => $period->is_active,
],
```

---

## Implementation Order

Build the shared component first, then roll out by role:

1. `PeriodSelector` component
2. PMT pages (most data-rich, good for validating the pattern)
3. DeptHead pages
4. Supervisor pages
5. Employee pages

---

## Pages NOT getting a selector (rationale)

| Page | Reason |
|---|---|
| ORS Logging | Time-sensitive input, only valid for current period |
| UWP Editor | Structural document, not period-browsable |
| Dashboards | Already scoped to current period by design |
| My Tasks | Real-time task queue, current period only |
| Profile | Not period-related |

---

## Status

- [x] QAR (`DeptHead/Qar/Index`) — implemented and working
- [ ] DeptHead — OPCR Accomplishment
- [ ] DeptHead — Office IDP
- [ ] DeptHead — IDP Approval
- [ ] Supervisor — MPOR
- [ ] Supervisor — Accomplishment Review
- [ ] Employee — Accomplishment / SMPOR
- [ ] Employee — IPCR Target
- [ ] PMT — OPCR Accomplishment
- [ ] PMT — Performance Overview
- [ ] PMT — IDP
- [ ] PMT — Top Performers
- [ ] Shared `PeriodSelector` component created
