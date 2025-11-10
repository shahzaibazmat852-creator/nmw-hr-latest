import { motion } from "framer-motion";
import { CheckCircle2, XCircle, Coffee, PartyPopper, Download, Printer, RotateCcw, CalendarCheck, Undo2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Employee } from "@/hooks/useEmployees";
import { Payroll } from "@/hooks/usePayroll";
import { useEmployeeAttendance } from "@/hooks/useAttendance";
import { useEmployeeAdvances, useEmployeePayments, useAddAdvance } from "@/hooks/usePayroll";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

// Version: Floor display fix - balance shows floored value (discards decimal)

interface WageCardProps {
  employee: Employee;
  payroll: Payroll;
  month: number;
  year: number;
}

const statusIcons = {
  present: { icon: CheckCircle2, color: "text-success", bg: "bg-success/20" },
  absent: { icon: XCircle, color: "text-destructive", bg: "bg-destructive/20" },
  leave: { icon: Coffee, color: "text-warning", bg: "bg-warning/20" },
  holiday: { icon: PartyPopper, color: "text-info", bg: "bg-info/20" },
};

const monthNames = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

export default function WageCard({ employee, payroll, month, year }: WageCardProps) {
  const { data: attendanceData = [] } = useEmployeeAttendance(employee.id, month, year);
  const { data: advancesData = [] } = useEmployeeAdvances(employee.id, month, year);
  const { data: paymentsData = [] } = useEmployeePayments(employee.id, month, year);
  
  // Debug: Log payment data changes
  useEffect(() => {
    console.log("🔄 WageCard payments data updated:", paymentsData.length, "payments for", employee.name);
    console.log("🔄 Payment details:", paymentsData);
  }, [paymentsData, employee.name]);
  const addAdvance = useAddAdvance();
  
  const daysInMonth = new Date(year, month, 0).getDate();
  const firstDay = new Date(year, month - 1, 1).getDay();
  
  const attendanceMap = new Map(
    attendanceData.map(a => [new Date(a.attendance_date).getDate(), a.status])
  );

  const totalPaid = paymentsData.reduce((sum: number, payment: any) => sum + Number(payment.amount || 0), 0);
  const finalSalary = Number(payroll.final_salary || 0);
  const balance = finalSalary - totalPaid; // positive = due, negative = overpaid
  // Floor the balance for display (discard decimal amount) - keep sign for overpaid
  const balanceDisplay = balance < 0 
    ? -Math.floor(Math.abs(balance)) 
    : Math.floor(Math.max(0, balance));

  const nextMonth = useMemo(() => (month === 12 ? 1 : month + 1), [month]);
  const nextYear = useMemo(() => (month === 12 ? year + 1 : year), [month, year]);
  const nextMonthStart = useMemo(() => new Date(nextYear, nextMonth - 1, 1).toISOString().split("T")[0], [nextMonth, nextYear]);
  const nextMonthEnd = useMemo(() => new Date(nextYear, nextMonth, 0).toISOString().split("T")[0], [nextMonth, nextYear]);
  const recoveryNote = useMemo(() => `Recovery of overpayment for ${month}/${year}`, [month, year]);

  const [recoveryAdvance, setRecoveryAdvance] = useState<any | null>(null);
  const [isLoadingRecovery, setIsLoadingRecovery] = useState(false);

  useEffect(() => {
    let isMounted = true;
    const loadRecovery = async () => {
      if (balance >= 0) {
        setRecoveryAdvance(null);
        return;
      }
      setIsLoadingRecovery(true);
      const { data, error } = await supabase
        .from("advances")
        .select("*")
        .eq("employee_id", employee.id)
        .gte("advance_date", nextMonthStart)
        .lte("advance_date", nextMonthEnd)
        .eq("notes", recoveryNote)
        .limit(1)
        .maybeSingle();
      if (!isMounted) return;
      if (error) {
        setRecoveryAdvance(null);
      } else {
        setRecoveryAdvance(data || null);
      }
      setIsLoadingRecovery(false);
    };
    loadRecovery();
    return () => { isMounted = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [employee.id, nextMonthStart, nextMonthEnd, recoveryNote, balance]);

  const handleCreateRecoveryAdvance = async () => {
    const overpaidAmount = Math.abs(balance);
    if (overpaidAmount <= 0) return;

    if (recoveryAdvance) return; // already scheduled

    const advanceDate = nextMonthStart;
    const created = await addAdvance.mutateAsync({
      employeeId: employee.id,
      amount: overpaidAmount,
      notes: recoveryNote,
      advanceDate,
    });
    setRecoveryAdvance(created);
    toast.success(`Recovery scheduled for ${nextMonth}/${nextYear}`);
  };

  const handleUndoRecoveryAdvance = async () => {
    if (!recoveryAdvance) return;
    const id = recoveryAdvance.id;
    const { error } = await supabase.from("advances").delete().eq("id", id);
    if (error) {
      toast.error("Failed to undo recovery");
      return;
    }
    setRecoveryAdvance(null);
    toast.success("Recovery removed");
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="max-w-6xl mx-auto wage-card"
    >
      <Card className="shadow-strong border-0 overflow-hidden print:shadow-none print:border print:border-gray-300 wage-card print:page-break-inside-avoid">
        {/* Header with Company Branding */}
        <div className="bg-gradient-hero text-white p-8 relative overflow-hidden print:bg-gray-900 print:text-gray-100">
          <div className="absolute inset-0 opacity-10">
            <div className="absolute -right-10 -top-10 w-40 h-40 bg-white rounded-full" />
            <div className="absolute -left-10 -bottom-10 w-32 h-32 bg-white rounded-full" />
          </div>
          <div className="relative z-10">
            <h1 className="text-xl sm:text-2xl md:text-3xl font-bold mb-2">NMW Payroll System</h1>
            <p className="text-white/80 text-sm sm:text-base">Wage Card - {monthNames[month - 1]} {year}</p>
          </div>
        </div>

        {/* Employee Information */}
        <div className="bg-muted/30 p-4 sm:p-6 grid grid-cols-1 xs:grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 print:bg-gray-50 print:border-b print:border-gray-300">
          <div>
            <div className="text-xs sm:text-sm text-muted-foreground mb-1">Employee Name</div>
            <div className="font-semibold text-sm sm:text-base truncate">{employee.name}</div>
          </div>
          <div>
            <div className="text-xs sm:text-sm text-muted-foreground mb-1">Employee ID</div>
            <div className="font-semibold text-sm sm:text-base">{employee.employee_id}</div>
          </div>
          <div>
            <div className="text-xs sm:text-sm text-muted-foreground mb-1">Department</div>
            <div className="font-semibold text-sm sm:text-base truncate">{employee.department}</div>
          </div>
          <div>
            <div className="text-xs sm:text-sm text-muted-foreground mb-1">CNIC</div>
            <div className="font-semibold text-sm sm:text-base">{employee.cnic}</div>
          </div>
        </div>

        <div className="p-4 sm:p-6 lg:p-8 grid lg:grid-cols-2 gap-6 sm:gap-8 print:p-6">
          {/* Left: Attendance Calendar */}
          <div className="print:page-break-inside-avoid">
            <h2 className="text-xl font-bold mb-4">Monthly Attendance</h2>
            <div className="bg-muted/20 p-4 rounded-lg print:border print:border-gray-300">
              {/* Calendar Header */}
              <div className="grid grid-cols-7 gap-2 mb-2">
                {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
                  <div key={day} className="text-center text-xs font-semibold text-muted-foreground">
                    {day}
                  </div>
                ))}
              </div>

              {/* Calendar Days */}
              <div className="grid grid-cols-7 gap-2 calendar-grid">
                {/* Empty cells for days before month starts */}
                {Array.from({ length: firstDay }).map((_, i) => (
                  <div key={`empty-${i}`} className="aspect-square" />
                ))}

                {/* Actual days */}
                {Array.from({ length: daysInMonth }).map((_, i) => {
                  const day = i + 1;
                  const status = attendanceMap.get(day);
                  const config = status ? statusIcons[status] : null;
                  const Icon = config?.icon;
                  const isFriday = (firstDay + i) % 7 === 5;

                  return (
                    <motion.div
                      key={day}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: day * 0.01 }}
                      className={`aspect-square rounded-lg flex flex-col items-center justify-center text-xs calendar-day print:border print:border-gray-300 print:rounded-none ${
                        config
                          ? config.bg
                          : isFriday
                          ? "bg-info/10"
                          : "bg-background border border-border"
                      }`}
                    >
                      <div className="font-semibold mb-1">{day}</div>
                      {Icon && <Icon className={`h-3 w-3 ${config.color}`} />}
                      {isFriday && !status && (
                        <div className="text-[10px] text-info">OFF</div>
                      )}
                    </motion.div>
                  );
                })}
              </div>

              {/* Legend */}
              <div className="mt-4 pt-4 border-t border-border grid grid-cols-2 gap-2 text-xs">
                {Object.entries(statusIcons).map(([status, config]) => {
                  const Icon = config.icon;
                  return (
                    <div key={status} className="flex items-center gap-2">
                      <Icon className={`h-3 w-3 ${config.color}`} />
                      <span className="capitalize">{status}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Attendance Summary */}
            <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-2 summary-stats print:page-break-inside-avoid">
              <div className="bg-success/10 p-3 rounded-lg text-center">
                <div className="text-2xl font-bold text-success">{payroll.present_days}</div>
                <div className="text-xs text-muted-foreground">Present</div>
              </div>
              <div className="bg-destructive/10 p-3 rounded-lg text-center">
                <div className="text-2xl font-bold text-destructive">{payroll.absent_days}</div>
                <div className="text-xs text-muted-foreground">Absent</div>
              </div>
              <div className="bg-warning/10 p-3 rounded-lg text-center">
                <div className="text-2xl font-bold text-warning">{payroll.leave_days}</div>
                <div className="text-xs text-muted-foreground">Leave</div>
              </div>
              <div className="bg-info/10 p-3 rounded-lg text-center">
                <div className="text-2xl font-bold text-info">{payroll.holiday_days}</div>
                <div className="text-xs text-muted-foreground">Holiday</div>
              </div>
            </div>
          </div>

          {/* Right: Salary Breakdown */}
          <div className="salary-breakdown print:page-break-inside-avoid">
            <h2 className="text-lg font-semibold mb-4 text-muted-foreground">Salary Breakdown</h2>
            <div className="bg-gradient-to-br from-muted/10 to-muted/5 p-5 rounded-xl border border-border/50 space-y-2 print:bg-gray-50 print:border-gray-300">
              {/* Base Salary */}
              <div className="flex items-center justify-between py-2 px-3 bg-background/50 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="w-1.5 h-1.5 bg-primary/60 rounded-full"></div>
                  <span className="text-sm font-medium text-foreground">Base Salary</span>
                </div>
                <span className="text-sm font-semibold text-foreground">
                  PKR {Math.round(Number(payroll.base_salary)).toLocaleString()}
                </span>
              </div>

              {/* Overtime Pay */}
              {payroll.overtime_hours > 0 && (
                <div className="flex items-center justify-between py-2 px-3 bg-background/50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-1.5 h-1.5 bg-emerald-500/60 rounded-full"></div>
                    <div>
                      <span className="text-sm font-medium text-foreground">Overtime Pay</span>
                      <div className="text-xs text-muted-foreground/80">
                        {payroll.overtime_hours}hrs @ PKR {Math.round(payroll.overtime_rate || ((payroll.base_salary / (daysInMonth * 8)) * 1.5))}/hr
                      </div>
                    </div>
                  </div>
                  <span className="text-sm font-semibold text-emerald-600">
                    +PKR {Math.round(Number(payroll.overtime_pay)).toLocaleString()}
                  </span>
                </div>
              )}

              {/* Undertime Deduction */}
              {payroll.absence_deduction > 0 && (
                <div className="flex items-center justify-between py-2 px-3 bg-background/50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-1.5 h-1.5 bg-rose-500/60 rounded-full"></div>
                    <span className="text-sm font-medium text-foreground">Undertime Deduction</span>
                  </div>
                  <span className="text-sm font-semibold text-rose-600">
                    -PKR {Math.round(Number(payroll.absence_deduction)).toLocaleString()}
                  </span>
                </div>
              )}

              {/* Advance Deductions */}
              {advancesData.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center gap-3 px-3 py-1">
                    <div className="w-1.5 h-1.5 bg-amber-500/60 rounded-full"></div>
                    <span className="text-sm font-medium text-foreground">Advance Deductions</span>
                  </div>
                  <div className="space-y-1 ml-6">
                    {advancesData.map((advance: any, index: number) => (
                      <div key={advance.id} className="flex items-center justify-between text-xs py-1 px-2 bg-muted/30 rounded">
                        <span className="text-muted-foreground">
                          {new Date(advance.advance_date).toLocaleDateString('en-US', { 
                            month: 'short', 
                            day: 'numeric' 
                          })} - {advance.notes || 'Advance'}
                        </span>
                        <span className="font-medium text-amber-600">
                          -PKR {Math.round(Number(advance.amount)).toLocaleString()}
                        </span>
                      </div>
                    ))}
                    <div className="flex items-center justify-between py-1 px-2 bg-muted/50 rounded font-medium text-xs">
                      <span className="text-foreground">Total Advances</span>
                      <span className="text-amber-600">
                        -PKR {Math.round(advancesData.reduce((sum: number, advance: any) => sum + Number(advance.amount), 0)).toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Final Salary */}
              <div className="flex items-center justify-between py-3 px-3 bg-gradient-to-r from-primary/5 to-primary/10 rounded-lg border border-primary/20">
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 bg-primary/70 rounded-full"></div>
                  <span className="text-base font-semibold text-foreground">Final Salary</span>
                </div>
                <span className="text-lg font-bold text-primary">
                  PKR {Math.round(Number(payroll.final_salary)).toLocaleString()}
                </span>
              </div>

              {/* Payment History */}
              {paymentsData.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center gap-3 px-3 py-1">
                    <div className="w-1.5 h-1.5 bg-blue-500/60 rounded-full"></div>
                    <span className="text-sm font-medium text-foreground">Payment History</span>
                  </div>
                  <div className="space-y-1 ml-6">
                    {paymentsData.map((payment: any, index: number) => (
                      <div key={payment.id} className="flex items-center justify-between text-xs py-1 px-2 bg-muted/30 rounded">
                        <span className="text-muted-foreground">
                          {new Date(payment.payment_date).toLocaleDateString('en-US', { 
                            month: 'short', 
                            day: 'numeric' 
                          })} - {payment.notes || 'Payment'}
                        </span>
                        <span className="font-medium text-emerald-600">
                          +PKR {Math.round(Number(payment.amount)).toLocaleString()}
                        </span>
                      </div>
                    ))}
                    <div className="flex items-center justify-between py-1 px-2 bg-muted/50 rounded font-medium text-xs">
                      <span className="text-foreground">Total Paid</span>
                      <span className="text-emerald-600">
                        PKR {Math.round(paymentsData.reduce((sum: number, payment: any) => sum + Number(payment.amount), 0)).toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Remaining Balance (Due/Overpaid) */}
              <div className="flex items-center justify-between py-3 px-3 bg-gradient-to-r from-muted/20 to-muted/10 rounded-lg border border-border/50">
                <div className="flex items-center gap-3">
                  <div className={`w-2 h-2 rounded-full ${balanceDisplay === 0 ? "bg-emerald-500/70" : balanceDisplay > 0 ? "bg-amber-500/70" : "bg-blue-500/70"}`}></div>
                  <span className="text-base font-semibold text-foreground">{balanceDisplay < 0 ? "Overpaid" : balanceDisplay === 0 ? "Settled" : "Remaining Balance"}</span>
                </div>
                <span className={`text-lg font-bold ${balanceDisplay === 0 ? "text-emerald-600" : balanceDisplay > 0 ? "text-amber-600" : "text-blue-600"}`}>
                  {balanceDisplay < 0 ? "-" : ""}PKR {Math.abs(balanceDisplay).toLocaleString()}
                </span>
              </div>

              {/* Recovery Action for Overpayment */}
              {balanceDisplay < 0 && (
                <div className="flex items-center justify-between py-2 gap-3 print:hidden">
                  {!recoveryAdvance ? (
                    <>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <CalendarCheck className="h-4 w-4 text-blue-500" />
                        <span>Schedule recovery as next-month advance</span>
                      </div>
                      <Button size="sm" variant="outline" onClick={handleCreateRecoveryAdvance} disabled={addAdvance.isPending || isLoadingRecovery} className="h-8 px-3 text-sm">
                        {addAdvance.isPending ? "Creating..." : "Recover Next Month"}
                      </Button>
                    </>
                  ) : (
                    <div className="w-full flex items-center justify-between gap-3 p-2 rounded-md bg-blue-50 border border-blue-200 print:hidden">
                      <div className="flex items-center gap-2 text-xs text-blue-700">
                        <CalendarCheck className="h-4 w-4" />
                        <span>
                          Overpaid amount will be recovered in {monthNames[nextMonth - 1]} {nextYear}
                        </span>
                      </div>
                      <Button size="sm" variant="ghost" onClick={handleUndoRecoveryAdvance} className="h-7 px-2 text-xs text-blue-700 dark:text-blue-300 hover:text-blue-800 dark:hover:text-blue-200 hover:bg-blue-100 dark:hover:bg-blue-900/30 gap-1">
                        <Undo2 className="h-4 w-4" /> Undo
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer with Signature */}
        <div className="border-t border-border p-4 sm:p-6 lg:p-8 signature-area print:page-break-inside-avoid print:mt-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 sm:gap-8 mb-4 sm:mb-6">
            <div>
              <div className="border-t-2 border-foreground/20 pt-2 mt-8 sm:mt-12">
                <div className="text-xs sm:text-sm text-muted-foreground">Prepared By</div>
                <div className="font-semibold text-sm sm:text-base">HR Department</div>
              </div>
            </div>
            <div>
              <div className="border-t-2 border-foreground/20 pt-2 mt-8 sm:mt-12">
                <div className="text-xs sm:text-sm text-muted-foreground">Verified By</div>
                <div className="font-semibold text-sm sm:text-base">Finance Department</div>
              </div>
            </div>
            <div>
              <div className="border-t-2 border-foreground/20 pt-2 mt-8 sm:mt-12">
                <div className="text-xs sm:text-sm text-muted-foreground">Employee Signature</div>
                <div className="font-semibold text-sm sm:text-base truncate">{employee.name}</div>
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-2">
            <div className="text-xs text-muted-foreground/40 text-center sm:text-left">
              Developed by Shahzaib
            </div>
            <div className="flex gap-2 print:hidden w-full sm:w-auto">
              <Button
                size="sm"
                variant="outline"
                onClick={() => window.print()}
                className="gap-2 hover:bg-primary hover:text-primary-foreground transition-all duration-300 w-full sm:w-auto"
              >
                <Printer className="h-4 w-4" />
                <span className="hidden sm:inline">Print Wage Card</span>
                <span className="sm:hidden">Print</span>
              </Button>
            </div>
          </div>
        </div>
      </Card>
    </motion.div>
  );
}