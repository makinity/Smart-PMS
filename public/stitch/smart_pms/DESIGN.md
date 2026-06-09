---
name: Smart PMS
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
  secondary: '#4edea3'
  on-secondary: '#003824'
  secondary-container: '#00a572'
  on-secondary-container: '#00311f'
  tertiary: '#ffb95f'
  on-tertiary: '#472a00'
  tertiary-container: '#ca8100'
  on-tertiary-container: '#3e2400'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#d8e2ff'
  primary-fixed-dim: '#adc6ff'
  on-primary-fixed: '#001a42'
  on-primary-fixed-variant: '#004395'
  secondary-fixed: '#6ffbbe'
  secondary-fixed-dim: '#4edea3'
  on-secondary-fixed: '#002113'
  on-secondary-fixed-variant: '#005236'
  tertiary-fixed: '#ffddb8'
  tertiary-fixed-dim: '#ffb95f'
  on-tertiary-fixed: '#2a1700'
  on-tertiary-fixed-variant: '#653e00'
  background: '#0e131e'
  on-background: '#dee2f2'
  surface-variant: '#303541'
typography:
  display-lg:
    fontFamily: Inter
    fontSize: 36px
    fontWeight: '700'
    lineHeight: '1.2'
    letterSpacing: -0.02em
  display-lg-mobile:
    fontFamily: Inter
    fontSize: 28px
    fontWeight: '700'
    lineHeight: '1.2'
  headline-md:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '600'
    lineHeight: '1.3'
  headline-sm:
    fontFamily: Inter
    fontSize: 20px
    fontWeight: '600'
    lineHeight: '1.3'
  body-lg:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: '1.6'
  body-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: '1.5'
  label-mono:
    fontFamily: JetBrains Mono
    fontSize: 13px
    fontWeight: '500'
    lineHeight: '1.4'
    letterSpacing: 0.05em
  caption:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '500'
    lineHeight: '1.4'
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
  container-margin: 24px
  gutter: 16px
---

## Brand & Style
The design system for this performance management system is built on a foundation of **Authority, Precision, and Transparency**. Designed specifically for Philippine Local Government Units (LGUs), the visual language balances the gravity of public service with the efficiency of modern data analytics.

The aesthetic follows a **Corporate Modern** approach with a high-density, dark-mode default. It prioritizes information architecture over decorative elements, ensuring that government officials can monitor KPIs and budget allocations without visual fatigue. The interface feels institutional yet technologically advanced, utilizing subtle gradients and crisp outlines to create a structured, "command center" environment.

## Colors
The palette is rooted in a deep **Dark Navy** to provide a high-contrast backdrop for data visualization. 

- **Primary Blue (#3b82f6)** represents the digital transformation of government services.
- **Semantic Colors** (Emerald, Amber, Rose) are used strictly for performance indicators: Success for met targets, Warning for delayed projects, and Danger for budget overruns or critical failures.
- **Neutral Scales** utilize Slate tones to maintain legibility while reducing the harshness of pure black-and-white layouts.

## Typography
**Inter** is the workhorse of the design system, chosen for its exceptional legibility in data-heavy environments and its neutral, professional tone. 

- **Headings** use tighter letter spacing and heavier weights to command attention.
- **Body Text** uses Slate-300 to ensure high contrast against the Dark Navy background while preventing eye strain.
- **JetBrains Mono** is reserved for technical data: project IDs, budget codes, and numerical metrics, reinforcing the "system of record" feel.

## Layout & Spacing
The system employs a **12-column fluid grid** for desktop, transitioning to a **4-column grid** for mobile devices. 

- **Density:** As a PMS, the layout is "Comfortable-Compact." We use a 4px base unit.
- **Sidebars:** Desktop layouts feature a fixed 260px left-hand sidebar. This provides a persistent "Official" anchor for navigation.
- **Mobile:** The sidebar collapses into a bottom navigation bar for ergonomic thumb access, while the top area is reserved for the LGU Seal and Department name.
- **Sections:** Vertical spacing between cards and data sections is strictly 24px (lg) to allow the UI to breathe despite the high data density.

## Elevation & Depth
Depth in this design system is achieved through **Tonal Layering** rather than traditional shadows.

- **Level 0 (Background):** #0a0f1a. The foundation of the application.
- **Level 1 (Cards/Surfaces):** #111827. Raised slightly with a subtle 1px border (#1e293b).
- **Level 2 (Modals/Popovers):** #1e293b. These use a more pronounced but soft shadow (0 20px 25px -5px rgba(0,0,0,0.5)) to separate them from the card layer.
- **Glassmorphism:** Navigation sidebars and top headers use a subtle backdrop blur (12px) with 90% opacity to create a sense of persistent orientation.

## Shapes
The shape language is **Structured and Disciplined**. 

- **Primary Containers (Cards):** 12px (rounded-lg) creates a modern, approachable feel for high-level data.
- **Interactive Elements (Buttons/Inputs):** 8px (base roundedness) provides a sharper, more precise appearance for functional components.
- **Indicators (Badges):** Fully pill-shaped (999px) to distinguish status labels from clickable buttons.

## Components

### Buttons
- **Primary:** Solid #3b82f6 background with white text. High prominence.
- **Secondary:** Ghost/Outline style with a #1e293b border. Subtle hover state with a low-opacity blue fill.
- **Danger:** Solid #f43f5e for destructive actions like "Cancel Project" or "Delete Record."

### Data Tables
- **Structure:** Borderless rows. 1px solid #1e293b bottom-divider only.
- **Contrast:** Zebra striping is avoided; instead, use a subtle #1e293b background on hover to maintain focus.
- **Header:** Uppercase, JetBrains Mono labels for clarity.

### Inputs & Forms
- **Field Style:** Deep Navy background (#05080f) with a #1e293b border. 
- **Focus State:** 2px ring in #3b82f6.
- **Validation:** Error states use #f43f5e with accompanying helper text in the same color.

### Badges & Chips
- **Status Badges:** Pill-shaped. Use a 10% opacity background of the status color (e.g., 10% Emerald for "Completed") with 100% opacity text. This ensures readability without overwhelming the data-dense view.

### Navigation
- **Sidebar:** Features the LGU seal at the top. Active states use a 4px vertical "Primary Blue" bar on the left edge of the menu item and a subtle background highlight.
- **Tabs:** Horizontal underline style. The active tab has a #3b82f6 bottom border (2px) and white text; inactive tabs are Slate-400.

### Cards
- **Header:** Include a "Slot" for an icon or a specific "Official Seal" watermark at 5% opacity for formal reports.
- **Shadow:** Minimal. Focus on the #1e293b border for definition.