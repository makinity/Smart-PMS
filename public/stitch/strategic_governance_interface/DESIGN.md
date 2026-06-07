---
name: Strategic Governance Interface
colors:
  surface: '#f9f9fe'
  surface-dim: '#dad9de'
  surface-bright: '#f9f9fe'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f4f3f8'
  surface-container: '#eeedf2'
  surface-container-high: '#e8e8ed'
  surface-container-highest: '#e2e2e7'
  on-surface: '#1a1c1f'
  on-surface-variant: '#43474f'
  inverse-surface: '#2f3034'
  inverse-on-surface: '#f1f0f5'
  outline: '#737780'
  outline-variant: '#c3c6d1'
  surface-tint: '#3a5f94'
  primary: '#001e40'
  on-primary: '#ffffff'
  primary-container: '#003366'
  on-primary-container: '#799dd6'
  inverse-primary: '#a7c8ff'
  secondary: '#0051d5'
  on-secondary: '#ffffff'
  secondary-container: '#316bf3'
  on-secondary-container: '#fefcff'
  tertiary: '#1b1f20'
  on-tertiary: '#ffffff'
  tertiary-container: '#303436'
  on-tertiary-container: '#999c9e'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#d5e3ff'
  primary-fixed-dim: '#a7c8ff'
  on-primary-fixed: '#001b3c'
  on-primary-fixed-variant: '#1f477b'
  secondary-fixed: '#dbe1ff'
  secondary-fixed-dim: '#b4c5ff'
  on-secondary-fixed: '#00174b'
  on-secondary-fixed-variant: '#003ea8'
  tertiary-fixed: '#e0e3e5'
  tertiary-fixed-dim: '#c4c7c9'
  on-tertiary-fixed: '#191c1e'
  on-tertiary-fixed-variant: '#444749'
  background: '#f9f9fe'
  on-background: '#1a1c1f'
  surface-variant: '#e2e2e7'
typography:
  display-lg:
    fontFamily: Inter
    fontSize: 32px
    fontWeight: '700'
    lineHeight: 40px
    letterSpacing: -0.02em
  headline-md:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
    letterSpacing: -0.01em
  headline-sm:
    fontFamily: Inter
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 28px
  title-lg:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: '600'
    lineHeight: 24px
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
  data-mono:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '500'
    lineHeight: 20px
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  container-max: 1440px
  gutter: 1.5rem
  margin-page: 2rem
  stack-sm: 0.5rem
  stack-md: 1rem
  stack-lg: 2rem
---

## Brand & Style

The design system is engineered for high-stakes public sector performance tracking. It prioritizes **authoritative clarity**, **institutional trust**, and **operational efficiency**. The aesthetic leans heavily into **Corporate Modernism**, utilizing a structured layout that communicates stability and transparency.

The target audience includes government executives, department heads, and human resource practitioners who require a focused environment for evaluating strategic goals. The UI response is intentionally sober and functional, avoiding decorative flourishes in favor of data density and clear information hierarchy. Every element is designed to feel official, secure, and permanent.

## Colors

The palette is anchored by **Deep Navy (#003366)**, serving as the primary institutional color for headers, sidebars, and high-level navigation to establish authority. **Corporate Blue (#2563EB)** is reserved for primary interactive elements, ensuring action items are distinct from structural branding.

Backgrounds utilize a tiered system of **Neutral Grays**, specifically **Slate-50 (#F8FAFC)** for page backdrops to reduce eye strain during long-form data entry. Semantic colors follow strict accessibility guidelines:
- **Emerald (Success):** Used for "Released" or "Validated" statuses.
- **Amber (Warning):** Used for "Pending" or "In Review" states.
- **Rose (Error):** Reserved for "Returned", "Overdue", or "Non-compliant" flags.

## Typography

This design system utilizes **Inter** exclusively to leverage its exceptional legibility in data-heavy environments. The typographic scale is optimized for "Information Density"—allowing for complex performance matrices to be viewed with minimal scrolling.

Key typographic rules:
- **Tabular Numerals:** Use `tnum` settings for all numerical data in tables to ensure columns align perfectly for comparative analysis.
- **Contrast:** High-level headers use Semibold weights in Deep Navy, while body text uses Regular weight in Slate-900 for maximum readability.
- **Labels:** Small caps or uppercase labels with slight letter spacing are used for secondary metadata and table headers.

## Layout & Spacing

The layout follows a **Fixed-Fluid Hybrid** model. The primary sidebar remains fixed, while the content area utilizes a 12-column grid that scales to a maximum width of 1440px to prevent excessive line lengths on ultra-wide monitors.

**Grid Philosophy:**
- **Desktop:** 12 columns, 24px gutters, 32px page margins.
- **Tablet:** 8 columns, 16px gutters, 24px page margins.
- **Mobile:** 4 columns, 16px gutters, 16px page margins. Performance matrices should transition to "Card View" on mobile or provide horizontal scrolling with frozen ID columns.

Spacing is strictly based on a **4px baseline grid** to maintain mathematical alignment across complex form layouts and nested data tables.

## Elevation & Depth

To maintain a "Government Standard" professional feel, this design system avoids heavy shadows or floating effects. Instead, it uses **Tonal Layering** and **Structural Outlines**.

- **Level 0 (Background):** Slate-50 background.
- **Level 1 (Cards/Tables):** White surface with a 1px solid border in Slate-200. No shadow.
- **Level 2 (Modals/Dropdowns):** White surface with a 1px Slate-200 border and a subtle, high-diffusion "Soft Shadow" (0px 4px 12px rgba(0,0,0,0.05)) to indicate temporary overlay.
- **Active States:** Inset 2px borders in Corporate Blue are used to indicate focus and active selection, providing a tactile sense of interaction without skeuomorphism.

## Shapes

The design system uses a **Soft (0.25rem)** roundedness approach. This creates a balance between a modern, approachable interface and the rigid, structured nature of government reporting.

- **Primary Components:** (Buttons, Inputs, Small Cards) use a 4px (0.25rem) corner radius.
- **Surface Containers:** Large data panels and document previews may scale up to 8px (0.5rem) to soften large blocks of content.
- **Status Badges:** Use a "Pill" shape (full rounding) to clearly distinguish them from interactive buttons or input fields.

## Components

### Buttons & Controls
- **Primary:** Solid Corporate Blue with white text.
- **Secondary:** White background with 1px Slate-300 border.
- **Tertiary:** Ghost style, Navy text, used for "Cancel" or low-priority actions.

### Performance Indicators
- **Rating Cards:** Each rating (Outstanding, VS, Satisfactory, Unsatisfactory) is assigned a specific tonal background. Outstanding uses a light Indigo tint; VS uses a light Emerald tint.
- **Pipeline Stepper:** A vertical or horizontal progression indicator with "Validated" nodes turning Deep Navy and "Current" nodes highlighted in Corporate Blue.

### Data Tables (SMPOR Style)
- **Header:** Sticky headers with Slate-100 background and bold 12px uppercase labels.
- **Rows:** Zebra-striping every second row using Slate-50.
- **Cell Content:** Standardized padding of 12px vertical/16px horizontal to maximize data visibility.

### Audit & Documents
- **Audit Trail:** A vertical timeline component using thin Slate-200 lines and small circular status markers.
- **Document Preview:** A split-pane view with a "Metal" gray background for the PDF viewer and a white sidebar for metadata and comments.