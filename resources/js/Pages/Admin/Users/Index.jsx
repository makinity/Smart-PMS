import AppLayout from '@/Layouts/AppLayout';
import { Head, router } from '@inertiajs/react';
import { useEffect, useMemo, useState } from 'react';

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

function initialsFor(user) {
    const source = String(user.name || user.employee_id || 'User').trim();
    const parts = source.split(/\s+/).filter(Boolean);
    if (!parts.length) return 'U';

    return parts
        .slice(0, 2)
        .map((part) => part[0]?.toUpperCase() || 'U')
        .join('');
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

function Badge({ children, tone = 'pending', className = '' }) {
    const style =
        STATUS_STYLES[tone] ||
        ROLE_STYLES[tone] ||
        'bg-violet-50 text-violet-700 border-violet-200';

    return (
        <span
            className={`inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs font-semibold ${style} ${className}`}
        >
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
        <label
            className={`flex items-center justify-between rounded-2xl border px-4 py-3 text-sm ${
                disabled ? 'border-slate-200 bg-slate-50 text-slate-400' : 'border-slate-200 bg-white text-slate-700'
            }`}
        >
            <span className="font-medium">{label}</span>
            <input
                type="checkbox"
                className="h-4 w-4 rounded border-slate-300 text-sky-600 focus:ring-sky-500"
                checked={checked}
                onChange={(event) => onChange(event.target.checked)}
                disabled={disabled}
            />
        </label>
    );
}

function MenuItem({ icon, label, tone = 'default', onClick, disabled = false }) {
    const toneClasses =
        tone === 'danger'
            ? 'text-rose-600 hover:bg-rose-50'
            : tone === 'warning'
              ? 'text-amber-700 hover:bg-amber-50'
              : 'text-slate-700 hover:bg-slate-100';

    return (
        <button
            type="button"
            disabled={disabled}
            onClick={onClick}
            className={`flex w-full items-center gap-2 px-3 py-2 text-left text-sm transition disabled:cursor-not-allowed disabled:opacity-50 ${toneClasses}`}
        >
            <span>{icon}</span>
            <span>{label}</span>
        </button>
    );
}

function ActionMenu({
    user,
    open,
    onClose,
    onEdit,
    onSendCode,
    onToggleActive,
    onToggleDisabled,
    protectedAccount,
}) {
    if (!open) return null;

    return (
        <div
            data-user-actions
            className="absolute right-0 top-12 z-20 w-56 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl"
        >
            <MenuItem
                icon={<IconEdit className="h-4 w-4" />}
                label="Edit user"
                onClick={() => {
                    onClose();
                    onEdit();
                }}
            />
            <MenuItem
                icon={<IconMail className="h-4 w-4" />}
                label="Send employee ID"
                disabled={!user.email}
                onClick={() => {
                    onClose();
                    onSendCode();
                }}
            />
            <MenuItem
                icon={<IconShield className="h-4 w-4" />}
                label={user.is_active ? 'Deactivate' : 'Activate'}
                disabled={protectedAccount}
                onClick={() => {
                    onClose();
                    onToggleActive();
                }}
            />
            <MenuItem
                icon={<IconAlert className="h-4 w-4" />}
                tone={user.is_disabled ? 'warning' : 'danger'}
                label={user.is_disabled ? 'Enable access' : 'Disable access'}
                disabled={protectedAccount}
                onClick={() => {
                    onClose();
                    onToggleDisabled();
                }}
            />
        </div>
    );
}

function UserFormModal({
    open,
    mode,
    roles,
    offices,
    value,
    safety,
    onClose,
    onChange,
    onSubmit,
    saving,
}) {
    useEffect(() => {
        if (!open) return undefined;

        const onKeyDown = (event) => {
            if (event.key === 'Escape') onClose();
        };

        document.addEventListener('keydown', onKeyDown);
        return () => document.removeEventListener('keydown', onKeyDown);
    }, [open, onClose]);

    if (!open) return null;

    const isProtected = Boolean(safety?.protected_user_ids?.includes?.(value.id));

    return (
        <div
            className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/40 px-3 py-3 sm:items-center sm:p-6"
            onClick={(event) => {
                if (event.target === event.currentTarget) {
                    onClose();
                }
            }}
        >
            <div className="w-full max-w-3xl overflow-hidden rounded-t-3xl border border-slate-200 bg-white shadow-2xl sm:rounded-3xl">
                <div className="flex items-start justify-between border-b border-slate-200 px-5 py-4">
                    <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-sky-600">
                            {mode === 'create' ? 'Create User' : 'Edit User'}
                        </p>
                        <h3 className="mt-1 text-lg font-semibold text-slate-900">
                            {mode === 'create' ? 'Add account and role' : value.name || 'Update user'}
                        </h3>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="rounded-full border border-slate-200 p-2 text-slate-500 transition hover:border-slate-300 hover:text-slate-700"
                        aria-label="Close dialog"
                    >
                        <IconClose className="h-5 w-5" />
                    </button>
                </div>

                <form
                    onSubmit={onSubmit}
                    className="max-h-[calc(100vh-6rem)] overflow-y-auto px-5 py-5"
                >
                    {isProtected ? (
                        <div className="mb-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                            This account is protected by admin safety rules.
                        </div>
                    ) : null}

                    <div className="grid gap-4 md:grid-cols-2">
                        <Field label="Employee ID">
                            <input
                                value={value.employee_id || ''}
                                onChange={(event) => onChange('employee_id', event.target.value)}
                                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-sky-400 focus:bg-white"
                                placeholder="EMP-2026-00001"
                            />
                        </Field>
                        <Field label="Full Name">
                            <input
                                value={value.name || ''}
                                onChange={(event) => onChange('name', event.target.value)}
                                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-sky-400 focus:bg-white"
                                placeholder="Juan Dela Cruz"
                            />
                        </Field>
                        <Field label="Email">
                            <input
                                value={value.email || ''}
                                onChange={(event) => onChange('email', event.target.value)}
                                type="email"
                                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-sky-400 focus:bg-white"
                                placeholder="name@gmail.com"
                            />
                        </Field>
                        <Field label="Role">
                            <select
                                value={value.role || ''}
                                onChange={(event) => onChange('role', event.target.value)}
                                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-sky-400 focus:bg-white"
                            >
                                {roles.map((role) => {
                                    const key = role.key ?? role.id ?? role.name ?? role;
                                    return (
                                        <option key={key} value={key}>
                                            {role.label ?? role.name ?? role}
                                        </option>
                                    );
                                })}
                            </select>
                        </Field>
                        <Field label="Office">
                            <select
                                value={value.office_id || ''}
                                onChange={(event) => onChange('office_id', event.target.value)}
                                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-sky-400 focus:bg-white"
                            >
                                <option value="">No office assigned</option>
                                {offices.map((office) => {
                                    const key = office.id ?? office.value;
                                    return (
                                        <option key={key} value={key}>
                                            {office.name ?? office.label ?? office.title}
                                        </option>
                                    );
                                })}
                            </select>
                        </Field>
                        <Field label="Position">
                            <input
                                value={value.position || ''}
                                onChange={(event) => onChange('position', event.target.value)}
                                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-sky-400 focus:bg-white"
                                placeholder="Administrative Officer"
                            />
                        </Field>
                    </div>

                    <div className="mt-4 grid gap-3 sm:grid-cols-3">
                        <Toggle
                            label="Active"
                            checked={Boolean(value.is_active)}
                            onChange={(checked) => onChange('is_active', checked)}
                            disabled={Boolean(isProtected)}
                        />
                        <Toggle
                            label="Disabled"
                            checked={Boolean(value.is_disabled)}
                            onChange={(checked) => onChange('is_disabled', checked)}
                            disabled={Boolean(isProtected)}
                        />
                        <Toggle
                            label="Send employee ID"
                            checked={Boolean(value.send_employee_id)}
                            onChange={(checked) => onChange('send_employee_id', checked)}
                        />
                    </div>

                    <div className="mt-5 flex flex-col gap-3 border-t border-slate-200 pt-4 sm:flex-row sm:justify-end">
                        <button
                            type="button"
                            onClick={onClose}
                            className="rounded-2xl border border-slate-200 px-5 py-3 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={saving}
                            className="inline-flex items-center justify-center rounded-2xl bg-sky-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-sky-700 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                            {saving ? 'Saving...' : mode === 'create' ? 'Create User' : 'Save Changes'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

function UserCard({
    user,
    activeMenuId,
    onMenu,
    onEdit,
    onSendCode,
    onToggleActive,
    onToggleDisabled,
    safety,
}) {
    const status = formatStatus(user);
    const role = String(user.role || user.roles?.[0] || 'user').toLowerCase();
    const protectedAccount = Boolean(safety?.protected_user_ids?.includes?.(user.id));
    const assignees = Array.isArray(user.assignments) ? user.assignments : [];

    return (
        <article className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-start gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-sky-50 text-sky-700">
                    <IconUser className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                        <div className="min-w-0">
                            <h3 className="truncate text-base font-semibold text-slate-900">
                                {user.name || user.employee_id}
                            </h3>
                            <p className="mt-1 text-sm text-slate-500">{user.employee_id || 'Employee ID not set'}</p>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                            <Badge tone={status}>{status}</Badge>
                            <Badge tone={role}>{user.role || 'user'}</Badge>
                        </div>
                    </div>
                    <p className="mt-3 text-sm text-slate-600">{user.email || 'No email on file'}</p>
                    <p className="mt-1 text-sm text-slate-500">
                        {user.office?.name || user.office || 'No office'} {user.position ? `- ${user.position}` : ''}
                    </p>
                </div>
            </div>

            <div className="mt-4 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                    <button
                        type="button"
                        onClick={onEdit}
                        className="inline-flex items-center gap-2 rounded-2xl border border-sky-200 bg-sky-50 px-4 py-2 text-sm font-semibold text-sky-700 transition hover:border-sky-300 hover:bg-sky-100"
                    >
                        <IconEdit className="h-4 w-4" />
                        Edit
                    </button>
                    <button
                        type="button"
                        onClick={onSendCode}
                        disabled={!user.email}
                        className="inline-flex items-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-700 transition hover:border-emerald-300 hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        <IconMail className="h-4 w-4" />
                        Send ID
                    </button>
                </div>

                <div className="relative" data-user-actions>
                    <button
                        type="button"
                        onClick={() => onMenu(activeMenuId === user.id ? null : user.id)}
                        className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-200 text-slate-500 transition hover:border-slate-300 hover:bg-slate-50"
                        aria-label="Open actions"
                    >
                        <IconDots className="h-5 w-5" />
                    </button>
                    <ActionMenu
                        user={user}
                        open={activeMenuId === user.id}
                        onClose={() => onMenu(null)}
                        onEdit={onEdit}
                        onSendCode={onSendCode}
                        onToggleActive={onToggleActive}
                        onToggleDisabled={onToggleDisabled}
                        protectedAccount={protectedAccount}
                    />
                </div>
            </div>

            {assignees.length ? (
                <div className="mt-4 flex flex-wrap items-center gap-2">
                    <span className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                        Assignees
                    </span>
                    {assignees.slice(0, 3).map((assignee) => (
                        <span
                            key={assignee.id ?? assignee.employee_id ?? assignee.name}
                            className="inline-flex h-8 items-center rounded-full border border-slate-200 bg-slate-50 px-3 text-xs font-semibold text-slate-600"
                        >
                            {(assignee.initials || initialsFor(assignee)).slice(0, 3)}
                        </span>
                    ))}
                    {assignees.length > 3 ? (
                        <span className="inline-flex h-8 items-center rounded-full border border-slate-200 bg-slate-50 px-3 text-xs font-semibold text-slate-600">
                            +{assignees.length - 3}
                        </span>
                    ) : null}
                </div>
            ) : null}
        </article>
    );
}

function UserTable({
    users,
    activeMenuId,
    onMenu,
    onEdit,
    onSendCode,
    onToggleActive,
    onToggleDisabled,
    safety,
}) {
    return (
        <div className="hidden rounded-3xl border border-slate-200 bg-white shadow-sm lg:block">
            <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-200 text-left">
                    <thead className="bg-slate-50/80">
                        <tr className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                            <th className="px-5 py-4">User</th>
                            <th className="px-5 py-4">Role</th>
                            <th className="px-5 py-4">Office</th>
                            <th className="px-5 py-4">Status</th>
                            <th className="px-5 py-4">Updated</th>
                            <th className="px-5 py-4 text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {users.map((user) => {
                            const status = formatStatus(user);
                            const role = String(user.role || user.roles?.[0] || 'user').toLowerCase();
                            const protectedAccount = Boolean(safety?.protected_user_ids?.includes?.(user.id));

                            return (
                                <tr key={user.id} className="align-top">
                                    <td className="px-5 py-4">
                                        <div className="flex items-start gap-3">
                                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-sky-50 text-sm font-semibold text-sky-700">
                                                {initialsFor(user)}
                                            </div>
                                            <div>
                                                <div className="font-semibold text-slate-900">
                                                    {user.name || 'Unnamed user'}
                                                </div>
                                                <div className="mt-1 text-sm text-slate-500">
                                                    {user.employee_id || 'No employee ID'}
                                                </div>
                                                <div className="mt-1 text-sm text-slate-500">
                                                    {user.email || 'No email'}
                                                </div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-5 py-4">
                                        <Badge tone={role}>{user.role || 'user'}</Badge>
                                    </td>
                                    <td className="px-5 py-4 text-sm text-slate-600">
                                        <div>{user.office?.name || user.office || 'No office'}</div>
                                        {user.position ? <div className="mt-1 text-slate-400">{user.position}</div> : null}
                                    </td>
                                    <td className="px-5 py-4">
                                        <Badge tone={status}>{status}</Badge>
                                    </td>
                                    <td className="px-5 py-4 text-sm text-slate-500">{formatDate(user.updated_at)}</td>
                                    <td className="relative px-5 py-4 text-right">
                                        <div className="inline-flex items-center gap-2">
                                            <button
                                                type="button"
                                                onClick={() => onEdit(user)}
                                                className="rounded-2xl border border-sky-200 bg-sky-50 px-3 py-2 text-sm font-semibold text-sky-700 transition hover:border-sky-300 hover:bg-sky-100"
                                            >
                                                Edit
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => onSendCode(user)}
                                                disabled={!user.email}
                                                className="rounded-2xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-700 transition hover:border-emerald-300 hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-50"
                                            >
                                                Send ID
                                            </button>
                                            <div className="relative" data-user-actions>
                                                <button
                                                    type="button"
                                                    onClick={() => onMenu(activeMenuId === user.id ? null : user.id)}
                                                    className="flex h-10 w-10 items-center justify-center rounded-2xl border border-slate-200 text-slate-500 transition hover:border-slate-300 hover:bg-slate-50"
                                                    aria-label="Open actions"
                                                >
                                                    <IconDots className="h-5 w-5" />
                                                </button>
                                                <ActionMenu
                                                    user={user}
                                                    open={activeMenuId === user.id}
                                                    onClose={() => onMenu(null)}
                                                    onEdit={() => onEdit(user)}
                                                    onSendCode={() => onSendCode(user)}
                                                    onToggleActive={() => onToggleActive(user)}
                                                    onToggleDisabled={() => onToggleDisabled(user)}
                                                    protectedAccount={protectedAccount}
                                                />
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
        <div className="flex flex-wrap items-center gap-2">
            {links.map((link, index) => (
                <button
                    key={`${link.label}-${index}`}
                    type="button"
                    disabled={!link.url}
                    onClick={() => {
                        if (!link.url) return;
                        router.get(link.url, {}, { preserveScroll: true, preserveState: true });
                    }}
                    className={`rounded-2xl border px-4 py-2 text-sm transition ${
                        link.active
                            ? 'border-sky-500 bg-sky-600 text-white'
                            : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50'
                    } disabled:cursor-not-allowed disabled:opacity-50`}
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
            setNotice('This user does not have an email address.');
            return;
        }

        router.post(`/administrator/users/${user.id}/send-code`, {}, {
            preserveScroll: true,
            onSuccess: () => setNotice(`Employee ID sent to ${user.email}.`),
            onError: (errors) => setNotice(firstErrorMessage(errors)),
        });
        setActiveMenuId(null);
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

            <div className="text-slate-900">
                <div className="space-y-4">
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
                        <form
                            onSubmit={submitSearch}
                            style={{ display: 'grid', gap: '0.75rem', gridTemplateColumns: 'minmax(260px, 1.8fr) repeat(3, minmax(140px, 0.8fr)) auto' }}
                        >
                            <label style={fieldWrap}>
                                <span style={fieldLabel}>Search</span>
                                <div style={searchWrap}>
                                    <IconSearch className="h-4 w-4" />
                                    <input
                                        value={query.search}
                                        onChange={(event) => setQuery((current) => ({ ...current, search: event.target.value }))}
                                        placeholder="Name, email, employee ID"
                                        style={inputStyle}
                                    />
                                </div>
                            </label>

                            <label style={fieldWrap}>
                                <span style={fieldLabel}>Role</span>
                                <select
                                    value={query.role}
                                    onChange={(event) => setQuery((current) => ({ ...current, role: event.target.value }))}
                                    style={inputStyle}
                                >
                                    <option value="">All roles</option>
                                    {roleOptions.map((role) => {
                                        const key = role.key ?? role.id ?? role.name ?? role;
                                        return <option key={key} value={key}>{role.label ?? role.name ?? role}</option>;
                                    })}
                                </select>
                            </label>

                            <label style={fieldWrap}>
                                <span style={fieldLabel}>Status</span>
                                <select
                                    value={query.status}
                                    onChange={(event) => setQuery((current) => ({ ...current, status: event.target.value }))}
                                    style={inputStyle}
                                >
                                    <option value="">All statuses</option>
                                    <option value="active">Active</option>
                                    <option value="inactive">Inactive</option>
                                    <option value="disabled">Disabled</option>
                                </select>
                            </label>

                            <label style={fieldWrap}>
                                <span style={fieldLabel}>Office</span>
                                <select
                                    value={query.office}
                                    onChange={(event) => setQuery((current) => ({ ...current, office: event.target.value }))}
                                    style={inputStyle}
                                >
                                    <option value="">All offices</option>
                                    {offices.map((office) => {
                                        const key = office.id ?? office.value;
                                        return <option key={key} value={key}>{office.name ?? office.label ?? office.title}</option>;
                                    })}
                                </select>
                            </label>

                            <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'end' }}>
                                <button type="submit" style={actionPrimary}>Filter</button>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setQuery({ search: '', role: '', status: '', office: '' });
                                        router.get('/administrator/users', {}, { preserveState: false, preserveScroll: true, replace: true });
                                    }}
                                    style={actionSecondary}
                                >
                                    Reset
                                </button>
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
                                />
                                <div className="space-y-4 lg:hidden" style={{ marginTop: '0.75rem' }}>
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
    border: '1px solid var(--admin-border)',
    background: 'rgba(255,255,255,0.96)',
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
    border: '1px solid var(--admin-border)',
    background: 'rgba(255,255,255,0.96)',
    color: 'var(--admin-text-muted)',
};

const actionPrimary = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '0.5rem',
    padding: '0.7rem 1rem',
    borderRadius: 12,
    border: '1px solid rgba(59,130,246,0.35)',
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
    border: '1px solid var(--admin-border)',
    background: 'rgba(255,255,255,0.9)',
    color: 'var(--admin-text-primary)',
    fontSize: '0.875rem',
    fontWeight: 700,
    cursor: 'pointer',
    textDecoration: 'none',
    minHeight: 42,
};
