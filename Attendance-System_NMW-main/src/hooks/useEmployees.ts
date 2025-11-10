import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Database } from "@/integrations/supabase/types";
import { useEffect } from "react";
import { subscriptionManager } from "@/services/subscriptionManager";

type DepartmentType = Database["public"]["Enums"]["department_type"];

export interface Employee {
  id: string;
  employee_id: string;
  name: string;
  cnic: string;
  department: DepartmentType;
  contact: string | null;
  joining_date: string;
  base_salary: number;
  overtime_rate: number;
  overtime_wage: number;
  is_active: boolean;
  inactivation_date: string | null;
  photo_url: string | null;
  biometric_registered: boolean;
  biometric_credential_id: string | null;
  biometric_public_key: string | null;
  biometric_registered_at: string | null;
  biometric_device_info: any;
}

export function useEmployees(includeInactive: boolean = false) {
  const queryClient = useQueryClient();

  // Set up realtime subscription
  useEffect(() => {
    subscriptionManager.incrementSubscription();
    subscriptionManager.initialize(queryClient);
    
    return () => {
      subscriptionManager.decrementSubscription();
    };
  }, [queryClient]);

  return useQuery({
    queryKey: ["employees", includeInactive],
    queryFn: async () => {
      // First try with inactivation_date (if migration applied)
      let query = supabase
        .from("employees")
        .select("id, employee_id, name, cnic, department, contact, joining_date, base_salary, overtime_rate, overtime_wage, is_active, inactivation_date, photo_url, biometric_registered");
      
      // Filter to only active employees unless includeInactive is true
      if (!includeInactive) {
        query = query.eq('is_active', true);
      }
      
      let { data, error } = await query.order("created_at", { ascending: false });

      // If error due to missing column, retry without inactivation_date
      if (error && error.message?.includes('inactivation_date')) {
        console.log("inactivation_date column not found, retrying without it");
        query = supabase
          .from("employees")
          .select("id, employee_id, name, cnic, department, contact, joining_date, base_salary, overtime_rate, overtime_wage, is_active, photo_url, biometric_registered");
        
        if (!includeInactive) {
          query = query.eq('is_active', true);
        }
        
        const retryResult = await query.order("created_at", { ascending: false });
        data = retryResult.data;
        error = retryResult.error;
      }

      if (error) {
        console.error("Error fetching employees:", error);
        throw error;
      }
      
      // Add null inactivation_date if missing
      return (data || []).map((emp: any) => ({
        ...emp,
        inactivation_date: emp.inactivation_date || null
      })) as Employee[];
    },
  });
}

export function useAddEmployee() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (employee: Omit<Employee, "id" | "is_active">) => {
      const { data, error } = await supabase
        .from("employees")
        .insert([employee])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["employees"] });
      toast.success("Employee added successfully!");
    },
    onError: (error: any) => {
      const errorMessage = error.message || "Failed to add employee";
      console.error("Add employee error:", error);
      toast.error(`Failed to add employee: ${errorMessage}`);
    },
  });
}

export function useUpdateEmployee() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Employee> & { id: string }) => {
      const { data, error } = await supabase
        .from("employees")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["employees"] });
      toast.success("Employee updated successfully!");
    },
    onError: (error: any) => {
      const errorMessage = error.message || "Failed to update employee";
      console.error("Update employee error:", error);
      toast.error(`Failed to update employee: ${errorMessage}`);
    },
  });
}

export function useDeleteEmployee() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("employees")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["employees"] });
      // Also invalidate related queries that might be affected
      queryClient.invalidateQueries({ queryKey: ["attendance"] });
      queryClient.invalidateQueries({ queryKey: ["payroll"] });
      queryClient.invalidateQueries({ queryKey: ["employee-advances"] });
      queryClient.invalidateQueries({ queryKey: ["employee-payments"] });
      queryClient.invalidateQueries({ queryKey: ["payroll-payments"] });
      toast.success("Employee deleted successfully!");
    },
    onError: (error: any) => {
      const errorMessage = error.message || "Failed to delete employee";
      console.error("Delete employee error:", error);
      toast.error(`Failed to delete employee: ${errorMessage}`);
    },
  });
}

export function useToggleEmployeeActive() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { data, error } = await supabase
        .from("employees")
        .update({ is_active })
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["employees"] });
      queryClient.invalidateQueries({ queryKey: ["attendance"] });
      queryClient.invalidateQueries({ queryKey: ["payroll"] });
      toast.success(variables.is_active 
        ? "Employee activated successfully!" 
        : "Employee deactivated successfully!"
      );
    },
    onError: (error: any) => {
      const errorMessage = error.message || "Failed to update employee status";
      console.error("Toggle employee active error:", error);
      toast.error(errorMessage);
    },
  });
}

export async function generateEmployeeId(): Promise<string> {
  const { data, error } = await supabase.rpc("generate_employee_id");
  
  if (error) {
    console.error("Error generating employee ID:", error);
    throw error;
  }
  
  return data;
}
