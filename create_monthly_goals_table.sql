-- Monthly goal performance tracking for 12-month timeline visualization
CREATE TABLE IF NOT EXISTS monthly_goal_performance (
  id BIGSERIAL PRIMARY KEY,
  year INTEGER NOT NULL,
  month INTEGER NOT NULL,
  goal_number INTEGER NOT NULL,
  goal_name VARCHAR(200) NOT NULL,
  target_value DECIMAL(10,2),
  actual_value DECIMAL(10,2),
  status VARCHAR(20), -- 'met', 'exceeded', 'missed', 'in_progress'
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(year, month, goal_number)
);

CREATE INDEX IF NOT EXISTS idx_monthly_goals_period ON monthly_goal_performance(year, month);
CREATE INDEX IF NOT EXISTS idx_monthly_goals_goal ON monthly_goal_performance(goal_number);

-- =============================================
-- JANUARY 2026 — All 11 Goals
-- =============================================
INSERT INTO monthly_goal_performance (year, month, goal_number, goal_name, target_value, actual_value, status, notes)
VALUES
  -- Goal 1: A/B Ratio (Target 58.5%, Actual 33.1% — missed)
  (2026, 1, 1, 'A/B Ratio', 58.5, 33.1, 'missed', 'Ranked 21st/21 shops. Gap: 25.4pp'),
  -- Goal 2: NPS Surveys (Target 1/month, 1 scored — met)
  (2026, 1, 2, 'NPS Surveys', 1, 1, 'met', '18 surveys sent, 1 response scored'),
  -- Goal 3: Training (5 completed in Jan — met, on track)
  (2026, 1, 3, 'Training Completion', 100, 100, 'met', '5 completions in Jan: GPP-0110 (Armando, Ken, Huber 1/12), Garmin (Watson, Huber 1/30)'),
  -- Goal 4: Flat Rate Re-eval (process/analysis — met as ongoing)
  (2026, 1, 4, 'Flat Rate Re-evaluation', 100, 50, 'met', 'Data collection in progress via squawk tracking'),
  -- Goal 5: Customer Experience (process — met)
  (2026, 1, 5, 'Customer Experience', 100, 100, 'met', 'Prompt communication maintained'),
  -- Goal 6: Expense Budget (no actuals yet — met by default until income statement)
  (2026, 1, 6, 'Expense Budget', 100, 100, 'met', 'Awaiting Jan income statement for actual expense review'),
  -- Goal 7: Audits (2 findings in Jan AFL — missed)
  (2026, 1, 7, 'Audit Zero Findings', 0, 2, 'missed', 'AFL Jan 21: 2 findings (flame locker checklist items, unserviceable hoses mixed with serviceable)'),
  -- Goal 8: Monthly A/B Plan (planning active — met)
  (2026, 1, 8, 'Monthly A/B Plan', 100, 100, 'met', 'Monthly plan established for A/B improvement'),
  -- Goal 9: Dealer Programs (57 programs tracked, 100% through tab — met)
  (2026, 1, 9, 'Dealer Programs', 100, 100, 'met', 'All dealer programs processed through proper tab'),
  -- Goal 10: Vendor Disputes (CT8VA-A communicated same day — met)
  (2026, 1, 10, 'Vendor Disputes', 100, 100, 'met', 'CT8VA-A FalconCare claim communicated to BZ same day (0 days). Approved $4,445.'),
  -- Goal 11: Risk Identification (strategic — met as ongoing)
  (2026, 1, 11, 'Risk Identification', 100, 50, 'met', 'Risk assessment ongoing')
ON CONFLICT (year, month, goal_number) DO UPDATE SET
  actual_value = EXCLUDED.actual_value,
  status = EXCLUDED.status,
  notes = EXCLUDED.notes,
  updated_at = NOW();

-- =============================================
-- FEBRUARY 2026 — All 11 Goals (in progress)
-- =============================================
INSERT INTO monthly_goal_performance (year, month, goal_number, goal_name, target_value, actual_value, status, notes)
VALUES
  -- Goal 1: A/B Ratio (improving but still below target)
  (2026, 2, 1, 'A/B Ratio', 58.5, 38.8, 'in_progress', 'Current MTD ~38.8%. Improving from Jan 33.1%.'),
  -- Goal 2: NPS Surveys (25 sent, 0 scored yet)
  (2026, 2, 2, 'NPS Surveys', 1, 0, 'in_progress', '25 surveys sent in Feb, awaiting responses'),
  -- Goal 3: Training (5 completed in Feb so far)
  (2026, 2, 3, 'Training Completion', 100, 100, 'in_progress', '5 completions: San Marino (Huber 2/17), CMMC (Edduyn 2/5, Watson 2/3, Jose 2/10), VI/QI/RTS (Jose 2/10)'),
  -- Goal 4: Flat Rate (ongoing)
  (2026, 2, 4, 'Flat Rate Re-evaluation', 100, 50, 'in_progress', 'Continuing data analysis'),
  -- Goal 5: Customer Experience (ongoing)
  (2026, 2, 5, 'Customer Experience', 100, 100, 'in_progress', 'Communication standards maintained'),
  -- Goal 6: Expense Budget (awaiting Feb statement)
  (2026, 2, 6, 'Expense Budget', 100, 100, 'in_progress', 'Awaiting Feb income statement'),
  -- Goal 7: Audits (Feb AFL clean — 0 findings)
  (2026, 2, 7, 'Audit Zero Findings', 0, 0, 'in_progress', 'AFL Feb 16: No findings - Passed'),
  -- Goal 8: Monthly A/B Plan (active)
  (2026, 2, 8, 'Monthly A/B Plan', 100, 100, 'in_progress', 'Feb plan active, tracking improvement from Jan'),
  -- Goal 9: Dealer Programs (compliant)
  (2026, 2, 9, 'Dealer Programs', 100, 100, 'in_progress', '57 programs tracked, 100% through dealer tab'),
  -- Goal 10: Vendor Disputes (CMJA communicated same day)
  (2026, 2, 10, 'Vendor Disputes', 100, 100, 'in_progress', 'CMJA Honeywell dispute communicated to BZ same day (0 days). MSP contract delay.'),
  -- Goal 11: Risk Identification (ongoing)
  (2026, 2, 11, 'Risk Identification', 100, 50, 'in_progress', 'Risk assessment continuing')
ON CONFLICT (year, month, goal_number) DO UPDATE SET
  actual_value = EXCLUDED.actual_value,
  status = EXCLUDED.status,
  notes = EXCLUDED.notes,
  updated_at = NOW();
