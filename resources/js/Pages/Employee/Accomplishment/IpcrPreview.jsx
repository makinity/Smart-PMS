import { useState, useEffect } from 'react';
import { router, usePage } from '@inertiajs/react';
import AppLayout from '@/Layouts/AppLayout';

function useBreakpoint() {
    const [w, setW] = useState(() => window.innerWidth);
    useEffect(() => {
        const h = () => setW(window.innerWidth);
        window.addEventListener('resize', h);
        return () => window.removeEventListener('resize', h);
    }, []);
    return w < 1024 ? 'compact' : 'desktop';
}

function useSidebarLeft() {
    const getLeft = () => {
        if (window.innerWidth < 768) return 0;
        const el = document.querySelector('.app-main');
        return el ? parseInt(getComputedStyle(el).marginLeft) || 0 : 0;
    };
    const [left, setLeft] = useState(getLeft);
    useEffect(() => {
        const update = () => setLeft(getLeft());
        window.addEventListener('resize', update);
        const t = setTimeout(update, 250);
        return () => { window.removeEventListener('resize', update); clearTimeout(t); };
    }, []);
    return left;
}

// ── Standards Overlay (bottom sheet on compact, modal on desktop) ─────────────
function StandardsOverlay({ standards, title, onClose, bp, sidebarLeft }) {
    if (!standards?.length) return null;

    const DIMS    = [...new Set(standards.map(s => s.dimension))];
    const ratings = [5, 4, 3, 2, 1];

    const table = (
        <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.78rem' }}>
                <thead>
                    <tr style={{ background: 'var(--admin-bg-secondary)' }}>
                        <th style={sTh}>Rating</th>
                        {DIMS.map(d => <th key={d} style={{ ...sTh, textTransform: 'capitalize' }}>{d}</th>)}
                    </tr>
                </thead>
                <tbody>
                    {ratings.map(r => (
                        <tr key={r} style={{ borderBottom: '1px solid var(--admin-border)' }}>
                            <td style={{ ...sTd, fontWeight: 700, color: 'var(--admin-accent)', textAlign: 'center' }}>{r}</td>
                            {DIMS.map(d => {
                                const s = standards.find(x => x.rating === r && x.dimension === d);
                                return <td key={d} style={sTd}>{s?.standard_text ?? '—'}</td>;
                            })}
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );

    if (bp === 'compact') {
        // Bottom sheet
        return (
            <>
                <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 1100, background: 'rgba(0,0,0,0.45)' }} />
                <div style={{
                    position: 'fixed', bottom: 0, left: sidebarLeft, right: 0, zIndex: 1101,
                    background: 'var(--admin-card)', borderRadius: '20px 20px 0 0',
                    boxShadow: '0 -8px 32px rgba(0,0,0,0.3)', maxHeight: '80vh',
                    display: 'flex', flexDirection: 'column',
                    animation: 'slideUp 0.22s ease',
                }}>
                    <div style={{ padding: '10px 1.25rem 0', flexShrink: 0, display: 'flex', justifyContent: 'center', position: 'relative' }}>
                        <div style={{ width: 36, height: 4, borderRadius: 99, background: 'var(--admin-border-strong)' }} />
                        <button onClick={onClose} style={{ position: 'absolute', right: '1rem', top: 4,
                            background: 'none', border: 'none', cursor: 'pointer', color: 'var(--admin-text-muted)', fontSize: '1rem' }}>
                            <i className="bi bi-x-lg" />
                        </button>
                    </div>
                    <div style={{ padding: '0.75rem 1.25rem', borderBottom: '1px solid var(--admin-border)', flexShrink: 0 }}>
                        <div style={{ fontSize: '0.65rem', fontWeight: 700, color: 'var(--admin-text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 2 }}>QET Standards</div>
                        <div style={{ fontWeight: 600, fontSize: '0.88rem', color: 'var(--admin-text-primary)', lineHeight: 1.4 }}>{title}</div>
                    </div>
                    <div style={{ flex: 1, overflowY: 'auto', padding: '0.75rem 1.25rem 1.5rem' }}>
                        {table}
                    </div>
                </div>
                <style>{`@keyframes slideUp { from { transform: translateY(100%) } to { transform: translateY(0) } }`}</style>
            </>
        );
    }

    // Desktop modal
    return (
        <>
            <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 1100, background: 'rgba(0,0,0,0.5)' }} />
            <div style={{
                position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
                zIndex: 1101, background: 'var(--admin-card)', borderRadius: 'var(--admin-radius)',
                border: '1px solid var(--admin-border-strong)', boxShadow: 'var(--admin-shadow)',
                width: '90%', maxWidth: 700, maxHeight: '80vh', display: 'flex', flexDirection: 'column',
            }}>
                <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid var(--admin-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                        <div style={{ fontSize: '0.65rem', fontWeight: 700, color: 'var(--admin-text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 2 }}>QET Standards</div>
                        <div style={{ fontWeight: 600, fontSize: '0.92rem', color: 'var(--admin-text-primary)', lineHeight: 1.4, maxWidth: 540 }}>{title}</div>
                    </div>
                    <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--admin-text-muted)', fontSize: '1.1rem', flexShrink: 0, marginLeft: 12 }}>
                        <i className="bi bi-x-lg" />
                    </button>
                </div>
                <div style={{ flex: 1, overflowY: 'auto', padding: '1rem 1.25rem' }}>
                    {table}
                </div>
            </div>
        </>
    );
}

// ── Rating badge ──────────────────────────────────────────────────────────────
function RatingBadge({ label, value }) {
    const color = !value ? 'var(--admin-text-muted)'
        : value >= 4.5 ? '#10b981' : value >= 3.5 ? '#3b82f6' : value >= 2.5 ? '#f59e0b' : '#ef4444';
    return (
        <div style={{ textAlign: 'center', minWidth: 44 }}>
            <div style={{ fontSize: '0.6rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--admin-text-muted)', marginBottom: 2 }}>{label}</div>
            <div style={{ fontSize: '0.95rem', fontWeight: 800, color, lineHeight: 1 }}>
                {value != null ? value.toFixed(2) : '—'}
            </div>
        </div>
    );
}

// ── Standards Panel ───────────────────────────────────────────────────────────
function StandardsPanel({ standards }) {
    if (!standards?.length) return (
        <div style={{ padding: '0.75rem', fontSize: '0.78rem', color: 'var(--admin-text-muted)', fontStyle: 'italic' }}>No standards defined.</div>
    );

    const DIMS = [...new Set(standards.map(s => s.dimension))];
    const ratings = [5, 4, 3, 2, 1];

    return (
        <div style={{ overflowX: 'auto', marginTop: 6 }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.75rem' }}>
                <thead>
                    <tr style={{ background: 'var(--admin-bg-secondary)' }}>
                        <th style={sTh}>Rating</th>
                        {DIMS.map(d => <th key={d} style={{ ...sTh, textTransform: 'capitalize' }}>{d}</th>)}
                    </tr>
                </thead>
                <tbody>
                    {ratings.map(r => (
                        <tr key={r} style={{ borderBottom: '1px solid var(--admin-border)' }}>
                            <td style={{ ...sTd, fontWeight: 700, color: 'var(--admin-accent)', textAlign: 'center' }}>{r}</td>
                            {DIMS.map(d => {
                                const s = standards.find(x => x.rating === r && x.dimension === d);
                                return <td key={d} style={sTd}>{s?.standard_text ?? '—'}</td>;
                            })}
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}
const sTh = { padding: '0.4rem 0.6rem', fontWeight: 700, fontSize: '0.65rem', color: 'var(--admin-text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', borderBottom: '1px solid var(--admin-border)', textAlign: 'left' };
const sTd = { padding: '0.4rem 0.6rem', color: 'var(--admin-text-secondary)', fontSize: '0.75rem', lineHeight: 1.45, verticalAlign: 'top' };

// ── Indicator Row ─────────────────────────────────────────────────────────────
function IndicatorRow({ ind, index, bp, sidebarLeft }) {
    const [showStd, setShowStd] = useState(false);
    const { Q, E, T, A } = ind.ratings ?? {};
    return (
        <div style={{ borderBottom: '1px solid var(--admin-border)', padding: '0.75rem 1rem' }}>
            <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start', flexWrap: 'wrap' }}>
                <div style={{ width: 22, height: 22, borderRadius: '50%', background: 'rgba(59,130,246,0.12)',
                    color: 'var(--admin-accent)', fontSize: '0.65rem', fontWeight: 700, flexShrink: 0,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', marginTop: 2 }}>
                    {index}
                </div>
                <div style={{ flex: 1, minWidth: 180 }}>
                    <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--admin-text-primary)', lineHeight: 1.45, marginBottom: 3 }}>
                        {ind.indicator_text}
                    </div>
                    {ind.target_timeline && (
                        <div style={{ fontSize: '0.72rem', color: 'var(--admin-text-muted)' }}>
                            <i className="bi bi-clock" style={{ marginRight: 3 }} />{ind.target_timeline}
                        </div>
                    )}
                </div>
                <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'center', flexShrink: 0 }}>
                    {[['Q', Q], ['E', E], ['T', T], ['A', A]].map(([l, v]) => (
                        <RatingBadge key={l} label={l} value={v} />
                    ))}
                    {ind.standards?.length > 0 && (
                        <button onClick={() => setShowStd(true)}
                            style={{ padding: '3px 8px', borderRadius: 6, border: '1px solid var(--admin-border)',
                                background: 'transparent', color: 'var(--admin-text-muted)', cursor: 'pointer',
                                fontSize: '0.72rem', display: 'flex', alignItems: 'center', gap: 3 }}>
                            <i className="bi bi-card-checklist" /> Standards
                        </button>
                    )}
                </div>
            </div>
            {showStd && (
                <StandardsOverlay
                    standards={ind.standards}
                    title={ind.indicator_text}
                    onClose={() => setShowStd(false)}
                    bp={bp}
                    sidebarLeft={sidebarLeft}
                />
            )}
        </div>
    );
}

// ── MFO Accordion ─────────────────────────────────────────────────────────────
function MfoAccordion({ mfo, bp, sidebarLeft }) {
    const [open, setOpen] = useState(true);
    return (
        <div style={{ border: '1px solid var(--admin-border)', borderRadius: 10, overflow: 'hidden', marginBottom: 8 }}>
            <button onClick={() => setOpen(v => !v)} style={{
                width: '100%', display: 'flex', alignItems: 'center', gap: 8, padding: '0.7rem 1rem',
                background: 'var(--admin-bg-secondary)', border: 'none', cursor: 'pointer', textAlign: 'left' }}>
                <i className="bi bi-grid-3x3-gap" style={{ color: 'var(--admin-accent)', fontSize: '0.85rem' }} />
                <span style={{ flex: 1, fontWeight: 600, fontSize: '0.88rem', color: 'var(--admin-text-primary)' }}>{mfo.title}</span>
                <span style={{ fontSize: '0.68rem', color: 'var(--admin-text-muted)' }}>{mfo.indicators.length} indicator{mfo.indicators.length !== 1 ? 's' : ''}</span>
                <i className={`bi bi-chevron-${open ? 'up' : 'down'}`} style={{ color: 'var(--admin-text-muted)', fontSize: '0.75rem' }} />
            </button>
            {open && (
                <div style={{ background: 'var(--admin-card)' }}>
                    {mfo.indicators.map((ind, i) => (
                        <IndicatorRow key={ind.id} ind={ind} index={i + 1} bp={bp} sidebarLeft={sidebarLeft} />
                    ))}
                </div>
            )}
        </div>
    );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function IpcrPreview() {
    const { period, employee, sections, meta } = usePage().props;
    const score      = meta?.score ?? 0;
    const rating     = meta?.rating ?? null;
    const typeScores = meta?.type_scores ?? [];
    const scoreColor = score >= 4.5 ? '#10b981' : score >= 3.5 ? '#3b82f6' : score >= 2.5 ? '#f59e0b' : '#ef4444';
    const bp          = useBreakpoint();
    const sidebarLeft = useSidebarLeft();

    const card = { background: 'var(--admin-card)', border: '1px solid var(--admin-border-strong)', borderRadius: 'var(--admin-radius)', boxShadow: 'var(--admin-shadow)' };

    return (
        <AppLayout title="IPCR Preview" description={`Period: ${period?.name}`}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>

                {/* Header card */}
                <div style={{ background: 'var(--admin-card)', border: '1px solid var(--admin-border-strong)', borderRadius: 'var(--admin-radius)', boxShadow: 'var(--admin-shadow)', padding: '1.1rem 1.25rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 8, marginBottom: '0.85rem' }}>
                        <div>
                            <button onClick={() => router.visit('/employee/accomplishment')}
                                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--admin-text-muted)', fontSize: '0.85rem', padding: 0, marginBottom: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
                                <i className="bi bi-arrow-left" /> Back
                            </button>
                            <h2 style={{ fontWeight: 700, fontSize: '1.1rem', color: 'var(--admin-text-primary)', marginBottom: 2 }}>IPCR Accomplishment</h2>
                            <div style={{ fontSize: '0.78rem', color: 'var(--admin-text-muted)' }}>
                                {employee?.name} · {employee?.office} · {period?.name}
                            </div>
                        </div>
                        <div style={{ display: 'flex', gap: 8, alignItems: 'center',
                            ...(bp === 'compact' ? { width: '100%', justifyContent: 'space-between' } : {}) }}>
                            {score > 0 && (
                                <div style={{ textAlign: 'center' }}>
                                    <div style={{ fontSize: '1.3rem', fontWeight: 800, color: scoreColor, lineHeight: 1 }}>{score.toFixed(2)}</div>
                                    <div style={{ fontSize: '0.65rem', color: 'var(--admin-text-muted)' }}>{rating ?? 'Score'}</div>
                                </div>
                            )}
                            <a href="/stage-one/forms/ipcr-excel"
                                style={{ padding: '0.45rem 0.9rem', borderRadius: 8, fontSize: '0.78rem', fontWeight: 600,
                                    background: 'rgba(16,185,129,0.12)', border: '1px solid rgba(16,185,129,0.25)',
                                    color: '#10b981', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 4 }}>
                                <i className="bi bi-file-earmark-excel" /> Export
                            </a>
                        </div>
                    </div>
                    {/* Rating legend */}
                    <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap', fontSize: '0.72rem', color: 'var(--admin-text-muted)', paddingTop: '0.75rem', borderTop: '1px solid var(--admin-border)' }}>
                        {[['Q', 'Quality'], ['E', 'Efficiency'], ['T', 'Timeliness'], ['A', 'Average']].map(([k, v]) => (
                            <span key={k}><strong style={{ color: 'var(--admin-text-primary)' }}>{k}</strong> = {v}</span>
                        ))}
                    </div>
                </div>

                {/* Sections */}
                {(!sections || sections.length === 0) ? (
                    <div style={{ ...card, padding: '3rem', textAlign: 'center', color: 'var(--admin-text-muted)', fontSize: '0.85rem' }}>
                        <i className="bi bi-clipboard-x" style={{ fontSize: '2rem', display: 'block', marginBottom: 8 }} />
                        No IPCR data available.
                    </div>
                ) : sections.map(fn => (
                    <div key={fn.id} style={card}>
                        {/* Function header */}
                        <div style={{ padding: '0.75rem 1rem', borderBottom: '1px solid var(--admin-border)',
                            display: 'flex', alignItems: 'center', gap: 8 }}>
                            <i className="bi bi-house-door" style={{ color: 'var(--admin-accent)' }} />
                            <span style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--admin-text-primary)', flex: 1 }}>{fn.name}</span>
                            {fn.weight && (
                                <span style={{ fontSize: '0.68rem', fontWeight: 700, padding: '2px 8px', borderRadius: 99,
                                    background: 'rgba(59,130,246,0.10)', color: 'var(--admin-accent)' }}>
                                    {fn.weight}%
                                </span>
                            )}
                        </div>
                        {/* MFO accordions */}
                        <div style={{ padding: '0.75rem' }}>
                            {fn.mfos.map(mfo => <MfoAccordion key={mfo.id} mfo={mfo} bp={bp} sidebarLeft={sidebarLeft} />)}
                        </div>
                    </div>
                ))}

                {/* Weighted Average Summary */}
                {typeScores.length > 0 && (
                    <div style={{ ...card, padding: '1rem 1.25rem' }}>
                        <div style={{ fontSize: '0.68rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--admin-text-muted)', marginBottom: '0.75rem' }}>
                            Performance Summary
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                            {typeScores.map((ts, i) => (
                                <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8,
                                    padding: '0.6rem 0.85rem', borderRadius: 8, background: 'var(--admin-bg-secondary)', fontSize: '0.82rem' }}>
                                    <span style={{ color: 'var(--admin-text-secondary)', fontStyle: 'italic' }}>
                                        Weighted Average Rating for {ts.label} ({ts.weight}%)
                                    </span>
                                    <span style={{ fontWeight: 800, fontSize: '1rem', color: ts.weighted_score >= 4.5 ? '#10b981' : ts.weighted_score >= 3.5 ? '#3b82f6' : ts.weighted_score >= 2.5 ? '#f59e0b' : '#ef4444' }}>
                                        {ts.weighted_score.toFixed(2)}
                                    </span>
                                </div>
                            ))}
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8,
                                padding: '0.6rem 0.85rem', borderRadius: 8, border: '1px solid var(--admin-border-strong)', fontSize: '0.82rem' }}>
                                <span style={{ fontWeight: 700, color: 'var(--admin-text-primary)' }}>OVERALL RATING</span>
                                <div style={{ textAlign: 'right' }}>
                                    <div style={{ fontWeight: 800, fontSize: '1.1rem', color: scoreColor, lineHeight: 1 }}>{score > 0 ? score.toFixed(2) : '—'}</div>
                                    {rating && <div style={{ fontSize: '0.68rem', color: 'var(--admin-text-muted)', marginTop: 1 }}>{rating}</div>}
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </AppLayout>
    );
}
