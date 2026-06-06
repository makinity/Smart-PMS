---
name: Accomplishments Enterprise
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
  on-surface-variant: '#434655'
  inverse-surface: '#213145'
  inverse-on-surface: '#eaf1ff'
  outline: '#737686'
  outline-variant: '#c3c6d7'
  surface-tint: '#0053db'
  primary: '#004ac6'
  on-primary: '#ffffff'
  primary-container: '#2563eb'
  on-primary-container: '#eeefff'
  inverse-primary: '#b4c5ff'
  secondary: '#4b41e1'
  on-secondary: '#ffffff'
  secondary-container: '#645efb'
  on-secondary-container: '#fffbff'
  tertiary: '#943700'
  on-tertiary: '#ffffff'
  tertiary-container: '#bc4800'
  on-tertiary-container: '#ffede6'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#dbe1ff'
  primary-fixed-dim: '#b4c5ff'
  on-primary-fixed: '#00174b'
  on-primary-fixed-variant: '#003ea8'
  secondary-fixed: '#e2dfff'
  secondary-fixed-dim: '#c3c0ff'
  on-secondary-fixed: '#0f0069'
  on-secondary-fixed-variant: '#3323cc'
  tertiary-fixed: '#ffdbcd'
  tertiary-fixed-dim: '#ffb596'
  on-tertiary-fixed: '#360f00'
  on-tertiary-fixed-variant: '#7d2d00'
  background: '#f8f9ff'
  on-background: '#0b1c30'
  surface-variant: '#d3e4fe'
typography:
  headline-lg:
    fontFamily: Inter
    fontSize: 30px
    fontWeight: '700'
    lineHeight: 38px
    letterSpacing: -0.02em
  headline-lg-mobile:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '700'
    lineHeight: 32px
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
  table-header:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '600'
    lineHeight: 16px
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  unit: 4px
  gutter: 16px
  margin-mobile: 16px
  margin-desktop: 32px
  container-max: 1440px
---

## Brand & Style

The design system is engineered for high-stakes enterprise performance management, where clarity, objectivity, and data integrity are paramount. The brand personality is **Professional, Analytical, and Empowering**, striking a balance between institutional reliability and modern efficiency.

The visual style follows a **Modern Corporate** aesthetic with a strong emphasis on **Information Density and Functional Minimalism**. 
- **Clarity over Decoration:** Every visual element must serve a functional purpose. Whitespace is used strategically to group related data points rather than purely for "breathability."
- **Layered Surfaces:** Depth is communicated through subtle tonal changes and precise borders rather than heavy shadows.
- **Workflow Efficiency:** The UI prioritizes "at-a-glance" comprehension, using high-contrast indicators and structured hierarchies to guide the user through complex appraisal cycles.

## Colors

The palette is rooted in a spectrum of "Trust Blues" and "Analytical Indigos."

- **Primary & Secondary:** Use Primary Blue (#2563EB) for critical actions and navigational highlights. Secondary Indigo (#4F46E5) is reserved for data visualization accents and interactive sub-elements.
- **Semantic Feedback:** Performance scores use Success Green (#059669) only for "Exceeds Expectations" or "Completed" states. Warning Amber (#D97706) is used exclusively for "Pending," "Draft," or "Action Required" statuses.
- **Neutrals:** A scale of cool grays (Slate) provides the structural foundation. In Light Mode, use `Slate-50` for backgrounds and `Slate-200` for borders.
- **Dark Mode Strategy:** Transition to a "deep navy" base (#0F172A). Use layered elevation (surface-container tokens) to distinguish between the background, cards, and drawers.

## Typography

The typography system uses **Inter** for its exceptional legibility in data-heavy environments. 

- **Data Tables:** Use `body-sm` for cell content to maximize information density without sacrificing readability. 
- **Numerical Data:** For performance scores and metrics, ensure `font-variant-numeric: tabular-nums` is applied to maintain vertical alignment in columns.
- **Hierarchy:** Use `label-md` (uppercase) for section headers within drawers and cards to create a clear "scan line" for the eye.
- **Responsiveness:** Headlines scale down on mobile, but body text remains constant at `14px` or `16px` to ensure accessibility during field-based reviews.

## Layout & Spacing

This design system utilizes a **12-column fluid grid** for dashboard views and a **fixed-width container** for individual accomplishment forms.

- **Spacing Rhythm:** Based on a 4px baseline grid. Use 16px (4 units) for standard gutters and 24px (6 units) for vertical section spacing.
- **High-Density Layouts:** For data tables, reduce row padding to 8px (2 units) vertically to allow more data to be visible above the fold.
- **Breakpoints:**
  - **Mobile (<768px):** Single column, full-width cards, bottom-sheet drawers.
  - **Tablet (768px - 1024px):** 2-column dashboard cards, side-drawers for "quick edits."
  - **Desktop (>1024px):** Full 12-column grid, persistent navigation, multi-pane drawers.

## Elevation & Depth

To maintain a professional, data-centric feel, depth is created through **Tonal Layering** and **Low-Contrast Outlines**.

- **Surface Tiers:**
  - `Level 0 (Background):` Light Gray or Deep Navy.
  - `Level 1 (Cards):` White/Dark Navy with a 1px border (`Slate-200` / `Slate-700`).
  - `Level 2 (Drawers/Floating):` Level 1 style + a soft, diffused shadow (0px 4px 20px, 5% opacity black).
- **Sticky Elements:** Sticky headers in data tables should use a subtle semi-transparent background blur (backdrop-filter: blur(8px)) to provide context of the content scrolling beneath them while maintaining focus.

## Shapes

The shape language is **Structured and Geometric**. We use "Soft" roundedness (4px - 8px) to feel modern while maintaining the rigid professional structure required for an enterprise tool.

- **Standard Elements:** 4px (0.25rem) for buttons, input fields, and tags.
- **Containers:** 8px (0.5rem) for cards and modals to provide a clear distinction from the page background.
- **Inputs:** Maintain sharp, clean edges to emphasize precision.

## Components

### Buttons & Controls
- **Primary Action:** Solid Primary Blue. No gradients.
- **Segmented Control:** Used for switching between 'My Accomplishments', 'Team View', and 'Archive'. Uses a toggle-group style with a sliding background indicator.
- **Status Badges:** 
  - **Draft:** Gray background, Dark Gray text.
  - **Submitted:** Blue background, White text.
  - **Endorsed:** Indigo background, White text.
  - **Released:** Green background, White text.

### Data Tables
- **Sticky Headers:** Always freeze the top row containing labels and the first column containing the Employee Name/ID.
- **Inline Summaries:** Use expandable rows (`Accordion` style) rather than navigating to a new page to view accomplishment details.

### Drawers
- **Interaction:** Avoid modals for editing. Use a right-aligned drawer (30% width) for "Add Accomplishment" or "Edit Rating" tasks. This allows the user to reference the main table data while inputting information.

### Status Timelines (Steppers)
- Horizontal on desktop, vertical on mobile.
- Use a "Connecting Line" metaphor. Completed steps use the Success Green; the active step uses a pulsing Primary Blue ring.