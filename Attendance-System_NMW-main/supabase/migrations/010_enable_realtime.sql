-- Migration: Enable Realtime for all tables
-- Description: Enables Supabase Realtime subscriptions for all core tables
-- Date: 2025-10-19

-- Enable realtime replication for employees table
ALTER PUBLICATION supabase_realtime ADD TABLE employees;

-- Enable realtime replication for attendance table
ALTER PUBLICATION supabase_realtime ADD TABLE attendance;

-- Enable realtime replication for payroll table
ALTER PUBLICATION supabase_realtime ADD TABLE payroll;

-- Enable realtime replication for advances table
ALTER PUBLICATION supabase_realtime ADD TABLE advances;

-- Enable realtime replication for payments table
ALTER PUBLICATION supabase_realtime ADD TABLE payments;

-- Enable realtime replication for biometric_devices table
ALTER PUBLICATION supabase_realtime ADD TABLE biometric_devices;

-- Optional: Enable realtime for other tables if they exist
-- ALTER PUBLICATION supabase_realtime ADD TABLE department_rules;
-- ALTER PUBLICATION supabase_realtime ADD TABLE edit_history;
-- ALTER PUBLICATION supabase_realtime ADD TABLE login_history;

-- Verify replication is enabled
-- SELECT schemaname, tablename 
-- FROM pg_publication_tables 
-- WHERE pubname = 'supabase_realtime';
