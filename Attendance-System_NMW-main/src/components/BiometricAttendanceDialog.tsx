import { useState, useEffect } from "react";
import { Fingerprint, AlertCircle, Clock, LogIn, LogOut, Sun, Moon } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Label } from "@/components/ui/label";
import { isMobile, isTouchDevice, isWebAuthnSupported, isTablet } from "@/utils/mobileUtils";
import { useBiometricAuth } from "@/hooks/useBiometric";
import { useMarkAttendance, useAttendanceByDate } from "@/hooks/useAttendance";
import { toast } from "sonner";
import { getTodayDate } from "@/lib/utils";

interface BiometricAttendanceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedDate: string;
}

export default function BiometricAttendanceDialog({ open, onOpenChange, selectedDate }: BiometricAttendanceDialogProps) {
  const [isScanning, setIsScanning] = useState(false);
  const [mobileError, setMobileError] = useState<string | null>(null);
  const [identifiedEmployee, setIdentifiedEmployee] = useState<any>(null);
  const [attendanceType, setAttendanceType] = useState<"check-in" | "check-out">("check-in");
  const [shiftType, setShiftType] = useState<"day" | "night" | "regular">("regular");
  
  const biometricAuth = useBiometricAuth();
  const markAttendance = useMarkAttendance();
  const { data: existingAttendance = [] } = useAttendanceByDate(selectedDate);

  // Debug logging
  console.log("BiometricAttendanceDialog rendered", { open, selectedDate });

  // Reset state when dialog opens/closes
  useEffect(() => {
    if (open) {
      setIsScanning(false);
      setMobileError(null);
      setIdentifiedEmployee(null);
      setAttendanceType("check-in");
      setShiftType("regular");
    }
  }, [open]);

  // Mobile error handling
  useEffect(() => {
    const handleMobileError = (error: any) => {
      console.error("Mobile error in BiometricDialog:", error);
      setMobileError("Mobile compatibility issue detected");
    };
    
    window.addEventListener('error', handleMobileError);
    window.addEventListener('unhandledrejection', handleMobileError);
    
    return () => {
      window.removeEventListener('error', handleMobileError);
      window.removeEventListener('unhandledrejection', handleMobileError);
    };
  }, []);

  const isFutureDate = selectedDate > getTodayDate();
  const webAuthnSupported = isWebAuthnSupported();
  const mobileDevice = isMobile();
  const touchDevice = isTouchDevice();
  const tabletDevice = isTablet();

  const handleBiometricScan = async () => {
    setIsScanning(true);
    try {
      console.log("Starting biometric scan...");
      console.log("Attendance type:", attendanceType);
      
      // Use actual WebAuthn for all devices
      const employee = await biometricAuth.mutateAsync();
      console.log("Biometric authentication successful, employee:", employee);
      
      setIdentifiedEmployee(employee);
      
      // Check existing attendance for this employee
      const existingRecord = existingAttendance.find(att => att.employee_id === employee.id);
      console.log("Existing attendance record:", existingRecord);
      
      // Determine what to do based on attendance type and existing record
      let canProceed = true;
      let message = "";
      
      if (attendanceType === "check-in") {
        if (existingRecord && existingRecord.check_in_time) {
          canProceed = false;
          message = `${employee.name} has already checked in today at ${existingRecord.check_in_time}`;
        } else {
          message = `Welcome ${employee.name}! Ready to check in.`;
        }
      } else if (attendanceType === "check-out") {
        if (!existingRecord || !existingRecord.check_in_time) {
          canProceed = false;
          message = `${employee.name} must check in first before checking out`;
        } else if (existingRecord.check_out_time) {
          canProceed = false;
          message = `${employee.name} has already checked out today at ${existingRecord.check_out_time}`;
        } else {
          message = `Ready to check out ${employee.name}!`;
        }
      }
      
      console.log("Can proceed:", canProceed, "Message:", message);
      
      if (canProceed) {
        toast.success(message);
      } else {
        toast.error(message);
        setIdentifiedEmployee(null);
      }
      
    } catch (error: any) {
      console.error("Biometric scan error:", error);
      
      // Handle specific error cases
      if (error.message === "BIOMETRIC_COLUMNS_NOT_FOUND") {
        toast.error("Biometric database not set up. Please run the database migration first.");
      } else {
        toast.error(error.message || "Biometric authentication failed");
      }
    } finally {
      setIsScanning(false);
    }
  };

  const handleMarkAttendance = async () => {
    if (!identifiedEmployee) return;
    
    try {
      console.log("Marking attendance for:", identifiedEmployee);
      console.log("Attendance type:", attendanceType);
      console.log("Selected date:", selectedDate);
      
      const currentTime = new Date().toTimeString().split(" ")[0]; // HH:MM:SS format
      const existingRecord = existingAttendance.find(att => att.employee_id === identifiedEmployee.id);
      
      console.log("Existing record:", existingRecord);
      console.log("Current time:", currentTime);
      
      let attendanceData;
      
      // Determine shift type based on employee department
      let finalShiftType: "day" | "night" | "regular" = "regular";
      if (identifiedEmployee.department === "Enamel") {
        finalShiftType = shiftType; // Use selected shift for Enamel
      } else if (identifiedEmployee.department === "Workshop") {
        finalShiftType = "regular"; // Workshop uses regular shift (8.5 hours)
      } else {
        finalShiftType = "regular"; // Other departments use regular (8 hours)
      }
      
      if (attendanceType === "check-in") {
        attendanceData = {
          employee_id: identifiedEmployee.id,
          attendance_date: selectedDate,
          status: "present" as const,
          check_in_time: currentTime,
          check_out_time: existingRecord?.check_out_time || null,
          hours_worked: 0,
          overtime_hours: 0,
          undertime_hours: 0,
          late_hours: 0,
          notes: null,
          biometric_verified: true,
          biometric_credential_id: identifiedEmployee.biometric_credential_id,
          biometric_verification_time: new Date().toISOString(),
          shift_type: finalShiftType,
        };
      } else {
        attendanceData = {
          employee_id: identifiedEmployee.id,
          attendance_date: selectedDate,
          status: "present" as const,
          check_in_time: existingRecord?.check_in_time || currentTime,
          check_out_time: currentTime,
          hours_worked: 0,
          overtime_hours: 0,
          undertime_hours: 0,
          late_hours: 0,
          notes: null,
          biometric_verified: true,
          biometric_credential_id: identifiedEmployee.biometric_credential_id,
          biometric_verification_time: new Date().toISOString(),
          shift_type: existingRecord?.shift_type || finalShiftType,
        };
      }
      
      console.log("Attendance data to save:", attendanceData);
      
      const result = await markAttendance.mutateAsync(attendanceData);
      console.log("Attendance marked successfully:", result);
      
      const actionText = attendanceType === "check-in" ? "checked in" : "checked out";
      toast.success(`${identifiedEmployee.name} successfully ${actionText} at ${currentTime}`);
      
      // Reset the dialog
      setIdentifiedEmployee(null);
      onOpenChange(false);
      
    } catch (error: any) {
      console.error("Error marking attendance:", error);
      toast.error(error.message || "Failed to mark attendance");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={`max-w-2xl ${mobileDevice ? 'max-h-[90vh] overflow-y-auto' : ''}`}>
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold bg-gradient-accent bg-clip-text text-transparent">
            Biometric Attendance - {new Date(selectedDate).toLocaleDateString()}
          </DialogTitle>
          {isFutureDate && (
            <Badge variant="destructive" className="mt-2 w-fit">
              Cannot mark attendance for future dates
            </Badge>
          )}
        </DialogHeader>
        
        {/* Debug info */}
        <div className="text-xs text-muted-foreground mb-4">
          Debug: Dialog open={String(open)}, WebAuthn supported={String(webAuthnSupported)}, 
          Mobile: {String(mobileDevice)}, Touch: {String(touchDevice)}
        </div>

        <div className="space-y-6">
          {/* Attendance Type Selection */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-primary" />
              <h3 className="text-lg font-semibold">Select Attendance Type</h3>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <Button
                variant={attendanceType === "check-in" ? "default" : "outline"}
                onClick={() => setAttendanceType("check-in")}
                className={`h-auto p-4 flex flex-col items-center gap-2 ${
                  attendanceType === "check-in" 
                    ? "bg-success text-white border-success" 
                    : "hover:bg-muted/50"
                }`}
              >
                <LogIn className="h-6 w-6" />
                <div className="text-center">
                  <div className="font-medium">Check In</div>
                  <div className="text-xs opacity-80">Mark arrival time</div>
                </div>
              </Button>
              
              <Button
                variant={attendanceType === "check-out" ? "default" : "outline"}
                onClick={() => setAttendanceType("check-out")}
                className={`h-auto p-4 flex flex-col items-center gap-2 ${
                  attendanceType === "check-out" 
                    ? "bg-warning text-white border-warning" 
                    : "hover:bg-muted/50"
                }`}
              >
                <LogOut className="h-6 w-6" />
                <div className="text-center">
                  <div className="font-medium">Check Out</div>
                  <div className="text-xs opacity-80">Mark departure time</div>
                </div>
              </Button>
            </div>
          </div>

          {/* Shift Type Selection (for Enamel employees only) */}
          {identifiedEmployee && identifiedEmployee.department === "Enamel" && attendanceType === "check-in" && (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-primary" />
                <h3 className="text-lg font-semibold">Select Shift Type</h3>
              </div>
              
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

          {/* Mobile Error Display */}
          {mobileError && (
            <Alert className="border-destructive/20 bg-destructive/5">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <div className="space-y-2">
                  <p className="font-semibold">Mobile Compatibility Issue</p>
                  <p className="text-sm">{mobileError}</p>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => setMobileError(null)}
                  >
                    Dismiss
                  </Button>
                </div>
              </AlertDescription>
            </Alert>
          )}

          {/* Mobile Biometric Interface */}
          <div className="text-center py-8">
            <h3 className="text-lg font-semibold mb-2">
              Biometric {attendanceType === "check-in" ? "Check In" : "Check Out"}
            </h3>
            <p className="text-muted-foreground mb-4">
              {mobileDevice 
                ? `Use your device's fingerprint or face recognition to ${attendanceType === "check-in" ? "check in" : "check out"}`
                : `Use your device's biometric authentication to ${attendanceType === "check-in" ? "check in" : "check out"}`
              }
            </p>
            {tabletDevice && (
              <p className="text-sm text-info mb-2">
                📱 Tablet detected - Biometric features should work better on this device
              </p>
            )}
            
            <div className="space-y-4">
              <Button 
                onClick={handleBiometricScan}
                disabled={isScanning || isFutureDate}
                size="lg"
                className="bg-gradient-accent shadow-medium hover:shadow-strong w-full"
              >
                {isScanning ? (
                  <>
                    <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full mr-2" />
                    Scanning...
                  </>
                ) : (
                  <>
                    <Fingerprint className="h-4 w-4 mr-2" />
                    {attendanceType === "check-in" ? "Scan to Check In" : "Scan to Check Out"}
                  </>
                )}
              </Button>
              
              <div className="text-sm text-muted-foreground">
                {mobileDevice 
                  ? "This will use your phone's built-in biometric authentication"
                  : "This will use your device's fingerprint sensor"
                }
              </div>
            </div>
          </div>

          {/* Employee Identified Section */}
          {identifiedEmployee && (
            <div className="bg-success/5 p-4 rounded-lg border border-success/20">
              <h4 className="font-semibold text-success mb-2">Employee Identified!</h4>
              <p className="text-sm text-muted-foreground">
                Welcome {identifiedEmployee.name} ({identifiedEmployee.employee_id})
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Ready to {attendanceType === "check-in" ? "check in" : "check out"} for {new Date(selectedDate).toLocaleDateString()}
              </p>
              
              <div className="mt-4 flex gap-2">
                <Button 
                  onClick={handleMarkAttendance}
                  className="flex-1 bg-success hover:bg-success/90"
                  disabled={markAttendance.isPending || isFutureDate}
                >
                  {markAttendance.isPending ? (
                    <>
                      <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full mr-2" />
                      Processing...
                    </>
                  ) : (
                    <>
                      {attendanceType === "check-in" ? (
                        <>
                          <LogIn className="h-4 w-4 mr-2" />
                          Check In Now
                        </>
                      ) : (
                        <>
                          <LogOut className="h-4 w-4 mr-2" />
                          Check Out Now
                        </>
                      )}
                    </>
                  )}
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => setIdentifiedEmployee(null)}
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}