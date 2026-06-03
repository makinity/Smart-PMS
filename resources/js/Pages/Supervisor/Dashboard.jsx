import AppLayout from '@/Layouts/AppLayout';

const card = { background: 'var(--admin-card)', border: '1px solid var(--admin-border-strong)', borderRadius: 'var(--admin-radius)', padding: '2rem', boxShadow: 'var(--admin-shadow)' };
const iconBox = { width: 48, height: 48, borderRadius: 12, background: 'rgba(59,130,246,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1rem' };
const h = { fontWeight: 700, fontSize: '1.15rem', color: 'var(--admin-text-primary)', marginBottom: '0.4rem' };
const p = { fontSize: '0.9rem', color: 'var(--admin-text-muted)', lineHeight: 1.6, marginBottom: '1rem' };
const badgesStyle = { display: 'flex', gap: '0.5rem', flexWrap: 'wrap' };
const badgeStyle = { padding: '0.25rem 0.75rem', borderRadius: 999, fontSize: '0.75rem', fontWeight: 600, background: 'rgba(59,130,246,0.12)', color: 'var(--admin-accent)', border: '1px solid rgba(59,130,246,0.22)' };

export default function Dashboard() {
    return (
        <AppLayout title="Supervisor Dashboard">
            <div style={card}>
                <div style={iconBox}><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--admin-accent)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg></div>
                <h4 style={h}>Supervisor Dashboard</h4>
                <p style={p}>Use the sidebar to access unit work plans, MPOR, accomplishment review, and team tasks.</p>
                <div style={badgesStyle}>
                        <span style={badgeStyle}>Stage 1</span>
                        <span style={badgeStyle}>Stage 2</span>
                </div>
            </div>
        </AppLayout>
    );
}
