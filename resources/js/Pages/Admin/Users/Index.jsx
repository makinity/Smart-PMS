import AppLayout from '@/Layouts/AppLayout';
import { Head, router } from '@inertiajs/react';
import { useEffect, useMemo, useState } from 'react';
import { avatarSrc, onAvatarError } from '@/Components/defaultAvatar';
import { useToast } from '@/Components/Snackbar';

const STATUS_STYLES = {
    active: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    inactive: 'bg-amber-50 text-amber-700 border-amber-200',
    disabled: 'bg-rose-50 text-rose-700 border-rose-200',
    pending: 'bg-slate-100 text-slate-600 border-slate-200',
};

const ROLE_STYLES = {
    admin: 'bg-sky-50 text-sky-700 border-sky-200',
    superadmin: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    user: 'bg-violet-50 text-violet-700 border-violet-200',
};

function formatDate(value) {
    if (!value) return 'Not set';

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return String(value);

    return new Intl.DateTimeFormat('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
    }).format(date);
}

function formatStatus(user) {
    if (user.is_disabled) return 'disabled';
    if (user.is_active) return 'active';
    return 'inactive';
}

function firstErrorMessage(errors) {
    if (!errors) return 'Unable to complete the requested action.';
    const values = Object.values(errors).flat().filter(Boolean);
    return values[0] || 'Unable to complete the requested action.';
}

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

function IconUser({ className }) {
    return (
        <Icon className={className}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M20 21a8 8 0 10-16 0" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 13a4 4 0 100-8 4 4 0 000 8z" />
        </Icon>
    );
}

function IconPlus({ className }) {
    return (
        <Icon className={className}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 5v14m-7-7h14" />
        </Icon>
    );
}

function IconSearch({ className }) {
    return (
        <Icon className={className}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35" />
            <circle cx="10.5" cy="10.5" r="6.5" />
        </Icon>
    );
}

function IconMail({ className }) {
    return (
        <Icon className={className}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16v12H4z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="m4 7 8 6 8-6" />
        </Icon>
    );
}

function IconEdit({ className }) {
    return (
        <Icon className={className}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 20h9" />
            <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z"
            />
        </Icon>
    );
}

function IconDots({ className }) {
    return (
        <Icon className={className}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 6h.01M12 12h.01M12 18h.01" />
        </Icon>
    );
}

function IconShield({ className }) {
    return (
        <Icon className={className}>
            <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 3 5 6v6c0 5 3.5 8.5 7 9 3.5-.5 7-4 7-9V6l-7-3z"
            />
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

function IconClose({ className }) {
    return (
        <Icon className={className}>
            <path strokeLinecap="round" strokeLinejoin="round" d="m6 6 12 12M18 6 6 18" />
        </Icon>
    );
}

const BADGE_STYLES = {
    active:      { background: 'rgba(74,222,128,0.15)',  color: '#22c55e',  border: '1px solid rgba(74,222,128,0.3)' },
    inactive:    { background: 'rgba(234,179,8,0.15)',   color: '#ca8a04',  border: '1px solid rgba(234,179,8,0.3)' },
    disabled:    { background: 'rgba(239,68,68,0.15)',   color: '#f87171',  border: '1px solid rgba(239,68,68,0.3)' },
    pending:     { background: 'var(--admin-bg-secondary)', color: 'var(--admin-text-muted)', border: '1px solid var(--admin-border)' },
    admin:       { background: 'rgba(59,130,246,0.15)',  color: 'var(--admin-accent)', border: '1px solid rgba(59,130,246,0.3)' },
    superadmin:  { background: 'rgba(99,102,241,0.15)',  color: '#818cf8',  border: '1px solid rgba(99,102,241,0.3)' },
    supervisor:  { background: 'rgba(168,85,247,0.15)',  color: '#c084fc',  border: '1px solid rgba(168,85,247,0.3)' },
    employee:    { background: 'rgba(20,184,166,0.15)',  color: '#2dd4bf',  border: '1px solid rgba(20,184,166,0.3)' },
    user:        { background: 'rgba(139,92,246,0.15)',  color: '#a78bfa',  border: '1px solid rgba(139,92,246,0.3)' },
};

function Badge({ children, tone = 'pending' }) {
    const st = BADGE_STYLES[tone] ?? BADGE_STYLES.pending;
    return (
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, borderRadius: 999, padding: '0.2rem 0.65rem', fontSize: '0.72rem', fontWeight: 700, whiteSpace: 'nowrap', ...st }}>
            {children}
        </span>
    );
}

function Field({ label, children }) {
    return (
        <label className="block">
            <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                {label}
            </span>
            {children}
        </label>
    );
}

function Toggle({ label, checked, onChange, disabled = false }) {
    return (
        <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderRadius: 12, border: '1px solid var(--admin-border-strong)', padding: '0.75rem 1rem', fontSize: '0.875rem', background: 'var(--admin-bg-secondary)', color: disabled ? 'var(--admin-text-muted)' : 'var(--admin-text-primary)', cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? 0.6 : 1 }}>
            <span style={{ fontWeight: 500 }}>{label}</span>
            <input
                type="checkbox"
                style={{ width: 16, height: 16, accentColor: 'var(--admin-accent)', cursor: disabled ? 'not-allowed' : 'pointer' }}
                checked={checked}
                onChange={(event) => onChange(event.target.checked)}
                disabled={disabled}
            />
        </label>
    );
}

function MenuItem({ icon, label, tone = 'default', onClick, disabled = false }) {
    const color = tone === 'danger' ? '#f87171' : tone === 'warning' ? '#ca8a04' : 'var(--admin-text-secondary)';
    return (
        <button
            type="button"
            disabled={disabled}
            onClick={onClick}
            style={{ display: 'flex', width: '100%', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 0.75rem', background: 'none', border: 'none', cursor: disabled ? 'not-allowed' : 'pointer', color, fontSize: '0.82rem', textAlign: 'left', opacity: disabled ? 0.5 : 1 }}
        >
            <span>{icon}</span>
            <span>{label}</span>
        </button>
    );
}

function Spinner({ size = 14 }) {
    return (
        <>
            <style>{`@keyframes pms-spin { to { transform: rotate(360deg); } }`}</style>
            <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" style={{ animation: 'pms-spin 0.7s linear infinite', flexShrink: 0 }}>
                <path d="M21 12a9 9 0 1 1-6.219-8.56" />
            </svg>
        </>
    );
}

function ActionMenu({ user, open, onClose, onEdit, onSendCode, onToggleActive, onToggleDisabled, protectedAccount, sending }) {
    if (!open) return null;
    return (
        <div
            data-user-actions
            style={{ position: 'absolute', right: 0, top: 48, zIndex: 20, width: 200, borderRadius: 12, border: '1px solid var(--admin-border-strong)', background: 'var(--admin-card)', boxShadow: 'var(--admin-shadow)', overflow: 'hidden', display: 'flex', flexDirection: 'column', padding: '0.25rem' }}
        >
            <MenuItem icon={<IconEdit className="h-4 w-4" />} label="Edit user" onClick={() => { onClose(); onEdit(); }} />
            <MenuItem icon={sending ? <Spinner /> : <IconMail className="h-4 w-4" />} label={sending ? 'Sending…' : 'Send employee ID'} disabled={!user.email || sending} onClick={() => { onClose(); onSendCode(); }} />
            <MenuItem icon={<IconShield className="h-4 w-4" />} label={user.is_active ? 'Deactivate' : 'Activate'} disabled={protectedAccount} onClick={() => { onClose(); onToggleActive(); }} />
            <MenuItem icon={<IconAlert className="h-4 w-4" />} tone={user.is_disabled ? 'warning' : 'danger'} label={user.is_disabled ? 'Enable access' : 'Disable access'} disabled={protectedAccount} onClick={() => { onClose(); onToggleDisabled(); }} />
        </div>
    );
}

function UserFormModal({ open, mode, roles, offices, value, safety, onClose, onChange, onSubmit, saving }) {
    useEffect(() => {
        if (!open) return undefined;
        const onKeyDown = (event) => { if (event.key === 'Escape') onClose(); };
        document.addEventListener('keydown', onKeyDown);
        return () => document.removeEventListener('keydown', onKeyDown);
    }, [open, onClose]);

    if (!open) return null;

    const isProtected = Boolean(safety?.protected_user_ids?.includes?.(value.id));

    return (
        <div
            style={{ position: 'fixed', inset: 0, zIndex: 1200, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.6)', padding: '1rem' }}
            onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
        >
            <div style={{ width: '100%', maxWidth: 720, borderRadius: 'var(--admin-radius-lg)', border: '1px solid var(--admin-border-strong)', background: 'var(--admin-card)', boxShadow: 'var(--admin-shadow)', overflow: 'hidden' }}>
                {/* Header */}
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', borderBottom: '1px solid var(--admin-border)', padding: '1.1rem 1.5rem' }}>
                    <div>
                        <p style={{ fontSize: '0.68rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', color: 'var(--admin-accent)', marginBottom: '0.2rem' }}>
                            {mode === 'create' ? 'Create User' : 'Edit User'}
                        </p>
                        <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--admin-text-primary)' }}>
                            {mode === 'create' ? 'Add account and role' : value.name || 'Update user'}
                        </h3>
                    </div>
                    <button type="button" onClick={onClose} style={{ background: 'none', border: '1px solid var(--admin-border-strong)', borderRadius: 8, padding: '0.4rem', cursor: 'pointer', color: 'var(--admin-text-muted)', display: 'flex', alignItems: 'center' }}>
                        <IconClose className="h-4 w-4" />
                    </button>
                </div>

                <form onSubmit={onSubmit} style={{ maxHeight: 'calc(100vh - 8rem)', overflowY: 'auto', padding: '1.25rem 1.5rem' }}>
                    {isProtected && (
                        <div style={{ marginBottom: '1rem', borderRadius: 10, border: '1px solid rgba(234,179,8,0.3)', background: 'rgba(234,179,8,0.1)', padding: '0.75rem 1rem', fontSize: '0.82rem', color: '#ca8a04' }}>
                            This account is protected by admin safety rules.
                        </div>
                    )}

                    <div style={{ display: 'grid', gap: '1rem', gridTemplateColumns: 'repeat(2, 1fr)' }}>
                        {[
                            { label: 'Employee ID', field: 'employee_id', placeholder: 'EMP-2026-00001' },
                            { label: 'Full Name',   field: 'name',        placeholder: 'Juan Dela Cruz' },
                            { label: 'Email',       field: 'email',       placeholder: 'name@gmail.com', type: 'email' },
                            { label: 'Position',    field: 'position',    placeholder: 'Administrative Officer' },
                        ].map(({ label, field, placeholder, type = 'text' }) => (
                            <label key={field} style={fieldWrap}>
                                <span style={fieldLabel}>{label}</span>
                                <input
                                    value={value[field] || ''}
                                    onChange={(e) => onChange(field, e.target.value)}
                                    type={type}
                                    placeholder={placeholder}
                                    style={inputStyle}
                                />
                            </label>
                        ))}

                        <label style={fieldWrap}>
                            <span style={fieldLabel}>Role</span>
                            <select value={value.role || ''} onChange={(e) => onChange('role', e.target.value)} style={inputStyle}>
                                {roles.map((role) => {
                                    const key = role.key ?? role.id ?? role.name ?? role;
                                    return <option key={key} value={key}>{role.label ?? role.name ?? role}</option>;
                                })}
                            </select>
                        </label>

                        <label style={fieldWrap}>
                            <span style={fieldLabel}>Office</span>
                            <select value={value.office_id || ''} onChange={(e) => onChange('office_id', e.target.value)} style={inputStyle}>
                                <option value="">No office assigned</option>
                                {offices.map((office) => {
                                    const key = office.id ?? office.value;
                                    return <option key={key} value={key}>{office.name ?? office.label ?? office.title}</option>;
                                })}
                            </select>
                        </label>
                    </div>

                    <div style={{ marginTop: '1rem', display: 'grid', gap: '0.75rem', gridTemplateColumns: 'repeat(3, 1fr)' }}>
                        <Toggle label="Active"           checked={Boolean(value.is_active)}         onChange={(v) => onChange('is_active', v)}         disabled={Boolean(isProtected)} />
                        <Toggle label="Disabled"         checked={Boolean(value.is_disabled)}       onChange={(v) => onChange('is_disabled', v)}       disabled={Boolean(isProtected)} />
                        <Toggle label="Send Employee ID" checked={Boolean(value.send_employee_id)}  onChange={(v) => onChange('send_employee_id', v)} />
                    </div>

                    <div style={{ marginTop: '1.25rem', display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', borderTop: '1px solid var(--admin-border)', paddingTop: '1rem' }}>
                        <button type="button" onClick={onClose} style={actionSecondary}>Cancel</button>
                        <button type="submit" disabled={saving} style={{ ...actionPrimary, opacity: saving ? 0.7 : 1 }}>
                            {saving ? 'Saving...' : mode === 'create' ? 'Create User' : 'Save Changes'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

function UserCard({ user, activeMenuId, onMenu, onEdit, onSendCode, onToggleActive, onToggleDisabled, safety, sending }) {
    const status = formatStatus(user);
    const role = String(user.role || user.roles?.[0] || 'user').toLowerCase();
    const protectedAccount = Boolean(safety?.protected_user_ids?.includes?.(user.id));

    return (
        <article style={{ borderRadius: 'var(--admin-radius)', border: '1px solid var(--admin-border-strong)', background: 'var(--admin-card)', padding: '1.1rem', boxShadow: 'var(--admin-shadow)' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
                <img src={avatarSrc(user.avatar)} alt={user.name || 'User'} onError={onAvatarError}
                    style={{ width: 42, height: 42, borderRadius: 12, flexShrink: 0, objectFit: 'cover' }} />
                <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-start', justifyContent: 'space-between', gap: '0.5rem' }}>
                        <div style={{ minWidth: 0 }}>
                            <h3 style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--admin-text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user.name || user.employee_id}</h3>
                            <p style={{ marginTop: '0.15rem', fontSize: '0.78rem', color: 'var(--admin-text-muted)' }}>{user.employee_id || 'No ID'}</p>
                        </div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem' }}>
                            <Badge tone={status}>{status}</Badge>
                            <Badge tone={role}>{role}</Badge>
                        </div>
                    </div>
                    <p style={{ marginTop: '0.5rem', fontSize: '0.82rem', color: 'var(--admin-text-secondary)' }}>{user.email || 'No email'}</p>
                    <p style={{ marginTop: '0.2rem', fontSize: '0.78rem', color: 'var(--admin-text-muted)' }}>{user.office?.name || user.office || 'No office'}{user.position ? ` · ${user.position}` : ''}</p>
                </div>
            </div>

            <div style={{ marginTop: '0.85rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem' }}>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button type="button" onClick={onEdit} style={{ ...actionSecondary, padding: '0.4rem 0.85rem', fontSize: '0.8rem', minHeight: 34 }}>
                        <IconEdit className="h-4 w-4" /> Edit
                    </button>
                    <button type="button" onClick={onSendCode} disabled={!user.email || sending} style={{ ...actionSecondary, padding: '0.4rem 0.85rem', fontSize: '0.8rem', minHeight: 34, opacity: user.email ? (sending ? 0.85 : 1) : 0.45, cursor: sending ? 'default' : 'pointer' }}>
                        {sending ? <Spinner /> : <IconMail className="h-4 w-4" />} {sending ? 'Sending…' : 'Send ID'}
                    </button>
                </div>
                <div style={{ position: 'relative' }} data-user-actions>
                    <button type="button" onClick={() => onMenu(activeMenuId === user.id ? null : user.id)} style={{ width: 36, height: 36, borderRadius: 10, border: '1px solid var(--admin-border-strong)', background: 'none', color: 'var(--admin-text-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                        <IconDots className="h-4 w-4" />
                    </button>
                    <ActionMenu user={user} open={activeMenuId === user.id} onClose={() => onMenu(null)} onEdit={onEdit} onSendCode={onSendCode} onToggleActive={onToggleActive} onToggleDisabled={onToggleDisabled} protectedAccount={protectedAccount} sending={sending} />
                </div>
            </div>
        </article>
    );
}

function UserTable({ users, activeMenuId, onMenu, onEdit, onSendCode, onToggleActive, onToggleDisabled, safety, sendingId }) {
    return (
        <div style={{ borderRadius: 'var(--admin-radius)', border: '1px solid var(--admin-border)', overflow: 'hidden' }} className="lg-table-wrap">
            <style>{`.lg-table-wrap { display: none; } @media (min-width: 1024px) { .lg-table-wrap { display: block; } }`}</style>
            <div style={{ overflowX: 'auto' }}>
                <table style={{ minWidth: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                    <thead style={{ background: 'var(--admin-bg-secondary)' }}>
                        <tr>
                            {['User','Role','Office','Status','Updated','Actions'].map((h, i) => (
                                <th key={h} style={{ padding: '0.75rem 1.25rem', fontSize: '0.68rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--admin-text-muted)', borderBottom: '1px solid var(--admin-border)', textAlign: i === 5 ? 'right' : 'left' }}>{h}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {users.map((user) => {
                            const status = formatStatus(user);
                            const role = String(user.role || user.roles?.[0] || 'user').toLowerCase();
                            const protectedAccount = Boolean(safety?.protected_user_ids?.includes?.(user.id));
                            const sending = sendingId === user.id;
                            return (
                                <tr key={user.id} style={{ borderBottom: '1px solid var(--admin-border)', verticalAlign: 'top' }}>
                                    <td style={{ padding: '0.85rem 1.25rem' }}>
                                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
                                            <img src={avatarSrc(user.avatar)} alt={user.name || 'User'} onError={onAvatarError}
                                                style={{ width: 38, height: 38, borderRadius: 10, flexShrink: 0, objectFit: 'cover' }} />
                                            <div>
                                                <div style={{ fontWeight: 600, color: 'var(--admin-text-primary)', fontSize: '0.875rem' }}>{user.name || 'Unnamed'}</div>
                                                <div style={{ marginTop: '0.15rem', fontSize: '0.78rem', color: 'var(--admin-text-muted)' }}>{user.employee_id || 'No ID'}</div>
                                                <div style={{ marginTop: '0.1rem', fontSize: '0.78rem', color: 'var(--admin-text-muted)' }}>{user.email || 'No email'}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td style={{ padding: '0.85rem 1.25rem' }}><Badge tone={role}>{role}</Badge></td>
                                    <td style={{ padding: '0.85rem 1.25rem', fontSize: '0.82rem', color: 'var(--admin-text-secondary)' }}>
                                        <div>{user.office?.name || user.office || 'No office'}</div>
                                        {user.position && <div style={{ marginTop: '0.1rem', color: 'var(--admin-text-muted)', fontSize: '0.75rem' }}>{user.position}</div>}
                                    </td>
                                    <td style={{ padding: '0.85rem 1.25rem' }}><Badge tone={status}>{status}</Badge></td>
                                    <td style={{ padding: '0.85rem 1.25rem', fontSize: '0.78rem', color: 'var(--admin-text-muted)' }}>{formatDate(user.updated_at)}</td>
                                    <td style={{ padding: '0.85rem 1.25rem', textAlign: 'right' }}>
                                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
                                            <button type="button" onClick={() => onEdit(user)} style={{ ...actionSecondary, padding: '0.35rem 0.75rem', fontSize: '0.78rem', minHeight: 32 }}>Edit</button>
                                            <button type="button" onClick={() => onSendCode(user)} disabled={!user.email || sending} style={{ ...actionSecondary, padding: '0.35rem 0.75rem', fontSize: '0.78rem', minHeight: 32, opacity: user.email ? (sending ? 0.85 : 1) : 0.45, cursor: sending ? 'default' : 'pointer' }}>{sending ? <><Spinner size={13} /> Sending…</> : 'Send ID'}</button>
                                            <div style={{ position: 'relative' }} data-user-actions>
                                                <button type="button" onClick={() => onMenu(activeMenuId === user.id ? null : user.id)} style={{ width: 32, height: 32, borderRadius: 8, border: '1px solid var(--admin-border-strong)', background: 'none', color: 'var(--admin-text-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                                                    <IconDots className="h-4 w-4" />
                                                </button>
                                                <ActionMenu user={user} open={activeMenuId === user.id} onClose={() => onMenu(null)} onEdit={() => onEdit(user)} onSendCode={() => onSendCode(user)} onToggleActive={() => onToggleActive(user)} onToggleDisabled={() => onToggleDisabled(user)} protectedAccount={protectedAccount} sending={sending} />
                                            </div>
                                        </div>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

function Pagination({ links }) {
    if (!links?.length) return null;
    return (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
            {links.map((link, index) => (
                <button
                    key={`${link.label}-${index}`}
                    type="button"
                    disabled={!link.url}
                    onClick={() => { if (!link.url) return; router.get(link.url, {}, { preserveScroll: true, preserveState: true }); }}
                    style={{ borderRadius: 8, border: link.active ? 'none' : '1px solid var(--admin-border-strong)', padding: '0.35rem 0.85rem', fontSize: '0.82rem', cursor: link.url ? 'pointer' : 'not-allowed', background: link.active ? 'var(--admin-accent)' : 'transparent', color: link.active ? '#fff' : 'var(--admin-text-primary)', opacity: !link.url ? 0.45 : 1, fontWeight: link.active ? 700 : 400 }}
                    dangerouslySetInnerHTML={{ __html: link.label }}
                />
            ))}
        </div>
    );
}

export default function Index({
    auth,
    users,
    roles = [],
    offices = [],
    filters = {},
    stats = {},
    safety = {},
    flash = {},
}) {
    const [query, setQuery] = useState({
        search: filters.search || '',
        role: filters.role || '',
        status: filters.status || '',
        office: filters.office || '',
    });
    const [editor, setEditor] = useState(null);
    const [activeMenuId, setActiveMenuId] = useState(null);
    const [saving, setSaving] = useState(false);
    const [sendingId, setSendingId] = useState(null);
    const toast = useToast();
    const [notice, setNotice] = useState(flash.summary || flash.success || '');

    const roleOptions = useMemo(() => {
        if (Array.isArray(roles) && roles.length) return roles;
        return [
            { key: 'user', label: 'User' },
            { key: 'admin', label: 'Admin' },
            { key: 'superadmin', label: 'Super Admin' },
        ];
    }, [roles]);

    const safeUsers = users?.data || [];

    useEffect(() => {
        setNotice(flash.summary || flash.success || '');
    }, [flash.summary, flash.success]);

    useEffect(() => {
        const onPointerDown = (event) => {
            if (!event.target.closest('[data-user-actions]')) {
                setActiveMenuId(null);
            }
        };

        document.addEventListener('mousedown', onPointerDown);
        return () => document.removeEventListener('mousedown', onPointerDown);
    }, []);

    function openCreate() {
        setEditor({
            id: null,
            employee_id: '',
            name: '',
            email: '',
            role: roleOptions[0]?.key ?? roleOptions[0]?.name ?? 'user',
            office_id: '',
            position: '',
            is_active: true,
            is_disabled: false,
            send_employee_id: true,
        });
    }

    function openEdit(user) {
        setEditor({
            id: user.id,
            employee_id: user.employee_id || '',
            name: user.name || '',
            email: user.email || '',
            role: user.role || user.roles?.[0] || 'user',
            office_id: user.office_id || user.office?.id || '',
            position: user.position || '',
            is_active: Boolean(user.is_active),
            is_disabled: Boolean(user.is_disabled),
            send_employee_id: false,
        });
        setActiveMenuId(null);
    }

    function updateEditor(field, value) {
        setEditor((current) => ({ ...current, [field]: value }));
    }

    function closeEditor() {
        setEditor(null);
    }

    function submitEditor(event) {
        event.preventDefault();
        if (!editor) return;

        setSaving(true);

        const payload = {
            employee_id: editor.employee_id,
            name: editor.name,
            email: editor.email,
            role: editor.role,
            office_id: editor.office_id || null,
            position: editor.position || null,
            is_active: editor.is_active,
            is_disabled: editor.is_disabled,
            send_employee_id: editor.send_employee_id,
        };

        const config = {
            preserveScroll: true,
            onFinish: () => setSaving(false),
            onSuccess: () => {
                setEditor(null);
                setNotice(editor.id ? 'User updated.' : 'User created.');
            },
            onError: (errors) => {
                setNotice(firstErrorMessage(errors));
            },
        };

        if (editor.id) {
            router.patch(`/administrator/users/${editor.id}`, payload, config);
            return;
        }

        router.post('/administrator/users', payload, config);
    }

    function submitSearch(event) {
        event.preventDefault();
        router.get(
            '/administrator/users',
            {
                search: query.search || undefined,
                role: query.role || undefined,
                status: query.status || undefined,
                office: query.office || undefined,
            },
            { preserveState: true, preserveScroll: true, replace: true }
        );
    }

    function handleSendCode(user) {
        if (!user?.email) {
            toast('This user does not have an email address.', 'warning');
            return;
        }

        setActiveMenuId(null);
        setSendingId(user.id);
        router.post(`/administrator/users/${user.id}/send-code`, {}, {
            preserveScroll: true,
            onSuccess: () => toast(`Employee ID sent to ${user.email}.`, 'success'),
            onError: (errors) => toast(firstErrorMessage(errors) || 'Failed to send employee ID.', 'error'),
            onFinish: () => setSendingId(null),
        });
    }

    function handleToggleActive(user) {
        const endpoint = user.is_active
            ? `/administrator/users/${user.id}/deactivate`
            : `/administrator/users/${user.id}/activate`;

        router.patch(endpoint, {}, {
            preserveScroll: true,
            onSuccess: () => setNotice(user.is_active ? 'User deactivated.' : 'User activated.'),
            onError: (errors) => setNotice(firstErrorMessage(errors)),
        });
        setActiveMenuId(null);
    }

    function handleToggleDisabled(user) {
        const endpoint = user.is_disabled
            ? `/administrator/users/${user.id}/enable`
            : `/administrator/users/${user.id}/disable`;

        router.patch(endpoint, {}, {
            preserveScroll: true,
            onSuccess: () => setNotice(user.is_disabled ? 'User enabled.' : 'User disabled.'),
            onError: (errors) => setNotice(firstErrorMessage(errors)),
        });
        setActiveMenuId(null);
    }

    const summaryCards = [
        { label: 'Total Users', value: stats.total_users ?? safeUsers.length, tone: 'sky' },
        { label: 'Active', value: stats.active_users ?? safeUsers.filter((user) => user.is_active).length, tone: 'emerald' },
        {
            label: 'Pending Activation',
            value: stats.pending_users ?? safeUsers.filter((user) => !user.is_active && !user.is_disabled).length,
            tone: 'amber',
        },
        {
            label: 'Admins',
            value: stats.admin_users ?? safeUsers.filter((user) => String(user.role || '').toLowerCase().includes('admin')).length,
            tone: 'indigo',
        },
    ];

    const summaryToneClasses = {
        sky: 'text-sky-600',
        emerald: 'text-emerald-600',
        amber: 'text-amber-600',
        indigo: 'text-indigo-600',
    };

    return (
        <AppLayout user={auth?.user} auth={auth}>
            <Head title="Users" />

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    <div style={card}>
                        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
                            <div style={{ minWidth: 0 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                                    <div style={{ ...iconBox, width: 42, height: 42 }}>
                                        <IconUser className="h-5 w-5" />
                                    </div>
                                    <div>
                                        <p style={statLabel}>Admin Directory</p>
                                        <h1 style={{ ...cardHeader, fontSize: '1.6rem', marginBottom: 0 }}>Users</h1>
                                    </div>
                                </div>
                                <p style={{ ...statCaption, marginTop: '0.75rem', maxWidth: 760 }}>
                                    Manage user accounts, issue employee IDs, assign roles, and control access.
                                </p>
                            </div>

                            <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                                <button type="button" onClick={openCreate} style={actionPrimary}>
                                    <IconPlus className="h-4 w-4" />
                                    Add User
                                </button>
                                <a href="/administrator/hris-integration" style={actionSecondary}>
                                    Open HRIS Integration
                                </a>
                            </div>
                        </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.75rem' }}>
                        {summaryCards.map((s) => (
                            <div key={s.label} style={card}>
                                <p style={statLabel}>{s.label}</p>
                                <p style={{ ...statValue, color: `var(--admin-text-primary)` }}>{s.value}</p>
                                <p style={statCaption}>{s.label === 'Pending Activation' ? 'Awaiting activation' : 'Registered accounts'}</p>
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

                    <div style={card}>
                        <p style={cardHeader}>Directory Filters</p>
                        <form onSubmit={submitSearch} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                            {/* Search row */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.6rem 0.85rem', borderRadius: 10, border: '1px solid var(--admin-border-strong)', background: 'var(--admin-bg-secondary)' }}>
                                <IconSearch className="h-4 w-4" style={{ flexShrink: 0, color: 'var(--admin-text-muted)' }} />
                                <input
                                    value={query.search}
                                    onChange={(e) => setQuery(q => ({ ...q, search: e.target.value }))}
                                    placeholder="Name, email, employee ID"
                                    style={{ flex: 1, background: 'none', border: 'none', outline: 'none', color: 'var(--admin-text-primary)', fontSize: '0.875rem' }}
                                />
                            </div>
                            {/* Dropdowns + buttons row */}
                            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'flex-end' }}>
                                {[
                                    { key: 'role',   label: 'Role',   opts: [['', 'All roles'],   ...roleOptions.map(r => [r.key ?? r, r.label ?? r])] },
                                    { key: 'status', label: 'Status', opts: [['', 'All statuses'], ['active','Active'], ['inactive','Inactive'], ['disabled','Disabled']] },
                                    { key: 'office', label: 'Office', opts: [['', 'All offices'],  ...offices.map(o => [o.id ?? o.value, o.name ?? o.label])] },
                                ].map(({ key, label, opts }) => (
                                    <label key={key} style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', minWidth: 130, flex: 1 }}>
                                        <span style={fieldLabel}>{label}</span>
                                        <select value={query[key]} onChange={(e) => setQuery(q => ({ ...q, [key]: e.target.value }))} style={inputStyle}>
                                            {opts.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                                        </select>
                                    </label>
                                ))}
                                <div style={{ display: 'flex', gap: '0.5rem', paddingBottom: 0 }}>
                                    <button type="submit" style={actionPrimary}>Filter</button>
                                    <button type="button" onClick={() => { setQuery({ search: '', role: '', status: '', office: '' }); router.get('/administrator/users', {}, { preserveState: false, preserveScroll: true, replace: true }); }} style={actionSecondary}>Reset</button>
                                </div>
                            </div>
                        </form>
                    </div>

                    <div style={card}>
                        <p style={cardHeader}>User Directory</p>
                        {safeUsers.length ? (
                            <>
                                <UserTable
                                    users={safeUsers}
                                    activeMenuId={activeMenuId}
                                    onMenu={setActiveMenuId}
                                    onEdit={openEdit}
                                    onSendCode={handleSendCode}
                                    onToggleActive={handleToggleActive}
                                    onToggleDisabled={handleToggleDisabled}
                                    safety={safety}
                                    sendingId={sendingId}
                                />
                                <div className="mobile-cards" style={{ marginTop: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                    <style>{`@media (min-width: 1024px) { .mobile-cards { display: none !important; } }`}</style>
                                    {safeUsers.map((user) => (
                                        <UserCard
                                            key={user.id}
                                            user={user}
                                            activeMenuId={activeMenuId}
                                            onMenu={setActiveMenuId}
                                            onEdit={() => openEdit(user)}
                                            onSendCode={() => handleSendCode(user)}
                                            onToggleActive={() => handleToggleActive(user)}
                                            onToggleDisabled={() => handleToggleDisabled(user)}
                                            safety={safety}
                                            sending={sendingId === user.id}
                                        />
                                    ))}
                                </div>
                                <div style={{ marginTop: '1rem' }}>
                                    <Pagination links={users?.links || []} />
                                </div>
                            </>
                        ) : (
                            <div style={{ padding: '1.5rem 0', color: 'var(--admin-text-muted)', fontSize: '0.875rem', textAlign: 'center' }}>
                                No users found.
                            </div>
                        )}
                    </div>
                </div>
            <UserFormModal
                open={Boolean(editor)}
                mode={editor?.id ? 'edit' : 'create'}
                roles={roleOptions}
                offices={offices}
                value={editor || {}}
                safety={safety}
                onClose={closeEditor}
                onChange={updateEditor}
                onSubmit={submitEditor}
                saving={saving}
            />
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
    marginBottom: '1rem',
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

const fieldWrap = {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.35rem',
    minWidth: 0,
};

const fieldLabel = {
    fontSize: '0.72rem',
    fontWeight: 700,
    color: 'var(--admin-text-muted)',
    textTransform: 'uppercase',
    letterSpacing: '0.08em',
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

const searchWrap = {
    display: 'flex',
    alignItems: 'center',
    gap: '0.55rem',
    padding: '0.7rem 0.9rem',
    borderRadius: 12,
    border: '1px solid var(--admin-border-strong)',
    background: 'var(--admin-bg-secondary)',
    color: 'var(--admin-text-muted)',
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
