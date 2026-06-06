---
name: Institutional Performance Framework
colors:
  surface: '#f8f9ff'
  surface-dim: '#cbdbf5'
  surface-bright: '#f8f9ff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#eff4ff'
  surface-container: '#e5eeff'
  surface-container-high: '#dce9ff'
  surface-container-highest: '#d3e4fe'
  on-surface: '#0b1c30'
  on-surface-variant: '#45474c'
  inverse-surface: '#213145'
  inverse-on-surface: '#eaf1ff'
  outline: '#75777d'
  outline-variant: '#c5c6cd'
  surface-tint: '#545f73'
  primary: '#091426'
  on-primary: '#ffffff'
  primary-container: '#1e293b'
  on-primary-container: '#8590a6'
  inverse-primary: '#bcc7de'
  secondary: '#4648d4'
  on-secondary: '#ffffff'
  secondary-container: '#6063ee'
  on-secondary-container: '#fffbff'
  tertiary: '#0b1426'
  on-tertiary: '#ffffff'
  tertiary-container: '#20283c'
  on-tertiary-container: '#888fa7'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#d8e3fb'
  primary-fixed-dim: '#bcc7de'
  on-primary-fixed: '#111c2d'
  on-primary-fixed-variant: '#3c475a'
  secondary-fixed: '#e1e0ff'
  secondary-fixed-dim: '#c0c1ff'
  on-secondary-fixed: '#07006c'
  on-secondary-fixed-variant: '#2f2ebe'
  tertiary-fixed: '#dae2fd'
  tertiary-fixed-dim: '#bec6e0'
  on-tertiary-fixed: '#131b2e'
  on-tertiary-fixed-variant: '#3f465c'
  background: '#f8f9ff'
  on-background: '#0b1c30'
  surface-variant: '#d3e4fe'
typography:
  headline-lg:
    fontFamily: Inter
    fontSize: 30px
    fontWeight: '600'
    lineHeight: 38px
    letterSpacing: -0.02em
  headline-md:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
    letterSpacing: -0.01em
  headline-sm:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: '600'
    lineHeight: 26px
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
  body-sm:
    fontFamily: Inter
    fontSize: 13px
    fontWeight: '400'
    lineHeight: 18px
  label-md:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '600'
    lineHeight: 16px
    letterSpacing: 0.05em
  label-sm:
    fontFamily: Inter
    fontSize: 11px
    fontWeight: '500'
    lineHeight: 14px
  mono-sm:
    fontFamily: JetBrains Mono
    fontSize: 12px
    fontWeight: '400'
    lineHeight: 16px
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  sidebar-width: 280px
  list-panel-width: 360px
  gutter: 1rem
  container-padding: 1.5rem
  stack-gap: 0.75rem
  section-gap: 2rem
---

## Brand & Style
The design system is engineered for high-stakes corporate and government performance monitoring. The brand personality is authoritative, transparent, and methodical. It prioritizes clarity of data over decorative elements, evoking an emotional response of security and rigorous oversight.

The visual style is **Corporate / Modern** with a focus on **Functional Minimalism**. It utilizes a systematic approach to information density, ensuring that complex performance metrics are scannable. The aesthetic relies on precise alignment, a restricted color palette, and subtle functional borders to define workspaces without visual noise.

## Colors
The palette is rooted in deep slate and navy tones to establish an institutional foundation. 

- **Primary (#1e293b):** Used for structural navigation and primary headers to ground the interface.
- **Secondary / Urgent (#6366f1):** An indigo reserved for primary actions and critical alerts.
- **Functional Accents:** 
    - **Amber (#f59e0b):** Specifically for "Requires Rating" and pending states.
    - **Emerald (#10b981):** Indicates completed actions or "Rated" status.
- **Neutrals:** A range of Cool Grays (Slate) is used for borders, secondary text, and background layering to maintain a clean, non-distracting workspace.

## Typography
This design system utilizes **Inter** for all UI roles to leverage its high legibility in data-dense environments. 

- **Headlines:** Use semi-bold weights with slight negative letter-spacing to maintain a compact, professional appearance.
- **Body:** The default size is 14px (`body-md`) for optimal balance between density and readability.
- **Labels:** Uppercase labels are used for category headers and table headers to create clear visual hierarchy.
- **Monospaced:** JetBrains Mono is used sparingly for ID numbers, timestamps, and data strings to assist in character recognition.

## Layout & Spacing
The system employs a **Split-Pane Layout** model, optimized for wide-screen monitors typical in corporate environments. 

1. **Global Sidebar:** Fixed 280px width, containing primary navigation.
2. **Master List Panel:** Fixed 360px scrollable column for record selection.
3. **Detail View:** Fluid workspace that expands to fill remaining space, utilizing a 12-column internal grid for form elements and data cards.

Spacing follows an 8px (0.5rem) linear scale. High information density is achieved by using `stack-gap` (12px) between list items and `container-padding` (24px) for major workspace boundaries.

## Elevation & Depth
Depth is conveyed through **Tonal Layers** and **Low-Contrast Outlines** rather than heavy shadows.

- **Level 0 (Background):** `Slate-50` for the main application canvas.
- **Level 1 (Panels):** Pure white surfaces with a 1px solid border (`Slate-200`). No shadow.
- **Level 2 (Interactive Cards/Modals):** Pure white surface with a subtle 1px border and a highly diffused 4px blur, 2% opacity black shadow.
- **Active State:** Elements being edited or focused use a 2px secondary color outline to signal interactivity without shifting layout.

## Shapes
The shape language is **Soft** and professional. 
- **Standard Elements:** Buttons, inputs, and cards use a `0.25rem` (4px) radius to maintain a precise, engineered feel.
- **Large Containers:** Modals or major panels use `0.5rem` (8px).
- **Status Badges:** Use a fully rounded pill shape to distinguish them from interactive buttons.

## Components

### Sidebar & Lists
- **Sidebar:** Dark themed (`#0f172a`), using high-contrast white text for active states and `Slate-400` for inactive states.
- **List Cards:** Interactive cards in the master panel use a vertical status indicator (3px border-left) colored by priority or status.

### Status Indicators
- **Chips:** Small, pill-shaped badges with a light background tint (10% opacity) of the status color and bold text of the 100% color.
- **Priority Badges:** High-contrast solid fills reserved for "Urgent" tasks only.

### Star Ratings
- **Input:** 5-star scale using Indigo for "Quality" and "Timeliness."
- **Empty State:** Outlined stars with `Slate-300`.
- **Filled State:** Solid Indigo. Interaction involves a subtle scale-up (1.1x) on hover.

### File Evidence Cards
- **Structure:** Horizontal layout with a file-type icon (e.g., PDF, DOCX) on the left.
- **Metadata:** Displays file name, size, and upload date using `body-sm`.
- **Actions:** Subtle "View" and "Download" ghost buttons appear on card hover.

### Input Fields
- Standardized 40px height. 
- Borders are `Slate-300`, turning `Indigo-500` on focus. 
- Labels are persistent and positioned above the input in `label-sm`.