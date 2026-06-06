import { useState, useEffect, useRef, useCallback } from 'react';
import { router, usePage } from '@inertiajs/react';
import AppLayout from '@/Layouts/AppLayout';
import { formatDuration, statusCfg } from './orsHelpers';
import LogTaskModal from './LogTaskModal';
import DaySummaryModal from './DaySummaryModal';
import TaskDetailsModal from './TaskDetailsModal';

// ── Calendar helpers ─────────────────────────────────────────────────────────
function buildCalendar(year, month) {
    const firstDay = new Date(year, month, 1).getDay(); // 0=Sun
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const cells = [];
    for (let i = 0; i < firstDay; i++) cells.push(null);
    for (let d = 1; d <= daysInMonth; d++) cells.push(d);
    while (cells.length % 7 !== 0) cells.push(null);
    return cells;
}
const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];

function toDateStr(year, month, day) {
    return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

// ── Active Timer Panel ───────────────────────────────────────────────────────
function ActiveTimerPanel({ entry, onAction, onOpenEntry }) {
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

    const s = {
        panel: { background: 'var(--admin-card)', border: '1px solid var(--admin-border-strong)', borderRadius: 'var(--admin-radius)', padding: '1rem 1.25rem', display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' },
        empty: { color: 'var(--admin-text-muted)', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.5rem' },
        title: { fontWeight: 600, fontSize: '0.9rem', color: 'var(--admin-text-primary)', maxWidth: 320, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
        meta: { fontSize: '0.75rem', color: 'var(--admin-text-muted)' },
        timer: { fontFamily: 'monospace', fontSize: '1.4rem', fontWeight: 700, minWidth: 100, color: entry?.status === 'recording' ? '#ef4444' : 'var(--admin-text-secondary)' },
        btn: { display: 'flex', alignItems: 'center', gap: '0.35rem', padding: '0.45rem 0.9rem', borderRadius: 7, fontWeight: 600, fontSize: '0.82rem', cursor: 'pointer', border: 'none' },
    };

    if (!entry) return (
        <div style={s.panel}>
            <div style={s.empty}><i className="bi bi-stopwatch" /><span>No active timer — click a date to log a task.</span></div>
        </div>
    );

    const cfg = statusCfg(entry.status);
    return (
        <div style={s.panel}>
            <div style={{ width: 36, height: 36, borderRadius: '50%', background: cfg.bg, color: cfg.color, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <i className={`bi ${cfg.icon}`} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
                <div style={s.title} title={entry.indicator_text}>{entry.indicator_text}</div>
                <div style={s.meta}>{entry.output_title} · {entry.work_date}</div>
            </div>
            <span style={s.timer}>{formatDuration(secs)}</span>
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                {entry.status === 'recording' && (
                    <button style={{ ...s.btn, background: 'rgba(139,92,246,0.12)', color: '#8b5cf6', border: '1px solid rgba(139,92,246,0.25)' }} onClick={() => onAction('pause', entry.id)}>
                        <i className="bi bi-pause-fill" /> Pause
                    </button>
                )}
                {entry.status === 'paused' && (
                    <button style={{ ...s.btn, background: 'rgba(16,185,129,0.12)', color: '#10b981', border: '1px solid rgba(16,185,129,0.25)' }} onClick={() => onAction('resume', entry.id)}>
                        <i className="bi bi-play-fill" /> Resume
                    </button>
                )}
                {['recording', 'paused'].includes(entry.status) && (
                    <button style={{ ...s.btn, background: 'var(--admin-bg-secondary)', border: '1px solid var(--admin-border)', color: 'var(--admin-text-secondary)' }} onClick={() => onAction('stop', entry.id, true)}>
                        <i className="bi bi-stop-fill" /> Stop
                    </button>
                )}
                <button style={{ ...s.btn, background: 'var(--admin-accent)', color: '#fff' }} onClick={() => onOpenEntry(entry)}>
                    <i className="bi bi-arrow-up-right-square" /> Details
                </button>
            </div>
        </div>
    );
}

// ── Calendar Day Cell ─────────────────────────────────────────────────────────
function DayCell({ day, year, month, entries, today, onDayClick, gateLocked }) {
    if (!day) return <div style={{ minHeight: 80 }} />;
    const dateStr = toDateStr(year, month, day);
    const dayEntries = entries[dateStr] ?? [];
    const isToday = dateStr === today;

    // Group status chips
    const groups = {};
    dayEntries.forEach(e => { groups[e.status] = (groups[e.status] ?? 0) + 1; });

    return (
        <div
            onClick={() => !gateLocked && onDayClick(dateStr, dayEntries)}
            style={{
                minHeight: 80, padding: '0.4rem', borderRadius: 8, border: `1px solid ${isToday ? 'var(--admin-accent)' : 'var(--admin-border)'}`,
                background: isToday ? 'rgba(59,130,246,0.06)' : 'var(--admin-bg-secondary)',
                cursor: gateLocked ? 'not-allowed' : 'pointer', position: 'relative', transition: 'background 0.12s',
            }}
            onMouseEnter={e => { if (!gateLocked) e.currentTarget.style.background = 'rgba(59,130,246,0.04)'; }}
            onMouseLeave={e => { e.currentTarget.style.background = isToday ? 'rgba(59,130,246,0.06)' : 'var(--admin-bg-secondary)'; }}
        >
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

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function Index() {
    const { period, orsGateLocked, orsGateReason, orsOptions, supervisors, calendarEntries, activeEntry: initialActive, stats } = usePage().props;

    const today = new Date().toISOString().slice(0, 10);
    const [cal, setCal] = useState(() => { const d = new Date(); return { year: d.getFullYear(), month: d.getMonth() }; });
    const [modal, setModal] = useState(null); // { type: 'log'|'day'|'entry', date?, entries?, entry? }

    function prevMonth() { setCal(c => c.month === 0 ? { year: c.year - 1, month: 11 } : { ...c, month: c.month - 1 }); }
    function nextMonth() { setCal(c => c.month === 11 ? { year: c.year + 1, month: 0 } : { ...c, month: c.month + 1 }); }

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
                        .then(r => r.json())
                        .then(fresh => setModal({ type: 'entry', entry: fresh }));
                }
            },
        });
    }

    function closeModal(refresh = false) {
        setModal(null);
        if (refresh) router.reload({ only: ['calendarEntries', 'activeEntry', 'stats'] });
    }

    // Use entry data directly; fetch fresh only if not the active entry
    function openEntry(entry) {
        // If this is the active entry, use the live props directly to avoid timer lag
        if (initialActive && initialActive.id === entry.id) {
            setModal({ type: 'entry', entry: initialActive });
            return;
        }
        fetch(`/employee/ors/${entry.id}/entry`, { headers: { 'Accept': 'application/json', 'X-Requested-With': 'XMLHttpRequest' } })
            .then(r => r.json())
            .then(fresh => setModal({ type: 'entry', entry: fresh }))
            .catch(() => setModal({ type: 'entry', entry }));
    }

    const cells = buildCalendar(cal.year, cal.month);

    const statCards = [
        { label: 'This Week', value: stats.this_week, icon: 'bi-calendar-week', color: '#3b82f6' },
        { label: 'Drafts',    value: stats.drafts,    icon: 'bi-pencil-square',  color: '#f59e0b' },
        { label: 'Submitted', value: stats.submitted, icon: 'bi-send-check',     color: '#3b82f6' },
        { label: 'Validated', value: stats.validated, icon: 'bi-patch-check-fill', color: '#10b981' },
    ];

    const card = { background: 'var(--admin-card)', border: '1px solid var(--admin-border-strong)', borderRadius: 'var(--admin-radius)', padding: '1rem 1.25rem', boxShadow: 'var(--admin-shadow)' };

    return (
        <AppLayout title="Output Rating Sheet" description={period ? `Performance Period: ${period.name}` : 'No active period'}>
            {/* ORS Gate Banner */}
            {orsGateLocked && (
                <div style={{ marginBottom: '1rem', padding: '0.85rem 1.25rem', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: 10, display: 'flex', alignItems: 'center', gap: '0.6rem', fontSize: '0.85rem', color: '#f87171' }}>
                    <i className="bi bi-exclamation-triangle-fill" />
                    <strong>ORS Locked:</strong> {orsGateReason}
                </div>
            )}

            {/* Stats */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '0.75rem', marginBottom: '0.75rem' }}>
                {statCards.map(s => (
                    <div key={s.label} style={card}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                            <div>
                                <div style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--admin-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.3rem' }}>{s.label}</div>
                                <div style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--admin-text-primary)', lineHeight: 1 }}>{s.value}</div>
                            </div>
                            <div style={{ width: 36, height: 36, borderRadius: 9, background: `${s.color}20`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <i className={`bi ${s.icon}`} style={{ color: s.color }} />
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Active Timer Panel */}
            <div style={{ marginBottom: '0.75rem' }}>
                <ActiveTimerPanel
                    entry={initialActive}
                    onAction={timerAction}
                    onOpenEntry={openEntry}
                />
            </div>

            {/* Calendar */}
            <div style={card}>
                {/* Calendar Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <button onClick={prevMonth} style={{ background: 'none', border: '1px solid var(--admin-border)', borderRadius: 7, padding: '0.3rem 0.65rem', cursor: 'pointer', color: 'var(--admin-text-secondary)' }}>
                            <i className="bi bi-chevron-left" />
                        </button>
                        <span style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--admin-text-primary)', minWidth: 160, textAlign: 'center' }}>
                            {MONTHS[cal.month]} {cal.year}
                        </span>
                        <button onClick={nextMonth} style={{ background: 'none', border: '1px solid var(--admin-border)', borderRadius: 7, padding: '0.3rem 0.65rem', cursor: 'pointer', color: 'var(--admin-text-secondary)' }}>
                            <i className="bi bi-chevron-right" />
                        </button>
                        <button onClick={() => { const d = new Date(); setCal({ year: d.getFullYear(), month: d.getMonth() }); }}
                            style={{ fontSize: '0.78rem', padding: '0.3rem 0.75rem', background: 'var(--admin-bg-secondary)', border: '1px solid var(--admin-border)', borderRadius: 7, cursor: 'pointer', color: 'var(--admin-text-muted)', marginLeft: 4 }}>
                            Today
                        </button>
                    </div>
                    <button
                        disabled={orsGateLocked}
                        onClick={() => setModal({ type: 'log', date: today })}
                        style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.5rem 1.1rem', background: orsGateLocked ? 'var(--admin-bg-secondary)' : 'var(--admin-accent)', color: orsGateLocked ? 'var(--admin-text-muted)' : '#fff', border: 'none', borderRadius: 8, fontWeight: 700, fontSize: '0.85rem', cursor: orsGateLocked ? 'not-allowed' : 'pointer' }}>
                        <i className="bi bi-plus-lg" /> Log Task
                    </button>
                </div>

                {/* Weekday headers */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '0.35rem', marginBottom: '0.35rem' }}>
                    {WEEKDAYS.map(d => (
                        <div key={d} style={{ textAlign: 'center', fontSize: '0.72rem', fontWeight: 700, color: 'var(--admin-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', padding: '0.25rem 0' }}>{d}</div>
                    ))}
                </div>

                {/* Day cells */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '0.35rem' }}>
                    {cells.map((day, i) => (
                        <DayCell key={i} day={day} year={cal.year} month={cal.month}
                            entries={calendarEntries} today={today}
                            onDayClick={onDayClick} gateLocked={orsGateLocked} />
                    ))}
                </div>

                {/* Legend */}
                <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem', flexWrap: 'wrap' }}>
                    {[['draft','Draft'],['recording','Recording'],['paused','Paused'],['submitted','Submitted'],['rated','Validated']].map(([k, l]) => {
                        const c = statusCfg(k);
                        return (
                            <div key={k} style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.72rem', color: 'var(--admin-text-muted)' }}>
                                <span style={{ width: 10, height: 10, borderRadius: 3, background: c.bg, border: `1.5px solid ${c.color}`, display: 'inline-block' }} />
                                {l}
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Modals */}
            {modal?.type === 'log' && (
                <LogTaskModal
                    date={modal.date}
                    orsOptions={orsOptions}
                    supervisors={supervisors}
                    gateLocked={orsGateLocked}
                    onClose={closeModal}
                />
            )}
            {modal?.type === 'day' && (
                <DaySummaryModal
                    date={modal.date}
                    entries={modal.entries}
                    onClose={closeModal}
                    onOpenEntry={openEntry}
                    onLogTask={(date) => setModal({ type: 'log', date })}
                />
            )}
            {modal?.type === 'entry' && (
                <TaskDetailsModal
                    entry={modal.entry?.id === initialActive?.id ? initialActive : modal.entry}
                    onClose={closeModal}
                />
            )}
        </AppLayout>
    );
}
