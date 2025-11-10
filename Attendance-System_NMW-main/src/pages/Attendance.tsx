import { motion } from "framer-motion";
import { Calendar as CalendarIcon, CheckCircle2, XCircle, Coffee, PartyPopper, Edit, Users, Fingerprint, Search, User, ChevronsUpDown } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { useState, useMemo, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useTodayAttendance, useMarkAttendance, useAttendanceByDate } from "@/hooks/useAttendance";
import { useEmployees } from "@/hooks/useEmployees";
import EditAttendanceDialog from "@/components/EditAttendanceDialog";
import BulkAttendanceDialog from "@/components/BulkAttendanceDialog";
import BiometricAttendanceDialog from "@/components/BiometricAttendanceDialog";
import { ZKTecoSyncDialog } from "@/components/ZKTecoSyncDialog";
import { getTodayDate } from "@/lib/utils";

const statusConfig = {
  present: { icon: CheckCircle2, color: "text-success bg-success/10 border-success/20", label: "Present" },
  absent: { icon: XCircle, color: "text-destructive bg-destructive/10 border-destructive/20", label: "Absent" },
  leave: { icon: Coffee, color: "text-warning bg-warning/10 border-warning/20", label: "Leave" },
  holiday: { icon: PartyPopper, color: "text-info bg-info/10 border-info/20", label: "Holiday" },
};

export default function Attendance() {
  const [open, setOpen] = useState(false);
  const [bulkDialogOpen, setBulkDialogOpen] = useState(false);
  const [biometricDialogOpen, setBiometricDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<{ id: string; name: string } | null>(null);
  const [selectedDate, setSelectedDate] = useState(getTodayDate());
  const [searchTerm, setSearchTerm] = useState("");
  const [checkInTime, setCheckInTime] = useState("");
  const [checkOutTime, setCheckOutTime] = useState("");
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>("");
  const [employeeSearchOpen, setEmployeeSearchOpen] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState<"present" | "absent" | "leave" | "holiday">("present");
  const { data: attendance = [], isLoading } = selectedDate === getTodayDate() 
    ? useTodayAttendance() 
    : useAttendanceByDate(selectedDate);
  const { data: employees = [] } = useEmployees();
  const markAttendance = useMarkAttendance();

  // Filter attendance records based on search term
  const filteredAttendance = useMemo(() => {
    if (!searchTerm) return attendance;
    
    const term = searchTerm.toLowerCase();
    return attendance.filter((record: any) => {
      return (
        record.employees?.name.toLowerCase().includes(term) ||
        record.employees?.employee_id.toLowerCase().includes(term) ||
        record.employees?.department.toLowerCase().includes(term) ||
        record.status.toLowerCase().includes(term)
      );
    });
  }, [attendance, searchTerm]);

  const selectedDateFormatted = new Date(selectedDate).toLocaleDateString("en-US", { 
    weekday: "long", 
    year: "numeric", 
    month: "long", 
    day: "numeric" 
  });

  const attendanceCounts = {
    present: filteredAttendance.filter((a: any) => a.status === "present").length,
    absent: filteredAttendance.filter((a: any) => a.status === "absent").length,
    leave: filteredAttendance.filter((a: any) => a.status === "leave").length,
    holiday: filteredAttendance.filter((a: any) => a.status === "holiday").length,
  };

  // Preset check-in and check-out times based on selected employee's department
  useEffect(() => {
    const loadEmployeeDepartment = async () => {
      if (selectedEmployeeId && selectedStatus === "present") {
        try {
          const { data: employee } = await supabase
            .from("employees")
            .select("department")
            .eq("id", selectedEmployeeId)
            .single();
          
          if (employee?.department) {
            // Preset check-in time
            if (!checkInTime) {
              let presetCheckIn = "";
              if (employee.department === "Enamel") {
                presetCheckIn = "08:00"; // 8 AM for Enamel day shift
              } else if (employee.department === "Workshop") {
                presetCheckIn = "08:30"; // 8:30 AM for Workshop
              }
              if (presetCheckIn) {
                setCheckInTime(presetCheckIn);
              }
            }
            
            // Preset check-out time
            if (!checkOutTime) {
              let presetCheckOut = "";
              if (employee.department === "Enamel") {
                presetCheckOut = "19:00"; // 7 PM for Enamel day shift
              } else if (employee.department === "Workshop") {
                presetCheckOut = "17:00"; // 5 PM for Workshop
              }
              if (presetCheckOut) {
                setCheckOutTime(presetCheckOut);
              }
            }
          }
        } catch (error) {
          console.error("Error loading employee department:", error);
        }
      }
    };

    if (open && selectedEmployeeId) {
      loadEmployeeDepartment();
    }
  }, [selectedEmployeeId, selectedStatus, open, checkInTime, checkOutTime]);

  // Reset times when dialog closes
  useEffect(() => {
    if (!open) {
      setCheckInTime("");
      setCheckOutTime("");
      setSelectedEmployeeId("");
      setSelectedStatus("present");
    }
  }, [open]);

  const handleMarkAttendance = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const employeeId = formData.get("employee_id") as string;
    const status = formData.get("status") as "present" | "absent" | "leave" | "holiday";
    
    // Use form inputs if provided, otherwise use current time for check-in (only if present)
    const finalCheckInTime = checkInTime || (status === "present" ? new Date().toTimeString().split(" ")[0] : null);
    const finalCheckOutTime = status === "present" ? (checkOutTime || null) : null;

    await markAttendance.mutateAsync({
      employee_id: employeeId,
      attendance_date: selectedDate,
      status,
      check_in_time: finalCheckInTime,
      check_out_time: finalCheckOutTime,
      hours_worked: 0,
      late_hours: 0,
      overtime_hours: 0,
      undertime_hours: 0,
      notes: null,
      biometric_verified: false,
      biometric_credential_id: null,
      biometric_verification_time: null,
      shift_type: "regular",
    });

    setOpen(false);
    setCheckInTime("");
    setCheckOutTime("");
    setSelectedEmployeeId("");
    setSelectedStatus("present");
    (e.target as HTMLFormElement).reset();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20 p-4 sm:p-6 lg:p-8 pt-16 sm:pt-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-4 sm:mb-6 lg:mb-8"
      >
        <div className="flex flex-col gap-4 mb-4 sm:mb-6">
          <div>
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold mb-2">Attendance</h1>
            <p className="text-muted-foreground flex items-center gap-2 text-sm sm:text-base flex-wrap">
              <CalendarIcon className="h-4 w-4" />
              <span className="hidden sm:inline">{selectedDateFormatted}</span>
              <span className="sm:hidden">{new Date(selectedDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</span>
              {selectedDate > getTodayDate() && (
                <Badge variant="destructive" className="ml-2">
                  Future Date
                </Badge>
              )}
            </p>
          </div>
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <Label htmlFor="date-picker" className="text-xs sm:text-sm whitespace-nowrap">Select Date:</Label>
              <Input
                id="date-picker"
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="flex-1 sm:w-auto"
                max={getTodayDate()}
              />
            </div>
            <div className="flex flex-wrap gap-2 sm:gap-3">
              <ZKTecoSyncDialog />
              <Button
                variant="outline"
                onClick={() => setBiometricDialogOpen(true)}
                disabled={selectedDate > getTodayDate()}
                className="flex items-center gap-2 hover:bg-primary hover:text-primary-foreground hover:scale-105 transition-all duration-300 flex-1 sm:flex-initial text-xs sm:text-sm"
              >
                <Fingerprint className="h-4 w-4" />
                <span className="hidden sm:inline">Biometric Attendance</span>
                <span className="sm:hidden">Biometric</span>
              </Button>
              <Button
                variant="outline"
                onClick={() => setBulkDialogOpen(true)}
                disabled={selectedDate > getTodayDate()}
                className="flex items-center gap-2 hover:bg-primary hover:text-primary-foreground hover:scale-105 transition-all duration-300 flex-1 sm:flex-initial text-xs sm:text-sm"
              >
                <Users className="h-4 w-4" />
                <span className="hidden sm:inline">Bulk Attendance</span>
                <span className="sm:hidden">Bulk</span>
              </Button>
              <Dialog open={open} onOpenChange={setOpen}>
                <DialogTrigger asChild>
                  <Button className="bg-gradient-accent shadow-medium hover:shadow-strong hover:scale-105 transition-all duration-300 flex-1 sm:flex-initial">
                    Mark Attendance
                  </Button>
                </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Mark Attendance</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleMarkAttendance} className="space-y-4">
                <div className="space-y-2">
                  <Label>Employee</Label>
                  <Popover open={employeeSearchOpen} onOpenChange={setEmployeeSearchOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        type="button"
                        variant="outline"
                        role="combobox"
                        aria-expanded={employeeSearchOpen}
                        className="w-full justify-between h-10"
                      >
                        <div className="flex items-center gap-2 min-w-0 flex-1">
                          <User className="h-4 w-4 text-muted-foreground shrink-0" />
                          <span className="truncate text-left">
                            {selectedEmployeeId
                              ? `${employees.find(e => e.id === selectedEmployeeId)?.name || ''} (${employees.find(e => e.id === selectedEmployeeId)?.employee_id || ''})`
                              : "Select employee"}
                          </span>
                        </div>
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="p-0 w-[--radix-popover-trigger-width]" align="start">
                      <Command>
                        <div className="flex items-center border-b px-3">
                          <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
                          <CommandInput 
                            placeholder="Search name, ID, department, CNIC..." 
                            className="flex h-10 w-full rounded-md bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50" 
                          />
                        </div>
                        <CommandList>
                          <CommandEmpty>No employee found.</CommandEmpty>
                          <CommandGroup>
                            {employees.filter((emp) => emp.is_active === true).map((emp) => (
                              <CommandItem
                                key={emp.id}
                                value={`${emp.name} ${emp.employee_id} ${emp.department} ${emp.cnic}`}
                                onSelect={() => {
                                  setSelectedEmployeeId(emp.id);
                                  setCheckOutTime("");
                                  setEmployeeSearchOpen(false);
                                }}
                                className="cursor-pointer"
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
                    </PopoverContent>
                  </Popover>
                  <input type="hidden" name="employee_id" value={selectedEmployeeId} />
                </div>
                <div className="space-y-2">
                  <Label>Status</Label>
                  <Select 
                    name="status" 
                    required
                    value={selectedStatus}
                    onValueChange={(value) => {
                      const newStatus = value as "present" | "absent" | "leave" | "holiday";
                      setSelectedStatus(newStatus);
                      // Clear times when status is not present
                      if (newStatus !== "present") {
                        setCheckInTime("");
                        setCheckOutTime("");
                      }
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="present">Present</SelectItem>
                      <SelectItem value="absent">Absent</SelectItem>
                      <SelectItem value="leave">Leave</SelectItem>
                      <SelectItem value="holiday">Holiday</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {selectedStatus === "present" && (
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Check In Time</Label>
                      <Input
                        type="time"
                        value={checkInTime}
                        onChange={(e) => setCheckInTime(e.target.value)}
                        placeholder="Leave empty for current time"
                      />
                      {!checkInTime && selectedEmployeeId && (
                        <p className="text-xs text-muted-foreground">
                          {(() => {
                            const employee = employees.find(e => e.id === selectedEmployeeId);
                            if (employee?.department === "Enamel") return "Default: 8:00 AM (08:00)";
                            if (employee?.department === "Workshop") return "Default: 8:30 AM (08:30)";
                            return "Leave empty to use current time";
                          })()}
                        </p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label>Check Out Time</Label>
                      <Input
                        type="time"
                        value={checkOutTime}
                        onChange={(e) => setCheckOutTime(e.target.value)}
                      />
                      {!checkOutTime && selectedEmployeeId && (
                        <p className="text-xs text-muted-foreground">
                          {(() => {
                            const employee = employees.find(e => e.id === selectedEmployeeId);
                            if (employee?.department === "Enamel") return "Default: 7:00 PM (19:00)";
                            if (employee?.department === "Workshop") return "Default: 5:00 PM (17:00)";
                            return "Enter checkout time";
                          })()}
                        </p>
                      )}
                    </div>
                  </div>
                )}

                <Button type="submit" className="w-full" disabled={markAttendance.isPending}>
                  {markAttendance.isPending ? "Marking..." : "Mark Attendance"}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Search Bar */}
      <div className="mb-4 sm:mb-6">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              placeholder="Search by employee name, ID, department, or status..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 w-full"
            />
            {searchTerm && (
              <Button
                variant="ghost"
                size="sm"
                className="absolute right-2 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0"
                onClick={() => setSearchTerm("")}
              >
                ×
              </Button>
            )}
          </div>
          {searchTerm && (
            <p className="text-sm text-muted-foreground mt-2">
              Showing {filteredAttendance.length} of {attendance.length} attendance records
            </p>
          )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        {Object.entries(attendanceCounts).map(([status, count], index) => {
          const config = statusConfig[status as keyof typeof statusConfig];
          const Icon = config.icon;
          const percentage = employees.length > 0 
            ? ((count / employees.length) * 100).toFixed(0)
            : 0;

          return (
            <motion.div
              key={status}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: index * 0.1 }}
            >
              <Card className="shadow-soft border-0 hover:shadow-strong hover:scale-105 transition-all duration-300 cursor-pointer group">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-2">
                    <Icon className={`h-5 w-5 ${config.color.split(" ")[0]} group-hover:scale-110 transition-transform duration-300`} />
                    <span className="text-2xl font-bold group-hover:scale-105 transition-transform duration-300">{count}</span>
                  </div>
                  <div className="text-sm text-muted-foreground capitalize group-hover:text-foreground transition-colors duration-300">{config.label}</div>
                  <div className="text-xs text-muted-foreground mt-1 group-hover:text-foreground transition-colors duration-300">{percentage}% of total</div>
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </div>

      {/* Attendance List */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
      >
        <Card className="shadow-soft border-0">
          <CardHeader>
            <CardTitle>Today's Attendance</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8">Loading attendance...</div>
            ) : filteredAttendance.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                {searchTerm ? "No matching attendance records found." : "No attendance records found for this date."}
              </div>
            ) : (
              <div className="space-y-4">
                {filteredAttendance.map((record: any, index: number) => {
                  const config = statusConfig[record.status as keyof typeof statusConfig];
                  const Icon = config.icon;

                  return (
                    <motion.div
                      key={record.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.5 + index * 0.05 }}
                      className="flex items-center justify-between p-4 rounded-lg border border-border hover:shadow-strong hover:scale-105 transition-all duration-300 cursor-pointer group"
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-full bg-gradient-primary flex items-center justify-center text-white font-bold text-sm group-hover:scale-110 transition-transform duration-300">
                          {record.employees?.name.split(" ").map((n: string) => n[0]).join("")}
                        </div>
                        <div>
                          <div className="font-semibold group-hover:text-primary transition-colors duration-300">{record.employees?.name}</div>
                          <div className="text-sm text-muted-foreground group-hover:text-foreground transition-colors duration-300">
                            {record.employees?.employee_id} • {record.employees?.department}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-4">
                        {record.check_in_time && (
                          <span className="text-sm text-muted-foreground">
                            {new Date(`2000-01-01T${record.check_in_time}`).toLocaleTimeString("en-US", {
                              hour: "2-digit",
                              minute: "2-digit"
                            })}
                          </span>
                        )}
                        <Badge className={`${config.color} gap-1`}>
                          <Icon className="h-3 w-3" />
                          {config.label}
                        </Badge>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setSelectedEmployee({ id: record.employee_id, name: record.employees?.name });
                            setEditDialogOpen(true);
                          }}
                          className="hover:bg-primary hover:text-primary-foreground hover:scale-110 transition-all duration-300"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {selectedEmployee && (
        <EditAttendanceDialog
          open={editDialogOpen}
          onOpenChange={setEditDialogOpen}
          employeeId={selectedEmployee.id}
          employeeName={selectedEmployee.name}
          attendanceDate={selectedDate}
        />
      )}

      <BulkAttendanceDialog
        open={bulkDialogOpen}
        onOpenChange={setBulkDialogOpen}
        selectedDate={selectedDate}
      />

      <BiometricAttendanceDialog
        open={biometricDialogOpen}
        onOpenChange={setBiometricDialogOpen}
        selectedDate={selectedDate}
      />

    </div>
  );
}