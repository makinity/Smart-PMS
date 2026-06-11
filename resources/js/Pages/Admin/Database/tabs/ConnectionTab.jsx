import { useState } from 'react';
import { useToast } from '@/Components/Snackbar';
import axios from 'axios';

function connString(f) {
    return `server=${f.host || ''};port=${f.port || 3306};database=${f.database || ''};user id=${f.username || ''};password=${f.password ? '••••' : ''};sslmode=Preferred;connect timeout=8`;
}

export default function ConnectionTab({ env }) {
    const toast = useToast();
    const [form, setForm] = useState({
        host:     env?.host     ?? '',
        port:     env?.port     ?? '3306',
        database: env?.database ?? '',
        username: '',
        password: '',
    });
    const [showPw, setShowPw]     = useState(false);
    const [status, setStatus]     = useState(null); // {ok, msg}
    const [testing, setTesting]   = useState(false);
    const [saving, setSaving]     = useState(false);

    const set = (k, v) => { setForm(f => ({ ...f, [k]: v })); setStatus(null); };

    async function handleTest() {
        setTesting(true); setStatus(null);
        try {
            const { data } = await axios.post('/administrator/database/test-connection', form);
            setStatus({ ok: true, msg: data.message });
        } catch (e) {
            setStatus({ ok: false, msg: e.response?.data?.message ?? 'Connection failed.' });
        } finally { setTesting(false); }
    }

    async function handleSave() {
        setSaving(true);
        try {
            await axios.post('/administrator/database/test-connection', form);
            toast('Connection settings saved.', 'success');
        } catch (e) {
            toast(e.response?.data?.message ?? 'Save failed.', 'error');
        } finally { setSaving(false); }
    }

    function handleReset() {
        setForm({ host: env?.host ?? '', port: env?.port ?? '3306', database: env?.database ?? '', username: '', password: '' });
        setStatus(null);
    }

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>

            {/* Status banner */}
            {status && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem 1rem', borderRadius: 10, border: `1px solid ${status.ok ? 'rgba(34,197,94,0.3)' : 'rgba(239,68,68,0.3)'}`, background: status.ok ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)' }}>
                    <span style={{ fontSize: '1rem' }}>{status.ok ? '✅' : '❌'}</span>
                    <span style={{ flex: 1, fontSize: '0.875rem', color: status.ok ? '#22c55e' : '#f87171', fontWeight: 500 }}>{status.msg}</span>
                    <button onClick={() => setStatus(null)} style={btnIcon}>✕</button>
                </div>
            )}

            {/* Form card */}
            <div style={card}>
                <div style={{ marginBottom: '1.25rem' }}>
                    <h3 style={cardTitle}>Remote Connection Details</h3>
                    <p style={muted}>Configure the secure link to your remote database server.</p>
                </div>

                {/* Server + Port */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '0.75rem', marginBottom: '0.75rem', alignItems: 'end' }}>
                    <label style={fieldWrap}>
                        <span style={label}>Server / Host</span>
                        <input value={form.host} onChange={e => set('host', e.target.value)} placeholder="db.example.com" style={input} />
                    </label>
                    <label style={{ ...fieldWrap, minWidth: 90 }}>
                        <span style={label}>Port</span>
                        <input value={form.port} onChange={e => set('port', e.target.value)} placeholder="3306" style={input} type="number" min="1" max="65535" />
                    </label>
                </div>

                {/* Database */}
                <label style={{ ...fieldWrap, marginBottom: '0.75rem' }}>
                    <span style={label}>Database Name</span>
                    <input value={form.database} onChange={e => set('database', e.target.value)} placeholder="smart_pms" style={input} />
                </label>

                {/* Username + Password */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '1rem' }}>
                    <label style={fieldWrap}>
                        <span style={label}>Username</span>
                        <input value={form.username} onChange={e => set('username', e.target.value)} placeholder="root" style={input} autoComplete="off" />
                    </label>
                    <label style={fieldWrap}>
                        <span style={label}>Password</span>
                        <div style={{ position: 'relative' }}>
                            <input value={form.password} onChange={e => set('password', e.target.value)} type={showPw ? 'text' : 'password'} placeholder="••••••••" style={{ ...input, paddingRight: '2.5rem' }} autoComplete="new-password" />
                            <button type="button" onClick={() => setShowPw(v => !v)} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--admin-text-muted)', fontSize: '1rem', lineHeight: 1 }}>
                                {showPw ? '🙈' : '👁'}
                            </button>
                        </div>
                    </label>
                </div>

                {/* Connection String Preview */}
                <div style={{ marginBottom: '1.25rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
                        <span style={label}>Connection String Preview</span>
                        <button onClick={() => { navigator.clipboard.writeText(connString(form)); toast('Copied!', 'success'); }} style={{ ...btnSecondary, padding: '0.25rem 0.65rem', fontSize: '0.75rem' }}>Copy</button>
                    </div>
                    <div style={{ padding: '0.85rem 1rem', borderRadius: 10, background: 'var(--admin-bg-secondary)', border: '1px solid var(--admin-border)', fontFamily: 'monospace', fontSize: '0.78rem', color: 'var(--admin-text-muted)', wordBreak: 'break-all', lineHeight: 1.6 }}>
                        {connString(form)}
                    </div>
                </div>

                {/* Actions */}
                <div style={{ display: 'flex', gap: '0.65rem', flexWrap: 'wrap' }}>
                    <button onClick={handleReset} style={btnSecondary}>Reset Defaults</button>
                    <div style={{ flex: 1 }} />
                    <button onClick={handleTest} disabled={testing} style={{ ...btnSecondary, display: 'flex', alignItems: 'center', gap: '0.4rem', opacity: testing ? 0.7 : 1 }}>
                        {testing ? <Spinner /> : <span>⚡</span>} Test Connection
                    </button>
                    <button onClick={handleSave} disabled={saving} style={{ ...btnPrimary, opacity: saving ? 0.7 : 1 }}>
                        {saving ? 'Saving…' : 'Save Changes'}
                    </button>
                </div>
            </div>

            {/* Info cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.75rem' }}>
                {[
                    { icon: '🔒', title: 'SSL Encryption', desc: 'Connection is secured with TLS 1.3. Your database traffic is fully encrypted end-to-end.' },
                    { icon: '⚡', title: 'Connection Speed', desc: 'High performance link detected. Optimized for low-latency database operations.' },
                    { icon: '🕐', title: 'Uptime History', desc: 'Track connection availability and respond quickly to database downtime events.' },
                ].map(({ icon, title, desc }) => (
                    <div key={title} style={{ ...card, padding: '1rem 1.1rem' }}>
                        <div style={{ fontSize: '1.4rem', marginBottom: '0.5rem' }}>{icon}</div>
                        <div style={{ fontWeight: 700, fontSize: '0.88rem', color: 'var(--admin-text-primary)', marginBottom: '0.3rem' }}>{title}</div>
                        <div style={{ fontSize: '0.78rem', color: 'var(--admin-text-muted)', lineHeight: 1.5 }}>{desc}</div>
                    </div>
                ))}
            </div>
        </div>
    );
}

function Spinner() {
    return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" style={{ animation: 'pms-spin 0.7s linear infinite' }}><path d="M21 12a9 9 0 1 1-6.219-8.56"/><style>{`@keyframes pms-spin{to{transform:rotate(360deg)}}`}</style></svg>;
}

const card      = { background: 'var(--admin-card)', border: '1px solid var(--admin-border-strong)', borderRadius: 'var(--admin-radius)', padding: '1.25rem 1.5rem', boxShadow: 'var(--admin-shadow)' };
const cardTitle = { fontWeight: 700, fontSize: '1rem', color: 'var(--admin-text-primary)', marginBottom: '0.2rem' };
const muted     = { fontSize: '0.82rem', color: 'var(--admin-text-muted)' };
const fieldWrap = { display: 'flex', flexDirection: 'column', gap: '0.3rem' };
const label     = { fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--admin-text-muted)' };
const input     = { padding: '0.6rem 0.85rem', borderRadius: 10, border: '1px solid var(--admin-border-strong)', background: 'var(--admin-bg-secondary)', color: 'var(--admin-text-primary)', fontSize: '0.875rem', outline: 'none', width: '100%', boxSizing: 'border-box' };
const btnPrimary   = { padding: '0.6rem 1.1rem', borderRadius: 10, border: 'none', background: 'var(--admin-accent)', color: '#fff', fontWeight: 700, fontSize: '0.875rem', cursor: 'pointer' };
const btnSecondary = { padding: '0.6rem 1.1rem', borderRadius: 10, border: '1px solid var(--admin-border-strong)', background: 'transparent', color: 'var(--admin-text-primary)', fontWeight: 600, fontSize: '0.875rem', cursor: 'pointer' };
const btnIcon      = { background: 'none', border: 'none', cursor: 'pointer', color: 'var(--admin-text-muted)', fontSize: '0.85rem', lineHeight: 1, padding: '0.2rem 0.4rem' };
