import { useEffect, useMemo, useRef, useState } from 'react';
import { router } from '@inertiajs/react';
import AppLayout from '@/Layouts/AppLayout';
import { formatDuration, statusCfg } from '../Ors/orsHelpers';
import TaskDetailsModal from './TaskDetailsModal';

const gridCss = `
.task-grid { display: grid; grid-template-columns: repeat(4,1fr); gap: 0.75rem; align-items: stretch; }
@media (max-width:1280px) { .task-grid { grid-template-columns: repeat(3,1fr); } }
@media (max-width:900px)  { .task-grid { grid-template-columns: repeat(2,1fr); } }
@media (max-width:560px)  { .task-grid { grid-template-columns: 1fr; } }
.task-card { cursor: pointer; transition: box-shadow 0.15s; }
.task-card:hover { border-color: rgba(59,130,246,0.35) !important; box-shadow: 0 4px 16px rgba(0,0,0,0.1); }
@keyframes pulse { 0%,100% { opacity:1; } 50% { opacity:0.3; } }
`;

const STATUS_FILTERS = [
    { key: 'all', label: 'All' },
    { key: 'draft', label: 'Draft' },
    { key: 'recording', label: 'Recording' },
    { key: 'paused', label: 'Paused' },
    { key: 'submitted', label: 'Submitted' },
    { key: 'rated', label: 'Validated' },
];

function formatDate(value) {
    if (!value) return '—';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).format(date);
}

function Pagination({ links }) {
    if (!links?.length) return null;

    return (
        <div style={s.pagination}>
            {links.map((link, index) => {
                const disabled = !link.url;
                const active = !!link.active;
                const label = link.label
                    .replace('&laquo; Previous', 'Previous')
                    .replace('Next &raquo;', 'Next')
                    .replace(/&laquo;|&raquo;/g, '')
                    .trim();

                return (
                    <button
                        key={`${label}-${index}`}
                        type="button"
                        disabled={disabled}
                        onClick={() => link.url && router.get(link.url, {}, { preserveScroll: true, preserveState: true, replace: true })}
                        style={{
                            ...s.pageBtn,
                            ...(active ? s.pageBtnActive : {}),
                            ...(disabled ? s.pageBtnDisabled : {}),
                        }}
                    >
                        {label || index + 1}
                    </button>
                );
            })}
        </div>
    );
}

function TaskCard({ task, onView }) {
    const cfg = statusCfg(task.status);
    const isLive = task.status === 'recording';

    return (
        <article style={{ ...s.card, borderTop: `3px solid ${cfg.color}`, cursor: 'pointer' }}
            className="task-card"
            onClick={() => onView(task)}>
            {/* Title + status */}
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.5rem', alignItems: 'flex-start' }}>
                <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={s.cardTitle}>{task.output_title}</div>
                    <div style={s.cardSubtitle}>{task.indicator_text}</div>
                </div>
                <span style={{ ...s.statusPill, background: cfg.bg, color: cfg.color, borderColor: cfg.color, flexShrink: 0,
                    display: 'flex', alignItems: 'center', gap: 4 }}>
                    {isLive && <span style={{ width: 6, height: 6, borderRadius: '50%', background: cfg.color, animation: 'pulse 1.2s infinite', display: 'inline-block' }} />}
                    {cfg.label}
                </span>
            </div>

            <div style={{ flex: 1 }} />

            {/* Footer chips */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
                {task.work_date && (
                    <span style={chip}>
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                        {formatDate(task.work_date)}
                    </span>
                )}
                {task.quantity > 0 && (
                    <span style={chip}>✦ {task.quantity} qty</span>
                )}
                {task.total_seconds > 0 && (
                    <span style={{ ...chip, fontFamily: 'monospace' }}>
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                        {formatDuration(task.total_seconds ?? 0)}
                    </span>
                )}
            </div>
        </article>
    );
}

const chip = { display: 'flex', alignItems: 'center', gap: 3, fontSize: '0.65rem', color: 'var(--admin-text-muted)', background: 'var(--admin-bg-secondary)', padding: '2px 7px', borderRadius: 99, border: '1px solid var(--admin-border)' };

export default function Index({ tasks, filters, summary, statusCounts, periodName, notice, autoOpenEntryId }) {
    const [search, setSearch] = useState(filters?.search ?? '');
    const [status, setStatus] = useState(filters?.status ?? 'all');
    const [activeTask, setActiveTask] = useState(null);
    const lastAppliedRef = useRef({
        search: filters?.search ?? '',
        status: filters?.status ?? 'all',
    });

    const taskRows = tasks?.data ?? [];

    useEffect(() => {
        setSearch(filters?.search ?? '');
    }, [filters?.search]);

    useEffect(() => {
        setStatus(filters?.status ?? 'all');
    }, [filters?.status]);

    useEffect(() => {
        const timer = setTimeout(() => {
            const nextQuery = {
                search: search.trim(),
                status,
            };

            if (nextQuery.search === lastAppliedRef.current.search && nextQuery.status === lastAppliedRef.current.status) {
                return;
            }

            lastAppliedRef.current = nextQuery;
            router.get('/employee/my-tasks', nextQuery, {
                preserveScroll: true,
                preserveState: true,
                replace: true,
            });
        }, 300);

        return () => clearTimeout(timer);
    }, [search, status]);

    useEffect(() => {
        if (!activeTask) return undefined;
        const onKeyDown = (event) => {
            if (event.key === 'Escape') setActiveTask(null);
        };
        window.addEventListener('keydown', onKeyDown);
        return () => window.removeEventListener('keydown', onKeyDown);
    }, [activeTask]);

    // Auto-open task modal when arriving from a notification link
    useEffect(() => {
        if (!autoOpenEntryId) return;
        const taskRows = tasks?.data ?? [];
        const match = taskRows.find(t => t.id === autoOpenEntryId);
        if (match) setActiveTask(match);
    }, [autoOpenEntryId]);

    const filterButtons = useMemo(() => STATUS_FILTERS.map((item) => ({
        ...item,
        count: item.key === 'all' ? (summary?.total ?? 0) : (statusCounts?.[item.key] ?? 0),
    })), [statusCounts, summary?.total]);

    return (
        <AppLayout title="My Tasks" description="Employee task log">
            {notice && (
                <div style={s.notice}>
                    <i className="bi bi-info-circle-fill" />
                    <span>{notice}</span>
                </div>
            )}

            <section style={s.shell}>
                <div style={s.periodRow}>
                    <div style={s.periodChip}>
                        <i className="bi bi-calendar3" />
                        <span>{periodName ? `Active period: ${periodName}` : 'No active period'}</span>
                    </div>
                </div>

                <div style={s.controlsCard}>
                    <div style={s.searchWrap}>
                        <i className="bi bi-search" style={s.searchIcon} />
                        <input
                            type="search"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Search by output, indicator, supervisor, notes..."
                            style={s.searchInput}
                        />
                    </div>

                    <div style={s.filterRow}>
                        {filterButtons.map((item) => {
                            const active = status === item.key;
                            const cfg = item.key === 'all' ? { color: 'var(--admin-accent)', bg: 'rgba(59,130,246,0.12)' } : statusCfg(item.key);

                            return (
                                <button
                                    key={item.key}
                                    type="button"
                                    onClick={() => {
                                        if (status === item.key) return;
                                        const nextQuery = { search: search.trim(), status: item.key };
                                        lastAppliedRef.current = nextQuery;
                                        setStatus(item.key);
                                        router.get('/employee/my-tasks', nextQuery, {
                                            preserveScroll: true,
                                            preserveState: true,
                                            replace: true,
                                        });
                                    }}
                                    style={{
                                        ...s.filterBtn,
                                        ...(active ? s.filterBtnActive : {}),
                                        color: active ? cfg.color : 'var(--admin-text-secondary)',
                                        borderColor: active ? cfg.color : 'var(--admin-border)',
                                        background: active ? cfg.bg : 'transparent',
                                    }}
                                >
                                    <span>{item.label}</span>
                                    <span style={s.filterCount}>{item.count}</span>
                                </button>
                            );
                        })}
                    </div>
                </div>

                <div style={s.listCard}>
                    {taskRows.length === 0 ? (
                        <div style={s.emptyCell}>
                            <i className="bi bi-inbox" style={s.emptyIcon} />
                            <div style={s.emptyTitle}>No tasks found</div>
                            <div style={s.emptyText}>Try changing the search terms or status filter.</div>
                        </div>
                    ) : (
                        <>
                            <style>{gridCss}</style>
                            <div className="task-grid">
                                {taskRows.map(task => (
                                    <TaskCard key={task.id} task={task} onView={setActiveTask} />
                                ))}
                            </div>
                        </>
                    )}
                    <Pagination links={tasks?.links ?? []} />
                </div>
            </section>

            {activeTask && (
                <TaskDetailsModal entry={activeTask} onClose={() => setActiveTask(null)} />
            )}
        </AppLayout>
    );
}

const s = {
    notice: {
        marginBottom: '1rem',
        display: 'flex',
        alignItems: 'center',
        gap: '0.6rem',
        padding: '0.85rem 1rem',
        borderRadius: 'var(--admin-radius)',
        background: 'rgba(59,130,246,0.08)',
        border: '1px solid rgba(59,130,246,0.18)',
        color: 'var(--admin-text-secondary)',
        fontSize: '0.9rem',
    },
    shell: {
        display: 'flex',
        flexDirection: 'column',
        gap: '1rem',
    },
    headerRow: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        gap: '1rem',
        padding: '1.25rem 1.35rem',
        border: '1px solid var(--admin-border-strong)',
        borderRadius: 'var(--admin-radius-lg)',
        background: 'linear-gradient(180deg, rgba(59,130,246,0.06), rgba(255,255,255,0.01))',
        boxShadow: 'var(--admin-shadow)',
    },
    kicker: {
        fontSize: '0.72rem',
        textTransform: 'uppercase',
        letterSpacing: '0.12em',
        color: 'var(--admin-text-muted)',
        fontWeight: 700,
        marginBottom: '0.35rem',
    },
    title: {
        fontSize: '1.9rem',
        lineHeight: 1.1,
        color: 'var(--admin-text-primary)',
        marginBottom: '0.45rem',
    },
    subtitle: {
        fontSize: '0.95rem',
        color: 'var(--admin-text-secondary)',
        lineHeight: 1.6,
        maxWidth: 820,
    },
    periodChip: {
        display: 'inline-flex',
        alignItems: 'center',
        gap: '0.5rem',
        padding: '0.7rem 0.9rem',
        borderRadius: 999,
        border: '1px solid var(--admin-border)',
        background: 'var(--admin-card)',
        color: 'var(--admin-text-secondary)',
        fontSize: '0.85rem',
        fontWeight: 600,
        whiteSpace: 'nowrap',
    },
    summaryGrid: {
        display: 'grid',
        gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',
        gap: '0.85rem',
    },
    summaryCard: {
        display: 'flex',
        alignItems: 'center',
        gap: '0.85rem',
        padding: '1rem 1rem',
        borderRadius: 'var(--admin-radius)',
        border: '1px solid var(--admin-border)',
        background: 'var(--admin-card)',
        boxShadow: 'var(--admin-shadow)',
    },
    summaryIcon: {
        width: 42,
        height: 42,
        borderRadius: 12,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'rgba(59,130,246,0.12)',
        color: 'var(--admin-accent)',
        flexShrink: 0,
    },
    summaryLabel: {
        fontSize: '0.72rem',
        textTransform: 'uppercase',
        letterSpacing: '0.08em',
        color: 'var(--admin-text-muted)',
        fontWeight: 700,
        marginBottom: '0.25rem',
    },
    summaryValue: {
        fontSize: '1.6rem',
        fontWeight: 800,
        color: 'var(--admin-text-primary)',
        lineHeight: 1,
    },
    controlsCard: {
        display: 'flex',
        flexDirection: 'column',
        gap: '0.9rem',
        padding: '1rem 1rem',
        borderRadius: 'var(--admin-radius-lg)',
        border: '1px solid var(--admin-border-strong)',
        background: 'var(--admin-card)',
        boxShadow: 'var(--admin-shadow)',
    },
    searchWrap: {
        position: 'relative',
    },
    searchIcon: {
        position: 'absolute',
        left: '0.95rem',
        top: '50%',
        transform: 'translateY(-50%)',
        color: 'var(--admin-text-muted)',
        pointerEvents: 'none',
    },
    searchInput: {
        width: '100%',
        minHeight: 50,
        padding: '0.85rem 1rem 0.85rem 2.5rem',
        borderRadius: 12,
        border: '1px solid var(--admin-border-strong)',
        background: 'rgba(255,255,255,0.03)',
        color: 'var(--admin-text-primary)',
        outline: 'none',
        fontSize: '0.95rem',
        fontFamily: 'inherit',
    },
    filterRow: {
        display: 'flex',
        gap: '0.55rem',
        flexWrap: 'wrap',
        overflowX: 'auto',
        paddingBottom: '0.15rem',
    },
    filterBtn: {
        display: 'inline-flex',
        alignItems: 'center',
        gap: '0.55rem',
        padding: '0.55rem 0.95rem',
        borderRadius: 999,
        border: '1px solid var(--admin-border)',
        background: 'transparent',
        cursor: 'pointer',
        fontSize: '0.9rem',
        fontWeight: 700,
        whiteSpace: 'nowrap',
        flexShrink: 0,
    },
    filterBtnActive: {
        boxShadow: '0 0 0 1px rgba(59,130,246,0.12) inset',
    },
    filterCount: {
        padding: '0.08rem 0.45rem',
        borderRadius: 999,
        background: 'rgba(255,255,255,0.06)',
        color: 'var(--admin-text-secondary)',
        fontSize: '0.72rem',
        fontWeight: 700,
    },
    listCard: {
        display: 'flex',
        flexDirection: 'column',
        gap: '1rem',
        padding: '1rem 1rem 1.15rem',
        borderRadius: 'var(--admin-radius-lg)',
        border: '1px solid var(--admin-border-strong)',
        background: 'var(--admin-card)',
        boxShadow: 'var(--admin-shadow)',
    },
    tableWrap: {
        overflowX: 'auto',
        borderRadius: 12,
    },
    table: {
        width: '100%',
        minWidth: 960,
        borderCollapse: 'separate',
        borderSpacing: 0,
    },
    th: {
        textAlign: 'left',
        padding: '0.9rem 0.85rem',
        fontSize: '0.72rem',
        textTransform: 'uppercase',
        letterSpacing: '0.08em',
        color: 'var(--admin-text-muted)',
        borderBottom: '1px solid var(--admin-border)',
        whiteSpace: 'nowrap',
    },
    tr: {
        transition: 'background 0.15s ease',
    },
    td: {
        padding: '1rem 0.85rem',
        borderBottom: '1px solid var(--admin-border)',
        verticalAlign: 'top',
        color: 'var(--admin-text-secondary)',
        fontSize: '0.92rem',
    },
    tdAction: {
        padding: '0.85rem 0.85rem',
        borderBottom: '1px solid var(--admin-border)',
        verticalAlign: 'middle',
        textAlign: 'right',
    },
    tablePrimary: {
        color: 'var(--admin-text-primary)',
        fontWeight: 700,
        lineHeight: 1.4,
        marginBottom: '0.2rem',
    },
    tableSecondary: {
        color: 'var(--admin-text-muted)',
        fontSize: '0.84rem',
        lineHeight: 1.45,
    },
    tableMono: {
        fontFamily: 'monospace',
        fontWeight: 700,
        color: 'var(--admin-text-primary)',
    },
    statusPill: {
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '0.26rem 0.72rem',
        borderRadius: 999,
        border: '1px solid currentColor',
        fontSize: '0.74rem',
        fontWeight: 800,
        textTransform: 'uppercase',
        letterSpacing: '0.04em',
        whiteSpace: 'nowrap',
    },
    iconBtn: {
        width: 38,
        height: 38,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 10,
        border: '1px solid var(--admin-border-strong)',
        background: 'rgba(59,130,246,0.08)',
        color: 'var(--admin-accent)',
        cursor: 'pointer',
        fontSize: '0.95rem',
    },
    cardList: {
        display: 'flex',
        flexDirection: 'column',
        gap: '0.9rem',
    },
    card: {
        display: 'flex',
        flexDirection: 'column',
        gap: '0.9rem',
        padding: '1rem',
        borderRadius: 'var(--admin-radius)',
        border: '1px solid var(--admin-border)',
        background: 'rgba(255,255,255,0.03)',
        height: '100%',
        boxSizing: 'border-box',
    },
    cardHeader: {
        display: 'flex',
        justifyContent: 'space-between',
        gap: '0.75rem',
        alignItems: 'flex-start',
    },
    cardTitle: {
        fontSize: '0.82rem',
        fontWeight: 600,
        color: 'var(--admin-text-primary)',
        lineHeight: 1.35,
        marginBottom: '0.2rem',
    },
    cardSubtitle: {
        fontSize: '0.78rem',
        color: 'var(--admin-text-secondary)',
        lineHeight: 1.45,
    },
    cardMetaGrid: {
        display: 'grid',
        gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
        gap: '0.85rem',
        paddingTop: '0.2rem',
    },
    metaLabel: {
        fontSize: '0.68rem',
        fontWeight: 800,
        color: 'var(--admin-text-muted)',
        textTransform: 'uppercase',
        letterSpacing: '0.08em',
        marginBottom: '0.25rem',
    },
    metaValue: {
        color: 'var(--admin-text-primary)',
        fontWeight: 600,
    },
    metaValueMono: {
        color: 'var(--admin-text-primary)',
        fontWeight: 700,
        fontFamily: 'monospace',
    },
    cardBody: {
        display: 'flex',
        flexDirection: 'column',
        gap: '0.35rem',
    },
    noteLabel: {
        fontSize: '0.68rem',
        fontWeight: 800,
        color: 'var(--admin-text-muted)',
        textTransform: 'uppercase',
        letterSpacing: '0.08em',
    },
    noteText: {
        margin: 0,
        color: 'var(--admin-text-secondary)',
        lineHeight: 1.55,
        fontSize: '0.92rem',
    },
    cardFooter: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: '0.75rem',
        flexWrap: 'wrap',
        paddingTop: '0.15rem',
    },
    footInfo: {
        display: 'flex',
        alignItems: 'center',
        gap: '0.4rem',
        color: 'var(--admin-text-muted)',
        fontSize: '0.82rem',
        flexWrap: 'wrap',
    },
    viewBtn: {
        display: 'inline-flex',
        alignItems: 'center',
        gap: '0.4rem',
        padding: '0.55rem 0.85rem',
        borderRadius: 10,
        border: '1px solid var(--admin-border-strong)',
        background: 'rgba(59,130,246,0.09)',
        color: 'var(--admin-accent)',
        cursor: 'pointer',
        fontSize: '0.84rem',
        fontWeight: 700,
    },
    emptyCell: {
        padding: '2rem 1rem',
        textAlign: 'center',
        color: 'var(--admin-text-muted)',
    },
    emptyIcon: {
        display: 'block',
        fontSize: '1.8rem',
        marginBottom: '0.75rem',
    },
    emptyTitle: {
        fontSize: '1rem',
        fontWeight: 800,
        color: 'var(--admin-text-primary)',
        marginBottom: '0.35rem',
    },
    emptyText: {
        fontSize: '0.88rem',
        color: 'var(--admin-text-muted)',
    },
    pagination: {
        display: 'flex',
        flexWrap: 'wrap',
        gap: '0.5rem',
        justifyContent: 'flex-end',
        paddingTop: '0.2rem',
    },
    pageBtn: {
        minWidth: 38,
        minHeight: 38,
        padding: '0.45rem 0.75rem',
        borderRadius: 10,
        border: '1px solid var(--admin-border)',
        background: 'transparent',
        color: 'var(--admin-text-secondary)',
        cursor: 'pointer',
        fontSize: '0.84rem',
        fontWeight: 700,
    },
    pageBtnActive: {
        borderColor: 'var(--admin-accent)',
        background: 'rgba(59,130,246,0.14)',
        color: 'var(--admin-accent)',
    },
    pageBtnDisabled: {
        opacity: 0.45,
        cursor: 'not-allowed',
    },
};
