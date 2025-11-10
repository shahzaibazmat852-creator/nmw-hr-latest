import { useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Printer } from "lucide-react";

// Version: Floor display fix - remaining balance shows floored value (discards decimal)

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

interface LedgerSalaryReportProps {
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
  Enamel: "border-l-primary",
  Workshop: "border-l-accent",
  Guards: "border-l-info",
  Cooks: "border-l-warning",
  Admins: "border-l-success",
  Directors: "border-l-destructive",
  Accounts: "border-l-purple-500",
};

export default function LedgerSalaryReport({ 
  payrollData, 
  month, 
  year,
  department,
  title = "Salary Report"
}: LedgerSalaryReportProps) {
  const reportRef = useRef<HTMLDivElement>(null);

  const handlePrint = () => {
    window.print();
  };

  // Calculate comprehensive totals
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

  // Fetch all payments for the payroll records
  const { data: allPayments = [] } = useQuery({
    queryKey: ["ledger-payments", payrollData.map(p => p.id)],
    queryFn: async () => {
      if (payrollData.length === 0) return [];
      
      const payrollIds = payrollData.map(p => p.id);
      const { data, error } = await supabase
        .from("payments")
        .select("*")
        .in("payroll_id", payrollIds)
        .order("payment_date", { ascending: true });

      if (error) throw error;
      return data || [];
    },
    enabled: payrollData.length > 0,
  });

  // Group payments by date for summary
  const paymentsByDate = allPayments.reduce((acc: any, payment: any) => {
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
    <div ref={reportRef} className="w-full max-w-6xl mx-auto p-6 font-sans print:p-0 print:max-w-full ledger-report ledger-salary-report">
      {/* Header */}
      <div className="text-center mb-8 print:mb-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-2 print:text-2xl">NMW {title}</h1>
        <p className="text-lg text-gray-700 print:text-base">
          {monthNames[month - 1]} {year}
          {department && ` - ${department} Department`}
        </p>
        <div className="border-b-2 border-gray-300 mt-4 print:mt-3"></div>
        
        {/* Print button for screen view */}
        <div className="print:hidden flex justify-center mt-6">
          <Button onClick={handlePrint} className="gap-2">
            <Printer className="h-4 w-4" />
            Print Report
          </Button>
        </div>
      </div>



      {/* Department-wise breakdown */}
      {Object.entries(departmentGroups).map(([dept, records]) => {
        const deptTotal = records.reduce((sum, r) => sum + Number(r.final_salary), 0);
        
        // Calculate total paid for this department
        let deptTotalPaid = 0;
        records.forEach(record => {
          const employeePayments = allPayments.filter((p: any) => p.payroll_id === record.id);
          const totalPaid = employeePayments.reduce((sum: number, p: any) => sum + Number(p.amount), 0);
          deptTotalPaid += totalPaid;
        });
        
        return (
          <div key={dept} className="mb-10 print:mb-8 summary-card">
            <div className={`border-l-4 ${departmentColors[dept] || "border-l-gray-500"} pl-4 mb-6 print:mb-4`}>
              <h2 className="text-2xl font-bold text-gray-900 print:text-xl">{dept} Department</h2>
              <p className="text-gray-600 print:text-base">
                {records.length} {records.length === 1 ? 'Employee' : 'Employees'} • 
                Total Salary: PKR {deptTotal.toLocaleString()} •
                Total Paid: PKR {deptTotalPaid.toLocaleString()} •
                Remaining: PKR {(deptTotal - deptTotalPaid).toLocaleString()}
              </p>
            </div>

            {/* Employee Table */}
            <div className="overflow-x-auto">
              <table className="w-full border-collapse mb-6 print:mb-4">
                <thead>
                  <tr className="bg-gray-100 border-b">
                    <th className="text-left p-3 text-sm font-semibold text-gray-700 border-r print:p-2 print:text-xs">Employee</th>
                    <th className="text-center p-3 text-sm font-semibold text-gray-700 border-r print:p-2 print:text-xs">ID</th>
                    <th className="text-right p-3 text-sm font-semibold text-gray-700 border-r print:p-2 print:text-xs">Base Salary</th>
                    <th className="text-center p-3 text-sm font-semibold text-gray-700 border-r print:p-2 print:text-xs">Attendance</th>
                    <th className="text-right p-3 text-sm font-semibold text-gray-700 border-r print:p-2 print:text-xs">Overtime</th>
                    <th className="text-right p-3 text-sm font-semibold text-gray-700 border-r print:p-2 print:text-xs">Deductions</th>
                    <th className="text-right p-3 text-sm font-semibold text-gray-700 border-r print:p-2 print:text-xs">Final Salary</th>
                    <th className="text-right p-3 text-sm font-semibold text-gray-700 border-r print:p-2 print:text-xs">Paid Amount</th>
                    <th className="text-right p-3 text-sm font-semibold text-gray-700 border-r print:p-2 print:text-xs">Remaining</th>
                  </tr>
                </thead>
                <tbody>
                  {records.map((record) => {
                    // Get payments for this specific payroll record
                    const employeePayments = allPayments.filter((p: any) => p.payroll_id === record.id);
                    const totalPaid = employeePayments.reduce((sum: number, p: any) => sum + Number(p.amount), 0);
                    const remainingBalance = Number(record.final_salary) - totalPaid;
                    // Floor the remaining balance for display (discard decimal amount)
                    const remainingBalanceDisplay = Math.floor(Math.max(0, remainingBalance));
                    
                    return (
                      <tr key={record.id} className="border-b hover:bg-gray-50 print:hover:bg-none">
                        <td className="p-3 text-sm text-gray-900 border-r print:p-2 print:text-xs">
                          <div className="font-medium">{record.employees.name}</div>
                          <div className="text-xs text-gray-500">{record.employees.cnic}</div>
                        </td>
                        <td className="p-3 text-sm text-center text-gray-700 border-r print:p-2 print:text-xs">
                          {record.employees.employee_id}
                        </td>
                        <td className="p-3 text-sm text-right text-gray-900 border-r print:p-2 print:text-xs">
                          {Number(record.base_salary).toLocaleString()}
                        </td>
                        <td className="p-3 text-xs text-center border-r print:p-2 print:text-[8px]">
                          <div className="flex justify-center gap-2">
                            <span className="text-green-600">P:{record.present_days}</span>
                            <span className="text-red-600">A:{record.absent_days}</span>
                            <span className="text-yellow-600">L:{record.leave_days}</span>
                            <span className="text-blue-600">H:{record.holiday_days}</span>
                          </div>
                        </td>
                        <td className="p-3 text-sm text-right text-green-600 border-r print:p-2 print:text-xs">
                          +{Number(record.overtime_pay).toLocaleString()}
                        </td>
                        <td className="p-3 text-sm text-right text-red-600 border-r print:p-2 print:text-xs">
                          -{(Number(record.absence_deduction) + Number(record.advance_amount)).toLocaleString()}
                        </td>
                        <td className="p-3 text-sm text-right font-bold text-gray-900 border-r print:p-2 print:text-xs">
                          {Number(record.final_salary).toLocaleString()}
                        </td>
                        <td className="p-3 text-sm text-right font-bold text-green-600 border-r print:p-2 print:text-xs">
                          <div className="space-y-1">
                            {employeePayments
                              .sort((a, b) => new Date(a.payment_date).getTime() - new Date(b.payment_date).getTime())
                              .map((payment: any, index: number) => (
                                <div key={payment.id} className="text-xs">
                                  <span className="text-gray-600">
                                    {new Date(payment.payment_date).toLocaleDateString()}
                                  </span>
                                  <span className="ml-2 font-medium">
                                    {Number(payment.amount).toLocaleString()}
                                  </span>
                                </div>
                              ))}
                            {employeePayments.length > 0 && (
                              <div className="border-t border-gray-300 pt-1 mt-1 text-sm font-bold">
                                Total: {totalPaid.toLocaleString()}
                              </div>
                            )}
                            {employeePayments.length === 0 && (
                              <span className="text-gray-500">No payments</span>
                            )}
                          </div>
                        </td>
                        <td className="p-3 text-sm text-right font-bold text-gray-900 print:p-2 print:text-xs">
                          <span className={remainingBalanceDisplay === 0 ? 'text-green-600' : 'text-orange-600'}>
                            {remainingBalanceDisplay.toLocaleString()}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr className="bg-gray-100 font-bold border-t-2 border-gray-300">
                    <td colSpan={6} className="p-3 text-right text-gray-900 print:p-2 print:text-xs">
                      {dept} Department Totals:
                    </td>
                    <td className="p-3 text-right text-gray-900 border-r print:p-2 print:text-xs">
                      PKR {deptTotal.toLocaleString()}
                    </td>
                    <td className="p-3 text-right text-green-600 border-r print:p-2 print:text-xs">
                      PKR {deptTotalPaid.toLocaleString()}
                    </td>
                    <td className="p-3 text-right text-gray-900 print:p-2 print:text-xs">
                      PKR {(deptTotal - deptTotalPaid).toLocaleString()}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        );
      })}

      {/* Payment Summary by Date */}
      {Object.keys(dateTotals).length > 0 && (
        <div className="mb-10 print:mb-8 summary-card">
          <h2 className="text-2xl font-bold text-gray-900 mb-6 print:mb-4 print:text-xl">Payment Summary by Date</h2>
          <div className="bg-gray-50 p-6 rounded border print:p-4 print:bg-white">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-gray-100 border-b">
                  <th className="text-left p-3 text-sm font-semibold text-gray-700 border-r print:p-2 print:text-xs">Date</th>
                  <th className="text-right p-3 text-sm font-semibold text-gray-700 print:p-2 print:text-xs">Total Amount</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(dateTotals)
                  .sort(([dateA], [dateB]) => new Date(dateB).getTime() - new Date(dateA).getTime())
                  .map(([date, amount]) => (
                    <tr key={date} className="border-b">
                      <td className="p-3 text-sm text-gray-900 border-r print:p-2 print:text-xs">
                        {new Date(date).toLocaleDateString()}
                      </td>
                      <td className="p-3 text-sm text-right font-medium text-gray-900 print:p-2 print:text-xs">
                        PKR {amount.toLocaleString()}
                      </td>
                    </tr>
                  ))}
              </tbody>
              <tfoot>
                <tr className="bg-gray-100 font-bold border-t-2 border-gray-300">
                  <td className="p-3 text-right text-gray-900 print:p-2 print:text-xs">
                    Grand Total:
                  </td>
                  <td className="p-3 text-right text-gray-900 print:p-2 print:text-xs">
                    PKR {Object.values(dateTotals).reduce((sum, amount) => sum + amount, 0).toLocaleString()}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {/* Grand Total */}
      <div className="bg-gray-50 p-6 rounded border mb-10 print:mb-8 print:p-4 print:bg-white summary-card">
        <h3 className="text-xl font-bold text-gray-900 mb-6 print:text-lg print:mb-4">Payment Summary</h3>
        
        {/* Overall Summary */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8 print:gap-4 print:mb-6">
          <div className="bg-white p-4 rounded-lg border shadow-sm print:p-3">
            <div className="text-sm text-gray-600 mb-1 print:text-xs">Total Employees</div>
            <div className="text-2xl font-bold text-gray-900 print:text-xl">{totalEmployees}</div>
          </div>
          <div className="bg-white p-4 rounded-lg border shadow-sm print:p-3">
            <div className="text-sm text-gray-600 mb-1 print:text-xs">Departments</div>
            <div className="text-2xl font-bold text-gray-900 print:text-xl">{Object.keys(departmentGroups).length}</div>
          </div>
          <div className="bg-white p-4 rounded-lg border shadow-sm print:p-3">
            <div className="text-sm text-gray-600 mb-1 print:text-xs">Net Payroll</div>
            <div className="text-2xl font-bold text-gray-900 print:text-xl">PKR {totalFinalSalary.toLocaleString()}</div>
          </div>
        </div>

        {/* Department-wise Payment Summary */}
        <div className="mb-8 print:mb-6">
          <h4 className="text-lg font-bold text-gray-900 mb-4 print:text-base print:mb-3">Department Payment Details</h4>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-gray-100">
                  <th className="text-left p-3 text-sm font-semibold text-gray-700 border print:p-2 print:text-xs">Department</th>
                  <th className="text-right p-3 text-sm font-semibold text-gray-700 border print:p-2 print:text-xs">Employees</th>
                  <th className="text-right p-3 text-sm font-semibold text-gray-700 border print:p-2 print:text-xs">Total Salary</th>
                  <th className="text-right p-3 text-sm font-semibold text-gray-700 border print:p-2 print:text-xs">Total Paid</th>
                  <th className="text-right p-3 text-sm font-semibold text-gray-700 border print:p-2 print:text-xs">Remaining</th>
                  <th className="text-right p-3 text-sm font-semibold text-gray-700 border print:p-2 print:text-xs">Status</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(departmentGroups).map(([dept, records]) => {
                  const deptTotal = records.reduce((sum, r) => sum + Number(r.final_salary), 0);
                  
                  // Calculate total paid for this department
                  let deptTotalPaid = 0;
                  records.forEach(record => {
                    const employeePayments = allPayments.filter((p: any) => p.payroll_id === record.id);
                    const totalPaid = employeePayments.reduce((sum: number, p: any) => sum + Number(p.amount), 0);
                    deptTotalPaid += totalPaid;
                  });
                  
                  const remaining = deptTotal - deptTotalPaid;
                  const percentagePaid = deptTotal > 0 ? Math.round((deptTotalPaid / deptTotal) * 100) : 0;
                  
                  return (
                    <tr key={dept} className="border-b hover:bg-gray-50 print:hover:bg-none">
                      <td className="p-3 text-sm font-medium text-gray-900 border print:p-2 print:text-xs">{dept}</td>
                      <td className="p-3 text-sm text-right text-gray-700 border print:p-2 print:text-xs">{records.length}</td>
                      <td className="p-3 text-sm text-right text-gray-900 border print:p-2 print:text-xs">PKR {deptTotal.toLocaleString()}</td>
                      <td className="p-3 text-sm text-right text-green-600 border print:p-2 print:text-xs">PKR {deptTotalPaid.toLocaleString()}</td>
                      <td className="p-3 text-sm text-right text-gray-900 border print:p-2 print:text-xs">PKR {remaining.toLocaleString()}</td>
                      <td className="p-3 text-sm text-right border print:p-2 print:text-xs">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          percentagePaid === 100 
                            ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300' 
                            : percentagePaid > 0 
                              ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300' 
                              : 'bg-gray-100 dark:bg-gray-800/50 text-gray-800 dark:text-gray-300'
                        }`}>
                          {percentagePaid}% Paid
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="bg-gray-100 font-bold border-t-2 border-gray-300">
                  <td className="p-3 text-left text-gray-900 print:p-2 print:text-xs">Totals</td>
                  <td className="p-3 text-right text-gray-900 print:p-2 print:text-xs">
                    {Object.values(departmentGroups).reduce((sum, records) => sum + records.length, 0)}
                  </td>
                  <td className="p-3 text-right text-gray-900 border print:p-2 print:text-xs">
                    PKR {totalFinalSalary.toLocaleString()}
                  </td>
                  <td className="p-3 text-right text-green-600 border print:p-2 print:text-xs">
                    PKR {Object.entries(departmentGroups).reduce((total, [_, records]) => {
                      let deptTotalPaid = 0;
                      records.forEach(record => {
                        const employeePayments = allPayments.filter((p: any) => p.payroll_id === record.id);
                        const totalPaid = employeePayments.reduce((sum: number, p: any) => sum + Number(p.amount), 0);
                        deptTotalPaid += totalPaid;
                      });
                      return total + deptTotalPaid;
                    }, 0).toLocaleString()}
                  </td>
                  <td className="p-3 text-right text-gray-900 border print:p-2 print:text-xs">
                    PKR {Object.entries(departmentGroups).reduce((total, [_, records]) => {
                      const deptTotal = records.reduce((sum, r) => sum + Number(r.final_salary), 0);
                      let deptTotalPaid = 0;
                      records.forEach(record => {
                        const employeePayments = allPayments.filter((p: any) => p.payroll_id === record.id);
                        const totalPaid = employeePayments.reduce((sum: number, p: any) => sum + Number(p.amount), 0);
                        deptTotalPaid += totalPaid;
                      });
                      return total + (deptTotal - deptTotalPaid);
                    }, 0).toLocaleString()}
                  </td>
                  <td className="p-3 text-right text-gray-900 print:p-2 print:text-xs">
                    {totalFinalSalary > 0 
                      ? Math.round((Object.entries(departmentGroups).reduce((total, [_, records]) => {
                          let deptTotalPaid = 0;
                          records.forEach(record => {
                            const employeePayments = allPayments.filter((p: any) => p.payroll_id === record.id);
                            const totalPaid = employeePayments.reduce((sum: number, p: any) => sum + Number(p.amount), 0);
                            deptTotalPaid += totalPaid;
                          });
                          return total + deptTotalPaid;
                        }, 0) / totalFinalSalary) * 100) 
                      : 0}%
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>


      </div>

      {/* Footer */}
      <div className="border-t-2 border-gray-300 pt-6 print:pt-4">
        <div className="grid grid-cols-3 gap-8 print:gap-4">
          <div className="text-center">
            <div className="border-t border-gray-500 pt-2 print:pt-1">
              <div className="text-sm text-gray-600 print:text-xs">Prepared By</div>
              <div className="font-semibold text-gray-900 print:text-sm">HR Department</div>
            </div>
          </div>
          <div className="text-center">
            <div className="border-t border-gray-500 pt-2 print:pt-1">
              <div className="text-sm text-gray-600 print:text-xs">Approved By</div>
              <div className="font-semibold text-gray-900 print:text-sm">Finance Department</div>
            </div>
          </div>
          <div className="text-center">
            <div className="border-t border-gray-500 pt-2 print:pt-1">
              <div className="text-sm text-gray-600 print:text-xs">Report Date</div>
              <div className="font-semibold text-gray-900 print:text-sm">{new Date().toLocaleDateString()}</div>
            </div>
          </div>
        </div>
        <div className="text-center text-xs text-gray-500 mt-8 print:mt-4 print:text-[8px]">
          Generated by NMW Attendance-PayRoll System
        </div>
      </div>
    </div>
  );
}