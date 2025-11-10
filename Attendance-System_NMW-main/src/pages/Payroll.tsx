import { motion } from "framer-motion";
import { Receipt, Download, Eye, DollarSign, CheckCircle, XCircle, Edit as EditIcon, Trash2, MoreHorizontal, Plus, Edit } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useState, useMemo, useEffect, memo } from "react";
import { useMonthlyPayroll, useUpdateAdvance, useAddAdvance, useDeleteAdvance, useUpdatePayrollStatus, useAddPayment, useUpdatePayment, useDeletePayment, useEmployeeAdvances } from "@/hooks/usePayroll";
import { useEmployees } from "@/hooks/useEmployees";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import WageCard from "@/components/WageCard";
import GeneratePayrollDialog from "@/components/GeneratePayrollDialog";
import DepartmentRulesDialog from "@/components/DepartmentRulesDialog";
import { exportPayrollToExcel } from "@/utils/excelGenerator";
import { toast } from "sonner";
import { format } from "date-fns";
import { SalaryCalculationService } from "@/services/salaryCalculationService";

// Version: Floor display fix - remaining balance shows floored value (discards decimal)

// Advance Dialog Content Component
const AdvanceDialogContent = memo(({ 
  payroll, 
  month, 
  year, 
  advanceAmount, 
  setAdvanceAmount, 
  handleAdvanceUpdate, 
  addAdvance, 
  deleteAdvance,
  setAdvanceDialogOpen
}: { 
  payroll: any; 
  month: number; 
  year: number; 
  advanceAmount: string; 
  setAdvanceAmount: (val: string) => void; 
  handleAdvanceUpdate: () => void; 
  addAdvance: any; 
  deleteAdvance: any;
  setAdvanceDialogOpen: (val: boolean) => void;
}) => {
  const { data: advancesData = [] } = useEmployeeAdvances(payroll.employee_id, month, year);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleDeleteAdvance = async (advanceId: string) => {
    setDeletingId(advanceId);
    try {
      await deleteAdvance.mutateAsync({ advanceId });
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="space-y-4 py-4">
      <div>
        <div className="font-semibold text-lg">{payroll.employees?.name}</div>
        <div className="text-sm text-muted-foreground">
          {payroll.employees?.employee_id} • {payroll.employees?.department}
        </div>
      </div>

      {/* Existing Advances List */}
      {advancesData.length > 0 && (
        <div className="space-y-2">
          <Label className="text-sm font-medium">Current Advances for {month}/{year}</Label>
          <div className="border rounded-lg divide-y max-h-48 overflow-y-auto">
            {advancesData.map((advance: any) => (
              <div key={advance.id} className="flex items-center justify-between p-3 hover:bg-muted/50 transition-colors">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-amber-600">
                      PKR {Math.round(Number(advance.amount)).toLocaleString()}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {new Date(advance.advance_date).toLocaleDateString('en-US', { 
                        month: 'short', 
                        day: 'numeric',
                        year: 'numeric'
                      })}
                    </span>
                  </div>
                  {advance.notes && (
                    <div className="text-xs text-muted-foreground mt-1">
                      {advance.notes}
                    </div>
                  )}
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                  onClick={() => handleDeleteAdvance(advance.id)}
                  disabled={deletingId === advance.id || deleteAdvance.isPending}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
          <div className="flex items-center justify-between p-3 bg-amber-50 dark:bg-amber-950/20 rounded-lg border border-amber-200 dark:border-amber-800">
            <span className="text-sm font-medium">Total Advances:</span>
            <span className="font-bold text-amber-600">
              PKR {advancesData.reduce((sum: number, adv: any) => sum + Number(adv.amount), 0).toLocaleString()}
            </span>
          </div>
        </div>
      )}

      <div className="border-t pt-4">
        <div className="space-y-2">
          <Label htmlFor="advance-amount">Add New Advance (PKR)</Label>
          <Input
            id="advance-amount"
            type="number"
            value={advanceAmount}
            onChange={(e) => setAdvanceAmount(e.target.value)}
            placeholder="Enter advance amount"
          />
          <p className="text-xs text-warning font-medium">
            Note: Advance will be recorded for today's date and automatically deducted from salary
          </p>
        </div>
      </div>

      <div className="flex gap-2">
        <Button
          variant="outline"
          onClick={() => setAdvanceDialogOpen(false)}
          className="flex-1"
        >
          Cancel
        </Button>
        <Button
          onClick={handleAdvanceUpdate}
          disabled={!advanceAmount || addAdvance.isPending}
          className="flex-1 bg-gradient-hero"
        >
          {addAdvance.isPending ? "Adding..." : "Add Advance"}
        </Button>
      </div>
    </div>
  );
});

export default function Payroll() {
  const currentMonth = new Date().getMonth() + 1;
  const currentYear = new Date().getFullYear();
  const [selectedMonth, setSelectedMonth] = useState(currentMonth);
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const { data: payrollData = [], isLoading } = useMonthlyPayroll(selectedMonth, selectedYear);
  const [search, setSearch] = useState("");
  const updateAdvance = useUpdateAdvance();
  const addAdvance = useAddAdvance();
  const deleteAdvance = useDeleteAdvance();
  const updatePayrollStatus = useUpdatePayrollStatus();
  const addPayment = useAddPayment();
  const updatePayment = useUpdatePayment();
  const deletePayment = useDeletePayment();

  // Get all payments for the selected month and year
  const payrollIds = useMemo(() => payrollData.map(p => p.id).sort(), [payrollData]);
  const payrollIdsKey = useMemo(() => payrollIds.join(","), [payrollIds]);
  
  const { data: allPayments = [], isLoading: paymentsLoading, refetch: refetchPayments } = useQuery({
    queryKey: ["all-payments", selectedMonth, selectedYear, payrollIdsKey],
    queryFn: async () => {
      if (!payrollIds || payrollIds.length === 0) {
        return [];
      }
      
      const { data, error } = await supabase
        .from("payments")
        .select("*")
        .in("payroll_id", payrollIds)
        .order("payment_date", { ascending: true });

      if (error) {
        throw error;
      }
      
      return data || [];
    },
    enabled: payrollIds.length > 0,
    // Use default caching from App.tsx - realtime subscriptions handle updates
    staleTime: 1000 * 60 * 5, // 5 minutes (overrides only when needed)
  });

  // Create a map of payroll ID to payments
  const allPaymentsData = useMemo(() => {
    const paymentsMap = new Map();
    allPayments.forEach((payment: any) => {
      if (!paymentsMap.has(payment.payroll_id)) {
        paymentsMap.set(payment.payroll_id, []);
      }
      paymentsMap.get(payment.payroll_id).push(payment);
    });
    return paymentsMap;
  }, [allPayments, payrollIds]);

  const [selectedPayroll, setSelectedPayroll] = useState<any>(null);
  const [wageDialogOpen, setWageDialogOpen] = useState(false);
  const [generateDialogOpen, setGenerateDialogOpen] = useState(false);
  const [advanceDialogOpen, setAdvanceDialogOpen] = useState(false);
  const [departmentRulesOpen, setDepartmentRulesOpen] = useState(false);
  const [selectedPayrollForAdvance, setSelectedPayrollForAdvance] = useState<any>(null);
  const [advanceAmount, setAdvanceAmount] = useState<string>("");
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [selectedPayrollForPayment, setSelectedPayrollForPayment] = useState<any>(null);
  const [paymentAmount, setPaymentAmount] = useState<string>("");
  const [paymentDate, setPaymentDate] = useState<string>(new Date().toISOString().split("T")[0]);
  const [editingPayment, setEditingPayment] = useState<any>(null);

  const totalPayroll = Math.round(payrollData.reduce((sum: number, p: any) => sum + Number(p.final_salary || 0), 0));
  const totalDeductions = Math.round(payrollData.reduce((sum: number, p: any) => sum + Number(p.absence_deduction || 0) + Number(p.advance_amount || 0), 0));
  const totalOvertime = Math.round(payrollData.reduce((sum: number, p: any) => sum + Number(p.overtime_pay || 0), 0));
  const totalUndertimeDeductions = Math.round(payrollData.reduce((sum: number, p: any) => sum + Number(p.absence_deduction || 0), 0));
  const totalAdvanceDeductions = Math.round(payrollData.reduce((sum: number, p: any) => sum + Number(p.advance_amount || 0), 0));

  const handleAdvanceUpdate = async () => {
    if (!selectedPayrollForAdvance || !advanceAmount) return;
    
    const newAdvanceAmount = Math.round(Number(advanceAmount)); // Round off amount
    
    try {
      // Calculate available salary based on days worked up to current date
      const availableSalary = await calculateAvailableSalary(selectedPayrollForAdvance);
      
      // Validate that advance doesn't exceed available salary
      if (newAdvanceAmount > availableSalary) {
        alert(`Advance amount (${newAdvanceAmount.toLocaleString()}) cannot exceed available salary (${Math.round(availableSalary).toLocaleString()})`);
        return;
      }
      
      // Add the advance to the advances table with current date
      await addAdvance.mutateAsync({
        employeeId: selectedPayrollForAdvance.employee_id,
        amount: newAdvanceAmount,
        notes: `Advance for ${selectedPayrollForAdvance.employees?.name}`,
        advanceDate: new Date().toISOString().split("T")[0]
      });
      
      setAdvanceDialogOpen(false);
      setSelectedPayrollForAdvance(null);
      setAdvanceAmount("");
    } catch (error: any) {
      console.error("Error calculating available salary:", error);
      toast.error("Failed to calculate available salary. Please try again.");
    }
  };

  const calculateAvailableSalary = async (payroll: any) => {
    try {
      // Recalculate using fresh DB data for attendance and advances
      const today = new Date();
      const targetMonth = payroll.month || today.getMonth() + 1;
      const targetYear = payroll.year || today.getFullYear();

      const startDate = new Date(targetYear, targetMonth - 1, 1).toISOString().split("T")[0];
      const endDate = new Date(targetYear, targetMonth, 0).toISOString().split("T")[0];

      // Fetch attendance for the employee for the month
      const { data: attendanceData } = await supabase
        .from("attendance")
        .select("*")
        .eq("employee_id", payroll.employee_id)
        .gte("attendance_date", startDate)
        .lte("attendance_date", endDate);

      // Sum advances for the month
      const { data: advancesData } = await supabase
        .from("advances")
        .select("amount")
        .eq("employee_id", payroll.employee_id)
        .gte("advance_date", startDate)
        .lte("advance_date", endDate);

      const totalAdvanceAmount = (advancesData || []).reduce((sum: number, a: any) => sum + Number(a.amount), 0);

      const result = await SalaryCalculationService.calculateSalary({
        employee_id: payroll.employee_id,
        base_salary: payroll.base_salary,
        overtime_rate: payroll.overtime_rate,
        month: targetMonth,
        year: targetYear,
        attendance_data: attendanceData || [],
        advance_amount: totalAdvanceAmount,
      });

      return Math.max(0, Math.round(result.final_salary));
    } catch (error) {
      console.error("Error calculating available salary:", error);
      // Fallback to stored final_salary
      return Math.max(0, Math.round(payroll.final_salary || 0));
    }
  };

  const openAdvanceDialog = (payroll: any) => {
    setSelectedPayrollForAdvance(payroll);
    setAdvanceAmount(payroll.advance_amount?.toString() || "");
    setAdvanceDialogOpen(true);
  };

  const handlePayment = async (payroll: any) => {
    const amount = Number(paymentAmount);
    if (amount <= 0 || isNaN(amount)) {
      toast.error("Please enter a valid payment amount");
      return;
    }

    // Prevent overpayment on client side (allow up to final_salary, even if already overpaid)
    const existingPayments = allPaymentsData.get(payroll.id) || [];
    // Round totalPaid to 2 decimal places to avoid floating point precision issues
    const totalPaid = Math.round(existingPayments.reduce((sum: number, p: any) => sum + Number(p.amount || 0), 0) * 100) / 100;
    // Calculate accurately without rounding final_salary first
    const finalSalary = Number(payroll.final_salary || 0);
    const remaining = finalSalary - totalPaid;
    
    // Floor the remaining balance (discard decimal amount)
    const flooredRemaining = Math.floor(Math.max(0, remaining));
    
    // Round amount to 2 decimal places
    const roundedAmount = Math.round(amount * 100) / 100;
    
    // Allow payment if amount is less than or equal to floored remaining balance
    if (roundedAmount > flooredRemaining) {
      toast.error(`Payment would exceed remaining salary. Max remaining: ${flooredRemaining}`);
      return;
    }

    // CRITICAL: Use payroll's month/year, not selected month/year from UI
    // This ensures payment is associated with the correct payroll period
    const payrollMonth = payroll.month || selectedMonth;
    const payrollYear = payroll.year || selectedYear;
    
    await addPayment.mutateAsync({
      employeeId: payroll.employee_id,
      amount: roundedAmount, // Use rounded amount to avoid floating point precision issues
      paymentDate: paymentDate,
      notes: `Payment for ${payroll.employees?.name}`,
      month: payrollMonth,
      year: payrollYear,
      payrollId: payroll.id
    });

    // Force immediate refetch of payments to ensure UI updates
    setTimeout(() => {
      refetchPayments();
    }, 100);

    setPaymentDialogOpen(false);
    setSelectedPayrollForPayment(null);
    setPaymentAmount("");
    setPaymentDate(new Date().toISOString().split("T")[0]);
  };

  const openPaymentDialog = (payroll: any) => {
    setSelectedPayrollForPayment(payroll);
    setPaymentDialogOpen(true);
    setEditingPayment(null);
    setPaymentAmount("");
  };

  const openEditPaymentDialog = (payroll: any, payment: any) => {
    // Allow editing payments even if balance is settled/overpaid (to reduce or correct amounts)
    // Database trigger prevents net overpayment, so total payments cannot exceed final_salary
    setSelectedPayrollForPayment(payroll);
    setPaymentDialogOpen(true);
    setEditingPayment(payment);
    setPaymentAmount(String(Number(payment.amount || 0).toFixed(2)));
    setPaymentDate(payment.payment_date?.slice(0,10) || new Date().toISOString().split("T")[0]);
  };


  // Helper component for dialogs to get real-time payment data from database
  const PaymentDataProvider = memo(({ payroll, excludePaymentId, children }: { payroll: any; excludePaymentId?: string; children: (data: { totalPaid: number; remainingBalance: number; remainingBalanceDisplay: number }) => React.ReactNode }) => {
    const payments = allPaymentsData.get(payroll.id) || [];
    const paymentsExcluding = excludePaymentId 
      ? payments.filter((p: any) => p.id !== excludePaymentId)
      : payments;
    const totalPaid = paymentsExcluding.reduce((sum: number, payment: any) => sum + Number(payment.amount || 0), 0);
    // Calculate remaining balance accurately (without rounding final_salary first)
    const finalSalary = Number(payroll.final_salary || 0);
    const remainingBalance = finalSalary - totalPaid;
    // Floor the remaining balance for display (discard decimal amount)
    const remainingBalanceDisplay = Math.floor(Math.max(0, remainingBalance));
    
    return <>{children({ totalPaid, remainingBalance, remainingBalanceDisplay })}</>;
  });

  // Component to display payroll row with real-time payment data
  const PayrollRow = memo(({ payroll, payments }: { payroll: any; payments: any[] }) => {
    // Debug logging
    useEffect(() => {
      if (payments.length > 0) {
        console.log(`💳 Employee ${payroll.employees?.name} (${payroll.id}): ${payments.length} payments`);
      }
    }, [payments.length, payroll.id, payroll.employees?.name]);
    
    const paymentData = useMemo(() => {
      const totalPaid = payments.reduce((sum: number, payment: any) => sum + Number(payment.amount || 0), 0);
      // Calculate remaining balance accurately (without rounding final_salary first)
      const finalSalary = Number(payroll.final_salary || 0);
      const remainingBalance = finalSalary - totalPaid;
      // Floor the remaining balance for display (discard decimal amount)
      const remainingBalanceDisplay = Math.floor(Math.max(0, remainingBalance));
      return { totalPaid, remainingBalance, remainingBalanceDisplay };
    }, [payments, payroll.final_salary]);

    return (
      <div
        key={`payroll-${payroll.id}`}
        className="p-6 rounded-lg border border-border hover:shadow-strong hover:scale-105 hover:border-primary/50 transition-all duration-300 cursor-pointer group"
      >
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-gradient-primary flex items-center justify-center text-white font-bold group-hover:scale-110 group-hover:rotate-12 transition-all duration-300">
              {payroll.employees?.name.split(" ").map((n: string) => n[0]).join("")}
            </div>
            <div>
              <div className="font-semibold text-lg group-hover:text-primary transition-colors duration-300">{payroll.employees?.name}</div>
              <div className="text-sm text-muted-foreground group-hover:text-foreground transition-colors duration-300">
                {payroll.employees?.employee_id} • {payroll.employees?.department}
              </div>
            </div>
          </div>
          <Badge className={`group-hover:scale-110 transition-all duration-300 ${
            paymentData.remainingBalanceDisplay === 0 
              ? "bg-success/10 text-success border-success/20 group-hover:bg-success/20" 
              : paymentData.remainingBalance < 0 
              ? "bg-destructive/10 text-destructive border-destructive/20 group-hover:bg-destructive/20"
              : "bg-warning/10 text-warning border-warning/20 group-hover:bg-warning/20"
          }`}>
            {paymentData.remainingBalanceDisplay === 0 ? "Paid" : paymentData.remainingBalance < 0 ? "Overpaid" : "Pending"}
          </Badge>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-7 gap-2 md:gap-4 mb-4">
          <div className="group-hover:bg-muted/30 p-2 rounded-lg transition-all duration-300">
            <div className="text-xs text-muted-foreground mb-1 group-hover:text-foreground transition-colors duration-300">Base Salary</div>
            <div className="font-semibold group-hover:scale-105 transition-transform duration-300">PKR {Math.round(Number(payroll.base_salary)).toLocaleString()}</div>
          </div>
          <div className="group-hover:bg-muted/30 p-2 rounded-lg transition-all duration-300">
            <div className="text-xs text-muted-foreground mb-1 group-hover:text-foreground transition-colors duration-300">Undertime Deduction</div>
            <div className="font-semibold text-destructive group-hover:scale-105 transition-transform duration-300">-{Math.round(Number(payroll.absence_deduction)).toLocaleString()}</div>
          </div>
          <div className="group-hover:bg-muted/30 p-2 rounded-lg transition-all duration-300">
            <div className="text-xs text-muted-foreground mb-1 group-hover:text-foreground transition-colors duration-300">Overtime</div>
            <div className="font-semibold text-success group-hover:scale-105 transition-transform duration-300">+{Math.round(Number(payroll.overtime_pay || 0)).toLocaleString()}</div>
          </div>
          <div className="group-hover:bg-muted/30 p-2 rounded-lg transition-all duration-300">
            <div className="text-xs text-muted-foreground mb-1 group-hover:text-foreground transition-colors duration-300">Advance Deduction</div>
            <div className="font-semibold text-destructive group-hover:scale-105 transition-transform duration-300">-{Math.round(Number(payroll.advance_amount || 0)).toLocaleString()}</div>
          </div>
          <div className="group-hover:bg-muted/30 p-2 rounded-lg transition-all duration-300">
            <div className="text-xs text-muted-foreground mb-1 group-hover:text-foreground transition-colors duration-300">Final Salary</div>
            <div className="font-bold text-lg group-hover:scale-105 transition-transform duration-300">PKR {Math.round(Number(payroll.final_salary)).toLocaleString()}</div>
          </div>
          <div className="group-hover:bg-muted/30 p-2 rounded-lg transition-all duration-300">
            <div className="text-xs text-muted-foreground mb-1 group-hover:text-foreground transition-colors duration-300">Total Paid</div>
            <div className="font-semibold text-success group-hover:scale-105 transition-transform duration-300">PKR {paymentData.totalPaid.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
          </div>
          <div className="group-hover:bg-muted/30 p-2 rounded-lg transition-all duration-300">
            <div className="text-xs text-muted-foreground mb-1 group-hover:text-foreground transition-colors duration-300">Remaining Balance</div>
            <div className={`font-bold text-lg group-hover:scale-105 transition-transform duration-300 ${
              paymentData.remainingBalanceDisplay === 0 
                ? 'text-success' 
                : paymentData.remainingBalance < 0 
                ? 'text-destructive' 
                : 'text-warning'
            }`}>
              PKR {paymentData.remainingBalanceDisplay.toLocaleString()}
            </div>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-2 pt-4 border-t border-border overflow-x-auto">
          <Button 
            type="button"
            variant="outline" 
            size="sm" 
            className="gap-2 hover:bg-primary hover:text-primary-foreground hover:scale-105 transition-all duration-300 justify-center whitespace-nowrap"
            onClick={() => {
              setSelectedPayroll(payroll);
              setWageDialogOpen(true);
            }}
          >
            <Eye className="h-4 w-4" />
            <span className="hidden sm:inline">View </span>Wage Card
          </Button>
            <div className="flex gap-2">
            
          </div>
          <Button 
            variant="outline" 
            size="sm" 
            className="gap-2 hover:bg-primary hover:text-primary-foreground hover:scale-105 transition-all duration-300 justify-center whitespace-nowrap"
            onClick={() => openAdvanceDialog(payroll)}
          >
            <DollarSign className="h-4 w-4" />
            <span className="hidden sm:inline">Give </span>Advance
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            className="gap-2 text-success border-success hover:bg-success hover:text-white hover:scale-105 transition-all duration-300 justify-center whitespace-nowrap"
            onClick={() => {
                if (paymentData.remainingBalanceDisplay <= 0) {
                  if (payments.length === 0) {
                    toast.error("No payments to edit.");
                    return;
                  }
                  const latest = payments[payments.length - 1];
                  openEditPaymentDialog(payroll, latest);
                } else {
                  openPaymentDialog(payroll);
                }
              }}
          >
            <CheckCircle className="h-4 w-4" />
            <span className="hidden lg:inline">{paymentData.remainingBalanceDisplay <= 0 ? "Edit" : "Record"} </span>Payment
          </Button>
        </div>

        {/* Payments list with edit/delete controls */}
        {payments.length > 0 ? (
          <div className="mt-4 pt-4 border-t border-border">
            <div className="text-sm font-medium mb-2">Payments ({payments.length})</div>
            <div className="space-y-2">
              {payments.map((p: any) => (
                <div key={p.id} className="flex items-center justify-between p-2 rounded-lg border border-border/60">
                  <div className="text-sm">
                    <span className="font-semibold">PKR {Math.round(Number(p.amount)).toLocaleString()}</span>
                    <span className="text-muted-foreground ml-2">
                      {new Date(p.payment_date).toLocaleDateString()}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openEditPaymentDialog(payroll, p)}
                      className="gap-1"
                    >
                      <EditIcon className="h-4 w-4" />
                      Edit
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-destructive border-destructive"
                      onClick={async () => {
                        if (confirm("Delete this payment? This cannot be undone.")) {
                          // CRITICAL: Use payroll's month/year, not selected month/year from UI
                          const payrollMonth = payroll.month || selectedMonth;
                          const payrollYear = payroll.year || selectedYear;
                          
                          await deletePayment.mutateAsync({ 
                            paymentId: p.id,
                            payrollId: payroll.id,
                            employeeId: payroll.employee_id,
                            month: payrollMonth,
                            year: payrollYear,
                          });
                          
                          // Force immediate refetch of payments to ensure UI updates
                          setTimeout(() => {
                            refetchPayments();
                          }, 100);
                        }
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="mt-4 pt-4 border-t border-border">
            <div className="text-xs text-muted-foreground italic">No payments recorded yet</div>
          </div>
        )}
      </div>
    );
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20 p-4 md:p-6 lg:p-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-6 md:mb-8"
      >
        <div className="flex flex-col gap-4 mb-6">
          <div>
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-2">Payroll</h1>
            <p className="text-muted-foreground text-xs sm:text-sm md:text-base">
              {new Date(selectedYear, selectedMonth - 1).toLocaleDateString("en-US", { 
                month: "long", 
                year: "numeric" 
              })} - Salary Processing
            </p>
          </div>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
            <div className="flex items-center gap-2 bg-muted/50 dark:bg-muted/80 rounded-lg px-2 sm:px-3 py-2 border border-border w-full sm:w-auto">
              <Label htmlFor="payroll-month" className="text-xs text-muted-foreground whitespace-nowrap shrink-0">Month:</Label>
              <Select value={selectedMonth.toString()} onValueChange={(v) => setSelectedMonth(Number(v))}>
                <SelectTrigger id="payroll-month" className="w-full sm:w-[130px] h-8 border-0 bg-transparent shadow-none focus:ring-0 px-2">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Array.from({ length: 12 }, (_, i) => (
                    <SelectItem key={i + 1} value={(i + 1).toString()}>
                      {new Date(currentYear, i).toLocaleDateString("en-US", { month: "long" })}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="w-px h-4 bg-border shrink-0" />
              <Label htmlFor="payroll-year" className="text-xs text-muted-foreground whitespace-nowrap shrink-0">Year:</Label>
              <Select value={selectedYear.toString()} onValueChange={(v) => setSelectedYear(Number(v))}>
                <SelectTrigger id="payroll-year" className="w-full sm:w-[85px] h-8 border-0 bg-transparent shadow-none focus:ring-0 px-2">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Array.from({ length: 5 }, (_, i) => {
                    const yearOption = currentYear - 2 + i;
                    return (
                      <SelectItem key={yearOption} value={yearOption.toString()}>
                        {yearOption}
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-wrap items-center gap-2 sm:gap-3">
              <Button 
                variant="outline" 
                size="sm"
                className="gap-2 hover:bg-primary hover:text-primary-foreground hover:scale-105 transition-all duration-300 flex-1 sm:flex-initial"
                onClick={() => exportPayrollToExcel(payrollData, selectedMonth, selectedYear)}
                disabled={payrollData.length === 0}
              >
                <Download className="h-4 w-4" />
                <span className="hidden xs:inline">Export All</span>
              </Button>
              {payrollData.some((p: any) => p.status === "pending") && (
                <Button 
                  variant="outline" 
                  size="sm"
                  className="gap-2 text-success border-success hover:bg-success hover:text-white hover:scale-105 transition-all duration-300 flex-1 sm:flex-initial text-xs sm:text-sm"
                  onClick={() => {
                    const pendingPayrolls = payrollData.filter((p: any) => p.status === "pending");
                    if (confirm(`Are you sure you want to mark all ${pendingPayrolls.length} pending payrolls as PAID?`)) {
                      pendingPayrolls.forEach((payroll: any) => {
                        updatePayrollStatus.mutateAsync({
                          payrollId: payroll.id,
                          status: "paid"
                        });
                      });
                    }
                  }}
                >
                  <CheckCircle className="h-4 w-4" />
                  <span className="hidden sm:inline">Mark All as Paid</span>
                  <span className="sm:hidden">Mark Paid</span>
                </Button>
              )}
              <Button 
                variant="outline"
                size="sm"
                onClick={() => setDepartmentRulesOpen(true)}
                className="hover:bg-primary hover:text-primary-foreground hover:scale-105 transition-all duration-300 flex-1 sm:flex-initial text-xs sm:text-sm"
              >
                <span className="hidden sm:inline">Department Rules</span>
                <span className="sm:hidden">Rules</span>
              </Button>
              <Button 
                size="sm"
                className="bg-gradient-hero shadow-medium hover:shadow-strong hover:scale-105 transition-all duration-300 flex-1 sm:flex-initial"
                onClick={() => setGenerateDialogOpen(true)}
              >
                <span className="hidden sm:inline">Process </span>Payroll
              </Button>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6 mb-6 md:mb-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="h-full"
        >
          <Card className="shadow-soft border-0 hover:shadow-strong hover:scale-105 transition-all duration-300 cursor-pointer group h-full flex flex-col">
            <CardHeader>
              <CardTitle className="text-sm font-medium text-muted-foreground group-hover:text-foreground transition-colors duration-300">
                Total Payroll
              </CardTitle>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col justify-between">
              <div className="text-3xl font-bold group-hover:scale-105 transition-transform duration-300">PKR {totalPayroll.toLocaleString()}</div>
              <p className="text-sm text-muted-foreground mt-1 group-hover:text-foreground transition-colors duration-300">For {payrollData.length} employees</p>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="h-full"
        >
          <Card className="shadow-soft border-0 hover:shadow-strong hover:scale-105 transition-all duration-300 cursor-pointer group h-full flex flex-col">
            <CardHeader>
              <CardTitle className="text-sm font-medium text-muted-foreground group-hover:text-foreground transition-colors duration-300">
                Total Deductions
              </CardTitle>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col justify-between">
              <div className="text-3xl font-bold text-destructive group-hover:scale-105 transition-transform duration-300">PKR {totalDeductions.toLocaleString()}</div>
              <div className="text-sm text-muted-foreground mt-1 group-hover:text-foreground transition-colors duration-300">
                <div className="flex justify-between">
                  <span>Undertime:</span>
                  <span>PKR {totalUndertimeDeductions.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span>Advances:</span>
                  <span>PKR {totalAdvanceDeductions.toLocaleString()}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="h-full"
        >
          <Card className="shadow-soft border-0 hover:shadow-strong hover:scale-105 transition-all duration-300 cursor-pointer group h-full flex flex-col">
            <CardHeader>
              <CardTitle className="text-sm font-medium text-muted-foreground group-hover:text-foreground transition-colors duration-300">
                Overtime Pay
              </CardTitle>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col justify-between">
              <div className="text-3xl font-bold text-success group-hover:scale-105 transition-transform duration-300">PKR {totalOvertime.toLocaleString()}</div>
              <p className="text-sm text-muted-foreground mt-1 group-hover:text-foreground transition-colors duration-300">Additional earnings</p>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Payroll List */}
      <div>
        <Card className="shadow-soft border-0">
          <CardHeader>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <CardTitle className="text-base sm:text-lg">Employee Salary Details</CardTitle>
              <div className="w-full sm:w-auto sm:max-w-sm">
                <Label htmlFor="payroll-search" className="sr-only">Search employee</Label>
                <Input
                  id="payroll-search"
                  placeholder="Search by name or ID"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full"
                />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8">
                <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
                Loading payroll data...
              </div>
            ) : payrollData.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No payroll data for this month. Generate payroll to get started.
              </div>
            ) : (
              <div className="space-y-4">
                {payrollData
                  .filter((p: any) => {
                    const term = search.trim().toLowerCase();
                    if (!term) return true;
                    const name = (p.employees?.name || "").toLowerCase();
                    const id = (p.employees?.employee_id || "").toLowerCase();
                    return name.includes(term) || id.includes(term);
                  })
                  .map((payroll: any, index: number) => (
                  <PayrollRow 
                    key={`payroll-row-${payroll.id}-${index}`} 
                    payroll={payroll} 
                    payments={allPaymentsData.get(payroll.id) || []} 
                  />
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <GeneratePayrollDialog 
        open={generateDialogOpen} 
        onOpenChange={setGenerateDialogOpen}
        month={selectedMonth}
        year={selectedYear}
      />

      {/* Advance Update Dialog */}
      <Dialog open={advanceDialogOpen} onOpenChange={setAdvanceDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Manage Advance Amounts</DialogTitle>
          </DialogHeader>
          {selectedPayrollForAdvance && (
            <AdvanceDialogContent 
              payroll={selectedPayrollForAdvance} 
              month={selectedMonth}
              year={selectedYear}
              advanceAmount={advanceAmount}
              setAdvanceAmount={setAdvanceAmount}
              handleAdvanceUpdate={handleAdvanceUpdate}
              addAdvance={addAdvance}
              deleteAdvance={deleteAdvance}
              setAdvanceDialogOpen={setAdvanceDialogOpen}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Payment Entry Dialog */}
      <Dialog open={paymentDialogOpen} onOpenChange={setPaymentDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader className="text-center pb-4">
            <DialogTitle className="text-2xl font-bold bg-gradient-primary bg-clip-text text-transparent">
              {editingPayment ? "Edit Payment" : "Record Payment"}
            </DialogTitle>
            <p className="text-sm text-muted-foreground">
              {editingPayment ? "Update the payment details" : "Enter the payment details for this employee"}
            </p>
          </DialogHeader>
          
          {selectedPayrollForPayment && (
            <div className="space-y-6">
              {/* Employee Info Card */}
              <div className="bg-gradient-to-r from-primary/5 to-primary/10 p-6 rounded-xl border border-primary/20">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-primary/20 rounded-full flex items-center justify-center">
                    <span className="text-lg font-bold text-primary">
                      {selectedPayrollForPayment.employees?.name?.charAt(0)}
                    </span>
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-lg">{selectedPayrollForPayment.employees?.name}</h3>
                    <p className="text-sm text-muted-foreground">
                      {selectedPayrollForPayment.employees?.employee_id} • {selectedPayrollForPayment.employees?.department}
                    </p>
                  </div>
                </div>
              </div>
              
              {/* Salary Summary Card */}
              <div className="bg-muted/30 p-6 rounded-xl border">
                <h4 className="font-semibold mb-4 text-center">Salary Summary</h4>
                <div className="grid grid-cols-1 gap-4">
                  <div className="flex justify-between items-center py-2 border-b border-border/50">
                    <span className="text-muted-foreground">Final Salary:</span>
                    <span className="font-semibold text-lg">PKR {Math.round(Number(selectedPayrollForPayment.final_salary)).toLocaleString()}</span>
                  </div>
                  <PaymentDataProvider payroll={selectedPayrollForPayment} excludePaymentId={editingPayment?.id}>
                    {({ totalPaid, remainingBalanceDisplay }) => (
                      <>
                        <div className="flex justify-between items-center py-2 border-b border-border/50">
                          <span className="text-muted-foreground">Total Paid:</span>
                          <span className="font-semibold text-lg text-success">PKR {totalPaid.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                        </div>
                        <div className="flex justify-between items-center py-3 bg-muted/50 rounded-lg px-4">
                          <span className="font-bold text-lg">Remaining Balance:</span>
                          <span className={`font-bold text-xl ${
                            remainingBalanceDisplay === 0 
                              ? 'text-success' 
                              : remainingBalanceDisplay < 0 
                              ? 'text-destructive' 
                              : 'text-warning'
                          }`}>
                            PKR {remainingBalanceDisplay.toLocaleString()}
                          </span>
                        </div>
                      </>
                    )}
                  </PaymentDataProvider>
                </div>
              </div>

              {/* Payment Form */}
              <div className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="paymentAmount" className="text-base font-medium">
                    Payment Amount (PKR)
                  </Label>
                  <div className="relative">
                    <Input
                      id="paymentAmount"
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="0.00"
                      value={paymentAmount}
                      onChange={(e) => setPaymentAmount(e.target.value)}
                      className="text-lg font-semibold pr-12"
                    />
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
                      PKR
                    </div>
                  </div>
                  <PaymentDataProvider payroll={selectedPayrollForPayment} excludePaymentId={editingPayment?.id}>
                    {({ remainingBalanceDisplay }) => {
                      return (
                        <div className="flex justify-between text-xs text-muted-foreground">
                          <span>Enter amount to pay</span>
                          <span>Max: PKR {remainingBalanceDisplay.toLocaleString()}</span>
                        </div>
                      );
                    }}
                  </PaymentDataProvider>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="paymentDate" className="text-base font-medium">
                    Payment Date
                  </Label>
                  <Input
                    id="paymentDate"
                    type="date"
                    value={paymentDate}
                    onChange={(e) => setPaymentDate(e.target.value)}
                    className="text-base"
                  />
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 pt-4">
                <Button 
                  variant="outline" 
                  onClick={() => setPaymentDialogOpen(false)}
                  className="flex-1 h-12 text-base"
                >
                  Cancel
                </Button>
                {editingPayment ? (
                  <Button 
                    onClick={async () => {
                      const amount = Number(paymentAmount);
                      if (amount <= 0 || isNaN(amount)) {
                        toast.error("Please enter a valid payment amount");
                        return;
                      }

                      // Overpayment check when editing (allow up to final_salary)
                      const payments = allPaymentsData.get(selectedPayrollForPayment.id) || [];
                      // Round totalPaidExcluding to 2 decimal places to avoid floating point precision issues
                      const totalPaidExcluding = Math.round(payments
                        .filter((p: any) => p.id !== editingPayment.id)
                        .reduce((s: number, p: any) => s + Number(p.amount || 0), 0) * 100) / 100;
                      // Calculate accurately without rounding final_salary first
                      const finalSalary = Number(selectedPayrollForPayment.final_salary || 0);
                      const remaining = finalSalary - totalPaidExcluding;
                      
                      // Floor the remaining balance (discard decimal amount)
                      const flooredRemaining = Math.floor(Math.max(0, remaining));
                      
                      // Round amount to 2 decimal places
                      const roundedAmount = Math.round(amount * 100) / 100;
                      
                      // Allow payment if amount is less than or equal to floored remaining balance
                      if (roundedAmount > flooredRemaining) {
                        toast.error(`Payment would exceed remaining salary. Max remaining: ${flooredRemaining}`);
                        return;
                      }

                      // CRITICAL: Use payroll's month/year, not selected month/year from UI
                      const payrollMonth = selectedPayrollForPayment.month || selectedMonth;
                      const payrollYear = selectedPayrollForPayment.year || selectedYear;
                      
                      await updatePayment.mutateAsync({
                        paymentId: editingPayment.id,
                        amount: roundedAmount, // Use rounded amount to avoid floating point precision issues
                        paymentDate,
                        notes: editingPayment.notes,
                        payrollId: selectedPayrollForPayment.id,
                        employeeId: selectedPayrollForPayment.employee_id,
                        month: payrollMonth,
                        year: payrollYear,
                      });
                      
                      // Force immediate refetch of payments to ensure UI updates
                      setTimeout(() => {
                        refetchPayments();
                      }, 100);
                      
                      setPaymentDialogOpen(false);
                      setEditingPayment(null);
                      setPaymentAmount("");
                    }}
                    disabled={updatePayment.isPending || !paymentAmount || Number(paymentAmount) <= 0}
                    className="flex-1 h-12 text-base bg-success hover:bg-success/90 disabled:opacity-50"
                  >
                    {updatePayment.isPending ? (
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                        Updating...
                      </div>
                    ) : (
                      "Update Payment"
                    )}
                  </Button>
                ) : (
                  <Button 
                    onClick={() => handlePayment(selectedPayrollForPayment)}
                    disabled={addPayment.isPending || !paymentAmount || Number(paymentAmount) <= 0}
                    className="flex-1 h-12 text-base bg-success hover:bg-success/90 disabled:opacity-50"
                  >
                    {addPayment.isPending ? (
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                        Recording...
                      </div>
                    ) : (
                      "Record Payment"
                    )}
                  </Button>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <DepartmentRulesDialog 
        open={departmentRulesOpen}
        onOpenChange={setDepartmentRulesOpen}
      />

      {/* Central Wage Card Dialog to avoid double-click and scroll jump */}
      <Dialog open={wageDialogOpen} onOpenChange={setWageDialogOpen}>
        <DialogContent className="max-w-7xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Wage Card</DialogTitle>
          </DialogHeader>
          {selectedPayroll && (
            <WageCard
              employee={selectedPayroll.employees}
              payroll={selectedPayroll}
              month={selectedPayroll.month || selectedMonth}
              year={selectedPayroll.year || selectedYear}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}