-- =====================================================
-- Add Performance Indexes for Payments Table
-- Migration: 013_add_payment_indexes.sql
-- Description: Adds indexes to optimize payment queries
-- =====================================================

-- Index for filtering payments by payroll_id (most common query)
CREATE INDEX IF NOT EXISTS idx_payments_payroll_id ON public.payments(payroll_id);

-- Index for filtering payments by employee_id
CREATE INDEX IF NOT EXISTS idx_payments_employee_id ON public.payments(employee_id);

-- Index for filtering payments by payment_date (for date-based queries)
CREATE INDEX IF NOT EXISTS idx_payments_payment_date ON public.payments(payment_date);

-- Composite index for employee + payroll queries (used in wage cards)
CREATE INDEX IF NOT EXISTS idx_payments_employee_payroll ON public.payments(employee_id, payroll_id);

-- Composite index for date range queries with employee
CREATE INDEX IF NOT EXISTS idx_payments_employee_date ON public.payments(employee_id, payment_date);

-- Success message
DO $$
BEGIN
  RAISE NOTICE '✅ Payment indexes created successfully!';
  RAISE NOTICE 'Indexes added: payroll_id, employee_id, payment_date, and composite indexes';
  RAISE NOTICE 'This will significantly improve payment query performance.';
END $$;

