-- Create edit_history table to track changes to payments and attendance records
CREATE TABLE IF NOT EXISTS public.edit_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  user_email TEXT NOT NULL,
  table_name TEXT NOT NULL,
  record_id UUID NOT NULL,
  action TEXT NOT NULL, -- 'UPDATE' or 'DELETE'
  old_values JSONB,
  new_values JSONB,
  changed_fields TEXT[],
  ip_address TEXT,
  user_agent TEXT,
  edited_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_edit_history_user_id ON public.edit_history(user_id);
CREATE INDEX IF NOT EXISTS idx_edit_history_table_name ON public.edit_history(table_name);
CREATE INDEX IF NOT EXISTS idx_edit_history_record_id ON public.edit_history(record_id);
CREATE INDEX IF NOT EXISTS idx_edit_history_edited_at ON public.edit_history(edited_at DESC);
CREATE INDEX IF NOT EXISTS idx_edit_history_user_email ON public.edit_history(user_email);

-- Enable Row Level Security
ALTER TABLE public.edit_history ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Allow authenticated users to read edit history" ON public.edit_history;
DROP POLICY IF EXISTS "Allow authenticated users to insert edit history" ON public.edit_history;

-- Create policy for authenticated users to read edit history
CREATE POLICY "Allow authenticated users to read edit history"
  ON public.edit_history
  FOR SELECT
  TO authenticated
  USING (true);

-- Create policy to allow system to insert edit history
CREATE POLICY "Allow authenticated users to insert edit history"
  ON public.edit_history
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Create trigger function to log attendance updates
CREATE OR REPLACE FUNCTION log_attendance_edit()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.edit_history (
    user_id,
    user_email,
    table_name,
    record_id,
    action,
    old_values,
    new_values,
    changed_fields
  )
  VALUES (
    auth.uid(),
    auth.email(),
    'attendance',
    OLD.id,
    'UPDATE',
    to_jsonb(OLD),
    to_jsonb(NEW),
    ARRAY(
      SELECT key 
      FROM jsonb_each(to_jsonb(OLD)) 
      WHERE to_jsonb(OLD)->key IS DISTINCT FROM to_jsonb(NEW)->key
    )
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger function to log attendance deletions
CREATE OR REPLACE FUNCTION log_attendance_delete()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.edit_history (
    user_id,
    user_email,
    table_name,
    record_id,
    action,
    old_values,
    new_values,
    changed_fields
  )
  VALUES (
    auth.uid(),
    auth.email(),
    'attendance',
    OLD.id,
    'DELETE',
    to_jsonb(OLD),
    NULL,
    ARRAY(SELECT key FROM jsonb_object_keys(to_jsonb(OLD)) key)
  );
  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger function to log payment updates
CREATE OR REPLACE FUNCTION log_payment_edit()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.edit_history (
    user_id,
    user_email,
    table_name,
    record_id,
    action,
    old_values,
    new_values,
    changed_fields
  )
  VALUES (
    auth.uid(),
    auth.email(),
    'payments',
    OLD.id,
    'UPDATE',
    to_jsonb(OLD),
    to_jsonb(NEW),
    ARRAY(
      SELECT key 
      FROM jsonb_each(to_jsonb(OLD)) 
      WHERE to_jsonb(OLD)->key IS DISTINCT FROM to_jsonb(NEW)->key
    )
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger function to log payment deletions
CREATE OR REPLACE FUNCTION log_payment_delete()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.edit_history (
    user_id,
    user_email,
    table_name,
    record_id,
    action,
    old_values,
    new_values,
    changed_fields
  )
  VALUES (
    auth.uid(),
    auth.email(),
    'payments',
    OLD.id,
    'DELETE',
    to_jsonb(OLD),
    NULL,
    ARRAY(SELECT key FROM jsonb_object_keys(to_jsonb(OLD)) key)
  );
  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger function to log payroll updates
CREATE OR REPLACE FUNCTION log_payroll_edit()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.edit_history (
    user_id,
    user_email,
    table_name,
    record_id,
    action,
    old_values,
    new_values,
    changed_fields
  )
  VALUES (
    auth.uid(),
    auth.email(),
    'payroll',
    OLD.id,
    'UPDATE',
    to_jsonb(OLD),
    to_jsonb(NEW),
    ARRAY(
      SELECT key 
      FROM jsonb_each(to_jsonb(OLD)) 
      WHERE to_jsonb(OLD)->key IS DISTINCT FROM to_jsonb(NEW)->key
    )
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Attach triggers to tables
DROP TRIGGER IF EXISTS attendance_edit_trigger ON public.attendance;
CREATE TRIGGER attendance_edit_trigger
  AFTER UPDATE ON public.attendance
  FOR EACH ROW
  WHEN (OLD.* IS DISTINCT FROM NEW.*)
  EXECUTE FUNCTION log_attendance_edit();

DROP TRIGGER IF EXISTS attendance_delete_trigger ON public.attendance;
CREATE TRIGGER attendance_delete_trigger
  AFTER DELETE ON public.attendance
  FOR EACH ROW
  EXECUTE FUNCTION log_attendance_delete();

DROP TRIGGER IF EXISTS payment_edit_trigger ON public.payments;
CREATE TRIGGER payment_edit_trigger
  AFTER UPDATE ON public.payments
  FOR EACH ROW
  WHEN (OLD.* IS DISTINCT FROM NEW.*)
  EXECUTE FUNCTION log_payment_edit();

DROP TRIGGER IF EXISTS payment_delete_trigger ON public.payments;
CREATE TRIGGER payment_delete_trigger
  AFTER DELETE ON public.payments
  FOR EACH ROW
  EXECUTE FUNCTION log_payment_delete();

DROP TRIGGER IF EXISTS payroll_edit_trigger ON public.payroll;
CREATE TRIGGER payroll_edit_trigger
  AFTER UPDATE ON public.payroll
  FOR EACH ROW
  WHEN (OLD.* IS DISTINCT FROM NEW.*)
  EXECUTE FUNCTION log_payroll_edit();

-- Function to cleanup old edit history (optional - keeps last 12 months)
CREATE OR REPLACE FUNCTION cleanup_old_edit_history()
RETURNS void AS $$
BEGIN
  DELETE FROM public.edit_history
  WHERE edited_at < NOW() - INTERVAL '12 months';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add comment
COMMENT ON TABLE public.edit_history IS 'Tracks all edits made to attendance, payments, and payroll records';
