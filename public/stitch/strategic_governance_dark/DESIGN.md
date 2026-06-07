---
name: Strategic Governance Dark
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
  on-surface-variant: '#c3c6d7'
  inverse-surface: '#dee2f2'
  inverse-on-surface: '#2b303c'
  outline: '#8d90a0'
  outline-variant: '#434655'
  surface-tint: '#b4c5ff'
  primary: '#b4c5ff'
  on-primary: '#002a78'
  primary-container: '#2563eb'
  on-primary-container: '#eeefff'
  inverse-primary: '#0053db'
  secondary: '#ddb7ff'
  on-secondary: '#490080'
  secondary-container: '#6f00be'
  on-secondary-container: '#d6a9ff'
  tertiary: '#4edea3'
  on-tertiary: '#003824'
  tertiary-container: '#007d55'
  on-tertiary-container: '#bdffdb'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#dbe1ff'
  primary-fixed-dim: '#b4c5ff'
  on-primary-fixed: '#00174b'
  on-primary-fixed-variant: '#003ea8'
  secondary-fixed: '#f0dbff'
  secondary-fixed-dim: '#ddb7ff'
  on-secondary-fixed: '#2c0051'
  on-secondary-fixed-variant: '#6900b3'
  tertiary-fixed: '#6ffbbe'
  tertiary-fixed-dim: '#4edea3'
  on-tertiary-fixed: '#002113'
  on-tertiary-fixed-variant: '#005236'
  background: '#0e131e'
  on-background: '#dee2f2'
  surface-variant: '#303541'
typography:
  display-lg:
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
  title-md:
    fontFamily: Inter
    fontSize: 20px
    fontWeight: '600'
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
    letterSpacing: 0.05em
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  base: 4px
  xs: 8px
  sm: 16px
  md: 24px
  lg: 32px
  xl: 48px
  container-max: 1440px
  gutter: 24px
---

## Brand & Style
This design system is built for high-stakes decision-making and strategic oversight. The aesthetic is a fusion of **Corporate Modern** and **Glassmorphism**, optimized for long-duration focus in dark environments. The visual language conveys authority, precision, and systemic stability.

The interface prioritizes information density without sacrificing clarity, using a "Command Center" philosophy. Key characteristics include deep layered depth, subtle luminescence in interactive elements, and a high-contrast typographic hierarchy to ensure immediate data legibility.

## Colors
The palette is anchored by a deep navy foundation to reduce eye strain.
- **Base Surface:** #0a0f1a serves as the global canvas.
- **Elevated Surfaces:** Deep blue-tinted backgrounds (rgba(16,23,34,0.96)) provide semantic separation for containers.
- **Accents:** 
    - **Primary Blue:** Used for primary actions and system-critical focus states.
    - **Calibration Purple:** Reserved for advanced analytics and experimental data sets.
    - **Success Green & Warning Amber:** Utilized for status indicators and governance compliance alerts.
- **Text:** Pure white (#ffffff) is reserved for headers to maximize contrast, while muted grays are used for secondary data.

## Typography
Inter is used across all levels to maintain a systematic, functional feel. 
- **Headlines:** Use high-contrast white (#ffffff) and tighter letter-spacing for a bold, authoritative presence.
- **Body:** Use slightly muted white or high-gray to prevent "vibration" against the dark navy background.
- **Labels:** Uppercase styles with increased letter-spacing are used for data categorization and metadata to differentiate from prose.

## Layout & Spacing
The layout follows a **fluid-to-fixed grid** model. 
- **Desktop (12 columns):** 24px gutters with 48px side margins. Content is centered in a 1440px max-width container.
- **Tablet (8 columns):** 16px gutters with 32px margins. 
- **Mobile (4 columns):** 16px gutters with 16px margins.

Spacing follows an 8px rhythmic scale. Use `lg` (32px) for section padding and `sm` (16px) for internal card padding to ensure a dense, data-rich environment that remains readable.

## Elevation & Depth
This design system utilizes **Tonal Layering** combined with **Ambient Shadows**. Depth is communicated through color value and subtle transparency rather than heavy shadows.

- **Level 0:** Base Background (#0a0f1a).
- **Level 1:** Container Background (rgba(16,23,34,0.96)). 
- **Level 2:** Modals and Popovers. These feature a 1px inner border (stroke) of #ffffff10 to define edges against the dark background.
- **Shadows:** Use a deep, blue-tinted shadow for floating elements: `0 12px 24px -6px rgba(0, 0, 0, 0.5), 0 0 1px 0 rgba(37, 99, 235, 0.2)`. The subtle blue tint in the shadow grounds the element in the naval environment.

## Shapes
A consistent 12px radius (`rounded-lg` in this design system) is applied to all primary containers, buttons, and input fields. This creates a balance between a modern, approachable feel and a structured, professional appearance. Smaller utility elements (chips, tags) use a 4px or fully rounded pill shape depending on context.

## Components
- **Buttons:** Primary buttons use the #2563eb background with white text. Secondary buttons use a ghost style with a 1px border of #ffffff20.
- **Cards:** Use the deep blue-tinted container background. Ensure a 1px top-border of #ffffff05 to simulate a slight highlight from an overhead light source.
- **Inputs:** Darker than the container background to create an "inset" feel. Borders should glow slightly (Primary Blue) when focused.
- **Status Chips:** Use low-opacity backgrounds (15% alpha) of the success/warning colors with high-saturation text for readability.
- **Data Visualization:** Line charts and bars should use the Calibration Purple and Primary Blue, featuring subtle outer glows to suggest "active" data streams.
- **Lists:** Use subtle dividers (rgba(255,255,255,0.05)) and high-contrast labels for the first item column.