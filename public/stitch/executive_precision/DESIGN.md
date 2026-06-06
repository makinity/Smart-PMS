---
name: Executive Precision
colors:
  surface: '#f6fafe'
  surface-dim: '#d6dade'
  surface-bright: '#f6fafe'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f0f4f8'
  surface-container: '#eaeef2'
  surface-container-high: '#e4e9ed'
  surface-container-highest: '#dfe3e7'
  on-surface: '#171c1f'
  on-surface-variant: '#444653'
  inverse-surface: '#2c3134'
  inverse-on-surface: '#edf1f5'
  outline: '#757684'
  outline-variant: '#c4c5d5'
  surface-tint: '#3755c3'
  primary: '#00288e'
  on-primary: '#ffffff'
  primary-container: '#1e40af'
  on-primary-container: '#a8b8ff'
  inverse-primary: '#b8c4ff'
  secondary: '#505f76'
  on-secondary: '#ffffff'
  secondary-container: '#d0e1fb'
  on-secondary-container: '#54647a'
  tertiary: '#611e00'
  on-tertiary: '#ffffff'
  tertiary-container: '#872d00'
  on-tertiary-container: '#ffa583'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#dde1ff'
  primary-fixed-dim: '#b8c4ff'
  on-primary-fixed: '#001453'
  on-primary-fixed-variant: '#173bab'
  secondary-fixed: '#d3e4fe'
  secondary-fixed-dim: '#b7c8e1'
  on-secondary-fixed: '#0b1c30'
  on-secondary-fixed-variant: '#38485d'
  tertiary-fixed: '#ffdbce'
  tertiary-fixed-dim: '#ffb59a'
  on-tertiary-fixed: '#380d00'
  on-tertiary-fixed-variant: '#802a00'
  background: '#f6fafe'
  on-background: '#171c1f'
  surface-variant: '#dfe3e7'
typography:
  display:
    fontFamily: Inter
    fontSize: 36px
    fontWeight: '700'
    lineHeight: 44px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Inter
    fontSize: 28px
    fontWeight: '600'
    lineHeight: 36px
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
    fontWeight: '500'
    lineHeight: 16px
    letterSpacing: 0.05em
  data-tabular:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  headline-lg-mobile:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  unit: 4px
  container-max: 1440px
  gutter: 24px
  margin-desktop: 32px
  margin-mobile: 16px
  density-compact: 8px
  density-comfortable: 16px
---

## Brand & Style
The design system is engineered for high-stakes enterprise environments where data clarity and institutional trust are paramount. The brand personality is authoritative yet unobtrusive, focusing on the "Executive Modern" aesthetic. This style prioritizes a high signal-to-noise ratio, utilizing a systematic approach to whitespace and information density to ensure that performance metrics remain the focal point.

The emotional response should be one of confidence and efficiency. Users should feel that the interface is a powerful, reliable tool that assists in critical decision-making. The visual language avoids decorative flourishes in favor of functional precision, employing a refined corporate palette and a strict adherence to grid-based alignment.

## Colors
The color palette is functionally driven to categorize information at a glance.
- **Primary (Executive Blue):** Reserved for primary actions, active navigation states, and brand-identifying elements.
- **Neutral Scale:** A comprehensive range of grays is used for typography (slate-900 for headings, slate-600 for secondary text) and UI scaffolding (slate-200 for borders).
- **Semantic Colors:** Used strictly for status communication. Success Green indicates approved or positive growth; Warning Amber denotes drafts or pending actions; Alert Red highlights critical performance gaps or overdue tasks.
- **Backgrounds:** Use a tiered gray system (white for surfaces, slate-50 for app backgrounds) to separate the navigation from the workspace.

## Typography
This design system utilizes **Inter** for its exceptional legibility and comprehensive support for tabular figures. 

- **Tabular Figures:** For all data tables, reports, and numerical displays, `font-variant-numeric: tabular-nums` must be enabled. This ensures vertical alignment of numbers across rows, facilitating easier scanning of performance metrics.
- **Hierarchy:** Headlines use a tighter tracking and heavier weights to establish clear sectioning. Labels for table headers should be set in uppercase with slight letter spacing to differentiate from row content.
- **Scale:** Font sizes are kept conservative to support high-density layouts, with 14px serving as the standard body and data size.

## Layout & Spacing
The layout follows a **Fixed Grid** philosophy for desktop views, centered with a maximum width of 1440px to prevent excessive line lengths in data reports. 

- **Grid System:** A 12-column grid is used for dashboard layouts. Data tables should typically span the full width of their container.
- **Density:** We utilize a "Compact but Breathable" rhythm. Table row heights are set to a strict 40px or 48px to maximize data visibility while maintaining touch targets.
- **Breakpoints:** 
  - **Desktop (1024px+):** Full 12-column grid, sidebar navigation visible.
  - **Tablet (768px - 1023px):** 8-column grid, sidebar collapses to icons or hamburger menu.
  - **Mobile (below 768px):** 4-column grid, data tables reflow into "Record Cards" where each row becomes a standalone card for vertical scrolling.

## Elevation & Depth
Hierarchy in the design system is conveyed through **Tonal Layers** and subtle **Ambient Shadows**.

- **Surface Levels:** The primary application background uses a light neutral tint. Content containers (cards, table wrappers) are pure white to "pop" from the background.
- **Shadows:** Use extremely soft, low-opacity shadows (e.g., `0 2px 4px rgba(0,0,0,0.05)`) for cards to suggest elevation without creating visual clutter.
- **Headers/Footers:** Sticky table headers use a subtle 1px bottom border rather than a shadow to maintain a clean aesthetic. Total rows at the bottom of tables use a slightly darker neutral background (#F8FAFC) and a 2px top border in the primary blue to signify a "footer" status.

## Shapes
The shape language is **Soft (Level 1)**. 
- Elements like buttons, input fields, and cards use a 0.25rem (4px) corner radius. This provides a professional, modern look that feels precise but not "sharp" or aggressive. 
- Status badges use a slightly higher radius (rounded-lg / 8px) to distinguish them as discrete interactive or informational tokens. 
- Charts and data visualizations should maintain square ends on bars to emphasize accuracy.

## Components
- **Data Tables:** The core component. Must include sticky headers and a "Total" footer row. Implement zebra striping using a 2% tint of the primary color. Zero values must be styled with 40% opacity to highlight non-zero data points.
- **Buttons:** Primary buttons are solid Executive Blue. Secondary buttons use the Low-contrast outline style with a slate-300 border.
- **Status Badges:** Use a "Soft Background" approach. For example, a Success badge has a light green background at 10% opacity with a bold green text label.
- **Input Fields:** Standardized height of 40px. Use a 1px slate-300 border that thickens to 2px Executive Blue on focus.
- **Cards:** White background, 4px border radius, and a subtle 1px slate-200 border. Used for dashboard summaries and mobile record views.
- **Progress Bars:** Thin, 8px height bars used within table cells to visualize performance against targets.