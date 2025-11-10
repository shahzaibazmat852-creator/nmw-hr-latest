// Data caching hook for AI assistant
// Caches data to avoid repeated fetches

import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useMemo } from "react";

interface CacheConfig {
  enabled: boolean;
  staleTime?: number; // Time in ms before data is considered stale
}

export function useAIDataCache(config: {
  needsEmployees?: boolean;
  needsPayroll?: boolean;
  needsAttendance?: boolean;
  needsAdvances?: boolean;
  needsPayments?: boolean;
  needsHistorical?: boolean;
  employeeId?: string;
  department?: string;
  dateRange?: { start?: string; end?: string };
}) {
  const staleTime = 5 * 60 * 1000; // 5 minutes

  // Always fetch ALL employees (comprehensive access)
  const { data: employees = [] } = useQuery({
    queryKey: ['ai-employees-all'],
    queryFn: async () => {
      const { data } = await supabase
        .from("employees")
        .select("id, employee_id, name, department, base_salary, overtime_rate, overtime_wage, cnic, is_active, joining_date, inactivation_date, photo_url, biometric_registered")
        .order('created_at', { ascending: false });
      return data || [];
    },
    staleTime,
  });

  // Fetch ALL payroll records (comprehensive historical access)
  const { data: payrollData = [] } = useQuery({
    queryKey: ['ai-payroll-all'],
    queryFn: async () => {
      const { data } = await supabase
        .from("payroll")
        .select(`*, employees!inner(name,employee_id,department,cnic,base_salary,joining_date)`)
        .order('year', { ascending: false })
        .order('month', { ascending: false });
      return data || [];
    },
    staleTime,
  });

  // Fetch ALL attendance records (comprehensive historical access)
  const { data: attendanceData = [] } = useQuery({
    queryKey: ['ai-attendance-all'],
    queryFn: async () => {
      const { data } = await supabase
        .from("attendance")
        .select(`
          attendance_date,
          status,
          hours_worked,
          overtime_hours,
          undertime_hours,
          late_hours,
          check_in_time,
          check_out_time,
          biometric_verified,
          shift_type,
          notes,
          employees!inner(name, employee_id, department, base_salary)
        `)
        .order('attendance_date', { ascending: false });
      return data || [];
    },
    staleTime,
  });

  // Fetch ALL advances (comprehensive historical access)
  const { data: advancesData = [] } = useQuery({
    queryKey: ['ai-advances-all'],
    queryFn: async () => {
      const { data } = await supabase
        .from("advances")
        .select(`
          id,
          advance_date,
          amount,
          notes,
          employees!inner(name, employee_id, department)
        `)
        .order('advance_date', { ascending: false });
      return data || [];
    },
    staleTime,
  });

  // Fetch ALL payments (comprehensive historical access)
  const { data: paymentsData = [] } = useQuery({
    queryKey: ['ai-payments-all'],
    queryFn: async () => {
      const { data } = await supabase
        .from("payments")
        .select(`
          id,
          payment_date,
          amount,
          notes,
          employees!inner(name, employee_id, department),
          payroll!inner(month, year, final_salary)
        `)
        .order('payment_date', { ascending: false });
      return data || [];
    },
    staleTime,
  });

  return {
    employees,
    payrollData,
    attendanceData,
    advancesData,
    paymentsData,
  };
}

