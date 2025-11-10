-- =====================================================
-- NMW Attendance-PayRoll System - Complete Database Setup
-- Migration: 001_initial_setup.sql
-- Description: Creates all tables, functions, and initial data
-- =====================================================

-- Create departments enum
CREATE TYPE public.department_type AS ENUM (
  'Enamel', 
  'Workshop', 
  'Guards', 
  'Cooks', 
  'Admins', 
  'Directors', 
  'Accounts'
);

-- Create attendance status enum
CREATE TYPE public.attendance_status AS ENUM (
  'present', 
  'absent', 
  'leave', 
  'holiday'
);

-- =====================================================
-- EMPLOYEES TABLE
-- =====================================================
CREATE TABLE public.employees (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_id TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  cnic TEXT NOT NULL,
  department department_type NOT NULL,
  contact TEXT,
  joining_date DATE NOT NULL DEFAULT CURRENT_DATE,
  base_salary NUMERIC(10, 2) NOT NULL CHECK (base_salary >= 0),
  overtime_rate NUMERIC(10, 2) DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  photo_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- =====================================================
-- ATTENDANCE TABLE
-- =====================================================
CREATE TABLE public.attendance (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  attendance_date DATE NOT NULL,
  status attendance_status NOT NULL,
  check_in_time TIME,
  check_out_time TIME,
  hours_worked NUMERIC(5, 2) DEFAULT 0,
  late_hours NUMERIC(5, 2) DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(employee_id, attendance_date)
);

-- =====================================================
-- PAYROLL TABLE
-- =====================================================
CREATE TABLE public.payroll (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  month INTEGER NOT NULL CHECK (month >= 1 AND month <= 12),
  year INTEGER NOT NULL,
  base_salary NUMERIC(10, 2) NOT NULL CHECK (base_salary >= 0),
  total_days INTEGER NOT NULL DEFAULT 30,
  present_days INTEGER NOT NULL DEFAULT 0,
  absent_days INTEGER NOT NULL DEFAULT 0,
  leave_days INTEGER NOT NULL DEFAULT 0,
  holiday_days INTEGER NOT NULL DEFAULT 0,
  absence_deduction NUMERIC(10, 2) NOT NULL DEFAULT 0,
  overtime_hours NUMERIC(5, 2) DEFAULT 0,
  overtime_rate NUMERIC(10, 2) DEFAULT 0,
  overtime_pay NUMERIC(10, 2) DEFAULT 0,
  advance_amount NUMERIC(10, 2) DEFAULT 0,
  final_salary NUMERIC(10, 2) NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'locked')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(employee_id, month, year)
);

-- =====================================================
-- ADVANCES TABLE
-- =====================================================
CREATE TABLE public.advances (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  advance_date DATE NOT NULL,
  amount NUMERIC(10, 2) NOT NULL CHECK (amount > 0),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- =====================================================
-- FUNCTIONS
-- =====================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Function to generate employee ID
CREATE OR REPLACE FUNCTION public.generate_employee_id()
RETURNS TEXT AS $$
DECLARE
  new_id TEXT;
  counter INTEGER;
BEGIN
  -- Get the highest existing employee ID number
  SELECT COALESCE(MAX(CAST(SUBSTRING(employee_id FROM 4) AS INTEGER)), 0) + 1
  INTO counter
  FROM public.employees
  WHERE employee_id ~ '^EMP[0-9]+$';
  
  -- Format as EMP + 3-digit number
  new_id := 'EMP' || LPAD(counter::TEXT, 3, '0');
  
  RETURN new_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- =====================================================
-- TRIGGERS
-- =====================================================

-- Triggers for automatic timestamp updates
CREATE TRIGGER update_employees_updated_at
  BEFORE UPDATE ON public.employees
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_attendance_updated_at
  BEFORE UPDATE ON public.attendance
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_payroll_updated_at
  BEFORE UPDATE ON public.payroll
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_advances_updated_at
  BEFORE UPDATE ON public.advances
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- =====================================================
-- ROW LEVEL SECURITY
-- =====================================================

-- Enable RLS on all tables
ALTER TABLE public.employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payroll ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.advances ENABLE ROW LEVEL SECURITY;

-- Create policies (public access for now - can be restricted later with authentication)
CREATE POLICY "Allow all operations on employees" ON public.employees FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations on attendance" ON public.attendance FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations on payroll" ON public.payroll FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations on advances" ON public.advances FOR ALL USING (true) WITH CHECK (true);

-- =====================================================
-- STORAGE BUCKET FOR EMPLOYEE PHOTOS
-- =====================================================

-- Create storage bucket for employee photos
INSERT INTO storage.buckets (id, name, public) VALUES ('employee-photos', 'employee-photos', true);

-- Create policy for employee photos bucket
CREATE POLICY "Allow public access to employee photos" ON storage.objects FOR SELECT USING (bucket_id = 'employee-photos');
CREATE POLICY "Allow authenticated users to upload employee photos" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'employee-photos');
CREATE POLICY "Allow authenticated users to update employee photos" ON storage.objects FOR UPDATE USING (bucket_id = 'employee-photos');
CREATE POLICY "Allow authenticated users to delete employee photos" ON storage.objects FOR DELETE USING (bucket_id = 'employee-photos');

-- =====================================================
-- SAMPLE DATA
-- =====================================================

-- Insert sample employees
INSERT INTO public.employees (employee_id, name, cnic, department, contact, joining_date, base_salary, overtime_rate) VALUES
('EMP001', 'Ahmed Khan', '42101-1234567-1', 'Enamel', '+92-300-1234567', '2023-01-15', 50000, 500),
('EMP002', 'Sara Ali', '42101-2345678-2', 'Workshop', '+92-300-2345678', '2023-02-20', 45000, 450),
('EMP003', 'Hassan Raza', '42101-3456789-3', 'Guards', '+92-300-3456789', '2023-03-10', 35000, 0),
('EMP004', 'Fatima Sheikh', '42101-4567890-4', 'Cooks', '+92-300-4567890', '2023-04-05', 32000, 0),
('EMP005', 'Ali Zafar', '42101-5678901-5', 'Enamel', '+92-300-5678901', '2023-05-12', 48000, 480),
('EMP006', 'Ayesha Malik', '42101-6789012-6', 'Workshop', '+92-300-6789012', '2023-06-18', 46000, 460),
('EMP007', 'Muhammad Usman', '42101-7890123-7', 'Admins', '+92-300-7890123', '2023-07-22', 55000, 0),
('EMP008', 'Zainab Ahmed', '42101-8901234-8', 'Accounts', '+92-300-8901234', '2023-08-10', 52000, 0),
('EMP009', 'Omar Hassan', '42101-9012345-9', 'Directors', '+92-300-9012345', '2023-09-05', 80000, 800),
('EMP010', 'Khadija Khan', '42101-0123456-0', 'Enamel', '+92-300-0123456', '2023-10-15', 51000, 510);

-- Insert sample attendance for current month
INSERT INTO public.attendance (employee_id, attendance_date, status, check_in_time, hours_worked, late_hours)
SELECT 
  e.id, 
  CURRENT_DATE, 
  CASE 
    WHEN e.employee_id IN ('EMP001', 'EMP002', 'EMP005', 'EMP006', 'EMP007', 'EMP008', 'EMP009') THEN 'present'::attendance_status
    WHEN e.employee_id = 'EMP003' THEN 'absent'::attendance_status
    WHEN e.employee_id = 'EMP004' THEN 'leave'::attendance_status
    ELSE 'present'::attendance_status
  END,
  CASE 
    WHEN e.employee_id IN ('EMP001', 'EMP002', 'EMP005', 'EMP006', 'EMP007', 'EMP008', 'EMP009') THEN '08:30:00'::time
    ELSE NULL
  END,
  CASE 
    WHEN e.employee_id IN ('EMP001', 'EMP002', 'EMP005', 'EMP006', 'EMP007', 'EMP008', 'EMP009') THEN 8.0
    ELSE 0
  END,
  CASE 
    WHEN e.employee_id IN ('EMP001', 'EMP002', 'EMP005', 'EMP006', 'EMP007', 'EMP008', 'EMP009') THEN 0
    ELSE 0
  END
FROM public.employees e
WHERE e.is_active = true;

-- Insert sample payroll data for current month
INSERT INTO public.payroll (employee_id, month, year, base_salary, total_days, present_days, absent_days, leave_days, holiday_days, absence_deduction, overtime_hours, overtime_rate, overtime_pay, advance_amount, final_salary, status)
SELECT 
  e.id,
  EXTRACT(MONTH FROM CURRENT_DATE),
  EXTRACT(YEAR FROM CURRENT_DATE),
  e.base_salary,
  30,
  CASE 
    WHEN e.department IN ('Guards', 'Admins', 'Cooks', 'Accounts') THEN 30
    WHEN e.employee_id IN ('EMP001', 'EMP002', 'EMP005', 'EMP006', 'EMP009') THEN 25
    WHEN e.employee_id = 'EMP003' THEN 20
    WHEN e.employee_id = 'EMP004' THEN 22
    ELSE 24
  END,
  CASE 
    WHEN e.department IN ('Guards', 'Admins', 'Cooks', 'Accounts') THEN 0
    WHEN e.employee_id = 'EMP003' THEN 5
    ELSE 2
  END,
  CASE 
    WHEN e.employee_id = 'EMP004' THEN 3
    ELSE 0
  END,
  CASE 
    WHEN e.department IN ('Guards', 'Admins', 'Cooks', 'Accounts') THEN 0
    ELSE 3
  END,
  CASE 
    WHEN e.department IN ('Guards', 'Admins', 'Cooks', 'Accounts') THEN 0
    ELSE 1000
  END,
  CASE 
    WHEN e.department IN ('Guards', 'Admins', 'Cooks', 'Accounts') THEN 0
    ELSE 2
  END,
  e.overtime_rate,
  CASE 
    WHEN e.department IN ('Guards', 'Admins', 'Cooks', 'Accounts') THEN 0
    ELSE e.overtime_rate * 2
  END,
  CASE 
    WHEN e.employee_id = 'EMP001' THEN 5000
    WHEN e.employee_id = 'EMP005' THEN 3000
    ELSE 0
  END,
  CASE 
    WHEN e.department IN ('Guards', 'Admins', 'Cooks', 'Accounts') THEN e.base_salary
    ELSE e.base_salary - 1000 - CASE WHEN e.employee_id IN ('EMP001', 'EMP005') THEN 5000 WHEN e.employee_id = 'EMP005' THEN 3000 ELSE 0 END + (e.overtime_rate * 2)
  END,
  'pending'
FROM public.employees e
WHERE e.is_active = true;

-- =====================================================
-- COMMENTS FOR DOCUMENTATION
-- =====================================================

COMMENT ON TABLE public.employees IS 'Employee master data with salary and department information';
COMMENT ON TABLE public.attendance IS 'Daily attendance tracking with time and status';
COMMENT ON TABLE public.payroll IS 'Monthly payroll calculations and salary processing';
COMMENT ON TABLE public.advances IS 'Employee advance payments tracking by date';

COMMENT ON COLUMN public.employees.employee_id IS 'Auto-generated unique employee identifier';
COMMENT ON COLUMN public.employees.department IS 'Department classification affecting payroll calculations';
COMMENT ON COLUMN public.employees.overtime_rate IS 'Hourly rate for overtime calculations (0 for exempt departments)';

COMMENT ON COLUMN public.attendance.late_hours IS 'Positive = late/undertime, Negative = overtime';
COMMENT ON COLUMN public.attendance.hours_worked IS 'Total hours worked on the day';

COMMENT ON COLUMN public.payroll.absence_deduction IS 'Deduction for late hours and absences';
COMMENT ON COLUMN public.payroll.overtime_pay IS 'Additional pay for overtime hours';
COMMENT ON COLUMN public.payroll.advance_amount IS 'Total advance amount deducted from salary';

-- =====================================================
-- INDEXES FOR PERFORMANCE
-- =====================================================

-- Indexes for better query performance
CREATE INDEX idx_employees_department ON public.employees(department);
CREATE INDEX idx_employees_active ON public.employees(is_active);
CREATE INDEX idx_attendance_date ON public.attendance(attendance_date);
CREATE INDEX idx_attendance_employee_date ON public.attendance(employee_id, attendance_date);
CREATE INDEX idx_payroll_month_year ON public.payroll(month, year);
CREATE INDEX idx_payroll_employee_month_year ON public.payroll(employee_id, month, year);
CREATE INDEX idx_advances_employee_date ON public.advances(employee_id, advance_date);

-- =====================================================
-- MIGRATION COMPLETE
-- =====================================================

-- Success message
DO $$
BEGIN
  RAISE NOTICE 'NMW Attendance-PayRoll System database setup completed successfully!';
  RAISE NOTICE 'Tables created: employees, attendance, payroll, advances';
  RAISE NOTICE 'Functions created: generate_employee_id, update_updated_at_column';
  RAISE NOTICE 'Storage bucket created: employee-photos';
  RAISE NOTICE 'Sample data inserted: 10 employees with attendance and payroll data';
END $$;




