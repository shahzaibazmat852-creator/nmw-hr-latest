import { useEffect, useRef } from "react";
import { useEmployees } from "@/hooks/useEmployees";
import { useEmployeeAttendance } from "@/hooks/useAttendance";
import { Button } from "@/components/ui/button";
import { Printer, Calendar } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { formatLocalDate } from "@/lib/utils";

interface AttendanceRecord {
  attendance_date: string;
  status: "present" | "absent" | "leave" | "holiday";
  check_in_time?: string;
  check_out_time?: string;
  hours_worked?: number;
  notes?: string;
}

interface EmployeeWithStats {
  employee: any;
  stats: {
    present: number;
    absent: number;
    leave: number;
    holiday: number;
    totalHours: number;
  };
}

interface LedgerAttendanceReportProps {
  employee?: any;
  month: number;
  year: number;
  department?: string;
  selectedEmployees: string[];
  selectedDepartments: string[];
}

const monthNames = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

const statusIcons = {
  present: { label: "Present", color: "text-green-600 dark:text-green-400", bg: "bg-green-100 dark:bg-green-900/30" },
  absent: { label: "Absent", color: "text-red-600 dark:text-red-400", bg: "bg-red-100 dark:bg-red-900/30" },
  leave: { label: "Leave", color: "text-yellow-600 dark:text-yellow-400", bg: "bg-yellow-100 dark:bg-yellow-900/30" },
  holiday: { label: "Holiday", color: "text-blue-600 dark:text-blue-400", bg: "bg-blue-100 dark:bg-blue-900/30" },
};

export default function LedgerAttendanceReport({ 
  employee, 
  month, 
  year,
  department,
  selectedEmployees,
  selectedDepartments
}: LedgerAttendanceReportProps) {
  const reportRef = useRef<HTMLDivElement>(null);
  const { data: allEmployees = [] } = useEmployees();
  
  // For single employee view
  const { data: singleEmployeeAttendance = [] } = useEmployeeAttendance(
    employee?.id || "",
    month,
    year
  );

  // For multiple employees view - fetch attendance data for all employees
  // OPTIMIZED: Single batch query instead of sequential queries
  const { data: multipleEmployeesAttendance = {} } = useQuery({
    queryKey: ["multiple-attendance", selectedEmployees, selectedDepartments, month, year],
    queryFn: async () => {
      // Filter employees based on selection
      let filteredEmployees = allEmployees;
      
      if (selectedDepartments.length > 0 && !selectedDepartments.includes("all")) {
        filteredEmployees = filteredEmployees.filter(emp => 
          selectedDepartments.includes(emp.department)
        );
      }
      
      if (selectedEmployees.length > 0 && !selectedEmployees.includes("all")) {
        filteredEmployees = filteredEmployees.filter(emp => 
          selectedEmployees.includes(emp.id)
        );
      }
      
      // OPTIMIZATION: Fetch all attendance in a single query instead of loop
      const employeeIds = filteredEmployees.map(emp => emp.id);
      const startDate = formatLocalDate(new Date(year, month - 1, 1));
      const endDate = formatLocalDate(new Date(year, month, 0));
      
      // Single batch query for all employees at once
      const { data, error } = await supabase
        .from("attendance")
        .select("*")
        .in("employee_id", employeeIds)  // Single query instead of N queries
        .gte("attendance_date", startDate)
        .lte("attendance_date", endDate)
        .order("attendance_date", { ascending: true });
      
      if (error) {
        console.error("Error fetching attendance:", error);
        return {};
      }
      
      // Group by employee_id
      const attendanceData: Record<string, AttendanceRecord[]> = {};
      if (data) {
        data.forEach((record: any) => {
          if (!attendanceData[record.employee_id]) {
            attendanceData[record.employee_id] = [];
          }
          attendanceData[record.employee_id].push(record);
        });
      }
      
      return attendanceData;
    },
    enabled: !employee && (selectedEmployees.length > 0 || selectedDepartments.length > 0),
  });

  const handlePrint = () => {
    window.print();
  };

  // Check if we're viewing a single employee
  const isSingleEmployeeView = employee && selectedEmployees.length === 1 && selectedEmployees[0] !== "all";
  
  // For multiple employees view
  const getMultipleEmployeesAttendance = () => {
    if (isSingleEmployeeView) return [];
    
    // Filter employees based on selection
    let filteredEmployees = allEmployees;
    
    if (selectedDepartments.length > 0 && !selectedDepartments.includes("all")) {
      filteredEmployees = filteredEmployees.filter(emp => 
        selectedDepartments.includes(emp.department)
      );
    }
    
    if (selectedEmployees.length > 0 && !selectedEmployees.includes("all")) {
      filteredEmployees = filteredEmployees.filter(emp => 
        selectedEmployees.includes(emp.id)
      );
    }
    
    return filteredEmployees;
  };

  const employeesForReport = getMultipleEmployeesAttendance();

  // Calculate days in month for calendar view
  const daysInMonth = new Date(year, month, 0).getDate();
  const firstDay = new Date(year, month - 1, 1).getDay();
  
  const singleEmployeeAttendanceMap = new Map(
    singleEmployeeAttendance.map(a => [new Date(a.attendance_date).getDate(), a])
  );

  const singleEmployeeStats = {
    present: singleEmployeeAttendance.filter(a => a.status === "present").length,
    absent: singleEmployeeAttendance.filter(a => a.status === "absent").length,
    leave: singleEmployeeAttendance.filter(a => a.status === "leave").length,
    holiday: singleEmployeeAttendance.filter(a => a.status === "holiday").length,
    totalHours: singleEmployeeAttendance.reduce((sum, a) => sum + (a.hours_worked || 0), 0),
  };

  // Calculate stats for multiple employees
  const getEmployeeStats = (empId: string) => {
    const attendance = multipleEmployeesAttendance[empId] || [];
    return {
      present: attendance.filter((a: any) => a.status === "present").length,
      absent: attendance.filter((a: any) => a.status === "absent").length,
      leave: attendance.filter((a: any) => a.status === "leave").length,
      holiday: attendance.filter((a: any) => a.status === "holiday").length,
      totalHours: attendance.reduce((sum: number, a: any) => sum + (a.hours_worked || 0), 0),
    };
  };

  return (
    <div ref={reportRef} className="w-full max-w-6xl mx-auto p-6 font-sans print:p-4 print:max-w-full ledger-report ledger-attendance-report">
      {/* Header */}
      <div className="text-center mb-8 print:mb-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-2 print:text-2xl">NMW Attendance Report</h1>
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

      {/* Single Employee View */}
      {isSingleEmployeeView && employee && (
        <div className="mb-10 print:mb-8">
          {/* Employee Info */}
          <div className="bg-gray-50 p-6 rounded border mb-8 print:p-4 print:bg-white print:mb-6 print:border-gray-300">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 print:gap-2">
              <div>
                <div className="text-sm text-gray-600 mb-1 print:text-xs">Employee Name</div>
                <div className="font-bold text-gray-900 print:text-sm">{employee.name}</div>
              </div>
              <div>
                <div className="text-sm text-gray-600 mb-1 print:text-xs">Employee ID</div>
                <div className="font-bold text-gray-900 print:text-sm">{employee.employee_id}</div>
              </div>
              <div>
                <div className="text-sm text-gray-600 mb-1 print:text-xs">Department</div>
                <div className="font-bold text-gray-900 print:text-sm">{employee.department}</div>
              </div>
              <div>
                <div className="text-sm text-gray-600 mb-1 print:text-xs">CNIC</div>
                <div className="font-bold text-gray-900 print:text-sm">{employee.cnic}</div>
              </div>
            </div>
          </div>

          {/* Calendar View - Single Page Calendar */}
          <div className="mb-8 print:mb-6 calendar-container">
            <h2 className="text-2xl font-bold text-gray-900 mb-6 print:text-xl print:mb-4 flex items-center gap-2">
              <Calendar className="h-5 w-5 print:h-4 print:w-4" />
              Monthly Attendance Calendar
            </h2>
            <div className="bg-gray-50 p-4 rounded border print:p-3 print:bg-white print:border-gray-300 calendar-grid">
              {/* Calendar Header */}
              <div className="grid grid-cols-7 gap-1 mb-2 print:gap-0.5 print:mb-1">
                {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
                  <div key={day} className="text-center text-xs font-semibold text-gray-700 print:text-[8px]">
                    {day}
                  </div>
                ))}
              </div>

              {/* Calendar Days - All on one page */}
              <div className="grid grid-cols-7 gap-1 print:gap-0.5">
                {Array.from({ length: firstDay }).map((_, i) => (
                  <div key={`empty-${i}`} className="aspect-square calendar-day" />
                ))}

                {Array.from({ length: daysInMonth }).map((_, i) => {
                  const day = i + 1;
                  const record = singleEmployeeAttendanceMap.get(day);
                  const config = record ? statusIcons[record.status] : null;
                  const isFriday = (firstDay + i) % 7 === 5;

                  return (
                    <div
                      key={day}
                      className={`aspect-square rounded-md flex flex-col items-center justify-center text-[9px] calendar-day ${
                        config
                          ? config.bg + " " + config.color
                          : isFriday
                          ? "bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400"
                          : "bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700"
                      } print:text-[7px] print:border-gray-300`}
                    >
                      <div className="font-semibold mb-0.5">{day}</div>
                      {config && (
                        <div className="capitalize text-[8px]">{config.label.substring(0, 3)}</div>
                      )}
                      {isFriday && !record && (
                        <div className="text-[7px]">OFF</div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Legend */}
              <div className="mt-4 pt-4 border-t border-gray-200 grid grid-cols-2 md:grid-cols-4 gap-2 text-[9px] print:mt-3 print:pt-3 print:gap-1 print:border-gray-300">
                {Object.entries(statusIcons).map(([status, config]) => (
                  <div key={status} className="flex items-center gap-1">
                    <div className={`w-3 h-3 rounded ${config.bg}`}></div>
                    <span className="capitalize">{config.label}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Attendance Summary */}
          <div className="mb-8 print:mb-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-6 print:text-xl print:mb-4">Attendance Summary</h2>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 print:gap-2">
              <div className="bg-green-50 p-4 rounded border text-center print:p-2 print:bg-white print:border-gray-300">
                <div className="text-2xl font-bold text-green-600 print:text-xl">{singleEmployeeStats.present}</div>
                <div className="text-sm text-gray-700 mt-1 print:text-xs">Present Days</div>
              </div>
              <div className="bg-red-50 p-4 rounded border text-center print:p-2 print:bg-white print:border-gray-300">
                <div className="text-2xl font-bold text-red-600 print:text-xl">{singleEmployeeStats.absent}</div>
                <div className="text-sm text-gray-700 mt-1 print:text-xs">Absent Days</div>
              </div>
              <div className="bg-yellow-50 p-4 rounded border text-center print:p-2 print:bg-white print:border-gray-300">
                <div className="text-2xl font-bold text-yellow-600 print:text-xl">{singleEmployeeStats.leave}</div>
                <div className="text-sm text-gray-700 mt-1 print:text-xs">Leave Days</div>
              </div>
              <div className="bg-blue-50 p-4 rounded border text-center print:p-2 print:bg-white print:border-gray-300">
                <div className="text-2xl font-bold text-blue-600 print:text-xl">{singleEmployeeStats.holiday}</div>
                <div className="text-sm text-gray-700 mt-1 print:text-xs">Holidays</div>
              </div>
              <div className="bg-gray-50 p-4 rounded border text-center print:p-2 print:bg-white print:border-gray-300">
                <div className="text-2xl font-bold text-gray-900 print:text-xl">{singleEmployeeStats.totalHours}</div>
                <div className="text-sm text-gray-700 mt-1 print:text-xs">Total Hours</div>
              </div>
            </div>
          </div>

          {/* Detailed Records */}
          {singleEmployeeAttendance.length > 0 && (
            <div className="mb-8 print:mb-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-6 print:text-xl print:mb-4">Detailed Records</h2>
              <div className="overflow-x-auto print:overflow-visible">
                <table className="w-full border-collapse print:border-gray-300">
                  <thead>
                    <tr className="bg-gray-100 border-b print:border-gray-300">
                      <th className="text-left p-3 text-sm font-semibold text-gray-700 border-r print:p-2 print:text-xs print:border-gray-300">Date</th>
                      <th className="text-left p-3 text-sm font-semibold text-gray-700 border-r print:p-2 print:text-xs print:border-gray-300">Status</th>
                      <th className="text-left p-3 text-sm font-semibold text-gray-700 border-r print:p-2 print:text-xs print:border-gray-300">Check In</th>
                      <th className="text-left p-3 text-sm font-semibold text-gray-700 border-r print:p-2 print:text-xs print:border-gray-300">Check Out</th>
                      <th className="text-left p-3 text-sm font-semibold text-gray-700 border-r print:p-2 print:text-xs print:border-gray-300">Hours</th>
                      <th className="text-left p-3 text-sm font-semibold text-gray-700 print:p-2 print:text-xs print:border-gray-300">Notes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {singleEmployeeAttendance.map((record: any, idx: number) => {
                      const config = statusIcons[record.status];
                      return (
                        <tr key={idx} className="border-b hover:bg-gray-50 print:hover:bg-none print:border-gray-300">
                          <td className="p-3 text-sm text-gray-900 border-r print:p-2 print:text-xs print:border-gray-300">
                            {new Date(record.attendance_date).toLocaleDateString()}
                          </td>
                          <td className="p-3 text-sm text-gray-900 border-r print:p-2 print:text-xs print:border-gray-300">
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${config.bg} ${config.color}`}>
                              {config.label}
                            </span>
                          </td>
                          <td className="p-3 text-sm text-gray-900 border-r print:p-2 print:text-xs print:border-gray-300">
                            {record.check_in_time || "-"}
                          </td>
                          <td className="p-3 text-sm text-gray-900 border-r print:p-2 print:text-xs print:border-gray-300">
                            {record.check_out_time || "-"}
                          </td>
                          <td className="p-3 text-sm text-gray-900 border-r print:p-2 print:text-xs print:border-gray-300">
                            {record.hours_worked || "0"}h
                          </td>
                          <td className="p-3 text-sm text-gray-900 print:p-2 print:text-xs print:border-gray-300">
                            {record.notes || "-"}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Multiple Employees View */}
      {!isSingleEmployeeView && employeesForReport.length > 0 && (
        <div className="mb-10 print:mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6 print:text-xl print:mb-4">
            {selectedDepartments.length === 1 && selectedDepartments[0] !== "all" 
              ? `${selectedDepartments[0]} Department` 
              : "Multiple Departments"} - MTD Summary
          </h2>
          
          <div className="overflow-x-auto print:overflow-visible">
            <table className="w-full border-collapse print:border-gray-300">
              <thead>
                <tr className="bg-gray-100 border-b print:border-gray-300">
                  <th className="text-left p-3 text-sm font-semibold text-gray-700 border-r print:p-2 print:text-xs print:border-gray-300">Employee</th>
                  <th className="text-center p-3 text-sm font-semibold text-gray-700 border-r print:p-2 print:text-xs print:border-gray-300">ID</th>
                  <th className="text-center p-3 text-sm font-semibold text-gray-700 border-r print:p-2 print:text-xs print:border-gray-300">Present</th>
                  <th className="text-center p-3 text-sm font-semibold text-gray-700 border-r print:p-2 print:text-xs print:border-gray-300">Absent</th>
                  <th className="text-center p-3 text-sm font-semibold text-gray-700 border-r print:p-2 print:text-xs print:border-gray-300">Leave</th>
                  <th className="text-center p-3 text-sm font-semibold text-gray-700 border-r print:p-2 print:text-xs print:border-gray-300">Holiday</th>
                  <th className="text-center p-3 text-sm font-semibold text-gray-700 print:p-2 print:text-xs print:border-gray-300">Total Hours</th>
                </tr>
              </thead>
              <tbody>
                {employeesForReport.map((emp: any) => {
                  const stats = getEmployeeStats(emp.id);
                  return (
                    <tr key={emp.id} className="border-b hover:bg-gray-50 print:hover:bg-none print:border-gray-300">
                      <td className="p-3 text-sm font-medium text-gray-900 border-r print:p-2 print:text-xs print:border-gray-300">
                        {emp.name}
                      </td>
                      <td className="p-3 text-sm text-center text-gray-700 border-r print:p-2 print:text-xs print:border-gray-300">
                        {emp.employee_id}
                      </td>
                      <td className="p-3 text-sm text-center text-green-600 border-r print:p-2 print:text-xs print:border-gray-300">
                        {stats.present}
                      </td>
                      <td className="p-3 text-sm text-center text-red-600 border-r print:p-2 print:text-xs print:border-gray-300">
                        {stats.absent}
                      </td>
                      <td className="p-3 text-sm text-center text-yellow-600 border-r print:p-2 print:text-xs print:border-gray-300">
                        {stats.leave}
                      </td>
                      <td className="p-3 text-sm text-center text-blue-600 border-r print:p-2 print:text-xs print:border-gray-300">
                        {stats.holiday}
                      </td>
                      <td className="p-3 text-sm text-center text-gray-900 print:p-2 print:text-xs print:border-gray-300">
                        {stats.totalHours}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="border-t-2 border-gray-300 pt-6 print:pt-4 print:border-gray-300">
        <div className="grid grid-cols-3 gap-8 print:gap-4">
          <div className="text-center">
            <div className="border-t border-gray-500 pt-2 print:pt-1 print:border-gray-300">
              <div className="text-sm text-gray-600 print:text-xs">Prepared By</div>
              <div className="font-semibold text-gray-900 print:text-sm">HR Department</div>
            </div>
          </div>
          <div className="text-center">
            <div className="border-t border-gray-500 pt-2 print:pt-1 print:border-gray-300">
              <div className="text-sm text-gray-600 print:text-xs">Approved By</div>
              <div className="font-semibold text-gray-900 print:text-sm">Management</div>
            </div>
          </div>
          <div className="text-center">
            <div className="border-t border-gray-500 pt-2 print:pt-1 print:border-gray-300">
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