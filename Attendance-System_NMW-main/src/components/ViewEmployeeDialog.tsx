import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Employee } from "@/hooks/useEmployees";
import { Calendar, DollarSign, Building2, Phone, CreditCard } from "lucide-react";
import BiometricRegistration from "./BiometricRegistration";

interface ViewEmployeeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  employee: Employee | null;
}

export default function ViewEmployeeDialog({ open, onOpenChange, employee }: ViewEmployeeDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        {!employee ? (
          <div className="p-6 text-center">
            <p className="text-muted-foreground">No employee selected</p>
          </div>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>Employee Details</DialogTitle>
              <DialogDescription>
                View comprehensive information about the employee
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-6 py-4">
              {/* Header with Avatar */}
              <div className="flex items-center gap-4 pb-4 border-b">
                {employee.photo_url ? (
                  <img 
                    src={employee.photo_url} 
                    alt={employee.name} 
                    className="w-20 h-20 rounded-full object-cover border-2 border-primary"
                  />
                ) : (
                  <div className="w-20 h-20 rounded-full bg-gradient-primary flex items-center justify-center text-white font-bold text-2xl">
                    {employee.name.split(" ").map(n => n[0]).join("")}
                  </div>
                )}
                <div>
                  <h3 className="text-2xl font-bold">{employee.name}</h3>
                  <p className="text-muted-foreground">{employee.employee_id}</p>
                </div>
              </div>

              {/* Details Grid */}
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <CreditCard className="h-4 w-4" />
                    <span>CNIC</span>
                  </div>
                  <p className="font-semibold">{employee.cnic}</p>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Building2 className="h-4 w-4" />
                    <span>Department</span>
                  </div>
                  <Badge className="bg-primary/10 text-primary border-primary/20">
                    {employee.department}
                  </Badge>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Phone className="h-4 w-4" />
                    <span>Contact</span>
                  </div>
                  <p className="font-semibold">{employee.contact || "Not provided"}</p>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Calendar className="h-4 w-4" />
                    <span>Joining Date</span>
                  </div>
                  <p className="font-semibold">
                    {new Date(employee.joining_date).toLocaleDateString("en-US", {
                      year: "numeric",
                      month: "long",
                      day: "numeric"
                    })}
                  </p>
                </div>

                <div className="space-y-2 col-span-2">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <DollarSign className="h-4 w-4" />
                    <span>Base Salary</span>
                  </div>
                  <p className="text-2xl font-bold text-primary">
                    PKR {Number(employee.base_salary).toLocaleString()}
                  </p>
                </div>
              </div>

              {/* Status */}
              <div className="pt-4 border-t">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Employment Status</span>
                  <Badge className={employee.is_active ? "bg-success/10 text-success border-success/20" : "bg-destructive/10 text-destructive border-destructive/20"}>
                    {employee.is_active ? "Active" : "Inactive"}
                  </Badge>
                </div>
              </div>

              {/* Biometric Registration Section */}
              <div className="pt-4 border-t">
                <BiometricRegistration 
                  employeeId={employee.id} 
                  employeeName={employee.name} 
                />
              </div>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
