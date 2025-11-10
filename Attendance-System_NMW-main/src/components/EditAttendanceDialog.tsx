import { useState, useEffect, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useMarkAttendance, useTodayAttendance, useAttendanceByDate, useDeleteAttendance } from "@/hooks/useAttendance";
import { SalaryCalculationService } from "@/services/salaryCalculationService";
import { supabase } from "@/integrations/supabase/client";
import { getTodayDate, calculateHoursWorked } from "@/lib/utils";
import { Trash2, Sun, Moon, AlertCircle } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface EditAttendanceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  employeeId: string;
  employeeName: string;
  attendanceDate?: string;
}

export default function EditAttendanceDialog({ open, onOpenChange, employeeId, employeeName, attendanceDate }: EditAttendanceDialogProps) {
  const targetDate = attendanceDate || new Date().toISOString().split("T")[0];
  const { data: attendanceData = [] } = attendanceDate ? useAttendanceByDate(targetDate) : useTodayAttendance();
  const attendance = attendanceData.find((a: any) => a.employee_id === employeeId);
  
  const [status, setStatus] = useState<string>(attendance?.status || "present");
  const [checkIn, setCheckIn] = useState(attendance?.check_in_time || "");
  const [checkOut, setCheckOut] = useState(attendance?.check_out_time || "");
  const [hoursWorked, setHoursWorked] = useState(attendance?.hours_worked || 0);
  const [overtimeHours, setOvertimeHours] = useState(0);
  const [lateHours, setLateHours] = useState(attendance?.late_hours || 0);
  const [notes, setNotes] = useState(attendance?.notes || "");
  const [departmentRules, setDepartmentRules] = useState<any>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [shiftType, setShiftType] = useState<"day" | "night" | "regular">(attendance?.shift_type || "regular");
  const [employeeDepartment, setEmployeeDepartment] = useState<string | null>(null);
  const hasPresetCheckOut = useRef(false);
  const hasPresetCheckIn = useRef(false);
  
  const markAttendance = useMarkAttendance();
  const deleteAttendance = useDeleteAttendance();
  
  const isFutureDate = targetDate > getTodayDate();

  // Load department rules for the employee
  useEffect(() => {
    const loadDepartmentRules = async () => {
      try {
        console.log("Loading department rules for employee:", employeeId);
        const { data: employee } = await supabase
          .from("employees")
          .select("department")
          .eq("id", employeeId)
          .single();
        
        console.log("Employee data:", employee);
        
        if (employee?.department) {
          setEmployeeDepartment(employee.department);
          const rules = await SalaryCalculationService.getDepartmentRules(employee.department);
          console.log("Department rules loaded:", rules);
          setDepartmentRules(rules);
        } else {
          console.log("No department found for employee");
        }
      } catch (error) {
        console.error("Error loading department rules:", error);
      }
    };

    if (open && employeeId) {
      loadDepartmentRules();
    }
  }, [open, employeeId]);

  useEffect(() => {
    if (attendance) {
      setStatus(attendance.status);
      setCheckIn(attendance.check_in_time || "");
      setCheckOut(attendance.check_out_time || "");
      setHoursWorked(attendance.hours_worked || 0);
      setOvertimeHours(attendance.overtime_hours || 0);
      setLateHours(attendance.undertime_hours || 0);
      setNotes(attendance.notes || "");
      setShiftType(attendance.shift_type || "regular");
      hasPresetCheckOut.current = false; // Reset when editing existing attendance
    } else {
      // Reset preset flags when dialog opens for new attendance
      hasPresetCheckOut.current = false;
      hasPresetCheckIn.current = false;
    }
  }, [attendance]);

  // Preset check-in and check-out times based on department and shift type when status is "present"
  useEffect(() => {
    // Only preset if there's no existing attendance record, department is loaded, status is present
    if (!attendance && employeeDepartment && status === "present") {
      // Preset check-in time based on department and shift type
      if (!checkIn && !hasPresetCheckIn.current) {
        let presetCheckIn = "";
        if (employeeDepartment === "Enamel") {
          if (shiftType === "day") {
            presetCheckIn = "08:00"; // 8 AM for Enamel day shift
          } else if (shiftType === "night") {
            presetCheckIn = "19:00"; // 7 PM for Enamel night shift
          }
        } else if (employeeDepartment === "Workshop") {
          presetCheckIn = "08:30"; // 8:30 AM for Workshop
        }
        if (presetCheckIn) {
          setCheckIn(presetCheckIn);
          hasPresetCheckIn.current = true;
        }
      }

      // Preset check-out time based on department and shift type
      if (!checkOut && !hasPresetCheckOut.current) {
        let presetCheckOut = "";
        if (employeeDepartment === "Enamel") {
          if (shiftType === "day") {
            presetCheckOut = "19:00"; // 7 PM for Enamel day shift
          } else if (shiftType === "night") {
            presetCheckOut = "08:00"; // 8 AM next day for Enamel night shift
          }
        } else if (employeeDepartment === "Workshop") {
          presetCheckOut = "17:00"; // 5 PM for Workshop
        }
        if (presetCheckOut) {
          setCheckOut(presetCheckOut);
          hasPresetCheckOut.current = true;
        }
      }
    }
  }, [employeeDepartment, status, attendance, checkIn, checkOut, shiftType]);

  // Calculate hours worked and overtime/undertime hours when times change
  useEffect(() => {
    if (checkIn && checkOut && departmentRules) {
      console.log("Calculating hours with:", { checkIn, checkOut, departmentRules, shiftType, employeeDepartment });
      
      // Use utility function to correctly handle night shifts crossing midnight
      const workedHours = calculateHoursWorked(checkIn, checkOut);
      
      console.log("Calculated worked hours:", workedHours);
      setHoursWorked(workedHours);
      
      // Only Workshop and Enamel departments get overtime/undertime
      const allowedDepartments = ["Workshop", "Enamel"];
      
      if (!employeeDepartment || !allowedDepartments.includes(employeeDepartment)) {
        // For other departments, set overtime/undertime to 0
        console.log("Department", employeeDepartment, "does not get overtime/undertime");
        setOvertimeHours(0);
        setLateHours(0);
        return;
      }
      
      // Determine standard hours based on department and shift type
      let standardHours = departmentRules.standard_hours_per_day || 8;
      
      if (employeeDepartment === "Enamel") {
        if (shiftType === "day") {
          standardHours = 11;
        } else if (shiftType === "night") {
          standardHours = 13;
        }
      } else if (employeeDepartment === "Workshop") {
        standardHours = 8.5;
      }
      
      const maxOvertimePerDay = departmentRules.max_overtime_hours_per_day || 4;
      
      console.log("Standard hours:", standardHours, "Max overtime:", maxOvertimePerDay);
      
      if (workedHours > standardHours) {
        const overtime = Math.min(Number((workedHours - standardHours).toFixed(2)), maxOvertimePerDay);
        console.log("Overtime calculated:", overtime);
        setOvertimeHours(overtime);
        setLateHours(0); // No undertime for overtime
      } else if (workedHours < standardHours) {
        const undertime = Number((standardHours - workedHours).toFixed(2));
        console.log("Undertime calculated:", undertime);
        setOvertimeHours(0);
        setLateHours(undertime);
      } else {
        console.log("No overtime or undertime");
        setOvertimeHours(0);
        setLateHours(0);
      }
    } else {
      console.log("Missing data for calculation:", { checkIn, checkOut, departmentRules });
    }
  }, [checkIn, checkOut, departmentRules, shiftType, employeeDepartment]);

  const handleSave = () => {
    const attendanceData = {
      employee_id: employeeId,
      attendance_date: targetDate,
      status: status as any,
      check_in_time: checkIn || null,
      check_out_time: checkOut || null,
      hours_worked: hoursWorked,
      overtime_hours: overtimeHours,
      undertime_hours: lateHours, // Using lateHours for undertime
      late_hours: 0, // Keep for backward compatibility
      notes: notes || null,
      biometric_verified: attendance?.biometric_verified || false,
      biometric_credential_id: attendance?.biometric_credential_id || null,
      biometric_verification_time: attendance?.biometric_verification_time || null,
      shift_type: shiftType,
    };
    
    console.log("Saving attendance data:", attendanceData);
    
    markAttendance.mutate(attendanceData, {
      onSuccess: () => {
        console.log("Attendance saved successfully");
        onOpenChange(false);
      },
      onError: (error) => {
        console.error("Error saving attendance:", error);
      }
    });
  };

  const handleDelete = () => {
    if (attendance?.id) {
      deleteAttendance.mutate(attendance.id, {
        onSuccess: () => {
          setShowDeleteDialog(false);
          onOpenChange(false);
        },
      });
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Attendance - {employeeName}</DialogTitle>
          </DialogHeader>
        
        <div className="space-y-4 py-4">
          {isFutureDate && (
            <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3 flex items-start gap-2">
              <AlertCircle className="h-5 w-5 text-destructive mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-medium text-destructive">Future Date Selected</p>
                <p className="text-sm text-destructive/80">Cannot mark attendance for future dates. Please select today's date or a past date.</p>
              </div>
            </div>
          )}
          <div className="space-y-2">
            <Label>Status</Label>
            <Select value={status} onValueChange={(newStatus) => {
              setStatus(newStatus);
              // Preset check-in and check-out times when status changes to "present"
              if (newStatus === "present" && employeeDepartment && !attendance) {
                // Preset check-in time
                if (!checkIn && !hasPresetCheckIn.current) {
                  let presetCheckIn = "";
                  if (employeeDepartment === "Enamel") {
                    if (shiftType === "day") {
                      presetCheckIn = "08:00"; // 8 AM for Enamel day shift
                    } else if (shiftType === "night") {
                      presetCheckIn = "19:00"; // 7 PM for Enamel night shift
                    }
                  } else if (employeeDepartment === "Workshop") {
                    presetCheckIn = "08:30"; // 8:30 AM for Workshop
                  }
                  if (presetCheckIn) {
                    setCheckIn(presetCheckIn);
                    hasPresetCheckIn.current = true;
                  }
                }
                
                // Preset check-out time
                if (!checkOut && !hasPresetCheckOut.current) {
                  let presetCheckOut = "";
                  if (employeeDepartment === "Enamel") {
                    if (shiftType === "day") {
                      presetCheckOut = "19:00"; // 7 PM for Enamel day shift
                    } else if (shiftType === "night") {
                      presetCheckOut = "08:00"; // 8 AM next day for Enamel night shift
                    }
                  } else if (employeeDepartment === "Workshop") {
                    presetCheckOut = "17:00"; // 5 PM for Workshop
                  }
                  if (presetCheckOut) {
                    setCheckOut(presetCheckOut);
                    hasPresetCheckOut.current = true;
                  }
                }
              } else if (newStatus !== "present") {
                // Clear times for non-present statuses
                setCheckIn("");
                setCheckOut("");
                hasPresetCheckIn.current = false;
                hasPresetCheckOut.current = false;
              }
            }}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="present">Present</SelectItem>
                <SelectItem value="absent">Absent</SelectItem>
                <SelectItem value="leave">Leave</SelectItem>
                <SelectItem value="holiday">Holiday</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {status === "present" && (
            <>
              {/* Shift Type Selection for Enamel Department */}
              {employeeDepartment === "Enamel" && (
                <div className="space-y-2">
                  <Label>Shift Type</Label>
                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      type="button"
                      variant={shiftType === "day" ? "default" : "outline"}
                      onClick={() => {
                        setShiftType("day");
                        // Reset presets when changing to day shift so they can be reapplied
                        hasPresetCheckIn.current = false;
                        hasPresetCheckOut.current = false;
                        // Preset day shift times immediately
                        if (employeeDepartment === "Enamel" && status === "present" && !attendance) {
                          if (!checkIn) {
                            setCheckIn("08:00"); // 8 AM for day shift
                            hasPresetCheckIn.current = true;
                          }
                          if (!checkOut) {
                            setCheckOut("19:00"); // 7 PM for day shift
                            hasPresetCheckOut.current = true;
                          }
                        }
                      }}
                      className={`flex items-center gap-2 ${
                        shiftType === "day" 
                          ? "bg-amber-500 text-white" 
                          : ""
                      }`}
                    >
                      <Sun className="h-4 w-4" />
                      Day (11h)
                    </Button>
                    <Button
                      type="button"
                      variant={shiftType === "night" ? "default" : "outline"}
                      onClick={() => {
                        setShiftType("night");
                        // Reset presets when changing to night shift so they can be reapplied
                        hasPresetCheckIn.current = false;
                        hasPresetCheckOut.current = false;
                        // Preset night shift times immediately
                        if (employeeDepartment === "Enamel" && status === "present" && !attendance) {
                          if (!checkIn) {
                            setCheckIn("19:00"); // 7 PM for night shift
                            hasPresetCheckIn.current = true;
                          }
                          if (!checkOut) {
                            setCheckOut("08:00"); // 8 AM next day for night shift
                            hasPresetCheckOut.current = true;
                          }
                        }
                      }}
                      className={`flex items-center gap-2 ${
                        shiftType === "night" 
                          ? "bg-blue-600 text-white" 
                          : ""
                      }`}
                    >
                      <Moon className="h-4 w-4" />
                      Night (13h)
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Select the shift type for this attendance
                  </p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Check In Time</Label>
                  <Input
                    type="time"
                    value={checkIn}
                    onChange={(e) => setCheckIn(e.target.value)}
                  />
                  {!checkIn && employeeDepartment && (
                    <p className="text-xs text-muted-foreground">
                      {employeeDepartment === "Enamel" && shiftType === "day" && "Default: 8:00 AM (08:00)"}
                      {employeeDepartment === "Workshop" && "Default: 8:30 AM (08:30)"}
                    </p>
                  )}
                </div>
                
                <div className="space-y-2">
                  <Label>Check Out Time</Label>
                  <Input
                    type="time"
                    value={checkOut}
                    onChange={(e) => setCheckOut(e.target.value)}
                    placeholder={
                      employeeDepartment === "Enamel" 
                        ? "Preset: 7:00 PM" 
                        : employeeDepartment === "Workshop" 
                        ? "Preset: 5:00 PM" 
                        : "Enter checkout time"
                    }
                  />
                  {!checkOut && employeeDepartment && (
                    <p className="text-xs text-muted-foreground">
                      {employeeDepartment === "Enamel" && "Default: 7:00 PM (19:00)"}
                      {employeeDepartment === "Workshop" && "Default: 5:00 PM (17:00)"}
                    </p>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label>Hours Worked</Label>
                <Input
                  type="number"
                  step="0.5"
                  value={hoursWorked}
                  onChange={(e) => setHoursWorked(Number(e.target.value))}
                  disabled
                />
                <p className="text-xs text-muted-foreground">
                  Auto-calculated from check-in/out times
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-success">Overtime Hours</Label>
                  <Input
                    type="number"
                    step="0.5"
                    value={overtimeHours}
                    onChange={(e) => setOvertimeHours(Number(e.target.value))}
                  />
                  <p className="text-xs text-muted-foreground">
                    Extra hours beyond 8h/day
                  </p>
                </div>

                <div className="space-y-2">
                  <Label className="text-destructive">Late Hours</Label>
                  <Input
                    type="number"
                    step="0.5"
                    value={lateHours}
                    onChange={(e) => setLateHours(Number(e.target.value))}
                  />
                  <p className="text-xs text-muted-foreground">
                    Hours short of 8h/day
                  </p>
                </div>
              </div>
            </>
          )}

          <div className="space-y-2">
            <Label>Notes</Label>
            <Input
              placeholder="Add notes (optional)"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

          <div className="flex gap-2 pt-4">
            {attendance?.id && (
              <Button 
                variant="destructive" 
                onClick={() => setShowDeleteDialog(true)}
                className="mr-auto"
                disabled={isFutureDate}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </Button>
            )}
            <Button variant="outline" onClick={() => onOpenChange(false)} className="flex-1">
              Cancel
            </Button>
            <Button 
              onClick={handleSave} 
              className="flex-1 bg-gradient-primary"
              disabled={isFutureDate}
            >
              Save Changes
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>

    <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete Attendance Record?</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to delete the attendance record for <strong>{employeeName}</strong> on{" "}
            <strong>{new Date(targetDate).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</strong>?
            <br /><br />
            This action cannot be undone and will be logged in the edit history.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            Delete
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  </>
  );
}
