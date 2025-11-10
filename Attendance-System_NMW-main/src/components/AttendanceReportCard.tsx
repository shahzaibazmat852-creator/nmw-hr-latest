import { motion } from "framer-motion";
import { CheckCircle2, XCircle, Coffee, PartyPopper, Calendar, Building2, Printer, Download } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Employee } from "@/hooks/useEmployees";

interface AttendanceRecord {
  attendance_date: string;
  status: "present" | "absent" | "leave" | "holiday";
  check_in_time?: string;
  check_out_time?: string;
  hours_worked?: number;
  notes?: string;
}

interface AttendanceReportCardProps {
  employee?: Employee;
  attendanceData: AttendanceRecord[];
  month: number;
  year: number;
  department?: string;
}

const statusIcons = {
  present: { icon: CheckCircle2, color: "text-success", bg: "bg-success/20", label: "Present" },
  absent: { icon: XCircle, color: "text-destructive", bg: "bg-destructive/20", label: "Absent" },
  leave: { icon: Coffee, color: "text-warning", bg: "bg-warning/20", label: "Leave" },
  holiday: { icon: PartyPopper, color: "text-info", bg: "bg-info/20", label: "Holiday" },
};

const monthNames = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

export default function AttendanceReportCard({ 
  employee, 
  attendanceData, 
  month, 
  year,
  department 
}: AttendanceReportCardProps) {
  const daysInMonth = new Date(year, month, 0).getDate();
  const firstDay = new Date(year, month - 1, 1).getDay();
  
  const attendanceMap = new Map(
    attendanceData.map(a => [new Date(a.attendance_date).getDate(), a])
  );

  const stats = {
    present: attendanceData.filter(a => a.status === "present").length,
    absent: attendanceData.filter(a => a.status === "absent").length,
    leave: attendanceData.filter(a => a.status === "leave").length,
    holiday: attendanceData.filter(a => a.status === "holiday").length,
  };

  const totalHours = attendanceData.reduce((sum, a) => sum + (a.hours_worked || 0), 0);

  const handlePrint = () => {
    window.print();
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="max-w-6xl mx-auto print:max-w-full print:scale-100 print:transform-none"
    >
      <Card className="shadow-strong border-0 overflow-hidden print:shadow-none print:border print:border-gray-300 print:overflow-visible print:bg-white">
        {/* Header */}
        <div className="bg-gradient-hero text-white p-6 relative overflow-hidden print:bg-white print:text-black print:p-3 print:overflow-visible print:border-b print:border-gray-300">
          <div className="absolute inset-0 opacity-10 print:hidden">
            <div className="absolute -right-10 -top-10 w-40 h-40 bg-white rounded-full" />
            <div className="absolute -left-10 -bottom-10 w-32 h-32 bg-white rounded-full" />
          </div>
          <div className="relative z-10">
            <h1 className="text-2xl font-bold mb-1 print:text-black print:text-xl print:mb-0.5">NMW Attendance Report</h1>
            <p className="text-white/80 print:text-gray-700 print:text-base">{monthNames[month - 1]} {year}</p>
            {employee && (
              <p className="text-white/90 mt-1 font-medium text-sm print:text-gray-800 print:text-sm print:mt-0.5">{employee.name} - {employee.employee_id}</p>
            )}
            {department && !employee && (
              <p className="text-white/90 mt-1 font-medium text-sm print:text-gray-800 print:text-sm print:mt-0.5">Department: {department}</p>
            )}
          </div>
        </div>

        {/* Employee Info (if single employee) */}
        {employee && (
          <div className="bg-muted/30 p-4 grid grid-cols-2 md:grid-cols-4 gap-3 print:bg-gray-50 print:p-2 print:gap-2">
            <div>
              <div className="text-xs text-muted-foreground mb-0.5 print:text-gray-600">Employee Name</div>
              <div className="font-semibold text-sm print:text-xs">{employee.name}</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground mb-0.5 print:text-gray-600">Employee ID</div>
              <div className="font-semibold text-sm print:text-xs">{employee.employee_id}</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground mb-0.5 print:text-gray-600">Department</div>
              <div className="font-semibold text-sm print:text-xs">{employee.department}</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground mb-0.5 print:text-gray-600">CNIC</div>
              <div className="font-semibold text-sm print:text-xs">{employee.cnic}</div>
            </div>
          </div>
        )}

        <div className="p-6 print:p-3">
          {/* Calendar View */}
          <div className="mb-6 print:mb-3">
            <h2 className="text-lg font-bold mb-3 flex items-center gap-1.5 print:text-base">
              <Calendar className="h-4 w-4 print:h-3 print:w-3" />
              Monthly Attendance Calendar
            </h2>
            <div className="bg-muted/20 p-3 rounded-lg print:bg-gray-50 print:p-2">
              {/* Calendar Header */}
              <div className="grid grid-cols-7 gap-1 mb-1.5 print:gap-0.5 print:mb-1">
                {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
                  <div key={day} className="text-center text-[10px] font-semibold text-muted-foreground print:text-[8px] print:text-gray-600">
                    {day}
                  </div>
                ))}
              </div>

              {/* Calendar Days */}
              <div className="grid grid-cols-7 gap-1 print:gap-0.5">
                {Array.from({ length: firstDay }).map((_, i) => (
                  <div key={`empty-${i}`} className="aspect-square" />
                ))}

                {Array.from({ length: daysInMonth }).map((_, i) => {
                  const day = i + 1;
                  const record = attendanceMap.get(day);
                  const config = record ? statusIcons[record.status] : null;
                  const Icon = config?.icon;
                  const isFriday = (firstDay + i) % 7 === 5;

                  return (
                    <motion.div
                      key={day}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: day * 0.01 }}
                      className={`aspect-square rounded-md flex flex-col items-center justify-center text-[9px] ${
                        config
                          ? config.bg + " print:bg-gray-200"
                          : isFriday
                          ? "bg-info/10 print:bg-gray-100"
                          : "bg-background border border-border print:border-gray-300"
                      }`}
                    >
                      <div className="font-semibold mb-0.5 print:text-[8px]">{day}</div>
                      {Icon && <Icon className={`h-2.5 w-2.5 ${config?.color} print:text-black`} />}
                      {isFriday && !record && (
                        <div className="text-[7px] text-info print:text-black">OFF</div>
                      )}
                    </motion.div>
                  );
                })}
              </div>

              {/* Legend */}
              <div className="mt-3 pt-3 border-t border-border grid grid-cols-2 md:grid-cols-4 gap-1.5 text-[9px] print:mt-2 print:pt-2 print:gap-1 print:border-gray-300">
                {Object.entries(statusIcons).map(([status, config]) => {
                  const Icon = config.icon;
                  return (
                    <div key={status} className="flex items-center gap-1">
                      <Icon className={`h-2.5 w-2.5 ${config.color} print:text-black`} />
                      <span className="capitalize print:text-gray-700">{config.label}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Statistics */}
          <div className="mb-6 print:mb-3">
            <h2 className="text-lg font-bold mb-3 print:text-base">Attendance Summary</h2>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3 print:gap-2">
              <div className="bg-success/10 p-3 rounded-lg text-center border border-success/20 print:bg-gray-100 print:border-gray-300 print:p-2">
                <div className="text-2xl font-bold text-success print:text-black">{stats.present}</div>
                <div className="text-xs text-muted-foreground mt-0.5 print:text-gray-600">Present Days</div>
              </div>
              <div className="bg-destructive/10 p-3 rounded-lg text-center border border-destructive/20 print:bg-gray-100 print:border-gray-300 print:p-2">
                <div className="text-2xl font-bold text-destructive print:text-black">{stats.absent}</div>
                <div className="text-xs text-muted-foreground mt-0.5 print:text-gray-600">Absent Days</div>
              </div>
              <div className="bg-warning/10 p-3 rounded-lg text-center border border-warning/20 print:bg-gray-100 print:border-gray-300 print:p-2">
                <div className="text-2xl font-bold text-warning print:text-black">{stats.leave}</div>
                <div className="text-xs text-muted-foreground mt-0.5 print:text-gray-600">Leave Days</div>
              </div>
              <div className="bg-info/10 p-3 rounded-lg text-center border border-info/20 print:bg-gray-100 print:border-gray-300 print:p-2">
                <div className="text-2xl font-bold text-info print:text-black">{stats.holiday}</div>
                <div className="text-xs text-muted-foreground mt-0.5 print:text-gray-600">Holidays</div>
              </div>
              <div className="bg-primary/10 p-3 rounded-lg text-center border border-primary/20 print:bg-gray-100 print:border-gray-300 print:p-2">
                <div className="text-2xl font-bold text-primary print:text-black">{totalHours}</div>
                <div className="text-xs text-muted-foreground mt-0.5 print:text-gray-600">Total Hours</div>
              </div>
            </div>
          </div>

          {/* Attendance Details Table */}
          {employee && attendanceData.length > 0 && (
            <div className="mb-6 print:mb-3">
              <h2 className="text-lg font-bold mb-3 print:text-base">Detailed Records</h2>
              <div className="overflow-x-auto">
                <table className="w-full text-xs print:text-[10px]">
                  <thead className="bg-muted/50 print:bg-gray-100">
                    <tr>
                      <th className="text-left p-2 font-semibold print:p-1 print:text-gray-700">Date</th>
                      <th className="text-left p-2 font-semibold print:p-1 print:text-gray-700">Status</th>
                      <th className="text-left p-2 font-semibold print:p-1 print:text-gray-700">Check In</th>
                      <th className="text-left p-2 font-semibold print:p-1 print:text-gray-700">Check Out</th>
                      <th className="text-left p-2 font-semibold print:p-1 print:text-gray-700">Hours</th>
                      <th className="text-left p-2 font-semibold print:p-1 print:text-gray-700">Notes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {attendanceData.map((record, idx) => {
                      const config = statusIcons[record.status];
                      const Icon = config.icon;
                      return (
                        <tr key={idx} className="border-b border-border print:border-gray-300">
                          <td className="p-2 print:p-1">{new Date(record.attendance_date).toLocaleDateString()}</td>
                          <td className="p-2 print:p-1">
                            <div className="flex items-center gap-1">
                              <Icon className={`h-3 w-3 ${config.color} print:text-black`} />
                              <span className="capitalize print:text-gray-700">{config.label}</span>
                            </div>
                          </td>
                          <td className="p-2 print:p-1">{record.check_in_time || "-"}</td>
                          <td className="p-2 print:p-1">{record.check_out_time || "-"}</td>
                          <td className="p-2 print:p-1">{record.hours_worked || "0"}h</td>
                          <td className="p-2 text-muted-foreground print:p-1 print:text-gray-600">{record.notes || "-"}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-border p-6 print:p-3 print:border-gray-300">
          <div className="grid md:grid-cols-3 gap-6 mb-4 print:gap-3 print:mb-2">
            <div>
              <div className="border-t-2 border-foreground/20 pt-2 print:border-black print:pt-1">
                <div className="text-xs text-muted-foreground print:text-gray-600">Prepared By</div>
                <div className="font-semibold text-sm print:text-xs">HR Department</div>
              </div>
            </div>
            <div>
              <div className="border-t-2 border-foreground/20 pt-2 print:border-black print:pt-1">
                <div className="text-xs text-muted-foreground print:text-gray-600">Verified By</div>
                <div className="font-semibold text-sm print:text-xs">Management</div>
              </div>
            </div>
            <div>
              <div className="border-t-2 border-foreground/20 pt-2 print:border-black print:pt-1">
                <div className="text-xs text-muted-foreground print:text-gray-600">Report Date</div>
                <div className="font-semibold text-sm print:text-xs">{new Date().toLocaleDateString()}</div>
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
            </div>
          </div>
        </div>
      </Card>
    </motion.div>
  );
}