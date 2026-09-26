-- ============================================================================
-- StockSense IMS — Pure PostgreSQL Schema (db/schema.sql)
-- Double-entry stock ledger inspired by Odoo. Idempotent (IF NOT EXISTS).
-- All application access flows through db/custom-client.js (native pg pool).
-- ============================================================================

-- 1. Users & Authentication -------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(150) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(20) DEFAULT 'staff' CHECK (role IN ('manager', 'staff')),
    otp_code VARCHAR(6),
    otp_expiry TIMESTAMP,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. Warehouses & Locations -------------------------------------------------
CREATE TABLE IF NOT EXISTS locations (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    warehouse_name VARCHAR(100) DEFAULT 'Main Warehouse',
    type VARCHAR(30) NOT NULL CHECK (type IN ('internal', 'vendor', 'customer', 'inventory_loss')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. Product Catalog --------------------------------------------------------
CREATE TABLE IF NOT EXISTS products (
    id SERIAL PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    sku VARCHAR(50) UNIQUE NOT NULL,
    category VARCHAR(100) NOT NULL,
    uom VARCHAR(20) NOT NULL,
    min_stock_alert INT DEFAULT 10,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 4. Location Stock Balances Cache ------------------------------------------
CREATE TABLE IF NOT EXISTS stock_quants (
    id SERIAL PRIMARY KEY,
    product_id INT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    location_id INT NOT NULL REFERENCES locations(id) ON DELETE CASCADE,
    quantity NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    CONSTRAINT unique_product_location UNIQUE (product_id, location_id)
);

-- 5. Operations Document Header ----------------------------------------------
CREATE TABLE IF NOT EXISTS operations (
    id SERIAL PRIMARY KEY,
    reference_no VARCHAR(50) UNIQUE NOT NULL,
    type VARCHAR(30) NOT NULL CHECK (type IN ('receipt', 'delivery', 'internal', 'adjustment')),
    status VARCHAR(20) DEFAULT 'Draft' CHECK (status IN ('Draft', 'Waiting', 'Ready', 'Done', 'Canceled')),
    partner_name VARCHAR(150),
    created_by INT REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 6. Immutable Double-Entry Stock Ledger -------------------------------------
CREATE TABLE IF NOT EXISTS stock_moves (
    id SERIAL PRIMARY KEY,
    operation_id INT REFERENCES operations(id) ON DELETE CASCADE,
    product_id INT NOT NULL REFERENCES products(id),
    source_location_id INT NOT NULL REFERENCES locations(id),
    dest_location_id INT NOT NULL REFERENCES locations(id),
    quantity NUMERIC(12, 2) NOT NULL,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 7. Operation Lines (staging for Draft -> Waiting -> Ready documents) ---------
-- NOTE: the mandated ledger (stock_moves) is immutable; line items live here
-- until an operation is validated, at which point balance + ledger are posted.
CREATE TABLE IF NOT EXISTS operation_lines (
    id SERIAL PRIMARY KEY,
    operation_id INT NOT NULL REFERENCES operations(id) ON DELETE CASCADE,
    product_id INT NOT NULL REFERENCES products(id),
    quantity NUMERIC(12, 2) NOT NULL CHECK (quantity >= 0),
    source_location_id INT REFERENCES locations(id),
    dest_location_id INT REFERENCES locations(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Per-type reference sequences (race-free REC/DEL/TRF/ADJ numbering) -----------
CREATE SEQUENCE IF NOT EXISTS seq_receipt    START WITH 2000;
CREATE SEQUENCE IF NOT EXISTS seq_delivery   START WITH 3000;
CREATE SEQUENCE IF NOT EXISTS seq_transfer   START WITH 4000;
CREATE SEQUENCE IF NOT EXISTS seq_adjustment START WITH 5000;

-- Unique location identity (makes seed.sql idempotent across restarts) ---------
CREATE UNIQUE INDEX IF NOT EXISTS uq_locations_name_type ON locations(name, type);

-- Indexes for Performance -----------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_products_sku ON products(sku);
CREATE INDEX IF NOT EXISTS idx_stock_quants_lookup ON stock_quants(product_id, location_id);
CREATE INDEX IF NOT EXISTS idx_stock_moves_operation ON stock_moves(operation_id);

-- Supporting indexes (non-mandated, for KPI/history performance) --------------
CREATE INDEX IF NOT EXISTS idx_stock_moves_product ON stock_moves(product_id);
CREATE INDEX IF NOT EXISTS idx_stock_moves_timestamp ON stock_moves(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_operations_status ON operations(status);
CREATE INDEX IF NOT EXISTS idx_operations_type_status ON operations(type, status);
CREATE INDEX IF NOT EXISTS idx_users_otp ON users(otp_code) WHERE otp_code IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_operation_lines_operation ON operation_lines(operation_id);
CREATE INDEX IF NOT EXISTS idx_locations_type ON locations(type);
