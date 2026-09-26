# StockSense — Enterprise Inventory Management
## Project Documentation & Design Reference Analysis

---

## 1. Project Name
**StockSense**

---

## 2. Project Purpose
**Enterprise Inventory Management System**

StockSense is a high-density, mission-critical inventory and warehouse operations web platform. Tailored for enterprise logistics, supply-chain routing, physical stock intake, cross-dock dispatching, and inventory auditing, StockSense prioritizes:
- **Operational Velocity:** Rapid data entry, fast barcode wedge scanning, and instant bulk operations.
- **Functional Clarity:** High-contrast data grids, zero ocular fatigue under sustained use, and clear visual hierarchy.
- **Physical-to-Digital Integrity:** Strict tracking of discrepancies, short-shipments, lot/serial traceability, and zone capacities.

---

## 3. Stitch Reference Locations
The workspace contains the original design references exported from Google Stitch. **These folders and files are read-only references and must never be modified, renamed, moved, overwritten, or deleted.**

| Directory | Core Files | Role & Representation |
|:---|:---|:---|
| `stocksense_brand_logo/` | `code.html`, `screen.png` | Official StockSense branding vector SVG logo (geometric isometric cube with accent node in `#4F46E5` container) and reference rendering. |
| `stocksense_design_system/` | `DESIGN.md` | Authoritative visual design specification containing design tokens, color palette, semantic status framework, typography hierarchy, elevation levels, shapes, and component style specs. |
| `stocksense_inventory_dashboard/` | `code.html`, `screen.png` | Complete HTML/Tailwind reference and viewport screenshot for the **Inventory Dashboard** page (KPI cards, donut chart, warehouse zone capacity progress bars, filter toolbar, active operations data table, pagination). |
| `stocksense_receipt_rec_2026_0084/` | `code.html`, `screen.png` | Complete HTML/Tailwind reference and viewport screenshot for the **Receipt Detail** page (`REC-2026-0084`) (4-stage pipeline stepper, 3-column metadata card, discrepancy shortfall alert, barcode scanning bar, line items table with variance & QC status, reception notes, document valuation summary). |

---

## 4. Available Design References & Specifications

### 4.1 Color Architecture & Palette
Extracted from `stocksense_design_system/DESIGN.md`:

- **Primary Canvas (`#F8FAFC`):** Cool slate-tinted canvas preventing ocular fatigue in high-exposure warehouse and desktop environments.
- **Surface Elevation (`#FFFFFF`):** Pure white strictly reserved for interactive cards, table rows, tiles, and active form inputs.
- **Structural Partitioning (`#E2E8F0`):** 1px crisp borders delineating columns, toolbars, and layout boundaries.
- **Brand & Action Anchor (`#4F46E5`):** Industrial Indigo for primary operational buttons, active indicators, and critical selections. Shifts to `#4338CA` on hover, paired with `#EEF2FF` for row selections and subtle highlights.
- **Navigation Anchor (`#0F172A` / `#2D3133`):** Deep structural slate for the fixed 260px operational sidebar.
- **Text Contrast Hierarchy:**
  - Primary text: `#0F172A` / `#191C1E` (maximum contrast)
  - Secondary metadata / labels: `#64748B` / `#565E74`
  - Outline & subtle text: `#777587` / `#94A3B8`

### 4.2 Semantic Status Framework
Every operational status follows strict, balanced color tokens:
- **Success / In Stock / Dispatched / QC Passed:**
  - Background: `#ECFDF5` | Text: `#047857` | Border: `#A7F3D0`
- **Warning / Low Stock / Reorder Point / Waiting:**
  - Background: `#FFFBEB` | Text: `#B45309` | Border: `#FDE68A`
- **Danger / Out of Stock / Critical Discrepancy / Shortfall:**
  - Background: `#FFF1F2` | Text: `#BE123C` | Border: `#FECDD3`
- **Information / In Transit / Allocated / Inspected:**
  - Background: `#EFF6FF` | Text: `#1D4ED8` | Border: `#BFDBFE`

### 4.3 Elevation & Shapes
- **Elevation 0 (Canvas):** `#F8FAFC` flat canvas.
- **Elevation 1 (Surface Containers, Tables, Cards):** `#FFFFFF` with 1px solid `#E2E8F0` border and subtle ambient shadow `0 1px 2px 0 rgba(15, 23, 42, 0.05)`.
- **Elevation 2 (Dropdowns, Popovers, Action Menus):** 1px `#E2E8F0` border and `0 4px 6px -1px rgba(15, 23, 42, 0.08)`.
- **Elevation 3 (Modals, Overlays):** `0 20px 25px -5px rgba(15, 23, 42, 0.1)` with semi-transparent scrim (`rgba(15, 23, 42, 0.4)`).
- **Corner Radii:**
  - Controls (buttons, inputs, select): `rounded-md` (6px)
  - Containers (cards, tables, panels): `rounded-lg` (8px)
  - Modals / Drawers: `rounded-xl` (12px)
  - Status Badges / Pills: `rounded-full` (9999px)

### 4.4 Layout Rhythm
- **Sidebar:** Persistent 260px fixed width (`#0F172A` / `#2D3133`).
- **Header:** Fixed 64px (h-16) top bar (`#FFFFFF`, border `#E2E8F0`).
- **Base Grid:** 8px rhythm with 4px sub-increments. Page margins: `24px` (`1.5rem`).
- **Table Density:** Zero-gap borders, `8px` vertical cell padding, `12px` horizontal cell padding.

---

## 5. Required Fonts & Typography Rules

The application uses a strict dual-font typographic engine:

| Font Family | Usage Scope | Rationale |
|:---|:---|:---|
| **Inter** | Primary UI font for all page titles, section headings, body copy, form labels, button labels, navigation links, and descriptive metadata. | Tall x-height, neutral geometric clarity, and high legibility across varied display densities. |
| **JetBrains Mono** | Data cells, document reference IDs (`REC-2026-0084`, `#PO-2026-8942`), SKUs (`BRK-001`, `BOLT-008`), barcodes (`789123001`), quantities (`100`, `98`, `+2 L`), currency values (`$24.50`, `$7,429.00`), timestamps, lot/serial numbers (`LOT-2026-B1`, `SN-2026-901..920`), percentages, keyboard shortcuts (`Ctrl + K`). | Monospaced character alignment guarantees scannability across dense tabular rows, preventing visual jitter during high-speed scanning and audit reconciliation. |

### Tabular Numbers Requirement
All numeric figures across stock counts, batch IDs, serials, and prices must enforce `font-variant-numeric: tabular-nums` to preserve exact column alignment.

---

## 6. Planned Application Pages & Routes

Based on the sidebar specifications and Stitch design references:

### Main Navigation & Views

1. **Dashboard (`/dashboard` or `/`)** *(Design Reference Available)*
   - 5 KPI Metric Cards (Total Products, Low/Out of Stock, Pending Receipts, Pending Deliveries, Internal Transfers)
   - Stock by Category Donut Chart & tabular breakdown
   - Warehouse Capacity & Zones utilization progress bars
   - Operations Filter Toolbar (All, Receipts, Deliveries, Internal, Adjustments)
   - Active Documents Data Table with pagination and row quick actions

2. **OPERATIONS**
   - **Receipts (`/operations/receipts`)**
     - Inbound shipments queue, vendor filter, receiving status filter, intake metrics
   - **Receipt Detail (`/operations/receipts/:id`)** *(Design Reference Available: `REC-2026-0084`)*
     - Hierarchical breadcrumbs & auto-sync PO timestamp
     - Header action toolbar (Cancel, Print Slip, Print Barcodes, Validate Receipt CTA)
     - 4-stage pipeline stepper (Draft → Waiting → Ready → Done)
     - 3-column metadata card (Supplier/Source PO, Target Destination/Stowage, Carrier/Inspector)
     - Discrepancy Alert Notification Banner (shortfall detection, BOL debit note trigger)
     - Fast barcode scan bar with rapid intake input
     - Line items table (Expected vs Received, Variance pill, Unit Cost, Subtotal, Lot/Serial, QC Status pill, actions)
     - Operational Reception Notes textarea & audit integration timestamp
     - Document Valuation Summary bento box
   - **Delivery Orders (`/operations/delivery-orders`)**
     - Outbound dispatches, picking/packing queue, carrier scheduling, customer shipments
   - **Internal Transfers (`/operations/internal-transfers`)**
     - Inter-warehouse and intra-zone transfers, transit tracking, location handoffs
   - **Stock Adjustments (`/operations/stock-adjustments`)**
     - Cycle counting, discrepancy write-offs, audit logs, inventory re-evaluations

3. **CATALOG**
   - **Products & Categories (`/catalog/products`)**
     - Product master data, SKU catalog, category classifications, UoM configurations, reorder thresholds
   - **Move History (`/catalog/move-history`)**
     - Complete immutable ledger of all stock movement events across all operation types

4. **SETTINGS**
   - **Warehouses & Locations (`/settings/warehouses`)**
     - Multi-warehouse setup, zones (Bulk, Fast-pick, Cold store, Hazardous Annex), aisles, racks, bins, docks

---

## 7. Planned Reusable Component Categories

```
src/components/
├── common/             # Universal controls, atoms & primitives
│   ├── Button          # Primary, secondary, outline, ghost, danger, icon-only
│   ├── Input           # Text input, number input, keyboard shortcut badge input
│   ├── Select          # Styled select dropdown with chevron
│   ├── Textarea        # Resizable/fixed multi-line text input
│   ├── Checkbox        # Custom styled checkbox (16x16 with #4F46E5 check)
│   ├── Modal           # Elevation 3 dialog overlay with backdrop scrim
│   └── Tooltip         # Hover utility tooltip
├── data-display/       # High-density data presentation components
│   ├── DataTable       # Generic sortable table with sticky columns & row states
│   ├── TablePagination # Pagination bar with rows-per-page & page index pills
│   ├── KpiCard         # Metric tile with icon, title, value (Mono), and delta pill
│   ├── PipelineStepper # Multi-stage operational status progression stepper
│   ├── StatusPill      # Semantic pill badge (rounded-full, 11px uppercase label)
│   ├── DonutChart      # Category distribution SVG donut with center metric
│   ├── ProgressBar     # Capacity utilization bar with normal/warning/danger states
│   └── MetadataGrid    # 3-column key-value logistics overview card
└── feedback/           # Alerts, banners, and transient messages
    ├── DiscrepancyAlert# High-visibility shortfall & anomaly banner
    └── Toast           # Transient micro-interaction notification popup
```

### Layout Components (`src/layouts/`)
- `AppShell`: Persistent 260px sidebar + 64px header + scrollable content area.
- `Sidebar`: Slate navigation drawer, brand identity, navigation groups, user profile badge.
- `Header`: Global search bar (`Ctrl + K`), system operational pulse, warehouse switcher, notifications.
- `PageHeader`: Title, descriptive subtitle, primary and secondary action button groups.
- `Breadcrumbs`: Path hierarchy with chevron dividers and monospaced document IDs.

---

## 8. Planned Data & Mock-Data Structure

Mock files to be organized in `src/mock/`:
1. `user.json` / `profile`: Alex Vance (Warehouse Staff / Manager, avatar, permissions).
2. `metrics.json`: KPI values for Dashboard (Total Products, Low Stock, Pending Receipts, Pending Deliveries, Internal Transfers).
3. `stockCategories.json`: Donut breakdown items (Raw Materials, Finished Goods, Consumables, Spare Parts, quantities, percentages).
4. `warehouseZones.json`: Zone capacities (Bulk Storage A-E, Fast-pick Bins Zone F, Cold Storage Zone C, Hazardous Annex).
5. `activeDocuments.json`: List of active warehouse documents (Receipts, Deliveries, Transfers, Adjustments) with IDs, partners, locations, items, statuses.
6. `receipt_REC_2026_0084.json`: Detailed model for Receipt `REC-2026-0084` including:
   - Header metadata (Supplier, PO, Destination, Stowage, Dock, Carrier, Tracking, Inspector, Stage).
   - Shortfall alert details (Item, shortfall count, BOL reference).
   - Line items array (ID, Description, SKU, Barcode, UoM, Expected, Received, Variance, Unit Cost, Subtotal, Lot, QC Status).
   - Reception notes & valuation rollup totals.
7. `products.json`: Catalog items with SKU, name, category, barcode, stock on hand, reorder point.
8. `warehouses.json`: Warehouse entities and child locations.

---

## 9. Planned Asset Structure

```
src/assets/
├── brand/
│   └── logo.svg        # Scalable SVG logo extracted from stocksense_brand_logo/code.html
└── icons/              # Google Material Symbols Outlined font integration
```

- **Logo SVG:** Preserves isometric 3D cube geometry, `#4F46E5` rounded container (`rx="6"`), `#FFFFFF` vector lines, `#A5B4FC` central node.
- **Icon Engine:** Google Material Symbols Outlined loaded via Google Fonts or bundled SVG icons.

---

## 10. Important Implementation Rules for the Future Frontend

1. **Zero Modification to Stitch Folders:** `stocksense_*` folders remain untouched as immutable design benchmarks.
2. **Strict Font Separation:**
   - Always use **Inter** for UI copy, labels, headers, and prose.
   - Always use **JetBrains Mono** for numbers, codes, SKUs, barcodes, IDs, currencies, quantities, and timestamps.
3. **Tabular Figures:** Always apply `tabular-nums` (`font-variant-numeric: tabular-nums`) to numeric table columns and metric counters.
4. **Color Token Fidelity:** Adhere strictly to the color palette in `stocksense_design_system/DESIGN.md`. Do not introduce arbitrary shades of blue or green.
5. **High-Density Compactness:** Respect the 36px/32px control heights, 40px/32px table row heights, and 1px `#E2E8F0` border standards.
6. **No Premature Implementation:** Maintain clean separation of concerns and do not generate actual frontend code until this preparation phase is complete.
