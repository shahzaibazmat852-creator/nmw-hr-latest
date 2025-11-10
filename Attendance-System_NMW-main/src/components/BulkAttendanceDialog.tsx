import { useState, useMemo, useEffect } from "react";
import { Users, Building2, CheckCircle2, XCircle, Coffee, PartyPopper, Sun, Moon } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useBulkMarkAttendance } from "@/hooks/useAttendance";
import { useEmployees } from "@/hooks/useEmployees";
import { getTodayDate } from "@/lib/utils";

interface BulkAttendanceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedDate: string;
}

const statusConfig = {
  present: { icon: CheckCircle2, color: "text-success bg-success/10 border-success/20", label: "Present" },
  absent: { icon: XCircle, color: "text-destructive bg-destructive/10 border-destructive/20", label: "Absent" },
  leave: { icon: Coffee, color: "text-warning bg-warning/10 border-warning/20", label: "Leave" },
  holiday: { icon: PartyPopper, color: "text-info bg-info/10 border-info/20", label: "Holiday" },
};

export default function BulkAttendanceDialog({ open, onOpenChange, selectedDate }: BulkAttendanceDialogProps) {
  const [selectionType, setSelectionType] = useState<"department" | "individual">("department");
  const [selectedDepartment, setSelectedDepartment] = useState<string>("");
  const [selectedEmployees, setSelectedEmployees] = useState<string[]>([]);
  const [status, setStatus] = useState<"present" | "absent" | "leave" | "holiday">("present");
  const [notes, setNotes] = useState<string>("");
  const [checkInTime, setCheckInTime] = useState<string>("");
  const [shiftType, setShiftType] = useState<"day" | "night" | "regular">("regular");

  const { data: employees = [] } = useEmployees();
  const bulkMarkAttendance = useBulkMarkAttendance();

  // Group employees by department
  const employeesByDepartment = useMemo(() => {
    console.log("🔄 Grouping employees by department. Total employees:", employees.length);
    // Filter to only active employees first
    const activeEmployees = employees.filter((emp) => emp.is_active === true);
    const grouped = activeEmployees.reduce((acc, emp) => {
      const dept = emp.department || "Unassigned";
      if (!acc[dept]) {
        acc[dept] = [];
      }
      acc[dept].push(emp);
      return acc;
    }, {} as Record<string, typeof employees>);
    console.log("🔄 Grouped departments:", Object.keys(grouped));
    console.log("🔄 Department counts:", Object.entries(grouped).map(([dept, emps]) => `${dept}: ${emps.length}`));
    return grouped;
  }, [employees]);

  // Get available departments
  const departments = Object.keys(employeesByDepartment);

  // Get employees to show based on selection type
  const employeesToShow = useMemo(() => {
    // Filter to only active employees
    const activeEmployees = employees.filter((emp) => emp.is_active === true);
    
    if (selectionType === "department" && selectedDepartment) {
      // employeesByDepartment already filters active employees
      return employeesByDepartment[selectedDepartment] || [];
    }
    return activeEmployees;
  }, [selectionType, selectedDepartment, employeesByDepartment, employees]);

  // Handle employee selection
  const handleEmployeeToggle = (employeeId: string) => {
    setSelectedEmployees(prev => 
      prev.includes(employeeId) 
        ? prev.filter(id => id !== employeeId)
        : [...prev, employeeId]
    );
  };

  // Handle department selection
  const handleDepartmentSelect = (department: string) => {
    console.log("Department selected:", department);
    setSelectedDepartment(department);
    if (department) {
      const deptEmployees = employeesByDepartment[department] || [];
      console.log("Employees in department:", deptEmployees.length);
      const employeeIds = deptEmployees.map(emp => emp.id);
      console.log("Setting selected employees:", employeeIds);
      setSelectedEmployees(employeeIds);
      console.log("✅ Will set selected employees to:", employeeIds.length, "employees");
    } else {
      setSelectedEmployees([]);
      console.log("✅ Will clear selected employees");
    }
  };

  // Handle bulk attendance submission
  const handleSubmit = async () => {
    console.log("Bulk attendance submit clicked");
    console.log("Selected employees:", selectedEmployees);
    console.log("Selected date:", selectedDate);
    console.log("Status:", status);
    
    if (selectedEmployees.length === 0) {
      alert("Please select at least one employee");
      return;
    }

    if (selectedDate > getTodayDate()) {
      alert("Cannot mark attendance for future dates");
      return;
    }

    try {
      console.log("Submitting bulk attendance...");
      await bulkMarkAttendance.mutateAsync({
        employeeIds: selectedEmployees,
        attendanceDate: selectedDate,
        status,
        checkInTime: checkInTime || null,
        notes: notes || null,
        shiftType: selectedDepartment === "Enamel" ? shiftType : "regular",
      });

      console.log("Bulk attendance marked successfully!");
      
      // Reset form
      setSelectedEmployees([]);
      setSelectedDepartment("");
      setNotes("");
      setCheckInTime("");
      setShiftType("regular");
      onOpenChange(false);
    } catch (error) {
      console.error("Error in handleSubmit:", error);
      alert(`Failed to mark attendance: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const selectedConfig = statusConfig[status];
  const SelectedIcon = selectedConfig.icon;

  // Debug: Log selectedEmployees changes
  useEffect(() => {
    console.log("🔄 selectedEmployees state changed:", selectedEmployees.length, "employees");
    console.log("🔄 selectedEmployees IDs:", selectedEmployees);
  }, [selectedEmployees]);

  // Debug: Log employeesByDepartment changes
  useEffect(() => {
    console.log("🔄 employeesByDepartment updated:", Object.keys(employeesByDepartment));
  }, [employeesByDepartment]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto" style={{ pointerEvents: 'auto' }}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Bulk Attendance Marking
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6" style={{ pointerEvents: 'auto' }}>
          {/* Date Display */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Selected Date</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {new Date(selectedDate).toLocaleDateString("en-US", { 
                  weekday: "long", 
                  year: "numeric", 
                  month: "long", 
                  day: "numeric" 
                })}
              </div>
              {(() => {
                const today = getTodayDate();
                const selectedDateObj = new Date(selectedDate);
                const todayObj = new Date(today);
                return selectedDateObj > todayObj;
              })() && (
                <div className="text-sm text-destructive mt-2">
                  ⚠️ Cannot mark attendance for future dates
                </div>
              )}
            </CardContent>
          </Card>

          {/* Selection Type */}
          <div className="space-y-4">
            <Label className="text-base font-semibold">Selection Method</Label>
            <div className="flex gap-4">
              <Button
                variant={selectionType === "department" ? "default" : "outline"}
                onClick={() => setSelectionType("department")}
                className="flex items-center gap-2"
              >
                <Building2 className="h-4 w-4" />
                By Department
              </Button>
              <Button
                variant={selectionType === "individual" ? "default" : "outline"}
                onClick={() => setSelectionType("individual")}
                className="flex items-center gap-2"
              >
                <Users className="h-4 w-4" />
                Individual Selection
              </Button>
            </div>
          </div>

          {/* Department Selection */}
          {selectionType === "department" && (
            <div className="space-y-2">
              <Label>Select Department</Label>
              <Select value={selectedDepartment} onValueChange={handleDepartmentSelect}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a department" />
                </SelectTrigger>
                <SelectContent>
                  {departments.map((dept) => (
                    <SelectItem key={dept} value={dept}>
                      {dept} ({employeesByDepartment[dept]?.length || 0} employees)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Employee Selection */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label className="text-base font-semibold">
                Select Employees ({selectedEmployees.length} selected)
              </Label>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedEmployees(employeesToShow.map(emp => emp.id))}
                >
                  Select All
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedEmployees([])}
                >
                  Clear All
                </Button>
              </div>
            </div>

            <div className="max-h-60 overflow-y-auto border rounded-lg p-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {employeesToShow.map((employee) => (
                  <div
                    key={employee.id}
                    className="flex items-center space-x-3 p-3 rounded-lg border hover:bg-muted/50 transition-colors"
                  >
                    <Checkbox
                      id={employee.id}
                      checked={selectedEmployees.includes(employee.id)}
                      onCheckedChange={() => handleEmployeeToggle(employee.id)}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="font-medium truncate">{employee.name}</div>
                      <div className="text-sm text-muted-foreground">
                        {employee.employee_id} • {employee.department}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Status Selection */}
          <div className="space-y-4">
            <Label className="text-base font-semibold">Attendance Status</Label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {Object.entries(statusConfig).map(([statusKey, config]) => {
                const Icon = config.icon;
                return (
                  <Button
                    key={statusKey}
                    variant={status === statusKey ? "default" : "outline"}
                    onClick={() => setStatus(statusKey as any)}
                    className="flex items-center gap-2 h-auto p-4"
                  >
                    <Icon className="h-4 w-4" />
                    <div className="text-left">
                      <div className="font-medium">{config.label}</div>
                    </div>
                  </Button>
                );
              })}
            </div>
          </div>

          {/* Additional Options */}
          {status === "present" && selectedDepartment === "Enamel" && (
            <div className="space-y-4">
              <Label className="text-base font-semibold">Shift Type (Enamel Department)</Label>
              <div className="grid grid-cols-2 gap-4">
                <Button
                  variant={shiftType === "day" ? "default" : "outline"}
                  onClick={() => setShiftType("day")}
                  className={`h-auto p-4 flex flex-col items-center gap-2 ${
                    shiftType === "day" 
                      ? "bg-amber-500 text-white border-amber-500" 
                      : "hover:bg-muted/50"
                  }`}
                >
                  <Sun className="h-6 w-6" />
                  <div className="text-center">
                    <div className="font-medium">Day Shift</div>
                    <div className="text-xs opacity-80">11 hours duty</div>
                  </div>
                </Button>
                
                <Button
                  variant={shiftType === "night" ? "default" : "outline"}
                  onClick={() => setShiftType("night")}
                  className={`h-auto p-4 flex flex-col items-center gap-2 ${
                    shiftType === "night" 
                      ? "bg-blue-600 text-white border-blue-600" 
                      : "hover:bg-muted/50"
                  }`}
                >
                  <Moon className="h-6 w-6" />
                  <div className="text-center">
                    <div className="font-medium">Night Shift</div>
                    <div className="text-xs opacity-80">13 hours duty</div>
                  </div>
                </Button>
              </div>
            </div>
          )}

          {status === "present" && (
            <div className="space-y-2">
              <Label htmlFor="check-in-time">Check-in Time (Optional)</Label>
              <Input
                id="check-in-time"
                type="time"
                value={checkInTime}
                onChange={(e) => setCheckInTime(e.target.value)}
                placeholder="Leave empty for current time"
              />
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="notes">Notes (Optional)</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add any notes for this attendance marking..."
              rows={3}
            />
          </div>

          {/* Summary */}
          {selectedEmployees.length > 0 && (
            <Card className="bg-primary/5 border-primary/20">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <SelectedIcon className="h-5 w-5" />
                  Summary
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span>Status:</span>
                    <Badge className={selectedConfig.color}>
                      <SelectedIcon className="h-3 w-3 mr-1" />
                      {selectedConfig.label}
                    </Badge>
                  </div>
                  <div className="flex justify-between">
                    <span>Selected Employees:</span>
                    <span className="font-semibold">{selectedEmployees.length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Date:</span>
                    <span className="font-semibold">
                      {new Date(selectedDate).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4">
            <Button
              variant="outline"
              onClick={() => {
                console.log("Cancel button clicked");
                onOpenChange(false);
              }}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                console.log("=== MARK ATTENDANCE BUTTON CLICKED ===");
                console.log("Event:", e);
                console.log("Is pending:", bulkMarkAttendance.isPending);
                console.log("Selected employees count:", selectedEmployees.length);
                console.log("Selected employees:", selectedEmployees);
                console.log("Selected date:", selectedDate);
                console.log("Today's date:", new Date().toISOString().split("T")[0]);
                console.log("Date comparison:", selectedDate > new Date().toISOString().split("T")[0]);
                console.log("Button disabled?:", bulkMarkAttendance.isPending || selectedEmployees.length === 0 || selectedDate > new Date().toISOString().split("T")[0]);
                handleSubmit();
              }}
              disabled={(() => {
                const isPending = bulkMarkAttendance.isPending;
                const noEmployees = selectedEmployees.length === 0;
                const today = getTodayDate(); // Use the same function as the parent component
                const selectedDateObj = new Date(selectedDate);
                const todayObj = new Date(today);
                const futureDate = selectedDateObj > todayObj;
                
                console.log("📅 Date Debug:");
                console.log("  - Today (getTodayDate):", today);
                console.log("  - Selected date:", selectedDate);
                console.log("  - Selected date object:", selectedDateObj.toString());
                console.log("  - Today date object:", todayObj.toString());
                console.log("  - Selected > Today (string):", selectedDate > today);
                console.log("  - Selected > Today (date):", selectedDateObj > todayObj);
                console.log("  - Selected === Today (string):", selectedDate === today);
                console.log("  - Selected === Today (date):", selectedDateObj.getTime() === todayObj.getTime());
                console.log("  - Selected date time:", selectedDateObj.getTime());
                console.log("  - Today date time:", todayObj.getTime());
                const isDisabled = isPending || noEmployees || futureDate;
                
                console.log("🔍 Button disabled check:");
                console.log("  - isPending:", isPending);
                console.log("  - noEmployees:", noEmployees, "(count:", selectedEmployees.length, ")");
                console.log("  - futureDate:", futureDate, "(selected:", selectedDate, ", today:", today, ")");
                console.log("  - isDisabled:", isDisabled);
                
                return isDisabled;
              })()}
              className={`flex-1 transition-opacity ${
                selectedEmployees.length === 0 
                  ? "bg-gray-400 cursor-not-allowed opacity-50" 
                  : "bg-gradient-hero hover:opacity-90"
              }`}
              style={{ pointerEvents: 'auto', cursor: 'pointer' }}
            >
              {bulkMarkAttendance.isPending ? (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  Marking...
                </div>
              ) : (
                `Mark ${selectedEmployees.length} Employees as ${selectedConfig.label}`
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
