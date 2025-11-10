import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { formatLocalDate, getTodayDate } from "@/lib/utils";
import { Database } from "@/integrations/supabase/types";
import { useEffect } from "react";
import { subscriptionManager } from "@/services/subscriptionManager";
import { SalaryCalculationService } from "@/services/salaryCalculationService";

type PayrollStatus = Database["public"]["Enums"]["payroll_status"];

export interface Payroll {
  id: string;
  employee_id: string;
  month: number;
  year: number;
  base_salary: number;
  total_days: number;
  present_days: number;
  absent_days: number;
  leave_days: number;
  holiday_days: number;
  absence_deduction: number;
  overtime_hours: number;
  undertime_hours: number | null;
  overtime_rate: number;
  overtime_pay: number;
  undertime_deduction: number | null;
  advance_amount: number;
  final_salary: number;
  status: PayrollStatus;
}

export function useMonthlyPayroll(month?: number, year?: number) {
  const queryClient = useQueryClient();
  const currentMonth = month || new Date().getMonth() + 1;
  const currentYear = year || new Date().getFullYear();

  // Set up realtime subscriptions for payroll, advances, and payments
  useEffect(() => {
    subscriptionManager.incrementSubscription();
    subscriptionManager.initialize(queryClient);
    
    return () => {
      subscriptionManager.decrementSubscription();
    };
  }, [queryClient]);

  return useQuery({
    queryKey: ["payroll", currentMonth, currentYear],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("payroll")
        .select(`
          *,
          employees!inner (
            id,
            employee_id,
            name,
            department,
            cnic,
            contact,
            photo_url,
            is_active
          )
        `)
        .eq("month", currentMonth)
        .eq("year", currentYear);
        // Removed .eq("employees.is_active", true) to show historical data for inactive employees in reports

      if (error) throw error;
      return data;
    },
  });
}

export function useGeneratePayroll() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payrollData: Omit<Payroll, "id">) => {
      // Prevent generating payroll for future months
      const currentMonth = new Date().getMonth() + 1;
      const currentYear = new Date().getFullYear();
      
      if (payrollData.year > currentYear || (payrollData.year === currentYear && payrollData.month > currentMonth)) {
        throw new Error("Cannot generate payroll for future months");
      }
      
      const { data, error } = await supabase
        .from("payroll")
        .upsert([payrollData], { onConflict: "employee_id,month,year" })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ 
        queryKey: ["payroll", variables.month, variables.year] 
      });
      toast.success("Payroll generated successfully!");
    },
    onError: (error: any) => {
      const errorMessage = error.message || "Failed to generate payroll";
      console.error("Generate payroll error:", error);
      toast.error(`Failed to generate payroll: ${errorMessage}`);
    },
  });
}

export function useEmployeeAdvances(employeeId: string, month: number, year: number) {
  const queryClient = useQueryClient();

  // Set up realtime subscription for advances
  useEffect(() => {
    subscriptionManager.incrementSubscription();
    subscriptionManager.initialize(queryClient);
    
    return () => {
      subscriptionManager.decrementSubscription();
    };
  }, [queryClient]);

  return useQuery({
    queryKey: ["employee-advances", employeeId, month, year],
    queryFn: async () => {
      const startDate = formatLocalDate(new Date(year, month - 1, 1));
      const endDate = formatLocalDate(new Date(year, month, 0));

      const { data, error } = await supabase
        .from("advances")
        .select("*")
        .eq("employee_id", employeeId)
        .gte("advance_date", startDate)
        .lte("advance_date", endDate)
        .order("advance_date", { ascending: true });

      if (error) throw error;
      return data || [];
    },
    enabled: !!employeeId,
  });
}

export function useAddAdvance() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ employeeId, amount, notes, advanceDate }: { employeeId: string; amount: number; notes?: string; advanceDate?: string }) => {
      // Check if employee is active
      const { data: employee, error: empError } = await supabase
        .from("employees")
        .select("is_active")
        .eq("id", employeeId)
        .single();
        
      if (empError) {
        throw new Error("Employee not found");
      }
      
      // Block advances for inactive employees
      if (!employee?.is_active) {
        throw new Error("Cannot record advance for inactive employees");
      }
      
      // Prevent recording advances for future dates
      const advanceDateToUse = advanceDate || getTodayDate();
      const today = getTodayDate();
      if (advanceDateToUse > today) {
        throw new Error("Cannot record advance for future dates");
      }
      
      const { data, error } = await supabase
        .from("advances")
        .insert([{
          employee_id: employeeId,
          amount: Math.round(amount), // Round off the amount
          advance_date: advanceDateToUse,
          notes: notes || `Advance for employee`
        }])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: async (data, variables) => {
      // Invalidate advance-related queries
      queryClient.invalidateQueries({ 
        queryKey: ["employee-advances"] 
      });
      
      // Automatically recalculate and update payroll for the month/year of the advance
      const advanceDate = variables.advanceDate || getTodayDate();
      const advanceDateObj = new Date(advanceDate);
      const advanceMonth = advanceDateObj.getMonth() + 1;
      const advanceYear = advanceDateObj.getFullYear();
      
      // Recalculate payroll in background (don't wait for it)
      SalaryCalculationService.recalculateAndUpdatePayroll(
        variables.employeeId,
        advanceMonth,
        advanceYear
      ).catch(err => {
        console.error("Failed to auto-recalculate payroll after adding advance:", err);
      });
      
      // Invalidate payroll queries to update UI
      queryClient.invalidateQueries({ 
        queryKey: ["payroll"] 
      });
      queryClient.invalidateQueries({ 
        queryKey: ["payroll", advanceMonth, advanceYear] 
      });
      
      toast.success("Advance added successfully! Payroll will be updated automatically.");
    },
    onError: (error: any) => {
      const errorMessage = error.message || "Failed to add advance";
      console.error("Add advance error:", error);
      toast.error(`Failed to add advance: ${errorMessage}`);
    },
  });
}

export function useUpdateAdvance() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ payrollId, advanceAmount, finalSalary }: { payrollId: string; advanceAmount: number; finalSalary: number }) => {
      const { data, error } = await supabase
        .from("payroll")
        .update({ 
          advance_amount: advanceAmount,
          final_salary: finalSalary
        })
        .eq("id", payrollId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      // Invalidate advance-related queries
      queryClient.invalidateQueries({ 
        queryKey: ["employee-advances"] 
      });
      // Invalidate payroll queries to update Reports page
      queryClient.invalidateQueries({ 
        queryKey: ["payroll"] 
      });
      // Invalidate monthly payroll for current month/year
      queryClient.invalidateQueries({ 
        queryKey: ["payroll", new Date().getMonth() + 1, new Date().getFullYear()] 
      });
      // Also invalidate Reports cache so both views stay in sync
      queryClient.invalidateQueries({
        queryKey: ["all-payments-reports", new Date().getMonth() + 1, new Date().getFullYear()]
      });
      toast.success("Advance amount updated successfully!");
    },
    onError: (error: any) => {
      const errorMessage = error.message || "Failed to update advance amount";
      console.error("Update advance error:", error);
      toast.error(`Failed to update advance amount: ${errorMessage}`);
    },
  });
}

export function useDeleteAdvance() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ advanceId }: { advanceId: string }) => {
      // Fetch advance record BEFORE deletion to get employee_id and advance_date
      const { data: advanceRecord, error: fetchError } = await supabase
        .from("advances")
        .select("advance_date, employee_id")
        .eq("id", advanceId)
        .single();

      if (fetchError) {
        throw fetchError;
      }

      // Delete the advance
      const { error } = await supabase
        .from("advances")
        .delete()
        .eq("id", advanceId);

      if (error) throw error;
      return { id: advanceId, advanceRecord };
    },
    onSuccess: async (data) => {
      // Invalidate advance-related queries
      queryClient.invalidateQueries({ 
        queryKey: ["employee-advances"] 
      });
      
      // Recalculate payroll using the advance record we fetched before deletion
      if (data.advanceRecord) {
        const advanceDateObj = new Date(data.advanceRecord.advance_date);
        const advanceMonth = advanceDateObj.getMonth() + 1;
        const advanceYear = advanceDateObj.getFullYear();
        
        // Recalculate payroll in background
        SalaryCalculationService.recalculateAndUpdatePayroll(
          data.advanceRecord.employee_id,
          advanceMonth,
          advanceYear
        ).catch(err => {
          console.error("Failed to auto-recalculate payroll after deleting advance:", err);
        });
        
        // Invalidate payroll queries
        queryClient.invalidateQueries({ 
          queryKey: ["payroll"] 
        });
        queryClient.invalidateQueries({ 
          queryKey: ["payroll", advanceMonth, advanceYear] 
        });
      } else {
        // Fallback: invalidate all payroll queries
        queryClient.invalidateQueries({ 
          queryKey: ["payroll"] 
        });
      }
      
      toast.success("Advance deleted successfully! Payroll will be updated automatically.");
    },
    onError: (error: any) => {
      const errorMessage = error.message || "Failed to delete advance";
      console.error("Delete advance error:", error);
      toast.error(`Failed to delete advance: ${errorMessage}`);
    },
  });
}

export function useUpdatePayrollStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ payrollId, status }: { payrollId: string; status: PayrollStatus }) => {
      const { data, error } = await supabase
        .from("payroll")
        .update({ status })
        .eq("id", payrollId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      // Invalidate payment-related queries
      queryClient.invalidateQueries({ 
        queryKey: ["payroll-payments", data.id] 
      });
      // Invalidate payroll queries to update Reports page
      queryClient.invalidateQueries({ 
        queryKey: ["payroll"] 
      });
      // Invalidate monthly payroll for current month/year
      queryClient.invalidateQueries({ 
        queryKey: ["payroll", new Date().getMonth() + 1, new Date().getFullYear()] 
      });
      // Also invalidate Reports payments cache
      queryClient.invalidateQueries({
        queryKey: ["all-payments-reports", new Date().getMonth() + 1, new Date().getFullYear()]
      });
      toast.success(`Payroll marked as ${data.status} successfully!`);
    },
    onError: (error: any) => {
      const errorMessage = error.message || "Failed to update payroll status";
      console.error("Update payroll status error:", error);
      toast.error(`Failed to update payroll status: ${errorMessage}`);
    },
  });
}

// Payment tracking functions - Database based
export function usePayrollPayments(payrollId: string) {
  const queryClient = useQueryClient();

  // Set up realtime subscription for payments
  useEffect(() => {
    const channel = supabase
      .channel('payroll-payments-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'payments'
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ["payroll-payments"] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  return useQuery({
    queryKey: ["payroll-payments", payrollId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("payments")
        .select("*")
        .eq("payroll_id", payrollId)
        .order("payment_date", { ascending: true });

      if (error) throw error;
      return data || [];
    },
    enabled: !!payrollId,
  });
}

export function useEmployeePayments(employeeId: string, month: number, year: number) {
  const queryClient = useQueryClient();

  // Set up realtime subscription for payments
  useEffect(() => {
    const channel = supabase
      .channel('employee-payments-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'payments'
        },
        () => {
          console.log("🔄 Payment realtime update received for employee:", employeeId, "month:", month, "year:", year);
          queryClient.invalidateQueries({ queryKey: ["employee-payments"] });
          queryClient.invalidateQueries({ queryKey: ["employee-payments", employeeId, month, year] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  return useQuery({
    queryKey: ["employee-payments", employeeId, month, year],
    queryFn: async () => {
      // CRITICAL: Filter payments by payroll month/year, NOT payment_date
      // This ensures payments for a previous month (paid in current month) show in the correct wage card
      
      // First, get all payroll IDs for this employee in the specified month/year
      const queryMonth = Number(month);
      const queryYear = Number(year);
      
      const { data: payrollRecords, error: payrollError } = await supabase
        .from("payroll")
        .select("id, month, year")
        .eq("employee_id", employeeId)
        .eq("month", queryMonth)
        .eq("year", queryYear);

      if (payrollError) {
        throw payrollError;
      }
      
      if (!payrollRecords || payrollRecords.length === 0) {
        return [];
      }

      const payrollIds = payrollRecords.map(p => p.id);

      // Then get all payments for those payrolls (regardless of payment_date)
      const { data, error } = await supabase
        .from("payments")
        .select("*")
        .eq("employee_id", employeeId)
        .in("payroll_id", payrollIds)
        .order("payment_date", { ascending: true });

      if (error) {
        throw error;
      }
      
      return data || [];
    },
    enabled: !!employeeId,
  });
}

export function useAddPayment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      employeeId, 
      amount, 
      paymentDate, 
      notes, 
      month, 
      year,
      payrollId
    }: { 
      employeeId: string; 
      amount: number; 
      paymentDate: string; 
      notes?: string;
      month: number;
      year: number;
      payrollId: string;
    }) => {
      // Check if employee is active
      const { data: employee, error: empError } = await supabase
        .from("employees")
        .select("is_active")
        .eq("id", employeeId)
        .single();
        
      if (empError) {
        throw new Error("Employee not found");
      }
      
      // Block payments for inactive employees
      if (!employee?.is_active) {
        throw new Error("Cannot record payment for inactive employees");
      }
      
      // Prevent recording payments for future dates
      const today = getTodayDate();
      if (paymentDate > today) {
        throw new Error("Cannot record payment for future dates");
      }
      
      const { data, error } = await supabase
        .from("payments")
        .insert([{
          employee_id: employeeId,
          payroll_id: payrollId,
          amount: Math.round(amount),
          payment_date: paymentDate,
          notes: notes || `Payment for ${month}/${year}`
        }])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data, variables) => {
      // Invalidate payment-related queries
      queryClient.invalidateQueries({ 
        queryKey: ["payroll-payments", variables.payrollId] 
      });
      queryClient.invalidateQueries({ 
        queryKey: ["employee-payments", variables.employeeId, variables.month, variables.year] 
      });
      // Invalidate payroll queries to update Reports page
      queryClient.invalidateQueries({ 
        queryKey: ["payroll"] 
      });
      // Invalidate monthly payroll for the specific month/year
      queryClient.invalidateQueries({ 
        queryKey: ["payroll", variables.month, variables.year] 
      });
      // CRITICAL: Invalidate ALL all-payments queries (including those with payrollIds in key)
      // This ensures the query refetches even if the key includes payrollIds
      queryClient.invalidateQueries({
        queryKey: ["all-payments"],
        exact: false // Match all queries starting with ["all-payments"]
      });
      // Also invalidate Reports payments cache
      queryClient.invalidateQueries({
        queryKey: ["all-payments-reports"],
        exact: false
      });
      // Optimistically update the batched payments cache for immediate UI feedback
      queryClient.setQueryData<any[] | undefined>(["all-payments", variables.month, variables.year], (old) => {
        if (!old) return old;
        return [...old, data];
      });
      // Force refetch to ensure consistency with database
      queryClient.refetchQueries({
        queryKey: ["all-payments"],
        exact: false
      });
      toast.success("Payment recorded successfully!");
    },
    onError: (error: any) => {
      const errorMessage = error.message || "Failed to record payment";
      console.error("Record payment error:", error);
      toast.error(`Failed to record payment: ${errorMessage}`);
    },
  });
}

export function useUpdatePayment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      paymentId,
      amount,
      paymentDate,
      notes,
      payrollId,
      employeeId,
      month,
      year,
    }: {
      paymentId: string;
      amount: number;
      paymentDate: string;
      notes?: string;
      payrollId: string;
      employeeId: string;
      month: number;
      year: number;
    }) => {
      // Prevent updating payments to future dates
      const today = getTodayDate();
      if (paymentDate > today) {
        throw new Error("Cannot set payment date to a future date");
      }
      
      const { data, error } = await supabase
        .from("payments")
        .update({
          amount: Math.round(amount),
          payment_date: paymentDate,
          notes: notes || null,
        })
        .eq("id", paymentId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["payroll-payments", variables.payrollId] });
      queryClient.invalidateQueries({ queryKey: ["employee-payments", variables.employeeId, variables.month, variables.year] });
      queryClient.invalidateQueries({ queryKey: ["payroll"] });
      queryClient.invalidateQueries({ queryKey: ["payroll", variables.month, variables.year] });
      // CRITICAL: Invalidate ALL all-payments queries (including those with payrollIds in key)
      queryClient.invalidateQueries({
        queryKey: ["all-payments"],
        exact: false // Match all queries starting with ["all-payments"]
      });
      // Also invalidate Reports payments cache
      queryClient.invalidateQueries({
        queryKey: ["all-payments-reports"],
        exact: false
      });
      // Update the batched list used on Payroll page optimistically
      queryClient.setQueryData<any[] | undefined>(["all-payments", variables.month, variables.year], (old) => {
        if (!old) return old;
        return old.map((p: any) => (p.id === variables.paymentId ? { ...p, amount: Math.round(variables.amount), payment_date: variables.paymentDate, notes: variables.notes } : p));
      });
      // Force refetch to ensure consistency
      queryClient.refetchQueries({
        queryKey: ["all-payments"],
        exact: false
      });
      toast.success("Payment updated successfully!");
    },
    onError: (error: any) => {
      const errorMessage = error.message || "Failed to update payment";
      console.error("Update payment error:", error);
      toast.error(`Failed to update payment: ${errorMessage}`);
    },
  });
}

export function useDeletePayment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      paymentId,
      payrollId,
      employeeId,
      month,
      year,
    }: {
      paymentId: string;
      payrollId?: string;
      employeeId?: string;
      month?: number;
      year?: number;
    }) => {
      const { error } = await supabase
        .from("payments")
        .delete()
        .eq("id", paymentId);

      if (error) throw error;
      return { id: paymentId, payrollId, employeeId, month, year };
    },
    onSuccess: (data) => {
      // Invalidate specific caches
      if (data.payrollId) {
        queryClient.invalidateQueries({ queryKey: ["payroll-payments", data.payrollId] });
      }
      if (data.employeeId && data.month && data.year) {
        queryClient.invalidateQueries({ queryKey: ["employee-payments", data.employeeId, data.month, data.year] });
      }
      queryClient.invalidateQueries({ queryKey: ["payroll"] });
      if (data.month && data.year) {
        queryClient.invalidateQueries({ queryKey: ["payroll", data.month, data.year] });
        // CRITICAL: Invalidate ALL all-payments queries (including those with payrollIds in key)
        queryClient.invalidateQueries({
          queryKey: ["all-payments"],
          exact: false // Match all queries starting with ["all-payments"]
        });
        // Optimistically update batched payments cache used by Payroll page
        queryClient.setQueryData<any[] | undefined>(["all-payments", data.month, data.year], (old) => {
          if (!old) return old;
          return old.filter((p: any) => p.id !== data.id);
        });
        // Also invalidate Reports payments cache
        queryClient.invalidateQueries({
          queryKey: ["all-payments-reports"],
          exact: false
        });
        // Force refetch to ensure consistency
        queryClient.refetchQueries({
          queryKey: ["all-payments"],
          exact: false
        });
      }
      toast.success("Payment deleted successfully!");
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to delete payment");
    },
  });
}
