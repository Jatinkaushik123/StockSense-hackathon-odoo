# StockSense — Frontend Architecture & Structure Guide

*(See root [FRONTEND_ARCHITECTURE.md](../FRONTEND_ARCHITECTURE.md) for full document)*

### Quick Architectural Summary
- **Source Root:** `src/`
- **Separation:** Strict isolation between read-only Stitch references and planned frontend code.
- **Modules:** Dashboard, Operations (Receipts, Deliveries, Transfers, Adjustments), Catalog (Products, Move History), Settings (Warehouses & Locations).
- **Fonts:** Inter for UI layout; JetBrains Mono for data-heavy tabular values.
- **Implementation Status:** Architecture and folder structure prepared; code implementation deferred to next phase.
