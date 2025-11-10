-- Migration: Add biometric authentication columns to employees table
-- Description: Adds missing biometric columns required for WebAuthn authentication
-- Date: 2025-10-24

-- Add biometric authentication columns to employees table
ALTER TABLE employees 
ADD COLUMN IF NOT EXISTS biometric_registered BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS biometric_credential_id TEXT,
ADD COLUMN IF NOT EXISTS biometric_public_key TEXT,
ADD COLUMN IF NOT EXISTS biometric_registered_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS biometric_device_info JSONB;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_employees_biometric_registered 
ON employees(biometric_registered);

CREATE INDEX IF NOT EXISTS idx_employees_biometric_credential_id 
ON employees(biometric_credential_id);

-- Add comments for documentation
COMMENT ON COLUMN employees.biometric_registered IS 
'Whether the employee has registered for biometric authentication';

COMMENT ON COLUMN employees.biometric_credential_id IS 
'Base64 encoded credential ID for WebAuthn authentication';

COMMENT ON COLUMN employees.biometric_public_key IS 
'Base64 encoded public key for WebAuthn authentication';

COMMENT ON COLUMN employees.biometric_registered_at IS 
'Timestamp when biometric authentication was registered';

COMMENT ON COLUMN employees.biometric_device_info IS 
'JSON object containing device information for biometric authentication';

-- Create biometric_devices table for storing multiple device registrations
CREATE TABLE IF NOT EXISTS public.biometric_devices (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  device_id TEXT NOT NULL,
  device_name TEXT NOT NULL,
  credential_id TEXT NOT NULL,
  public_key TEXT NOT NULL,
  registered_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  last_used TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  device_info JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create indexes for biometric_devices table
CREATE INDEX IF NOT EXISTS idx_biometric_devices_employee_id 
ON biometric_devices(employee_id);

CREATE INDEX IF NOT EXISTS idx_biometric_devices_credential_id 
ON biometric_devices(credential_id);

CREATE INDEX IF NOT EXISTS idx_biometric_devices_active 
ON biometric_devices(is_active);

-- Add trigger for automatic timestamp updates
CREATE TRIGGER update_biometric_devices_updated_at
  BEFORE UPDATE ON public.biometric_devices
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Add comment for documentation
COMMENT ON TABLE public.biometric_devices IS 
'Stores biometric device registrations for employees';

-- Update existing employees to have default values for new columns
UPDATE employees
SET biometric_registered = false
WHERE biometric_registered IS NULL;

-- Verify migration
SELECT 
  employee_id, 
  name,
  biometric_registered,
  biometric_credential_id
FROM employees
ORDER BY created_at DESC
LIMIT 5;