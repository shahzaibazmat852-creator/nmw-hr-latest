import { motion } from "framer-motion";
import { Users, Calendar, DollarSign, TrendingUp, Fingerprint } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
// Charts removed per request
import { useEmployees } from "@/hooks/useEmployees";
import { useTodayAttendance } from "@/hooks/useAttendance";
import { useMonthlyPayroll } from "@/hooks/usePayroll";
import BiometricAttendanceDialog from "@/components/BiometricAttendanceDialog";
import MobileDashboard from "@/components/MobileDashboard";
import { useState, useEffect, useMemo } from "react";
import { isMobile } from "@/utils/mobileUtils";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "react-router-dom";
import { pageVariants, cardVariants, containerVariants, itemVariants, smoothSpring, smoothEase } from "@/lib/animations";

const departmentColors: Record<string, string> = {
  Enamel: "bg-primary",
  Workshop: "bg-accent",
  Guards: "bg-info",
  Cooks: "bg-warning",
  Admins: "bg-success",
  Directors: "bg-destructive",
};

export default function Dashboard() {
  const [biometricDialogOpen, setBiometricDialogOpen] = useState(false);
  const [isMobileDevice, setIsMobileDevice] = useState(false);
  const [expandedDepts, setExpandedDepts] = useState<Record<string, boolean>>({});
  const { data: employees = [] } = useEmployees();
  const { data: attendance = [] } = useTodayAttendance();
  const { data: payrollData = [] } = useMonthlyPayroll();
  const currentMonth = new Date().getMonth() + 1;
  const currentYear = new Date().getFullYear();
  const monthStart = useMemo(() => new Date(currentYear, currentMonth - 1, 1).toISOString().split("T")[0], [currentMonth, currentYear]);
  const monthEnd = useMemo(() => new Date(currentYear, currentMonth, 0).toISOString().split("T")[0], [currentMonth, currentYear]);

  const [mtdOvertimeHours, setMtdOvertimeHours] = useState(0);
  const [mtdUndertimeHours, setMtdUndertimeHours] = useState(0);
  const [mtdAdvances, setMtdAdvances] = useState(0);
  const [mtdPayments, setMtdPayments] = useState(0);
  const [overpaidCount, setOverpaidCount] = useState(0);
  const [underpaidCount, setUnderpaidCount] = useState(0);
  const [settledCount, setSettledCount] = useState(0);
  // Charts state removed

  const presentToday = attendance.filter((a: any) => a.status === "present").length;
  const attendancePercentage = employees.length > 0 
    ? Math.round((presentToday / employees.length) * 100)
    : 0;

  const totalPayroll = Math.round(payrollData.reduce((sum: number, p: any) => sum + Number(p.final_salary || 0), 0));

  // Month-to-date aggregates - OPTIMIZED: Parallel queries instead of sequential
  useEffect(() => {
    const loadMonthData = async () => {
      try {
        const activeEmployeeIds = (employees || []).map((e: any) => e.id);
        
        // OPTIMIZATION: Execute all three queries in parallel using Promise.all
        const [attResult, advResult, paysResult] = await Promise.all([
          // Attendance sums
          supabase
            .from("attendance")
            .select("overtime_hours, undertime_hours")
            .gte("attendance_date", monthStart)
            .lte("attendance_date", monthEnd),
          
          // Advances sum
          supabase
            .from("advances")
            .select("amount")
            .gte("advance_date", monthStart)
            .lte("advance_date", monthEnd)
            .in(activeEmployeeIds.length ? "employee_id" : "id", activeEmployeeIds.length ? activeEmployeeIds : [""]),
          
          // Payments sum
          supabase
            .from("payments")
            .select("payroll_id, amount")
            .gte("payment_date", monthStart)
            .lte("payment_date", monthEnd)
            .in(activeEmployeeIds.length ? "employee_id" : "id", activeEmployeeIds.length ? activeEmployeeIds : [""]),
        ]);

        // Process results
        const over = (attResult.data || []).reduce((s: number, a: any) => s + Number(a.overtime_hours || 0), 0);
        const under = (attResult.data || []).reduce((s: number, a: any) => s + Number(a.undertime_hours || 0), 0);
        setMtdOvertimeHours(Math.round(over));
        setMtdUndertimeHours(Math.round(under));

        const advSum = (advResult.data || []).reduce((s: number, v: any) => s + Number(v.amount || 0), 0);
        setMtdAdvances(Math.round(advSum));

        const paySum = (paysResult.data || []).reduce((s: number, p: any) => s + Number(p.amount || 0), 0);
        setMtdPayments(Math.round(paySum));

        // Overpaid/Underpaid/Settled counts by comparing payroll final_salary vs total payments per payroll_id
        const paymentsByPayroll = new Map<string, number>();
        (paysResult.data || []).forEach((p: any) => {
          const prev = paymentsByPayroll.get(p.payroll_id) || 0;
          paymentsByPayroll.set(p.payroll_id, prev + Number(p.amount || 0));
        });
        let overC = 0, underC = 0, setC = 0;
        (payrollData || []).forEach((pr: any) => {
          const paid = paymentsByPayroll.get(pr.id) || 0;
          const final = Math.round(Number(pr.final_salary || 0));
          if (paid > final) overC++;
          else if (paid === final) setC++;
          else underC++;
        });
        setOverpaidCount(overC);
        setUnderpaidCount(underC);
        setSettledCount(setC);
      } catch (e) {
        console.warn("Failed to load month data", e);
      }
    };
    
    // Only load if we have the prerequisite data
    if (employees.length > 0 && payrollData.length > 0) {
      loadMonthData();
    }
  }, [monthStart, monthEnd, payrollData, employees]);

  // Mobile detection and error handling
  useEffect(() => {
    try {
      setIsMobileDevice(isMobile());
    } catch (error) {
      console.warn("Mobile detection failed:", error);
      setIsMobileDevice(false);
    }
    
    // Mobile-specific error handling
    const handleMobileError = (error: any) => {
      console.error("Mobile error in Dashboard:", error);
    };
    
    window.addEventListener('error', handleMobileError);
    window.addEventListener('unhandledrejection', handleMobileError);
    
    return () => {
      window.removeEventListener('error', handleMobileError);
      window.removeEventListener('unhandledrejection', handleMobileError);
    };
  }, []);

  const stats = [
    {
      title: "Total Employees",
      value: employees.length.toString(),
      change: "Active employees",
      icon: Users,
      gradient: "bg-gradient-primary",
    },
    {
      title: "Present Today",
      value: presentToday.toString(),
      change: `${attendancePercentage}% attendance`,
      icon: Calendar,
      gradient: "bg-gradient-accent",
    },
    {
      title: "Monthly Payroll",
      value: `PKR ${totalPayroll.toLocaleString()}`,
      change: new Date().toLocaleDateString("en-US", { month: "long", year: "numeric" }),
      icon: DollarSign,
      gradient: "bg-gradient-hero",
    },
    {
      title: "Avg. Attendance",
      value: `${attendancePercentage}%`,
      change: "Current month",
      icon: TrendingUp,
      gradient: "bg-gradient-primary",
    },
  ];

  const departmentCounts = employees.reduce((acc: Record<string, number>, emp: any) => {
    acc[emp.department] = (acc[emp.department] || 0) + 1;
    return acc;
  }, {});

  // Sort departments by employee count (highest first)
  const departments = Object.entries(departmentCounts)
    .map(([name, count]) => ({
      name,
      count,
      color: departmentColors[name] || "bg-primary",
    }))
    .sort((a, b) => b.count - a.count);

  // Mobile-friendly dashboard - no component switching needed

  return (
    <div className={`min-h-screen bg-gradient-to-br from-background via-background to-muted/20 ${isMobileDevice ? 'p-4 pt-16' : 'p-4 md:p-6 lg:p-8'}`}>
      {/* Header */}
      <div className="mb-4 md:mb-6 lg:mb-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className={`font-bold mb-2 ${isMobileDevice ? 'text-2xl' : 'text-3xl md:text-4xl'}`}>Dashboard</h1>
            <p className="text-sm md:text-base text-muted-foreground">Welcome back! Here's what's happening today.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              onClick={() => {
                console.log("Biometric button clicked");
                setBiometricDialogOpen(true);
              }}
              className="bg-gradient-accent shadow-medium hover:shadow-strong transition-all"
            >
              <Fingerprint className="h-4 w-4 mr-2" />
              Biometric Attendance
            </Button>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 lg:gap-6 mb-4 md:mb-6 lg:mb-8">
        {stats.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <div key={stat.title}>
              <Card 
                className="overflow-hidden border-0 shadow-soft cursor-pointer group hover:shadow-strong transition-all duration-200"
                style={{
                  transform: 'translateZ(0)',
                }}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-medium text-muted-foreground group-hover:text-foreground transition-colors duration-200">
                      {stat.title}
                    </CardTitle>
                    <div className={`p-2 rounded-lg ${stat.gradient}`}>
                      <Icon className="h-4 w-4 text-white" />
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl md:text-3xl font-bold mb-1">{stat.value}</div>
                  <p className="text-xs text-muted-foreground">{stat.change}</p>
                </CardContent>
              </Card>
            </div>
          );
        })}
      </div>

      {/* MTD KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {[{
          title: "MTD Overtime Hours", value: `${mtdOvertimeHours}h`
        },{
          title: "MTD Undertime Hours", value: `${mtdUndertimeHours}h`
        },{
          title: "MTD Advances", value: `PKR ${mtdAdvances.toLocaleString()}`
        },{
          title: "MTD Payments", value: `PKR ${mtdPayments.toLocaleString()}`
        }].map((kpi, idx) => (
          <motion.div key={kpi.title} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.05 }}>
            <Card className="shadow-soft border-0 hover:shadow-strong hover:scale-105 transition-all duration-300 cursor-pointer group">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground group-hover:text-foreground transition-colors duration-300">{kpi.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold group-hover:scale-105 transition-transform duration-300">{kpi.value}</div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Department Summary */}
      <div className="grid grid-cols-1 gap-6 mb-8">
        <Card className="shadow-soft border-0">
          <CardHeader>
            <CardTitle>Department Overview</CardTitle>
            <p className="text-sm text-muted-foreground">Departments ranked by employee count</p>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              {departments.map((dept, index) => {
                const employeesInDept = employees.filter((e: any) => e.department === dept.name);
                const presentToday = attendance.filter((a: any) => 
                  employeesInDept.some((e: any) => e.id === a.employee_id && a.status === 'present')
                ).length;
                const attendanceRate = dept.count > 0 ? Math.round((presentToday / dept.count) * 100) : 0;
                
                return (
                  <motion.div
                    key={dept.name}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: index * 0.1 }}
                    className="text-center p-4 rounded-lg border border-border/50 hover:shadow-strong hover:border-primary/30 hover:scale-105 transition-all duration-300 cursor-pointer group"
                  >
                    <div className={`w-4 h-4 rounded-full ${dept.color} mx-auto mb-2 group-hover:scale-125 transition-transform duration-300`}></div>
                    <div className="text-lg font-bold group-hover:text-primary transition-colors duration-300">{dept.count}</div>
                    <div className="text-xs text-muted-foreground mb-1 group-hover:text-foreground transition-colors duration-300">{dept.name}</div>
                    <div className="text-xs font-medium text-primary group-hover:text-primary/80 transition-colors duration-300">{attendanceRate}% present</div>
                  </motion.div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Alerts */}
      <div className="grid grid-cols-1 gap-6 mb-8">
        <Card className="shadow-soft border-0 hover:shadow-strong transition-all duration-300">
          <CardHeader>
            <CardTitle>Payment Status Alerts</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div className="p-3 rounded-lg hover:bg-blue-50 hover:scale-105 transition-all duration-300 cursor-pointer group">
                <div className="text-xs text-muted-foreground mb-1 group-hover:text-blue-600 transition-colors duration-300">Overpaid</div>
                <div className="text-lg font-bold text-blue-600 group-hover:scale-110 transition-transform duration-300">{overpaidCount}</div>
              </div>
              <div className="p-3 rounded-lg hover:bg-emerald-50 hover:scale-105 transition-all duration-300 cursor-pointer group">
                <div className="text-xs text-muted-foreground mb-1 group-hover:text-emerald-600 transition-colors duration-300">Settled</div>
                <div className="text-lg font-bold text-emerald-600 group-hover:scale-110 transition-transform duration-300">{settledCount}</div>
              </div>
              <div className="p-3 rounded-lg hover:bg-amber-50 hover:scale-105 transition-all duration-300 cursor-pointer group">
                <div className="text-xs text-muted-foreground mb-1 group-hover:text-amber-600 transition-colors duration-300">Underpaid</div>
                <div className="text-lg font-bold text-amber-600 group-hover:scale-110 transition-transform duration-300">{underpaidCount}</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Removed the Today's Attendance bar */}

      {/* Department-wise Attendance (ordered by employee count) */}
      <div className="mt-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6"
        >
          <h2 className="text-2xl font-bold mb-2">Department Attendance</h2>
          <p className="text-muted-foreground">Today's attendance by department (ordered by size)</p>
        </motion.div>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {departments.map((dept, deptIndex) => {
            const employeesInDept = employees.filter((e: any) => e.department === dept.name);
            const todayMap = new Map<string, any>();
            attendance.forEach((a: any) => {
              if (employeesInDept.find((e: any) => e.id === a.employee_id)) {
                todayMap.set(a.employee_id, a);
              }
            });
            
            const records = employeesInDept.map((e: any) => {
              const attendanceRecord = todayMap.get(e.id);
              return {
                id: e.id,
                name: e.name,
                status: attendanceRecord?.status || 'absent',
                checkInTime: attendanceRecord?.check_in_time || null,
                checkOutTime: attendanceRecord?.check_out_time || null,
                biometricVerified: attendanceRecord?.biometric_verified || false,
              };
            });
            
            const presentCount = records.filter(r => r.status === 'present').length;
            const attendanceRate = employeesInDept.length > 0 ? Math.round((presentCount / employeesInDept.length) * 100) : 0;
            
            const expanded = !!expandedDepts[dept.name];
            const visible = expanded ? records : records.slice(0, 5);
            
            return (
              <motion.div
                key={dept.name}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: deptIndex * 0.1 }}
              >
                <Card className="shadow-soft border-0 hover:shadow-strong transition-all duration-300 group">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="flex items-center gap-2 group-hover:text-primary transition-colors duration-300">
                          <div className={`w-3 h-3 rounded-full ${dept.color} group-hover:scale-125 transition-transform duration-300`}></div>
                          {dept.name} Department
                        </CardTitle>
                        <p className="text-sm text-muted-foreground mt-1 group-hover:text-foreground transition-colors duration-300">
                          {dept.count} employees • {attendanceRate}% attendance today
                        </p>
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-bold text-primary group-hover:scale-110 transition-transform duration-300">{presentCount}</div>
                        <div className="text-xs text-muted-foreground group-hover:text-foreground transition-colors duration-300">Present</div>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {visible.length === 0 && (
                        <div className="text-sm text-muted-foreground text-center py-4">No employees in this department</div>
                      )}
                      {visible.map((r) => (
                        <div key={r.id} className="flex items-center justify-between py-2 border-b last:border-0 hover:bg-muted/30 rounded-lg px-2 -mx-2 transition-all duration-200 group/item">
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-sm truncate group-hover/item:text-primary transition-colors duration-200">{r.name}</div>
                            {r.status === 'present' && r.checkInTime && (
                              <div className="text-xs text-muted-foreground group-hover/item:text-foreground transition-colors duration-200">
                                In: {r.checkInTime} 
                                {r.checkOutTime && ` • Out: ${r.checkOutTime}`}
                                {r.biometricVerified && ' • 🔐'}
                              </div>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            {r.biometricVerified && r.status === 'present' && (
                              <Fingerprint className="h-3 w-3 text-green-600 dark:text-green-400" />
                            )}
                            <span className={`text-xs px-2 py-1 rounded-full font-medium transition-all duration-200 group-hover/item:scale-105 ${
                              r.status === 'present' 
                                ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 border border-green-200 dark:border-green-700 group-hover/item:bg-green-200 dark:group-hover/item:bg-green-900/50' 
                                : r.status === 'leave' 
                                ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300 border border-yellow-200 dark:border-yellow-700 group-hover/item:bg-yellow-200 dark:group-hover/item:bg-yellow-900/50' 
                                : r.status === 'holiday' 
                                ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-700 group-hover/item:bg-blue-200 dark:group-hover/item:bg-blue-900/50' 
                                : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-700 group-hover/item:bg-red-200 dark:group-hover/item:bg-red-900/50'
                            }`}>
                              {r.status === 'present' ? 'Present' : 
                               r.status === 'leave' ? 'On Leave' : 
                               r.status === 'holiday' ? 'Holiday' : 'Absent'}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                    {records.length > 5 && (
                      <div className="pt-3 border-t">
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => setExpandedDepts((prev) => ({ ...prev, [dept.name]: !expanded }))}
                          className="w-full hover:bg-primary hover:text-primary-foreground hover:scale-105 transition-all duration-300"
                        >
                          {expanded ? `Collapse (${records.length - 5} hidden)` : `View All ${records.length} Employees`}
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>
      </div>

        {/* Biometric Attendance Dialog */}
      <BiometricAttendanceDialog
        open={biometricDialogOpen}
        onOpenChange={(open) => {
          console.log("Biometric dialog open changed:", open);
          setBiometricDialogOpen(open);
        }}
        selectedDate={new Date().toISOString().split("T")[0]}
        />
      </div>
    );
  }
