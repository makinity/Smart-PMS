import AppLayout from '@/Layouts/AppLayout';
import { Head, router } from '@inertiajs/react';
import { useEffect, useState } from 'react';

function Icon({ children, className = 'h-4 w-4' }) {
    return (
        <svg
            aria-hidden="true"
            className={className}
            width="24"
            height="24"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth="1.8"
            style={{ flexShrink: 0 }}
        >
            {children}
        </svg>
    );
}

function IconSync({ className }) {
    return (
        <Icon className={className}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M16 3h5v5" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M8 21H3v-5" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M20 8a8 8 0 0 0-13-5" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 16a8 8 0 0 0 13 5" />
        </Icon>
    );
}

function IconAlert({ className }) {
    return (
        <Icon className={className}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v4m0 4h.01" />
            <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M10.29 4.86 1.82 19a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 4.86a2 2 0 0 0-3.42 0z"
            />
        </Icon>
    );
}

function IconArrowLeft({ className }) {
    return (
        <Icon className={className}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 12H5" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 19l-7-7 7-7" />
        </Icon>
    );
}

function IconBadge({ children, className = '', size = 56, tone = 'bg-sky-50', iconClassName = 'h-6 w-6' }) {
    return (
        <div
            className={`inline-flex items-center justify-center rounded-2xl ${tone} ${className}`}
            style={{ width: size, height: size }}
        >
            {children(iconClassName)}
        </div>
    );
}

function StatCard({ label, value, tone = 'sky' }) {
    const toneClasses = {
        sky: 'text-sky-700 bg-sky-50 border-sky-200',
        emerald: 'text-emerald-700 bg-emerald-50 border-emerald-200',
        amber: 'text-amber-700 bg-amber-50 border-amber-200',
        rose: 'text-rose-700 bg-rose-50 border-rose-200',
    };

    return (
        <div className={`rounded-3xl border px-5 py-4 ${toneClasses[tone] || toneClasses.sky}`}>
            <div className="text-xs font-semibold uppercase tracking-[0.16em] opacity-70">{label}</div>
            <div className="mt-2 text-3xl font-bold">{value}</div>
        </div>
    );
}

function Field({ label, children, hint }) {
    return (
        <label className="block">
            <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                {label}
            </span>
            {children}
            {hint ? <span className="mt-2 block text-xs text-slate-500">{hint}</span> : null}
        </label>
    );
}

export default function Index({ auth, flash = {}, sync = {}, defaults = {} }) {
    const [form, setForm] = useState({
        base_url: defaults.base_url || '',
        token: '',
    });
    const [loading, setLoading] = useState(false);
    const [notice, setNotice] = useState(flash.summary || flash.success || '');

    useEffect(() => {
        setNotice(flash.summary || flash.success || '');
    }, [flash.summary, flash.success]);

    function submit(event) {
        event.preventDefault();
        setLoading(true);

        router.post('/administrator/hris/sync', form, {
            preserveScroll: true,
            onFinish: () => setLoading(false),
            onSuccess: () => {
                setNotice('HRIS sync completed.');
            },
            onError: (errors) => {
                const messages = Object.values(errors || {}).flat().filter(Boolean);
                setNotice(messages[0] || 'Unable to complete HRIS sync.');
            },
        });
    }

    const stats = [
        { label: 'Imported', value: sync.imported_count ?? sync.imported ?? 0, tone: 'sky' },
        { label: 'Updated', value: sync.updated_count ?? sync.updated ?? 0, tone: 'emerald' },
        { label: 'Sent IDs', value: sync.messaged_count ?? sync.sent_codes ?? 0, tone: 'amber' },
        { label: 'Failures', value: sync.failed_count ?? sync.failed ?? 0, tone: 'rose' },
    ];

    const failures = Array.isArray(sync.failures) ? sync.failures : [];

    return (
        <AppLayout title="HRIS Integration">
            <Head title="HRIS Integration" />

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    <div style={card}>
                        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
                            <div style={{ minWidth: 0 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                                    <div style={{ ...iconBox, width: 42, height: 42 }}>
                                        <IconSync className="h-5 w-5" />
                                    </div>
                                    <div>
                                        <p style={statLabel}>Admin Integration</p>
                                        <h1 style={{ ...cardHeader, fontSize: '1.6rem', marginBottom: 0 }}>HRIS Integration</h1>
                                    </div>
                                </div>
                                <p style={{ ...statCaption, marginTop: '0.75rem', maxWidth: 760 }}>
                                    Sync employee records from HRIS, create or update users, and issue employee IDs for activation.
                                </p>
                            </div>

                            <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                                <a href="/administrator/users" style={actionSecondary}>
                                    <IconArrowLeft className="h-4 w-4" />
                                    Back to Users
                                </a>
                            </div>
                        </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.75rem' }}>
                        {stats.map((s) => (
                            <div key={s.label} style={card}>
                                <p style={statLabel}>{s.label}</p>
                                <p style={{ ...statValue, color: 'var(--admin-text-primary)' }}>{s.value}</p>
                                <p style={statCaption}>HRIS sync result</p>
                            </div>
                        ))}
                    </div>

                    {notice ? (
                        <div style={card}>
                            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
                                <div style={{ ...iconBox, width: 34, height: 34 }}>
                                    <IconAlert className="h-4 w-4" />
                                </div>
                                <div>
                                    <p style={cardHeader}>System Notice</p>
                                    <p style={statCaption}>{notice}</p>
                                </div>
                            </div>
                        </div>
                    ) : null}

                    <style>{`.hris-grid { display: grid; grid-template-columns: 1.35fr 0.95fr; gap: 0.75rem; } @media (max-width: 767px) { .hris-grid { grid-template-columns: 1fr; } }`}</style>
                    <div style={{ gap: '0.75rem' }} className="hris-grid">
                        <form onSubmit={submit} style={card}>
                            <p style={cardHeader}>Connection Settings</p>
                            <p style={statCaption}>Use the HRIS endpoint and access token for admin-driven syncs.</p>

                            <div style={{ marginTop: '1rem', display: 'grid', gap: '0.9rem' }}>
                                <Field label="Base URL" hint="Example: https://hris.example.gov/api">
                                    <input
                                        value={form.base_url}
                                        onChange={(event) => setForm((current) => ({ ...current, base_url: event.target.value }))}
                                        type="url"
                                        placeholder="https://hris.example.gov/api"
                                        style={inputStyle}
                                    />
                                </Field>

                                <Field label="Access Token" hint="Keep this token confidential. It is used only for the sync request.">
                                    <input
                                        value={form.token}
                                        onChange={(event) => setForm((current) => ({ ...current, token: event.target.value }))}
                                        type="password"
                                        placeholder="Paste token"
                                        style={inputStyle}
                                    />
                                </Field>

                                <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                                    <a href="/administrator/users" style={actionSecondary}>Cancel</a>
                                    <button type="submit" disabled={loading} style={actionPrimary}>
                                        {loading ? 'Syncing...' : 'Run Sync'}
                                    </button>
                                </div>
                            </div>
                        </form>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                            <div style={card}>
                                <p style={cardHeader}>How it works</p>
                                <ul style={{ listStyle: 'none', display: 'grid', gap: '0.6rem', color: 'var(--admin-text-secondary)', fontSize: '0.875rem', lineHeight: 1.6 }}>
                                    <li>1. Fetch employee records from the HRIS endpoint.</li>
                                    <li>2. Create or update admin portal user accounts.</li>
                                    <li>3. Issue employee IDs to newly created accounts via email.</li>
                                    <li>4. Log every sync result for audit review.</li>
                                </ul>
                            </div>

                            <div style={card}>
                                <p style={cardHeader}>Safety Note</p>
                                <p style={statCaption}>
                                    Keep at least one active admin account available before demoting or disabling other administrators.
                                </p>
                            </div>

                            {failures.length ? (
                                <div style={card}>
                                    <p style={cardHeader}>Sync Failures</p>
                                    <div style={{ display: 'grid', gap: '0.65rem' }}>
                                        {failures.map((failure, index) => (
                                            <div key={`${failure.employee_id || failure.email || index}`} style={{ padding: '0.85rem 0.95rem', borderRadius: 12, border: '1px solid var(--admin-border)', background: 'var(--admin-bg-secondary)' }}>
                                                <div style={{ fontWeight: 700, color: 'var(--admin-text-primary)', fontSize: '0.875rem' }}>
                                                    {failure.name || failure.employee_id || `Record ${index + 1}`}
                                                </div>
                                                <div style={{ marginTop: '0.2rem', color: 'var(--admin-text-secondary)', fontSize: '0.8rem' }}>
                                                    {failure.reason || failure.message || 'Unable to import record.'}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ) : null}
                        </div>
                    </div>
            </div>
        </AppLayout>
    );
}

const card = {
    background: 'var(--admin-card)',
    border: '1px solid var(--admin-border-strong)',
    borderRadius: 'var(--admin-radius)',
    padding: '1.25rem 1.5rem',
    boxShadow: 'var(--admin-shadow)',
};

const statLabel = {
    fontSize: '0.72rem',
    fontWeight: 600,
    color: 'var(--admin-text-muted)',
    letterSpacing: '0.08em',
    textTransform: 'uppercase',
    marginBottom: '0.25rem',
};

const statValue = {
    fontSize: '1.6rem',
    fontWeight: 800,
    color: 'var(--admin-text-primary)',
    letterSpacing: '-0.03em',
    lineHeight: 1.1,
    marginBottom: '0.2rem',
};

const statCaption = {
    fontSize: '0.75rem',
    color: 'var(--admin-text-secondary)',
    marginTop: '0.1rem',
};

const cardHeader = {
    fontWeight: 700,
    fontSize: '0.9rem',
    color: 'var(--admin-text-primary)',
    marginBottom: '0.75rem',
    letterSpacing: '-0.01em',
};

const iconBox = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: 34,
    height: 34,
    borderRadius: 10,
    border: '1px solid var(--admin-border)',
    background: 'rgba(59,130,246,0.08)',
    color: 'var(--admin-accent)',
    flexShrink: 0,
};

const inputStyle = {
    width: '100%',
    boxSizing: 'border-box',
    padding: '0.7rem 0.9rem',
    borderRadius: 12,
    border: '1px solid var(--admin-border-strong)',
    background: 'var(--admin-bg-secondary)',
    color: 'var(--admin-text-primary)',
    fontSize: '0.875rem',
    outline: 'none',
};

const actionPrimary = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '0.5rem',
    padding: '0.7rem 1rem',
    borderRadius: 12,
    border: 'none',
    background: 'var(--admin-accent)',
    color: '#fff',
    fontSize: '0.875rem',
    fontWeight: 700,
    cursor: 'pointer',
    textDecoration: 'none',
    minHeight: 42,
};

const actionSecondary = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '0.5rem',
    padding: '0.7rem 1rem',
    borderRadius: 12,
    border: '1px solid var(--admin-border-strong)',
    background: 'transparent',
    color: 'var(--admin-text-primary)',
    fontSize: '0.875rem',
    fontWeight: 700,
    cursor: 'pointer',
    textDecoration: 'none',
    minHeight: 42,
};
