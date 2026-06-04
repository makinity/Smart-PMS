---
name: Technical Precision
colors:
  surface: '#10131a'
  surface-dim: '#10131a'
  surface-bright: '#363941'
  surface-container-lowest: '#0b0e15'
  surface-container-low: '#191b23'
  surface-container: '#1d2027'
  surface-container-high: '#272a31'
  surface-container-highest: '#32353c'
  on-surface: '#e1e2ec'
  on-surface-variant: '#c2c6d6'
  inverse-surface: '#e1e2ec'
  inverse-on-surface: '#2e3038'
  outline: '#8c909f'
  outline-variant: '#424754'
  surface-tint: '#adc6ff'
  primary: '#adc6ff'
  on-primary: '#002e6a'
  primary-container: '#4d8eff'
  on-primary-container: '#00285d'
  inverse-primary: '#005ac2'
  secondary: '#b8c7e3'
  on-secondary: '#223147'
  secondary-container: '#39475e'
  on-secondary-container: '#a7b6d1'
  tertiary: '#b3c7ed'
  on-tertiary: '#1c314f'
  tertiary-container: '#7d91b5'
  on-tertiary-container: '#142a48'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#d8e2ff'
  primary-fixed-dim: '#adc6ff'
  on-primary-fixed: '#001a42'
  on-primary-fixed-variant: '#004395'
  secondary-fixed: '#d4e3ff'
  secondary-fixed-dim: '#b8c7e3'
  on-secondary-fixed: '#0c1c31'
  on-secondary-fixed-variant: '#39475e'
  tertiary-fixed: '#d5e3ff'
  tertiary-fixed-dim: '#b3c7ed'
  on-tertiary-fixed: '#031c39'
  on-tertiary-fixed-variant: '#334767'
  background: '#10131a'
  on-background: '#e1e2ec'
  surface-variant: '#32353c'
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
  code-sm:
    fontFamily: monospace
    fontSize: 13px
    fontWeight: '400'
    lineHeight: 18px
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  container-max: 1440px
  sidebar-width: 280px
  panel-right-width: 400px
  gutter: 24px
  stack-compact: 8px
  stack-default: 16px
  stack-loose: 32px
---

## Brand & Style
The design system for this professional UWP Editor is built on the principles of **High-Performance Modernism**. It is designed to facilitate deep focus and administrative efficiency within data-heavy environments. The aesthetic balances technical rigor with a sophisticated, futuristic interface.

The style leverages **Glassmorphism** and **Tonal Minimalism**. By utilizing deep navy surfaces with subtle radial gradients and varying levels of translucency, the system creates a multi-layered workspace that reduces cognitive load. The UI feels like a high-end command center—precise, reliable, and exceptionally fast.

## Colors
The palette is centered on a "Deep Space" hierarchy. The primary background uses a base of `#0a0f1a` with a subtle radial gradient emanating from the top-center to create depth.

- **Primary Accent:** Blue (`#3b82f6`) is used strictly for interactive elements and primary actions to guide the user's eye in complex views.
- **Surface Strategy:** Layers are distinguished by opacity rather than just hex changes. Cards and panels use semi-transparent fills to allow the background tint to bleed through slightly, maintaining a cohesive atmosphere.
- **Semantic Feedback:** High-contrast status colors (Amber, Green, Red) are used sparingly for immediate state recognition in Unit Work Plans.

## Typography
**Inter** is the sole typeface, chosen for its exceptional legibility in dense data grids and technical interfaces. 

- **Hierarchy:** High-density editing requires clear differentiation. Use `label-md` for metadata and section headers to provide structure without consuming vertical space.
- **Data Density:** `body-sm` is the workhorse for table content and tree views, ensuring maximum information visibility.
- **Readability:** Maintain tight letter spacing on headlines for a modern, compact look, while keeping standard spacing for body text to aid long-form administrative reading.

## Layout & Spacing
The layout follows a **Multi-Panel Fluid** approach, essential for UWP workflows. 

- **The Grid:** A 12-column system is used for dashboard views, but the primary editor uses a fixed-sidebar/fluid-content model.
- **Panels:** The interface supports "Drawer" patterns (right-side) for Unit details and "Tree" patterns (left-side) for navigation.
- **Density:** We utilize a "Compact" spacing rhythm. Internal card padding is set to 24px, but interactive list items and grid rows are reduced to 8px-12px vertical padding to maximize data display.
- **Sticky Elements:** Header bars and action bars are pinned with a `backdrop-filter: blur(12px)` to maintain context while scrolling through long plans.

## Elevation & Depth
Depth is communicated through **Backdrop Blurs** and **Tonal Layering** rather than traditional drop shadows.

- **Level 0 (Base):** The dark radial background.
- **Level 1 (Surface):** Sidebar and main content area with `rgba(7, 16, 25, 0.98)`.
- **Level 2 (Containers):** Cards and active panels using `rgba(16, 23, 34, 0.96)` with a 1px border of `rgba(140, 171, 214, 0.12)`.
- **Level 3 (Overlays):** Modals and dropdowns. These use a slightly lighter fill and a more pronounced border to pop against the darker editor layers.
- **Focus State:** Interactive elements utilize a subtle outer glow or "bloom" using the primary blue at 20% opacity.

## Shapes
The shape language is controlled and professional, using a "Medium-Rounded" system to soften the technical nature of the app without appearing overly casual.

- **Primary Containers:** Cards and large panels use a **12px** radius (`rounded-lg`).
- **Form Elements:** Buttons and Input fields use an **8px** radius (`rounded-md`).
- **Indicators:** Status tags and small badges use a **4px** radius or full pill-shape depending on the context.

## Components
Consistent component behavior is critical for a high-performance editor.

- **Inputs & Textareas:** Dark fills (`rgba(255, 255, 255, 0.05)`) with a subtle 1px border. On focus, the border transitions to Primary Blue with a 2px "inner-glow" effect.
- **Buttons:**
    - **Primary:** Solid Blue with white text.
    - **Secondary/Tool:** Tinted backgrounds (`rgba(59, 130, 246, 0.1)`) with blue text.
    - **Ghost/Add:** Dashed borders with centered icons for "Add Unit" or "Insert Row" actions.
- **Status Badges:** Compact labels with low-opacity backgrounds (15% of the status color) and high-saturation text for readability.
- **Tree Views:** Use 16px indentation per level. Hover states should highlight the entire row with a subtle background shift to `rgba(255,255,255,0.03)`.
- **Modals:** Centered with a backdrop overlay of `rgba(0, 0, 0, 0.6)` and a heavy blur on the background content.