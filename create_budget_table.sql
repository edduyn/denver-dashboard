-- Budget vs Actual tracking table (Source: Duncan Aviation SP015698.CSV - Denver 889)
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

-- Insert 2026 monthly budget targets (real per-month figures from Duncan Aviation income statement)
INSERT INTO budget_vs_actual (period_year, period_month, category, budget_revenue, budget_cost, budget_gross_profit, budget_margin)
VALUES
  -- Labor monthly targets (Annual: $2,429,649 rev / $1,382,107 cost)
  (2026, 1,  'labor', 199717, 116499, 83218, 41.7),
  (2026, 2,  'labor', 190728, 105910, 84818, 44.5),
  (2026, 3,  'labor', 210407, 116499, 93908, 44.6),
  (2026, 4,  'labor', 210408, 116499, 93909, 44.6),
  (2026, 5,  'labor', 192428, 111204, 81224, 42.2),
  (2026, 6,  'labor', 211622, 116500, 95122, 44.9),
  (2026, 7,  'labor', 212838, 121794, 91044, 42.8),
  (2026, 8,  'labor', 202632, 111204, 91428, 45.1),
  (2026, 9,  'labor', 200932, 116499, 84433, 42.0),
  (2026, 10, 'labor', 210408, 116501, 93907, 44.6),
  (2026, 11, 'labor', 181738, 111203, 70535, 38.8),
  (2026, 12, 'labor', 205791, 121795, 83996, 40.8),

  -- Parts monthly targets (Annual: $3,500,000 rev / $2,625,000 cost)
  (2026, 1,  'parts', 287700, 215775, 71925, 25.0),
  (2026, 2,  'parts', 274750, 206063, 68687, 25.0),
  (2026, 3,  'parts', 303100, 227325, 75775, 25.0),
  (2026, 4,  'parts', 303100, 227325, 75775, 25.0),
  (2026, 5,  'parts', 277200, 207900, 69300, 25.0),
  (2026, 6,  'parts', 304850, 228637, 76213, 25.0),
  (2026, 7,  'parts', 306600, 229950, 76650, 25.0),
  (2026, 8,  'parts', 291900, 218925, 72975, 25.0),
  (2026, 9,  'parts', 289450, 217088, 72362, 25.0),
  (2026, 10, 'parts', 303100, 227325, 75775, 25.0),
  (2026, 11, 'parts', 261800, 196350, 65450, 25.0),
  (2026, 12, 'parts', 296450, 222337, 74113, 25.0),

  -- Other monthly targets (Annual: $2,500,000 rev / $2,050,000 cost)
  (2026, 1,  'other', 206693, 169488, 37205, 18.0),
  (2026, 2,  'other', 196850, 161417, 35433, 18.0),
  (2026, 3,  'other', 216535, 177559, 38976, 18.0),
  (2026, 4,  'other', 216537, 177560, 38977, 18.0),
  (2026, 5,  'other', 196850, 161417, 35433, 18.0),
  (2026, 6,  'other', 216535, 177559, 38976, 18.0),
  (2026, 7,  'other', 216535, 177559, 38976, 18.0),
  (2026, 8,  'other', 206693, 169488, 37205, 18.0),
  (2026, 9,  'other', 206695, 169489, 37206, 18.0),
  (2026, 10, 'other', 216535, 177559, 38976, 18.0),
  (2026, 11, 'other', 187007, 153346, 33661, 18.0),
  (2026, 12, 'other', 216535, 177559, 38976, 18.0),

  -- Total monthly targets (Annual: $8,429,649 rev / $6,057,107 cost / $2,372,542 GP / 28.1%)
  (2026, 1,  'total', 694110, 501762, 192348, 27.7),
  (2026, 2,  'total', 662328, 473390, 188938, 28.5),
  (2026, 3,  'total', 730042, 521383, 208659, 28.6),
  (2026, 4,  'total', 730045, 521384, 208661, 28.6),
  (2026, 5,  'total', 666478, 480521, 185957, 27.9),
  (2026, 6,  'total', 733007, 522696, 210311, 28.7),
  (2026, 7,  'total', 735973, 529303, 206670, 28.1),
  (2026, 8,  'total', 701225, 499617, 201608, 28.8),
  (2026, 9,  'total', 697077, 503076, 194001, 27.8),
  (2026, 10, 'total', 730043, 521385, 208658, 28.6),
  (2026, 11, 'total', 630545, 460899, 169646, 26.9),
  (2026, 12, 'total', 718776, 521691, 197085, 27.4)
ON CONFLICT (period_year, period_month, category) DO NOTHING;

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_budget_period ON budget_vs_actual(period_year, period_month);
CREATE INDEX IF NOT EXISTS idx_budget_category ON budget_vs_actual(category);
