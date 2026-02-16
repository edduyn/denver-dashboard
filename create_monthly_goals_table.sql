-- Monthly goal performance tracking
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

-- Insert January 2026 actual performance
INSERT INTO monthly_goal_performance (year, month, goal_number, goal_name, target_value, actual_value, status, notes)
VALUES 
  (2026, 1, 1, 'A/B Ratio', 58.5, 33.1, 'missed', 'Ranked 21st/21 shops. Gap: 25.4pp'),
  (2026, 1, 2, 'NPS Surveys', 1, 23, 'exceeded', '23 surveys sent vs 1 required'),
  (2026, 1, 3, 'Training Completion', 100, 0, 'missed', 'No training completed in January')
ON CONFLICT (year, month, goal_number) DO UPDATE SET
  actual_value = EXCLUDED.actual_value,
  status = EXCLUDED.status,
  notes = EXCLUDED.notes,
  updated_at = NOW();

-- February 2026 (in progress as of Feb 16)
INSERT INTO monthly_goal_performance (year, month, goal_number, goal_name, target_value, actual_value, status, notes)
VALUES 
  (2026, 2, 1, 'A/B Ratio', 58.5, 38.8, 'in_progress', 'Current MTD: 38.8%. Still below target.'),
  (2026, 2, 2, 'NPS Surveys', 1, 0, 'in_progress', 'No surveys sent yet in February'),
  (2026, 2, 3, 'Training Completion', 100, 25, 'in_progress', '2 completed (Garmin training on 1/30)')
ON CONFLICT (year, month, goal_number) DO UPDATE SET
  actual_value = EXCLUDED.actual_value,
  status = EXCLUDED.status,
  notes = EXCLUDED.notes,
  updated_at = NOW();
