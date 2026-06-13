import { useEffect, useState } from 'react';
import { router, useForm, usePage } from '@inertiajs/react';
import { avatarSrc as resolveAvatar, onAvatarError } from '@/Components/defaultAvatar';

const pageCard = {
    background: 'var(--admin-card)',
    border: '1px solid var(--admin-border-strong)',
    borderRadius: 'var(--admin-radius-lg)',
    boxShadow: 'var(--admin-shadow)',
};

const panel = {
    ...pageCard,
    padding: '1.25rem',
};

const sectionTitle = {
    fontSize: '1rem',
    fontWeight: 700,
    color: 'var(--admin-text-primary)',
    marginBottom: '0.35rem',
    letterSpacing: '-0.01em',
};

const sectionDesc = {
    fontSize: '0.88rem',
    lineHeight: 1.6,
    color: 'var(--admin-text-muted)',
};

const label = {
    display: 'block',
    fontSize: '0.72rem',
    fontWeight: 700,
    textTransform: 'uppercase',
    letterSpacing: '0.08em',
    color: 'var(--admin-text-muted)',
    marginBottom: '0.45rem',
};

const input = {
    width: '100%',
    border: '1px solid var(--admin-border)',
    borderRadius: 12,
    background: 'rgba(255,255,255,0.02)',
    color: 'var(--admin-text-primary)',
    padding: '0.85rem 0.95rem',
    fontSize: '0.92rem',
    outline: 'none',
    transition: 'border-color 0.15s, box-shadow 0.15s',
};

const inputFocus = {
    borderColor: 'rgba(59,130,246,0.45)',
    boxShadow: '0 0 0 3px rgba(59,130,246,0.12)',
};

const actionButton = {
    border: '1px solid rgba(59,130,246,0.3)',
    background: 'rgba(59,130,246,0.12)',
    color: 'var(--admin-accent)',
    borderRadius: 12,
    padding: '0.8rem 1rem',
    fontWeight: 700,
    fontSize: '0.9rem',
    cursor: 'pointer',
    transition: 'transform 0.15s ease, background 0.15s ease',
};

const primaryButton = {
    ...actionButton,
    background: 'var(--admin-accent)',
    color: '#fff',
    borderColor: 'transparent',
};

const mutedButton = {
    ...actionButton,
    background: 'transparent',
    color: 'var(--admin-text-secondary)',
};

const chipBase = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '0.35rem',
    padding: '0.28rem 0.75rem',
    borderRadius: 999,
    fontSize: '0.74rem',
    fontWeight: 700,
    border: '1px solid transparent',
};

function formatRole(role) {
    if (!role) return 'User';
    return String(role)
        .replace(/[-_]/g, ' ')
        .split(' ')
        .map((part) => part ? part[0].toUpperCase() + part.slice(1) : part)
        .join(' ');
}

function Field({ labelText, error, hint, children }) {
    return (
        <div style={{ marginBottom: '1rem' }}>
            <div style={label}>{labelText}</div>
            {children}
            {hint && !error && (
                <div style={{ marginTop: '0.45rem', fontSize: '0.78rem', color: 'var(--admin-text-muted)', lineHeight: 1.5 }}>
                    {hint}
                </div>
            )}
            {error && (
                <div style={{ marginTop: '0.45rem', fontSize: '0.8rem', color: '#f87171' }}>
                    {error}
                </div>
            )}
        </div>
    );
}

function StatusChip({ user }) {
    if (user?.is_disabled) {
        return <span style={{ ...chipBase, background: 'rgba(239,68,68,0.12)', color: '#fca5a5', borderColor: 'rgba(239,68,68,0.22)' }}>Disabled</span>;
    }

    if (user?.is_active) {
        return <span style={{ ...chipBase, background: 'rgba(34,197,94,0.12)', color: '#86efac', borderColor: 'rgba(34,197,94,0.2)' }}>Active</span>;
    }

    return <span style={{ ...chipBase, background: 'rgba(59,130,246,0.12)', color: 'var(--admin-accent)', borderColor: 'rgba(59,130,246,0.22)' }}>Pending activation</span>;
}

function ReadOnlyItem({ labelText, value }) {
    return (
        <div style={{ padding: '0.85rem 0.95rem', borderRadius: 12, border: '1px solid var(--admin-border)', background: 'rgba(59,130,246,0.05)' }}>
            <div style={{ fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--admin-text-muted)', marginBottom: '0.25rem', fontWeight: 700 }}>{labelText}</div>
            <div style={{ fontSize: '0.92rem', color: 'var(--admin-text-primary)', fontWeight: 600, lineHeight: 1.4 }}>
                {value || <span style={{ color: 'var(--admin-text-muted)', fontWeight: 500 }}>Not assigned</span>}
            </div>
        </div>
    );
}

export default function ProfileSettings({ description }) {
    const { auth } = usePage().props;
    const user = auth?.user ?? {};
    const roleLabel = formatRole(user.role || user.roles?.[0] || 'User');

    const [photoPreview, setPhotoPreview] = useState(null);

    const profileForm = useForm({
        name: user.name ?? '',
        email: user.email ?? '',
        profile_photo: null,
    });

    const passwordForm = useForm({
        current_password: '',
        password: '',
        password_confirmation: '',
    });

    useEffect(() => {
        if (!profileForm.data.profile_photo) {
            setPhotoPreview(null);
            return undefined;
        }

        const objectUrl = URL.createObjectURL(profileForm.data.profile_photo);
        setPhotoPreview(objectUrl);

        return () => URL.revokeObjectURL(objectUrl);
    }, [profileForm.data.profile_photo]);

    const avatarSrc = resolveAvatar(photoPreview, user.profile_photo_url);

    const [profileProcessing, setProfileProcessing] = useState(false);
    const [profileSuccess, setProfileSuccess] = useState(false);
    const [profileErrors, setProfileErrors] = useState({});

    const submitProfile = (e) => {
        e.preventDefault();
        setProfileProcessing(true);
        setProfileErrors({});

        const formData = new FormData();
        formData.append('_method', 'PUT');
        formData.append('name', profileForm.data.name);
        formData.append('email', profileForm.data.email);
        if (profileForm.data.profile_photo) {
            formData.append('profile_photo', profileForm.data.profile_photo);
        }

        router.post('/user/profile-information', formData, {
            preserveScroll: true,
            onSuccess: () => {
                profileForm.reset('profile_photo');
                setPhotoPreview(null);
                setProfileSuccess(true);
                setTimeout(() => setProfileSuccess(false), 3000);
            },
            onError: (errors) => setProfileErrors(errors),
            onFinish: () => setProfileProcessing(false),
        });
    };

    const submitPassword = (e) => {
        e.preventDefault();

        passwordForm.put('/user/password', {
            preserveScroll: true,
            onSuccess: () => passwordForm.reset(),
        });
    };

    const displayName = user.name || 'Unnamed account';
    const officeName = user.office_name || user.office?.name;

    return (
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(280px, 340px) minmax(0, 1fr)', gap: '1rem' }} className="profile-layout">
            <div style={{ display: 'grid', gap: '1rem' }}>
                <section style={{ ...panel, padding: '1.5rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.95rem', marginBottom: '1.25rem' }}>
                        <div style={{
                            width: 78,
                            height: 78,
                            borderRadius: 18,
                            overflow: 'hidden',
                            background: 'rgba(59,130,246,0.12)',
                            border: '1px solid rgba(59,130,246,0.22)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0,
                        }}>
                            <img src={avatarSrc} alt={displayName} onError={onAvatarError} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        </div>

                        <div style={{ minWidth: 0 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '0.3rem' }}>
                                <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--admin-text-primary)', letterSpacing: '-0.03em', lineHeight: 1.15 }}>
                                    {displayName}
                                </h2>
                                <StatusChip user={user} />
                            </div>
                            <div style={{ fontSize: '0.88rem', color: 'var(--admin-text-secondary)', marginBottom: '0.25rem' }}>
                                {roleLabel}
                            </div>
                            <div style={{ fontSize: '0.84rem', color: 'var(--admin-text-muted)', lineHeight: 1.5 }}>
                                {description ?? 'View and update your personal account details and security settings.'}
                            </div>
                        </div>
                    </div>

                    <div style={{ display: 'grid', gap: '0.75rem' }}>
                        <ReadOnlyItem labelText="Employee ID" value={user.employee_id} />
                        <ReadOnlyItem labelText="Email" value={user.email} />
                        <ReadOnlyItem labelText="Office" value={officeName} />
                        <ReadOnlyItem labelText="Position" value={user.position} />
                    </div>
                </section>

                <section style={panel}>
                    <div style={sectionTitle}>Account notes</div>
                    <div style={sectionDesc}>
                        Your employee ID is used for account activation and identity checks. Keep your email current so you can receive system notifications and reset links.
                    </div>
                    <div style={{
                        marginTop: '1rem',
                        padding: '0.95rem 1rem',
                        borderRadius: 14,
                        border: '1px solid rgba(59,130,246,0.18)',
                        background: 'rgba(59,130,246,0.06)',
                        color: 'var(--admin-text-secondary)',
                        fontSize: '0.84rem',
                        lineHeight: 1.6,
                    }}>
                        Profile changes update only your own account. Role, office, and access control are managed separately by administrators.
                    </div>
                </section>
            </div>

            <div style={{ display: 'grid', gap: '1rem', minWidth: 0 }}>
                <section style={panel}>
                    <div style={sectionTitle}>Edit Profile</div>
                    <div style={{ ...sectionDesc, marginBottom: '1.25rem' }}>
                        Update your display name, email address, and profile photo.
                    </div>

                    <form onSubmit={submitProfile}>
                        <div style={{ display: 'grid', gridTemplateColumns: '1.3fr 1fr', gap: '1rem' }} className="profile-edit-grid">
                            <div>
                                <Field labelText="Display Name" error={profileErrors.name}>
                                    <input
                                        type="text"
                                        value={profileForm.data.name}
                                        onChange={(e) => profileForm.setData('name', e.target.value)}
                                        style={input}
                                        onFocus={(e) => Object.assign(e.target.style, inputFocus)}
                                        onBlur={(e) => {
                                            e.target.style.borderColor = 'var(--admin-border)';
                                            e.target.style.boxShadow = 'none';
                                        }}
                                        autoComplete="name"
                                    />
                                </Field>

                                <Field labelText="Email Address" error={profileErrors.email} hint="Use a valid address where you can receive account notices.">
                                    <input
                                        type="email"
                                        value={profileForm.data.email}
                                        onChange={(e) => profileForm.setData('email', e.target.value)}
                                        style={input}
                                        onFocus={(e) => Object.assign(e.target.style, inputFocus)}
                                        onBlur={(e) => {
                                            e.target.style.borderColor = 'var(--admin-border)';
                                            e.target.style.boxShadow = 'none';
                                        }}
                                        autoComplete="email"
                                    />
                                </Field>

                                <Field labelText="Profile Photo" error={profileErrors.profile_photo} hint="PNG, JPG, or WEBP up to 2 MB.">
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', flexWrap: 'wrap' }}>
                                        <label style={{ ...actionButton, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
                                            <input
                                                type="file"
                                                accept="image/*"
                                                onChange={(e) => profileForm.setData('profile_photo', e.target.files?.[0] ?? null)}
                                                style={{ display: 'none' }}
                                            />
                                            Choose Photo
                                        </label>
                                        <div style={{ fontSize: '0.82rem', color: 'var(--admin-text-muted)' }}>
                                            {profileForm.data.profile_photo ? profileForm.data.profile_photo.name : 'No new file selected'}
                                        </div>
                                    </div>
                                </Field>
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.9rem' }}>
                                <div style={{
                                    borderRadius: 18,
                                    border: '1px solid var(--admin-border)',
                                    background: 'rgba(59,130,246,0.06)',
                                    padding: '1rem',
                                }}>
                                    <div style={{ fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--admin-text-muted)', marginBottom: '0.55rem', fontWeight: 700 }}>
                                        Preview
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                                        <div style={{
                                            width: 64,
                                            height: 64,
                                            borderRadius: '50%',
                                            overflow: 'hidden',
                                            border: '2px solid rgba(59,130,246,0.28)',
                                            background: 'rgba(59,130,246,0.12)',
                                            flexShrink: 0,
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                        }}>
                                            <img src={avatarSrc} alt={displayName} onError={onAvatarError} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                        </div>
                                        <div>
                                            <div style={{ fontWeight: 700, color: 'var(--admin-text-primary)', marginBottom: '0.2rem' }}>{displayName}</div>
                                            <div style={{ fontSize: '0.82rem', color: 'var(--admin-text-muted)', lineHeight: 1.5 }}>
                                                The image is shown immediately before saving.
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div style={{
                                    display: 'grid',
                                    gap: '0.75rem',
                                    gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
                                }}>
                                    <ReadOnlyItem labelText="Employee ID" value={user.employee_id} />
                                    <ReadOnlyItem labelText="Role" value={roleLabel} />
                                    <ReadOnlyItem labelText="Office" value={officeName} />
                                    <ReadOnlyItem labelText="Position" value={user.position} />
                                </div>
                            </div>
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', flexWrap: 'wrap', marginTop: '1.25rem', paddingTop: '1rem', borderTop: '1px solid var(--admin-border)' }}>
                            <div style={{ fontSize: '0.82rem', color: 'var(--admin-text-muted)' }}>
                                Changes are saved only after you click Update Profile.
                            </div>
                            <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                                <button
                                    type="button"
                                    onClick={() => {
                                        profileForm.setData('name', user.name ?? '');
                                        profileForm.setData('email', user.email ?? '');
                                        profileForm.setData('profile_photo', null);
                                        setPhotoPreview(null);
                                        profileForm.clearErrors();
                                        setProfileErrors({});
                                    }}
                                    style={mutedButton}
                                >
                                    Reset
                                </button>
                                <button type="submit" style={primaryButton} disabled={profileProcessing}>
                                    {profileProcessing ? 'Updating...' : 'Update Profile'}
                                </button>
                            </div>
                        </div>

                        {profileSuccess && (
                            <div style={{
                                marginTop: '1rem',
                                padding: '0.9rem 1rem',
                                borderRadius: 14,
                                background: 'rgba(34,197,94,0.12)',
                                border: '1px solid rgba(34,197,94,0.22)',
                                color: '#86efac',
                                fontSize: '0.85rem',
                                fontWeight: 600,
                            }}>
                                Profile updated successfully.
                            </div>
                        )}
                    </form>
                </section>

                <section style={panel}>
                    <div style={sectionTitle}>Security</div>
                    <div style={{ ...sectionDesc, marginBottom: '1.25rem' }}>
                        Change your password using your current password for verification.
                    </div>

                    <form onSubmit={submitPassword}>
                        <Field labelText="Current Password" error={passwordForm.errors.current_password}>
                            <input
                                type="password"
                                value={passwordForm.data.current_password}
                                onChange={(e) => passwordForm.setData('current_password', e.target.value)}
                                style={input}
                                onFocus={(e) => Object.assign(e.target.style, inputFocus)}
                                onBlur={(e) => {
                                    e.target.style.borderColor = 'var(--admin-border)';
                                    e.target.style.boxShadow = 'none';
                                }}
                                autoComplete="current-password"
                            />
                        </Field>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }} className="password-grid">
                            <Field labelText="New Password" error={passwordForm.errors.password}>
                                <input
                                    type="password"
                                    value={passwordForm.data.password}
                                    onChange={(e) => passwordForm.setData('password', e.target.value)}
                                    style={input}
                                    onFocus={(e) => Object.assign(e.target.style, inputFocus)}
                                    onBlur={(e) => {
                                        e.target.style.borderColor = 'var(--admin-border)';
                                        e.target.style.boxShadow = 'none';
                                    }}
                                    autoComplete="new-password"
                                />
                            </Field>

                            <Field labelText="Confirm Password" error={passwordForm.errors.password_confirmation}>
                                <input
                                    type="password"
                                    value={passwordForm.data.password_confirmation}
                                    onChange={(e) => passwordForm.setData('password_confirmation', e.target.value)}
                                    style={input}
                                    onFocus={(e) => Object.assign(e.target.style, inputFocus)}
                                    onBlur={(e) => {
                                        e.target.style.borderColor = 'var(--admin-border)';
                                        e.target.style.boxShadow = 'none';
                                    }}
                                    autoComplete="new-password"
                                />
                            </Field>
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', flexWrap: 'wrap', marginTop: '0.25rem', paddingTop: '1rem', borderTop: '1px solid var(--admin-border)' }}>
                            <div style={{ fontSize: '0.82rem', color: 'var(--admin-text-muted)' }}>
                                Use a strong password with at least 8 characters, mixed case, numbers, and symbols.
                            </div>
                            <button type="submit" style={primaryButton} disabled={passwordForm.processing}>
                                {passwordForm.processing ? 'Saving...' : 'Update Password'}
                            </button>
                        </div>

                        {passwordForm.recentlySuccessful && (
                            <div style={{
                                marginTop: '1rem',
                                padding: '0.9rem 1rem',
                                borderRadius: 14,
                                background: 'rgba(34,197,94,0.12)',
                                border: '1px solid rgba(34,197,94,0.22)',
                                color: '#86efac',
                                fontSize: '0.85rem',
                                fontWeight: 600,
                            }}>
                                Password updated successfully.
                            </div>
                        )}
                    </form>
                </section>
            </div>

            <style>{`
                .profile-layout .profile-edit-grid,
                .profile-layout .password-grid {
                    min-width: 0;
                }

                .profile-layout input,
                .profile-layout textarea {
                    font-family: inherit;
                }

                .profile-layout button:hover {
                    transform: translateY(-1px);
                }

                @media (max-width: 1100px) {
                    .profile-layout {
                        grid-template-columns: 1fr !important;
                    }
                }

                @media (max-width: 767px) {
                    .profile-layout {
                        gap: 0.85rem;
                    }

                    .profile-edit-grid,
                    .password-grid {
                        grid-template-columns: 1fr !important;
                    }
                }
            `}</style>
        </div>
    );
}
