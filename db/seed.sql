-- ============================================================================
-- StockSense IMS — Seed Data (db/seed.sql)
-- Demo users, warehouse layout, product catalog and opening stock.
-- User-seeding is done programmatically by scripts/seed-users.js (bcrypt hashing);
-- this file handles locations/products/stock/ops demo data (idempotent).
-- ============================================================================

-- System + physical locations (unique names make ON CONFLICT idempotent) ------
INSERT INTO locations (name, warehouse_name, type) VALUES
  ('Vendors', 'System', 'vendor'),
  ('Customers', 'System', 'customer'),
  ('Scrap/Loss', 'System', 'inventory_loss'),
  ('Main Warehouse', 'Main Warehouse', 'internal'),
  ('Main Store', 'Main Warehouse', 'internal'),
  ('Production Floor', 'Main Warehouse', 'internal'),
  ('Rack A', 'Main Warehouse', 'internal'),
  ('Rack B', 'Main Warehouse', 'internal')
ON CONFLICT DO NOTHING;

-- Demo product catalog ---------------------------------------------------------
INSERT INTO products (name, sku, category, uom, min_stock_alert) VALUES
  ('Industrial Safety Helmet', 'SKU-HELMET-001', 'Safety Equipment', 'pcs', 25),
  ('Cordless Drill 18V', 'SKU-DRILL-002', 'Power Tools', 'pcs', 8),
  ('Nitrile Gloves (Box 100)', 'SKU-GLOVE-003', 'Safety Equipment', 'box', 40),
  ('Hex Bolts M12 (Pack 50)', 'SKU-BOLT-004', 'Fasteners', 'pack', 100),
  ('LED Work Lamp 20W', 'SKU-LAMP-005', 'Electrical', 'pcs', 15),
  ('HD Storage Crate 60L', 'SKU-CRATE-006', 'Packaging', 'pcs', 30)
ON CONFLICT DO NOTHING;

-- Opening stock quants (Main Store = opening balance for demo products) --------
INSERT INTO stock_quants (product_id, location_id, quantity)
SELECT p.id, l.id, v.qty
FROM (VALUES
  ('SKU-HELMET-001', 'Main Store', 120.00),
  ('SKU-DRILL-002',  'Main Store', 42.00),
  ('SKU-GLOVE-003',  'Main Store', 85.00),
  ('SKU-BOLT-004',   'Main Store', 260.00),
  ('SKU-LAMP-005',   'Main Store', 12.00),  -- deliberately low-stock demo row
  ('SKU-CRATE-006',  'Main Store', 0.00)   -- deliberately out-of-stock demo row
) AS v(sku, loc, qty)
JOIN products p  ON p.sku = v.sku
JOIN locations l ON l.name = v.loc
ON CONFLICT (product_id, location_id) DO NOTHING;

-- One demo operation skeleton per type so dashboards are not empty -------------
INSERT INTO operations (reference_no, type, status, partner_name)
SELECT v.ref, v.type, v.status, v.partner
FROM (VALUES
  ('REC-1001', 'receipt',   'Waiting', 'Acme Industrial Supply'),
  ('DEL-2001', 'delivery',  'Ready',   'Metro Construction Ltd.'),
  ('TRF-3001', 'internal',  'Draft',   NULL),
  ('ADJ-4001', 'adjustment','Draft',   NULL)
) AS v(ref, type, status, partner)
ON CONFLICT (reference_no) DO NOTHING;
