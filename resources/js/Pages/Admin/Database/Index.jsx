import AppLayout from '@/Layouts/AppLayout';

const card = { background: 'var(--admin-card)', border: '1px solid var(--admin-border-strong)', borderRadius: 'var(--admin-radius)', padding: '2rem', boxShadow: 'var(--admin-shadow)' };
const iconBox = { width: 48, height: 48, borderRadius: 12, background: 'rgba(59,130,246,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1rem' };
const h = { fontWeight: 700, fontSize: '1.15rem', color: 'var(--admin-text-primary)', marginBottom: '0.4rem' };
const p = { fontSize: '0.9rem', color: 'var(--admin-text-muted)', lineHeight: 1.6, marginBottom: '1rem' };
const badgesStyle = { display: 'flex', gap: '0.5rem', flexWrap: 'wrap' };
const badgeStyle = { padding: '0.25rem 0.75rem', borderRadius: 999, fontSize: '0.75rem', fontWeight: 600, background: 'rgba(59,130,246,0.12)', color: 'var(--admin-accent)', border: '1px solid rgba(59,130,246,0.22)' };
const notice = { marginTop: '1.5rem', padding: '0.85rem 1rem', borderRadius: 'var(--admin-radius)', background: 'rgba(59,130,246,0.07)', border: '1px solid rgba(59,130,246,0.18)', fontSize: '0.83rem', color: 'var(--admin-text-muted)' };

export default function Index() {
    return (
        <AppLayout title="Database">
            <div style={card}>
                <div style={iconBox}><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--admin-accent)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/></svg></div>
                <h4 style={h}>Database</h4>
                <p style={p}>Administrative database tools — backup, restore, and maintenance utilities.</p>
                        <div style={{badgesStyle}}><span style={{badgeStyle}}>System</span>
                        <span style={{badgeStyle}}>Maintenance</span></div>
                <div style={notice}><i className="bi bi-cone-striped" style={{ marginRight: "0.4rem", color: "var(--admin-accent)" }} /> This section is under construction. Full functionality will be available soon.</div>
            </div>
        </AppLayout>
    );
}

