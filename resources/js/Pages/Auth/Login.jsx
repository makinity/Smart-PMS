import { useForm } from '@inertiajs/react';
import { useState, useEffect, useRef } from 'react';
import GuestLayout from '@/Layouts/GuestLayout';

function ParticleCanvas({ darkMode }) {
    const canvasRef = useRef(null);

    useEffect(() => {
        if (window.innerWidth < 1024) return;
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        const SPACING = 28, RADIUS = 1.8, REPEL_DIST = 120, REPEL_STRENGTH = 40, LERP = 0.08;

        let dots = [], mouse = { x: -999, y: -999 }, raf;

        function build() {
            canvas.width = canvas.offsetWidth;
            canvas.height = canvas.offsetHeight;
            dots = [];
            for (let x = SPACING; x < canvas.width; x += SPACING)
                for (let y = SPACING; y < canvas.height; y += SPACING)
                    dots.push({ rx: x, ry: y, cx: x, cy: y });
        }

        function draw() {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            const color = darkMode ? 'rgba(255,255,255,0.18)' : 'rgba(0,0,0,0.12)';
            ctx.fillStyle = color;
            for (const d of dots) {
                const dx = d.cx - mouse.x, dy = d.cy - mouse.y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                let tx = d.rx, ty = d.ry;
                if (dist < REPEL_DIST && dist > 0) {
                    const force = (1 - dist / REPEL_DIST) * REPEL_STRENGTH;
                    tx = d.rx + (dx / dist) * force;
                    ty = d.ry + (dy / dist) * force;
                }
                d.cx += (tx - d.cx) * LERP;
                d.cy += (ty - d.cy) * LERP;
                ctx.beginPath();
                ctx.arc(d.cx, d.cy, RADIUS, 0, Math.PI * 2);
                ctx.fill();
            }
            raf = requestAnimationFrame(draw);
        }

        const onMove = e => {
            const rect = canvas.getBoundingClientRect();
            mouse = { x: e.clientX - rect.left, y: e.clientY - rect.top };
        };
        const onLeave = () => { mouse = { x: -999, y: -999 }; };
        const onResize = () => { build(); };

        build();
        draw();
        canvas.addEventListener('mousemove', onMove);
        canvas.addEventListener('mouseleave', onLeave);
        window.addEventListener('resize', onResize);

        return () => {
            cancelAnimationFrame(raf);
            canvas.removeEventListener('mousemove', onMove);
            canvas.removeEventListener('mouseleave', onLeave);
            window.removeEventListener('resize', onResize);
        };
    }, [darkMode]);

    return <canvas ref={canvasRef} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', zIndex: 0, pointerEvents: 'none', display: 'none' }} className="particle-canvas" />;
}

export default function Login() {
    const [mode, setMode] = useState('login');
    const [darkMode, setDarkMode] = useState(() => (localStorage.getItem('theme') ?? 'light') === 'dark');
    const [showPassword, setShowPassword] = useState(false);

    useEffect(() => {
        const theme = darkMode ? 'dark' : 'light';
        document.documentElement.setAttribute('data-theme', theme);
        localStorage.setItem('theme', theme);
    }, [darkMode]);
    const { data, setData, post, processing, errors, setError, reset, clearErrors } = useForm({
        name: '',
        password: '',
        employee_id: '',
        email: '',
        token: '',
        password_confirmation: '',
        profile_photo: null,
    });
    const [fetching, setFetching] = useState(false);
    const isLoading = processing || fetching;

    function submit(e) {
        e.preventDefault();

        if (mode === 'login') { post('/login'); return; }

        if (mode === 'activate-verify') {
            setFetching(true);
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
                    if (!res.ok) {
                        // Map Laravel validation errors (422) or conflict messages (409)
                        // to inline field errors, matching login validation UX.
                        if (payload?.errors) {
                            Object.entries(payload.errors).forEach(([field, messages]) => {
                                setError(field, Array.isArray(messages) ? messages[0] : messages);
                            });
                        } else if (payload?.message) {
                            // Non-field errors (e.g. 409 already-activated) go on employee_id
                            setError('employee_id', payload.message);
                        }
                        return;
                    }
                    setData('token', payload.token ?? '');
                    setMode('activate-complete');
                })
                .catch(() => setError('employee_id', 'Something went wrong. Please try again.'))
                .finally(() => setFetching(false));
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
            {/* Hide the browser's native password reveal control — redundant with our own eye toggle */}
            <style>{`input::-ms-reveal, input::-ms-clear { display: none; }`}</style>
            {/* ── Dark mode toggle ── */}
            <button
                onClick={() => setDarkMode(v => !v)}
                title={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
                style={{ position: 'fixed', top: '1rem', right: '1rem', zIndex: 100, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
            >
                <div style={{
                    width: 48, height: 26, borderRadius: 13,
                    background: darkMode ? 'var(--admin-accent)' : '#cbd5e1',
                    position: 'relative', transition: 'background 0.2s',
                    boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.2)',
                }}>
                    <div style={{
                        position: 'absolute', top: 3, left: darkMode ? 25 : 3,
                        width: 20, height: 20, borderRadius: '50%',
                        background: '#fff', transition: 'left 0.2s',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                        {darkMode
                            ? <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2.5" strokeLinecap="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>
                            : <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2.5" strokeLinecap="round"><circle cx="12" cy="12" r="4"/><line x1="12" y1="2" x2="12" y2="4"/><line x1="12" y1="20" x2="12" y2="22"/><line x1="4.93" y1="4.93" x2="6.34" y2="6.34"/><line x1="17.66" y1="17.66" x2="19.07" y2="19.07"/><line x1="2" y1="12" x2="4" y2="12"/><line x1="20" y1="12" x2="22" y2="12"/><line x1="4.93" y1="19.07" x2="6.34" y2="17.66"/><line x1="17.66" y1="6.34" x2="19.07" y2="4.93"/></svg>
                        }
                    </div>
                </div>
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
                        {/* Badged label */}
                        <span style={{
                            display: 'inline-block',
                            fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase',
                            color: '#93c5fd', border: '1px solid rgba(147,197,253,0.5)',
                            borderRadius: '4px', padding: '0.2rem 0.55rem', marginBottom: '0.85rem',
                        }}>
                            Welcome Back!
                        </span>
                        <h2 style={{ color: '#fff', fontWeight: 700, fontSize: '2.2rem', lineHeight: 1.2, marginBottom: '0.85rem', textShadow: '0 2px 8px rgba(0,0,0,0.6)' }}>
                            Performance,<br />made smarter.
                        </h2>
                        <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: '0.92rem', maxWidth: 320, lineHeight: 1.6, marginBottom: '2rem', textShadow: '0 1px 4px rgba(0,0,0,0.6)' }}>
                            Manage employee performance with clarity, efficiency, and real-time insights.
                        </p>

                        {/* Feature rows */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.1rem' }}>
                            {[
                                {
                                    icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 3v18h18"/><path d="M7 16l4-4 4 4 4-4"/></svg>,
                                    title: 'Real-Time Insights',
                                    desc: 'Track performance metrics and KPIs as they happen.',
                                },
                                {
                                    icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></svg>,
                                    title: 'Team Collaboration',
                                    desc: 'Coordinate goals and reviews across departments.',
                                },
                                {
                                    icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>,
                                    title: 'Secure & Reliable',
                                    desc: 'Your data is protected with role-based access control.',
                                },
                            ].map(({ icon, title, desc }) => (
                                <div key={title} style={{ display: 'flex', alignItems: 'flex-start', gap: '0.85rem' }}>
                                    <div style={{
                                        flexShrink: 0, width: 38, height: 38,
                                        background: 'rgba(59,130,246,0.2)', border: '1px solid rgba(59,130,246,0.35)',
                                        borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        color: '#93c5fd',
                                    }}>
                                        {icon}
                                    </div>
                                    <div>
                                        <p style={{ color: '#fff', fontWeight: 600, fontSize: '0.9rem', marginBottom: '0.15rem', textShadow: '0 1px 3px rgba(0,0,0,0.5)' }}>{title}</p>
                                        <p style={{ color: 'rgba(255,255,255,0.65)', fontSize: '0.8rem', lineHeight: 1.5 }}>{desc}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Footer */}
                    <div style={{ position: 'relative', zIndex: 2 }}>
                        <p style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)', marginBottom: '0.4rem' }}>
                            © {new Date().getFullYear()} Smart PMS. All rights reserved.
                        </p>
                        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', fontSize: '0.72rem' }}>
                            {['Privacy Policy', 'Terms of Service', 'Help Center'].map((link, i, arr) => (
                                <span key={link} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    <a href="#" style={{ color: 'rgba(255,255,255,0.55)', textDecoration: 'none' }}
                                        onMouseEnter={e => e.target.style.color = 'rgba(255,255,255,0.9)'}
                                        onMouseLeave={e => e.target.style.color = 'rgba(255,255,255,0.55)'}
                                    >{link}</a>
                                    {i < arr.length - 1 && <span style={{ color: 'rgba(255,255,255,0.3)' }}>|</span>}
                                </span>
                            ))}
                        </div>
                    </div>
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
                    position: 'relative',
                }}>
                    <ParticleCanvas darkMode={darkMode} />
                    {/* Mobile-only logo */}
                    <div className="mobile-logo" style={{
                        display: 'none',
                        alignItems: 'center',
                        gap: '0.6rem',
                        position: 'relative', zIndex: 1,
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
                        position: 'relative', zIndex: 1,
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
                            {errors.throttle && <ThrottleBanner key={errors.throttle} message={errors.throttle} />}
                            {mode === 'login' && <>
                                <Field label="Name" icon={icons.user} error={errors.name}>
                                    <input type="text" value={data.name} onChange={e => setData('name', e.target.value)}
                                        autoFocus autoComplete="username" placeholder="Your name" style={inputStyle(!!errors.name)} />
                                </Field>
                                <Field label="Password" icon={icons.lock} error={errors.password}>
                                    <div style={{ position: 'relative' }}>
                                        <input type={showPassword ? 'text' : 'password'} value={data.password} onChange={e => setData('password', e.target.value)}
                                            autoComplete="current-password" placeholder="••••••••" style={{ ...inputStyle(!!errors.password), paddingRight: '2.5rem' }} />
                                        <button type="button" onClick={() => setShowPassword(v => !v)}
                                            title={showPassword ? 'Hide password' : 'Show password'}
                                            style={{ position: 'absolute', right: '0.65rem', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--admin-text-muted)', padding: 0, display: 'flex' }}>
                                            {showPassword ? icons.eyeOff : icons.eye}
                                        </button>
                                    </div>
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
                                {/* Hidden token */}
                                <input type="hidden" value={data.token} />

                                {/* Profile photo — top, enhanced */}
                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
                                    <label style={{ cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
                                        <div style={{ width: 88, height: 88, borderRadius: '50%', border: '2px dashed var(--admin-accent)', background: 'rgba(59,130,246,0.07)', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', position: 'relative' }}>
                                            {data.profile_photo
                                                ? <img src={URL.createObjectURL(data.profile_photo)} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                                : <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--admin-accent)" strokeWidth="1.5"><path d="M20 21a8 8 0 10-16 0"/><circle cx="12" cy="8" r="4"/></svg>
                                            }
                                        </div>
                                        <span style={{ fontSize: '0.75rem', color: 'var(--admin-accent)', fontWeight: 600 }}>
                                            {data.profile_photo ? 'Change photo' : 'Upload profile photo (optional)'}
                                        </span>
                                        <input type="file" accept="image/*" style={{ display: 'none' }}
                                            onChange={e => setData('profile_photo', e.target.files?.[0] ?? null)} />
                                    </label>
                                    {errors.profile_photo && <span style={{ fontSize: '0.75rem', color: '#f87171' }}>{errors.profile_photo}</span>}
                                </div>

                                <Field label="Password" icon={icons.lock} error={errors.password}>
                                    <PasswordInput value={data.password} onChange={e => setData('password', e.target.value)}
                                        autoComplete="new-password" placeholder="••••••••" hasError={!!errors.password} />
                                </Field>
                                <Field label="Confirm password" icon={icons.lock} error={errors.password_confirmation}>
                                    <PasswordInput value={data.password_confirmation} onChange={e => setData('password_confirmation', e.target.value)}
                                        autoComplete="new-password" placeholder="••••••••" hasError={!!errors.password_confirmation} />
                                </Field>
                            </>}

                            {mode === 'forgot' && (
                                <Field label="Email address" icon={icons.email} error={errors.email}>
                                    <input type="email" value={data.email} onChange={e => setData('email', e.target.value)}
                                        autoFocus autoComplete="email" placeholder="your.email@example.com" style={inputStyle(!!errors.email)} />
                                </Field>
                            )}

                            <button type="submit" disabled={isLoading} style={{ ...primaryBtn, marginTop: '1.5rem' }}>
                                {isLoading
                                    ? (mode === 'login' ? 'Signing in…' : 'Working…')
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
                @media (min-width: 1024px) { .particle-canvas { display: block !important; pointer-events: auto !important; } }

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

function ThrottleBanner({ message }) {
    // Seconds are baked into the server message ("…try again in 55 seconds.").
    const initial = (() => {
        const match = /(\d+)\s*second/i.exec(message) ?? /(\d+)/.exec(message);
        return match ? parseInt(match[1], 10) : 0;
    })();

    const [seconds, setSeconds] = useState(initial);

    useEffect(() => {
        if (initial <= 0) return;
        const id = setInterval(() => setSeconds(s => (s <= 1 ? 0 : s - 1)), 1000);
        return () => clearInterval(id);
    }, [initial]);

    const ready = seconds <= 0;
    const text = ready
        ? 'You can try signing in again now.'
        : `Too many login attempts. Please try again in ${seconds} second${seconds === 1 ? '' : 's'}.`;
    const color = ready ? '#16a34a' : '#ef4444';

    return (
        <div role="alert" aria-live="polite" style={{
            display: 'flex', alignItems: 'flex-start', gap: '0.55rem',
            padding: '0.7rem 0.85rem', marginBottom: '1.25rem',
            background: ready ? 'rgba(22,163,74,0.1)' : 'rgba(239,68,68,0.1)',
            border: `1px solid ${ready ? 'rgba(22,163,74,0.4)' : 'rgba(239,68,68,0.4)'}`,
            borderRadius: 'var(--admin-radius)',
            color, fontSize: '0.82rem', lineHeight: 1.45,
        }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: '0.1rem' }}>
                {ready
                    ? <><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></>
                    : <><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></>}
            </svg>
            <span>{text}</span>
        </div>
    );
}

function PasswordInput({ value, onChange, autoComplete, placeholder, hasError }) {
    const [show, setShow] = useState(false);
    return (
        <div style={{ position: 'relative' }}>
            <input type={show ? 'text' : 'password'} value={value} onChange={onChange}
                autoComplete={autoComplete} placeholder={placeholder}
                style={{ ...inputStyle(hasError), paddingRight: '2.5rem' }} />
            <button type="button" onClick={() => setShow(v => !v)}
                style={{ position: 'absolute', right: '0.75rem', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--admin-text-muted)', display: 'flex', padding: 0 }}>
                {show ? icons.eyeOff : icons.eye}
            </button>
        </div>
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
    eye:     <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>,
    eyeOff:  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/></svg>,
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
