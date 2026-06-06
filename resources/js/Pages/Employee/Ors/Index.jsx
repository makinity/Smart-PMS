import { useState, useEffect, useRef } from 'react';
import { router, usePage } from '@inertiajs/react';
import AppLayout from '@/Layouts/AppLayout';
import { formatDuration, statusCfg } from './orsHelpers';
import LogTaskModal from './LogTaskModal';
import DaySummaryModal from './DaySummaryModal';
import TaskDetailsModal from './TaskDetailsModal';

// ── Calendar helpers ──────────────────────────────────────────────────────────
function buildCalendar(year, month) {
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const cells = [];
    for (let i = 0; i < firstDay; i++) cells.push(null);
    for (let d = 1; d <= daysInMonth; d++) cells.push(d);
    while (cells.length % 7 !== 0) cells.push(null);
    return cells;
}
const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const WEEKDAYS_SHORT = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const DAYS_FULL = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];

function toDateStr(year, month, day) {
    return `${year}-${String(month + 1).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
}

// ── useBreakpoint ─────────────────────────────────────────────────────────────
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

// ── Active Timer Panel ────────────────────────────────────────────────────────
function ActiveTimerPanel({ entry, onAction, onOpenEntry, compact }) {
    const [, tick] = useState(0);
    const ref = useRef(null);

    useEffect(() => {
        clearInterval(ref.current);
        if (entry?.status === 'recording' && entry?.started_at) {
            ref.current = setInterval(() => tick(v => v + 1), 1000);
        }
        return () => clearInterval(ref.current);
    }, [entry?.id, entry?.status, entry?.started_at]);

    let secs = entry?.total_seconds ?? 0;
    if (entry?.status === 'recording' && entry?.started_at) {
        secs += Math.floor((Date.now() - new Date(entry.started_at).getTime()) / 1000);
    }

    const base = { background: 'var(--admin-card)', border: '1px solid var(--admin-border-strong)', borderRadius: 'var(--admin-radius)', padding: compact ? '0.75rem 1rem' : '1rem 1.25rem' };
    const btn = { display: 'flex', alignItems: 'center', gap: '0.35rem', padding: '0.45rem 0.9rem', borderRadius: 7, fontWeight: 600, fontSize: '0.82rem', cursor: 'pointer', border: 'none' };

    if (!entry) return (
        <div style={{ ...base, display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--admin-text-muted)', fontSize: '0.85rem' }}>
            <i className="bi bi-stopwatch" />
            <span>{compact ? 'No active timer' : 'No active timer — click a date to log a task.'}</span>
        </div>
    );

    const cfg = statusCfg(entry.status);
    return (
        <div style={{ ...base, display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
            <div style={{ width: 32, height: 32, borderRadius: '50%', background: cfg.bg, color: cfg.color, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <i className={`bi ${cfg.icon}`} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 600, fontSize: compact ? '0.82rem' : '0.9rem', color: 'var(--admin-text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {entry.indicator_text}
                </div>
                {!compact && <div style={{ fontSize: '0.75rem', color: 'var(--admin-text-muted)' }}>{entry.output_title} · {entry.work_date}</div>}
            </div>
            <span style={{ fontFamily: 'monospace', fontSize: compact ? '1.1rem' : '1.4rem', fontWeight: 700, color: entry.status === 'recording' ? '#ef4444' : 'var(--admin-text-secondary)', flexShrink: 0 }}>
                {formatDuration(secs)}
            </span>
            <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                {entry.status === 'recording' && (
                    <button style={{ ...btn, background: 'rgba(139,92,246,0.12)', color: '#8b5cf6', border: '1px solid rgba(139,92,246,0.25)' }} onClick={() => onAction('pause', entry.id)}>
                        <i className="bi bi-pause-fill" />{!compact && ' Pause'}
                    </button>
                )}
                {entry.status === 'paused' && (
                    <button style={{ ...btn, background: 'rgba(16,185,129,0.12)', color: '#10b981', border: '1px solid rgba(16,185,129,0.25)' }} onClick={() => onAction('resume', entry.id)}>
                        <i className="bi bi-play-fill" />{!compact && ' Resume'}
                    </button>
                )}
                {['recording','paused'].includes(entry.status) && (
                    <button style={{ ...btn, background: 'var(--admin-bg-secondary)', border: '1px solid var(--admin-border)', color: 'var(--admin-text-secondary)' }} onClick={() => onAction('stop', entry.id, true)}>
                        <i className="bi bi-stop-fill" />{!compact && ' Stop'}
                    </button>
                )}
                <button style={{ ...btn, background: 'var(--admin-accent)', color: '#fff' }} onClick={() => onOpenEntry(entry)}>
                    <i className="bi bi-arrow-up-right-square" />{!compact && ' Details'}
                </button>
            </div>
        </div>
    );
}

// ── Desktop: Calendar Day Cell ────────────────────────────────────────────────
function DayCell({ day, year, month, entries, today, onDayClick, gateLocked }) {
    if (!day) return <div style={{ minHeight: 80 }} />;
    const dateStr = toDateStr(year, month, day);
    const dayEntries = entries[dateStr] ?? [];
    const isToday = dateStr === today;
    const groups = {};
    dayEntries.forEach(e => { groups[e.status] = (groups[e.status] ?? 0) + 1; });

    return (
        <div onClick={() => !gateLocked && onDayClick(dateStr, dayEntries)}
            style={{ minHeight: 80, padding: '0.4rem', borderRadius: 8,
                border: `1px solid ${isToday ? 'var(--admin-accent)' : 'var(--admin-border)'}`,
                background: isToday ? 'rgba(59,130,246,0.06)' : 'var(--admin-bg-secondary)',
                cursor: gateLocked ? 'not-allowed' : 'pointer', transition: 'background 0.12s' }}
            onMouseEnter={e => { if (!gateLocked) e.currentTarget.style.background = 'rgba(59,130,246,0.04)'; }}
            onMouseLeave={e => { e.currentTarget.style.background = isToday ? 'rgba(59,130,246,0.06)' : 'var(--admin-bg-secondary)'; }}>
            <div style={{ fontSize: '0.8rem', fontWeight: isToday ? 700 : 500, color: isToday ? 'var(--admin-accent)' : 'var(--admin-text-secondary)', marginBottom: '0.3rem' }}>{day}</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                {Object.entries(groups).map(([status, count]) => {
                    const c = statusCfg(status);
                    return (
                        <div key={status} style={{ fontSize: '0.65rem', fontWeight: 600, padding: '0.1rem 0.35rem', borderRadius: 4, background: c.bg, color: c.color, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {c.label} ({count})
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

// ── Tablet: Calendar Day Cell (dot chips) ────────────────────────────────────
function DayCellTablet({ day, year, month, entries, today, onDayClick, gateLocked }) {
    if (!day) return <div style={{ minHeight: 70 }} />;
    const dateStr = toDateStr(year, month, day);
    const dayEntries = entries[dateStr] ?? [];
    const isToday = dateStr === today;
    const groups = {};
    dayEntries.forEach(e => { groups[e.status] = (groups[e.status] ?? 0) + 1; });

    return (
        <div onClick={() => !gateLocked && onDayClick(dateStr, dayEntries)}
            style={{ minHeight: 70, padding: '0.35rem', borderRadius: 8,
                border: `1px solid ${isToday ? 'var(--admin-accent)' : 'var(--admin-border)'}`,
                background: isToday ? 'rgba(59,130,246,0.06)' : 'var(--admin-bg-secondary)',
                cursor: gateLocked ? 'not-allowed' : 'pointer', transition: 'background 0.12s' }}
            onMouseEnter={e => { if (!gateLocked) e.currentTarget.style.background = 'rgba(59,130,246,0.04)'; }}
            onMouseLeave={e => { e.currentTarget.style.background = isToday ? 'rgba(59,130,246,0.06)' : 'var(--admin-bg-secondary)'; }}>
            <div style={{ fontSize: '0.78rem', fontWeight: isToday ? 700 : 500, color: isToday ? 'var(--admin-accent)' : 'var(--admin-text-secondary)', marginBottom: '0.3rem' }}>{day}</div>
            {/* Dot row */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
                {Object.entries(groups).map(([status, count]) => {
                    const c = statusCfg(status);
                    return Array.from({ length: Math.min(count, 3) }).map((_, i) => (
                        <span key={`${status}-${i}`} style={{ width: 7, height: 7, borderRadius: '50%', background: c.color, display: 'inline-block', flexShrink: 0 }} />
                    ));
                })}
            </div>
            {/* Count badge if any entries */}
            {dayEntries.length > 0 && (
                <div style={{ fontSize: '0.6rem', color: 'var(--admin-text-muted)', marginTop: 2 }}>
                    {dayEntries.length}
                </div>
            )}
        </div>
    );
}

// ── Mobile: Mini Calendar Strip ───────────────────────────────────────────────
function MiniCalStrip({ year, month, entries, today, onDayClick, gateLocked, selectedDate, setSelectedDate }) {
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);
    const stripRef = useRef(null);

    // Scroll selected day into view on mount / month change
    useEffect(() => {
        const el = stripRef.current?.querySelector('[data-today="1"]');
        el?.scrollIntoView({ inline: 'center', block: 'nearest', behavior: 'smooth' });
    }, [year, month]);

    return (
        <div ref={stripRef} style={{ display: 'flex', gap: 4, overflowX: 'auto', paddingBottom: 6, marginBottom: 8,
            scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
            {days.map(day => {
                const ds = toDateStr(year, month, day);
                const isToday = ds === today;
                const isSelected = ds === selectedDate;
                const hasEntries = (entries[ds]?.length ?? 0) > 0;
                const dow = new Date(year, month, day).getDay();
                return (
                    <button key={day} data-today={isToday ? '1' : '0'}
                        onClick={() => { if (!gateLocked) { setSelectedDate(ds); onDayClick(ds, entries[ds] ?? []); } }}
                        style={{ flexShrink: 0, width: 40, padding: '5px 0', borderRadius: 10, border: 'none', cursor: gateLocked ? 'not-allowed' : 'pointer',
                            background: isSelected ? 'var(--admin-accent)' : isToday ? 'rgba(59,130,246,0.12)' : 'var(--admin-bg-secondary)',
                            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
                        <span style={{ fontSize: '0.58rem', fontWeight: 600, textTransform: 'uppercase',
                            color: isSelected ? 'rgba(255,255,255,0.8)' : 'var(--admin-text-muted)' }}>
                            {WEEKDAYS_SHORT[dow]}
                        </span>
                        <span style={{ fontSize: '0.88rem', fontWeight: 700, lineHeight: 1,
                            color: isSelected ? '#fff' : isToday ? 'var(--admin-accent)' : 'var(--admin-text-primary)' }}>
                            {day}
                        </span>
                        {/* dot indicator */}
                        <span style={{ width: 5, height: 5, borderRadius: '50%',
                            background: hasEntries ? (isSelected ? '#fff' : 'var(--admin-accent)') : 'transparent' }} />
                    </button>
                );
            })}
        </div>
    );
}

// ── Mobile: Day List View ─────────────────────────────────────────────────────
function MobileDayList({ year, month, entries, today, onDayClick, gateLocked }) {
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    // Only show days that have entries OR today
    const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);

    // Group days with entries + today
    const activeDays = days.filter(d => {
        const ds = toDateStr(year, month, d);
        return (entries[ds]?.length > 0) || ds === today;
    });

    if (activeDays.length === 0) {
        return (
            <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--admin-text-muted)', fontSize: '0.85rem' }}>
                <i className="bi bi-calendar3" style={{ fontSize: '2rem', display: 'block', marginBottom: 8 }} />
                No tasks logged this month. Tap a day to log one.
            </div>
        );
    }

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {activeDays.map(day => {
                const dateStr = toDateStr(year, month, day);
                const dayEntries = entries[dateStr] ?? [];
                const isToday = dateStr === today;
                const dow = new Date(year, month, day).getDay();

                return (
                    <div key={day} onClick={() => !gateLocked && onDayClick(dateStr, dayEntries)}
                        style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem 1rem',
                            borderRadius: 10, cursor: gateLocked ? 'not-allowed' : 'pointer',
                            background: isToday ? 'rgba(59,130,246,0.08)' : 'var(--admin-bg-secondary)',
                            border: `1px solid ${isToday ? 'var(--admin-accent)' : 'var(--admin-border)'}`,
                            transition: 'background 0.12s' }}>
                        {/* Date badge */}
                        <div style={{ textAlign: 'center', flexShrink: 0, width: 42 }}>
                            <div style={{ fontSize: '0.62rem', fontWeight: 700, textTransform: 'uppercase',
                                color: isToday ? 'var(--admin-accent)' : 'var(--admin-text-muted)', letterSpacing: '0.05em' }}>
                                {DAYS_FULL[dow].slice(0,3)}
                            </div>
                            <div style={{ fontSize: '1.3rem', fontWeight: 700, lineHeight: 1,
                                color: isToday ? 'var(--admin-accent)' : 'var(--admin-text-primary)' }}>
                                {day}
                            </div>
                        </div>
                        {/* Entries or empty */}
                        <div style={{ flex: 1, minWidth: 0 }}>
                            {dayEntries.length === 0 ? (
                                <div style={{ fontSize: '0.78rem', color: 'var(--admin-text-muted)' }}>Today — tap to log a task</div>
                            ) : (
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                                    {Object.entries(
                                        dayEntries.reduce((acc, e) => { acc[e.status] = (acc[e.status] ?? 0) + 1; return acc; }, {})
                                    ).map(([status, count]) => {
                                        const c = statusCfg(status);
                                        return (
                                            <span key={status} style={{ fontSize: '0.65rem', fontWeight: 600, padding: '2px 7px',
                                                borderRadius: 99, background: c.bg, color: c.color }}>
                                                {c.label} ×{count}
                                            </span>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                        <i className="bi bi-chevron-right" style={{ color: 'var(--admin-text-muted)', fontSize: '0.75rem', flexShrink: 0 }} />
                    </div>
                );
            })}
        </div>
    );
}

// ── Shared Calendar Header ────────────────────────────────────────────────────
function CalHeader({ cal, setCal, orsGateLocked, onLogTask, showLogBtn, compact }) {
    function prev() { setCal(c => c.month === 0 ? { year: c.year - 1, month: 11 } : { ...c, month: c.month - 1 }); }
    function next() { setCal(c => c.month === 11 ? { year: c.year + 1, month: 0 } : { ...c, month: c.month + 1 }); }
    const today = new Date();

    return (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <button onClick={prev} style={{ background: 'none', border: '1px solid var(--admin-border)', borderRadius: 7, padding: '0.3rem 0.6rem', cursor: 'pointer', color: 'var(--admin-text-secondary)' }}>
                    <i className="bi bi-chevron-left" />
                </button>
                <span style={{ fontWeight: 700, fontSize: compact ? '0.95rem' : '1rem', color: 'var(--admin-text-primary)', minWidth: compact ? 130 : 160, textAlign: 'center' }}>
                    {MONTHS[cal.month]} {cal.year}
                </span>
                <button onClick={next} style={{ background: 'none', border: '1px solid var(--admin-border)', borderRadius: 7, padding: '0.3rem 0.6rem', cursor: 'pointer', color: 'var(--admin-text-secondary)' }}>
                    <i className="bi bi-chevron-right" />
                </button>
                <button onClick={() => setCal({ year: today.getFullYear(), month: today.getMonth() })}
                    style={{ fontSize: '0.78rem', padding: '0.3rem 0.65rem', background: 'var(--admin-bg-secondary)', border: '1px solid var(--admin-border)', borderRadius: 7, cursor: 'pointer', color: 'var(--admin-text-muted)' }}>
                    Today
                </button>
            </div>
            {showLogBtn && (
                <button disabled={orsGateLocked} onClick={onLogTask}
                    style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.5rem 1.1rem',
                        background: orsGateLocked ? 'var(--admin-bg-secondary)' : 'var(--admin-accent)',
                        color: orsGateLocked ? 'var(--admin-text-muted)' : '#fff',
                        border: 'none', borderRadius: 8, fontWeight: 700, fontSize: '0.85rem',
                        cursor: orsGateLocked ? 'not-allowed' : 'pointer' }}>
                    <i className="bi bi-plus-lg" /> Log Task
                </button>
            )}
        </div>
    );
}

// ── Legend ────────────────────────────────────────────────────────────────────
function Legend({ scrollable }) {
    const items = [['draft','Draft'],['recording','Recording'],['paused','Paused'],['submitted','Submitted'],['rated','Validated']];
    return (
        <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1rem', flexWrap: scrollable ? 'nowrap' : 'wrap',
            overflowX: scrollable ? 'auto' : 'visible' }}>
            {items.map(([k, l]) => {
                const c = statusCfg(k);
                return (
                    <div key={k} style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.72rem',
                        color: 'var(--admin-text-muted)', flexShrink: 0 }}>
                        <span style={{ width: 10, height: 10, borderRadius: 3, background: c.bg, border: `1.5px solid ${c.color}`, display: 'inline-block' }} />
                        {l}
                    </div>
                );
            })}
        </div>
    );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function Index() {
    const { period, orsGateLocked, orsGateReason, orsOptions, supervisors, calendarEntries, activeEntry: initialActive, stats } = usePage().props;

    const today = new Date().toISOString().slice(0, 10);
    const [cal,   setCal]   = useState(() => { const d = new Date(); return { year: d.getFullYear(), month: d.getMonth() }; });
    const [modal, setModal] = useState(null);
    const [selectedDate, setSelectedDate] = useState(today);
    const bp = useBreakpoint();

    function onDayClick(dateStr, dayEntries) {
        if (dayEntries.length > 0) setModal({ type: 'day', date: dateStr, entries: dayEntries });
        else setModal({ type: 'log', date: dateStr });
    }

    function timerAction(action, entryId, openDetails = false) {
        router.post(`/employee/ors/${entryId}/timer`, { action }, {
            preserveScroll: true,
            onSuccess: () => {
                router.reload({ only: ['calendarEntries', 'activeEntry', 'stats'] });
                if (openDetails) {
                    fetch(`/employee/ors/${entryId}/entry`, { headers: { 'Accept': 'application/json', 'X-Requested-With': 'XMLHttpRequest' } })
                        .then(r => r.json()).then(fresh => setModal({ type: 'entry', entry: fresh }));
                }
            },
        });
    }

    function closeModal(refresh = false) {
        setModal(null);
        if (refresh) router.reload({ only: ['calendarEntries', 'activeEntry', 'stats'] });
    }

    function openEntry(entry) {
        if (initialActive && initialActive.id === entry.id) { setModal({ type: 'entry', entry: initialActive }); return; }
        fetch(`/employee/ors/${entry.id}/entry`, { headers: { 'Accept': 'application/json', 'X-Requested-With': 'XMLHttpRequest' } })
            .then(r => r.json()).then(fresh => setModal({ type: 'entry', entry: fresh }))
            .catch(() => setModal({ type: 'entry', entry }));
    }

    const cells = buildCalendar(cal.year, cal.month);

    const statCards = [
        { label: 'This Week', value: stats.this_week,  icon: 'bi-calendar-week',     color: '#3b82f6' },
        { label: 'Drafts',    value: stats.drafts,     icon: 'bi-pencil-square',      color: '#f59e0b' },
        { label: 'Submitted', value: stats.submitted,  icon: 'bi-send-check',         color: '#3b82f6' },
        { label: 'Validated', value: stats.validated,  icon: 'bi-patch-check-fill',   color: '#10b981' },
    ];

    const card = { background: 'var(--admin-card)', border: '1px solid var(--admin-border-strong)', borderRadius: 'var(--admin-radius)', padding: '1rem 1.25rem', boxShadow: 'var(--admin-shadow)' };

    return (
        <AppLayout title="Output Rating Sheet" description={period ? `Performance Period: ${period.name}` : 'No active period'}>

            {/* Gate Banner */}
            {orsGateLocked && (
                <div style={{ marginBottom: '1rem', padding: '0.85rem 1.25rem', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: 10, display: 'flex', alignItems: 'center', gap: '0.6rem', fontSize: '0.85rem', color: '#f87171' }}>
                    <i className="bi bi-exclamation-triangle-fill" />
                    <strong>ORS Locked:</strong> {orsGateReason}
                </div>
            )}

            {/* Stats */}
            <div style={{ display: 'grid', gridTemplateColumns: `repeat(${bp === 'mobile' ? 2 : 4}, 1fr)`, gap: '0.75rem', marginBottom: '0.75rem' }}>
                {statCards.map(s => (
                    <div key={s.label} style={card}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                            <div>
                                <div style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--admin-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.3rem' }}>{s.label}</div>
                                <div style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--admin-text-primary)', lineHeight: 1 }}>{s.value}</div>
                            </div>
                            <div style={{ width: 32, height: 32, borderRadius: 8, background: `${s.color}20`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <i className={`bi ${s.icon}`} style={{ color: s.color }} />
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Timer Panel */}
            <div style={{ marginBottom: '0.75rem' }}>
                <ActiveTimerPanel entry={initialActive} onAction={timerAction} onOpenEntry={openEntry} compact={bp === 'mobile'} />
            </div>

            {/* ── DESKTOP: full calendar ── */}
            {bp === 'desktop' && (
                <div style={card}>
                    <CalHeader cal={cal} setCal={setCal} orsGateLocked={orsGateLocked} showLogBtn onLogTask={() => setModal({ type: 'log', date: today })} />
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '0.35rem', marginBottom: '0.35rem' }}>
                        {WEEKDAYS.map(d => (
                            <div key={d} style={{ textAlign: 'center', fontSize: '0.72rem', fontWeight: 700, color: 'var(--admin-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', padding: '0.25rem 0' }}>{d}</div>
                        ))}
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '0.35rem' }}>
                        {cells.map((day, i) => (
                            <DayCell key={i} day={day} year={cal.year} month={cal.month}
                                entries={calendarEntries} today={today} onDayClick={onDayClick} gateLocked={orsGateLocked} />
                        ))}
                    </div>
                    <Legend />
                </div>
            )}

            {/* ── TABLET: calendar with dot chips, FAB ── */}
            {bp === 'tablet' && (
                <div style={card}>
                    <CalHeader cal={cal} setCal={setCal} orsGateLocked={orsGateLocked} showLogBtn={false} compact />
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '0.25rem', marginBottom: '0.25rem' }}>
                        {WEEKDAYS_SHORT.map((d, i) => (
                            <div key={i} style={{ textAlign: 'center', fontSize: '0.68rem', fontWeight: 700, color: 'var(--admin-text-muted)', textTransform: 'uppercase', padding: '0.2rem 0' }}>{d}</div>
                        ))}
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '0.25rem' }}>
                        {cells.map((day, i) => (
                            <DayCellTablet key={i} day={day} year={cal.year} month={cal.month}
                                entries={calendarEntries} today={today} onDayClick={onDayClick} gateLocked={orsGateLocked} />
                        ))}
                    </div>
                    <Legend scrollable />
                    {/* FAB */}
                    {!orsGateLocked && (
                        <button onClick={() => setModal({ type: 'log', date: today })}
                            style={{ position: 'fixed', bottom: '1.5rem', right: '1.5rem', zIndex: 50,
                                width: 56, height: 56, borderRadius: '50%', border: 'none',
                                background: 'var(--admin-accent)', color: '#fff', fontSize: '1.5rem',
                                cursor: 'pointer', boxShadow: '0 4px 20px rgba(59,130,246,0.45)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <i className="bi bi-plus-lg" />
                        </button>
                    )}
                </div>
            )}

            {/* ── MOBILE: day list view, FAB ── */}
            {bp === 'mobile' && (
                <div style={card}>
                    <CalHeader cal={cal} setCal={setCal} orsGateLocked={orsGateLocked} showLogBtn={false} compact />
                    <MiniCalStrip year={cal.year} month={cal.month} entries={calendarEntries}
                        today={today} onDayClick={onDayClick} gateLocked={orsGateLocked}
                        selectedDate={selectedDate} setSelectedDate={setSelectedDate} />
                    <MobileDayList year={cal.year} month={cal.month} entries={calendarEntries}
                        today={today} onDayClick={onDayClick} gateLocked={orsGateLocked} />
                    <Legend scrollable />
                    {/* FAB */}
                    {!orsGateLocked && (
                        <button onClick={() => setModal({ type: 'log', date: today })}
                            style={{ position: 'fixed', bottom: '1.5rem', right: '1.5rem', zIndex: 50,
                                width: 56, height: 56, borderRadius: '50%', border: 'none',
                                background: 'var(--admin-accent)', color: '#fff', fontSize: '1.5rem',
                                cursor: 'pointer', boxShadow: '0 4px 20px rgba(59,130,246,0.45)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <i className="bi bi-plus-lg" />
                        </button>
                    )}
                </div>
            )}

            {/* Modals */}
            {modal?.type === 'log' && (
                <LogTaskModal date={modal.date} orsOptions={orsOptions} supervisors={supervisors}
                    gateLocked={orsGateLocked} onClose={closeModal} />
            )}
            {modal?.type === 'day' && (
                <DaySummaryModal date={modal.date} entries={modal.entries} onClose={closeModal}
                    onOpenEntry={openEntry} onLogTask={date => setModal({ type: 'log', date })} />
            )}
            {modal?.type === 'entry' && (
                <TaskDetailsModal entry={modal.entry?.id === initialActive?.id ? initialActive : modal.entry} onClose={closeModal} />
            )}
        </AppLayout>
    );
}
