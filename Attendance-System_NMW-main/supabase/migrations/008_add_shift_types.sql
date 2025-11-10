-- =====================================================
-- Add Shift Type Support for Enamel Department
-- Migration: 008_add_shift_types.sql
-- Description: Adds shift type column and updates department rules
-- =====================================================

-- Create shift type enum
CREATE TYPE public.shift_type AS ENUM (
  'day',
  'night',
  'regular'
);

-- Add shift_type column to attendance table
ALTER TABLE public.attendance 
ADD COLUMN shift_type shift_type DEFAULT 'regular';

-- Add comment
COMMENT ON COLUMN public.attendance.shift_type IS 'Shift type for attendance: day (11 hours for Enamel), night (13 hours for Enamel), regular (8.5 hours for Workshop, standard for others)';

-- Update department rules for Enamel department to support shift-based hours
-- Day shift: 11 hours, Night shift: 13 hours
UPDATE public.department_calculation_rules
SET 
  standard_hours_per_day = 11,  -- Default to day shift
  min_hours_full_day = 11,
  half_day_hours = 5.5
WHERE department = 'Enamel';

-- Update Workshop department standard hours to 8.5
UPDATE public.department_calculation_rules
SET 
  standard_hours_per_day = 8.5,
  min_hours_full_day = 8.5,
  half_day_hours = 4.25
WHERE department = 'Workshop';

-- Insert default rules if they don't exist
INSERT INTO public.department_calculation_rules (
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
VALUES 
  ('Enamel', false, false, 4, 50, 30, 11, 1.5, 11, 5.5),
  ('Workshop', false, false, 4, 50, 30, 8.5, 1.5, 8.5, 4.25)
ON CONFLICT (department) DO UPDATE
SET
  standard_hours_per_day = EXCLUDED.standard_hours_per_day,
  min_hours_full_day = EXCLUDED.min_hours_full_day,
  half_day_hours = EXCLUDED.half_day_hours;

-- Add helpful comment
COMMENT ON TYPE public.shift_type IS 'Shift types: day (11h for Enamel), night (13h for Enamel), regular (8.5h for Workshop, 8h for others)';
