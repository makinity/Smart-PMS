import { useForm } from '@inertiajs/react';
import { useState, useEffect } from 'react';
import GuestLayout from '@/Layouts/GuestLayout';

export default function Login() {
    const [mode, setMode] = useState('login');
    const [darkMode, setDarkMode] = useState(() => (localStorage.getItem('theme') ?? 'light') === 'dark');

    useEffect(() => {
        const theme = darkMode ? 'dark' : 'light';
        document.documentElement.setAttribute('data-theme', theme);
        localStorage.setItem('theme', theme);
    }, [darkMode]);
    const { data, setData, post, processing, errors, reset, clearErrors } = useForm({
        name: '',
        password: '',
        employee_id: '',
        email: '',
        token: '',
        password_confirmation: '',
        profile_photo: null,
    });

    function submit(e) {
        e.preventDefault();

        if (mode === 'login') { post('/login'); return; }

        if (mode === 'activate-verify') {
            fetch('/send/id', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Accept: 'application/json',
                    'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.content ?? '',
                },
                body: JSON.stringify({ employee_id: data.employee_id, email: data.email }),
            })
                .then(async res => {
                    const payload = await res.json().catch(() => ({}));
                    if (!res.ok) throw payload;
                    setData('token', payload.token ?? '');
                    setMode('activate-complete');
                })
                .catch(payload => payload?.message && alert(payload.message));
            return;
        }

        if (mode === 'activate-complete') { post('/activate/complete', { forceFormData: true }); return; }

        post('/forgot-password');
    }

    function switchMode(nextMode) {
        setMode(nextMode);
        clearErrors();
        if (nextMode === 'login') reset('employee_id', 'email', 'token', 'password_confirmation', 'profile_photo');
        if (nextMode === 'activate-verify') reset('name', 'password', 'token', 'password_confirmation', 'profile_photo');
        if (nextMode === 'forgot') reset('name', 'password', 'employee_id', 'token', 'password_confirmation', 'profile_photo');
    }

    const slides = ['/slides/1.png', '/slides/2.png', '/slides/3.png'];
    const [activeSlide, setActiveSlide] = useState(0);

    useEffect(() => {
        if (slides.length < 2) return;
        if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

        const interval = setInterval(() => {
            setActiveSlide(i => (i + 1) % slides.length);
        }, 6000);

        return () => clearInterval(interval);
    }, [slides.length]);

    const title = mode === 'login' ? 'Sign in'
        : mode === 'activate-verify' ? 'Activate PMS Account'
        : mode === 'activate-complete' ? 'Complete Activation'
        : 'Forgot Password';

    const subtitle = mode === 'login' ? 'Enter your credentials to continue'
        : mode === 'activate-verify' ? 'Verify your employee ID and email to receive an activation token'
        : mode === 'activate-complete' ? 'Set your password and optional profile photo'
        : 'Enter your email address to receive a reset link';

    return (
        <GuestLayout>
            {/* ── Dark mode toggle ── */}
            <button
                onClick={() => setDarkMode(v => !v)}
                title={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
                style={{
                    position: 'fixed', top: '1rem', right: '1rem', zIndex: 100,
                    display: 'flex', alignItems: 'center', gap: '0.45rem',
                    padding: '0.4rem 0.85rem',
                    background: 'var(--admin-card)',
                    border: '1px solid var(--admin-border-strong)',
                    borderRadius: '999px',
                    color: 'var(--admin-text-secondary)',
                    fontSize: '0.82rem', fontWeight: 500,
                    cursor: 'pointer',
                    boxShadow: 'var(--admin-shadow)',
                    transition: 'opacity 0.15s',
                }}
            >
                {darkMode ? '☀️' : '🌙'} {darkMode ? 'Light' : 'Dark'}
            </button>

            <div style={{ display: 'flex', minHeight: '100vh', width: '100%' }}>

                {/* ── Hero panel ── */}
                <div style={{
                    flex: 1,
                    display: 'none',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    position: 'relative',
                    overflow: 'hidden',
                    padding: '2.5rem 2.5rem',
                }} className="auth-hero">

                    {/* Slideshow */}
                    <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', zIndex: 0, pointerEvents: 'none' }}>
                        {slides.map((src, i) => (
                            <div key={src} className={`auth-split-slide${i === activeSlide ? ' is-active' : ''}`}>
                                <img src={src} loading={i === 0 ? 'eager' : 'lazy'} alt="" />
                            </div>
                        ))}
                    </div>

                    {/* Overlay */}
                    <div className="auth-split-slideshow-overlay" />

                    {/* Logo + app name */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', position: 'relative', zIndex: 2 }}>
                        <img src="/images/pms-logo.png" alt="Smart PMS" style={{ width: 36, height: 36, objectFit: 'contain' }} />
                        <span style={{ color: '#fff', fontWeight: 700, fontSize: '1.15rem', letterSpacing: '-0.01em' }}>Smart PMS</span>
                    </div>

                    {/* Headline */}
                    <div style={{ position: 'relative', zIndex: 2 }}>
                        <p style={{ color: 'rgba(255,255,255,0.85)', fontSize: '0.78rem', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '0.75rem', textShadow: '0 1px 4px rgba(0,0,0,0.6)' }}>
                            Welcome back
                        </p>
                        <h2 style={{ color: '#fff', fontWeight: 700, fontSize: '2.2rem', lineHeight: 1.2, marginBottom: '0.85rem', textShadow: '0 2px 8px rgba(0,0,0,0.6)' }}>
                            Performance,<br />made smarter.
                        </h2>
                        <p style={{ color: 'rgba(255,255,255,0.85)', fontSize: '0.92rem', maxWidth: 320, lineHeight: 1.6, textShadow: '0 1px 4px rgba(0,0,0,0.6)' }}>
                            Manage employee performance with clarity, efficiency, and real-time insights.
                        </p>
                    </div>

                    {/* Footer */}
                    <p style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.6)', position: 'relative', zIndex: 2, textShadow: '0 1px 3px rgba(0,0,0,0.5)' }}>
                        © {new Date().getFullYear()} Smart PMS. All rights reserved.
                    </p>
                </div>

                {/* ── Form panel ── */}
                <div style={{
                    flex: 1,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: 'var(--admin-bg-primary)',
                    padding: '2rem 1rem',
                    gap: '1.25rem',
                }}>
                    {/* Mobile-only logo */}
                    <div className="mobile-logo" style={{
                        display: 'none',
                        alignItems: 'center',
                        gap: '0.6rem',
                    }}>
                        <img src="/images/pms-logo.png" alt="Smart PMS" style={{ width: 32, height: 32, objectFit: 'contain' }} />
                        <span style={{ fontWeight: 700, fontSize: '1.1rem', color: 'var(--admin-text-primary)', letterSpacing: '-0.01em' }}>Smart PMS</span>
                    </div>

                    <div style={{
                        width: '100%',
                        maxWidth: 420,
                        background: 'var(--admin-card)',
                        border: '1px solid var(--admin-border-strong)',
                        borderRadius: 'var(--admin-radius)',
                        boxShadow: 'var(--admin-shadow)',
                        padding: '2.5rem 2rem',
                    }}>
                        {/* Form header */}
                        <div style={{ marginBottom: '2rem', paddingBottom: '1.25rem', borderBottom: '1px solid var(--admin-border)' }}>
                            <h4 style={{ fontWeight: 700, fontSize: '1.5rem', color: 'var(--admin-text-primary)', marginBottom: '0.3rem', letterSpacing: '-0.02em' }}>
                                {title}
                            </h4>
                            <p style={{ fontSize: '0.875rem', color: 'var(--admin-text-muted)', lineHeight: 1.5 }}>
                                {subtitle}
                            </p>
                        </div>

                        <form onSubmit={submit}>
                            {mode === 'login' && <>
                                <Field label="Name" icon={icons.user} error={errors.name}>
                                    <input type="text" value={data.name} onChange={e => setData('name', e.target.value)}
                                        autoFocus autoComplete="username" placeholder="Your name" style={inputStyle(!!errors.name)} />
                                </Field>
                                <Field label="Password" icon={icons.lock} error={errors.password}>
                                    <input type="password" value={data.password} onChange={e => setData('password', e.target.value)}
                                        autoComplete="current-password" placeholder="••••••••" style={inputStyle(!!errors.password)} />
                                </Field>
                            </>}

                            {mode === 'activate-verify' && <>
                                <Field label="Employee ID" icon={icons.id} error={errors.employee_id}>
                                    <input type="text" value={data.employee_id} onChange={e => setData('employee_id', e.target.value)}
                                        autoFocus autoComplete="off" placeholder="EMP-ABC-1234" style={inputStyle(!!errors.employee_id)} />
                                </Field>
                                <Field label="Email address" icon={icons.email} error={errors.email}>
                                    <input type="email" value={data.email} onChange={e => setData('email', e.target.value)}
                                        autoComplete="email" placeholder="your.email@example.com" style={inputStyle(!!errors.email)} />
                                </Field>
                            </>}

                            {mode === 'activate-complete' && <>
                                <Field label="Activation token" icon={icons.token} error={errors.token}>
                                    <input type="text" value={data.token} onChange={e => setData('token', e.target.value)}
                                        autoFocus placeholder="Enter your token" style={inputStyle(!!errors.token)} />
                                </Field>
                                <Field label="Password" icon={icons.lock} error={errors.password}>
                                    <input type="password" value={data.password} onChange={e => setData('password', e.target.value)}
                                        autoComplete="new-password" placeholder="••••••••" style={inputStyle(!!errors.password)} />
                                </Field>
                                <Field label="Confirm password" icon={icons.lock} error={errors.password_confirmation}>
                                    <input type="password" value={data.password_confirmation} onChange={e => setData('password_confirmation', e.target.value)}
                                        autoComplete="new-password" placeholder="••••••••" style={inputStyle(!!errors.password_confirmation)} />
                                </Field>
                                <Field label="Profile photo (optional)" icon={icons.photo} error={errors.profile_photo}>
                                    <input type="file" accept="image/*" onChange={e => setData('profile_photo', e.target.files?.[0] ?? null)}
                                        style={{ ...inputStyle(!!errors.profile_photo), padding: '0.45rem 0.75rem', cursor: 'pointer' }} />
                                </Field>
                            </>}

                            {mode === 'forgot' && (
                                <Field label="Email address" icon={icons.email} error={errors.email}>
                                    <input type="email" value={data.email} onChange={e => setData('email', e.target.value)}
                                        autoFocus autoComplete="email" placeholder="your.email@example.com" style={inputStyle(!!errors.email)} />
                                </Field>
                            )}

                            <button type="submit" disabled={processing} style={{ ...primaryBtn, marginTop: '1.5rem' }}>
                                {processing ? 'Working…'
                                    : mode === 'login' ? 'Sign in'
                                    : mode === 'activate-verify' ? 'Verify account'
                                    : mode === 'activate-complete' ? 'Complete activation'
                                    : 'Send reset link'}
                            </button>

                            {mode === 'login' ? (
                                <>
                                    <div style={{ display: 'flex', alignItems: 'center', margin: '1.25rem 0', gap: '0.75rem' }}>
                                        <div style={{ flex: 1, borderTop: '1px solid var(--admin-border)' }} />
                                        <span style={{ fontSize: '0.75rem', color: 'var(--admin-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>or</span>
                                        <div style={{ flex: 1, borderTop: '1px solid var(--admin-border)' }} />
                                    </div>
                                    <div style={{ display: 'grid', gap: '0.6rem' }}>
                                        <button type="button" onClick={() => switchMode('forgot')} style={ghostBtn}>
                                            Forgot password?
                                        </button>
                                        <button type="button" onClick={() => switchMode('activate-verify')} style={outlineBtn}>
                                            Activate PMS Account
                                        </button>
                                    </div>
                                </>
                            ) : (
                                <div style={{ marginTop: '1rem' }}>
                                    <button type="button" onClick={() => switchMode('login')} style={ghostBtn}>
                                        ← Back to sign in
                                    </button>
                                </div>
                            )}
                        </form>
                    </div>
                </div>
            </div>

            <style>{`
                @import url('https://fonts.bunny.net/css?family=manrope:400,500,600,700,800|fraunces:600,700');

                @media (min-width: 768px) { .auth-hero { display: flex !important; } }
                @media (max-width: 767px) { .mobile-logo { display: flex !important; } }

                .auth-split-slide {
                    position: absolute;
                    inset: 0;
                    opacity: 0;
                    transition: opacity 1s ease;
                    will-change: opacity;
                }
                .auth-split-slide img {
                    width: 100%; height: 100%;
                    object-fit: cover;
                    transform: scale(1);
                    transition: transform 6s ease;
                    will-change: transform;
                    backface-visibility: hidden;
                    -webkit-backface-visibility: hidden;
                    filter: saturate(1.04) contrast(1.02) brightness(1.01);
                }
                .auth-split-slide.is-active { opacity: 1; }
                .auth-split-slide.is-active img { transform: scale(1.02); }

                .auth-split-slideshow-overlay {
                    position: absolute;
                    inset: 0;
                    z-index: 1;
                    pointer-events: none;
                    background:
                        linear-gradient(180deg, rgba(4,10,24,0.54) 0%, rgba(7,14,30,0.68) 100%),
                        radial-gradient(circle at 20% 25%, rgba(30,64,175,0.16) 0%, transparent 42%);
                }

                .auth-hero > *:not(.auth-split-slideshow-overlay) { position: relative; z-index: 2; }

                input::placeholder { color: var(--admin-text-muted); }
                input:focus { outline: none; border-color: var(--admin-accent) !important; box-shadow: 0 0 0 3px rgba(59,130,246,0.15); }
                button:hover:not(:disabled) { opacity: 0.88; }
                button:disabled { opacity: 0.55; cursor: not-allowed; }
            `}</style>
        </GuestLayout>
    );
}

function Field({ label, icon, error, children }) {
    return (
        <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.82rem', fontWeight: 600, color: 'var(--admin-text-secondary)', marginBottom: '0.4rem' }}>
                {icon && <span style={{ color: 'var(--admin-accent)', display: 'flex' }}>{icon}</span>}
                {label}
            </label>
            {children}
            {error && <p style={{ fontSize: '0.78rem', color: '#ef4444', marginTop: '0.3rem' }}>{error}</p>}
        </div>
    );
}

// Small inline SVG icons (16px, accent-colored via parent)
const icons = {
    user:    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/></svg>,
    lock:    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>,
    id:      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="5" width="20" height="14" rx="2"/><path d="M16 10h2M16 14h2M8 10h.01M8 14h.01M11 10h1M11 14h1"/></svg>,
    email:   <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>,
    token:   <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>,
    photo:   <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3z"/><circle cx="12" cy="13" r="3"/></svg>,
};

const inputStyle = (hasError) => ({
    width: '100%',
    padding: '0.6rem 0.85rem',
    fontSize: '0.9rem',
    background: 'var(--admin-bg-secondary)',
    color: 'var(--admin-text-primary)',
    border: `1px solid ${hasError ? '#ef4444' : 'var(--admin-border-strong)'}`,
    borderRadius: 'var(--admin-radius)',
    transition: 'border-color 0.15s, box-shadow 0.15s',
});

const primaryBtn = {
    width: '100%',
    padding: '0.7rem',
    fontSize: '0.92rem',
    fontWeight: 600,
    background: 'var(--admin-accent)',
    color: '#fff',
    border: 'none',
    borderRadius: 'var(--admin-radius)',
    cursor: 'pointer',
    transition: 'opacity 0.15s',
    marginTop: '0.25rem',
};

const ghostBtn = {
    width: '100%',
    padding: '0.65rem',
    fontSize: '0.88rem',
    fontWeight: 500,
    background: 'transparent',
    color: 'var(--admin-text-secondary)',
    border: '1px solid var(--admin-border-strong)',
    borderRadius: 'var(--admin-radius)',
    cursor: 'pointer',
    transition: 'opacity 0.15s',
};

const outlineBtn = {
    ...ghostBtn,
    color: 'var(--admin-accent)',
    borderColor: 'var(--admin-accent)',
};
