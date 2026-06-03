import AppLayout from '@/Layouts/AppLayout';
import { useEffect, useRef } from 'react';

export default function Dashboard({ activePeriod, totalTasks, completedTasks, pendingTasks, ipcrStatus, submissionStatus, recentTasks, tasksChart, taskStatusChart }) {
    const lineRef = useRef(null);
    const barRef  = useRef(null);

    const chartOpts = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
            x: { ticks: { color: '#8cabcf' }, grid: { color: 'rgba(140,171,214,0.08)' } },
            y: { beginAtZero: true, ticks: { color: '#8cabcf', precision: 0 }, grid: { color: 'rgba(140,171,214,0.08)' } },
        },
    };

    useEffect(() => {
        let line, bar;
        import('chart.js').then(({ Chart, registerables }) => {
            Chart.register(...registerables);

            line = new Chart(lineRef.current, {
                type: 'line',
                data: {
                    labels: tasksChart.labels,
                    datasets: [{ data: tasksChart.data, borderColor: 'rgba(16,150,207,1)', backgroundColor: 'rgba(16,150,207,0.15)', fill: true, tension: 0.4, pointBackgroundColor: 'rgba(16,150,207,1)', pointRadius: 4 }],
                },
                options: chartOpts,
            });

            bar = new Chart(barRef.current, {
                type: 'bar',
                data: {
                    labels: taskStatusChart.labels,
                    datasets: [{ data: taskStatusChart.data, backgroundColor: 'rgba(59,130,246,0.6)', borderColor: 'rgba(59,130,246,1)', borderRadius: 6, borderWidth: 1 }],
                },
                options: chartOpts,
            });
        });
        return () => { line?.destroy(); bar?.destroy(); };
    }, []);
    const stats = [
        { label: 'Active Period',    value: activePeriod,    caption: 'Current performance cycle', small: true },
        { label: 'Total Tasks',      value: totalTasks,      caption: 'Assigned this period' },
        { label: 'Completed Tasks',  value: completedTasks,  caption: 'Finished outputs' },
        { label: 'Pending Tasks',    value: pendingTasks,    caption: 'Still in progress' },
    ];

    const quickLinks = [
        { title: 'IPCR Target',    desc: 'View your performance targets',     href: '/employee/ipcr-target', icon: 'bi-bullseye' },
        { title: 'Accomplishment', desc: 'Submit your accomplishment report',  href: '/employee/accomplishment', icon: 'bi-award-fill' },
        { title: 'MPOR',           desc: 'Monthly performance output report',  href: '/employee/mpor', icon: 'bi-file-text-fill' },
        { title: 'My Tasks',       desc: 'Track your assigned tasks',          href: '/employee/my-tasks', icon: 'bi-check2-square' },
    ];

    return (
        <AppLayout title="Employee Dashboard">
            {/* Stats */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.75rem', marginBottom: '0.75rem' }}>
                {stats.map(s => (
                    <div key={s.label} style={card}>
                        <p style={statLabel}>{s.label}</p>
                        <p style={s.small ? { ...statValue, fontSize: '1.25rem' } : statValue}>{s.value}</p>
                        <p style={statCaption}>{s.caption}</p>
                    </div>
                ))}
            </div>

            <div className="stack">
                {/* Charts */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }} className="charts-row">
                    <div style={{ ...card, minWidth: 0 }}>
                        <p style={cardHeader}>Tasks Completed — Last 7 Days</p>
                        <div style={{ position: 'relative', height: 180, width: '100%' }}>
                            <canvas ref={lineRef} />
                        </div>
                    </div>
                    <div style={{ ...card, minWidth: 0 }}>
                        <p style={cardHeader}>Task Status Breakdown</p>
                        <div style={{ position: 'relative', height: 180, width: '100%' }}>
                            <canvas ref={barRef} />
                        </div>
                    </div>
                </div>

                {/* Quick links */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.75rem' }}>
                    {quickLinks.map(l => (
                        <a key={l.href} href={l.href} style={linkCard}>
                            <i className={`bi ${l.icon}`} style={{ fontSize: '1.4rem', color: 'var(--admin-accent)', marginBottom: '0.5rem', display: 'block' }} />
                            <p style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--admin-text-primary)', marginBottom: '0.3rem' }}>{l.title}</p>
                            <p style={{ fontSize: '0.8rem', color: 'var(--admin-text-muted)', lineHeight: 1.5 }}>{l.desc}</p>
                        </a>
                    ))}
                </div>

                {/* Recent tasks */}
                <div style={card}>
                    <p style={cardHeader}>Recent Tasks</p>
                    <div className="ru-table-wrap">
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
                            <thead>
                                <tr style={{ borderBottom: '1px solid var(--admin-border-strong)' }}>
                                    {['Task','Status','Due Date'].map(h => <th key={h} style={th}>{h}</th>)}
                                </tr>
                            </thead>
                            <tbody>
                                {recentTasks?.map(t => (
                                    <tr key={t.id} style={{ borderBottom: '1px solid var(--admin-border)' }}>
                                        <td style={td}>{t.title}</td>
                                        <td style={td}><span style={statusBadge(t.status)}>{t.status?.replace(/_/g, ' ')}</span></td>
                                        <td style={{ ...td, color: 'var(--admin-text-muted)', whiteSpace: 'nowrap' }}>{t.due_date}</td>
                                    </tr>
                                ))}
                                {!recentTasks?.length && <tr><td colSpan={3} style={{ ...td, textAlign: 'center', color: 'var(--admin-text-muted)' }}>No tasks yet</td></tr>}
                            </tbody>
                        </table>
                    </div>
                    <div className="ru-cards-wrap">
                        {recentTasks?.map(t => (
                            <div key={t.id} style={{ padding: '0.85rem 0', borderBottom: '1px solid var(--admin-border)' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                                    <span style={{ fontWeight: 600, fontSize: '0.875rem', color: 'var(--admin-text-primary)' }}>{t.title}</span>
                                    <span style={statusBadge(t.status)}>{t.status?.replace(/_/g, ' ')}</span>
                                </div>
                                <div style={{ fontSize: '0.75rem', color: 'var(--admin-text-muted)' }}>Due: {t.due_date}</div>
                            </div>
                        ))}
                        {!recentTasks?.length && <p style={{ textAlign: 'center', color: 'var(--admin-text-muted)', padding: '1rem 0', fontSize: '0.875rem' }}>No tasks yet</p>}
                    </div>
                </div>
            </div>

            <style>{sharedStyles}</style>
        </AppLayout>
    );
}

const statusBadge = (s = '') => ({
    padding: '0.2rem 0.6rem', borderRadius: 999, fontSize: '0.72rem', fontWeight: 600,
    background: s.includes('done') || s.includes('approved') || s.includes('released') ? 'rgba(34,197,94,0.12)' :
                s.includes('pending') || s.includes('submitted') || s.includes('endorsed') ? 'rgba(234,179,8,0.12)' :
                'rgba(59,130,246,0.12)',
    color: s.includes('done') || s.includes('approved') || s.includes('released') ? '#4ade80' :
           s.includes('pending') || s.includes('submitted') || s.includes('endorsed') ? '#facc15' :
           'var(--admin-accent)',
    border: `1px solid ${s.includes('done') || s.includes('approved') ? 'rgba(34,197,94,0.22)' : 'rgba(59,130,246,0.22)'}`,
    textTransform: 'capitalize',
});

const card       = { background: 'var(--admin-card)', border: '1px solid var(--admin-border-strong)', borderRadius: 'var(--admin-radius)', padding: '1.25rem 1.5rem', boxShadow: 'var(--admin-shadow)' };
const linkCard   = { ...card, display: 'block', textDecoration: 'none', cursor: 'pointer', transition: 'opacity 0.15s' };
const statLabel  = { fontSize: '0.72rem', fontWeight: 600, color: 'var(--admin-text-muted)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '0.25rem' };
const statValue  = { fontSize: '1.6rem', fontWeight: 800, color: 'var(--admin-text-primary)', letterSpacing: '-0.03em', lineHeight: 1.1, marginBottom: '0.2rem' };
const statCaption = { fontSize: '0.75rem', color: 'var(--admin-text-secondary)' };
const cardHeader = { fontWeight: 700, fontSize: '0.9rem', color: 'var(--admin-text-primary)', marginBottom: '1rem', letterSpacing: '-0.01em' };
const th = { padding: '0.6rem 0.75rem', textAlign: 'left', fontWeight: 600, fontSize: '0.78rem', color: 'var(--admin-text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' };
const td = { padding: '0.65rem 0.75rem', color: 'var(--admin-text-primary)' };
const sharedStyles = `
    .stack > * + * { margin-top: 0.75rem; }
    .ru-cards-wrap { display: none; }
    @media (max-width: 640px) {
        .charts-row { grid-template-columns: 1fr !important; }
        .ru-table-wrap { display: none; }
        .ru-cards-wrap { display: block; }
    }
`;
