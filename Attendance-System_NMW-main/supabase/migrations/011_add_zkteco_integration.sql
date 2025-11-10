-- Migration: Add ZKTeco device integration support
-- Description: Adds biometric_device_user_id to employees table for ZKTeco device mapping
-- Date: 2025-10-19

-- Add biometric_device_user_id column to employees table
-- This maps employee_id (EMP001) to device user ID (1)
ALTER TABLE employees 
ADD COLUMN IF NOT EXISTS biometric_device_user_id INTEGER UNIQUE;

-- Add comment to explain the column
COMMENT ON COLUMN employees.biometric_device_user_id IS 
'Numeric user ID used by ZKTeco biometric device. Derived from employee_id (e.g., EMP001 -> 1)';

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_employees_biometric_device_user_id 
ON employees(biometric_device_user_id);

-- Function to auto-generate biometric_device_user_id from employee_id
CREATE OR REPLACE FUNCTION generate_biometric_device_user_id()
RETURNS TRIGGER AS $$
BEGIN
  -- Extract numeric part from employee_id (e.g., EMP001 -> 1)
  IF NEW.employee_id IS NOT NULL AND NEW.biometric_device_user_id IS NULL THEN
    NEW.biometric_device_user_id := CAST(REGEXP_REPLACE(NEW.employee_id, '[^0-9]', '', 'g') AS INTEGER);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-populate biometric_device_user_id
DROP TRIGGER IF EXISTS set_biometric_device_user_id ON employees;
CREATE TRIGGER set_biometric_device_user_id
  BEFORE INSERT OR UPDATE ON employees
  FOR EACH ROW
  EXECUTE FUNCTION generate_biometric_device_user_id();

-- Update existing employees with biometric_device_user_id
UPDATE employees
SET biometric_device_user_id = CAST(REGEXP_REPLACE(employee_id, '[^0-9]', '', 'g') AS INTEGER)
WHERE biometric_device_user_id IS NULL AND employee_id IS NOT NULL;

-- Verify migration
SELECT 
  employee_id, 
  biometric_device_user_id,
  name
FROM employees
ORDER BY biometric_device_user_id
LIMIT 10;
