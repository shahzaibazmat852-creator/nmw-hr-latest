import { supabase } from "@/integrations/supabase/client";
import { calculateHoursWorked } from "@/lib/utils";

export interface DepartmentRules {
  is_exempt_from_deductions: boolean;
  is_exempt_from_overtime: boolean;
  max_overtime_hours_per_day: number;
  max_advance_percentage: number;
  working_days_per_month: number;
  standard_hours_per_day: number;
  overtime_multiplier: number;
  min_hours_full_day?: number;
  half_day_hours?: number;
  day_shift_hours?: number;
  night_shift_hours?: number;
  night_shift_multiplier?: number;
}

export interface AttendanceData {
  attendance_date: string;
  status: string;
  overtime_hours: number;
  undertime_hours: number;
  hours_worked: number;
  late_hours: number;
}

export interface SalaryCalculationInput {
  employee_id: string;
  base_salary: number;
  overtime_rate: number;
  month: number;
  year: number;
  attendance_data: AttendanceData[];
  advance_amount: number;
}

export interface SalaryCalculationResult {
  base_salary: number;
  total_days: number;
  present_days: number;
  absent_days: number;
  leave_days: number;
  holiday_days: number;
  overtime_hours: number;
  undertime_hours: number;
  overtime_pay: number;
  undertime_deduction: number;
  absence_deduction: number;
  advance_amount: number;
  earned_salary: number;
  final_salary: number;
  calculation_details: {
    per_day_salary: number;
    hourly_rate: number;
    overtime_rate_used: number;
    department_rules: DepartmentRules;
    business_rules_validation: any[];
  };
}

export class SalaryCalculationService {
  // Simple in-memory caches to reduce repeated DB/RPC calls during batch payroll generation
  private static departmentRulesCache: Map<string, DepartmentRules> = new Map();
  private static actualDaysCache: Map<string, number> = new Map();
  /**
   * Get department calculation rules from database
   */
  static async getDepartmentRules(department: string): Promise<DepartmentRules> {
    if (this.departmentRulesCache.has(department)) {
      return this.departmentRulesCache.get(department)!;
    }

    const { data, error } = await supabase
      .from("department_calculation_rules")
      .select("*")
      .eq("department", department)
      .single();

    if (error) {
      console.error("Error fetching department rules:", error);
      // Return default rules if not found
      return {
        is_exempt_from_deductions: false,
        is_exempt_from_overtime: false,
        max_overtime_hours_per_day: 4,
        max_advance_percentage: 50,
        working_days_per_month: 30,
        standard_hours_per_day: 8,
        overtime_multiplier: 1.5,
        min_hours_full_day: 8,
        half_day_hours: 4,
      };
    }

    this.departmentRulesCache.set(department, data);
    return data;
  }

  /**
   * Get actual days in month from database function
   */
  static async getActualDaysInMonth(month: number, year: number): Promise<number> {
    const cacheKey = `${year}-${month}`;
    if (this.actualDaysCache.has(cacheKey)) {
      console.log(`[getActualDaysInMonth] Cache hit for ${cacheKey}: ${this.actualDaysCache.get(cacheKey)} days`);
      return this.actualDaysCache.get(cacheKey)!;
    }

    console.log(`[getActualDaysInMonth] Fetching from database for ${month}/${year}`);
    const { data, error } = await supabase.rpc("get_actual_days_in_month", {
      month_num: month,
      year_num: year,
    });

    if (error) {
      console.error("Error getting actual days in month:", error);
      return new Date(year, month, 0).getDate(); // Fallback to JavaScript calculation
    }

    const days = data || new Date(year, month, 0).getDate();
    console.log(`[getActualDaysInMonth] Retrieved ${days} days for ${month}/${year}, caching...`);
    this.actualDaysCache.set(cacheKey, days);
    return days;
  }

  /**
   * Validate business rules for salary calculation
   */
  static async validateBusinessRules(
    baseSalary: number,
    overtimeHours: number,
    overtimeRate: number,
    advanceAmount: number,
    finalSalary: number,
    maxAdvancePercentage: number
  ) {
    const { data, error } = await supabase.rpc("validate_salary_business_rules", {
      base_salary: baseSalary,
      overtime_hours: overtimeHours,
      overtime_rate: overtimeRate,
      advance_amount: advanceAmount,
      final_salary: finalSalary,
      max_advance_percentage: maxAdvancePercentage,
    });

    if (error) {
      console.error("Error validating business rules:", error);
      return [];
    }

    return data || [];
  }

  /**
   * Calculate salary with proper database-driven logic
   */
  static async calculateSalary(input: SalaryCalculationInput): Promise<SalaryCalculationResult> {
    const { employee_id, base_salary, overtime_rate, month, year, attendance_data, advance_amount } = input;

    // Get employee info with safe fallback if new column isn't in schema yet
    let employee: any;
    try {
      const { data, error } = await supabase
        .from("employees")
        .select("department, overtime_wage, overtime_rate")
        .eq("id", employee_id)
        .single();
      if (error) throw error;
      employee = data;
    } catch (err: any) {
      // Retry without overtime_wage (e.g., migration not applied or schema cache stale)
      const { data, error } = await supabase
        .from("employees")
        .select("department, overtime_rate")
        .eq("id", employee_id)
        .single();
      if (error) {
        throw new Error(`Employee not found: ${error.message}`);
      }
      employee = { ...data, overtime_wage: 0 };
    }

    // Get department rules
    const departmentRules = await this.getDepartmentRules(employee.department);

    // Get actual days in month
    const actualDaysInMonth = await this.getActualDaysInMonth(month, year);

    // Calculate attendance statistics
    const presentDays = attendance_data.filter(a => a.status === "present").length;
    const absentDays = attendance_data.filter(a => a.status === "absent").length;
    const leaveDays = attendance_data.filter(a => a.status === "leave").length;
    const holidayDays = attendance_data.filter(a => a.status === "holiday").length;

    // Calculate overtime and undertime hours (only for Workshop and Enamel departments)
    const allowedDepartments = ["Workshop", "Enamel"];
    const overtimeHours = allowedDepartments.includes(employee.department)
      ? attendance_data.reduce((sum, a) => sum + (a.overtime_hours || 0), 0)
      : 0;
    const undertimeHours = allowedDepartments.includes(employee.department)
      ? attendance_data.reduce((sum, a) => sum + (a.undertime_hours || 0), 0)
      : 0;

    // Calculate per day and hourly rates using actual days in month
    const workingDaysPerMonth = actualDaysInMonth;
    const perDaySalary = base_salary / workingDaysPerMonth;
    const hourlyRate = base_salary / (workingDaysPerMonth * departmentRules.standard_hours_per_day);
    
    console.log(`[calculateSalary] ${employee_id}: actualDaysInMonth=${actualDaysInMonth}, workingDaysPerMonth=${workingDaysPerMonth}, perDaySalary=${perDaySalary.toFixed(2)}, hourlyRate=${hourlyRate.toFixed(2)}`);

    let earnedSalary = 0;
    let overtimePay = 0;
    let undertimeDeduction = 0;
    let absenceDeduction = 0;
    let finalSalary = 0;

    if (departmentRules.is_exempt_from_deductions) {
      // Exempt departments: full salary, no absence deductions
      earnedSalary = base_salary;
      
      // Calculate overtime pay for exempt departments (if not exempt from overtime)
      if (!departmentRules.is_exempt_from_overtime && overtimeHours > 0) {
        const wage = (employee.overtime_wage && employee.overtime_wage > 0)
          ? employee.overtime_wage
          : (employee.overtime_rate && employee.overtime_rate > 0)
            ? employee.overtime_rate
            : (hourlyRate * departmentRules.overtime_multiplier);
        overtimePay = overtimeHours * wage;
      }
      
      // Calculate undertime deduction (always apply, even for exempt departments)
      if (undertimeHours > 0) {
        undertimeDeduction = undertimeHours * hourlyRate;
      }
      
      // Include undertime deduction in absence_deduction for payroll table
      absenceDeduction = undertimeDeduction;
      
      finalSalary = earnedSalary + overtimePay - undertimeDeduction - advance_amount;
    } else {
      // Calculate earned salary including paid leaves and holidays (no absence deductions)
      const paidDays = presentDays + leaveDays + holidayDays;
      earnedSalary = paidDays * perDaySalary;

      // Calculate overtime pay - prioritize overtime_wage over overtime_rate
      if (!departmentRules.is_exempt_from_overtime && overtimeHours > 0) {
        // Use explicit overtime_wage if set and > 0, otherwise fallback to overtime_rate, then default calc
        const wage = (employee.overtime_wage && employee.overtime_wage > 0)
          ? employee.overtime_wage
          : (employee.overtime_rate && employee.overtime_rate > 0)
            ? employee.overtime_rate
            : (hourlyRate * departmentRules.overtime_multiplier);
        overtimePay = overtimeHours * wage;
      }

      // Calculate undertime deduction
      if (undertimeHours > 0) {
        undertimeDeduction = undertimeHours * hourlyRate;
      }

      // Do not deduct for absences as per business policy, but include undertime deductions
      absenceDeduction = undertimeDeduction;

      // Calculate final salary (no absence deduction, but include undertime deduction)
      finalSalary = earnedSalary + overtimePay - undertimeDeduction - advance_amount;
    }

    // Validate business rules (skip overtime rate validation if rate is 0 - use default)
    const businessRulesValidation = await this.validateBusinessRules(
      base_salary,
      overtimeHours,
      employee.overtime_wage || employee.overtime_rate || 0, // Use the actual wage/rate being used
      advance_amount,
      finalSalary,
      departmentRules.max_advance_percentage
    );

    // Check for validation errors
    const validationErrors = businessRulesValidation.filter(rule => !rule.is_valid);
    if (validationErrors.length > 0) {
      throw new Error(`Business rule validation failed: ${validationErrors.map(e => e.error_message).join(", ")}`);
    }

    return {
      base_salary: base_salary,
      total_days: actualDaysInMonth,
      present_days: presentDays,
      absent_days: absentDays,
      leave_days: leaveDays,
      holiday_days: holidayDays,
      overtime_hours: overtimeHours,
      undertime_hours: undertimeHours,
      overtime_pay: overtimePay,
      undertime_deduction: undertimeDeduction,
      absence_deduction: absenceDeduction,
      advance_amount: advance_amount,
      earned_salary: earnedSalary,
      final_salary: Math.max(0, Math.round(finalSalary * 100) / 100), // Round to 2 decimal places
      calculation_details: {
        per_day_salary: perDaySalary,
        hourly_rate: hourlyRate,
        overtime_rate_used: (employee.overtime_wage && employee.overtime_wage > 0)
          ? employee.overtime_wage
          : (employee.overtime_rate && employee.overtime_rate > 0)
            ? employee.overtime_rate
            : (hourlyRate * departmentRules.overtime_multiplier),
        department_rules: departmentRules,
        business_rules_validation: businessRulesValidation,
      },
    };
  }

  /**
   * Log calculation audit trail
   */
  static async logCalculationAudit(
    payrollId: string,
    employeeId: string,
    calculationType: string,
    oldValue: number | null,
    newValue: number,
    calculationDetails: any
  ) {
    const { error } = await supabase
      .from("payroll_calculation_audit")
      .insert({
        payroll_id: payrollId,
        employee_id: employeeId,
        calculation_type: calculationType,
        old_value: oldValue,
        new_value: newValue,
        calculation_details: calculationDetails,
      });

    if (error) {
      console.error("Error logging calculation audit:", error);
    }
  }

  /**
   * Automatically recalculate and update payroll record when attendance or advances change
   * This ensures payroll stays in sync with the latest data
   */
  static async recalculateAndUpdatePayroll(
    employeeId: string,
    month: number,
    year: number
  ): Promise<void> {
    try {
      // Check if payroll record exists
      const { data: existingPayroll, error: fetchError } = await supabase
        .from("payroll")
        .select("*")
        .eq("employee_id", employeeId)
        .eq("month", month)
        .eq("year", year)
        .single();

      // If no payroll record exists, don't create one automatically (user must generate payroll)
      if (fetchError || !existingPayroll) {
        console.log(`[recalculateAndUpdatePayroll] No payroll record found for employee ${employeeId}, month ${month}/${year}. Skipping auto-recalculation.`);
        return;
      }

      // Get employee data
      const { data: employee, error: empError } = await supabase
        .from("employees")
        .select("base_salary, overtime_rate, overtime_wage")
        .eq("id", employeeId)
        .single();

      if (empError || !employee) {
        console.error(`[recalculateAndUpdatePayroll] Employee not found: ${employeeId}`);
        return;
      }

      // Fetch fresh attendance data for the month
      const startDate = new Date(year, month - 1, 1).toISOString().split("T")[0];
      const endDate = new Date(year, month, 0).toISOString().split("T")[0];

      const { data: attendanceData } = await supabase
        .from("attendance")
        .select("*")
        .eq("employee_id", employeeId)
        .gte("attendance_date", startDate)
        .lte("attendance_date", endDate);

      // Fetch fresh advances data for the month
      const { data: advancesData } = await supabase
        .from("advances")
        .select("amount")
        .eq("employee_id", employeeId)
        .gte("advance_date", startDate)
        .lte("advance_date", endDate);

      const totalAdvanceAmount = (advancesData || []).reduce((sum: number, a: any) => sum + Number(a.amount), 0);

      // Recalculate salary with fresh data
      const calculationResult = await this.calculateSalary({
        employee_id: employeeId,
        base_salary: Number(employee.base_salary || 0),
        overtime_rate: Number(employee.overtime_rate || 0),
        month,
        year,
        attendance_data: (attendanceData || []).map(a => ({
          attendance_date: a.attendance_date,
          status: a.status,
          overtime_hours: Number(a.overtime_hours || 0),
          undertime_hours: Number(a.undertime_hours || 0),
          hours_worked: Number(a.hours_worked || 0),
          late_hours: Number(a.late_hours || 0),
        })),
        advance_amount: totalAdvanceAmount,
      });

      // Update payroll record with recalculated values
      const { error: updateError } = await supabase
        .from("payroll")
        .update({
          total_days: calculationResult.total_days,
          present_days: calculationResult.present_days,
          absent_days: calculationResult.absent_days,
          leave_days: calculationResult.leave_days,
          holiday_days: calculationResult.holiday_days,
          absence_deduction: calculationResult.absence_deduction,
          overtime_hours: calculationResult.overtime_hours,
          undertime_hours: calculationResult.undertime_hours,
          overtime_rate: calculationResult.calculation_details.overtime_rate_used,
          overtime_pay: calculationResult.overtime_pay,
          undertime_deduction: calculationResult.undertime_deduction,
          advance_amount: calculationResult.advance_amount,
          final_salary: calculationResult.final_salary,
          updated_at: new Date().toISOString(),
        })
        .eq("id", existingPayroll.id);

      if (updateError) {
        console.error(`[recalculateAndUpdatePayroll] Failed to update payroll for employee ${employeeId}:`, updateError);
        throw updateError;
      }

      console.log(`[recalculateAndUpdatePayroll] Successfully updated payroll for employee ${employeeId}, month ${month}/${year}`);
    } catch (error) {
      console.error(`[recalculateAndUpdatePayroll] Error recalculating payroll for employee ${employeeId}, month ${month}/${year}:`, error);
      // Don't throw - this is a background update, shouldn't break the main operation
    }
  }

  /**
   * Update attendance records with proper overtime/undertime calculation
   */
  static async updateAttendanceWithOvertime(
    employeeId: string,
    attendanceDate: string,
    checkInTime: string,
    checkOutTime: string
  ) {
    // Use utility function to correctly handle night shifts crossing midnight
    const hoursWorked = calculateHoursWorked(checkInTime, checkOutTime);
    
    // Fetch employee's department and attendance shift type
    const { data: emp } = await supabase
      .from("employees")
      .select("department")
      .eq("id", employeeId)
      .single();

    const { data: attendanceRecord } = await supabase
      .from("attendance")
      .select("shift_type")
      .eq("employee_id", employeeId)
      .eq("attendance_date", attendanceDate)
      .single();

    const department = emp?.department as string | undefined;
    const shiftType = attendanceRecord?.shift_type || "regular";
    
    // Only Workshop and Enamel departments get overtime/undertime
    const allowedDepartments = ["Workshop", "Enamel"];
    
    if (!department || !allowedDepartments.includes(department)) {
      // For other departments, set overtime/undertime to 0
      const { error } = await supabase
        .from("attendance")
        .update({
          hours_worked: Math.round(hoursWorked * 100) / 100,
          overtime_hours: 0,
          undertime_hours: 0,
          late_hours: 0,
        })
        .eq("employee_id", employeeId)
        .eq("attendance_date", attendanceDate);

      if (error) {
        throw new Error(`Failed to update attendance: ${error.message}`);
      }
      return;
    }
    
    let standardHours = 8;
    let maxOvertimePerDay = 4;
    
    if (department) {
      const rules = await this.getDepartmentRules(department);
      maxOvertimePerDay = Number(rules.max_overtime_hours_per_day || 4);
      
      // Determine standard hours based on shift type and department rules
      if (shiftType === "day" && rules.day_shift_hours) {
        standardHours = rules.day_shift_hours;
      } else if (shiftType === "night" && rules.night_shift_hours) {
        standardHours = rules.night_shift_hours;
      } else if (department === "Workshop") {
        standardHours = 8.5;
      } else {
        standardHours = rules.standard_hours_per_day || 8;
      }
    }
    
    let overtimeHours = 0;
    let undertimeHours = 0;
    
    if (hoursWorked > standardHours) {
      overtimeHours = Math.min(hoursWorked - standardHours, maxOvertimePerDay);
    } else if (hoursWorked < standardHours) {
      undertimeHours = standardHours - hoursWorked;
    }

    // Update attendance record
    const { error } = await supabase
      .from("attendance")
      .update({
        hours_worked: Math.round(hoursWorked * 100) / 100,
        overtime_hours: Math.round(overtimeHours * 100) / 100,
        undertime_hours: Math.round(undertimeHours * 100) / 100,
        late_hours: 0, // Keep for backward compatibility
      })
      .eq("employee_id", employeeId)
      .eq("attendance_date", attendanceDate);

    if (error) {
      throw new Error(`Failed to update attendance: ${error.message}`);
    }
  }
}
