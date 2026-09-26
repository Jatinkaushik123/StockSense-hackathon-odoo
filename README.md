# StockSense — Modular Inventory Management System (IMS)

This repository contains the design references and frontend codebase for **StockSense**, a high-density, mission-critical modular enterprise inventory and warehouse operations web platform.

---

## Documentation

Comprehensive project documentation and architecture specifications have been prepared:

- [STOCKSENSE_PROJECT_DOCUMENTATION.md](file:///c:/Users/jaatk/Desktop/Antigravity/Stock-Sense-odoo/StockSense-Stitch-References/STOCKSENSE_PROJECT_DOCUMENTATION.md) — Complete analysis of Stitch design references, design tokens, required fonts (Inter & JetBrains Mono), planned routes, reusable component categories, mock data structures, and implementation rules.
- [FRONTEND_ARCHITECTURE.md](file:///c:/Users/jaatk/Desktop/Antigravity/Stock-Sense-odoo/StockSense-Stitch-References/FRONTEND_ARCHITECTURE.md) — Frontend directory tree, file placement guide, font integration rules, and implementation roadmap.

---

## Stitch Reference Folders (Read-Only)

The following directories contain the original design references exported from Google Stitch. **Do not modify, rename, delete, overwrite, or move any files inside these folders.**

1. `stocksense_brand_logo/` — Official StockSense vector SVG logo and rendered screenshot.
2. `stocksense_design_system/` — Complete visual design system (`DESIGN.md`) covering tokens, colors, elevation, and component specs.
3. `stocksense_inventory_dashboard/` — Inventory Dashboard HTML/Tailwind code reference and viewport screenshot.
4. `stocksense_receipt_rec_2026_0084/` — Receipt Detail (`REC-2026-0084`) HTML/Tailwind code reference and viewport screenshot.

---

## Planned Application Structure

The application source structure is organized in `src/` to separate concerns:

- `src/assets/` — Static assets (logo, images)
- `src/components/common/` — Generic UI primitives (Button, Input, Select, Checkbox, Modal)
- `src/components/data-display/` — Data-heavy components (DataTable, KpiCard, Stepper, DonutChart, ProgressBar)
- `src/components/feedback/` — Alerts, banners, and toast notifications
- `src/layouts/` — Shell, Sidebar, Header, Breadcrumbs
- `src/pages/` — Domain pages (Dashboard, Operations, Catalog, Settings)
- `src/mock/` — Mock datasets for dashboard, receipts, products, zones
- `src/hooks/` — Custom hooks (useBarcodeScanner, usePagination, useFilter, useWarehouse)
- `src/utils/` — Formatters (currency, numbers, dates) and calculations (variance)
- `src/styles/` — Design tokens, global styles, and font definitions
- `src/config/` — Navigation hierarchies and constants
- `src/types/` — TypeScript interfaces and models

*Note: Component, page, and styling implementation will begin in the subsequent phase.*
