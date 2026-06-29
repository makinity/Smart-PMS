# Web Design Architecture Template
> Framework-agnostic UI/UX blueprint derived from the **Smart PMS** project.
> Use this document as the single source of truth when bootstrapping any new web application with the same design language.
> When starting a new project, attach your sample screenshots alongside this file so your coding agent can match the design precisely.

---

## Table of Contents

1. [Tech Stack](#1-tech-stack)
2. [Logo & Branding](#2-logo--branding)
3. [Color System & Theme Variables](#3-color-system--theme-variables)
4. [Typography](#4-typography)
5. [Layout Structure](#5-layout-structure)
6. [Login Page](#6-login-page)
7. [Sidebar](#7-sidebar)
8. [Navbar / Topbar](#8-navbar--topbar)
9. [Reusable Components](#9-reusable-components)
10. [Modals](#10-modals)
11. [Animations & Transitions](#11-animations--transitions)
12. [Responsiveness](#12-responsiveness)
13. [Icons](#13-icons)
14. [Loading Screen](#14-loading-screen)
15. [Loading Skeletons](#15-loading-skeletons)
16. [Frontend Folder Structure](#16-frontend-folder-structure)
17. [Fallback / Error Pages](#17-fallback--error-pages)
18. [Phase-by-Phase Agent Prompts](#18-phase-by-phase-agent-prompts)

---

## 1. Tech Stack

This template is **framework-agnostic** —” the design system can be adapted to any stack. The reference implementation uses:

| Layer | Reference (Smart PMS) | Adaptable To |
|---|---|---|
| Backend | Laravel 11 | Any backend (Node/Express, Django, Rails, etc.) |
| Frontend bridge | Inertia.js v2 | Next.js, Nuxt, SvelteKit, plain SPA |
| Frontend framework | React 18 (JSX) | Vue 3, Svelte, Angular, vanilla JS |
| CSS approach | **Inline styles only** —” no Tailwind, no CSS modules | Tailwind, CSS-in-JS, SCSS (translate tokens) |
| Icons | Bootstrap Icons (`bi-*`) via CDN | Any icon set (Lucide, Heroicons, Phosphor) |
| HTTP client | Axios + Inertia `useForm` | fetch, SWR, React Query |
| Font | Inter (Google Fonts / system stack) | Any sans-serif |
| Charts | Chart.js 4 | Recharts, ApexCharts, ECharts |

> **Core CSS rule:** All styling uses inline `style={{}}` props. The only class-based exceptions are Bootstrap Icon classes (`bi bi-*`) and a handful of layout CSS classes injected via `<style>` tags inside components. Never add external UI component libraries (MUI, Ant Design, Chakra, etc.) —” build everything from scratch using the design tokens below.

---

## 2. Logo & Branding

Every project using this template has its own logo. The logo appears in **4 places** — replace it in all of them when starting a new project.

### Logo File

Place your logo at:
```
public/images/[your-logo].png
```

Recommended format: PNG with transparent background, square aspect ratio.

### Where the Logo Appears

| Location | File | Size | Usage |
|---|---|---|---|
| Login page auth card | `Pages/Auth/Login.jsx` | 36×36px | Above app name in the card header |
| Login page mobile header | `Pages/Auth/Login.jsx` | 32×32px | Shows on mobile where left panel is hidden |
| Post-login loading screen | `Components/LoginLoadingScreen.jsx` | 64×64px | Center of the loading overlay card |
| Logout loading overlay | `Components/Topbar.jsx` | 64×64px | Center of the signing-out overlay card |

### Logo Style

```js
// Login card (36x36)
<img src="/images/[your-logo].png" alt="[APP NAME]"
    style={{ width: 36, height: 36, objectFit: 'contain' }} />

// Loading screens (64x64)
<img src="/images/[your-logo].png" alt="[APP NAME]"
    style={{ width: 64, height: 64, objectFit: 'contain', borderRadius: 14 }} />
```

- `borderRadius: 14px` on the 64×64 version gives it a rounded app-icon look
- `objectFit: 'contain'` preserves aspect ratio inside the fixed dimensions
- Always update the `alt` attribute to the project's app name

### Slides Folder (Login Page Slideshow)

The left panel of the login page displays a **fullscreen image slideshow**. Images are served statically from:

```
public/slides/
    1.png
    2.png
    3.png
    (add more as needed)
```

**Rules:**
- Filenames must be sequential numbers: `1.png`, `2.png`, `3.png`, etc.
- Format: PNG or JPG, any resolution (displayed with `objectFit: cover`)
- Minimum 2 images for the auto-advance to activate
- Drop any project-specific screenshots or promotional images here

**Exact animation/transition spec:**
```js
// slides array built from the filenames
const slides = ['/slides/1.png', '/slides/2.png', '/slides/3.png'];
const [activeSlide, setActiveSlide] = useState(0);

// Auto-advance every 6 seconds
useEffect(() => {
    if (slides.length < 2) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return; // respect OS setting
    const interval = setInterval(() => {
        setActiveSlide(i => (i + 1) % slides.length);
    }, 6000);
    return () => clearInterval(interval);
}, [slides.length]);

// Each image rendered stacked absolutely, only active one visible
{slides.map((src, i) => (
    <img
        key={src}
        src={src}
        style={{
            position: 'absolute', inset: 0,
            width: '100%', height: '100%',
            objectFit: 'cover',
            opacity: i === activeSlide ? 1 : 0,
            transition: 'opacity 0.8s ease',  // ← the exact fade transition
        }}
    />
))}
```

**Key details:**
- Transition: `opacity 0.8s ease` — slow, smooth crossfade
- All images are rendered in the DOM simultaneously, only the active one has `opacity: 1`
- No slide/scroll animation — pure opacity crossfade only
- Slideshow only runs on desktop (left panel is hidden on mobile/tablet)
- `prefers-reduced-motion: reduce` disables the interval entirely

### App Name

The app name appears as text next to or below the logo in the same locations. Always replace `"Smart PMS"` with your project's name in:
- `LoginLoadingScreen.jsx` — the `<div>` title below the logo
- `Login.jsx` — the bold app name in the auth card
- `Topbar.jsx` — the logout overlay title
- `Sidebar.jsx` — the brand section app name
- `503.blade.php` — the page title and footer

---

## 3. Color System & Theme Variables

The system supports **dark mode** (default on first load if no preference saved) and **light mode**. The active theme is stored in `localStorage` under the key `'theme'` and applied as a `data-theme` attribute on `<html>`.

### CSS Custom Properties

```css
/* â”€â”€ Dark mode (default) â”€â”€ */
:root[data-theme="dark"], :root {
    --admin-bg-primary:    #0a0f1a;
    --admin-bg-secondary:  #0f1724;
    --admin-sidebar:       rgba(7,16,25,0.98);
    --admin-card:          rgba(16,23,34,0.96);
    --admin-border:        rgba(140,171,214,0.12);
    --admin-border-strong: rgba(59,130,246,0.22);
    --admin-text-primary:  #f4f8ff;
    --admin-text-secondary:#a5b4cf;
    --admin-text-muted:    #6f83a6;
    --admin-accent:        #3b82f6;
    --admin-radius:        12px;
    --admin-radius-lg:     18px;
    --admin-shadow:        0 18px 40px rgba(0,0,0,0.28);
}

/* â”€â”€ Light mode â”€â”€ */
:root[data-theme="light"] {
    --admin-bg-primary:    #f0f4ff;
    --admin-bg-secondary:  #e8edf8;
    --admin-sidebar:       rgba(255,255,255,0.98);
    --admin-card:          rgba(255,255,255,0.96);
    --admin-border:        rgba(59,130,246,0.14);
    --admin-border-strong: rgba(59,130,246,0.32);
    --admin-text-primary:  #0f172a;
    --admin-text-secondary:#334155;
    --admin-text-muted:    #64748b;
    --admin-accent:        #2563eb;
    --admin-shadow:        0 18px 40px rgba(0,0,0,0.08);
}
```

### Body Background

The page background uses a layered gradient with a subtle radial glow in the top-left corner:

```css
body {
    background:
        radial-gradient(circle at top left, rgba(59,130,246,0.12), transparent 26%),
        linear-gradient(180deg, var(--admin-bg-primary) 0%, var(--admin-bg-secondary) 100%);
}
```

### Semantic Inline Colors

| Purpose | Value |
|---|---|
| Accent / primary blue | `#3b82f6` (dark) / `#2563eb` (light) |
| Success green | `#4ade80` / `#10b981` |
| Warning yellow | `#facc15` / `#ca8a04` |
| Danger red | `#f87171` / `#ef4444` |
| Purple (endorsed/special) | `#c084fc` |
| Orange (risk/warning) | `#f97316` |

### Status Badge Color Map

```js
const STATUS_COLORS = {
    draft:     { bg: 'rgba(100,116,139,0.15)', color: '#94a3b8', border: 'rgba(100,116,139,0.3)' },
    submitted: { bg: 'rgba(37,99,235,0.12)',   color: '#60a5fa', border: 'rgba(37,99,235,0.3)'   },
    approved:  { bg: 'rgba(5,150,105,0.12)',   color: '#34d399', border: 'rgba(5,150,105,0.3)'   },
    returned:  { bg: 'rgba(239,68,68,0.12)',   color: '#f87171', border: 'rgba(239,68,68,0.3)'   },
    pending:   { bg: 'rgba(245,158,11,0.12)',  color: '#fbbf24', border: 'rgba(245,158,11,0.3)'  },
    rejected:  { bg: 'rgba(239,68,68,0.12)',   color: '#f87171', border: 'rgba(239,68,68,0.3)'   },
    active:    { bg: 'rgba(5,150,105,0.12)',   color: '#34d399', border: 'rgba(5,150,105,0.3)'   },
    inactive:  { bg: 'rgba(100,116,139,0.15)', color: '#94a3b8', border: 'rgba(100,116,139,0.3)' },
};

// Usage
<span style={{
    display: 'inline-flex', alignItems: 'center', gap: '0.3rem',
    padding: '0.2rem 0.6rem', borderRadius: 99,
    fontSize: '0.72rem', fontWeight: 600,
    background: STATUS_COLORS[status].bg,
    color: STATUS_COLORS[status].color,
    border: `1px solid ${STATUS_COLORS[status].border}`,
}}>
    {status}
</span>
```

### Theme Toggle Persistence

```js
// On app mount
const [darkMode, setDarkMode] = useState(() => (localStorage.getItem('theme') ?? 'dark') === 'dark');

useEffect(() => {
    document.documentElement.setAttribute('data-theme', darkMode ? 'dark' : 'light');
    localStorage.setItem('theme', darkMode ? 'dark' : 'light');
}, [darkMode]);
```

---

## 4. Typography

**Font family:** `'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif`

Load Inter via Google Fonts in your root HTML:
```html
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">
```

| Role | Size | Weight | Color token |
|---|---|---|---|
| Page title (topbar) | `0.8rem` | 700 | `--admin-text-primary` |
| Section heading | `1rem—“1.1rem` | 700 | `--admin-text-primary` |
| Card title | `0.9rem—“0.95rem` | 700 | `--admin-text-primary` |
| Body / table cell | `0.85rem` | 400—“500 | `--admin-text-secondary` |
| Label / caption | `0.78rem` | 500 | `--admin-text-secondary` |
| Muted / meta | `0.72rem` | 400—“500 | `--admin-text-muted` |
| Badge / tag | `0.72rem` | 600 | varies |
| App name (sidebar) | `1rem` | 700 | `--admin-text-primary` |
| Sub-role (sidebar) | `0.72rem` | 400 | `--admin-text-muted` |

**Letter spacing:** `-0.02em` to `-0.03em` on headings/titles for a modern tight feel.
**Line height:** `1.3—“1.6` for body text.

---

## 5. Layout Structure

### Overview

```
â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
â”‚  SIDEBAR (fixed, 280px expanded / 68px collapsed)           â”‚
â”‚  â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”   â”‚
â”‚  â”‚  Brand icon + App name + Role label + Toggle btn     â”‚   â”‚
â”‚  â”‚  â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€  â”‚   â”‚
â”‚  â”‚  Nav link (icon + label + optional badge)            â”‚   â”‚
â”‚  â”‚  Nav link (active state)                             â”‚   â”‚
â”‚  â”‚  Nav link                                            â”‚   â”‚
â”‚  â”‚  ...                                                 â”‚   â”‚
â”‚  â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜   â”‚
â”‚                                                             â”‚
â”‚  MAIN AREA (margin-left: sidebar width, flex column)        â”‚
â”‚  â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”   â”‚
â”‚  â”‚  TOPBAR (sticky, 44px min-height)                    â”‚   â”‚
â”‚  â”‚  [Hamburger] [Breadcrumb]       [Notifications] [User]â”‚  â”‚
â”‚  â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜   â”‚
â”‚  â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”   â”‚
â”‚  â”‚  PAGE CONTENT (.admin-content, padding 1rem 1.5rem)  â”‚   â”‚
â”‚  â”‚                                                       â”‚   â”‚
â”‚  â”‚  <Page skeleton OR actual page children>             â”‚   â”‚
â”‚  â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜   â”‚
â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜
```

### AppLayout Core CSS

```css
/* Applied inside AppLayout <style> block */
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

body {
    font-family: 'Inter', system-ui, sans-serif;
    color: var(--admin-text-primary);
    min-height: 100vh;
    background:
        radial-gradient(circle at top left, rgba(59,130,246,0.12), transparent 26%),
        linear-gradient(180deg, var(--admin-bg-primary) 0%, var(--admin-bg-secondary) 100%);
}

.admin-content {
    flex: 1;
    padding: 1rem 1.5rem;
    overflow: auto;
}

/* Mobile: sidebar is overlay, main takes full width */
@media (max-width: 767px) {
    .app-main { margin-left: 0 !important; }
    .admin-content { padding: 0.75rem 1rem; }
}
```

### Sidebar Width Constants

```js
const SIDEBAR_EXPANDED  = 280; // px
const SIDEBAR_COLLAPSED = 68;  // px

// In AppLayout state:
const [collapsed, setCollapsed] = useState(() => localStorage.getItem('sb-collapsed') === '1');
const sidebarWidth = collapsed ? 68 : 280;

// Applied to .app-main:
style={{ marginLeft: sidebarWidth, transition: 'margin-left 0.2s ease' }}
```

### Mobile Backdrop Overlay

When sidebar is open on mobile, render a backdrop behind it:
```jsx
{mobileOpen && (
    <div
        onClick={() => setMobileOpen(false)}
        style={{
            position: 'fixed', inset: 0, zIndex: 999,
            background: 'rgba(0,0,0,0.5)',
            backdropFilter: 'blur(2px)',
        }}
    />
)}
```

---


## 6. Login Page

### Two-Panel Layout

The login page splits into two panels side by side on desktop:

```
â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
â”‚  LEFT PANEL (hidden on mobile)     â”‚  RIGHT PANEL (form)    â”‚
â”‚  - App branding / logo             â”‚  - Auth card           â”‚
â”‚  - Image slideshow                 â”‚  - Dynamic form fields â”‚
â”‚  - Decorative dots animation       â”‚  - Mode switcher links â”‚
â”‚  - Gradient background             â”‚  - Theme toggle btn    â”‚
â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜
```

On **tablet and mobile**: only the right panel (form) is shown, full width.

### Left Panel —” Slideshow

- Stores slide images in `public/slides/` —” filenames: `1.png`, `2.png`, `3.png`, etc.
- Auto-advances every **6 seconds** using `setInterval`
- Respects `prefers-reduced-motion` —” skip interval if user has motion reduction enabled
- Active slide fades in with `opacity: 1`, inactive at `opacity: 0`, both with `transition: opacity 0.8s ease`
- Stacked absolutely inside a relative container; only the active index is visible

```js
const slides = ['/slides/1.png', '/slides/2.png', '/slides/3.png'];
// Add more slides here for future projects —” just drop PNGs/JPGs into public/slides/
```

### Left Panel —” Interactive Dot Grid Animation

- Rendered on a `<canvas>` element that fills the left panel
- Only active on desktop (skipped if `window.innerWidth < 1024`)
- Grid of dots spaced 28px apart, radius 1.8px
- On mouse hover: dots within 120px radius get **repelled** away from cursor
- Dots use lerp (0.08) to smoothly return to resting position when cursor leaves
- Dot color: `rgba(255,255,255,0.18)` in dark mode, `rgba(0,0,0,0.12)` in light mode
- Canvas pointer events disabled (`pointerEvents: 'none'`)

### Right Panel —” Auth Card

- Centered vertically and horizontally
- `background: var(--admin-card)`, `border: 1px solid var(--admin-border)`, `borderRadius: var(--admin-radius-lg)`
- `boxShadow: var(--admin-shadow)`
- Contains: logo, app name, dynamic title, form, footer links

### Dynamic Auth Forms

> The form fields and modes are **project-specific** —” replace labels, fields, and endpoints per project.

The reference implementation has these modes (adapt freely):

| Mode key | Title | Fields shown |
|---|---|---|
| `login` | Sign In | Employee ID / Username, Password |
| `activate-verify` | Activate Account | Employee ID, Email |
| `activate-complete` | Complete Activation | Name, Password, Confirm Password, Profile Photo |
| `forgot` | Forgot Password | Email |

**Mode switching:** clicking footer links calls `switchMode(key)` which resets irrelevant form fields and clears validation errors.

### Form Field Styles

```js
const inputStyle = {
    width: '100%',
    padding: '0.65rem 0.85rem',
    borderRadius: 10,
    border: `1px solid ${errors.field ? '#f87171' : 'var(--admin-border-strong)'}`,
    background: 'var(--admin-bg-secondary)',
    color: 'var(--admin-text-primary)',
    fontSize: '0.875rem',
    outline: 'none',
    fontFamily: 'inherit',
};
```

### Submit Button

```js
const btnStyle = {
    width: '100%',
    padding: '0.7rem',
    borderRadius: 10,
    border: 'none',
    background: 'var(--admin-accent)',
    color: '#fff',
    fontWeight: 700,
    fontSize: '0.9rem',
    cursor: isLoading ? 'not-allowed' : 'pointer',
    opacity: isLoading ? 0.7 : 1,
    transition: 'opacity 0.15s',
};
```

### Password Visibility Toggle

Show/hide password via a toggle button inside the input wrapper:
- Icon: `bi-eye` / `bi-eye-slash`
- Position: `absolute right: 0.75rem, top: 50%, transform: translateY(-50%)`
- Input wrapper: `position: relative`

### Theme Toggle on Login Page

A small sun/moon icon button in the top-right corner of the page. Clicking toggles `darkMode` state which also updates `data-theme` on `<html>` and persists to `localStorage`.

---

## 7. Sidebar

### Behavior

| State | Width | Trigger |
|---|---|---|
| Expanded (desktop) | 280px | Default or user clicked expand |
| Collapsed (desktop) | 68px | User clicked collapse toggle |
| Mobile overlay | 280px | Triggered by hamburger in topbar |
| Mobile hidden | off-screen (translateX -100%) | Default on mobile |

- State persisted in `localStorage` under `'sb-collapsed'` (`'1'` = collapsed)
- On mobile, sidebar is always full-width (280px) regardless of `collapsed` state
- Sidebar transition: `width 0.2s ease`, `padding 0.2s ease`
- Mobile open/close: `transform: translateX(-100%)` â†’ `translateX(0)` via `transition: transform 0.22s ease`

### Structure

```
â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
â”‚  [Role icon]  App Name           â”‚ â† sb-brand
â”‚               Role label         â”‚
â”‚               [Collapse btn]     â”‚
â”‚ â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ â”‚
â”‚  [Icon]  Dashboard        [â—3]  â”‚ â† sb-link (with badge)
â”‚  [Icon]  Page A                  â”‚
â”‚  [Icon]  Page B (active)         â”‚ â† sb-link-active
â”‚  [Icon]  Page C                  â”‚
â”‚  ...                             â”‚
â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜
```

### Role-Based Navigation

Navigation links are **role-driven** —” define a `roleLinks` map and render the correct set based on the authenticated user's role. Each project will have different roles and pages; use placeholders as starting point:

```js
// TEMPLATE —” replace with your project's actual roles and pages
const roleLinks = {
    admin: [
        { href: '/admin',          label: 'Dashboard', icon: 'bi-grid-1x2-fill' },
        { href: '/admin/users',    label: 'Users',     icon: 'bi-people-fill' },
        { href: '/admin/settings', label: 'Settings',  icon: 'bi-gear-fill' },
        { href: '/admin/profile',  label: 'Profile',   icon: 'bi-person-badge-fill' },
    ],
    user: [
        { href: '/dashboard',      label: 'Dashboard', icon: 'bi-grid-1x2-fill' },
        { href: '/my-tasks',       label: 'My Tasks',  icon: 'bi-check2-square' },
        { href: '/profile',        label: 'Profile',   icon: 'bi-person-badge-fill' },
    ],
    // Add more roles as needed for your project
};

const roleHeaders = {
    admin: { icon: 'bi-shield-lock-fill', label: 'Admin Portal' },
    user:  { icon: 'bi-person-fill',      label: 'User Portal' },
};
```

### Notification Badges

Each nav link can show a badge with an unread count:
- **Collapsed mode:** small dot badge overlaid on the icon (`position: absolute`, `top: -4px`, `right: -4px`)
- **Expanded mode:** pill badge at the far right of the link row
- Badge style: `background: #f43f5e`, `color: #fff`, `borderRadius: 99`, `fontSize: 0.55—“0.6rem`
- Show `9+` when count exceeds 9

### Active Link Detection

```js
const isRoot = links[0].href === href; // Dashboard is root
const active = isRoot
    ? url === href || url.startsWith(href + '?')
    : url === href || url.startsWith(href + '/') || url.startsWith(href + '?');
```

### Sidebar CSS (inject via `<style>` tag in Sidebar component)

```css
.admin-sidebar {
    position: fixed; top: 0; left: 0; bottom: 0;
    width: 280px; padding: 1.5rem 1rem;
    background: linear-gradient(180deg, var(--admin-sidebar), rgba(8,14,22,0.98));
    border-right: 1px solid var(--admin-border);
    backdrop-filter: blur(16px);
    display: flex; flex-direction: column; gap: 1rem;
    overflow-y: auto; overflow-x: hidden;
    z-index: 1000;
    transition: width 0.2s ease, padding 0.2s ease;
}
.admin-sidebar.sb-collapsed { width: 68px; padding: 1.5rem 0.5rem; }

/* Light mode sidebar */
:root[data-theme="light"] .admin-sidebar {
    background: linear-gradient(180deg, var(--admin-sidebar), rgba(240,244,255,0.98));
}

.sb-link {
    display: flex; align-items: center; gap: 0.75rem;
    padding: 0.8rem 0.95rem; border-radius: 12px;
    color: var(--admin-text-secondary); text-decoration: none;
    font-size: 0.875rem; font-weight: 500;
    border: 1px solid transparent;
    transition: background 0.15s, color 0.15s;
    white-space: nowrap; overflow: hidden;
}
.sb-link:hover { background: rgba(59,130,246,0.08); color: var(--admin-text-primary); }
.sb-link-active {
    background: rgba(59,130,246,0.12);
    border-color: rgba(59,130,246,0.22);
    color: var(--admin-accent);
}
.sb-collapsed .sb-link { padding: 0.8rem; justify-content: center; gap: 0; }

/* Mobile */
@media (max-width: 767px) {
    .admin-sidebar { transform: translateX(-100%); transition: transform 0.22s ease; width: 280px !important; }
    .admin-sidebar.sb-mobile-open { transform: translateX(0); }
}
```

### Scrollbar (sidebar)
```css
.admin-sidebar::-webkit-scrollbar { width: 4px; }
.admin-sidebar::-webkit-scrollbar-track { background: transparent; }
.admin-sidebar::-webkit-scrollbar-thumb { background: var(--admin-border); border-radius: 4px; }
```

---

## 8. Navbar / Topbar

### Structure

```
â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
â”‚  [â˜° Hamburger (mobile)]  [Home > Section > Current Page]          â”‚
â”‚                                           [ðŸ”” Notif] [Avatar Pill] â”‚
â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜
```

### Topbar CSS

```css
.tb-root {
    position: sticky; top: 0; z-index: 900;
    display: flex; align-items: center; justify-content: space-between;
    padding: 0.45rem 1.25rem;
    background: rgba(10,15,26,0.88);          /* dark */
    border-bottom: 1px solid var(--admin-border);
    backdrop-filter: blur(16px);
    min-height: 44px;
}
:root[data-theme="light"] .tb-root {
    background: var(--admin-sidebar);
}
```

### Breadcrumb

Rendered inside the topbar, left side. Built from two props passed by every page:
- `title` — the current page name (always shown)
- `description` — parent segments like `"Section / Subsection"` (optional)

**Structure:**
```
Home  >  Section  >  Subsection  >  Current Page
[🏠 Home]  [›]  [muted]  [›]  [muted]  [›]  [bold primary]
```

**Segment parsing:**
```js
// description = "Analytics / Performance" or "Analytics · Performance" or "Analytics > Performance"
const segments = description
    ? description.split(/[\/\·>]+/).map(s => s.trim()).filter(Boolean)
    : [];
// segments = ['Analytics', 'Performance']
// title = 'Overview'  →  renders: Home > Analytics > Performance > Overview
```

**JSX structure:**
```jsx
<nav className="tb-breadcrumb" aria-label="breadcrumb">
    {/* Home — always first */}
    <Link href="/" className="tb-bc-item tb-bc-link tb-bc-home">
        <i className="bi bi-house-door" style={{ fontSize: '0.72rem' }} />
        <span>Home</span>
    </Link>

    {/* Middle segments from description prop */}
    {segments.map((seg, i) => (
        <span key={i} className="tb-bc-item">
            <i className="bi bi-chevron-right tb-bc-sep" />
            <span className="tb-bc-link tb-bc-past">{seg}</span>
        </span>
    ))}

    {/* Current page — always last, bold */}
    <span className="tb-bc-item">
        <i className="bi bi-chevron-right tb-bc-sep" />
        <span className="tb-bc-current">{title}</span>
    </span>
</nav>
```

**CSS (inject in Topbar `<style>` block):**
```css
.tb-breadcrumb {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 0;
    font-size: 0.78rem;
    line-height: 1;
}
.tb-bc-item {
    display: flex;
    align-items: center;
    gap: 3px;
}
.tb-bc-sep {
    font-size: 0.58rem;           /* smaller than text — subtle chevron */
    color: var(--admin-text-muted);
    margin: 0 3px;
}
.tb-bc-link {
    display: flex;
    align-items: center;
    gap: 4px;
    color: var(--admin-text-muted);
    text-decoration: none;
    font-weight: 500;
    font-size: 0.78rem;
    transition: color 0.12s;
}
.tb-bc-link:hover { color: var(--admin-accent); }
.tb-bc-past { color: var(--admin-text-muted); font-weight: 500; }
.tb-bc-current {
    color: var(--admin-text-primary);
    font-weight: 700;
    font-size: 0.8rem;            /* slightly larger than the muted segments */
}

/* Mobile: hide everything except current page title */
@media (max-width: 767px) {
    .tb-bc-home { display: none; }
    .tb-bc-past { display: none; }
    .tb-bc-sep  { display: none; }
    .tb-breadcrumb { min-width: 0; max-width: 100%; }
    .tb-bc-current {
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        max-width: 40vw;
        display: block;
    }
}
```

**Summary of behavior:**
| Breakpoint | What shows |
|---|---|
| Desktop/Tablet | Home icon + all middle segments + current page |
| Mobile | Current page title only, truncated with ellipsis at `max-width: 40vw` |

**How to use in a page:**
```jsx
<AppLayout title="Users" description="Admin">
// renders: Home > Admin > Users

<AppLayout title="Edit Profile" description="Settings / Account">
// renders: Home > Settings > Account > Edit Profile

<AppLayout title="Dashboard">
// renders: Home > Dashboard  (no middle segments)
```

### User Avatar Pill

```
[Avatar img]  [Name]        [â–¾]
              [Role label]
```

- Rounded pill shape: `borderRadius: 50px`
- `background: var(--admin-card)`, `border: 1px solid var(--admin-border)`
- Avatar: 28Ã—28px, `borderRadius: 50%`, `border: 2px solid rgba(59,130,246,0.45)`
- Clicking opens dropdown

### User Dropdown

Contains:
1. **Dark/Light mode toggle** —” animated toggle switch (36Ã—20px pill, sliding circle)
   - Dark mode: blue background, moon SVG icon
   - Light mode: gray background, sun SVG icon
2. **Divider line**
3. **Logout button** —” red text/hover state

### Logout Loading State

When logout is clicked:
1. Set `loggingOut = true` —” show full-screen overlay
2. After 1 second, navigate to `/logout`
3. Overlay shows: logo, app name, "Signing out—¦" text, animated progress bar

### Notification Bell

- Icon: `bi-bell-fill` or `bi-bell`
- Shows unread count badge if > 0
- Clicking opens a `NotificationPanel` (see Components section)

### Mobile Topbar

- Hamburger (`bi-list`) appears, triggers `mobileOpen` in AppLayout
- User info (name/role) hidden in pill —” only avatar visible
- Breadcrumb shows only current page title

---


## 9. Reusable Components

### 8.1 Card

Standard container for page sections:

```js
const cardStyle = {
    background: 'var(--admin-card)',
    border: '1px solid var(--admin-border)',
    borderRadius: 'var(--admin-radius)',
    padding: '1rem 1.25rem',
    boxShadow: 'var(--admin-shadow)',
};
```

Cards with a stronger border (for emphasis):
```js
border: '1px solid var(--admin-border-strong)'
```

### 8.2 Stat / Metric Card

Used on dashboards in a grid. On mobile: 2-column grid. On desktop: 3—“4 column grid.

```js
// 4-stat grid layout
<div style={{
    display: 'grid',
    gridTemplateColumns: bp === 'mobile' ? 'repeat(2, 1fr)' : 'repeat(4, 1fr)',
    gap: '1rem',
}}>
    {/* Each stat card */}
    <div style={{ ...cardStyle, display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
        <span style={{ fontSize: '0.75rem', color: 'var(--admin-text-muted)', fontWeight: 500 }}>
            Label
        </span>
        <span style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--admin-text-primary)' }}>
            {value}
        </span>
        <span style={{ fontSize: '0.72rem', color: '#4ade80' }}>+12% this period</span>
    </div>
</div>
```

### 8.3 Toast / Snackbar

Global toast notifications. Implemented via React context (`ToastProvider` wrapping the app).

```js
// In root layout, wrap children:
<ToastProvider>
    {children}
</ToastProvider>

// Usage in any component:
const toast = useToast();
toast('Saved successfully', 'success');
toast('Something went wrong', 'error');
toast('Please review before submitting', 'warning');
```

**Toast types and colors:**
| Type | Background | Border | Icon |
|---|---|---|---|
| `success` | `rgba(22,163,74,0.95)` | `#16a34a` | âœ“ |
| `error` | `rgba(220,38,38,0.95)` | `#dc2626` | âœ• |
| `warning` | `rgba(202,138,4,0.95)` | `#ca8a04` | âš  |
| `info` | `rgba(37,99,235,0.95)` | `#2563eb` | â„¹ |
| `approved` | `rgba(5,150,105,0.95)` | `#059669` | âœ“ |
| `rejected` | `rgba(239,68,68,0.95)` | `#ef4444` | âœ• |
| `submitted` | `rgba(37,99,235,0.95)` | `#2563eb` | â†‘ |

- Toast position: `top: 1.5rem, right: 1.5rem`, `position: fixed`, `z-index: 9999`
- Entrance: `opacity 0 â†’ 1`, `translateY(-12px) â†’ 0`, `transition: 0.2s`
- Auto-dismiss after 3500ms (configurable)
- Click to dismiss

### 8.4 Confirm Dialog

Global imperative confirm dialog via context. Replaces `window.confirm()`.

```js
// Wrap app:
<ConfirmProvider>{children}</ConfirmProvider>

// Usage:
const confirm = useConfirm();
const ok = await confirm('Are you sure you want to delete this?');
if (ok) doDelete();

// With async action (shows loading spinner until resolved):
await confirm('Submit this form?', async () => {
    await submitForm();
});
```

**Styles:**
- Overlay: `rgba(0,0,0,0.6)` backdrop, centered dialog
- Dialog: `var(--admin-card)` bg, `border-radius: 14px`, `maxWidth: 400px`
- Cancel button: transparent background, bordered
- Confirm button: `background: #ef4444` (red for destructive actions)
- Loading state: spinner SVG + "Processing—¦" text

### 8.5 Status Badge

```js
function StatusBadge({ status }) {
    const c = STATUS_COLORS[status] ?? STATUS_COLORS.draft;
    return (
        <span style={{
            display: 'inline-flex', alignItems: 'center',
            padding: '0.2rem 0.65rem', borderRadius: 99,
            fontSize: '0.72rem', fontWeight: 600,
            background: c.bg, color: c.color,
            border: `1px solid ${c.border}`,
            textTransform: 'capitalize',
        }}>
            {status?.replace(/_/g, ' ')}
        </span>
    );
}
```

### 8.6 Inline Skeleton (Reusable)

For shimmer placeholders within content (not full-page):

```js
// Skeleton component
function Skeleton({ width = '100%', height = 16, borderRadius = 6, style = {} }) {
    return (
        <div style={{
            width, height, borderRadius,
            background: 'linear-gradient(90deg, var(--admin-border) 25%, var(--admin-bg-secondary) 50%, var(--admin-border) 75%)',
            backgroundSize: '800px 100%',
            animation: 'skeleton-shimmer 1.4s infinite linear',
            flexShrink: 0,
            ...style,
        }} />
    );
}

// CSS (inject once):
// @keyframes skeleton-shimmer {
//     0%   { background-position: -400px 0; }
//     100% { background-position:  400px 0; }
// }
```

### 8.7 Avatar

```js
// Default avatar fallback: generate initials-based data URL
// or use a placeholder image at /images/default-avatar.png

function Avatar({ src, name, size = 36 }) {
    return (
        <div style={{
            width: size, height: size, borderRadius: '50%',
            overflow: 'hidden', flexShrink: 0,
            background: 'rgba(59,130,246,0.12)',
            border: '2px solid rgba(59,130,246,0.35)',
        }}>
            <img
                src={src || '/images/default-avatar.png'}
                alt={name}
                onError={e => { e.target.src = '/images/default-avatar.png'; }}
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
        </div>
    );
}
```

### 8.8 Search Input

```js
<div style={{ position: 'relative' }}>
    <i className="bi bi-search" style={{
        position: 'absolute', left: '0.75rem', top: '50%',
        transform: 'translateY(-50%)',
        color: 'var(--admin-text-muted)', fontSize: '0.85rem',
    }} />
    <input
        type="text"
        placeholder="Search..."
        value={search}
        onChange={e => setSearch(e.target.value)}
        style={{
            paddingLeft: '2.25rem', paddingRight: '0.85rem',
            paddingTop: '0.55rem', paddingBottom: '0.55rem',
            borderRadius: 10, width: '100%',
            border: '1px solid var(--admin-border-strong)',
            background: 'var(--admin-bg-secondary)',
            color: 'var(--admin-text-primary)',
            fontSize: '0.85rem', outline: 'none', fontFamily: 'inherit',
        }}
    />
</div>
```

### 8.9 Filter Pills / Tabs

```js
// Horizontal pill tabs for filtering
<div style={{
    display: 'flex', gap: '0.4rem',
    overflowX: bp === 'mobile' ? 'auto' : 'visible',
    flexWrap: bp === 'mobile' ? 'nowrap' : 'wrap',
    scrollbarWidth: 'none',
}}>
    {filters.map(f => (
        <button
            key={f.value}
            onClick={() => setActive(f.value)}
            style={{
                padding: '0.35rem 0.9rem', borderRadius: 99,
                border: `1px solid ${active === f.value ? 'var(--admin-accent)' : 'var(--admin-border)'}`,
                background: active === f.value ? 'rgba(59,130,246,0.12)' : 'transparent',
                color: active === f.value ? 'var(--admin-accent)' : 'var(--admin-text-muted)',
                fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer',
                whiteSpace: 'nowrap', flexShrink: 0,
            }}
        >
            {f.label}
        </button>
    ))}
</div>
```

### 8.10 Notification Panel

A slide-in panel from the right side of the topbar showing a list of notifications. Each notification:
- Shows an event description, timestamp, and "unread" dot
- Clicking marks it as read and navigates to the relevant route
- Has a "Mark all read" button at the top

### 8.11 Floating Action Button (FAB)

Used on mobile when a primary action button from the header needs to be accessible:

```js
<button style={{
    position: 'fixed', bottom: '1.5rem', right: '1.5rem', zIndex: 50,
    width: 56, height: 56, borderRadius: '50%',
    background: 'var(--admin-accent)', color: '#fff', border: 'none',
    fontSize: '1.5rem', cursor: 'pointer',
    boxShadow: '0 4px 20px rgba(59,130,246,0.45)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
}}>
    <i className="bi bi-plus" />
</button>
```

### 8.12 Return Remarks Banner

A yellow/warning banner displayed at the top of a page when content has been returned with remarks:

```js
{returnRemarks && (
    <div style={{
        padding: '0.75rem 1rem', borderRadius: 10,
        background: 'rgba(245,158,11,0.1)',
        border: '1px solid rgba(245,158,11,0.3)',
        color: '#fbbf24', fontSize: '0.85rem',
        display: 'flex', alignItems: 'flex-start', gap: '0.6rem',
    }}>
        <i className="bi bi-exclamation-triangle-fill" style={{ flexShrink: 0, marginTop: 2 }} />
        <span>{returnRemarks}</span>
    </div>
)}
```

### 8.13 useBreakpoint Hook

```js
function useBreakpoint() {
    const [w, setW] = useState(() => window.innerWidth);
    useEffect(() => {
        const h = () => setW(window.innerWidth);
        window.addEventListener('resize', h);
        return () => window.removeEventListener('resize', h);
    }, []);
    if (w >= 1024) return 'desktop';
    if (w >= 768)  return 'tablet';
    return 'mobile';
}

// Usage: const bp = useBreakpoint();
// Branch: bp === 'desktop', bp === 'tablet', bp === 'mobile'
```

---

## 10. Modals

All modals use a fixed fullscreen overlay + centered (or mobile bottom-sheet) dialog.

### 9.1 Standard Centered Modal

```js
// Overlay
<div style={{
    position: 'fixed', inset: 0, zIndex: 9000,
    background: 'rgba(0,0,0,0.6)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    padding: '1rem',
}}>
    {/* Dialog */}
    <div style={{
        background: 'var(--admin-card)',
        border: '1px solid var(--admin-border-strong)',
        borderRadius: bp === 'mobile' ? '20px 20px 0 0' : 14,
        width: '100%', maxWidth: 520,
        maxHeight: '90vh', overflowY: 'auto',
        boxShadow: '0 24px 60px rgba(0,0,0,0.5)',
    }}>
        {/* Header */}
        <div style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            padding: '1rem 1.25rem',
            borderBottom: '1px solid var(--admin-border)',
        }}>
            <span style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--admin-text-primary)' }}>
                Modal Title
            </span>
            <button onClick={onClose} style={{
                background: 'none', border: 'none', cursor: 'pointer',
                color: 'var(--admin-text-muted)', fontSize: '1rem',
            }}>âœ•</button>
        </div>
        {/* Body */}
        <div style={{ padding: '1rem 1.25rem' }}>
            {/* content */}
        </div>
        {/* Footer */}
        <div style={{
            padding: '0.85rem 1.25rem',
            borderTop: '1px solid var(--admin-border)',
            display: 'flex', justifyContent: 'flex-end', gap: '0.75rem',
        }}>
            <button onClick={onClose} style={cancelBtnStyle}>Cancel</button>
            <button onClick={onSubmit} style={primaryBtnStyle}>Save</button>
        </div>
    </div>
</div>
```

### 9.2 Mobile Bottom Sheet Modal

On mobile, modals slide up from the bottom:

```js
const modalStyle = bp === 'mobile'
    ? {
        position: 'fixed', bottom: 0, left: 0, right: 0,
        borderRadius: '20px 20px 0 0',
        maxHeight: '90vh', overflowY: 'auto',
        background: 'var(--admin-card)',
        animation: 'slideUp 0.25s ease',
      }
    : {
        background: 'var(--admin-card)',
        borderRadius: 14, width: '100%',
        maxWidth: 560, maxHeight: '90vh', overflowY: 'auto',
      };

// @keyframes slideUp { from { transform: translateY(100%) } to { transform: translateY(0) } }
```

Bottom sheet drag handle:
```js
<div style={{ display: 'flex', justifyContent: 'center', padding: '0.5rem 0 0' }}>
    <div style={{ width: 36, height: 4, borderRadius: 99, background: 'var(--admin-border-strong)' }} />
</div>
```

### 9.3 Validation / Warning Modal

Designed for displaying validation errors or warning messages with an optional list of affected items and a "Notify" action:

- Header: yellow warning icon (`#f59e0b`) in a rounded badge + title
- Body: description text + scrollable item list (each item has avatar, name, sub-label, reason)
- Each item can have a "Notify" button that posts to an API and changes to "âœ“ Notified"
- Footer: "Understood" close button

```js
// Usage
<ValidationModal
    title="Validation Issue"
    description="The following items require attention."
    items={[
        { name: 'John Doe', sub: 'Department A', reason: 'Missing required field',
          notifyPayload: { _url: '/api/notify/reminder', userId: 1 } }
    ]}
    onClose={() => setShowModal(false)}
/>
```

### 9.4 Full-Screen Modal (Mobile/Editor)

For complex forms on mobile that need full screen:

```js
const fullModalStyle = bp === 'mobile'
    ? { position: 'fixed', inset: 0, borderRadius: 0, zIndex: 200, overflowY: 'auto' }
    : { /* normal centered modal */ };
```

### 9.5 Two-Column Detail Modal (Desktop)

For record detail views:
- Left: navigation list (e.g., list of users/items)
- Right: detail panel for selected item
- On mobile: becomes a bottom sheet stacked view

### 9.6 Modal Button Styles

```js
const cancelBtnStyle = {
    padding: '0.5rem 1.25rem', borderRadius: 8,
    border: '1px solid var(--admin-border-strong)',
    background: 'transparent',
    color: 'var(--admin-text-secondary)',
    fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer',
};

const primaryBtnStyle = {
    padding: '0.5rem 1.25rem', borderRadius: 8, border: 'none',
    background: 'var(--admin-accent)', color: '#fff',
    fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer',
};

const dangerBtnStyle = {
    ...primaryBtnStyle,
    background: '#ef4444',
};
```

---


## 11. Animations & Transitions

All animations use CSS `@keyframes` injected inside component `<style>` tags.

### 10.1 Core Keyframes

```css
/* Progress bar slide (loading bars, logout screen) */
@keyframes plsSlide {
    0%   { transform: translateX(-100%); }
    50%  { transform: translateX(200%);  }
    100% { transform: translateX(200%);  }
}

/* Loading screen card pop-in */
@keyframes plsPop {
    from { opacity: 0; transform: scale(0.92) translateY(10px); }
    to   { opacity: 1; transform: scale(1)    translateY(0);     }
}

/* Skeleton shimmer */
@keyframes skeleton-shimmer {
    0%   { background-position: -400px 0; }
    100% { background-position:  400px 0; }
}
/* or (used in PageSkeletons): */
@keyframes sk-shimmer {
    0%   { background-position: -400px 0; }
    100% { background-position:  400px 0; }
}

/* Spinner (buttons, confirm dialog) */
@keyframes cd-spin {
    to { transform: rotate(360deg); }
}

/* Bottom sheet slide up */
@keyframes slideUp {
    from { transform: translateY(100%); }
    to   { transform: translateY(0);    }
}

/* Toast/notification entrance */
/* Handled via opacity + translateY React state toggle (no keyframe needed) */
```

### 10.2 Sidebar Collapse Transition

```css
.admin-sidebar { transition: width 0.2s ease, padding 0.2s ease; }
.app-main      { transition: margin-left 0.2s ease; }
```

After sidebar collapses/expands, dispatch a window resize event to reflow charts:
```js
useEffect(() => {
    const t = setTimeout(() => window.dispatchEvent(new Event('resize')), 220);
    return () => clearTimeout(t);
}, [collapsed]);
```

### 10.3 Login Screen Dot Repulsion

See Section 5 (Login Page) —” `ParticleCanvas` component. The dots use linear interpolation (`LERP = 0.08`) for smooth motion on every `requestAnimationFrame`.

### 10.4 Login Slide Transition

```js
// Active slide: opacity 1, inactive: opacity 0
// Transition: opacity 0.8s ease on the image wrapper
{slides.map((src, i) => (
    <img
        key={src}
        src={src}
        style={{
            position: 'absolute', inset: 0,
            width: '100%', height: '100%', objectFit: 'cover',
            opacity: i === activeSlide ? 1 : 0,
            transition: 'opacity 0.8s ease',
        }}
    />
))}
```

### 10.5 Page Navigation Skeleton

AppLayout listens to Inertia's `router.on('start')` / `router.on('finish')` events:
- On navigation start (GET only): set `navTarget` â†’ renders `<PageSkeleton url={navTarget} />`
- On navigation finish: clear `navTarget` after `Math.max(0, 220 - elapsed)` ms (minimum 220ms skeleton)
- Non-GET requests (POST, PATCH, DELETE) do not trigger page skeletons

### 10.6 Hover Micro-transitions

All interactive elements use `transition: background 0.15s, color 0.15s` or `transition: border-color 0.15s`.

---

## 12. Responsiveness

### Breakpoints

| Name | Width | Devices |
|---|---|---|
| `mobile` | < 768px | Phones (portrait & landscape) |
| `tablet` | 768—“1023px | iPad Mini, iPad, Android tablets |
| `desktop` | â‰¥ 1024px | Laptops, desktops, iPad Pro |

### Core Rules

1. **Desktop is the source of truth** —” never break the desktop layout; only layer on tablet/mobile styles
2. **Inline styles only** —” no Tailwind utility classes; conditional `style={{}}` objects based on `bp`
3. **CSS variables always** —” use `var(--admin-*)` tokens; never hardcode theme colors inline
4. **Sidebar offset** —” fixed/absolute elements (modals, bottom sheets) must account for sidebar width on tablet+:
   ```js
   const sidebarLeft = window.innerWidth >= 768
       ? parseInt(getComputedStyle(document.querySelector('.app-main')).marginLeft) || 0
       : 0;
   ```
5. **No horizontal scroll** —” every layout must be usable without horizontal scrolling
6. **Touch targets â‰¥ 44px** —” buttons and tappable rows on mobile must have sufficient padding

### Layout Patterns

#### Pattern A —” Two-Column Split (List + Detail)
| Breakpoint | Layout |
|---|---|
| Desktop | Fixed left panel (380px) + right detail panel, both visible |
| Tablet/Mobile | Full-width list; tap a row â†’ **bottom sheet** slides up (82vh) |

Bottom sheet: `position: fixed`, `bottom: 0`, `left: {sidebarLeft}`, `right: 0`, `border-radius: 20px 20px 0 0`, `animation: slideUp 0.25s ease`

#### Pattern B —” Full-Width Grid/Calendar
| Breakpoint | Layout |
|---|---|
| Desktop | Full multi-column grid with text content per cell |
| Tablet | Same grid, abbreviated labels, **dot indicators** instead of text |
| Mobile | Replace grid with **horizontal day strip** + vertical list; FAB for primary action |

#### Pattern C —” Index List Page
| Breakpoint | Layout |
|---|---|
| Desktop | Full table —” all columns, toolbar in one row |
| Tablet | Table drops secondary columns; toolbar may wrap |
| Mobile | **Card list** (replace table); search full-width; filter pills scroll horizontally |

Mobile card structure:
```
â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
â”‚ [Avatar]  Title (bold)             â”‚
â”‚           Subtitle (muted)         â”‚
â”‚                                    â”‚
â”‚ [Status]  [Date]  [Action icons]   â”‚
â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜
```

#### Pattern D —” Show/Detail Page
| Breakpoint | Layout |
|---|---|
| Desktop | `max-width: 900px`, centered; action buttons sticky top or bottom |
| Tablet | Full width; sidebar (if any) stacks below main |
| Mobile | Single column; **sticky bottom action bar** |

Sticky bottom bar:
```js
{
    position: 'sticky', bottom: 0,
    background: 'var(--admin-card)',
    borderTop: '1px solid var(--admin-border)',
    padding: '0.75rem 1rem',
    display: 'flex', gap: '0.5rem', justifyContent: 'flex-end',
}
```

#### Pattern E —” Editor / Multi-Section Form
| Breakpoint | Layout |
|---|---|
| Desktop | Multi-column sections, collapsible panels |
| Tablet | Single column, full-width inputs |
| Mobile | Same as tablet; modals go full-screen |

### Spacing by Breakpoint

| Element | Desktop | Tablet | Mobile |
|---|---|---|---|
| Page padding | `1rem 1.5rem` | `1rem 1.25rem` | `0.75rem 1rem` |
| Card padding | `1rem 1.25rem` | `0.9rem 1rem` | `0.75rem` |
| Card gap | `1rem` | `0.75rem` | `0.5rem` |
| Section gap | `0.75rem` | `0.5rem` | `0.5rem` |

### Stats Grid
```js
gridTemplateColumns: bp === 'mobile' ? 'repeat(2, 1fr)' : 'repeat(4, 1fr)'
```

### Table â†’ Cards on Mobile
```js
// Hide columns conditionally
{bp === 'desktop' && <td>{row.secondaryColumn}</td>}

// Always keep: primary identifier, status, date, primary action
// Always hide on mobile: IDs, computed fields, secondary dates
```

### Search + Filter Toolbar
- Desktop: `[Search] [Filter pills] [Action button]` in one row
- Mobile: search full-width top row, filter pills scroll horizontally below

### Modals on Mobile
```js
const modalInner = bp === 'mobile'
    ? { position: 'fixed', bottom: 0, left: 0, right: 0, borderRadius: '20px 20px 0 0', maxHeight: '90vh' }
    : { borderRadius: 14, width: '100%', maxWidth: 560, maxHeight: '90vh' };
```

---

## 13. Icons

**Library:** Bootstrap Icons (`bi-*`) —” loaded via CDN or npm package.

```html
<!-- CDN (add to root HTML) -->
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/font/bootstrap-icons.min.css">
```

```bash
# npm
npm install bootstrap-icons
# then import in app entry: import 'bootstrap-icons/font/bootstrap-icons.css'
```

### Usage

```jsx
<i className="bi bi-grid-1x2-fill" />
<i className="bi bi-people-fill" style={{ fontSize: '1.1rem', color: 'var(--admin-accent)' }} />
```

### Common Icons Used

| Purpose | Icon class |
|---|---|
| Dashboard | `bi-grid-1x2-fill` |
| Users | `bi-people-fill` |
| Profile | `bi-person-badge-fill` |
| Settings/gear | `bi-gear-fill` |
| Calendar | `bi-calendar-range-fill` |
| Chart/stats | `bi-bar-chart-steps` |
| Checkmark/task | `bi-check2-square` |
| File/document | `bi-file-earmark-check-fill` |
| Building/office | `bi-building-fill` |
| Database | `bi-hdd-stack-fill` |
| Logs/journal | `bi-journal-text` |
| CPU/ML | `bi-cpu-fill` |
| Award | `bi-award-fill` |
| History | `bi-clock-history` |
| Activity | `bi-activity` |
| Notification bell | `bi-bell-fill` |
| Search | `bi-search` |
| Filter | `bi-funnel-fill` |
| Add/plus | `bi-plus-lg` |
| Edit/pencil | `bi-pencil-fill` |
| Delete/trash | `bi-trash3-fill` |
| Eye (view) | `bi-eye-fill` |
| Download/export | `bi-download` |
| Upload | `bi-upload` |
| Chevron right | `bi-chevron-right` |
| Chevron left | `bi-chevron-left` |
| Chevron down | `bi-chevron-down` |
| Close/X | `bi-x-lg` |
| Hamburger | `bi-list` |
| Home | `bi-house-door` |
| Back arrow | `bi-arrow-left` |
| Check circle | `bi-check-circle-fill` |
| Warning | `bi-exclamation-triangle-fill` |
| Info | `bi-info-circle-fill` |
| Lock | `bi-shield-lock-fill` |
| Plug/integration | `bi-plug-fill` |
| Logout | `bi-box-arrow-right` |

### Custom SVG Icons

For icons not in Bootstrap Icons, use inline SVGs:
```jsx
// Moon icon (dark mode indicator)
<svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2.5" strokeLinecap="round">
    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
</svg>

// Sun icon (light mode indicator)
<svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2.5" strokeLinecap="round">
    <circle cx="12" cy="12" r="4"/>
    {/* ... ray lines */}
</svg>
```

---

## 14. Loading Screen

### Post-Login Loading Screen

Displayed immediately after a successful login before the first page renders. Triggered by a `flash.just_logged_in` flag from the server.

**Behavior:**
1. Full-screen overlay renders on top of everything (`z-index: 9999`)
2. Card pops in with `plsPop` animation (scale + translateY)
3. Progress bar animates with `plsSlide` (infinite sliding gradient)
4. After **1400ms**: begin fade-out (`opacity â†’ 0`, `transition: 0.5s`)
5. After **1900ms**: remove from DOM entirely

**Structure:**
```
Full-screen overlay (var(--pls-bg))
â””â”€â”€ Card (var(--pls-card), border-radius: 20px, pop-in animation)
    â”œâ”€â”€ Logo image (64Ã—64px, border-radius: 14px)
    â”œâ”€â”€ App name (1.4rem, weight 800)
    â”œâ”€â”€ Subtitle "Loading your portal—¦" (0.82rem, muted)
    â””â”€â”€ Progress track (180Ã—4px, rounded)
        â””â”€â”€ Bar (45% width, gradient #3b82f6 â†’ #6366f1, plsSlide animation)
```

**CSS variables for loading screen (theme-aware):**
```css
:root[data-theme="dark"], :root {
    --pls-bg:     #0f1117;
    --pls-card:   #1a1d27;
    --pls-border: rgba(255,255,255,0.08);
    --pls-title:  #f1f5f9;
    --pls-sub:    rgba(241,245,249,0.45);
    --pls-track:  rgba(255,255,255,0.08);
    --pls-bar1:   #3b82f6;
    --pls-bar2:   #6366f1;
}
:root[data-theme="light"] {
    --pls-bg:     #f0f4f8;
    --pls-card:   #ffffff;
    --pls-border: rgba(0,0,0,0.08);
    --pls-title:  #0f172a;
    --pls-sub:    rgba(15,23,42,0.45);
    --pls-track:  rgba(0,0,0,0.08);
}
```

### Logout Loading State

Same card design, inline within the Topbar component. Triggered when user clicks Logout:
1. Show full-screen overlay (same card style, "Signing out—¦" subtitle)
2. After 1 second, navigate to `/logout`
3. Logo: `/images/pms-logo.png` (or your project's logo)

---

## 15. Loading Skeletons

### Purpose

During Inertia page navigation, instead of a blank flash, render a **page-specific skeleton** that matches the layout of the destination page. AppLayout renders the correct skeleton based on the navigation target URL.

### Shimmer Style (all skeletons share this)

```js
const shimmerStyle = {
    background: 'linear-gradient(90deg, var(--admin-border) 25%, var(--admin-bg-secondary) 50%, var(--admin-border) 75%)',
    backgroundSize: '800px 100%',
    animation: 'sk-shimmer 1.4s infinite linear',
};

// @keyframes sk-shimmer { 0%{background-position:-400px 0} 100%{background-position:400px 0} }
```

### Skeleton Building Blocks

```js
// Horizontal bar
const Sh = ({ h, w = '100%', r = 6 }) => (
    <div style={{ height: h, width: w, borderRadius: r, marginBottom: 8, flexShrink: 0, ...shimmerStyle }} />
);

// Pill/badge shape
const pill = (w, h = 28) => (
    <div style={{ width: w, height: h, borderRadius: 99, flexShrink: 0, ...shimmerStyle }} />
);

// Round avatar
const avatar = (size = 36) => (
    <div style={{ width: size, height: size, borderRadius: '50%', flexShrink: 0, ...shimmerStyle }} />
);
```

### Skeleton Card Wrapper

```js
const skCard = {
    background: 'var(--admin-card)',
    border: '1px solid var(--admin-border-strong)',
    borderRadius: 'var(--admin-radius)',
    padding: '1.25rem',
};
```

### Page Skeleton Types

Define a skeleton for each page route pattern. AppLayout matches `navTarget` URL to the correct skeleton:

| Route pattern | Skeleton type |
|---|---|
| `/*/dashboard` | Stats grid + chart + table rows |
| `/*/index` list pages | Toolbar + table header + N shimmer rows |
| `/*/show` detail pages | Header bar + two-panel or single-column content |
| `/*/editor` form pages | Section headers + form field rows |
| `/*` fallback | Generic: 3 stat blocks + table |

### Dashboard Skeleton (generic)

```jsx
function DashboardSkeleton() {
    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {/* Stat cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '1rem' }}>
                {[0,1,2,3].map(i => (
                    <div key={i} style={skCard}>
                        <Sh h={10} w="55%" /><Sh h={28} w="70%" /><Sh h={8} w="40%" />
                    </div>
                ))}
            </div>
            {/* Chart placeholder */}
            <div style={{ ...skCard, height: 220 }} />
            {/* Table rows */}
            <div style={skCard}>
                {[0,1,2,3,4].map(i => (
                    <div key={i} style={{ display:'flex', gap:'1rem', padding:'0.6rem 0', borderBottom:'1px solid var(--admin-border)' }}>
                        {avatar(32)}<Sh h={14} w="30%" /><Sh h={14} w="20%" />{pill(60,20)}
                    </div>
                ))}
            </div>
        </div>
    );
}
```

### Index List Skeleton (generic)

```jsx
function IndexSkeleton() {
    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {/* Toolbar */}
            <div style={{ display:'flex', gap:'0.75rem', alignItems:'center' }}>
                <Sh h={36} w={220} r={10} />{pill(80,36)}{pill(80,36)}
                <div style={{ marginLeft:'auto' }}>{pill(100,36)}</div>
            </div>
            {/* Table */}
            <div style={skCard}>
                <div style={{ display:'flex', gap:'1rem', paddingBottom:'0.75rem', borderBottom:'1px solid var(--admin-border)' }}>
                    {['25%','20%','15%','20%','10%'].map((w,i) => <Sh key={i} h={10} w={w} />)}
                </div>
                {[0,1,2,3,4,5].map(i => (
                    <div key={i} style={{ display:'flex', gap:'1rem', padding:'0.7rem 0', borderBottom:'1px solid var(--admin-border)' }}>
                        {avatar(28)}<Sh h={12} w="22%" /><Sh h={12} w="17%" />{pill(70,22)}<Sh h={12} w="18%" />{pill(60,22)}
                    </div>
                ))}
            </div>
        </div>
    );
}
```

### Minimum Skeleton Duration

Always enforce a minimum display time of **220ms** to prevent flickering on fast connections:

```js
const MIN_SKELETON_MS = 220;
// On router 'finish': wait Math.max(0, MIN_SKELETON_MS - elapsed) before clearing navTarget
```

---

## 16. Frontend Folder Structure

This structure is for a **React + Inertia.js** project. Adapt paths for your framework.

```
resources/js/
â”œâ”€â”€ app.jsx                     # Entry point —” mounts React, Inertia setup
â”œâ”€â”€ bootstrap.js                # Axios defaults, Echo setup
â”‚
â”œâ”€â”€ Layouts/
â”‚   â”œâ”€â”€ AppLayout.jsx           # Authenticated layout (sidebar + topbar + content)
â”‚   â””â”€â”€ GuestLayout.jsx         # Unauthenticated layout (login page wrapper)
â”‚
â”œâ”€â”€ Components/
â”‚   â”œâ”€â”€ Sidebar.jsx             # Collapsible role-based sidebar
â”‚   â”œâ”€â”€ Topbar.jsx              # Sticky top navbar with breadcrumb + user pill
â”‚   â”œâ”€â”€ Snackbar.jsx            # Toast notification system (ToastProvider + useToast)
â”‚   â”œâ”€â”€ ConfirmDialog.jsx       # Imperative confirm dialog (ConfirmProvider + useConfirm)
â”‚   â”œâ”€â”€ LoginLoadingScreen.jsx  # Post-login animated loading overlay
â”‚   â”œâ”€â”€ PageSkeletons.jsx       # Route-matched page loading skeletons
â”‚   â”œâ”€â”€ Skeleton.jsx            # Inline shimmer skeleton component
â”‚   â”œâ”€â”€ ValidationModal.jsx     # Warning/validation modal with item list + notify
â”‚   â”œâ”€â”€ NotificationPanel.jsx   # Slide-in notification panel (bell icon)
â”‚   â”œâ”€â”€ ReturnRemarksBanner.jsx # Yellow banner for returned-with-remarks state
â”‚   â”œâ”€â”€ defaultAvatar.js        # Avatar src helper + onError fallback
â”‚   â”œâ”€â”€ useBreakpoint.js        # Responsive breakpoint hook
â”‚   â”œâ”€â”€ useNotificationListener.js  # WebSocket notification listener hook
â”‚   â””â”€â”€ Profile/
â”‚       â””â”€â”€ ProfileSettings.jsx # Profile settings form (avatar, name, password)
â”‚
â”œâ”€â”€ Pages/
â”‚   â”œâ”€â”€ Auth/
â”‚   â”‚   â”œâ”€â”€ Login.jsx           # Login + activate + forgot password page
â”‚   â”‚   â””â”€â”€ Activate.jsx        # Account activation redirect handler
â”‚   â”‚
â”‚   â”œâ”€â”€ [RoleA]/                # One folder per user role
â”‚   â”‚   â”œâ”€â”€ Dashboard.jsx
â”‚   â”‚   â”œâ”€â”€ Profile.jsx
â”‚   â”‚   â”œâ”€â”€ [FeatureA]/
â”‚   â”‚   â”‚   â”œâ”€â”€ Index.jsx       # List page
â”‚   â”‚   â”‚   â””â”€â”€ Show.jsx        # Detail page
â”‚   â”‚   â””â”€â”€ [FeatureB]/
â”‚   â”‚       â””â”€â”€ Index.jsx
â”‚   â”‚
â”‚   â”œâ”€â”€ [RoleB]/
â”‚   â”‚   â””â”€â”€ ...
â”‚   â”‚
â”‚   â””â”€â”€ Error.jsx               # Custom error page (404, 500, 503)
â”‚
public/
├── slides/                     # Login page slideshow images
│   ├── 1.png                   # Drop PNG/JPG files here: 1.png, 2.png, 3.png ...
│   ├── 2.png                   # Crossfade only (opacity 0.8s ease), auto-advance every 6s
│   └── README.md               # Placeholder: 'Drop slide images here as 1.png, 2.png, 3.png'
â”œâ”€â”€ images/
│   └── [your-logo].png         # App logo — replace with your project logo (used in loading screens)
â””â”€â”€ sounds/
    â””â”€â”€ notifications/
        â””â”€â”€ new-notification.wav  # Notification sound (optional)
```

### Naming Conventions

- **Components:** PascalCase (`Sidebar.jsx`, `TopBar.jsx`)
- **Hooks:** camelCase with `use` prefix (`useBreakpoint.js`, `useNotificationListener.js`)
- **Pages:** PascalCase, organized by role then feature
- **Index pages:** `Index.jsx` for list views
- **Detail pages:** `Show.jsx` for detail/form views
- **Helpers:** camelCase (`defaultAvatar.js`)

### Page Component Pattern

```jsx
// Every page follows this pattern
import AppLayout from '@/Layouts/AppLayout';

export default function MyPage({ /* Inertia-passed props */ }) {
    // state, effects, handlers

    return (
        <AppLayout title="Page Title" description="Section / Sub">
            {/* page content */}
        </AppLayout>
    );
}
```

### Placeholder "Under Development" Page

For sidebar links that lead to pages not yet built:

```jsx
export default function PlaceholderPage() {
    return (
        <AppLayout title="Coming Soon" description="[Your Section]">
            <div style={{
                display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center',
                minHeight: '50vh', gap: '1rem',
                color: 'var(--admin-text-muted)', textAlign: 'center',
            }}>
                <i className="bi bi-tools" style={{ fontSize: '3rem', opacity: 0.4 }} />
                <div style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--admin-text-secondary)' }}>
                    Under Development
                </div>
                <div style={{ fontSize: '0.85rem' }}>
                    This page is coming soon.
                </div>
            </div>
        </AppLayout>
    );
}
```

---

---

## 17. Fallback / Error Pages

Two types of error pages exist —” one for Inertia-handled errors and one for server-level errors that never reach the JS app.

---

### 17.1 Inertia Error Page (`Pages/Error.jsx`)

Used for HTTP errors that Laravel forwards to Inertia: **403, 404, 419, 429, 500**.

**Layout:** Uses `GuestLayout` (no sidebar/topbar). Centered card on the full-screen background. Dark/light mode toggle button fixed top-right.

**Per-status config map:**

```js
const ERRORS = {
    404: {
        icon: 'bi-map',
        title: 'Page Not Found',
        message: "The page you're looking for doesn't exist or has been moved.",
        color: '#3b82f6',
        bg: 'rgba(59,130,246,0.1)',
    },
    403: {
        icon: 'bi-shield-lock',
        title: 'Access Denied',
        message: "You don't have permission to view this page.",
        color: '#f59e0b',
        bg: 'rgba(245,158,11,0.1)',
    },
    419: {
        icon: 'bi-clock-history',
        title: 'Session Expired',
        message: 'Your session has expired. Please refresh the page and try again.',
        color: '#8b5cf6',
        bg: 'rgba(139,92,246,0.1)',
    },
    429: {
        icon: 'bi-speedometer2',
        title: 'Too Many Requests',
        message: "You've made too many requests. Please wait a moment before trying again.",
        color: '#f97316',
        bg: 'rgba(249,115,22,0.1)',
    },
    500: {
        icon: 'bi-exclamation-triangle',
        title: 'Server Error',
        message: 'Something went wrong on our end. Please try again later.',
        color: '#ef4444',
        bg: 'rgba(239,68,68,0.1)',
    },
};
```

**Card structure:**
```
â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
â”‚  [Icon badge —” colored circle]  â”‚
â”‚  Error {status}  (uppercase tag)â”‚
â”‚  Title (1.5rem, weight 700)     â”‚
â”‚  Message (0.9rem, muted)        â”‚
â”‚  â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€  â”‚
â”‚  [Primary action button]        â”‚  â† "Go to Home" or "Refresh Page" (419)
â”‚  [Ghost "Go Back" button]       â”‚
â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜
Â© {year} App Name
```

**Icon badge:** `72Ã—72px` circle, `background: err.bg`, `border: 1.5px solid {color}33`

**Primary button:** full-width, `background: err.color`, white text, `border-radius: var(--admin-radius)`

**Ghost button:** full-width, transparent, `border: 1px solid var(--admin-border-strong)`, muted text

**Special case for 419 (session expired):** primary action is `window.location.reload()` instead of navigating home.

**Fallback:** any unknown status code falls back to the 500 config.

**Dark/light toggle:** same animated pill toggle as the topbar dropdown —” reads/writes `localStorage` `'theme'` and updates `data-theme` on `<html>`.

---

### 17.2 Server-Level Maintenance Page (`resources/views/errors/503.blade.php`)

This is a **pure HTML/CSS Blade file** —” no JavaScript framework, no Inertia, no React. It renders when the app is in maintenance mode before the JS app can boot.

**Design:** Matches the dark theme of the app exactly using hardcoded values (since CSS variables aren't available without the app running).

```
Background: linear-gradient(180deg, #0a0f1a 0%, #0f1724 100%)

Card:
  background: rgba(16,23,34,0.96)
  border: 1px solid rgba(59,130,246,0.22)
  border-radius: 12px
  max-width: 440px, centered

Icon badge: 72Ã—72px circle, blue shield SVG icon (#3b82f6)
Label: "503 —” Maintenance" (uppercase, blue, 0.72rem)
Title: "We'll be right back" (1.5rem, weight 700)
Message: maintenance description (muted, 0.9rem)
Divider: 1px solid rgba(140,171,214,0.12)
Footer: Â© {year} App Name
```

**Hardcoded dark-only values to use** (since no theme toggle is available here):
| Token | Value |
|---|---|
| Body bg | `linear-gradient(180deg, #0a0f1a 0%, #0f1724 100%)` |
| Card bg | `rgba(16,23,34,0.96)` |
| Card border | `rgba(59,130,246,0.22)` |
| Text primary | `#f4f8ff` |
| Text muted | `#6f83a6` |
| Accent | `#3b82f6` |
| Shadow | `0 18px 40px rgba(0,0,0,0.28)` |

**Font:** `'Inter', system-ui, sans-serif` (no Google Fonts CDN needed —” system fallback is fine for a maintenance page)


---

## 18. Phase-by-Phase Agent Prompts

> **How to use these prompts:**
> Before running any phase, always attach two things to your message to the coding agent:
> 1. **`Template.md`** - this file
> 2. **All screenshots inside the `UI/` folder** - the visual reference for the exact design
>
> Every prompt below begins with an instruction telling the agent to read `Template.md` and
> study every screenshot in `UI/` before writing a single line of code.
> The agent must match the screenshots pixel-accurately - the template describes the system,
> the screenshots show exactly how it looks.

---

### PHASE 0 - Project Setup

```
Read Template.md fully. Open and study every screenshot in the UI/ folder before writing any code.
The screenshots are the visual source of truth - match them exactly.

Project name: "[PROJECT NAME]"
Tech stack: [e.g. Laravel 11 + Inertia.js + React, or Next.js - specify here]

Setup tasks:
1. Install dependencies per Template.md Section 1
2. Load Inter font + Bootstrap Icons in root HTML
3. Add all CSS custom properties from Template.md Section 2 to the global stylesheet
4. Set up body background (radial + linear gradient per Section 2)
5. Create the full folder structure from Template.md Section 15

Do NOT create any pages yet. Confirm setup and list what was created.
```

---

### PHASE 1 - AppLayout + Sidebar + Topbar

```
Read Template.md Sections 4, 6, 7. Study all screenshots in UI/ before writing any code.
Match the screenshots exactly - sidebar, topbar height, breadcrumb, user pill, hover states.

Build:

1. Layouts/AppLayout.jsx
   - Dark/light mode (localStorage key: "theme")
   - Sidebar collapse (localStorage key: "sb-collapsed")
   - Mobile sidebar + backdrop overlay
   - Page skeleton: navTarget state, router start/finish, min 220ms display
   - Sidebar: 280px expanded, 68px collapsed
   - All --admin-* CSS variables (dark + light) in a <style> block
   - Body background: radial gradient top-left + linear gradient

2. Components/Sidebar.jsx
   - Placeholder roleLinks map (real routes added in Phase 5)
   - Brand: role icon + app name + role label + collapse toggle
   - Nav links: icon + label + unread badge
   - Active link detection per Template.md Section 6
   - Full CSS from Template.md Section 6 in <style>
   - Mobile: full-width overlay, slides in from left

3. Components/Topbar.jsx
   - Hamburger (mobile only), breadcrumb, notification bell placeholder
   - User avatar pill: avatar + name + role + dropdown
   - Dropdown: dark/light toggle + logout
   - Logout: 1s delay + loading overlay then navigate to /logout
```

---

### PHASE 2 - Login Page

```
Read Template.md Section 5. Study all screenshots in UI/ before writing any code.
Match the left panel gradient, slide images, dot animation, card, inputs, button, theme toggle.

File: Pages/Auth/Login.jsx

1. Two-panel layout:
   - LEFT (hidden mobile/tablet): gradient + slideshow + dot grid canvas
     Slides folder: create public/slides/ and add placeholder README.md inside:
       "Drop slide images here as 1.png, 2.png, 3.png etc."
     Slides array: ['/slides/1.png', '/slides/2.png', '/slides/3.png']
     Transition: opacity crossfade ONLY — opacity 0.8s ease, NO scroll/slide animation
     All images stacked absolutely (position: absolute, inset: 0), active = opacity 1, rest = opacity 0
     Auto-advance: setInterval 6000ms, respects prefers-reduced-motion (skip if reduced)
     Dot grid: repel on hover, desktop only (>= 1024px), canvas pointer-events none
   - RIGHT: auth card centered

2. Dynamic form modes (adapt to this project):
   - login: [YOUR FIELDS]
   - [ADD OTHER MODES your project needs]
   - Mode switch resets irrelevant fields + clears errors

3. Auth card:
   - Logo 64x64px border-radius 14px, app name 1.4rem weight 800
   - Dynamic title, inline error display, password show/hide, loading submit button

4. Theme toggle: fixed top-right, sun/moon animated pill
```

---

### PHASE 3 - Shared Components

```
Read Template.md Section 8. Study all screenshots in UI/ before writing any code.

1. Components/Snackbar.jsx - ToastProvider + useToast()
   Types: success, error, warning, info, approved, rejected, submitted
   Top-right fixed, opacity+translateY slide-in, auto-dismiss 3500ms

2. Components/ConfirmDialog.jsx - ConfirmProvider + useConfirm()
   confirm(msg) -> Promise<bool>, confirm(msg, asyncFn) -> spinner

3. Components/Skeleton.jsx - shimmer bar (width, height, borderRadius)
4. Components/ValidationModal.jsx - warning modal, item list, notify button
5. Components/LoginLoadingScreen.jsx - plsPop + plsSlide, fade at 1400ms, unmount at 1900ms
6. Components/ReturnRemarksBanner.jsx - yellow warning banner
7. Components/defaultAvatar.js - avatar src + onError fallback
8. Components/useBreakpoint.js - mobile < 768, tablet 768-1023, desktop >= 1024

Wrap AppLayout with ToastProvider and ConfirmProvider.
```

---

### PHASE 4 - Page Skeletons

```
Read Template.md Section 14. Study all screenshots in UI/ before writing any code.
Match the visual weight and proportions of the real pages from the screenshots.

File: Components/PageSkeletons.jsx

- PageSkeleton(url) returns the matching skeleton by URL pattern:
  dashboard -> DashboardSkeleton (stats grid + chart + table rows)
  index     -> IndexSkeleton (toolbar + table header + shimmer rows)
  show      -> ShowSkeleton (header bar + content sections)
  fallback  -> GenericSkeleton
- Shimmer: linear-gradient(90deg, var(--admin-border) 25%, var(--admin-bg-secondary) 50%, var(--admin-border) 75%)
  backgroundSize 800px, animation sk-shimmer 1.4s infinite
- Building blocks: Sh(bar), pill(rounded), avatar(circle)
- @keyframes sk-shimmer in a <style> tag
```

---

### PHASE 5 - Role Pages Scaffold

```
Read Template.md Section 15. Study all screenshots in UI/ before writing any code.
Match card styles, colors, spacing, and typography from the screenshots exactly.

User roles for this project: [LIST YOUR ROLES]

For each role create:
- Pages/[Role]/Dashboard.jsx - stats cards + activity table
- Pages/[Role]/Profile.jsx - wraps ProfileSettings
- Pages/[Role]/[Feature]/Index.jsx - list page
- Pages/[Role]/[Feature]/Show.jsx - detail page (if needed)

Every page must:
1. Wrap with AppLayout (title, description)
2. Use useBreakpoint() for responsive behavior
3. Inline styles only, var(--admin-*) tokens
4. Stats: 2-col mobile, 4-col desktop
5. Tables -> card list on mobile
6. Unbuilt pages: Under Development placeholder (Template.md Section 15)

Update roleLinks in Sidebar.jsx with real routes.
```

---

### PHASE 6 - Modals & Forms

```
Read Template.md Section 9. Study all screenshots in UI/ before writing any code.

For every modal:
- Desktop/tablet: centered, max-width 520px, border-radius 14px
- Mobile: bottom sheet, border-radius 20px 20px 0 0, slideUp animation
- Header: title + close button + border-bottom
- Body: scrollable, padding 1rem 1.25rem
- Footer: action buttons right-aligned, border-top

Inputs: var(--admin-bg-secondary) bg, border-strong border, #f87171 on error
Submit: var(--admin-accent) bg, loading spinner

Modals needed: [LIST YOUR PROJECT MODALS]

Each modal: close on overlay click, spinner during load, useToast() feedback, useConfirm() for destructive.
```

---

### PHASE 7 - Responsiveness Pass

```
Read Template.md Section 11. Study mobile/tablet screenshots in UI/ before writing any code.

Audit every page:
1. useBreakpoint() on all responsive pages
2. Fixed elements offset by sidebar width on tablet
3. Tables on mobile: card list, keep identifier+status+action, hide the rest
4. Modals on mobile: bottom sheet + slideUp
5. Stats: 2-col mobile
6. Filter pills: flexWrap nowrap + overflowX auto on mobile
7. Touch targets >= 44px on mobile
8. No horizontal scroll
9. Action buttons: FAB or sticky bottom bar on mobile
10. Spacing: reduce paddings on mobile per Template.md Section 11 table

Checklist:
[ ] Desktop unchanged
[ ] No horizontal scroll on mobile/tablet
[ ] Touch targets >= 44px
[ ] Fixed elements offset by sidebar on tablet
[ ] Tables replaced on mobile
[ ] Modals work on mobile
[ ] Stats grid 2-col on mobile
```

---

### PHASE 8 - Polish & Dark/Light Mode Verification

```
Read Template.md fully. Study all screenshots in UI/ one final time.

1. Toggle to light mode on every page - all colors must theme correctly via var(--admin-*)
2. Animations: sidebar 0.2s, skeleton >= 220ms, toasts slide top-right, mobile sidebar 0.22s
3. Typography: headings 700-800, body 0.85rem, muted 0.72-0.78rem
4. Spacing: card gap 1rem, card padding 1rem 1.25rem desktop / 0.75rem mobile
5. All buttons/links have transition 0.15s hover states
6. Profile page: avatar upload + preview, name/email form, password form

Report and fix all inconsistencies with the screenshots.
```

---

### PHASE 9 - Fallback & Error Pages

```
Read Template.md Section 16. Study all screenshots in UI/ before writing any code.

1. Pages/Error.jsx:
   - GuestLayout, centered card on full-screen background
   - 403, 404, 419, 429, 500 - each with unique icon, title, message, accent color
   - Icon badge: 72px circle with semi-transparent colored bg
   - 419: Refresh Page button. Others: Go to Home + Go Back ghost button
   - Dark/light toggle fixed top-right
   - Footer: (c) {year} [PROJECT NAME]

2. resources/views/errors/503.blade.php:
   - Pure HTML, no JS/framework - works when app is down
   - Dark theme hardcoded per Template.md Section 16.2
   - Inline shield SVG, no icon library
   - Footer: (c) [PROJECT NAME]
```

---

### QUICK REFERENCE - Add a Single Page or Component

```
Read Template.md fully. Study all screenshots in the UI/ folder.
Match the visual style of the existing pages exactly from the screenshots.

Add [PAGE/COMPONENT NAME] to [PROJECT NAME].

- Inline styles only (no Tailwind/CSS modules)
- var(--admin-*) tokens for all colors
- useBreakpoint() for responsive behavior
- Wrap with AppLayout (title, description) if it is a page
- Mobile: card list, bottom sheet modals, FAB for primary action

[Describe the feature/data this page or component needs to display]
```

---

*End of Template.md*
*Last generated from: Smart PMS (Laravel 11 + Inertia.js v2 + React 18)*
*Date: 2026-06-27*
