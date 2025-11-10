import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Upload, X, Fingerprint } from "lucide-react";
import { useUpdateEmployee, Employee } from "@/hooks/useEmployees";
import { useRegisterBiometric } from "@/hooks/useBiometric";
import { Database } from "@/integrations/supabase/types";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { isWebAuthnSupported } from "@/utils/mobileUtils";

type DepartmentType = Database["public"]["Enums"]["department_type"];

interface EditEmployeeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  employee: Employee | null;
}

const departments: DepartmentType[] = ["Enamel", "Workshop", "Guards", "Cooks", "Admins", "Directors", "Accounts"];

export default function EditEmployeeDialog({ open, onOpenChange, employee }: EditEmployeeDialogProps) {
  const updateEmployee = useUpdateEmployee();
  const registerBiometric = useRegisterBiometric();
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [enableBiometric, setEnableBiometric] = useState(false);
  const [deviceName, setDeviceName] = useState("");
  const [isRegisteringBiometric, setIsRegisteringBiometric] = useState(false);
  
  // Don't return null if employee is not set - let the dialog render with empty state
  if (!employee && open) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl">
          <div className="p-6 text-center">
            <p className="text-muted-foreground">No employee selected</p>
          </div>
        </DialogContent>
      </Dialog>
    );
  }
  
  const [formData, setFormData] = useState({
    name: "",
    cnic: "",
    department: "Enamel" as DepartmentType,
    contact: "",
    base_salary: 0,
    overtime_rate: 0,
    overtime_wage: 0,
    photo_url: null as string | null,
  });

  useEffect(() => {
    if (employee) {
      setFormData({
        name: employee.name,
        cnic: employee.cnic,
        department: employee.department,
        contact: employee.contact || "",
        base_salary: employee.base_salary,
        overtime_rate: employee.overtime_rate || 0,
        overtime_wage: (employee as any).overtime_wage || 0,
        photo_url: employee.photo_url || null,
      });
      setPhotoPreview(employee.photo_url || null);
      setPhotoFile(null);
    }
  }, [employee]);

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error("Image size must be less than 5MB");
        return;
      }
      setPhotoFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const removePhoto = () => {
    setPhotoFile(null);
    setPhotoPreview(null);
    setFormData({ ...formData, photo_url: null });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!employee) return;
    
    let photoUrl = formData.photo_url;

    // Upload new photo if selected
    if (photoFile) {
      const fileExt = photoFile.name.split('.').pop();
      const fileName = `${employee.employee_id}-${Date.now()}.${fileExt}`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('employee-photos')
        .upload(fileName, photoFile);

      if (uploadError) {
        toast.error("Failed to upload photo");
        return;
      }

      const { data: urlData } = supabase.storage
        .from('employee-photos')
        .getPublicUrl(fileName);
      
      photoUrl = urlData.publicUrl;

      // Delete old photo if exists
      if (formData.photo_url) {
        const oldFileName = formData.photo_url.split('/').pop();
        if (oldFileName) {
          await supabase.storage
            .from('employee-photos')
            .remove([oldFileName]);
        }
      }
    }
    
    await updateEmployee.mutateAsync({
      id: employee.id,
      ...formData,
      photo_url: photoUrl,
    });

    // Register biometric if enabled
    if (enableBiometric && deviceName.trim()) {
      setIsRegisteringBiometric(true);
      try {
        await registerBiometric.mutateAsync({
          employee_id: employee.id,
          device_name: deviceName,
          credential_id: "",
          public_key: "",
          device_info: {}
        } as any);
        toast.success("Employee updated and biometric registered successfully!");
      } catch (error: any) {
        toast.error("Employee updated but biometric registration failed: " + error.message);
      } finally {
        setIsRegisteringBiometric(false);
      }
    }
    
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Edit Employee</DialogTitle>
          <DialogDescription>
            Update employee information and settings
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Profile Photo</Label>
            <div className="flex items-center gap-4">
              {photoPreview ? (
                <div className="relative">
                  <img 
                    src={photoPreview} 
                    alt="Preview" 
                    className="w-24 h-24 rounded-full object-cover border-2 border-border"
                  />
                  <Button
                    type="button"
                    variant="destructive"
                    size="icon"
                    className="absolute -top-2 -right-2 h-6 w-6 rounded-full"
                    onClick={removePhoto}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              ) : (
                <div className="w-24 h-24 rounded-full bg-muted flex items-center justify-center border-2 border-dashed border-border">
                  <Upload className="h-8 w-8 text-muted-foreground" />
                </div>
              )}
              <div className="flex-1">
                <Input
                  type="file"
                  accept="image/*"
                  onChange={handlePhotoChange}
                  className="cursor-pointer"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Max 5MB (JPG, PNG, WEBP)
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Full Name</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="cnic">CNIC</Label>
              <Input
                id="cnic"
                value={formData.cnic}
                onChange={(e) => setFormData({ ...formData, cnic: e.target.value })}
                placeholder="12345-1234567-1"
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="department">Department</Label>
              <Select
                value={formData.department}
                onValueChange={(value: DepartmentType) => setFormData({ ...formData, department: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {departments.map((dept) => (
                    <SelectItem key={dept} value={dept}>
                      {dept}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="contact">Contact</Label>
              <Input
                id="contact"
                value={formData.contact}
                onChange={(e) => setFormData({ ...formData, contact: e.target.value })}
                placeholder="+92 300 1234567"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="salary">Base Salary (PKR)</Label>
              <Input
                id="salary"
                type="number"
                value={formData.base_salary}
                onChange={(e) => setFormData({ ...formData, base_salary: Number(e.target.value) })}
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="overtime_rate">Overtime Hourly Rate</Label>
              <Input
                id="overtime_rate"
                type="number"
                value={formData.overtime_rate}
                onChange={(e) => setFormData({ ...formData, overtime_rate: Number(e.target.value) })}
                placeholder="e.g., 500"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="overtime_wage">Overtime Hourly Wage</Label>
              <Input
                id="overtime_wage"
                type="number"
                value={formData.overtime_wage}
                onChange={(e) => setFormData({ ...formData, overtime_wage: Number(e.target.value) })}
                placeholder="e.g., 500"
              />
            </div>
          </div>

          {/* Biometric Registration Section */}
          <div className="space-y-4 p-4 border rounded-lg bg-muted/30">
            <div className="flex items-center space-x-2">
              <Checkbox 
                id="enable_biometric" 
                checked={enableBiometric}
                onCheckedChange={(checked) => setEnableBiometric(checked as boolean)}
              />
              <Label htmlFor="enable_biometric" className="flex items-center gap-2">
                <Fingerprint className="h-4 w-4" />
                Register Biometric Device
              </Label>
            </div>
            
            {enableBiometric && (
              <div className="space-y-3">
                <div className="space-y-2">
                  <Label htmlFor="device_name">Device Name</Label>
                  <Input 
                    id="device_name" 
                    value={deviceName}
                    onChange={(e) => setDeviceName(e.target.value)}
                    placeholder="e.g., Office Kiosk, My Tablet"
                    required={enableBiometric}
                  />
                  <p className="text-xs text-muted-foreground">
                    Name to identify this biometric device
                  </p>
                </div>
                
                {!isWebAuthnSupported() && (
                  <div className="text-xs text-warning bg-warning/10 p-2 rounded">
                    ⚠️ Biometric authentication is not supported on this device. 
                    Registration will be skipped.
                  </div>
                )}
                
                {isWebAuthnSupported() && (
                  <div className="text-xs text-success bg-success/10 p-2 rounded">
                    ✅ This device supports biometric authentication. 
                    You'll be prompted to scan your fingerprint/face during registration.
                  </div>
                )}
              </div>
            )}
          </div>
          
          <div className="flex gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="flex-1">
              Cancel
            </Button>
            <Button 
              type="submit" 
              className="flex-1 bg-gradient-hero" 
              disabled={updateEmployee.isPending || isRegisteringBiometric}
            >
              {updateEmployee.isPending || isRegisteringBiometric 
                ? (isRegisteringBiometric ? "Registering Biometric..." : "Updating...") 
                : "Update Employee"
              }
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
