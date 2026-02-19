
-- Create freight_budget table
CREATE TABLE IF NOT EXISTS freight_budget (
    id SERIAL PRIMARY KEY,
    month DATE NOT NULL,
    dept_number VARCHAR(10) NOT NULL,
    shop_id VARCHAR(10),
    location VARCHAR(50),
    freight_cost_ytd DECIMAL(10,2) DEFAULT 0,
    full_year_budget DECIMAL(10,2) DEFAULT 0,
    net_freight DECIMAL(10,2) DEFAULT 0,
    report_period VARCHAR(20),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(month, dept_number)
);

-- Enable RLS
ALTER TABLE freight_budget ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Allow anon read freight_budget" ON freight_budget FOR SELECT TO anon USING (true);
CREATE POLICY "Allow anon insert freight_budget" ON freight_budget FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Allow anon update freight_budget" ON freight_budget FOR UPDATE TO anon USING (true);
CREATE POLICY "Allow anon delete freight_budget" ON freight_budget FOR DELETE TO anon USING (true);

-- Create freight_invoices table (for individual shipment line items from TFM invoices)
CREATE TABLE IF NOT EXISTS freight_invoices (
    id SERIAL PRIMARY KEY,
    invoice_date DATE,
    invoice_week VARCHAR(20),
    dept_number VARCHAR(10),
    shop_id VARCHAR(10),
    tracking_number VARCHAR(50),
    carrier VARCHAR(20),
    service_type VARCHAR(50),
    ship_date DATE,
    origin VARCHAR(100),
    destination VARCHAR(100),
    weight_lbs DECIMAL(8,2),
    actual_charge DECIMAL(10,2),
    flat_rate_charge DECIMAL(10,2),
    net_amount DECIMAL(10,2),
    wo_number VARCHAR(10),
    reference_number VARCHAR(50),
    report_month DATE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(tracking_number, invoice_date)
);

-- Enable RLS
ALTER TABLE freight_invoices ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Allow anon read freight_invoices" ON freight_invoices FOR SELECT TO anon USING (true);
CREATE POLICY "Allow anon insert freight_invoices" ON freight_invoices FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Allow anon update freight_invoices" ON freight_invoices FOR UPDATE TO anon USING (true);
CREATE POLICY "Allow anon delete freight_invoices" ON freight_invoices FOR DELETE TO anon USING (true);

-- Index for fast queries
CREATE INDEX IF NOT EXISTS idx_freight_budget_month ON freight_budget(month);
CREATE INDEX IF NOT EXISTS idx_freight_invoices_dept ON freight_invoices(dept_number);
CREATE INDEX IF NOT EXISTS idx_freight_invoices_month ON freight_invoices(report_month);
CREATE INDEX IF NOT EXISTS idx_freight_invoices_tracking ON freight_invoices(tracking_number);
