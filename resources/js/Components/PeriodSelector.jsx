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
            <select
                value={period?.id ?? ''}
                onChange={handleChange}
                style={{
                    padding: '0.38rem 0.65rem',
                    borderRadius: 8,
                    border: '1px solid var(--admin-border-strong)',
                    background: 'var(--admin-bg-secondary)',
                    color: 'var(--admin-text-primary)',
                    fontSize: '0.82rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    outline: 'none',
                }}
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
