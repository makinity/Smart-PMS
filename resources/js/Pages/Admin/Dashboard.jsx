import AppLayout from '@/Layouts/AppLayout';
import { useEffect, useRef } from 'react';

export default function Dashboard({ totalUsers, totalOffices, activePeriod, activeUsers, newUsersChart, activityChart, recentUsers }) {
    const barRef  = useRef(null);
    const lineRef = useRef(null);

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
        let bar, line;
        import('chart.js').then(({ Chart, registerables }) => {
            Chart.register(...registerables);

            bar = new Chart(barRef.current, {
                type: 'bar',
                data: {
                    labels: newUsersChart.labels,
                    datasets: [{ data: newUsersChart.data, backgroundColor: 'rgba(59,130,246,0.6)', borderColor: 'rgba(59,130,246,1)', borderRadius: 6, borderWidth: 1 }],
                },
                options: chartOpts,
            });

            line = new Chart(lineRef.current, {
                type: 'line',
                data: {
                    labels: activityChart.labels,
                    datasets: [{ data: activityChart.data, borderColor: 'rgba(16,150,207,1)', backgroundColor: 'rgba(16,150,207,0.15)', fill: true, tension: 0.4, pointBackgroundColor: 'rgba(16,150,207,1)', pointRadius: 4 }],
                },
                options: chartOpts,
            });
        });
        return () => { bar?.destroy(); line?.destroy(); };
    }, []);

    const stats = [
        { label: 'Total Users',    value: totalUsers,   caption: 'Registered accounts' },
        { label: 'Active Users',   value: activeUsers,  caption: 'Currently enabled' },
        { label: 'Offices',        value: totalOffices, caption: 'Organizational units' },
        { label: 'Active Period',  value: activePeriod, caption: 'Current performance period', big: false },
    ];

    const quickLinks = [
        { title: 'User Directory',      desc: 'Manage accounts and roles',         href: '/administrator/users',               icon: 'bi-people-fill' },
        { title: 'Offices',             desc: 'View and edit organizational units', href: '/administrator/offices',             icon: 'bi-building-fill' },
        { title: 'Performance Periods', desc: 'Configure evaluation timelines',     href: '/administrator/performance-periods', icon: 'bi-calendar3' },
        { title: 'Audit Logs',          desc: 'Track system activity and changes',  href: '/administrator/audit-logs',          icon: 'bi-journal-text' },
    ];

    return (
        <AppLayout title="Admin Dashboard">
            {/* Stats */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.75rem', marginBottom: '0.75rem' }}>
                {stats.map(s => (
                    <div key={s.label} style={card}>
                        <p style={statLabel}>{s.label}</p>
                        <p style={s.big === false ? { ...statValue, fontSize: '1.25rem' } : statValue}>{s.value}</p>
                        <p style={statCaption}>{s.caption}</p>
                    </div>
                ))}
            </div>

            <div className="stack">
                {/* Charts */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }} className="charts-row">
                    <div style={{ ...card, minWidth: 0 }}>
                        <p style={cardHeader}>New Users — Last 7 Days</p>
                        <div style={{ position: 'relative', height: 180, width: '100%' }}>
                            <canvas ref={barRef} />
                        </div>
                    </div>
                    <div style={{ ...card, minWidth: 0 }}>
                        <p style={cardHeader}>User Activity — Last 7 Days</p>
                        <div style={{ position: 'relative', height: 180, width: '100%' }}>
                            <canvas ref={lineRef} />
                        </div>
                    </div>
                </div>

                {/* Quick Access */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem' }}>
                    {quickLinks.map(l => (
                        <a key={l.href} href={l.href} style={linkCard}>
                            <i className={`bi ${l.icon}`} style={{ fontSize: '1.4rem', color: 'var(--admin-accent)', marginBottom: '0.5rem', display: 'block' }} />
                            <p style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--admin-text-primary)', marginBottom: '0.3rem' }}>{l.title}</p>
                            <p style={{ fontSize: '0.8rem', color: 'var(--admin-text-muted)', lineHeight: 1.5 }}>{l.desc}</p>
                        </a>
                    ))}
                </div>

                {/* Recent Users */}
                <div style={card}>
                    <p style={cardHeader}>Recent Users</p>
                    {/* Desktop table */}
                    <div className="ru-table-wrap">
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
                            <thead>
                                <tr style={{ borderBottom: '1px solid var(--admin-border-strong)' }}>
                                    {['Name','Email','Role','Joined'].map(h => (
                                        <th key={h} style={th}>{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {recentUsers.map(u => (
                                    <tr key={u.id} style={{ borderBottom: '1px solid var(--admin-border)' }}>
                                        <td style={td}>{u.name}</td>
                                        <td style={{ ...td, color: 'var(--admin-text-muted)' }}>{u.email}</td>
                                        <td style={td}><span style={badge}>{u.role}</span></td>
                                        <td style={{ ...td, color: 'var(--admin-text-muted)', whiteSpace: 'nowrap' }}>{u.created_at}</td>
                                    </tr>
                                ))}
                                {recentUsers.length === 0 && (
                                    <tr><td colSpan={4} style={{ ...td, textAlign: 'center', color: 'var(--admin-text-muted)' }}>No users yet</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                    {/* Mobile cards */}
                    <div className="ru-cards-wrap">
                        {recentUsers.map(u => (
                            <div key={u.id} style={{ padding: '0.85rem 0', borderBottom: '1px solid var(--admin-border)' }}>
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.3rem' }}>
                                    <span style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--admin-text-primary)' }}>{u.name}</span>
                                    <span style={badge}>{u.role}</span>
                                </div>
                                <div style={{ fontSize: '0.8rem', color: 'var(--admin-text-muted)', marginBottom: '0.2rem' }}>{u.email}</div>
                                <div style={{ fontSize: '0.75rem', color: 'var(--admin-text-muted)' }}>{u.created_at}</div>
                            </div>
                        ))}
                        {recentUsers.length === 0 && (
                            <p style={{ textAlign: 'center', color: 'var(--admin-text-muted)', padding: '1rem 0', fontSize: '0.875rem' }}>No users yet</p>
                        )}
                    </div>
                </div>
            </div>

            <style>{`
                .stack > * + * { margin-top: 0.75rem; }
                @media (max-width: 640px) { .charts-row { grid-template-columns: 1fr !important; } }
                .ru-cards-wrap { display: none; }
                @media (max-width: 640px) {
                    .ru-table-wrap { display: none; }
                    .ru-cards-wrap { display: block; }
                }
            `}</style>
        </AppLayout>
    );
}

const card     = { background: 'var(--admin-card)', border: '1px solid var(--admin-border-strong)', borderRadius: 'var(--admin-radius)', padding: '1.25rem 1.5rem', boxShadow: 'var(--admin-shadow)' };
const linkCard = { ...card, display: 'block', textDecoration: 'none', cursor: 'pointer', transition: 'opacity 0.15s' };
const statLabel   = { fontSize: '0.72rem', fontWeight: 600, color: 'var(--admin-text-muted)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '0.25rem' };
const statValue   = { fontSize: '1.6rem', fontWeight: 800, color: 'var(--admin-text-primary)', letterSpacing: '-0.03em', lineHeight: 1.1, marginBottom: '0.2rem' };
const statCaption = { fontSize: '0.75rem', color: 'var(--admin-text-secondary)', marginTop: '0.1rem' };
const cardHeader  = { fontWeight: 700, fontSize: '0.9rem', color: 'var(--admin-text-primary)', marginBottom: '1rem', letterSpacing: '-0.01em' };
const th = { padding: '0.6rem 0.75rem', textAlign: 'left', fontWeight: 600, fontSize: '0.78rem', color: 'var(--admin-text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' };
const td = { padding: '0.65rem 0.75rem', color: 'var(--admin-text-primary)' };
const badge = { padding: '0.2rem 0.6rem', borderRadius: 999, fontSize: '0.72rem', fontWeight: 600, background: 'rgba(59,130,246,0.12)', color: 'var(--admin-accent)', border: '1px solid rgba(59,130,246,0.22)' };
