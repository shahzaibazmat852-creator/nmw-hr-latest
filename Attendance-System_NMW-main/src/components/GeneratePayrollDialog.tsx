import { useState, useMemo, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { useEmployees } from "@/hooks/useEmployees";
import { useGeneratePayroll } from "@/hooks/usePayroll";
import { Progress } from "@/components/ui/progress";
import { CheckCircle, ChevronsUpDown, User, Search } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { SalaryCalculationService } from "@/services/salaryCalculationService";
import { toast } from "sonner";
import { formatLocalDate } from "@/lib/utils";

// Payroll generation dialog component
interface GeneratePayrollDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  month: number;
  year: number;
}

export default function GeneratePayrollDialog({ open, onOpenChange, month, year }: GeneratePayrollDialogProps) {
  const { data: employees = [] } = useEmployees();
  const generatePayroll = useGeneratePayroll();
  const [progress, setProgress] = useState(0);
  const [isGenerating, setIsGenerating] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [mode, setMode] = useState<"all" | "department" | "single">("all");
  const [selectedDept, setSelectedDept] = useState<string>("");
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>("");
  const [employeeSearchOpen, setEmployeeSearchOpen] = useState(false);

  const departments = useMemo(() => Array.from(new Set((employees || []).map((e: any) => e.department))).filter(Boolean), [employees]);

  // Reset selectedEmployeeId when mode changes away from "single"
  useEffect(() => {
    if (mode !== "single") {
      setSelectedEmployeeId("");
    }
  }, [mode]);

  const calculatePayroll = async () => {
    setIsGenerating(true);
    setProgress(0);
    setCompleted(false);
    
    try {
      // Filter target employees based on mode
      // Filter to only active employees for payroll generation (useEmployees already filters, but double-check)
      const activeEmployees = employees.filter((e: any) => e.is_active === true);
      let targetEmployees: any[] = activeEmployees;
      
      if (mode === "department" && selectedDept) {
        targetEmployees = activeEmployees.filter((e: any) => e.department === selectedDept);
      } else if (mode === "single" && selectedEmployeeId) {
        targetEmployees = activeEmployees.filter((e: any) => e.id === selectedEmployeeId);
      }

      const totalTargetEmployees = targetEmployees.length;
      
      if (totalTargetEmployees === 0) {
        toast.error("No active employees found to process");
        setIsGenerating(false);
        return;
      }
      const targetIds = targetEmployees.map((e: any) => e.id);
      const startDate = formatLocalDate(new Date(year, month - 1, 1));
      const endDate = formatLocalDate(new Date(year, month, 0));

      // Batch prefetch attendance and advances to reduce N+1 queries
      const attendanceByEmployee: Record<string, any[]> = {};
      const advancesByEmployee: Record<string, any[]> = {};

      if (targetIds.length > 0) {
        const [{ data: attAll }, { data: advAll }] = await Promise.all([
          supabase
            .from("attendance")
            .select("*")
            .in("employee_id", targetIds)
            .gte("attendance_date", startDate)
            .lte("attendance_date", endDate),
          supabase
            .from("advances")
            .select("employee_id, amount, advance_date")
            .in("employee_id", targetIds)
            .gte("advance_date", startDate)
            .lte("advance_date", endDate),
        ]);

        (attAll || []).forEach((row: any) => {
          const k = row.employee_id;
          if (!attendanceByEmployee[k]) attendanceByEmployee[k] = [];
          attendanceByEmployee[k].push(row);
        });
        (advAll || []).forEach((row: any) => {
          const k = row.employee_id;
          if (!advancesByEmployee[k]) advancesByEmployee[k] = [];
          advancesByEmployee[k].push(row);
        });
      }
      
      for (let i = 0; i < totalTargetEmployees; i++) {
        const employee = targetEmployees[i];
        try {
          console.log(`[Batch Payroll] Processing employee ${i + 1}/${totalTargetEmployees}: ${employee?.name || employee?.id}`);
          // Basic validation to avoid undefined property access
          if (!employee || !employee.id) {
            console.warn("Skipping employee with missing id", employee);
            continue;
          }
          if (!employee.department) {
            console.warn(`Skipping ${employee.name || employee.id}: missing department`);
            continue;
          }
          const baseSalaryNum = Number(employee.base_salary || 0);
          if (!Number.isFinite(baseSalaryNum) || baseSalaryNum <= 0) {
            console.warn(`Skipping ${employee.name || employee.id}: invalid base_salary`, employee.base_salary);
            continue;
          }
        
        // Use prefetched data
        const attendanceData = attendanceByEmployee[employee.id] || [];
        const totalAdvanceAmount = (advancesByEmployee[employee.id] || []).reduce((sum: number, advance: any) => sum + Number(advance.amount), 0) || 0;

        console.log(`[Batch Payroll] Calling calculateSalary for ${employee.name}, month=${month}, year=${year}`);
        // Use the new salary calculation service
        const calculationResult = await SalaryCalculationService.calculateSalary({
          employee_id: employee.id,
          base_salary: employee.base_salary,
          overtime_rate: employee.overtime_rate,
          month,
          year,
          attendance_data: attendanceData || [],
          advance_amount: totalAdvanceAmount,
        });

        console.log(`[Batch Payroll] Calculation successful for ${employee.name}: final_salary=${calculationResult.final_salary}, total_days=${calculationResult.total_days}`);
        // Generate payroll record
        await generatePayroll.mutateAsync({
          employee_id: employee.id,
          month,
          year,
          base_salary: calculationResult.base_salary,
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
          status: "pending",
        });

        console.log(`[Batch Payroll] Saved payroll for ${employee.name}`);
        setProgress(((i + 1) / totalTargetEmployees) * 100);
        } catch (empErr: any) {
          console.error(`Payroll generation failed for ${employee?.name || employee?.id || `index ${i}`}:`, empErr);
          // Continue with next employee while noting the failure
          toast.error(`Failed for ${employee?.name || employee?.employee_id || 'employee'}: ${empErr?.message || 'Unknown error'}`);
        }
      }

      toast.success("Payroll generated successfully!");
    } catch (error: any) {
      console.error("Payroll calculation error:", error);
      toast.error(`Payroll calculation failed: ${error.message}`);
    } finally {
      setIsGenerating(false);
      setCompleted(true);
      
      setTimeout(() => {
        onOpenChange(false);
        setCompleted(false);
        setProgress(0);
      }, 2000);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Generate Payroll</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6 py-4">
          {/* Generation Mode */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label>Mode</Label>
              <Select value={mode} onValueChange={(v: any) => setMode(v)}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Select mode" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Employees</SelectItem>
                  <SelectItem value="department">By Department</SelectItem>
                  <SelectItem value="single">Single Employee</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {mode === "department" && (
              <div>
                <Label>Department</Label>
                <Select value={selectedDept} onValueChange={(v: any) => setSelectedDept(v)}>
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Select department" />
                  </SelectTrigger>
                  <SelectContent>
                    {departments.map((d) => (
                      <SelectItem key={d} value={d}>{d}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {mode === "single" && (
              <div>
                <Label>Employee</Label>
                <Popover open={employeeSearchOpen} onOpenChange={setEmployeeSearchOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      type="button"
                      variant="outline"
                      role="combobox"
                      aria-expanded={employeeSearchOpen}
                      className="mt-1 w-full justify-between h-10"
                    >
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        <User className="h-4 w-4 text-muted-foreground shrink-0" />
                        <span className="truncate text-left">
                          {selectedEmployeeId
                            ? `${employees.find((e: any) => e.id === selectedEmployeeId)?.name || ''} (${employees.find((e: any) => e.id === selectedEmployeeId)?.employee_id || ''})`
                            : "Select employee"}
                        </span>
                      </div>
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="p-0 w-[--radix-popover-trigger-width]" align="start">
                    <Command>
                      <div className="flex items-center border-b px-3">
                        <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
                        <CommandInput 
                          placeholder="Search name, ID, department, CNIC..." 
                          className="flex h-10 w-full rounded-md bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50" 
                        />
                      </div>
                      <CommandList>
                        <CommandEmpty>No employee found.</CommandEmpty>
                        <CommandGroup>
                          {employees.filter((e: any) => e.is_active === true).map((e: any) => (
                            <CommandItem
                              key={e.id}
                              value={`${e.name} ${e.employee_id} ${e.department} ${e.cnic || ''}`}
                              onSelect={() => {
                                setSelectedEmployeeId(e.id);
                                setEmployeeSearchOpen(false);
                              }}
                              className="cursor-pointer"
                            >
                              <div className="flex flex-col w-full">
                                <span className="font-medium">{e.name}</span>
                                <span className="text-xs text-muted-foreground">{e.employee_id} • {e.department}</span>
                              </div>
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>
            )}
          </div>

          <div>
            <p className="text-sm text-muted-foreground mb-2">
              Generate payroll for {new Date(year, month - 1).toLocaleDateString("en-US", { month: "long", year: "numeric" })}
            </p>
            <p className="text-sm font-medium">
              {mode === 'all' && `${employees.filter((e: any) => e.is_active === true).length} active employees will be processed`}
              {mode === 'department' && `${employees.filter((e: any) => e.department === selectedDept && e.is_active === true).length} active employees in ${selectedDept || '—'} will be processed`}
              {mode === 'single' && `${selectedEmployeeId ? 1 : 0} employee selected`}
            </p>
          </div>
          
          {isGenerating && (
            <div className="space-y-2">
              <Progress value={progress} />
              <p className="text-sm text-center text-muted-foreground">
                Processing... {Math.round(progress)}%
              </p>
            </div>
          )}
          
          {completed && (
            <div className="flex items-center justify-center gap-2 text-success">
              <CheckCircle className="h-5 w-5" />
              <span className="font-medium">Payroll generated successfully!</span>
            </div>
          )}
          
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isGenerating}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              onClick={calculatePayroll}
              disabled={isGenerating || employees.length === 0 || (mode === 'department' && !selectedDept) || (mode === 'single' && !selectedEmployeeId)}
              className="flex-1 bg-gradient-hero"
            >
              {isGenerating ? "Generating..." : "Generate"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
