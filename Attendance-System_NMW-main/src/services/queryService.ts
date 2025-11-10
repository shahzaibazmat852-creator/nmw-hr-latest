/**
 * Optimized Query Service
 * Provides pre-configured query keys and optimized data fetching patterns
 */

import { supabase } from "@/integrations/supabase/client";
import type { Employee, Attendance, Payroll } from "@/hooks";

// Query key factory
export const queryKeys = {
  employees: ["employees"] as const,
  employee: (id: string) => ["employee", id] as const,
  attendance: (date: string) => ["attendance", date] as const,
  todayAttendance: ["attendance", "today"] as const,
  employeeAttendance: (id: string, month: number, year: number) => 
    ["employee-attendance", id, month, year] as const,
  payroll: (month: number, year: number) => ["payroll", month, year] as const,
  advances: (id: string, month: number, year: number) => 
    ["employee-advances", id, month, year] as const,
  payments: (id: string, month: number, year: number) => 
    ["employee-payments", id, month, year] as const,
} as const;

/**
 * Optimized query functions with select statements
 * Only fetch what we need to reduce payload size
 */

export async function fetchEmployees() {
  const { data, error } = await supabase
    .from("employees")
    .select("id, employee_id, name, department, contact, joining_date, base_salary, overtime_rate, overtime_wage, is_active, photo_url, biometric_registered, biometric_device_user_id")
    .eq("is_active", true)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data as Employee[];
}

export async function fetchTodayAttendance(employeeIds?: string[]) {
  let query = supabase
    .from("attendance")
    .select(`
      id,
      employee_id,
      attendance_date,
      status,
      check_in_time,
      check_out_time,
      hours_worked,
      overtime_hours,
      undertime_hours,
      employees!inner (
        id,
        employee_id,
        name,
        department
      )
    `)
    .eq("attendance_date", new Date().toISOString().split('T')[0])
    .eq("employees.is_active", true);

  if (employeeIds && employeeIds.length > 0) {
    query = query.in("employee_id", employeeIds);
  }

  const { data, error } = await query;

  if (error) throw error;
  return data;
}

export async function fetchMonthlyPayroll(month: number, year: number) {
  const { data, error } = await supabase
    .from("payroll")
    .select(`
      id,
      employee_id,
      month,
      year,
      base_salary,
      total_attendance_days,
      present_days,
      absent_days,
      overtime_hours,
      overtime_amount,
      late_arrivals,
      late_deduction,
      early_departures,
      early_deduction,
      undertime_hours,
      undertime_deduction,
      advances_amount,
      payments_amount,
      bonuses,
      deductions,
      net_salary,
      final_salary,
      status,
      employees!inner (
        id,
        employee_id,
        name,
        department
      )
    `)
    .eq("month", month)
    .eq("year", year)
    .eq("employees.is_active", true);

  if (error) throw error;
  return data;
}

/**
 * Batch fetch for dashboard aggregates
 * Fetches all dashboard data in a single batch to reduce waterfall requests
 */
export async function fetchDashboardAggregates(monthStart: string, monthEnd: string) {
  // Use Promise.all for parallel execution
  const [attendanceData, advancesData, paymentsData] = await Promise.all([
    // Fetch attendance aggregates
    supabase
      .from("attendance")
      .select("overtime_hours, undertime_hours")
      .gte("attendance_date", monthStart)
      .lte("attendance_date", monthEnd),
    
    // Fetch advances
    supabase
      .from("advances")
      .select("amount, employee_id")
      .gte("advance_date", monthStart)
      .lte("advance_date", monthEnd),
    
    // Fetch payments
    supabase
      .from("payments")
      .select("payroll_id, amount, employee_id")
      .gte("payment_date", monthStart)
      .lte("payment_date", monthEnd),
  ]);

  return {
    attendance: attendanceData.data || [],
    advances: advancesData.data || [],
    payments: paymentsData.data || [],
  };
}

