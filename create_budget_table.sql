-- Budget vs Actual tracking table
CREATE TABLE IF NOT EXISTS budget_vs_actual (
  id BIGSERIAL PRIMARY KEY,
  period_year INTEGER NOT NULL,
  period_month INTEGER NOT NULL,
  category VARCHAR(50) NOT NULL, -- 'labor', 'parts', 'other', 'total'
  budget_revenue DECIMAL(12,2),
  actual_revenue DECIMAL(12,2),
  budget_cost DECIMAL(12,2),
  actual_cost DECIMAL(12,2),
  budget_gross_profit DECIMAL(12,2),
  actual_gross_profit DECIMAL(12,2),
  budget_margin DECIMAL(5,2),
  actual_margin DECIMAL(5,2),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(period_year, period_month, category)
);

-- Insert 2026 monthly budget targets
INSERT INTO budget_vs_actual (period_year, period_month, category, budget_revenue, budget_cost, budget_gross_profit, budget_margin)
VALUES 
  -- Labor monthly targets
  (2026, 1, 'labor', 202471, 115176, 87295, 43.1),
  (2026, 2, 'labor', 202471, 115176, 87295, 43.1),
  (2026, 3, 'labor', 202471, 115176, 87295, 43.1),
  (2026, 4, 'labor', 202471, 115176, 87295, 43.1),
  (2026, 5, 'labor', 202471, 115176, 87295, 43.1),
  (2026, 6, 'labor', 202471, 115176, 87295, 43.1),
  (2026, 7, 'labor', 202471, 115176, 87295, 43.1),
  (2026, 8, 'labor', 202471, 115176, 87295, 43.1),
  (2026, 9, 'labor', 202471, 115176, 87295, 43.1),
  (2026, 10, 'labor', 202471, 115176, 87295, 43.1),
  (2026, 11, 'labor', 202471, 115176, 87295, 43.1),
  (2026, 12, 'labor', 202471, 115176, 87295, 43.1),
  
  -- Parts monthly targets
  (2026, 1, 'parts', 291667, 218750, 72917, 25.0),
  (2026, 2, 'parts', 291667, 218750, 72917, 25.0),
  (2026, 3, 'parts', 291667, 218750, 72917, 25.0),
  (2026, 4, 'parts', 291667, 218750, 72917, 25.0),
  (2026, 5, 'parts', 291667, 218750, 72917, 25.0),
  (2026, 6, 'parts', 291667, 218750, 72917, 25.0),
  (2026, 7, 'parts', 291667, 218750, 72917, 25.0),
  (2026, 8, 'parts', 291667, 218750, 72917, 25.0),
  (2026, 9, 'parts', 291667, 218750, 72917, 25.0),
  (2026, 10, 'parts', 291667, 218750, 72917, 25.0),
  (2026, 11, 'parts', 291667, 218750, 72917, 25.0),
  (2026, 12, 'parts', 291667, 218750, 72917, 25.0),
  
  -- Other monthly targets
  (2026, 1, 'other', 208333, 170833, 37500, 18.0),
  (2026, 2, 'other', 208333, 170833, 37500, 18.0),
  (2026, 3, 'other', 208333, 170833, 37500, 18.0),
  (2026, 4, 'other', 208333, 170833, 37500, 18.0),
  (2026, 5, 'other', 208333, 170833, 37500, 18.0),
  (2026, 6, 'other', 208333, 170833, 37500, 18.0),
  (2026, 7, 'other', 208333, 170833, 37500, 18.0),
  (2026, 8, 'other', 208333, 170833, 37500, 18.0),
  (2026, 9, 'other', 208333, 170833, 37500, 18.0),
  (2026, 10, 'other', 208333, 170833, 37500, 18.0),
  (2026, 11, 'other', 208333, 170833, 37500, 18.0),
  (2026, 12, 'other', 208333, 170833, 37500, 18.0),
  
  -- Total monthly targets
  (2026, 1, 'total', 702471, 504759, 197712, 28.1),
  (2026, 2, 'total', 702471, 504759, 197712, 28.1),
  (2026, 3, 'total', 702471, 504759, 197712, 28.1),
  (2026, 4, 'total', 702471, 504759, 197712, 28.1),
  (2026, 5, 'total', 702471, 504759, 197712, 28.1),
  (2026, 6, 'total', 702471, 504759, 197712, 28.1),
  (2026, 7, 'total', 702471, 504759, 197712, 28.1),
  (2026, 8, 'total', 702471, 504759, 197712, 28.1),
  (2026, 9, 'total', 702471, 504759, 197712, 28.1),
  (2026, 10, 'total', 702471, 504759, 197712, 28.1),
  (2026, 11, 'total', 702471, 504759, 197712, 28.1),
  (2026, 12, 'total', 702471, 504759, 197712, 28.1)
ON CONFLICT (period_year, period_month, category) DO NOTHING;

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_budget_period ON budget_vs_actual(period_year, period_month);
CREATE INDEX IF NOT EXISTS idx_budget_category ON budget_vs_actual(category);
