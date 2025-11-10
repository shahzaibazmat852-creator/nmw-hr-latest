import { motion } from "framer-motion";
import { DollarSign, Users, Building2, Printer, TrendingUp, TrendingDown, FileText } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { usePayrollPayments } from "@/hooks/usePayroll";

// Version: Floor display fix - remaining balance shows floored value (discards decimal)

// Component to display payment status badge based on database payments
const PaymentStatusBadge = ({ payrollId, finalSalary }: { payrollId: string; finalSalary: number }) => {
  const { data: payments = [] } = usePayrollPayments(payrollId);
  const totalPaid = payments.reduce((sum: number, payment: any) => sum + Number(payment.amount || 0), 0);
  // Calculate accurately without rounding final_salary first
  const remainingBalance = Number(finalSalary) - totalPaid;
  // Floor the remaining balance for display (discard decimal amount)
  const remainingBalanceDisplay = Math.floor(Math.max(0, remainingBalance));
  
  return (
    <Badge className={
      remainingBalanceDisplay === 0 
        ? "bg-success/10 text-success border-success/20" 
        : "bg-warning/10 text-warning border-warning/20"
    }>
      {remainingBalanceDisplay === 0 ? "Paid" : "Pending"}
    </Badge>
  );
};

// Component to display payment data for table rows
const PaymentDataCell = ({ payrollId, finalSalary }: { payrollId: string; finalSalary: number }) => {
  const { data: payments = [] } = usePayrollPayments(payrollId);
  const totalPaid = payments.reduce((sum: number, payment: any) => sum + Number(payment.amount || 0), 0);
  // Calculate accurately without rounding final_salary first
  const remainingBalance = Number(finalSalary) - totalPaid;
  // Floor the remaining balance for display (discard decimal amount)
  const remainingBalanceDisplay = Math.floor(Math.max(0, remainingBalance));
  
  return (
    <>
      <td className="p-3 text-right text-success font-medium">
        {totalPaid.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
      </td>
      <td className="p-3 text-right font-medium">
        <span className={remainingBalanceDisplay === 0 ? 'text-success' : 'text-warning'}>
          {remainingBalanceDisplay.toLocaleString()}
        </span>
      </td>
    </>
  );
};

// Component to display payment details by date
const PaymentDetailsByDate = ({ payrollId }: { payrollId: string }) => {
  const { data: payments = [] } = usePayrollPayments(payrollId);
  
  if (payments.length === 0) {
    return (
      <div className="text-xs text-muted-foreground italic print:text-gray-500">
        No payments recorded
      </div>
    );
  }
  
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
  
  return (
    <div className="mt-2 text-xs print:text-[8px]">
      <div className="font-semibold text-muted-foreground mb-1 print:text-gray-600">Payment History:</div>
      <div className="space-y-1">
        {Object.entries(dateTotals)
          .sort(([dateA], [dateB]) => new Date(dateB).getTime() - new Date(dateA).getTime())
          .map(([date, amount]) => (
            <div key={date} className="flex justify-between print:justify-between">
              <span className="text-muted-foreground print:text-gray-500">
                {new Date(date).toLocaleDateString()}
              </span>
              <span className="font-medium">PKR {amount.toLocaleString()}</span>
            </div>
          ))}
      </div>
      <div className="flex justify-between font-semibold mt-1 pt-1 border-t border-border print:border-gray-300 print:mt-1 print:pt-1">
        <span>Total Paid:</span>
        <span>PKR {payments.reduce((sum, p) => sum + Number(p.amount), 0).toLocaleString()}</span>
      </div>
    </div>
  );
};

// Component to calculate department subtotals including payment data
const DepartmentSubtotal = ({ records, dept }: { records: PayrollRecord[]; dept: string }) => {
  const deptTotal = records.reduce((sum, r) => sum + Number(r.final_salary), 0);
  
  // Calculate total paid amount for this department
  let totalPaidForDept = 0;
  let totalRemainingForDept = 0;
  
  records.forEach(record => {
    const { data: payments = [] } = usePayrollPayments(record.id);
    const totalPaid = payments.reduce((sum: number, payment: any) => sum + Number(payment.amount || 0), 0);
    totalPaidForDept += totalPaid;
    // Calculate accurately without rounding final_salary first
    const remaining = Number(record.final_salary) - totalPaid;
    // Floor the remaining balance for display (discard decimal amount)
    totalRemainingForDept += Math.floor(Math.max(0, remaining));
  });
  
  return (
    <tr className="bg-muted/50 dark:bg-muted/80 font-bold">
      <td colSpan={7} className="p-3 text-right">Subtotal ({dept}):</td>
      <td className="p-3 text-right text-lg">PKR {deptTotal.toLocaleString()}</td>
      <td className="p-3 text-right text-success font-medium">PKR {totalPaidForDept.toLocaleString()}</td>
      <td className="p-3 text-right font-medium">
        <span className={totalRemainingForDept === 0 ? 'text-success' : 'text-warning'}>
          PKR {totalRemainingForDept.toLocaleString()}
        </span>
      </td>
      <td className="p-3 text-left"></td>
      <td className="p-3 text-center">
        <Badge className={totalRemainingForDept === 0 ? "bg-success/10 text-success" : "bg-warning/10 text-warning"}>
          {totalRemainingForDept === 0 ? "Fully Paid" : "Pending"}
        </Badge>
      </td>
    </tr>
  );
};

// Component to calculate comprehensive payment summary for the entire report
const PaymentSummaryCalculator = ({ payrollData, children }: { 
  payrollData: PayrollRecord[]; 
  children: (summary: {
    totalPaidAmount: number;
    totalRemainingBalance: number;
    paymentCompletionRate: number;
  }) => React.ReactNode;
}) => {
  // Calculate total paid amount across all payroll records
  let totalPaidAmount = 0;
  let totalRemainingBalance = 0;
  
  payrollData.forEach(record => {
    const { data: payments = [] } = usePayrollPayments(record.id);
    const totalPaid = payments.reduce((sum: number, payment: any) => sum + Number(payment.amount || 0), 0);
    totalPaidAmount += totalPaid;
    // Calculate accurately without rounding final_salary first
    const remaining = Number(record.final_salary) - totalPaid;
    // Floor the remaining balance for display (discard decimal amount)
    totalRemainingBalance += Math.floor(Math.max(0, remaining));
  });
  
  const totalFinalSalary = payrollData.reduce((sum, p) => sum + Number(p.final_salary), 0);
  const paymentCompletionRate = totalFinalSalary > 0 ? Math.round((totalPaidAmount / totalFinalSalary) * 100) : 0;
  
  const summary = {
    totalPaidAmount,
    totalRemainingBalance,
    paymentCompletionRate
  };
  
  return <>{children(summary)}</>;
};

// Component to calculate total payments across all payroll records
const TotalPaymentsSummary = ({ payrollData }: { payrollData: PayrollRecord[] }) => {
  const payrollIds = payrollData.map(p => p.id);
  const totalPaid = payrollIds.reduce((sum, payrollId) => {
    // This is a simplified approach - in a real app you might want to batch these queries
    return sum; // We'll calculate this differently
  }, 0);
  
  return null; // This will be replaced with actual calculation
};

interface PayrollRecord {
  id: string;
  employee_id: string;
  month: number;
  year: number;
  base_salary: number;
  present_days: number;
  absent_days: number;
  leave_days: number;
  holiday_days: number;
  overtime_hours: number;
  overtime_pay: number;
  absence_deduction: number;
  advance_amount: number;
  final_salary: number;
  status: string;
  employees: {
    name: string;
    employee_id: string;
    department: string;
    cnic: string;
  };
}

interface SalaryReportCardProps {
  payrollData: PayrollRecord[];
  month: number;
  year: number;
  department?: string;
  title?: string;
}

const monthNames = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

const departmentColors: Record<string, string> = {
  Enamel: "bg-primary/10 text-primary border-primary/20",
  Workshop: "bg-accent/10 text-accent border-accent/20",
  Guards: "bg-info/10 text-info border-info/20",
  Cooks: "bg-warning/10 text-warning border-warning/20",
  Admins: "bg-success/10 text-success border-success/20",
  Directors: "bg-destructive/10 text-destructive border-destructive/20",
  Accounts: "bg-purple-500/10 text-purple-500 border-purple-500/20",
};

export default function SalaryReportCard({ 
  payrollData, 
  month, 
  year,
  department,
  title = "Salary Report"
}: SalaryReportCardProps) {
  // Calculate comprehensive totals including payment data
  const totalEmployees = payrollData.length;
  const totalBaseSalary = payrollData.reduce((sum, p) => sum + Number(p.base_salary), 0);
  const totalOvertime = payrollData.reduce((sum, p) => sum + Number(p.overtime_pay || 0), 0);
  const totalDeductions = payrollData.reduce((sum, p) => 
    sum + Number(p.absence_deduction || 0) + Number(p.advance_amount || 0), 0
  );
  const totalFinalSalary = payrollData.reduce((sum, p) => sum + Number(p.final_salary), 0);
  
  // Group by department if not filtered
  const departmentGroups = department 
    ? { [department]: payrollData }
    : payrollData.reduce((acc, record) => {
        const dept = record.employees.department;
        if (!acc[dept]) acc[dept] = [];
        acc[dept].push(record);
        return acc;
      }, {} as Record<string, PayrollRecord[]>);

  const handlePrint = () => {
    window.print();
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="max-w-7xl mx-auto print:max-w-full print:scale-100 print:transform-none"
    >
      <Card className="shadow-strong border-0 overflow-hidden print:shadow-none print:border print:border-gray-300 print:overflow-visible print:bg-white">
        {/* Header */}
        <div className="bg-gradient-hero text-white dark:text-white p-8 relative overflow-hidden print:bg-white print:text-black print:p-4 print:overflow-visible print:border-b print:border-gray-300">
          <div className="absolute inset-0 opacity-10 dark:opacity-20 print:hidden">
            <div className="absolute -right-10 -top-10 w-40 h-40 bg-white dark:bg-white/30 rounded-full" />
            <div className="absolute -left-10 -bottom-10 w-32 h-32 bg-white dark:bg-white/30 rounded-full" />
          </div>
          <div className="relative z-10">
            <h1 className="text-3xl font-bold mb-2 text-white dark:text-white print:text-black print:text-2xl print:mb-1">NMW {title}</h1>
            <p className="text-white/90 dark:text-white/90 print:text-gray-700 print:text-base">{monthNames[month - 1]} {year}</p>
            {department && (
              <p className="text-white/95 dark:text-white/95 mt-2 font-medium print:text-gray-800 print:text-sm print:mt-1">Department: {department}</p>
            )}
          </div>
        </div>

        {/* Summary Statistics */}
        <PaymentSummaryCalculator payrollData={payrollData}>
          {({ totalPaidAmount, totalRemainingBalance, paymentCompletionRate }) => (
            <div className="bg-muted/30 p-6 print:bg-gray-50">
              <div className="grid grid-cols-2 md:grid-cols-6 gap-4 print:grid-cols-3 print:gap-2">
                <div className="bg-background p-4 rounded-lg border border-border print:border print:p-2">
                  <div className="flex items-center gap-2 mb-2 print:gap-1">
                    <Users className="h-4 w-4 text-primary print:text-black" />
                    <div className="text-xs text-muted-foreground print:text-gray-600">Total Employees</div>
                  </div>
                  <div className="text-2xl font-bold print:text-lg">{totalEmployees}</div>
                </div>
                <div className="bg-background p-4 rounded-lg border border-border print:border print:p-2">
                  <div className="flex items-center gap-2 mb-2 print:gap-1">
                    <DollarSign className="h-4 w-4 text-primary print:text-black" />
                    <div className="text-xs text-muted-foreground print:text-gray-600">Gross Payroll</div>
                  </div>
                  <div className="text-2xl font-bold print:text-lg">PKR {(totalBaseSalary + totalOvertime).toLocaleString()}</div>
                  <div className="text-xs text-muted-foreground mt-1 print:text-gray-500 print:text-[10px]">
                    Base: {totalBaseSalary.toLocaleString()} + Overtime: {totalOvertime.toLocaleString()}
                  </div>
                </div>
                <div className="bg-background p-4 rounded-lg border border-border print:border print:p-2">
                  <div className="flex items-center gap-2 mb-2 print:gap-1">
                    <TrendingDown className="h-4 w-4 text-destructive print:text-black" />
                    <div className="text-xs text-muted-foreground print:text-gray-600">Total Deductions</div>
                  </div>
                  <div className="text-2xl font-bold text-destructive print:text-black">-PKR {totalDeductions.toLocaleString()}</div>
                  <div className="text-xs text-muted-foreground mt-1 print:text-gray-500 print:text-[10px]">
                    Absence + Advances
                  </div>
                </div>
                <div className="bg-primary/10 p-4 rounded-lg border border-primary/20 print:border print:p-2 print:bg-gray-100">
                  <div className="flex items-center gap-2 mb-2 print:gap-1">
                    <DollarSign className="h-4 w-4 text-primary print:text-black" />
                    <div className="text-xs text-muted-foreground font-semibold print:text-gray-600">Net Payroll</div>
                  </div>
                  <div className="text-2xl font-bold text-primary print:text-black">PKR {totalFinalSalary.toLocaleString()}</div>
                  <div className="text-xs text-muted-foreground mt-1 print:text-gray-500 print:text-[10px]">
                    After deductions
                  </div>
                </div>
                <div className="bg-success/10 p-4 rounded-lg border border-success/20 print:border print:p-2 print:bg-gray-100">
                  <div className="flex items-center gap-2 mb-2 print:gap-1">
                    <TrendingUp className="h-4 w-4 text-success print:text-black" />
                    <div className="text-xs text-muted-foreground print:text-gray-600">Paid Amount</div>
                  </div>
                  <div className="text-2xl font-bold text-success print:text-black">PKR {totalPaidAmount.toLocaleString()}</div>
                  <div className="text-xs text-muted-foreground mt-1 print:text-gray-500 print:text-[10px]">
                    From payments table
                  </div>
                </div>
                <div className="bg-warning/10 p-4 rounded-lg border border-warning/20 print:border print:p-2 print:bg-gray-100">
                  <div className="flex items-center gap-2 mb-2 print:gap-1">
                    <DollarSign className="h-4 w-4 text-warning print:text-black" />
                    <div className="text-xs text-muted-foreground print:text-gray-600">Remaining</div>
                  </div>
                  <div className="text-2xl font-bold text-warning print:text-black">PKR {totalRemainingBalance.toLocaleString()}</div>
                  <div className="text-xs text-muted-foreground mt-1 print:text-gray-500 print:text-[10px]">
                    Outstanding balance
                  </div>
                </div>
              </div>
            </div>
          )}
        </PaymentSummaryCalculator>

        <div className="p-8 print:p-4">
          {/* Department-wise breakdown */}
          {Object.entries(departmentGroups).map(([dept, records]) => {
            const deptTotal = records.reduce((sum, r) => sum + Number(r.final_salary), 0);
            
            return (
              <div key={dept} className="mb-8 print:mb-4">
                <div className="flex items-center justify-between mb-4 print:mb-2">
                  <div className="flex items-center gap-3 print:gap-2">
                    <Building2 className="h-5 w-5 text-primary print:text-black" />
                    <h2 className="text-xl font-bold print:text-lg">{dept} Department</h2>
                    <Badge className={`${departmentColors[dept] || "bg-muted"} print:text-black print:border print:bg-white`}>
                      {records.length} {records.length === 1 ? 'Employee' : 'Employees'}
                    </Badge>
                  </div>
                  <div className="text-right">
                    <div className="text-sm text-muted-foreground print:text-gray-600">Department Total</div>
                    <div className="text-xl font-bold text-primary print:text-black">
                      PKR {deptTotal.toLocaleString()}
                    </div>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-sm print:text-xs">
                    <thead className="bg-muted/50 dark:bg-muted/80 print:bg-gray-100">
                      <tr>
                        <th className="text-left p-3 font-semibold print:p-2 print:text-black">Employee</th>
                        <th className="text-left p-3 font-semibold print:p-2 print:text-black">ID</th>
                        <th className="text-right p-3 font-semibold print:p-2 print:text-black">Base</th>
                        <th className="text-center p-3 font-semibold print:p-2 print:text-black">Days</th>
                        <th className="text-right p-3 font-semibold print:p-2 print:text-black">Overtime</th>
                        <th className="text-right p-3 font-semibold print:p-2 print:text-black">Deductions</th>
                        <th className="text-right p-3 font-semibold print:p-2 print:text-black">Final Salary</th>
                        <th className="text-right p-3 font-semibold print:p-2 print:text-black">Paid Amount</th>
                        <th className="text-right p-3 font-semibold print:p-2 print:text-black">Remaining</th>
                        <th className="text-left p-3 font-semibold print:p-2 print:text-black">Payment Details</th>
                        <th className="text-center p-3 font-semibold print:p-2 print:text-black">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {records.map((record, idx) => (
                        <motion.tr 
                          key={record.id}
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{ delay: idx * 0.05 }}
                          className="border-b border-border hover:bg-muted/30 dark:hover:bg-muted/50 print:border-gray-300 print:hover:bg-none"
                        >
                          <td className="p-3 print:p-2">
                            <div className="font-medium print:text-sm">{record.employees.name}</div>
                            <div className="text-xs text-muted-foreground print:text-gray-500">{record.employees.cnic}</div>
                          </td>
                          <td className="p-3 print:p-2 text-muted-foreground print:text-gray-600">{record.employees.employee_id}</td>
                          <td className="p-3 print:p-2 text-right font-medium print:text-sm">
                            {Number(record.base_salary).toLocaleString()}
                          </td>
                          <td className="p-3 print:p-2 text-center">
                            <div className="text-xs print:text-[8px]">
                              <span className="text-success font-medium print:text-black">P:{record.present_days}</span>
                              {" • "}
                              <span className="text-destructive font-medium print:text-black">A:{record.absent_days}</span>
                              {" • "}
                              <span className="text-warning font-medium print:text-black">L:{record.leave_days}</span>
                              {" • "}
                              <span className="text-info font-medium print:text-black">H:{record.holiday_days}</span>
                            </div>
                          </td>
                          <td className="p-3 print:p-2 text-right text-success font-medium print:text-black">
                            +{Number(record.overtime_pay).toLocaleString()}
                          </td>
                          <td className="p-3 print:p-2 text-right text-destructive font-medium print:text-black">
                            -{(Number(record.absence_deduction) + Number(record.advance_amount)).toLocaleString()}
                          </td>
                          <td className="p-3 print:p-2 text-right font-bold text-lg print:text-base print:text-black">
                            {Number(record.final_salary).toLocaleString()}
                          </td>
                          <PaymentDataCell payrollId={record.id} finalSalary={record.final_salary} />
                          <td className="p-3 print:p-2 text-left">
                            <PaymentDetailsByDate payrollId={record.id} />
                          </td>
                          <td className="p-3 print:p-2 text-center">
                            <PaymentStatusBadge payrollId={record.id} finalSalary={record.final_salary} />
                          </td>
                        </motion.tr>
                      ))}
                      <DepartmentSubtotal records={records} dept={dept} />
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })}

          {/* Grand Total */}
          <PaymentSummaryCalculator payrollData={payrollData}>
            {({ totalPaidAmount, totalRemainingBalance, paymentCompletionRate }) => (
              <div className="mt-8 p-6 bg-primary/5 dark:bg-primary/10 rounded-lg border-2 border-primary/20 dark:border-primary/30 print:mt-4 print:p-3 print:bg-gray-50 print:border">
                <div className="grid md:grid-cols-2 gap-6 print:gap-3">
                  <div>
                    <div className="text-sm text-muted-foreground mb-1 print:text-gray-600">Grand Total Payroll</div>
                    <div className="text-xs text-muted-foreground mb-4 print:text-gray-500">
                      {totalEmployees} employees across {Object.keys(departmentGroups).length} department(s)
                    </div>
                    <div className="text-4xl font-bold text-primary print:text-2xl print:text-black">
                      PKR {totalFinalSalary.toLocaleString()}
                    </div>
                  </div>
                  <div className="space-y-4 print:space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground print:text-gray-600">Total Paid:</span>
                      <span className="text-lg font-bold text-success print:text-black">PKR {totalPaidAmount.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground print:text-gray-600">Remaining Balance:</span>
                      <span className={`text-lg font-bold ${totalRemainingBalance === 0 ? 'text-success' : 'text-warning'} print:text-black`}>
                        PKR {totalRemainingBalance.toLocaleString()}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground print:text-gray-600">Payment Completion:</span>
                      <span className={`text-lg font-bold ${paymentCompletionRate === 100 ? 'text-success' : 'text-warning'} print:text-black`}>
                        {paymentCompletionRate}%
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </PaymentSummaryCalculator>
        </div>

        {/* Footer */}
        <div className="border-t border-border p-8 print:p-4 print:border-gray-300">
          <div className="grid md:grid-cols-3 gap-8 mb-6 print:gap-4 print:mb-3">
            <div>
              <div className="border-t-2 border-foreground/20 pt-2 mt-12 print:border-black print:pt-1 print:mt-6">
                <div className="text-sm text-muted-foreground print:text-gray-600">Prepared By</div>
                <div className="font-semibold print:text-sm">HR Department</div>
              </div>
            </div>
            <div>
              <div className="border-t-2 border-foreground/20 pt-2 mt-12 print:border-black print:pt-1 print:mt-6">
                <div className="text-sm text-muted-foreground print:text-gray-600">Approved By</div>
                <div className="font-semibold print:text-sm">Finance Department</div>
              </div>
            </div>
            <div>
              <div className="border-t-2 border-foreground/20 pt-2 mt-12 print:border-black print:pt-1 print:mt-6">
                <div className="text-sm text-muted-foreground print:text-gray-600">Report Date</div>
                <div className="font-semibold print:text-sm">{new Date().toLocaleDateString()}</div>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div className="text-xs text-muted-foreground/40 print:text-gray-400">
              Developed by Shahzaib
            </div>
            <div className="flex gap-2 print:hidden">
              <Button onClick={handlePrint} className="gap-2 bg-gradient-primary">
                <Printer className="h-4 w-4" />
                Print Report
              </Button>
              <Button 
                onClick={() => {
                  // This would normally open the ledger report in a new dialog
                  // For now, we'll just show an alert directing user to use the Reports page
                  alert("Please use the 'Generate Ledger Report' button on the Reports page for a ledger-style print view.");
                }} 
                variant="outline" 
                className="gap-2"
              >
                <FileText className="h-4 w-4" />
                Ledger View
              </Button>
            </div>
          </div>
        </div>
      </Card>
    </motion.div>
  );
}