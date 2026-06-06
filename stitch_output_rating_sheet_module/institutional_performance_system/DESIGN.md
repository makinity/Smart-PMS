---
name: Institutional Performance System
colors:
  surface: '#faf8ff'
  surface-dim: '#dad9e1'
  surface-bright: '#faf8ff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f4f3fa'
  surface-container: '#eeedf4'
  surface-container-high: '#e9e7ef'
  surface-container-highest: '#e3e1e9'
  on-surface: '#1a1b21'
  on-surface-variant: '#444651'
  inverse-surface: '#2f3036'
  inverse-on-surface: '#f1f0f7'
  outline: '#757682'
  outline-variant: '#c5c5d3'
  surface-tint: '#4059aa'
  primary: '#00236f'
  on-primary: '#ffffff'
  primary-container: '#1e3a8a'
  on-primary-container: '#90a8ff'
  inverse-primary: '#b6c4ff'
  secondary: '#0058be'
  on-secondary: '#ffffff'
  secondary-container: '#2170e4'
  on-secondary-container: '#fefcff'
  tertiary: '#00311f'
  on-tertiary: '#ffffff'
  tertiary-container: '#004a31'
  on-tertiary-container: '#27c38a'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#dce1ff'
  primary-fixed-dim: '#b6c4ff'
  on-primary-fixed: '#00164e'
  on-primary-fixed-variant: '#264191'
  secondary-fixed: '#d8e2ff'
  secondary-fixed-dim: '#adc6ff'
  on-secondary-fixed: '#001a42'
  on-secondary-fixed-variant: '#004395'
  tertiary-fixed: '#6ffbbe'
  tertiary-fixed-dim: '#4edea3'
  on-tertiary-fixed: '#002113'
  on-tertiary-fixed-variant: '#005236'
  background: '#faf8ff'
  on-background: '#1a1b21'
  surface-variant: '#e3e1e9'
typography:
  headline-xl:
    fontFamily: Inter
    fontSize: 32px
    fontWeight: '700'
    lineHeight: 40px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
    letterSpacing: -0.01em
  headline-md:
    fontFamily: Inter
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 28px
  body-lg:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  body-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  label-md:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '600'
    lineHeight: 16px
    letterSpacing: 0.01em
  label-sm:
    fontFamily: Inter
    fontSize: 11px
    fontWeight: '500'
    lineHeight: 14px
  headline-xl-mobile:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '700'
    lineHeight: 32px
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  base: 4px
  unit-1: 0.25rem
  unit-2: 0.5rem
  unit-3: 0.75rem
  unit-4: 1rem
  unit-6: 1.5rem
  unit-8: 2rem
  container-max: 1280px
  gutter: 24px
  margin-mobile: 16px
---

## Brand & Style

This design system is engineered for high-stakes corporate and governmental performance management. The brand personality is **authoritative, transparent, and methodical**. It prioritizes clarity over decoration, aiming to evoke a sense of stability and institutional trust.

The visual style follows a **Corporate Modern** approach. It utilizes a structured grid, purposeful whitespace, and a refined color theory to manage high information density. The interface should feel like a precision tool—highly functional, unobtrusive, and exceptionally organized. Every element serves a functional purpose, reducing cognitive load for users managing complex data and performance metrics.

## Colors

The palette is rooted in a deep navy to establish a "source of truth" authority. 
- **Primary (Navy):** Used for global navigation, primary actions, and headers to anchor the experience.
- **Secondary (Blue):** Employed for interactive elements, links, and "Submitted" status indicators.
- **Status Accents:** Logic-driven application of color. **Amber (#F59E0B)** signifies "In-Progress" or "Draft" states. **Emerald (#10B981)** is reserved for "Validated," "Rated," or "Complete" states.
- **Neutral/Surface:** A layered grayscale approach using Light Gray (#F3F4F6) for the background to provide contrast against the White (#FFFFFF) content cards, ensuring clear separation of data modules.

## Typography

This design system uses **Inter** for all roles to leverage its exceptional legibility in data-heavy environments. The typographic scale is optimized for information density.

- **Headlines:** Use tighter letter spacing and heavier weights to provide immediate hierarchy.
- **Body Text:** Set at 14px (md) for standard data entry and 16px (lg) for long-form feedback or descriptions.
- **Labels:** Small, semi-bold, and occasionally all-caps (for sm) to categorize data points without competing with the data itself.
- **Data Display:** Numerical data should use tabular lining (if available in the implementation) to ensure columns of figures align perfectly for easy scanning.

## Layout & Spacing

The layout utilizes a **12-column fixed grid** on desktop, centered within a max-width container to maintain readability on ultra-wide monitors. 

- **Spacing Rhythm:** Based on a 4px baseline. Most components use 12px (unit-3) or 16px (unit-4) internal padding to maintain a professional, compact density suitable for expert users.
- **Desktop:** 24px gutters with 32px-48px vertical section spacing.
- **Tablet:** 8-column grid with 16px gutters.
- **Mobile:** Single column with 16px side margins. Cards should bleed to the edge or have minimal margins to maximize screen real estate for data tables.
- **Data Density:** In tables or list views, use "Compact" (8px vertical padding) and "Comfortable" (16px vertical padding) variants to allow users to control their information view.

## Elevation & Depth

Depth is conveyed through **Tonal Layers** rather than heavy shadows, maintaining a flat, professional aesthetic.

1.  **Level 0 (Background):** Light Gray (#F3F4F6) – The canvas.
2.  **Level 1 (Surface):** White (#FFFFFF) – Primary cards, content areas, and navigation bars. Use a very subtle 1px border (#E5E7EB) instead of a shadow to define edges.
3.  **Level 2 (Interaction):** When a user hovers over a card or a list item, apply a soft, diffused shadow (0px 4px 6px rgba(0, 0, 0, 0.05)) to indicate interactivity.
4.  **Level 3 (Overlay):** Modals and dropdowns use a slightly more pronounced shadow and a semi-transparent backdrop to focus attention on critical performance tasks.

## Shapes

The design system uses a **Soft** shape language. 
- **Standard Radius:** 4px (0.25rem) for buttons, input fields, and small UI elements. This provides a modern feel while maintaining a structured, "buttoned-up" appearance.
- **Large Radius:** 8px (0.5rem) for cards and main content containers.
- **Strictness:** Avoid pill-shaped buttons or fully rounded corners, as they appear too casual for a performance management context.

## Components

### Buttons
- **Primary:** Solid Navy (#1E3A8A) with white text. High contrast for key actions like "Submit" or "Save."
- **Secondary:** Outlined Blue (#3B82F6) with a 1px border.
- **Ghost:** No border or background; navy text. Used for less frequent actions like "Cancel."

### Performance Cards
- Statistics cards feature a large `headline-xl` value, a `label-sm` title, and a small trend indicator (using the Status Accents).
- Cards should have a 1px border (#E5E7EB) and no shadow in their default state.

### Calendar & Scheduling
- The calendar uses a strict grid with white backgrounds for "Active" days and light gray for "Out of Range" days.
- Current day is highlighted with a 2px bottom border in Primary Navy.

### Forms & Inputs
- **Labels:** High-contrast Navy, positioned above the field.
- **Inputs:** White background, 1px Gray-300 border. On focus, the border transitions to Secondary Blue with a subtle 2px outer glow.
- **Validation:** Error messages appear in a distinct red (if needed) or utilize the Amber/Emerald status colors for progress validation.

### Status Chips
- Small, uppercase labels with a light tinted background and dark foreground text (e.g., Emerald background at 10% opacity with Emerald text for "Rated").