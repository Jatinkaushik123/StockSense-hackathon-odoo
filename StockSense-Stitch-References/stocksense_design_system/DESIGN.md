---
name: StockSense Design System
colors:
  surface: '#f7f9fb'
  surface-dim: '#d8dadc'
  surface-bright: '#f7f9fb'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f2f4f6'
  surface-container: '#eceef0'
  surface-container-high: '#e6e8ea'
  surface-container-highest: '#e0e3e5'
  on-surface: '#191c1e'
  on-surface-variant: '#464555'
  inverse-surface: '#2d3133'
  inverse-on-surface: '#eff1f3'
  outline: '#777587'
  outline-variant: '#c7c4d8'
  surface-tint: '#4d44e3'
  primary: '#3525cd'
  on-primary: '#ffffff'
  primary-container: '#4f46e5'
  on-primary-container: '#dad7ff'
  inverse-primary: '#c3c0ff'
  secondary: '#565e74'
  on-secondary: '#ffffff'
  secondary-container: '#dae2fd'
  on-secondary-container: '#5c647a'
  tertiary: '#3a495f'
  on-tertiary: '#ffffff'
  tertiary-container: '#516177'
  on-tertiary-container: '#ccdcf7'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#e2dfff'
  primary-fixed-dim: '#c3c0ff'
  on-primary-fixed: '#0f0069'
  on-primary-fixed-variant: '#3323cc'
  secondary-fixed: '#dae2fd'
  secondary-fixed-dim: '#bec6e0'
  on-secondary-fixed: '#131b2e'
  on-secondary-fixed-variant: '#3f465c'
  tertiary-fixed: '#d3e4fe'
  tertiary-fixed-dim: '#b7c8e1'
  on-tertiary-fixed: '#0b1c30'
  on-tertiary-fixed-variant: '#38485d'
  background: '#f7f9fb'
  on-background: '#191c1e'
  surface-variant: '#e0e3e5'
typography:
  headline-lg:
    fontFamily: Inter
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 28px
    letterSpacing: -0.01em
  headline-md:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '600'
    lineHeight: 24px
    letterSpacing: -0.005em
  headline-sm:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '600'
    lineHeight: 20px
    letterSpacing: 0em
  body-lg:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  body-md:
    fontFamily: Inter
    fontSize: 13px
    fontWeight: '400'
    lineHeight: 18px
  body-sm:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '400'
    lineHeight: 16px
  label-md:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '500'
    lineHeight: 16px
  label-sm:
    fontFamily: Inter
    fontSize: 11px
    fontWeight: '600'
    lineHeight: 14px
    letterSpacing: 0.02em
  code-md:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '500'
    lineHeight: 16px
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  gutter: 1rem
  gutter-sm: 0.5rem
  margin: 1.5rem
  margin-sm: 1rem
  space-xs: 0.25rem
  space-sm: 0.5rem
  space-md: 0.75rem
  space-lg: 1rem
  space-xl: 1.5rem
---

## Brand & Style

This design system embodies a high-density, mission-critical enterprise standard. Tailored for high-throughput logistics, supply-chain routing, and enterprise inventory management, the aesthetic prioritizes functional clarity, operational velocity, and visual calm over ornamental distractions. 

Drawing from modern enterprise resource planning (ERP) systems, the style is uncompromisingly utilitarian and structured. The interface relies on a compact grid, crisp structural borders, and subtle elevation changes to maximize data density across dense data tables, hierarchical trees, and status-rich operational views. Visual anchors are delivered through a purposeful Industrial Indigo signature against a deeply grounded Slate palette, maintaining high contrast and immediate readability under sustained warehouse and desktop use.

## Colors

The color architecture is built around sharp demarcations of operational hierarchy and status signaling.

### Palette Architecture
- **Primary Canvas (`#F8FAFC`)**: A cool slate-tinted canvas preventing ocular fatigue in high-exposure data work.
- **Surface Elevation (`#FFFFFF`)**: Pure white reserved strictly for interactive tiles, table rows, cards, and active input fields.
- **Structural Partitioning (`#E2E8F0`)**: 1px crisp borders delineating columns, toolbars, and layout boundaries.
- **Brand & Action Anchor (`#4F46E5`)**: Primary indigo for focused state indicators, primary operational buttons, and critical selections. Shifts to `#4338CA` on hover, paired with `#EEF2FF` for soft selections and subtle row highlights.
- **Navigation Anchor (`#0F172A`)**: Deep structural slate for fixed operational sidebars and persistent navigation frameworks, balanced with `#CBD5E1` for secondary text rendering.
- **Text Hierarchy**: Primary content leverages `#0F172A` for maximum contrast; descriptive metadata and secondary labels use `#64748B`.

### Semantic Status Framework
Semantic tokens must strictly balance readability and visibility without polluting density:
- **Success (In Stock / Dispatched)**: Background `#ECFDF5`, Text `#047857`, Border `#A7F3D0`.
- **Warning (Low Stock / Reorder Point)**: Background `#FFFBEB`, Text `#B45309`, Border `#FDE68A`.
- **Danger (Out of Stock / Critical)**: Background `#FFF1F2`, Text `#BE123C`, Border `#FECDD3`.
- **Information (In Transit / Allocated)**: Background `#EFF6FF`, Text `#1D4ED8`, Border `#BFDBFE`.

## Typography

The typographic hierarchy prioritizes systematic vertical compression and strict column alignment over expressive scale. Built exclusively with `Inter`, the type engine leverages its tall x-height and legible tabular glyphs.

- **Page Titles (`headline-lg`)**: Set to 20px semibold. Serves as the primary view identifier in top navigation or operational headers.
- **Section Titles (`headline-sm`)**: Set to 14px semibold. Used for panel titles, modal headings, and card groupings.
- **Standard Body (`body-lg`)**: 14px regular for standard content blocks, form descriptions, and full-view reading.
- **Operational Data (`body-md` / `body-sm`)**: Dense 12px to 13px for tabular rows, batch listings, and log feeds.
- **Labels & Headers (`label-md` / `label-sm`)**: 11px to 12px medium and semibold variants for table column headers, form input indicators, and status chips.
- **Tabular Figures**: All numeric data across stock counts, batch IDs, serials, and quantities must be rendered with tabular number spacing (`font-variant-numeric: tabular-nums`) to preserve scannability across vertical listings.

## Layout & Spacing

Layout geometry follows an 8px base rhythm with 4px sub-increments designed for maximum operational data density.

### Canvas Grid Model
- **Application Shell**: Two-pane operational layout featuring a persistent 240px slate navigation sidebar and a top contextual utility bar (48px height).
- **Workspaces**: Fluid multi-pane configurations conforming to an 8px modular baseline. Margins are locked to `1.5rem` (`24px`) on desktop and `1rem` (`16px`) on compact viewports.
- **Data Table Grids**: Columns utilize zero-gap borders with standard cell padding configured at `space-sm` (`8px`) vertical and `space-md` (`12px`) horizontal, enabling up to 25 visible rows without viewport paging.

### Responsive Reflow
- **Desktop (>=1280px)**: Multi-column side-by-side forms, persistent sidebars, fixed analytical summary rails.
- **Tablet / Workstation (768px - 1279px)**: Collapsible icon-only navigation rail (64px), single-column form stacking, horizontally scrollable data tables with sticky primary identifier columns.
- **Mobile Handheld (<768px)**: Stacked single-column layouts, full-width actions, off-canvas navigation drawer, and card-based row transformation for complex table entries.

## Elevation & Depth

Visual hierarchy is communicated via clean hairline boundaries paired with subtle, low-blur ambient shadows. Deep layered drop shadows are avoided to maintain data clarity.

- **Level 0 (Base Canvas)**: Background `#F8FAFC`. Zero elevation.
- **Level 1 (Surface Containers, Tables, Cards)**: `#FFFFFF` background bound by a 1px solid `#E2E8F0` hairline border, accompanied by an ambient surface shadow: `0 1px 2px 0 rgba(15, 23, 42, 0.05)`.
- **Level 2 (Dropdowns, Popovers, Action Menus)**: Elevated surfaces utilize a 1px `#E2E8F0` border and `0 4px 6px -1px rgba(15, 23, 42, 0.08), 0 2px 4px -2px rgba(15, 23, 42, 0.05)`.
- **Level 3 (Modals, Slide-over Shelves)**: Centered or edge-docked utility layers floating over a semi-transparent scrim (`rgba(15, 23, 42, 0.4)`), bound by `0 20px 25px -5px rgba(15, 23, 42, 0.1), 0 8px 10px -6px rgba(15, 23, 42, 0.05)`.

## Shapes

The design system applies a controlled corner radius hierarchy that reinforces structure, compactness, and high-density packaging.

- **Controls (`rounded-md` / 6px)**: Standardized across buttons, form inputs, segmented control toggles, and select pickers.
- **Structural Containers (`rounded-lg` / 8px)**: Reserved for data tables, metric tiles, operational dashboards, and grouping panels.
- **Floating Modals & Drawers (`rounded-xl` / 12px)**: Applied to overlays and interactive confirmation modals to soften contextual boundaries.
- **Status & Counters (`rounded-full` / 9999px)**: Applied exclusively to status badges, inventory pill tags, and notification counters to immediately distinguish them from interactive buttons and inputs.

## Components

### Buttons
- **Primary**: Background `#4F46E5`, text `#FFFFFF`, border none, 6px radius (`rounded-md`). Hover state `#4338CA`. Active state `#3730A3`. Height 36px (compact) or 32px (dense table action).
- **Secondary / Outline**: Background `#FFFFFF`, text `#0F172A`, 1px border `#E2E8F0`. Hover state `#F8FAFC` with border `#CBD5E1`.
- **Ghost / Table Utility**: Background transparent, text `#64748B`. Hover state `#EEF2FF`, text `#4F46E5`.

### Input Fields & Selects
- Constructed with `#FFFFFF` background, 1px `#E2E8F0` border, 6px radius (`rounded-md`), and 36px fixed height (32px in data grid editors).
- Typography set to 13px (`body-md`), text `#0F172A`.
- Placeholder text `#94A3B8`.
- Focus state: 1px border `#4F46E5` accompanied by a 2px outer focus halo: `0 0 0 2px #EEF2FF`.

### Status Badges & Chips
- Fully rounded pills (`rounded-full`) with a fixed height of 22px, utilizing uppercase or capitalized 11px semibold text (`label-sm`).
- Paired semantic tokens: 1px border matched to semantic borders, soft background, and bold high-contrast text (e.g., Low Stock uses `#FFFBEB` background, `#B45309` text, `#FDE68A` border).

### Data Tables
- Header: Background `#F8FAFC`, height 36px, bottom border 1px solid `#E2E8F0`. Text 11px uppercase `#64748B` with `letterSpacing: 0.05em`.
- Rows: Background `#FFFFFF`, height 40px (default) or 32px (condensed), border-bottom 1px solid `#E2E8F0`. Hover state `#F8FAFC`.
- Selected Row: Background `#EEF2FF`, left-accent border 2px solid `#4F46E5`.

### Checkboxes & Radios
- Size 16px x 16px. Border 1px `#CBD5E1`.
- Unchecked: `#FFFFFF` fill.
- Checked: `#4F46E5` fill with pure white icon indicator. Focus halo matches input fields.

### Cards & Analytical Panels
- White surface (`#FFFFFF`), 1px solid border `#E2E8F0`, 8px radius (`rounded-lg`), subtle ambient shadow.
- Interior padding strictly configured to `space-lg` (`16px`). Header sections include a dedicated sub-border separating summary metadata from table content.