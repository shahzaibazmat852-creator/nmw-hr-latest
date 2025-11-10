-- =====================================================
-- Add Night Shift Configuration to Department Rules
-- Migration: 009_add_night_shift_rules.sql
-- Description: Adds night shift duty hours configuration per department
-- =====================================================

-- Add night shift hours columns to department_calculation_rules table
ALTER TABLE public.department_calculation_rules 
ADD COLUMN IF NOT EXISTS day_shift_hours numeric DEFAULT 8,
ADD COLUMN IF NOT EXISTS night_shift_hours numeric DEFAULT 8,
ADD COLUMN IF NOT EXISTS night_shift_multiplier numeric DEFAULT 1.5;

-- Add comments for clarity
COMMENT ON COLUMN public.department_calculation_rules.day_shift_hours IS 'Standard duty hours for day shift';
COMMENT ON COLUMN public.department_calculation_rules.night_shift_hours IS 'Standard duty hours for night shift';
COMMENT ON COLUMN public.department_calculation_rules.night_shift_multiplier IS 'Overtime multiplier for night shift (default 1.5x)';

-- Update Enamel department with shift-specific hours
UPDATE public.department_calculation_rules
SET 
  day_shift_hours = 11,
  night_shift_hours = 13,
  night_shift_multiplier = 1.5,
  standard_hours_per_day = 11  -- Keep day shift as default
WHERE department = 'Enamel';

-- Update Workshop to have consistent shift hours
UPDATE public.department_calculation_rules
SET 
  day_shift_hours = 8.5,
  night_shift_hours = 8.5,
  night_shift_multiplier = 1.5,
  standard_hours_per_day = 8.5
WHERE department = 'Workshop';

-- Set default values for other departments (if they exist)
UPDATE public.department_calculation_rules
SET 
  day_shift_hours = COALESCE(day_shift_hours, standard_hours_per_day, 8),
  night_shift_hours = COALESCE(night_shift_hours, standard_hours_per_day, 8),
  night_shift_multiplier = COALESCE(night_shift_multiplier, overtime_multiplier, 1.5)
WHERE department NOT IN ('Enamel', 'Workshop');
