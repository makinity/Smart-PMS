---
name: Smart PMS Dark
colors:
  surface: '#0e131e'
  surface-dim: '#0e131e'
  surface-bright: '#343946'
  surface-container-lowest: '#090e19'
  surface-container-low: '#171b27'
  surface-container: '#1b1f2b'
  surface-container-high: '#252a36'
  surface-container-highest: '#303541'
  on-surface: '#dee2f2'
  on-surface-variant: '#c2c6d6'
  inverse-surface: '#dee2f2'
  inverse-on-surface: '#2b303c'
  outline: '#8c909f'
  outline-variant: '#424754'
  surface-tint: '#adc6ff'
  primary: '#adc6ff'
  on-primary: '#002e6a'
  primary-container: '#4d8eff'
  on-primary-container: '#00285d'
  inverse-primary: '#005ac2'
  secondary: '#b3c7ed'
  on-secondary: '#1c314f'
  secondary-container: '#334767'
  on-secondary-container: '#a2b6db'
  tertiary: '#4edea3'
  on-tertiary: '#003824'
  tertiary-container: '#00a572'
  on-tertiary-container: '#00311f'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#d8e2ff'
  primary-fixed-dim: '#adc6ff'
  on-primary-fixed: '#001a42'
  on-primary-fixed-variant: '#004395'
  secondary-fixed: '#d5e3ff'
  secondary-fixed-dim: '#b3c7ed'
  on-secondary-fixed: '#031c39'
  on-secondary-fixed-variant: '#334767'
  tertiary-fixed: '#6ffbbe'
  tertiary-fixed-dim: '#4edea3'
  on-tertiary-fixed: '#002113'
  on-tertiary-fixed-variant: '#005236'
  background: '#0e131e'
  on-background: '#dee2f2'
  surface-variant: '#303541'
typography:
  display:
    fontFamily: Inter
    fontSize: 48px
    fontWeight: '700'
    lineHeight: 56px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Inter
    fontSize: 32px
    fontWeight: '600'
    lineHeight: 40px
    letterSpacing: -0.01em
  headline-lg-mobile:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
  headline-md:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
  body-lg:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: '400'
    lineHeight: 28px
  body-md:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  body-sm:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  label-caps:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '600'
    lineHeight: 16px
    letterSpacing: 0.08em
  label-sm:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '500'
    lineHeight: 16px
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  base: 4px
  xs: 4px
  sm: 8px
  md: 16px
  lg: 24px
  xl: 32px
  gutter: 20px
  margin-mobile: 16px
  margin-desktop: 40px
---

## Brand & Style
The design system establishes a high-performance environment for government HR management. It balances the gravity of public service with a modern, technical edge. The aesthetic is rooted in **Corporate Modernism** with a **Subtle Glassmorphism** overlay, ensuring the interface feels like a precision instrument rather than a traditional bureaucratic tool. 

The visual narrative focuses on clarity, security, and efficiency. By utilizing deep navy tones and vibrant blue accents, the design system evokes a sense of "digital sovereignty" and institutional trust. The user experience is designed to reduce cognitive load during complex administrative tasks through spacious layouts and clear information hierarchy.

## Colors
The palette is engineered for prolonged usage in dark environments, prioritizing legibility and reduced eye strain. 

- **Primary & UI Accents:** The vibrant blue (#3b82f6) is reserved for primary actions, progress indicators, and active states. 
- **Surface Strategy:** The background uses a deep navy to create a "void" effect, while cards and containers utilize a slightly lighter navy. These surfaces should employ a subtle backdrop blur (8px to 12px) when layered to enhance the glassmorphic depth.
- **Semantic Feedback:** Success, error, and warning colors are saturated to ensure they remain distinct against the dark background, following standard accessibility contrast ratios for functional UI elements.

## Typography
The system relies on **Inter** for its neutral, highly legible glyphs. The hierarchy is strictly enforced to manage the data-dense nature of HR portals.

- **Small Caps for Labels:** All administrative labels, table headers, and overline text must use the `label-caps` style. This creates a clear visual distinction between "metadata" and "user data."
- **Weight Usage:** Use SemiBold (600) for section headers and Medium (500) for interactive labels. Regular (400) is strictly for body copy and descriptive text.
- **Contrast:** Ensure `text_primary` is used for all headlines and inputs, while `text_muted` is applied to secondary descriptions and inactive labels.

## Layout & Spacing
The layout follows a **Fluid Grid** model with fixed maximum widths for content readability. 

- **Grid System:** A 12-column grid is used for desktop (1440px+), transitioning to 8 columns for tablets and 4 columns for mobile. 
- **Rhythm:** An 8px linear scale governs all padding and margins. Vertical rhythm is critical; maintain 32px (xl) between major sections and 16px (md) between related elements within a card.
- **Density:** For data-heavy views (e.g., employee lists, payroll tables), use a "compact" spacing mode where internal padding is reduced to 8px to maximize information density without sacrificing legibility.

## Elevation & Depth
Depth is created through a combination of **Tonal Layering** and **Glassmorphism**.

- **Shadows:** Use deep, low-opacity shadows for floating elements. 
  - *Standard Surface:* No shadow, defined by a `1px` solid border of `rgba(140, 171, 214, 0.12)`.
  - *Elevated (Modals/Popovers):* `0px 12px 32px rgba(0, 0, 0, 0.5)`.
- **Glass Effect:** Cards should have a subtle background transparency (approx. 80-90% opacity) and a `backdrop-filter: blur(12px)`. This prevents the dark UI from feeling "flat" and adds a premium, modern feel.
- **Borders:** Every container must have a subtle stroke to define its boundaries against the dark background. Use the defined border color to maintain a soft, cohesive look.

## Shapes
The design system uses a **Rounded** (Level 2) shape language to soften the professional tone and make the portal feel more approachable.

- **Containers:** Cards and primary containers use a `12px` (0.75rem) radius.
- **Large Elements:** Major layout sections or large banners may scale up to `rounded-xl` (24px).
- **Small Elements:** Tooltips and small badges should use `rounded-sm` (4px) to maintain sharpness at small scales.
- **Buttons:** Follow the standard `12px` radius to match the primary container language, creating a unified "modular" appearance.

## Components
- **Buttons:** Primary buttons use a solid `#3b82f6` fill with white text. Secondary buttons are "Ghost" style with the primary border color and `text_primary`.
- **Inputs:** Fields must have a background color of `#0a0f1a` (inset look) with a `1px` border. On focus, the border transitions to the primary blue with a subtle outer glow.
- **Cards:** The core of the portal. Use the glassmorphic treatment (blur + border). Headers within cards should use the `label-caps` typography style.
- **Chips/Badges:** Used for status (e.g., "Active", "Pending"). Use low-opacity versions of the semantic colors (e.g., Success green at 15% opacity) with high-contrast text of the same hue.
- **Lists & Tables:** Rows should have a subtle hover state (`rgba(255, 255, 255, 0.04)`) and be separated by the standard 1px border.
- **Progress Indicators:** Use the primary blue for "In Progress" and the success green for "Completed" tasks. Indicators should be thin (2px-4px) to maintain a refined look.