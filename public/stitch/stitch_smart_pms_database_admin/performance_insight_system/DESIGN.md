---
name: Performance Insight System
colors:
  surface: '#0b1326'
  surface-dim: '#0b1326'
  surface-bright: '#31394d'
  surface-container-lowest: '#060e20'
  surface-container-low: '#131b2e'
  surface-container: '#171f33'
  surface-container-high: '#222a3d'
  surface-container-highest: '#2d3449'
  on-surface: '#dae2fd'
  on-surface-variant: '#c2c6d6'
  inverse-surface: '#dae2fd'
  inverse-on-surface: '#283044'
  outline: '#8c909f'
  outline-variant: '#424754'
  surface-tint: '#adc6ff'
  primary: '#adc6ff'
  on-primary: '#002e6a'
  primary-container: '#4d8eff'
  on-primary-container: '#00285d'
  inverse-primary: '#005ac2'
  secondary: '#bcc7de'
  on-secondary: '#263143'
  secondary-container: '#3e495d'
  on-secondary-container: '#aeb9d0'
  tertiary: '#b9c7e0'
  on-tertiary: '#233144'
  tertiary-container: '#8392a9'
  on-tertiary-container: '#1c2a3d'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#d8e2ff'
  primary-fixed-dim: '#adc6ff'
  on-primary-fixed: '#001a42'
  on-primary-fixed-variant: '#004395'
  secondary-fixed: '#d8e3fb'
  secondary-fixed-dim: '#bcc7de'
  on-secondary-fixed: '#111c2d'
  on-secondary-fixed-variant: '#3c475a'
  tertiary-fixed: '#d5e3fd'
  tertiary-fixed-dim: '#b9c7e0'
  on-tertiary-fixed: '#0d1c2f'
  on-tertiary-fixed-variant: '#3a485c'
  background: '#0b1326'
  on-background: '#dae2fd'
  surface-variant: '#2d3449'
typography:
  headline-lg:
    fontFamily: Inter
    fontSize: 32px
    fontWeight: '700'
    lineHeight: '1.2'
    letterSpacing: -0.02em
  headline-md:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '600'
    lineHeight: '1.3'
    letterSpacing: -0.01em
  headline-sm:
    fontFamily: Inter
    fontSize: 20px
    fontWeight: '600'
    lineHeight: '1.4'
    letterSpacing: -0.01em
  body-lg:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: '1.6'
    letterSpacing: '0'
  body-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: '1.5'
    letterSpacing: '0'
  label-caps:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '600'
    lineHeight: '1'
    letterSpacing: 0.05em
  label-sm:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '500'
    lineHeight: '1.4'
    letterSpacing: '0'
  headline-lg-mobile:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '700'
    lineHeight: '1.2'
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  container-padding: 1.25rem
  element-gap: 1rem
  grid-gutter: 1rem
  section-margin: 2rem
  sidebar-width: 260px
  sidebar-collapsed: 64px
---

## Brand & Style
The design system is engineered for high-stakes enterprise performance management. The brand personality is authoritative, analytical, and precise, designed to instill confidence in leadership and clarity for employees. 

The visual style follows a **Corporate / Modern** aesthetic with a heavy emphasis on data density and structural hierarchy. By utilizing a deep navy and slate foundation, the system reduces eye strain during long-form data review while allowing vibrant accent colors to highlight critical performance metrics and status indicators. The interface feels like a sophisticated mission control center: dark, focused, and efficient.

## Colors
The palette is built upon a layered dark-mode architecture.
- **Backgrounds:** The foundation is a deep slate-navy (#0f172a), providing a stable, high-contrast base for all elements.
- **Surfaces:** UI containers and cards utilize a slightly lighter slate (#1e293b) to create depth without relying on heavy shadows.
- **Accents:** The primary blue (#3b82f6) is reserved for interactive elements, focus states, and primary actions.
- **Feedback:** Semantic colors for success, warning, and danger are highly saturated to ensure they remain distinct against the dark backdrop, facilitating rapid scanning of performance health.

## Typography
This design system utilizes **Inter** for its exceptional legibility in data-heavy environments. 
- **Hierarchy:** Use `headline-lg` for dashboard titles and `headline-md` for section headers. 
- **Metadata:** Use `label-caps` in the muted text color (#94a3b8) for table headers, small descriptors, and secondary metadata to create a clear visual distinction from primary data.
- **Readability:** Maintain high contrast by using `text-primary` for all interactive and critical data points, while using `text-muted` for supportive information.

## Layout & Spacing
The system employs a **Fluid Grid** model to maximize screen real estate for complex data visualizations and tables.
- **Grid:** A 12-column system with 1rem gutters. On mobile, this collapses to a single column with 1rem margins.
- **Sidebar:** A persistent, collapsible navigation sits on the left. It provides high-level access to performance modules and minimizes to an icon-only view for focused work.
- **Rhythm:** Standardized padding of 1.25rem (20px) is applied to all main cards and containers to ensure consistent breathing room without sacrificing data density.

## Elevation & Depth
In this design system, depth is primarily communicated through **Tonal Layers** rather than shadows. 
- **Level 0 (Base):** Background (#0f172a).
- **Level 1 (Cards/Sidebar):** Surface-container (#1e293b) with a 1px solid border (#475569) to define edges.
- **Level 2 (Modals/Popovers):** Surface-elevated (#334155). These high-level containers should use a subtle 10% black drop shadow with a 20px blur to separate them from the background layers.
- **Interactive States:** Hovering over a card or list item should subtly lighten its background color or intensify the border brightness.

## Shapes
The shape language is professional and approachable, utilizing consistent rounding across all surfaces. 
- **Standard:** Use a 12px (`rounded-lg`) radius for all content cards, dashboard widgets, and main containers.
- **Overlays:** Modals and dialogs use a slightly more pronounced 14px radius to distinguish them as floating interface elements.
- **UI Elements:** Buttons and input fields use a consistent 8px radius to maintain a clean, modern look that aligns with the card corners.

## Components
- **Buttons:** 
  - *Primary:* Solid #3b82f6 with white text. 
  - *Secondary:* Transparent background with a 1px #475569 border. 
  - *Danger:* Solid #ef4444.
- **Inputs:** Dark slate backgrounds (#0f172a) with #475569 borders. On focus, borders transition to #3b82f6 with a subtle outer glow.
- **Tables:** Designed for high density. Use 0.75rem vertical padding for rows and subtle #475569 bottom borders. Zebra striping is not required; instead, use row hover states.
- **Status Badges:** Small, high-contrast chips using semantic colors (success, warning, danger) with a 10% opacity background of the same color to ensure legibility.
- **Tabs:** Horizontal layout with the active tab indicated by a 2px blue (#3b82f6) bottom border and white text; inactive tabs use muted slate text.
- **Cards:** Defined by a 12px border radius and a 1px #475569 border. Headers within cards should be separated by a subtle divider.