-- =====================================================
-- Fix Cooks Department Rules
-- Migration: 007_fix_cooks_department_rules.sql
-- Description: Remove exemption from deductions for Cooks department
-- =====================================================

-- Update Cooks department to NOT be exempt from deductions
-- Cooks should be treated like other production departments (Enamel, Workshop)
UPDATE department_calculation_rules
SET 
  is_exempt_from_deductions = false,
  is_exempt_from_overtime = false,
  max_advance_percentage = 50
WHERE department = 'Cooks';

-- If the Cooks rule doesn't exist yet, insert it with proper settings
INSERT INTO department_calculation_rules (
  department,
  is_exempt_from_deductions,
  is_exempt_from_overtime,
  max_overtime_hours_per_day,
  max_advance_percentage,
  working_days_per_month,
  standard_hours_per_day,
  overtime_multiplier,
  min_hours_full_day,
  half_day_hours
)
SELECT 
  'Cooks',
  false,  -- NOT exempt from deductions
  false,  -- NOT exempt from overtime
  4,
  50,
  30,
  8,
  1.5,
  8,
  4
WHERE NOT EXISTS (
  SELECT 1 FROM department_calculation_rules WHERE department = 'Cooks'
);

-- Add a comment for documentation
COMMENT ON TABLE department_calculation_rules IS 'Department-specific salary calculation rules. Cooks department is NOT exempt from deductions and should have salary calculated based on attendance like Enamel and Workshop departments.';
