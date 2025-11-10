import { motion } from "framer-motion";
import { Users, TrendingUp, DollarSign, Calendar, Clock, FileText, Download, CheckCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useState, memo } from "react";
import { useMonthlyPayroll, useUpdatePayrollStatus } from "@/hooks/usePayroll";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { MultiSelect } from "@/components/ui/multi-select";
import { Badge } from "@/components/ui/badge";
import { useEmployees } from "@/hooks/useEmployees";
import { useEmployeeAttendance } from "@/hooks/useAttendance";
import AttendanceReportCard from "@/components/AttendanceReportCard";
import LedgerSalaryReport from "@/components/LedgerSalaryReport";
import LedgerAttendanceReport from "@/components/LedgerAttendanceReport";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";

// Version: Floor display fix - remaining balance shows floored value (discards decimal)

// Component to calculate real-time payment summary
const PaymentSummaryCalculator = ({ payrollData, month, year, children }: { payrollData: any[]; month: number; year: number; children: (data: { summary: any; allPayments: any[] }) => React.ReactNode }) => {
  const payrollIds = payrollData.map(p => p.id);
  
  // Get payment data for all payroll records
  const { data: allPayments = [] } = useQuery({
    queryKey: ["all-payments-reports", month, year],
    queryFn: async () => {
      if (!payrollIds || payrollIds.length === 0) return [];
      
      const { data, error } = await supabase
        .from("payments")
        .select("*")
        .in("payroll_id", payrollIds)
        .order("payment_date", { ascending: true });

      if (error) throw error;
      return data || [];
    },
    enabled: !!payrollIds && payrollIds.length > 0,
  });
  
  // Calculate summary
  const totalPaid = allPayments.reduce((sum, payment) => sum + Number(payment.amount), 0);
  const totalFinalSalary = payrollData.reduce((sum, p) => sum + Number(p.final_salary), 0);
  const remainingBalance = totalFinalSalary - totalPaid;
  
  // Count paid vs pending vs overpaid employees
  // Note: Overpayments can occur if final_salary decreases after payments are made
  // (e.g., when advances are added retroactively). The database trigger prevents
  // NEW overpayments but allows existing ones to persist for audit purposes.
  const paidEmployees = payrollData.filter(payroll => {
    const payments = allPayments.filter(p => p.payroll_id === payroll.id);
    const totalPaidForEmployee = payments.reduce((sum, payment) => sum + Number(payment.amount), 0);
    return totalPaidForEmployee >= Number(payroll.final_salary);
  }).length;
  
  const overpaidEmployees = payrollData.filter(payroll => {
    const payments = allPayments.filter(p => p.payroll_id === payroll.id);
    const totalPaidForEmployee = payments.reduce((sum, payment) => sum + Number(payment.amount), 0);
    return totalPaidForEmployee > Number(payroll.final_salary);
  }).length;
  
  const pendingEmployees = payrollData.length - paidEmployees;
  
  const summary = {
    totalPaid: paidEmployees,
    totalPending: pendingEmployees,
    totalOverpaid: overpaidEmployees,
    paidAmount: totalPaid,
    pendingAmount: Math.max(0, remainingBalance),
    overpaidAmount: Math.abs(Math.min(0, remainingBalance)),
    remainingBalance: remainingBalance,
  };
  
  return <>{children({ summary, allPayments })}</>;
};

// Component to display combined payment history by date
const CombinedPaymentHistoryByDate = ({ payments }: { payments: any[] }) => {
  // Group payments by date
  const paymentsByDate = payments.reduce((acc: any, payment: any) => {
    const date = payment.payment_date;
    if (!acc[date]) {
      acc[date] = [];
    }
    acc[date].push(payment);
    return acc;
  }, {});
  
  // Calculate total paid per date
  const dateTotals: Record<string, number> = {};
  Object.entries(paymentsByDate).forEach(([date, datePayments]: [string, any[]]) => {
    dateTotals[date] = datePayments.reduce((sum, p) => sum + Number(p.amount), 0);
  });
  
  // Calculate overall total
  const overallTotal = Object.values(dateTotals).reduce((sum, amount) => sum + amount, 0);
  
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        {Object.entries(dateTotals)
          .sort(([dateA], [dateB]) => new Date(dateB).getTime() - new Date(dateA).getTime())
          .map(([date, amount]) => (
            <div key={date} className="flex justify-between items-center bg-background rounded-md p-3 shadow-sm border border-border">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">
                  {new Date(date).toLocaleDateString('en-US', { 
                    weekday: 'short', 
                    month: 'short', 
                    day: 'numeric' 
                  })}
                </span>
              </div>
              <span className="font-bold text-success">
                PKR {amount.toLocaleString()}
              </span>
            </div>
          ))}
      </div>
      <div className="pt-3 border-t border-border flex justify-between font-semibold bg-muted/30 rounded px-3 py-2">
        <span>Total Combined Payments:</span>
        <span className="text-success font-bold">PKR {overallTotal.toLocaleString()}</span>
      </div>
    </div>
  );
};

// Component to display payroll row with real-time database payment data in Reports
const ReportsPayrollRow = memo(({ payroll, allPayments }: { payroll: any; allPayments: any[] }) => {
  const payments = allPayments.filter(p => p.payroll_id === payroll.id);
  const totalPaid = payments.reduce((sum: number, payment: any) => sum + Number(payment.amount || 0), 0);
  // Calculate accurately without rounding final_salary first
  const finalSalary = Number(payroll.final_salary || 0);
  const remainingBalance = finalSalary - totalPaid;
  // Floor the remaining balance for display (discard decimal amount)
  const remainingBalanceDisplay = Math.floor(Math.max(0, remainingBalance));
  
  // Group payments by date
  const paymentsByDate = payments.reduce((acc: any, payment: any) => {
    const date = payment.payment_date;
    if (!acc[date]) {
      acc[date] = [];
    }
    acc[date].push(payment);
    return acc;
  }, {});
  
  return (
    <motion.div
      key={payroll.id}
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: 0.05 }}
      className="bg-background border border-border rounded-xl shadow-sm hover:shadow-md transition-shadow duration-200"
    >
      <div className="p-4 border-b border-border/50 bg-muted/20 rounded-t-xl">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-bold text-lg">{payroll.employees?.name}</h3>
            <p className="text-sm text-muted-foreground flex items-center gap-1">
              <Users className="h-3 w-3" />
              {payroll.employees?.employee_id} • {payroll.employees?.department}
            </p>
          </div>
          <Badge variant={remainingBalanceDisplay === 0 ? "default" : remainingBalance < 0 ? "destructive" : "secondary"} className="text-xs py-1 px-2">
            {remainingBalanceDisplay === 0 ? "Paid" : remainingBalance < 0 ? "Overpaid" : "Pending"}
          </Badge>
        </div>
      </div>
      <div className="p-4">
        <div className="grid grid-cols-2 md:grid-cols-6 gap-3 text-sm">
          <div className="bg-muted/30 p-3 rounded-lg">
            <div className="text-muted-foreground text-xs">Base Salary</div>
            <div className="font-semibold">PKR {Math.round(Number(payroll.base_salary)).toLocaleString()}</div>
          </div>
          <div className="bg-muted/30 p-3 rounded-lg">
            <div className="text-muted-foreground text-xs">Present Days</div>
            <div className="font-semibold text-success">{payroll.present_days}</div>
          </div>
          {payroll.overtime_pay > 0 && (
            <div className="bg-muted/30 p-3 rounded-lg">
              <div className="text-muted-foreground text-xs">Overtime</div>
              <div className="font-semibold text-success">+PKR {Math.round(Number(payroll.overtime_pay)).toLocaleString()}</div>
            </div>
          )}
          {payroll.absence_deduction > 0 && (
            <div className="bg-muted/30 p-3 rounded-lg">
              <div className="text-muted-foreground text-xs">Deductions</div>
              <div className="font-semibold text-destructive">-PKR {Math.round(Number(payroll.absence_deduction)).toLocaleString()}</div>
            </div>
          )}
          <div className="bg-primary/10 p-3 rounded-lg">
            <div className="text-muted-foreground text-xs">Final Salary</div>
            <div className="font-bold text-primary">PKR {Math.round(Number(payroll.final_salary)).toLocaleString()}</div>
          </div>
          <div className="bg-success/10 p-3 rounded-lg">
            <div className="text-muted-foreground text-xs">Total Paid</div>
            <div className="font-semibold text-success">PKR {totalPaid.toLocaleString()}</div>
          </div>
          <div className="bg-warning/10 p-3 rounded-lg">
            <div className="text-muted-foreground text-xs">Remaining</div>
            <div className={`font-bold ${remainingBalanceDisplay === 0 ? 'text-success' : remainingBalance < 0 ? 'text-destructive' : 'text-warning'}`}>
              PKR {remainingBalanceDisplay.toLocaleString()}
            </div>
          </div>
        </div>
      </div>
      
      {/* Payment breakdown by date */}
      {payments.length > 0 && (
        <div className="mt-4 pt-4 border-t border-border bg-muted/20 rounded p-3 mx-4 mb-4">
          <h4 className="text-sm font-semibold mb-3 text-primary">Payment History</h4>
          <div className="space-y-2">
            {Object.entries(paymentsByDate)
              .sort(([dateA], [dateB]) => new Date(dateB).getTime() - new Date(dateA).getTime())
              .map(([date, datePayments]: [string, any[]]) => {
                const totalAmount = datePayments.reduce((sum, p) => sum + Number(p.amount), 0);
                return (
                  <div key={date} className="flex justify-between items-center bg-background rounded-md p-2 shadow-sm">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm font-medium">
                        {new Date(date).toLocaleDateString('en-US', { 
                          weekday: 'short', 
                          month: 'short', 
                          day: 'numeric' 
                        })}
                      </span>
                    </div>
                    <span className="font-bold text-success">
                      PKR {totalAmount.toLocaleString()}
                    </span>
                  </div>
                );
              })}
          </div>
          <div className="mt-3 pt-3 border-t border-border flex justify-between font-semibold bg-muted/30 rounded px-3 py-2">
            <span>Total Payments:</span>
            <span className="text-success font-bold">PKR {totalPaid.toLocaleString()}</span>
          </div>
        </div>
      )}
    </motion.div>
  );
});

export default function Reports() {
  const currentMonth = new Date().getMonth() + 1;
  const currentYear = new Date().getFullYear();
  const [selectedMonth, setSelectedMonth] = useState(currentMonth);
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [selectedEmployees, setSelectedEmployees] = useState<string[]>(["all"]);
  const [selectedDepartments, setSelectedDepartments] = useState<string[]>(["all"]);
  
  const { data: payrollData = [] } = useMonthlyPayroll(selectedMonth, selectedYear);
  const { data: employees = [] } = useEmployees();
  const updatePayrollStatus = useUpdatePayrollStatus();

  const EmployeePicker = ({ value, onChange }: { value: string; onChange: (v: string) => void }) => {
    const [open, setOpen] = useState(false);
    const selected = value === "all" ? null : employees.find(e => e.id === value);
    return (
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button variant="outline" className="mt-3 justify-between gap-3 w-full">
            <span>
              {selected ? `${selected.name} (${selected.employee_id})` : "All Employees"}
            </span>
            <span className="text-xs text-muted-foreground">Change</span>
          </Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Select Employee</DialogTitle>
          </DialogHeader>
          <Command>
            <CommandInput placeholder="Search name, ID, department, CNIC..." />
            <CommandList>
              <CommandEmpty>No employee found.</CommandEmpty>
              <CommandGroup heading="Options">
                <CommandItem
                  onSelect={() => { onChange("all"); setOpen(false); }}
                >
                  All Employees
                </CommandItem>
              </CommandGroup>
              <CommandGroup heading="Employees">
                {employees.map(emp => (
                  <CommandItem
                    key={emp.id}
                    value={`${emp.name} ${emp.employee_id} ${emp.department} ${emp.cnic}`}
                    onSelect={() => { onChange(emp.id); setOpen(false); }}
                  >
                    <div className="flex justify-between w-full">
                      <span>{emp.name} ({emp.employee_id})</span>
                      <span className="text-xs text-muted-foreground">{emp.department}</span>
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </DialogContent>
      </Dialog>
    );
  };

  // Get attendance data for selected employees
  const employeeForAttendance = selectedEmployees.length === 1 && selectedEmployees[0] !== "all" 
    ? employees.find(e => e.id === selectedEmployees[0])
    : undefined;
  
  const { data: attendanceData = [] } = useEmployeeAttendance(
    selectedEmployees.length === 1 && selectedEmployees[0] !== "all" ? selectedEmployees[0] : "",
    selectedMonth,
    selectedYear
  );

  // Calculate statistics
  const totalEmployees = employees.length;
  const activeEmployees = employees.filter(e => e.is_active).length;
  
  const totalPayroll = Math.round(payrollData.reduce((sum, p) => sum + Number(p.final_salary), 0));
  const totalDeductions = Math.round(payrollData.reduce((sum, p) => sum + Number(p.absence_deduction), 0));
  const totalOvertime = Math.round(payrollData.reduce((sum, p) => sum + Number(p.overtime_pay || 0), 0));
  
  const avgSalary = payrollData.length > 0 ? Math.round(totalPayroll / payrollData.length) : 0;
  
  // Department-wise statistics
  const deptStats = employees.reduce((acc: any, emp) => {
    if (!emp.is_active) return acc;
    if (!acc[emp.department]) {
      acc[emp.department] = { count: 0, totalSalary: 0 };
    }
    acc[emp.department].count++;
    acc[emp.department].totalSalary += Math.round(Number(emp.base_salary));
    return acc;
  }, {});

  // Attendance summary
  const attendanceSummary = {
    totalPresent: payrollData.reduce((sum, p) => sum + p.present_days, 0),
    totalAbsent: payrollData.reduce((sum, p) => sum + p.absent_days, 0),
    totalLeave: payrollData.reduce((sum, p) => sum + p.leave_days, 0),
    totalHoliday: payrollData.reduce((sum, p) => sum + p.holiday_days, 0),
  };

  // Payment status summary - This will be calculated dynamically in the UI components
  // since we need real-time payment data from the payments table
  const paymentSummary = {
    totalPaid: 0, // Will be calculated by components using usePayrollPayments
    totalPending: 0, // Will be calculated by components using usePayrollPayments
    paidAmount: 0, // Will be calculated by components using usePayrollPayments
    pendingAmount: 0, // Will be calculated by components using usePayrollPayments
    remainingBalance: 0, // Will be calculated by components using usePayrollPayments
  };

  const monthName = new Date(selectedYear, selectedMonth - 1).toLocaleDateString("en-US", { 
    month: "long", 
    year: "numeric" 
  });

  // Get unique departments
  const departments = Array.from(new Set(employees.map(e => e.department)));

  // Convert departments to options format for MultiSelect
  const departmentOptions = departments.map(dept => ({
    value: dept,
    label: dept
  }));

  // Convert employees to options format for MultiSelect
  const employeeOptions = employees.map(emp => ({
    value: emp.id,
    label: `${emp.name} (${emp.employee_id})`
  }));

  // Filter payroll data for multiple selections
  const filteredPayrollData = payrollData.filter((p: any) => {
    // Check employee filter
    const employeeMatch = selectedEmployees.includes("all") || 
                          selectedEmployees.includes(p.employee_id);
    
    // Check department filter
    const departmentMatch = selectedDepartments.includes("all") || 
                            selectedDepartments.includes(p.employees?.department);
    
    return employeeMatch && departmentMatch;
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20 p-4 sm:p-6 pt-16 sm:pt-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-4 sm:mb-6"
      >
        <h1 className="text-2xl sm:text-3xl font-bold mb-1">Reports & Analytics</h1>
        <p className="text-muted-foreground text-sm sm:text-base">Comprehensive payroll and attendance insights</p>
        
        <div className="flex flex-col sm:flex-row gap-3 mt-4">
          <div className="space-y-1 w-full sm:w-auto">
            <Label className="text-xs sm:text-sm">Month</Label>
            <Select value={selectedMonth.toString()} onValueChange={(v) => setSelectedMonth(Number(v))}>
              <SelectTrigger className="w-full sm:w-36">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Array.from({ length: 12 }, (_, i) => (
                  <SelectItem key={i + 1} value={(i + 1).toString()}>
                    {new Date(2000, i).toLocaleDateString("en-US", { month: "long" })}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div className="space-y-1 w-full sm:w-auto">
            <Label className="text-xs sm:text-sm">Year</Label>
            <Select value={selectedYear.toString()} onValueChange={(v) => setSelectedYear(Number(v))}>
              <SelectTrigger className="w-full sm:w-28">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Array.from({ length: 5 }, (_, i) => {
                  const year = currentYear - 2 + i;
                  return (
                    <SelectItem key={year} value={year.toString()}>
                      {year}
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>
        </div>
      </motion.div>

      {/* Print Reports Section */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
        <Card className="shadow-soft border-0 mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Generate Print Reports
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="salary" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="salary">Salary Report</TabsTrigger>
                <TabsTrigger value="attendance">Attendance Report</TabsTrigger>
              </TabsList>
              
              <TabsContent value="salary" className="space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs sm:text-sm">Select Employees</Label>
                    <MultiSelect
                      options={[{ value: 'all', label: 'All Employees' }, ...employeeOptions]}
                      selected={selectedEmployees}
                      onChange={setSelectedEmployees}
                      placeholder="Select employees..."
                    />
                  </div>
                  
                  <div className="space-y-1">
                    <Label className="text-xs sm:text-sm">Select Departments</Label>
                    <MultiSelect
                      options={[{ value: 'all', label: 'All Departments' }, ...departmentOptions]}
                      selected={selectedDepartments}
                      onChange={setSelectedDepartments}
                      placeholder="Select departments..."
                    />
                  </div>
                </div>

                <Dialog>
                  <DialogTrigger asChild>
                    <Button className="w-full bg-gradient-primary gap-2 print:hidden">
                      <FileText className="h-4 w-4" />
                      Generate Salary Report
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-7xl max-h-[90vh] overflow-y-auto print:max-w-full print:max-h-full print:overflow-visible print:p-0 print:m-0 print:border-0 print:fixed print:inset-0 print:overflow-auto print:z-[9999] print:shadow-none print:transform-none print:translate-x-0 print:translate-y-0 print:w-full print:h-full print-dialog-content">
                    <DialogHeader className="print:hidden">
                      <DialogTitle>Salary Report</DialogTitle>
                    </DialogHeader>
                    <div className="print:p-0 print:min-h-screen print:bg-white print:scale-100 print:transform-none print:w-full light-theme-container bg-white text-gray-900">
                      <div className="p-6 bg-white">
                        <LedgerSalaryReport
                          payrollData={filteredPayrollData}
                          month={selectedMonth}
                          year={selectedYear}
                          department={selectedDepartments.length === 1 && selectedDepartments[0] !== "all" ? selectedDepartments[0] : undefined}
                          title={selectedEmployees.length === 1 && selectedEmployees[0] !== "all" && !selectedEmployees.includes("all") ? "Individual Ledger Report" : "Ledger Salary Report"}
                        />
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>

              </TabsContent>
              
              <TabsContent value="attendance" className="space-y-3">
                <div className="grid md:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label>Select Employees</Label>
                    <MultiSelect
                      options={[{ value: 'all', label: 'All Employees' }, ...employeeOptions]}
                      selected={selectedEmployees}
                      onChange={setSelectedEmployees}
                      placeholder="Select employees..."
                    />
                  </div>
                  
                  <div className="space-y-1">
                    <Label>Select Departments</Label>
                    <MultiSelect
                      options={[{ value: 'all', label: 'All Departments' }, ...departmentOptions]}
                      selected={selectedDepartments}
                      onChange={setSelectedDepartments}
                      placeholder="Select departments..."
                    />
                  </div>
                </div>

                <Dialog>
                  <DialogTrigger asChild>
                    <Button className="w-full bg-gradient-primary gap-2 print:hidden">
                      <Calendar className="h-4 w-4" />
                      Generate Attendance Report
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-7xl max-h-[90vh] overflow-y-auto print:max-w-full print:max-h-full print:overflow-visible print:p-0 print:m-0 print:border-0 print:fixed print:inset-0 print:overflow-auto print:z-[9999] print:shadow-none print:transform-none print:translate-x-0 print:translate-y-0 print-dialog-content print:break-inside-avoid">
                    <DialogHeader className="print:hidden">
                      <DialogTitle>Attendance Report</DialogTitle>
                    </DialogHeader>
                    <div className="print:p-0 print:min-h-screen print:bg-white print:scale-100 print:transform-none print:w-full print:overflow-visible light-theme-container bg-white text-gray-900">
                      <div className="p-6 bg-white">
                        <LedgerAttendanceReport
                          employee={employeeForAttendance}
                          month={selectedMonth}
                          year={selectedYear}
                          department={selectedDepartments.length === 1 && selectedDepartments[0] !== "all" ? selectedDepartments[0] : undefined}
                          selectedEmployees={selectedEmployees}
                          selectedDepartments={selectedDepartments}
                        />
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </motion.div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6 print:hidden">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <Card className="shadow-soft border-0 hover:shadow-strong hover:scale-105 transition-all duration-300 cursor-pointer group">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium group-hover:text-foreground transition-colors duration-300">Total Employees</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground group-hover:scale-110 transition-transform duration-300" />
            </CardHeader>
            <CardContent>
              <div className="text-xl font-bold group-hover:scale-105 transition-transform duration-300">{activeEmployees}</div>
              <p className="text-xs text-muted-foreground group-hover:text-foreground transition-colors duration-300">
                {totalEmployees - activeEmployees} inactive
              </p>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
          <Card className="shadow-soft border-0 hover:shadow-strong hover:scale-105 transition-all duration-300 cursor-pointer group">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium group-hover:text-foreground transition-colors duration-300">Total Payroll</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground group-hover:scale-110 transition-transform duration-300" />
            </CardHeader>
            <CardContent className="print:p-2">
              <div className="text-xl font-bold group-hover:scale-105 transition-transform duration-300">PKR {totalPayroll.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground group-hover:text-foreground transition-colors duration-300">
                {monthName}
              </p>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
          <Card className="shadow-soft border-0 hover:shadow-strong hover:scale-105 transition-all duration-300 cursor-pointer group">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium group-hover:text-foreground transition-colors duration-300">Avg Salary</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground group-hover:scale-110 transition-transform duration-300" />
            </CardHeader>
            <CardContent className="print:p-2">
              <div className="text-xl font-bold group-hover:scale-105 transition-transform duration-300">PKR {avgSalary.toLocaleString(undefined, { maximumFractionDigits: 0 })}</div>
              <p className="text-xs text-muted-foreground group-hover:text-foreground transition-colors duration-300">
                Per employee
              </p>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}>
          <Card className="shadow-soft border-0 hover:shadow-strong hover:scale-105 transition-all duration-300 cursor-pointer group">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium group-hover:text-foreground transition-colors duration-300">Total Overtime</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground group-hover:scale-110 transition-transform duration-300" />
            </CardHeader>
            <CardContent className="print:p-2">
              <div className="text-xl font-bold text-success group-hover:scale-105 transition-transform duration-300">PKR {totalOvertime.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground group-hover:text-foreground transition-colors duration-300">
                Extra hours pay
              </p>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Department Statistics */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }} className="print:hidden">
        <Card className="shadow-soft border-0 mb-6 hover:shadow-strong transition-all duration-300 print:rounded-none">
          <CardHeader className="print:p-3">
            <CardTitle className="print:text-lg">Department-wise Statistics</CardTitle>
          </CardHeader>
          <CardContent className="print:p-3">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 print:gap-2">
              {Object.entries(deptStats).map(([dept, stats]: [string, any]) => (
                <div key={dept} className="bg-muted/30 p-3 rounded-lg hover:bg-muted/50 hover:scale-105 transition-all duration-300 cursor-pointer group print:bg-white print:border">
                  <div className="flex items-center justify-between mb-1 print:mb-0.5">
                    <h3 className="font-semibold group-hover:text-primary transition-colors duration-300 print:text-sm">{dept}</h3>
                    <Badge variant="secondary" className="group-hover:scale-105 transition-transform duration-300 print:px-1 print:py-0.5">{stats.count} employees</Badge>
                  </div>
                  <div className="text-sm text-muted-foreground group-hover:text-foreground transition-colors duration-300">
                    Total Salary: <span className="font-semibold text-foreground group-hover:text-primary transition-colors duration-300">PKR {stats.totalSalary.toLocaleString()}</span>
                  </div>
                  <div className="text-sm text-muted-foreground group-hover:text-foreground transition-colors duration-300">
                    Avg: <span className="font-semibold text-foreground group-hover:text-primary transition-colors duration-300">PKR {(stats.totalSalary / stats.count).toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Attendance Summary */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }} className="print:hidden">
        <Card className="shadow-soft border-0 mb-6 print:rounded-none">
          <CardHeader className="print:p-3">
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Attendance Summary - {monthName}
            </CardTitle>
          </CardHeader>
          <CardContent className="print:p-3">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 print:gap-2">
              <div className="bg-success/10 p-3 rounded-lg text-center print:bg-white print:border">
                <div className="text-2xl font-bold text-success print:text-xl">{attendanceSummary.totalPresent}</div>
                <div className="text-xs text-muted-foreground mt-1">Total Present Days</div>
              </div>
              <div className="bg-destructive/10 p-3 rounded-lg text-center print:bg-white print:border">
                <div className="text-2xl font-bold text-destructive print:text-xl">{attendanceSummary.totalAbsent}</div>
                <div className="text-xs text-muted-foreground mt-1">Total Absent Days</div>
              </div>
              <div className="bg-warning/10 p-3 rounded-lg text-center print:bg-white print:border">
                <div className="text-2xl font-bold text-warning print:text-xl">{attendanceSummary.totalLeave}</div>
                <div className="text-xs text-muted-foreground mt-1">Total Leave Days</div>
              </div>
              <div className="bg-info/10 p-3 rounded-lg text-center print:bg-white print:border">
                <div className="text-2xl font-bold text-info print:text-xl">{attendanceSummary.totalHoliday}</div>
                <div className="text-xs text-muted-foreground mt-1">Total Holidays</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Payment Status Summary */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.7 }} className="print:hidden">
        <PaymentSummaryCalculator payrollData={payrollData} month={selectedMonth} year={selectedYear}>
          {({ summary: realTimePaymentSummary, allPayments }) => (
            <>
              <Card className="shadow-soft border-0 mb-6 print:rounded-none">
              <CardHeader className="print:p-3">
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4" />
                    Payment Status - {monthName}
                  </div>
                  {realTimePaymentSummary.totalPending > 0 && (
                    <Button 
                      variant="outline" 
                      size="sm"
                      className="gap-2 text-success border-success hover:bg-success hover:text-white print:hidden"
                      onClick={() => {
                        // Only set status=paid for employees whose remaining balance is zero
                        const eligible = payrollData.filter((p: any) => {
                          const payments = allPayments.filter(payment => payment.payroll_id === p.id);
                          const totalPaid = payments.reduce((sum, payment) => sum + Number(payment.amount), 0);
                          return totalPaid >= Math.round(Number(p.final_salary || 0)) && p.status !== "paid";
                        });
                        if (eligible.length === 0) {
                          alert("No fully-paid employees eligible to mark as PAID.");
                          return;
                        }
                        if (confirm(`Mark ${eligible.length} fully-paid employee(s) as PAID?`)) {
                          eligible.forEach((payroll: any) => {
                            updatePayrollStatus.mutateAsync({
                              payrollId: payroll.id,
                              status: "paid"
                            });
                          });
                        }
                      }}
                    >
                      <CheckCircle className="h-3 w-3" />
                      Mark All as Paid
                    </Button>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="print:p-3">
                <div className="grid grid-cols-2 md:grid-cols-5 gap-3 print:gap-2">
                  <div className="bg-success/10 p-3 rounded-lg text-center print:bg-white print:border">
                    <div className="text-2xl font-bold text-success print:text-xl">{realTimePaymentSummary.totalPaid}</div>
                    <div className="text-xs text-muted-foreground mt-1">Paid Employees</div>
                    <div className="text-[9px] text-muted-foreground mt-1 print:text-[8px]">PKR {realTimePaymentSummary.paidAmount.toLocaleString()}</div>
                  </div>
                  <div className="bg-warning/10 p-3 rounded-lg text-center print:bg-white print:border">
                    <div className="text-2xl font-bold text-warning print:text-xl">{realTimePaymentSummary.totalPending}</div>
                    <div className="text-xs text-muted-foreground mt-1">Pending Payments</div>
                    <div className="text-[9px] text-muted-foreground mt-1 print:text-[8px]">PKR {realTimePaymentSummary.pendingAmount.toLocaleString()}</div>
                    <div className="text-[9px] text-warning font-semibold mt-1 print:text-[8px]">Remaining Balance</div>
                  </div>
                  {realTimePaymentSummary.totalOverpaid > 0 && (
                    <div className="bg-destructive/10 p-3 rounded-lg text-center print:bg-white print:border">
                      <div className="text-2xl font-bold text-destructive print:text-xl">{realTimePaymentSummary.totalOverpaid}</div>
                      <div className="text-xs text-muted-foreground mt-1">Overpaid Employees</div>
                      <div className="text-[9px] text-muted-foreground mt-1 print:text-[8px]">PKR {realTimePaymentSummary.overpaidAmount.toLocaleString()}</div>
                      <div className="text-[9px] text-destructive font-semibold mt-1 print:text-[8px]">Overpaid Amount</div>
                    </div>
                  )}
                  <div className="bg-primary/10 p-3 rounded-lg text-center print:bg-white print:border">
                    <div className="text-2xl font-bold text-primary print:text-xl">{realTimePaymentSummary.totalPaid + realTimePaymentSummary.totalPending + (realTimePaymentSummary.totalOverpaid || 0)}</div>
                    <div className="text-xs text-muted-foreground mt-1">Total Employees</div>
                    <div className="text-[9px] text-muted-foreground mt-1 print:text-[8px]">PKR {(realTimePaymentSummary.paidAmount + realTimePaymentSummary.pendingAmount).toLocaleString()}</div>
                  </div>
                  <div className="bg-info/10 p-3 rounded-lg text-center print:bg-white print:border">
                    <div className="text-2xl font-bold text-info print:text-xl">
                      {realTimePaymentSummary.totalPaid + realTimePaymentSummary.totalPending + (realTimePaymentSummary.totalOverpaid || 0) > 0 
                        ? Math.round((realTimePaymentSummary.totalPaid / (realTimePaymentSummary.totalPaid + realTimePaymentSummary.totalPending + (realTimePaymentSummary.totalOverpaid || 0))) * 100)
                        : 0}%
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">Payment Rate</div>
                    <div className="text-xs text-muted-foreground mt-1 print:text-[8px]">Completion</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Combined Department Payment History by Date */}
            {allPayments.length > 0 && (
              <Card className="shadow-soft border-0 mb-6 print:rounded-none">
                <CardHeader className="print:p-3">
                  <CardTitle className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-primary" />
                    Combined Payment History - {monthName}
                  </CardTitle>
                </CardHeader>
                <CardContent className="print:p-3">
                  <CombinedPaymentHistoryByDate payments={allPayments} />
                </CardContent>
              </Card>
            )}

            {/* Payroll Breakdown */}
            <Card className="shadow-soft border-0 bg-gradient-to-br from-background to-muted/10 print:rounded-none print:bg-white">
              <CardHeader className="border-b border-border/50 print:p-3 print:border-b">
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="h-4 w-4 text-primary" />
                  Payroll Breakdown - {monthName}
                </CardTitle>
              </CardHeader>
              <CardContent className="py-4 print:p-3">
                <div className="space-y-4 print:space-y-2">
                  {payrollData.map((payroll: any, index) => (
                    <ReportsPayrollRow key={payroll.id} payroll={payroll} allPayments={allPayments} />
                  ))}
                  
                  {payrollData.length === 0 && (
                    <div className="text-center py-8 text-muted-foreground bg-muted/20 rounded-lg print:py-4">
                      <FileText className="h-10 w-10 mx-auto text-muted-foreground/30 mb-2 print:h-8 print:w-8" />
                      <p className="text-base print:text-sm">No payroll data available for {monthName}</p>
                      <p className="text-xs mt-1">Try selecting a different month or year</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </>
          )}
        </PaymentSummaryCalculator>
      </motion.div>

    </div>
  );
}