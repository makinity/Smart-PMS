import { useState, useRef, useEffect } from 'react';
import { router } from '@inertiajs/react';

/**
 * Compact period selector — renders as a clock icon button.
 * Clicking opens a floating dropdown listing all periods grouped by year.
 * The active/current period is highlighted.
 * Viewing a past period shows a subtle amber accent.
 */
export default function PeriodSelector({ period, allPeriods, route }) {
    const [open, setOpen] = useState(false);
    const [animating, setAnimating] = useState(false);
    const ref = useRef(null);

    // Close on outside click
    useEffect(() => {
        if (!open) return;
        function onClickOutside(e) {
            if (ref.current && !ref.current.contains(e.target)) setOpen(false);
        }
        document.addEventListener('mousedown', onClickOutside);
        return () => document.removeEventListener('mousedown', onClickOutside);
    }, [open]);

    // Animate in on open
    useEffect(() => {
        if (open) {
            requestAnimationFrame(() => setAnimating(true));
        } else {
            setAnimating(false);
        }
    }, [open]);

    if (!allPeriods || allPeriods.length <= 1) return null;

    const isPast = period && !period.is_active;

    function handleSelect(p) {
        setOpen(false);
        const params = p.is_active ? {} : { period_id: p.id };
        router.get(route, params, { preserveState: false });
    }

    // Group periods by year (descending)
    const grouped = {};
    allPeriods.forEach(p => {
        // Extract year from period name or start_date fallback
        const yearMatch = p.name?.match(/\b(20\d{2})\b/);
        const year = yearMatch ? yearMatch[1] : 'Other';
        if (!grouped[year]) grouped[year] = [];
        grouped[year].push(p);
    });
    const sortedYears = Object.keys(grouped).sort((a, b) => b - a);

    return (
        <div ref={ref} style={{ position: 'relative', flexShrink: 0 }}>
            {/* Icon button */}
            <button
                onClick={() => setOpen(o => !o)}
                title={`Period: ${period?.name ?? '—'}`}
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.35rem',
                    padding: '0.38rem 0.6rem',
                    borderRadius: 8,
                    border: `1px solid ${isPast ? 'rgba(245,158,11,0.5)' : 'var(--admin-border-strong)'}`,
                    background: isPast ? 'rgba(245,158,11,0.08)' : 'var(--admin-bg-secondary)',
                    color: isPast ? '#f59e0b' : 'var(--admin-text-muted)',
                    cursor: 'pointer',
                    fontSize: '0.75rem',
                    fontWeight: isPast ? 700 : 500,
                    whiteSpace: 'nowrap',
                    transition: 'all 0.15s',
                }}
            >
                {/* Clock / history icon */}
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
                    stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10"/>
                    <polyline points="12 6 12 12 16 14"/>
                </svg>
                {/* Chevron */}
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none"
                    stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"
                    style={{ transform: open ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.15s' }}>
                    <polyline points="6 9 12 15 18 9"/>
                </svg>
            </button>

            {/* Dropdown */}
            {open && (
                <div
                    style={{
                        position: 'absolute',
                        top: 'calc(100% + 6px)',
                        right: 0,
                        minWidth: 240,
                        maxWidth: 300,
                        background: 'var(--admin-card)',
                        border: '1px solid var(--admin-border-strong)',
                        borderRadius: 10,
                        boxShadow: '0 8px 32px rgba(0,0,0,0.18)',
                        zIndex: 100,
                        overflow: 'hidden',
                        opacity: animating ? 1 : 0,
                        transform: animating ? 'translateY(0) scale(1)' : 'translateY(-6px) scale(0.97)',
                        transition: 'opacity 0.18s ease, transform 0.18s ease',
                    }}
                >
                    {/* Header */}
                    <div style={{
                        padding: '0.55rem 0.85rem 0.4rem',
                        fontSize: '0.62rem',
                        fontWeight: 700,
                        textTransform: 'uppercase',
                        letterSpacing: '0.08em',
                        color: 'var(--admin-text-muted)',
                        borderBottom: '1px solid var(--admin-border)',
                    }}>
                        Performance Period
                    </div>

                    {/* Periods grouped by year */}
                    <div style={{ maxHeight: 320, overflowY: 'auto' }}>
                        {sortedYears.map(year => (
                            <div key={year}>
                                {/* Year separator */}
                                <div style={{
                                    padding: '0.4rem 0.85rem 0.2rem',
                                    fontSize: '0.6rem',
                                    fontWeight: 700,
                                    letterSpacing: '0.06em',
                                    color: 'var(--admin-text-muted)',
                                    opacity: 0.7,
                                    background: 'var(--admin-bg-secondary)',
                                    borderTop: sortedYears.indexOf(year) > 0 ? '1px solid var(--admin-border)' : 'none',
                                }}>
                                    {year}
                                </div>

                                {/* Period items */}
                                {grouped[year].map(p => {
                                    const isSelected = p.id === period?.id;
                                    return (
                                        <button
                                            key={p.id}
                                            onClick={() => handleSelect(p)}
                                            onMouseEnter={e => {
                                                if (!isSelected) e.currentTarget.style.background = 'var(--admin-bg-secondary)';
                                            }}
                                            onMouseLeave={e => {
                                                if (!isSelected) e.currentTarget.style.background = 'transparent';
                                            }}
                                            style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'space-between',
                                                width: '100%',
                                                padding: '0.6rem 0.85rem',
                                                background: isSelected ? 'rgba(59,130,246,0.08)' : 'transparent',
                                                border: 'none',
                                                borderBottom: '1px solid var(--admin-border)',
                                                color: isSelected ? 'var(--admin-accent)' : 'var(--admin-text-primary)',
                                                fontWeight: isSelected ? 700 : 500,
                                                fontSize: '0.82rem',
                                                cursor: 'pointer',
                                                textAlign: 'left',
                                                gap: '0.5rem',
                                                whiteSpace: 'nowrap',
                                                transition: 'background 0.1s',
                                            }}
                                        >
                                            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.name}</span>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', flexShrink: 0 }}>
                                                {p.is_active && (
                                                    <span style={{
                                                        fontSize: '0.58rem',
                                                        fontWeight: 700,
                                                        padding: '1px 6px',
                                                        borderRadius: 99,
                                                        background: 'rgba(74,222,128,0.15)',
                                                        color: '#4ade80',
                                                        border: '1px solid rgba(74,222,128,0.3)',
                                                        textTransform: 'uppercase',
                                                        letterSpacing: '0.06em',
                                                    }}>
                                                        Current
                                                    </span>
                                                )}
                                                {isSelected && (
                                                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
                                                        stroke="var(--admin-accent)" strokeWidth="2.5">
                                                        <polyline points="20 6 9 17 4 12"/>
                                                    </svg>
                                                )}
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
