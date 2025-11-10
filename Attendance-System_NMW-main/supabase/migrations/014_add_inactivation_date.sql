-- Migration: Add inactivation_date column to employees table
-- Description: Adds date tracking for when employees become inactive
-- Date: 2025-01-15

-- Add inactivation_date column to employees table
ALTER TABLE employees 
ADD COLUMN IF NOT EXISTS inactivation_date DATE;

-- Create index for better performance on queries filtering by inactive employees
CREATE INDEX IF NOT EXISTS idx_employees_inactivation_date 
ON employees(inactivation_date) WHERE inactivation_date IS NOT NULL;

-- Add comment for documentation
COMMENT ON COLUMN employees.inactivation_date IS 
'Date when the employee was marked as inactive. NULL if employee is currently active.';

-- Create trigger to automatically set inactivation_date when is_active changes to false
CREATE OR REPLACE FUNCTION set_inactivation_date()
RETURNS TRIGGER AS $$
BEGIN
  -- When employee becomes inactive, set inactivation_date to current date if not already set
  IF NEW.is_active = false AND OLD.is_active = true AND NEW.inactivation_date IS NULL THEN
    NEW.inactivation_date := CURRENT_DATE;
  END IF;
  
  -- When employee becomes active again, clear inactivation_date
  IF NEW.is_active = true AND OLD.is_active = false THEN
    NEW.inactivation_date := NULL;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
DROP TRIGGER IF EXISTS trigger_set_inactivation_date ON employees;
CREATE TRIGGER trigger_set_inactivation_date
BEFORE UPDATE OF is_active ON employees
FOR EACH ROW
WHEN (NEW.is_active IS DISTINCT FROM OLD.is_active)
EXECUTE FUNCTION set_inactivation_date();

-- Add comment for documentation
COMMENT ON FUNCTION set_inactivation_date() IS 
'Trigger function to automatically set/clear inactivation_date when employee status changes';


