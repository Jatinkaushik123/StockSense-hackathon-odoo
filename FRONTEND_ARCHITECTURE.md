# StockSense — Frontend Architecture & Structure Guide

This document defines the structural architecture, folder hierarchy, and file placement conventions for the upcoming frontend implementation of **StockSense**.

---

## 1. Architectural Principles

1. **Strict Reference Isolation:** The four original Stitch reference folders (`stocksense_brand_logo`, `stocksense_design_system`, `stocksense_inventory_dashboard`, `stocksense_receipt_rec_2026_0084`) are treated as **read-only source materials**. All future code will reside strictly in the planned application structure.
2. **Modular Component Hierarchy:** Components are segregated into `common` (universal UI primitives), `data-display` (tables, charts, gauges, steppers), `feedback` (alerts, banners, toasts), and `layouts` (app shell, sidebar, header).
3. **Domain-Driven Page Organization:** Pages are organized under domain boundaries (`dashboard`, `operations`, `catalog`, `settings`) matching the enterprise navigation model.
4. **Isolated Mock Data Layer:** Mock JSON data and mock API services reside in `src/mock/`, making it trivial to swap mock data for real Odoo or REST/GraphQL backends later.
5. **Strict Dual-Font Enforcement:**
   - **Inter:** Primary UI font for layout, headers, text, labels, and buttons.
   - **JetBrains Mono:** Data cells, SKUs, barcodes, IDs, quantities, prices, timestamps, and mathematical variances.

---

## 2. Directory Tree Structure

```text
StockSense-Stitch-References/
│
├── stocksense_brand_logo/               # [READ-ONLY] Original Stitch Logo Reference
│   ├── code.html
│   └── screen.png
├── stocksense_design_system/             # [READ-ONLY] Original Stitch Design System Reference
│   └── DESIGN.md
├── stocksense_inventory_dashboard/       # [READ-ONLY] Original Stitch Dashboard Reference
│   ├── code.html
│   └── screen.png
├── stocksense_receipt_rec_2026_0084/     # [READ-ONLY] Original Stitch Receipt Reference
│   ├── code.html
│   └── screen.png
│
├── docs/                                # Project Specifications & Architecture Documentation
│   ├── STOCKSENSE_PROJECT_DOCUMENTATION.md
│   └── FRONTEND_ARCHITECTURE.md
│
├── STOCKSENSE_PROJECT_DOCUMENTATION.md  # Root copy for immediate visibility
├── FRONTEND_ARCHITECTURE.md             # Root copy for immediate visibility
│
└── src/                                 # Planned Application Source Root
    │
    ├── assets/                          # Static Assets & Icons
    │   ├── brand/                       # Brand SVGs and logos
    │   └── images/                      # Placeholder avatars and sample graphics
    │
    ├── components/                      # Reusable UI Components
    │   ├── common/                      # Low-level UI primitives (Button, Input, Select, Checkbox, Modal)
    │   ├── data-display/                # Domain-agnostic & domain-specific data presentation
    │   │                                # (DataTable, TablePagination, KpiCard, PipelineStepper,
    │   │                                #  StatusPill, DonutChart, ProgressBar, MetadataGrid)
    │   └── feedback/                    # User feedback, banners, and overlays (DiscrepancyAlert, Toast)
    │
    ├── layouts/                         # Frame and Structure Components
    │   ├── AppShell                     # Master layout wrapper (Sidebar + Header + Page Content)
    │   ├── Sidebar                      # 260px fixed slate navigation sidebar
    │   ├── Header                       # 64px fixed utility bar (search, pulse, warehouse picker, user alert)
    │   ├── PageHeader                   # Title, subtitle, action buttons, sync status indicator
    │   └── Breadcrumbs                  # Hierarchical navigation trail with monospaced IDs
    │
    ├── pages/                           # Application Views & Route Pages
    │   ├── dashboard/                   # Main Inventory Dashboard view
    │   ├── operations/                  # Operations Module
    │   │   ├── receipts/                # Inbound Receipts list & detail views (REC-2026-0084)
    │   │   ├── delivery-orders/         # Outbound Delivery Orders queue
    │   │   ├── internal-transfers/      # Intra/Inter-warehouse Transfers view
    │   │   └── stock-adjustments/       # Inventory Audit & Cycle Counts view
    │   ├── catalog/                     # Catalog Module
    │   │   ├── products/                # Product Master & Categories view
    │   │   └── move-history/            # Stock Move Ledger & Audit Trail view
    │   └── settings/                    # Settings Module
    │       └── warehouses/              # Multi-warehouse, Zones, and Docks configuration
    │
    ├── mock/                            # Mock Data & Simulated API Responses
    │   ├── user.json                    # Active user profile (Alex Vance)
    │   ├── metrics.json                 # Dashboard KPI metrics
    │   ├── stockCategories.json         # Donut breakdown by category
    │   ├── warehouseZones.json          # Zone capacities & threshold warnings
    │   ├── activeDocuments.json         # Active operations listing for dashboard table
    │   ├── receipt_REC_2026_0084.json   # Full receipt detail dataset
    │   └── products.json                # Catalog items master dataset
    │
    ├── hooks/                           # Custom Business Logic & UI Hooks
    │   ├── useBarcodeScanner            # Rapid barcode wedge & keyboard input listener
    │   ├── usePagination                # Client-side and server-ready pagination logic
    │   ├── useFilter                    # Table and category filtering state
    │   └── useWarehouse                 # Active warehouse selection state
    │
    ├── utils/                           # Helper Functions & Formatters
    │   ├── formatCurrency               # USD currency formatting with JetBrains Mono support
    │   ├── formatNumber                 # Number formatting with tabular alignment
    │   ├── formatDate                   # Enterprise timestamp formatting
    │   └── calculateVariance            # Expected vs. Received delta and status calculator
    │
    ├── styles/                          # Global CSS, Design Tokens & Fonts
    │   ├── tokens.css                   # CSS custom properties matching DESIGN.md
    │   ├── fonts.css                    # Inter & JetBrains Mono font declarations
    │   └── global.css                   # Base resets and utility classes
    │
    ├── config/                          # Application Configuration
    │   ├── navigation.ts                # Navigation menu hierarchy, icons, and route paths
    │   └── constants.ts                 # System constants, status color mappings, thresholds
    │
    └── types/                           # TypeScript Interface & Type Definitions
        ├── operations.ts                # Operation types (Receipt, Delivery, Transfer, Adjustment)
        ├── receipt.ts                   # Receipt header, line items, and QC status types
        ├── inventory.ts                 # Product, Category, and Stock movement types
        └── metrics.ts                   # KPI and Zone capacity types
```

---

## 3. File Placement Guide

| If you are creating... | Place it in... | Example File Name |
|:---|:---|:---|
| A reusable button, input, or dropdown | `src/components/common/` | `Button.tsx`, `Select.tsx` |
| A KPI card, data table, or stepper | `src/components/data-display/` | `KpiCard.tsx`, `DataTable.tsx`, `PipelineStepper.tsx` |
| An alert banner or toast notification | `src/components/feedback/` | `DiscrepancyAlert.tsx`, `Toast.tsx` |
| The sidebar, top navigation bar, or page wrapper | `src/layouts/` | `Sidebar.tsx`, `Header.tsx`, `AppShell.tsx` |
| A route view or full page screen | `src/pages/{domain}/` | `src/pages/dashboard/DashboardPage.tsx`, `src/pages/operations/receipts/ReceiptDetailPage.tsx` |
| Mock JSON data or simulated datasets | `src/mock/` | `receipt_REC_2026_0084.json`, `activeDocuments.json` |
| Reusable stateful React hooks | `src/hooks/` | `useBarcodeScanner.ts`, `usePagination.ts` |
| Formatting, parsing, or calculation helpers | `src/utils/` | `formatters.ts`, `variance.ts` |
| Design tokens, typography, and base CSS | `src/styles/` | `tokens.css`, `global.css` |
| Navigation menus, constants, or route maps | `src/config/` | `navigation.ts`, `routes.ts` |
| TypeScript types or schema interfaces | `src/types/` | `receipt.ts`, `operations.ts` |

---

## 4. Typography & Font Integration Rules

```css
/* Inter for UI */
body, .font-ui {
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}

/* JetBrains Mono for Data */
.font-mono-data, .font-data {
  font-family: 'JetBrains Mono', monospace;
  font-variant-numeric: tabular-nums;
}
```

### Strict Application Matrix
- **Headings & Body:** `Inter` (Font sizes 20px, 16px, 14px, 13px, 12px, 11px)
- **SKU / Barcode Columns:** `JetBrains Mono`
- **Document Numbers (`REC-...`, `PO-...`):** `JetBrains Mono`
- **Expected / Received / Variance Quantities:** `JetBrains Mono`
- **Unit Costs & Subtotals:** `JetBrains Mono`
- **Lot / Serial Numbers (`LOT-...`, `SN-...`):** `JetBrains Mono`
- **Timestamps (`Apr 15, 2026 · 09:30 AM`):** `JetBrains Mono`

---

## 5. Next Steps for Implementation Phase
1. Initialize the modern frontend tooling (e.g., Vite + React + TypeScript + Tailwind CSS).
2. Configure Tailwind with colors and typography matching `stocksense_design_system/DESIGN.md`.
3. Load Google Fonts: `Inter` and `JetBrains Mono`, plus `Material Symbols Outlined`.
4. Implement the AppShell layout (Sidebar + Header).
5. Build the reusable component library (`common`, `data-display`, `feedback`).
6. Implement the **Inventory Dashboard** and **Receipt Detail** pages using the Stitch references as ground truth.
7. Scaffold the remaining planned routes (`delivery-orders`, `internal-transfers`, `stock-adjustments`, `catalog`, `settings`).
