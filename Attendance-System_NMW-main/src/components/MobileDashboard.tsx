import { useState, useEffect } from "react";
import { Users, Calendar, DollarSign, TrendingUp, Fingerprint, AlertCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useEmployees } from "@/hooks/useEmployees";
import { useTodayAttendance } from "@/hooks/useAttendance";
import { useMonthlyPayroll } from "@/hooks/usePayroll";
import BiometricAttendanceDialog from "./BiometricAttendanceDialog";
import { isMobile } from "@/utils/mobileUtils";

export default function MobileDashboard() {
  const [biometricDialogOpen, setBiometricDialogOpen] = useState(false);
  const [mobileError, setMobileError] = useState<string | null>(null);
  const { data: employees = [] } = useEmployees();
  const { data: attendance = [] } = useTodayAttendance();
  const { data: payrollData = [] } = useMonthlyPayroll();

  const presentToday = attendance.filter((a: any) => a.status === "present").length;
  const attendancePercentage = employees.length > 0 
    ? Math.round((presentToday / employees.length) * 100)
    : 0;

  const totalPayroll = Math.round(payrollData.reduce((sum: number, p: any) => sum + Number(p.final_salary || 0), 0));

  // Mobile-specific error handling
  useEffect(() => {
    const handleMobileError = (error: any) => {
      console.error("Mobile error:", error);
      setMobileError("Mobile compatibility issue detected. Please try refreshing the page.");
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

  if (mobileError) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20 p-4">
        <div className="max-w-md mx-auto mt-20">
          <Alert className="border-destructive/20 bg-destructive/5">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="space-y-4">
              <div>
                <h3 className="font-semibold text-lg mb-2">Mobile Compatibility Issue</h3>
                <p className="text-sm">{mobileError}</p>
              </div>
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => window.location.reload()}
                >
                  Reload Page
                </Button>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setMobileError(null)}
                >
                  Try Again
                </Button>
              </div>
            </AlertDescription>
          </Alert>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20 p-4 md:p-8">
      {/* Header */}
      <div className="mb-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold mb-2">Dashboard</h1>
            <p className="text-muted-foreground">Welcome back! Here's what's happening today.</p>
          </div>
          <div className="flex flex-col sm:flex-row gap-2">
            <Button
              onClick={() => setBiometricDialogOpen(true)}
              className="bg-gradient-accent shadow-medium hover:shadow-strong transition-all"
            >
              <Fingerprint className="h-4 w-4 mr-2" />
              Biometric Attendance
            </Button>
          </div>
        </div>
      </div>

      {/* Mobile-specific alert */}
      {isMobile() && (
        <Alert className="border-info/20 bg-info/5 mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Mobile device detected. Some features may be limited. For best experience, use a desktop or tablet.
          </AlertDescription>
        </Alert>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {stats.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.title} className="overflow-hidden hover:shadow-strong transition-all duration-300 border-0 shadow-soft">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
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
          );
        })}
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
