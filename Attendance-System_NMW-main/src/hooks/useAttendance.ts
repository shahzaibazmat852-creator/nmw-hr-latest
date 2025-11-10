import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { SalaryCalculationService } from "@/services/salaryCalculationService";
import { Database } from "@/integrations/supabase/types";
import { useEffect } from "react";
import { getTodayDate, formatLocalDate } from "@/lib/utils";
import { subscriptionManager } from "@/services/subscriptionManager";

type AttendanceStatus = Database["public"]["Enums"]["attendance_status"];

export interface Attendance {
  id: string;
  employee_id: string;
  attendance_date: string;
  status: AttendanceStatus;
  check_in_time: string | null;
  check_out_time: string | null;
  hours_worked: number;
  overtime_hours: number; // aligned with DB column
  undertime_hours: number; // aligned with DB column
  late_hours: number;
  notes: string | null;
  biometric_verified: boolean;
  biometric_credential_id: string | null;
  biometric_verification_time: string | null;
  shift_type: "day" | "night" | "regular";
}

export function useTodayAttendance() {
  const queryClient = useQueryClient();
  const today = getTodayDate();

  // Set up realtime subscription for attendance changes
  useEffect(() => {
    subscriptionManager.incrementSubscription();
    subscriptionManager.initialize(queryClient);
    
    return () => {
      subscriptionManager.decrementSubscription();
    };
  }, [queryClient]);
  
  return useQuery({
    queryKey: ["attendance", today],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("attendance")
        .select(`
          *,
          employees!inner (
            id,
            employee_id,
            name,
            department,
            is_active
          )
        `)
        .eq("attendance_date", today)
        .eq("employees.is_active", true);

      if (error) throw error;
      return data;
    },
  });
}

export function useMarkAttendance() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (attendance: Omit<Attendance, "id">) => {
      console.log("useMarkAttendance - Input attendance data:", attendance);
      
      // Prevent future date attendance
      const today = getTodayDate();
      if (attendance.attendance_date > today) {
        throw new Error("Cannot mark attendance for future dates");
      }

      // Prevent attendance before employee's joining date and for inactive employees
      const { data: employee, error: empError } = await supabase
        .from("employees")
        .select("joining_date, is_active, department")
        .eq("id", attendance.employee_id)
        .single();

      if (empError) {
        console.error("Error fetching employee:", empError);
        throw empError;
      }

      // Block attendance for inactive employees
      if (!employee?.is_active) {
        throw new Error("Cannot mark attendance for inactive employees");
      }

      // Only Workshop and Enamel departments get overtime/undertime
      const allowedDepartments = ["Workshop", "Enamel"];
      
      // Filter overtime/undertime for non-allowed departments
      if (!employee?.department || !allowedDepartments.includes(employee.department)) {
        attendance.overtime_hours = 0;
        attendance.undertime_hours = 0;
      }

      const joiningDate = employee?.joining_date as string;
      if (joiningDate && attendance.attendance_date < joiningDate) {
        throw new Error("Cannot mark attendance before employee's joining date");
      }

      console.log("About to upsert attendance record...");
      const { data, error } = await supabase
        .from("attendance")
        .upsert([attendance], { onConflict: "employee_id,attendance_date" })
        .select()
        .single();

      if (error) {
        console.error("Error upserting attendance:", error);
        throw error;
      }
      
      console.log("Attendance upserted successfully:", data);

      // If check-in and check-out times are provided, recalculate overtime/undertime
      if (attendance.check_in_time && attendance.check_out_time) {
        try {
          await SalaryCalculationService.updateAttendanceWithOvertime(
            attendance.employee_id,
            attendance.attendance_date,
            attendance.check_in_time,
            attendance.check_out_time
          );
          
          // Fetch the updated record with recalculated overtime/undertime
          const { data: updatedData, error: updateError } = await supabase
            .from("attendance")
            .select("*")
            .eq("employee_id", attendance.employee_id)
            .eq("attendance_date", attendance.attendance_date)
            .single();
            
          if (updateError) throw updateError;
          return updatedData;
        } catch (calcError) {
          console.error("Error recalculating overtime/undertime:", calcError);
          // Return the original data even if recalculation fails
          return data;
        }
      }

      return data;
    },
    onSuccess: async (data) => {
      // Invalidate queries for the specific date that was updated
      queryClient.invalidateQueries({ queryKey: ["attendance", data.attendance_date] });
      
      // Automatically recalculate and update payroll for the month/year of the attendance
      const attendanceDateObj = new Date(data.attendance_date);
      const attendanceMonth = attendanceDateObj.getMonth() + 1;
      const attendanceYear = attendanceDateObj.getFullYear();
      
      // Recalculate payroll in background (don't wait for it)
      SalaryCalculationService.recalculateAndUpdatePayroll(
        data.employee_id,
        attendanceMonth,
        attendanceYear
      ).catch(err => {
        console.error("Failed to auto-recalculate payroll after attendance change:", err);
      });
      
      // Invalidate payroll queries to update UI
      queryClient.invalidateQueries({ 
        queryKey: ["payroll"] 
      });
      queryClient.invalidateQueries({ 
        queryKey: ["payroll", attendanceMonth, attendanceYear] 
      });
      
      toast.success("Attendance marked successfully! Payroll will be updated automatically.");
    },
    onError: (error: any) => {
      const errorMessage = error.message || "Failed to mark attendance";
      console.error("Mark attendance error:", error);
      toast.error(`Failed to mark attendance: ${errorMessage}`);
    },
  });
}

export function useAttendanceByDate(date: string) {
  const queryClient = useQueryClient();

  // Set up realtime subscription (reuse the same channel logic)
  useEffect(() => {
    subscriptionManager.incrementSubscription();
    subscriptionManager.initialize(queryClient);
    
    return () => {
      subscriptionManager.decrementSubscription();
    };
  }, [queryClient]);

  return useQuery({
    queryKey: ["attendance", date],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("attendance")
        .select(`
          *,
          employees!inner (
            id,
            employee_id,
            name,
            department,
            is_active
          )
        `)
        .eq("attendance_date", date)
        .eq("employees.is_active", true);

      if (error) throw error;
      return data;
    },
    enabled: !!date,
  });
}

export function useEmployeeAttendance(employeeId: string, month: number, year: number) {
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
    queryKey: ["employee-attendance", employeeId, month, year],
    queryFn: async () => {
      const startDate = formatLocalDate(new Date(year, month - 1, 1));
      const endDate = formatLocalDate(new Date(year, month, 0));

      const { data, error } = await supabase
        .from("attendance")
        .select("*")
        .eq("employee_id", employeeId)
        .gte("attendance_date", startDate)
        .lte("attendance_date", endDate)
        .order("attendance_date");

      if (error) throw error;
      return data as Attendance[];
    },
    enabled: !!employeeId,
  });
}

export function useDeleteAttendance() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      // Fetch attendance record BEFORE deletion to get employee_id and attendance_date
      const { data: attendanceRecord, error: fetchError } = await supabase
        .from("attendance")
        .select("employee_id, attendance_date")
        .eq("id", id)
        .single();

      if (fetchError) {
        throw fetchError;
      }

      // Delete the attendance record
      const { error } = await supabase
        .from("attendance")
        .delete()
        .eq("id", id);

      if (error) throw error;
      return { id, attendanceRecord };
    },
    onSuccess: async (data) => {
      // Invalidate all attendance queries to refresh data
      queryClient.invalidateQueries({ queryKey: ["attendance"] });
      queryClient.invalidateQueries({ queryKey: ["employee-attendance"] });
      
      // Automatically recalculate and update payroll if attendance record existed
      if (data.attendanceRecord) {
        const attendanceDateObj = new Date(data.attendanceRecord.attendance_date);
        const attendanceMonth = attendanceDateObj.getMonth() + 1;
        const attendanceYear = attendanceDateObj.getFullYear();
        
        // Recalculate payroll in background
        SalaryCalculationService.recalculateAndUpdatePayroll(
          data.attendanceRecord.employee_id,
          attendanceMonth,
          attendanceYear
        ).catch(err => {
          console.error("Failed to auto-recalculate payroll after deleting attendance:", err);
        });
        
        // Invalidate payroll queries
        queryClient.invalidateQueries({ 
          queryKey: ["payroll"] 
        });
        queryClient.invalidateQueries({ 
          queryKey: ["payroll", attendanceMonth, attendanceYear] 
        });
      }
      
      toast.success("Attendance record deleted successfully! Payroll will be updated automatically.");
    },
    onError: (error: any) => {
      const errorMessage = error.message || "Failed to delete attendance record";
      console.error("Delete attendance error:", error);
      toast.error(`Failed to delete attendance record: ${errorMessage}`);
    },
  });
}

export function useBulkMarkAttendance() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (bulkAttendance: {
      employeeIds: string[];
      attendanceDate: string;
      status: AttendanceStatus;
      checkInTime?: string | null;
      notes?: string | null;
      shiftType?: "day" | "night" | "regular";
    }) => {
      // Prevent future date attendance
      const today = getTodayDate();
      if (bulkAttendance.attendanceDate > today) {
        throw new Error("Cannot mark attendance for future dates");
      }

      // Prevent attendance before any employee's joining date
      if (bulkAttendance.employeeIds.length > 0) {
        const { data: employees, error: empErr } = await supabase
          .from("employees")
          .select("id, joining_date")
          .in("id", bulkAttendance.employeeIds);

        if (empErr) throw empErr;

        const invalidEmployees = (employees || []).filter((e: any) => e.joining_date && bulkAttendance.attendanceDate < e.joining_date);
        if (invalidEmployees.length > 0) {
          throw new Error("Cannot mark attendance before joining date for some employees");
        }
      }

      const attendanceRecords = bulkAttendance.employeeIds.map(employeeId => ({
        employee_id: employeeId,
        attendance_date: bulkAttendance.attendanceDate,
        status: bulkAttendance.status,
        check_in_time: bulkAttendance.checkInTime || (bulkAttendance.status === "present" ? new Date().toTimeString().split(" ")[0] : null),
        check_out_time: null,
        hours_worked: 0,
        late_hours: 0,
        overtime_hours: 0,
        undertime_hours: 0,
        notes: bulkAttendance.notes,
        shift_type: bulkAttendance.shiftType || "regular",
        biometric_verified: false,
        biometric_credential_id: null,
        biometric_verification_time: null,
      }));

      const { data, error } = await supabase
        .from("attendance")
        .upsert(attendanceRecords, { onConflict: "employee_id,attendance_date" })
        .select();

      if (error) throw error;
      return data;
    },
    onSuccess: (data, variables) => {
      // Invalidate queries for the specific date that was updated
      queryClient.invalidateQueries({ queryKey: ["attendance", variables.attendanceDate] });
      queryClient.invalidateQueries({ queryKey: ["attendance"] });
      toast.success(`Bulk attendance marked successfully for ${variables.employeeIds.length} employees!`);
    },
    onError: (error: any) => {
      const errorMessage = error.message || "Failed to mark bulk attendance";
      console.error("Bulk mark attendance error:", error);
      toast.error(`Failed to mark bulk attendance: ${errorMessage}`);
    },
  });
}
