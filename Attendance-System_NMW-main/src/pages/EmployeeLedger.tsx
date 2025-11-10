import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useEmployees } from "@/hooks/useEmployees";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { ChevronsUpDown, Check, Calendar, User, DollarSign, Clock, TrendingUp, FileText, Download, Printer, Filter, Search, CheckCircle2, XCircle, Coffee, PartyPopper } from "lucide-react";
import { SalaryCalculationService } from "@/services/salaryCalculationService";
import { motion } from "framer-motion";
import { Separator } from "@/components/ui/separator";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

// Version: Floor display fix - balance shows floored value (discards decimal)

export default function EmployeeLedger() {
  const { data: employees = [] } = useEmployees();
  const [params, setParams] = useSearchParams();
  const employeeId = params.get("employeeId") || "";
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const selectedEmployee = useMemo(() => {
    return employees.find((e) => e.id === employeeId) || null;
  }, [employees, employeeId]);

  useEffect(() => {
    if (!selectedEmployee) return;
    const join = selectedEmployee.joining_date;
    const today = new Date().toISOString().split("T")[0];
    const initialStart = params.get("start") || join;
    const initialEnd = params.get("end") || today;
    if (initialStart < join) {
      toast.warning("Adjusted start date to employee's joining date");
    }
    setStartDate(initialStart < join ? join : initialStart);
    setEndDate(initialEnd < join ? join : initialEnd);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedEmployee?.id]);

  const [attendance, setAttendance] = useState<any[]>([]);
  const [advances, setAdvances] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const printRef = useRef<HTMLDivElement | null>(null);
  const [employeePickerOpen, setEmployeePickerOpen] = useState(false);
  const [payrollRow, setPayrollRow] = useState<any | null>(null);
  const [paymentsForPayrollTotal, setPaymentsForPayrollTotal] = useState<number>(0);
  const [deptRules, setDeptRules] = useState<any | null>(null);
  const [summary, setSummary] = useState<{
    presentDays: number;
    absentDays: number;
    leaveDays: number;
    holidayDays: number;
    perDay: number;
    hourly: number;
    overtimeHours: number;
    undertimeHours: number;
    overtimePay: number;
    undertimeDeduction: number;
    advancesTotal: number;
    paymentsTotal: number;
    earnedSalary: number;
    finalSalary: number;
    balance: number;
    status: "Overpaid" | "Settled" | "Underpaid";
  } | null>(null);

  const canQuery = Boolean(selectedEmployee && startDate && endDate);

  const fetchLedger = async () => {
    if (!canQuery || !selectedEmployee) return;
    setLoading(true);
    try {
      const { data: attData } = await supabase
        .from("attendance")
        .select("attendance_date,status,hours_worked,overtime_hours,undertime_hours")
        .eq("employee_id", selectedEmployee.id)
        .gte("attendance_date", startDate)
        .lte("attendance_date", endDate)
        .order("attendance_date", { ascending: true });
      setAttendance(attData || []);

      const { data: advData } = await supabase
        .from("advances")
        .select("id,advance_date,amount,notes")
        .eq("employee_id", selectedEmployee.id)
        .gte("advance_date", startDate)
        .lte("advance_date", endDate)
        .order("advance_date", { ascending: true });
      setAdvances(advData || []);

      const { data: payData } = await supabase
        .from("payments")
        .select("id,payment_date,amount,notes,payroll_id")
        .eq("employee_id", selectedEmployee.id)
        .gte("payment_date", startDate)
        .lte("payment_date", endDate)
        .order("payment_date", { ascending: true });
      setPayments(payData || []);

      // Load matching payroll row for month/year of the range end (closest payroll)
      const end = new Date(endDate);
      const { data: pr } = await supabase
        .from("payroll")
        .select("id, month, year, final_salary")
        .eq("employee_id", selectedEmployee.id)
        .eq("month", end.getMonth() + 1)
        .eq("year", end.getFullYear())
        .maybeSingle();
      setPayrollRow(pr || null);

      // If we have a payroll row, compute payments against that payroll_id for accuracy
      if (pr?.id) {
        const { data: paysForPayroll } = await supabase
          .from("payments")
          .select("amount")
          .eq("payroll_id", pr.id);
        const pTotal = (paysForPayroll || []).reduce((s: number, p: any) => s + Number(p.amount || 0), 0);
        setPaymentsForPayrollTotal(pTotal);
      } else {
        // Fallback: sum payments in range (no payroll generated)
        setPaymentsForPayrollTotal((payData || []).reduce((s: number, p: any) => s + Number(p.amount || 0), 0));
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLedger();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [employeeId, startDate, endDate]);

  // Load department rules when employee changes
  useEffect(() => {
    const loadRules = async () => {
      if (!selectedEmployee) {
        setDeptRules(null);
        return;
      }
      const rules = await SalaryCalculationService.getDepartmentRules(selectedEmployee.department as any);
      setDeptRules(rules);
    };
    loadRules();
  }, [selectedEmployee?.id]);

  // Compute summary once data available
  useEffect(() => {
    if (!selectedEmployee || !deptRules) {
      setSummary(null);
      return;
    }
    
    const calculateSummary = async () => {
      try {
        // Use the SalaryCalculationService for accurate calculations
        const result = await SalaryCalculationService.calculateSalary({
          employee_id: selectedEmployee.id,
          base_salary: Number(selectedEmployee.base_salary || 0),
          overtime_rate: Number(selectedEmployee.overtime_rate || 0),
          month: new Date(endDate).getMonth() + 1,
          year: new Date(endDate).getFullYear(),
          attendance_data: attendance.map(a => ({
            attendance_date: a.attendance_date,
            status: a.status,
            overtime_hours: Number(a.overtime_hours || 0),
            undertime_hours: Number(a.undertime_hours || 0),
            hours_worked: Number(a.hours_worked || 0),
            late_hours: Number(a.late_hours || 0),
          })),
          advance_amount: advances.reduce((s: number, v: any) => s + Number(v.amount || 0), 0),
        });

        setSummary({
          presentDays: result.present_days,
          absentDays: result.absent_days,
          leaveDays: result.leave_days,
          holidayDays: result.holiday_days,
          perDay: result.calculation_details.per_day_salary,
          hourly: result.calculation_details.hourly_rate,
          overtimeHours: result.overtime_hours,
          undertimeHours: result.undertime_hours,
          overtimePay: result.overtime_pay,
          undertimeDeduction: result.undertime_deduction,
          advancesTotal: result.advance_amount,
          paymentsTotal: paymentsForPayrollTotal,
          earnedSalary: result.earned_salary,
          finalSalary: result.final_salary,
          balance: Math.floor(Math.max(0, Number(result.final_salary) - Number(paymentsForPayrollTotal))),
          status: (Number(result.final_salary) - Number(paymentsForPayrollTotal)) < 0 ? "Overpaid" : 
                  Math.floor(Math.max(0, Number(result.final_salary) - Number(paymentsForPayrollTotal))) === 0 ? "Settled" : "Underpaid",
        });
      } catch (error) {
        console.error("Error calculating salary summary:", error);
        toast.error("Failed to calculate salary summary");
      }
    };

    calculateSummary();
  }, [selectedEmployee?.id, deptRules, attendance, advances, paymentsForPayrollTotal, endDate]);

  const handleApply = () => {
    if (!selectedEmployee) return;
    const join = selectedEmployee.joining_date;
    if (startDate < join) {
      toast.error("Start date cannot be before joining date");
      setStartDate(join);
      return;
    }
    setParams({ employeeId, start: startDate, end: endDate });
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20 p-4 sm:p-6 lg:p-8 pt-16 sm:pt-8 print:p-0 print:bg-white">
      {/* Header Section */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-4 sm:mb-6 lg:mb-8 print:hidden"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4 sm:mb-6">
          <div>
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold mb-2 bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              Employee Ledger
            </h1>
            <p className="text-muted-foreground flex items-center gap-2 text-sm sm:text-base">
              <FileText className="h-4 w-4" />
              Comprehensive financial records and attendance history
            </p>
          </div>
          {selectedEmployee && (
            <div className="flex gap-2">
              <Button variant="outline" size="sm" className="gap-2 hover:bg-primary hover:text-primary-foreground hover:scale-105 transition-all duration-300 flex-1 sm:flex-initial">
                <Download className="h-4 w-4" />
                <span className="hidden sm:inline">Export</span>
              </Button>
              <Button variant="outline" size="sm" onClick={handlePrint} className="gap-2 hover:bg-primary hover:text-primary-foreground hover:scale-105 transition-all duration-300 flex-1 sm:flex-initial">
                <Printer className="h-4 w-4" />
                <span className="hidden sm:inline">Print</span>
              </Button>
            </div>
          )}
        </div>
      </motion.div>

      {/* Employee Selection & Filters */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="mb-8 print:hidden"
      >
        <Card className="shadow-soft border-0 hover:shadow-strong transition-all duration-300">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Filter className="h-5 w-5 text-primary" />
              Employee Selection & Date Range
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 sm:gap-6">
              <div className="md:col-span-2">
                <Label htmlFor="employee" className="text-xs sm:text-sm font-medium mb-2 block">Select Employee</Label>
                <Popover open={employeePickerOpen} onOpenChange={setEmployeePickerOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={employeePickerOpen}
                      className="w-full justify-between h-12 hover:bg-muted/50 transition-all duration-300"
                    >
                      <div className="flex items-center gap-3">
                        <User className="h-4 w-4 text-muted-foreground" />
                        <span className="truncate">
                          {selectedEmployee ? `${selectedEmployee.employee_id} - ${selectedEmployee.name}` : "Choose an employee..."}
                        </span>
                      </div>
                      <ChevronsUpDown className="ml-2 h-4 w-4 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="p-0 w-[--radix-popover-trigger-width]">
                    <Command>
                      <div className="flex items-center border-b px-3">
                        <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
                        <CommandInput placeholder="Search employee by name, ID, CNIC..." className="flex h-10 w-full rounded-md bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50" />
                      </div>
                      <CommandList>
                        <CommandEmpty>No employee found.</CommandEmpty>
                        <CommandGroup>
                          {employees.map((e: any) => (
                            <CommandItem
                              key={e.id}
                              value={`${e.employee_id} ${e.name} ${e.cnic} ${e.department}`}
                              onSelect={() => {
                                setParams({ employeeId: e.id });
                                setEmployeePickerOpen(false);
                              }}
                              className="flex items-center gap-3 p-3 hover:bg-muted/50 transition-colors duration-200"
                            >
                              <Check
                                className={`h-4 w-4 ${selectedEmployee && selectedEmployee.id === e.id ? "opacity-100" : "opacity-0"}`}
                              />
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full bg-gradient-primary flex items-center justify-center text-white text-xs font-bold">
                                  {e.name.split(" ").map((n: string) => n[0]).join("")}
                                </div>
                                <div>
                                  <div className="font-medium">{e.name}</div>
                                  <div className="text-xs text-muted-foreground">{e.employee_id} • {e.department}</div>
                                </div>
                              </div>
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>
              <div>
                <Label htmlFor="start" className="text-xs sm:text-sm font-medium mb-2 block flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-primary" />
                  Start Date
                </Label>
                <Input 
                  id="start" 
                  type="date" 
                  className="h-10 sm:h-12 hover:border-primary/50 transition-colors duration-300" 
                  value={startDate} 
                  onChange={(ev) => setStartDate(ev.target.value)} 
                />
              </div>
              <div>
                <Label htmlFor="end" className="text-xs sm:text-sm font-medium mb-2 block flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-primary" />
                  End Date
                </Label>
                <Input 
                  id="end" 
                  type="date" 
                  className="h-10 sm:h-12 hover:border-primary/50 transition-colors duration-300" 
                  value={endDate} 
                  onChange={(ev) => setEndDate(ev.target.value)} 
                />
              </div>
            </div>
            <div className="mt-4 sm:mt-6 flex flex-col sm:flex-row gap-2 sm:gap-3">
              <Button 
                onClick={handleApply} 
                disabled={!employeeId || !startDate || !endDate || loading} 
                className="hover:scale-105 transition-all duration-300 bg-gradient-primary shadow-medium hover:shadow-strong"
                size="lg"
              >
                {loading ? (
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Loading...
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <Search className="h-4 w-4" />
                    Generate Ledger
                  </div>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {selectedEmployee && (
        <>
          {/* Web View Content */}
          <div className="space-y-8 print:hidden">
          {/* Employee Info Card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <Card className="shadow-soft border-0 hover:shadow-strong transition-all duration-300">
              <CardContent className="p-6">
                <div className="flex items-center gap-6">
                  <div className="w-16 h-16 rounded-full bg-gradient-primary flex items-center justify-center text-white text-xl font-bold">
                    {selectedEmployee.name.split(" ").map((n: string) => n[0]).join("")}
                  </div>
                  <div className="flex-1">
                    <h2 className="text-2xl font-bold mb-1">{selectedEmployee.name}</h2>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <User className="h-4 w-4" />
                        {selectedEmployee.employee_id}
                      </span>
                      <span className="flex items-center gap-1">
                        <FileText className="h-4 w-4" />
                        {selectedEmployee.department}
                      </span>
                      <span className="flex items-center gap-1">
                        <Calendar className="h-4 w-4" />
                        Joined: {new Date(selectedEmployee.joining_date).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm text-muted-foreground">Date Range</div>
                    <div className="font-semibold">
                      {new Date(startDate).toLocaleDateString()} - {new Date(endDate).toLocaleDateString()}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Summary Cards */}
          {summary && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"
            >
              <Card className="shadow-soft border-0 hover:shadow-strong hover:scale-105 transition-all duration-300 cursor-pointer group">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="p-3 rounded-lg bg-green-100 group-hover:scale-110 transition-transform duration-300">
                      <CheckCircle2 className="h-6 w-6 text-green-600" />
                    </div>
                    <Badge variant="secondary" className="group-hover:scale-105 transition-transform duration-300">
                      Present
                    </Badge>
                  </div>
                  <div className="text-3xl font-bold mb-1 group-hover:text-green-600 transition-colors duration-300">
                    {summary.presentDays}
                  </div>
                  <div className="text-sm text-muted-foreground group-hover:text-foreground transition-colors duration-300">
                    Working Days
                  </div>
                </CardContent>
              </Card>

              <Card className="shadow-soft border-0 hover:shadow-strong hover:scale-105 transition-all duration-300 cursor-pointer group">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="p-3 rounded-lg bg-red-100 group-hover:scale-110 transition-transform duration-300">
                      <XCircle className="h-6 w-6 text-red-600" />
                    </div>
                    <Badge variant="secondary" className="group-hover:scale-105 transition-transform duration-300">
                      Absent
                    </Badge>
                  </div>
                  <div className="text-3xl font-bold mb-1 group-hover:text-red-600 transition-colors duration-300">
                    {summary.absentDays}
                  </div>
                  <div className="text-sm text-muted-foreground group-hover:text-foreground transition-colors duration-300">
                    Absent Days
                  </div>
                </CardContent>
              </Card>

              <Card className="shadow-soft border-0 hover:shadow-strong hover:scale-105 transition-all duration-300 cursor-pointer group">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="p-3 rounded-lg bg-yellow-100 group-hover:scale-110 transition-transform duration-300">
                      <Coffee className="h-6 w-6 text-yellow-600" />
                    </div>
                    <Badge variant="secondary" className="group-hover:scale-105 transition-transform duration-300">
                      Leave
                    </Badge>
                  </div>
                  <div className="text-3xl font-bold mb-1 group-hover:text-yellow-600 transition-colors duration-300">
                    {summary.leaveDays}
                  </div>
                  <div className="text-sm text-muted-foreground group-hover:text-foreground transition-colors duration-300">
                    Leave Days
                  </div>
                </CardContent>
              </Card>

              <Card className="shadow-soft border-0 hover:shadow-strong hover:scale-105 transition-all duration-300 cursor-pointer group">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="p-3 rounded-lg bg-blue-100 group-hover:scale-110 transition-transform duration-300">
                      <PartyPopper className="h-6 w-6 text-blue-600" />
                    </div>
                    <Badge variant="secondary" className="group-hover:scale-105 transition-transform duration-300">
                      Holiday
                    </Badge>
                  </div>
                  <div className="text-3xl font-bold mb-1 group-hover:text-blue-600 transition-colors duration-300">
                    {summary.holidayDays}
                  </div>
                  <div className="text-sm text-muted-foreground group-hover:text-foreground transition-colors duration-300">
                    Holiday Days
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* Financial Summary */}
          {summary && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
            >
              <Card className="shadow-soft border-0 hover:shadow-strong transition-all duration-300">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <DollarSign className="h-5 w-5 text-primary" />
                    Salary Breakdown & Financial Summary
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="bg-muted/30 p-4 rounded-lg hover:bg-muted/50 hover:scale-105 transition-all duration-300 cursor-pointer group">
                      <div className="text-sm text-muted-foreground group-hover:text-foreground transition-colors duration-300">Base Salary</div>
                      <div className="text-lg font-bold group-hover:text-primary transition-colors duration-300">
                        PKR {Math.round(Number(selectedEmployee.base_salary || 0)).toLocaleString()}
                      </div>
                      <div className="text-xs text-muted-foreground">Monthly Rate</div>
                    </div>
                    <div className="bg-muted/30 p-4 rounded-lg hover:bg-muted/50 hover:scale-105 transition-all duration-300 cursor-pointer group">
                      <div className="text-sm text-muted-foreground group-hover:text-foreground transition-colors duration-300">Earned (Present × Daily)</div>
                      <div className="text-lg font-bold group-hover:text-primary transition-colors duration-300">
                        PKR {(Math.round(summary.earnedSalary)).toLocaleString()}
                      </div>
                      <div className="text-xs text-muted-foreground">{summary.presentDays} days × PKR {Math.round(summary.perDay).toLocaleString()}</div>
                    </div>
                    <div className="bg-green-50 p-4 rounded-lg hover:bg-green-100 hover:scale-105 transition-all duration-300 cursor-pointer group">
                      <div className="text-sm text-green-600 group-hover:text-green-700 transition-colors duration-300">Overtime Pay</div>
                      <div className="text-lg font-bold text-green-600 group-hover:text-green-700 transition-colors duration-300">
                        +PKR {Math.round(summary.overtimePay).toLocaleString()}
                      </div>
                      <div className="text-xs text-green-500">{summary.overtimeHours.toFixed(1)} hours</div>
                    </div>
                    <div className="bg-red-50 p-4 rounded-lg hover:bg-red-100 hover:scale-105 transition-all duration-300 cursor-pointer group">
                      <div className="text-sm text-red-600 group-hover:text-red-700 transition-colors duration-300">Undertime Deduction</div>
                      <div className="text-lg font-bold text-red-600 group-hover:text-red-700 transition-colors duration-300">
                        -PKR {Math.round(summary.undertimeDeduction).toLocaleString()}
                      </div>
                      <div className="text-xs text-red-500">{summary.undertimeHours.toFixed(1)} hours</div>
                    </div>
                  </div>

                  <Separator className="my-6" />

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-amber-50 p-4 rounded-lg hover:bg-amber-100 hover:scale-105 transition-all duration-300 cursor-pointer group">
                      <div className="text-sm text-amber-600 group-hover:text-amber-700 transition-colors duration-300">Total Advances</div>
                      <div className="text-xl font-bold text-amber-600 group-hover:text-amber-700 transition-colors duration-300">
                        -PKR {Math.round(summary.advancesTotal).toLocaleString()}
                      </div>
                      <div className="text-xs text-amber-500">{advances.length} transaction(s)</div>
                    </div>
                    <div className="bg-primary/10 p-4 rounded-lg hover:bg-primary/20 hover:scale-105 transition-all duration-300 cursor-pointer group">
                      <div className="text-sm text-primary group-hover:text-primary/80 transition-colors duration-300">Final Salary</div>
                      <div className="text-2xl font-bold text-primary group-hover:text-primary/80 transition-colors duration-300">
                        PKR {Math.round(summary.finalSalary).toLocaleString()}
                      </div>
                      <div className="text-xs text-primary/70">After Deductions</div>
                    </div>
                    <div className="bg-emerald-50 p-4 rounded-lg hover:bg-emerald-100 hover:scale-105 transition-all duration-300 cursor-pointer group">
                      <div className="text-sm text-emerald-600 group-hover:text-emerald-700 transition-colors duration-300">Total Paid</div>
                      <div className="text-xl font-bold text-emerald-600 group-hover:text-emerald-700 transition-colors duration-300">
                        PKR {Math.round(summary.paymentsTotal).toLocaleString()}
                      </div>
                      <div className="text-xs text-emerald-500">{payments.length} payment(s)</div>
                    </div>
                  </div>
                  
                  {/* Remaining Balance Display */}
                  <div className="mt-6">
                    <div className={`text-lg rounded-xl border-2 p-6 flex items-center justify-between hover:scale-105 transition-all duration-300 cursor-pointer ${
                      summary.balance === 0 
                        ? 'bg-gradient-to-r from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 border-green-300 dark:border-green-700 hover:from-green-100 hover:to-green-200 dark:hover:from-green-900/30 dark:hover:to-green-800/30' 
                        : summary.balance < 0 
                        ? 'bg-gradient-to-r from-red-50 to-red-100 dark:from-red-900/20 dark:to-red-800/20 border-red-300 dark:border-red-700 hover:from-red-100 hover:to-red-200 dark:hover:from-red-900/30 dark:hover:to-red-800/30' 
                        : 'bg-gradient-to-r from-yellow-50 to-yellow-100 dark:from-yellow-900/20 dark:to-yellow-800/20 border-yellow-300 dark:border-yellow-700 hover:from-yellow-100 hover:to-yellow-200 dark:hover:from-yellow-900/30 dark:hover:to-yellow-800/30'
                    }`}>
                      <div className="flex items-center gap-4">
                        <div className={`p-3 rounded-full ${
                          summary.balance === 0 
                            ? 'bg-green-200 dark:bg-green-800/50' 
                            : summary.balance < 0 
                            ? 'bg-red-200 dark:bg-red-800/50' 
                            : 'bg-yellow-200 dark:bg-yellow-800/50'
                        }`}>
                          <DollarSign className={`h-6 w-6 ${
                            summary.balance === 0 
                              ? 'text-green-700 dark:text-green-300' 
                              : summary.balance < 0 
                              ? 'text-red-700 dark:text-red-300' 
                              : 'text-yellow-700 dark:text-yellow-300'
                          }`} />
                        </div>
                        <div>
                          <div className="text-sm font-medium text-muted-foreground">Account Status</div>
                          <div className="text-xl font-bold">
                            {summary.balance === 0 ? 'Fully Settled' : summary.balance < 0 ? 'Overpaid' : 'Pending Payment'}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-medium text-muted-foreground">Amount</div>
                        <div className={`text-3xl font-bold ${
                          summary.balance === 0 
                            ? 'text-green-700 dark:text-green-300' 
                            : summary.balance < 0 
                            ? 'text-red-700 dark:text-red-300' 
                            : 'text-yellow-700 dark:text-yellow-300'
                        }`}>
                          PKR {Math.abs(summary.balance).toLocaleString()}
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* Attendance Details */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
          >
            <Card className="shadow-soft border-0 hover:shadow-strong transition-all duration-300">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5 text-primary" />
                  Attendance Details ({attendance.length} records)
                </CardTitle>
              </CardHeader>
              <CardContent>
                {attendance.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No attendance records found for this period</p>
                  </div>
                ) : (
                  <div className="rounded-lg border">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-muted/50 hover:bg-muted/50">
                          <TableHead>Date</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead className="text-right">Hours Worked</TableHead>
                          <TableHead className="text-right">Overtime</TableHead>
                          <TableHead className="text-right">Undertime</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {attendance.map((record: any, index: number) => (
                          <TableRow key={index} className="hover:bg-muted/30 transition-colors duration-200">
                            <TableCell className="font-medium">
                              {new Date(record.attendance_date).toLocaleDateString('en-US', { 
                                weekday: 'short', 
                                year: 'numeric', 
                                month: 'short', 
                                day: 'numeric' 
                              })}
                            </TableCell>
                            <TableCell>
                              <Badge className={`${
                                record.status === 'present' ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 border-green-200 dark:border-green-700' :
                                record.status === 'absent' ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 border-red-200 dark:border-red-700' :
                                record.status === 'leave' ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300 border-yellow-200 dark:border-yellow-700' :
                                'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-700'
                              }`}>
                                {record.status === 'present' && <CheckCircle2 className="h-3 w-3 mr-1 inline" />}
                                {record.status === 'absent' && <XCircle className="h-3 w-3 mr-1 inline" />}
                                {record.status === 'leave' && <Coffee className="h-3 w-3 mr-1 inline" />}
                                {record.status === 'holiday' && <PartyPopper className="h-3 w-3 mr-1 inline" />}
                                {record.status.charAt(0).toUpperCase() + record.status.slice(1)}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right">
                              {record.hours_worked ? `${Number(record.hours_worked).toFixed(1)}h` : '-'}
                            </TableCell>
                            <TableCell className="text-right text-green-600 font-medium">
                              {record.overtime_hours > 0 ? `+${Number(record.overtime_hours).toFixed(1)}h` : '-'}
                            </TableCell>
                            <TableCell className="text-right text-red-600 font-medium">
                              {record.undertime_hours > 0 ? `-${Number(record.undertime_hours).toFixed(1)}h` : '-'}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>

          {/* Transaction History */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
          >
            <Card className="shadow-soft border-0 hover:shadow-strong transition-all duration-300">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="h-5 w-5 text-primary" />
                  Transaction History
                </CardTitle>
              </CardHeader>
              <CardContent>
                {advances.length === 0 && payments.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No financial transactions found for this period</p>
                  </div>
                ) : (
                  <div className="rounded-lg border">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-muted/50 hover:bg-muted/50">
                          <TableHead>Date</TableHead>
                          <TableHead>Type</TableHead>
                          <TableHead>Description</TableHead>
                          <TableHead className="text-right">Amount</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {/* Advances */}
                        {advances.map((adv: any, index: number) => (
                          <TableRow key={`adv-${index}`} className="hover:bg-muted/30 transition-colors duration-200">
                            <TableCell className="font-medium">
                              {new Date(adv.advance_date).toLocaleDateString('en-US', { 
                                year: 'numeric', 
                                month: 'short', 
                                day: 'numeric' 
                              })}
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline" className="border-amber-300 text-amber-700 bg-amber-50">
                                Advance
                              </Badge>
                            </TableCell>
                            <TableCell className="text-muted-foreground">
                              {adv.notes || 'Advance payment'}
                            </TableCell>
                            <TableCell className="text-right font-bold text-amber-600">
                              -PKR {Math.round(Number(adv.amount)).toLocaleString()}
                            </TableCell>
                          </TableRow>
                        ))}
                        
                        {/* Payments */}
                        {payments.map((pay: any, index: number) => (
                          <TableRow key={`pay-${index}`} className="hover:bg-muted/30 transition-colors duration-200">
                            <TableCell className="font-medium">
                              {new Date(pay.payment_date).toLocaleDateString('en-US', { 
                                year: 'numeric', 
                                month: 'short', 
                                day: 'numeric' 
                              })}
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline" className="border-green-300 text-green-700 bg-green-50">
                                Payment
                              </Badge>
                            </TableCell>
                            <TableCell className="text-muted-foreground">
                              {pay.notes || 'Salary payment'}
                            </TableCell>
                            <TableCell className="text-right font-bold text-green-600">
                              +PKR {Math.round(Number(pay.amount)).toLocaleString()}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>

          </div>

          {/* Print View - Minimalistic */}
          <div className="hidden print:block">
            {/* Print Header */}
            <div className="mb-6 text-center border-b border-gray-300 pb-4">
              <h1 className="text-2xl font-bold text-gray-900">EMPLOYEE LEDGER</h1>
              <div className="text-xs text-gray-600 mt-1">
                Period: {new Date(startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} - {new Date(endDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
              </div>
            </div>

            {/* Employee Information with Picture */}
            <div className="mb-6 flex items-start gap-4 p-4 bg-gray-50 rounded border border-gray-200">
              {/* Employee Picture */}
              <div className="flex-shrink-0">
                {selectedEmployee.photo_url ? (
                  <img 
                    src={selectedEmployee.photo_url} 
                    alt={selectedEmployee.name}
                    className="w-20 h-20 rounded-lg object-cover border-2 border-gray-300"
                  />
                ) : (
                  <div className="w-20 h-20 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white text-xl font-bold border-2 border-gray-300">
                    {selectedEmployee.name.split(" ").map((n: string) => n[0]).join("")}
                  </div>
                )}
              </div>
              
              {/* Employee Details */}
              <div className="flex-1 grid grid-cols-3 gap-x-4 gap-y-2">
                <div>
                  <div className="text-[10px] text-gray-500 uppercase tracking-wide">Employee Name</div>
                  <div className="text-sm font-bold text-gray-900">{selectedEmployee.name}</div>
                </div>
                <div>
                  <div className="text-[10px] text-gray-500 uppercase tracking-wide">Employee ID</div>
                  <div className="text-sm font-semibold text-gray-700">{selectedEmployee.employee_id}</div>
                </div>
                <div>
                  <div className="text-[10px] text-gray-500 uppercase tracking-wide">Department</div>
                  <div className="text-sm font-semibold text-gray-700">{selectedEmployee.department}</div>
                </div>
                <div>
                  <div className="text-[10px] text-gray-500 uppercase tracking-wide">CNIC</div>
                  <div className="text-sm font-semibold text-gray-700">{selectedEmployee.cnic}</div>
                </div>
                <div>
                  <div className="text-[10px] text-gray-500 uppercase tracking-wide">Base Salary</div>
                  <div className="text-sm font-semibold text-gray-700">PKR {Math.round(Number(selectedEmployee.base_salary || 0)).toLocaleString()}</div>
                </div>
                <div>
                  <div className="text-[10px] text-gray-500 uppercase tracking-wide">Joining Date</div>
                  <div className="text-sm font-semibold text-gray-700">{new Date(selectedEmployee.joining_date).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}</div>
                </div>
              </div>
            </div>

            {summary && (
              <>
                {/* Attendance Summary - Compact */}
                <div className="mb-4">
                  <h2 className="text-sm font-bold mb-2 text-gray-900 border-b border-gray-300 pb-1">Attendance Summary</h2>
                  <div className="grid grid-cols-4 gap-2">
                    <div className="text-center p-2 bg-green-50 dark:bg-green-900/20 rounded border border-green-200 dark:border-green-700">
                      <div className="text-xl font-bold text-green-700 dark:text-green-300">{summary.presentDays}</div>
                      <div className="text-[10px] text-gray-600 dark:text-gray-400">Present</div>
                    </div>
                    <div className="text-center p-2 bg-red-50 dark:bg-red-900/20 rounded border border-red-200 dark:border-red-700">
                      <div className="text-xl font-bold text-red-700 dark:text-red-300">{summary.absentDays}</div>
                      <div className="text-[10px] text-gray-600 dark:text-gray-400">Absent</div>
                    </div>
                    <div className="text-center p-2 bg-yellow-50 dark:bg-yellow-900/20 rounded border border-yellow-200 dark:border-yellow-700">
                      <div className="text-xl font-bold text-yellow-700 dark:text-yellow-300">{summary.leaveDays}</div>
                      <div className="text-[10px] text-gray-600 dark:text-gray-400">Leave</div>
                    </div>
                    <div className="text-center p-2 bg-blue-50 dark:bg-blue-900/20 rounded border border-blue-200 dark:border-blue-700">
                      <div className="text-xl font-bold text-blue-700 dark:text-blue-300">{summary.holidayDays}</div>
                      <div className="text-[10px] text-gray-600 dark:text-gray-400">Holiday</div>
                    </div>
                  </div>
                </div>

                {/* Salary Calculation - Detailed */}
                <div className="mb-4">
                  <h2 className="text-sm font-bold mb-2 text-gray-900 border-b border-gray-300 pb-1">Salary Breakdown</h2>
                  <div className="border border-gray-300 rounded overflow-hidden">
                    <table className="w-full text-xs">
                      <tbody>
                        <tr className="border-b border-gray-200">
                          <td className="p-2 text-gray-600 bg-gray-50">Per Day Rate</td>
                          <td className="p-2 text-right font-semibold">PKR {Math.round(summary.perDay).toLocaleString()}</td>
                        </tr>
                        <tr className="border-b border-gray-200">
                          <td className="p-2 text-gray-600 bg-gray-50">Per Hour Rate</td>
                          <td className="p-2 text-right font-semibold">PKR {Math.round(summary.hourly).toLocaleString()}</td>
                        </tr>
                        <tr className="border-b border-gray-200 bg-green-50">
                          <td className="p-2 font-medium">Earned Salary ({summary.presentDays} days)</td>
                          <td className="p-2 text-right font-bold text-green-700">+PKR {Math.round(summary.earnedSalary).toLocaleString()}</td>
                        </tr>
                        {summary.overtimeHours > 0 && (
                          <tr className="border-b border-gray-200 bg-blue-50">
                            <td className="p-2 font-medium">Overtime Pay ({summary.overtimeHours.toFixed(1)} hrs)</td>
                            <td className="p-2 text-right font-bold text-blue-700">+PKR {Math.round(summary.overtimePay).toLocaleString()}</td>
                          </tr>
                        )}
                        {summary.undertimeHours > 0 && (
                          <tr className="border-b border-gray-200 bg-red-50">
                            <td className="p-2 font-medium">Undertime Deduction ({summary.undertimeHours.toFixed(1)} hrs)</td>
                            <td className="p-2 text-right font-bold text-red-700">-PKR {Math.round(summary.undertimeDeduction).toLocaleString()}</td>
                          </tr>
                        )}
                        {summary.advancesTotal > 0 && (
                          <tr className="border-b border-gray-200 bg-amber-50">
                            <td className="p-2 font-medium">Total Advances</td>
                            <td className="p-2 text-right font-bold text-amber-700">-PKR {Math.round(summary.advancesTotal).toLocaleString()}</td>
                          </tr>
                        )}
                        <tr className="bg-gray-100 border-t-2 border-gray-400">
                          <td className="p-2 font-bold text-gray-900">Final Salary</td>
                          <td className="p-2 text-right font-bold text-lg text-gray-900">PKR {Math.round(summary.finalSalary).toLocaleString()}</td>
                        </tr>
                        {summary.paymentsTotal > 0 && (
                          <tr className="border-b border-gray-200 bg-green-50">
                            <td className="p-2 font-medium">Total Payments Made</td>
                            <td className="p-2 text-right font-bold text-green-700">-PKR {Math.round(summary.paymentsTotal).toLocaleString()}</td>
                          </tr>
                        )}
                        <tr className={`border-t-2 ${
                          summary.balance === 0 ? 'bg-green-100 border-green-400' : 
                          summary.balance < 0 ? 'bg-red-100 border-red-400' : 
                          'bg-yellow-100 border-yellow-400'
                        }`}>
                          <td className="p-2 font-bold">
                            {summary.balance === 0 ? 'Status: Settled ✓' : 
                             summary.balance < 0 ? 'Status: Overpaid ⚠' : 
                             'Balance Remaining'}
                          </td>
                          <td className={`p-2 text-right font-bold text-lg ${
                            summary.balance === 0 ? 'text-green-700 dark:text-green-300' : 
                            summary.balance < 0 ? 'text-red-700 dark:text-red-300' : 
                            'text-yellow-700 dark:text-yellow-300'
                          }`}>
                            PKR {Math.abs(summary.balance).toLocaleString()}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            )}

            {/* Advances - Compact */}
            {advances.length > 0 && (
              <div className="mb-4">
                <h2 className="text-sm font-bold mb-2 text-gray-900 border-b border-gray-300 pb-1">Advances</h2>
                <div className="border border-gray-300 rounded overflow-hidden">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="bg-gray-100 border-b border-gray-300">
                        <th className="p-2 text-left font-semibold text-gray-700">Date</th>
                        <th className="p-2 text-left font-semibold text-gray-700">Description</th>
                        <th className="p-2 text-right font-semibold text-gray-700">Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      {advances.map((adv: any, index: number) => (
                        <tr key={`adv-${index}`} className="border-b border-gray-200">
                          <td className="p-2">{new Date(adv.advance_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</td>
                          <td className="p-2 text-gray-600">{adv.notes || 'Advance payment'}</td>
                          <td className="p-2 text-right font-semibold text-amber-600">PKR {Math.round(Number(adv.amount)).toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Payments - Compact */}
            {payments.length > 0 && (
              <div className="mb-4">
                <h2 className="text-sm font-bold mb-2 text-gray-900 border-b border-gray-300 pb-1">Payments</h2>
                <div className="border border-gray-300 rounded overflow-hidden">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="bg-gray-100 border-b border-gray-300">
                        <th className="p-2 text-left font-semibold text-gray-700">Date</th>
                        <th className="p-2 text-left font-semibold text-gray-700">Description</th>
                        <th className="p-2 text-right font-semibold text-gray-700">Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      {payments.map((pay: any, index: number) => (
                        <tr key={`pay-${index}`} className="border-b border-gray-200">
                          <td className="p-2">{new Date(pay.payment_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</td>
                          <td className="p-2 text-gray-600">{pay.notes || 'Salary payment'}</td>
                          <td className="p-2 text-right font-semibold text-green-600">PKR {Math.round(Number(pay.amount)).toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Footer - Compact */}
            <div className="mt-6 pt-3 border-t border-gray-300 text-center">
              <div className="text-[10px] text-gray-500">
                Generated on {new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} at {new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
              </div>
              <div className="text-[10px] text-gray-400 mt-0.5">
                NMW Attendance-PayRoll System
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
