import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface DepartmentRulesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface DepartmentRule {
  id?: string;
  department: string;
  is_exempt_from_deductions: boolean;
  is_exempt_from_overtime: boolean;
  max_overtime_hours_per_day: number;
  max_advance_percentage: number;
  working_days_per_month: number;
  standard_hours_per_day: number;
  overtime_multiplier: number;
  min_hours_full_day?: number;
  half_day_hours?: number;
  day_shift_hours?: number;
  night_shift_hours?: number;
  night_shift_multiplier?: number;
}

const departments = ["Enamel", "Workshop", "Guards", "Cooks", "Admins", "Directors", "Accounts"];

export default function DepartmentRulesDialog({ open, onOpenChange }: DepartmentRulesDialogProps) {
  const [rules, setRules] = useState<DepartmentRule[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      fetchRules();
    }
  }, [open]);

  const fetchRules = async () => {
    setLoading(true);
    try {
      console.log("Fetching department rules...");
      const { data, error } = await supabase
        .from("department_calculation_rules")
        .select("*")
        .order("department");

      if (error) {
        console.error("Error fetching rules:", error);
        throw error;
      }

      console.log("Fetched rules:", data);

      // If no rules exist, create default rules for all departments
      if (!data || data.length === 0) {
        console.log("No rules found, creating default rules");
        const defaultRules = departments.map(dept => ({
          department: dept,
          is_exempt_from_deductions: ["Guards", "Admins", "Accounts"].includes(dept),
          is_exempt_from_overtime: ["Guards", "Admins", "Accounts"].includes(dept),
          max_overtime_hours_per_day: 4,
          max_advance_percentage: ["Guards", "Admins", "Accounts"].includes(dept) ? 30 : 50,
          working_days_per_month: 30,
          standard_hours_per_day: dept === "Enamel" ? 11 : dept === "Workshop" ? 8.5 : 8,
          overtime_multiplier: 1.5,
          min_hours_full_day: dept === "Enamel" ? 11 : dept === "Workshop" ? 8.5 : 8,
          half_day_hours: dept === "Enamel" ? 5.5 : dept === "Workshop" ? 4.25 : 4,
          day_shift_hours: dept === "Enamel" ? 11 : dept === "Workshop" ? 8.5 : 8,
          night_shift_hours: dept === "Enamel" ? 13 : dept === "Workshop" ? 8.5 : 8,
          night_shift_multiplier: 1.5,
        }));
        console.log("Default rules created:", defaultRules);
        setRules(defaultRules);
      } else {
        console.log("Setting existing rules:", data);
        setRules(data);
      }
    } catch (error: any) {
      console.error("Error fetching department rules:", error);
      toast.error("Failed to load department rules");
    } finally {
      setLoading(false);
    }
  };

  const updateRule = (index: number, field: keyof DepartmentRule, value: any) => {
    const newRules = [...rules];
    newRules[index] = { ...newRules[index], [field]: value };
    setRules(newRules);
  };

  const saveRules = async () => {
    setSaving(true);
    try {
      console.log("Saving rules:", rules);
      
      for (const rule of rules) {
        console.log("Processing rule:", rule);
        
        if (rule.id) {
          // Update existing rule
          console.log("Updating existing rule with ID:", rule.id);
          const { error } = await supabase
            .from("department_calculation_rules")
            .update(rule)
            .eq("id", rule.id);

          if (error) {
            console.error("Error updating rule:", error);
            throw error;
          }
        } else {
          // Insert new rule
          console.log("Inserting new rule for department:", rule.department);
          const { error } = await supabase
            .from("department_calculation_rules")
            .insert(rule);

          if (error) {
            console.error("Error inserting rule:", error);
            throw error;
          }
        }
      }

      toast.success("Department rules saved successfully!");
      onOpenChange(false);
    } catch (error: any) {
      console.error("Error saving department rules:", error);
      toast.error(`Failed to save department rules: ${error.message}`);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Department Calculation Rules</DialogTitle>
          </DialogHeader>
          <div className="flex items-center justify-center py-8">
            <div className="text-center">Loading department rules...</div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Department Calculation Rules</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          <div className="text-sm text-muted-foreground">
            Configure salary calculation rules for each department. These rules determine how salaries, 
            overtime, deductions, and advances are calculated.
          </div>

          {rules.map((rule, index) => (
            <div key={rule.department} className="p-4 border rounded-lg space-y-4">
              <h3 className="font-semibold text-lg">{rule.department} Department</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id={`exempt-deductions-${index}`}
                      checked={rule.is_exempt_from_deductions}
                      onCheckedChange={(checked) => 
                        updateRule(index, "is_exempt_from_deductions", checked)
                      }
                    />
                    <Label htmlFor={`exempt-deductions-${index}`}>
                      Exempt from Deductions
                    </Label>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    If checked, no salary deductions for absences or undertime
                  </p>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id={`exempt-overtime-${index}`}
                    checked={rule.is_exempt_from_overtime}
                    onCheckedChange={(checked) => 
                      updateRule(index, "is_exempt_from_overtime", checked)
                    }
                  />
                  <Label htmlFor={`exempt-overtime-${index}`}>
                    Exempt from Overtime
                  </Label>
                </div>
                <p className="text-xs text-muted-foreground">
                  If checked, no overtime pay calculations
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor={`max-overtime-${index}`}>Max Overtime Hours/Day</Label>
                  <Input
                    id={`max-overtime-${index}`}
                    type="number"
                    min="0"
                    max="12"
                    step="0.5"
                    value={rule.max_overtime_hours_per_day}
                    onChange={(e) => 
                      updateRule(index, "max_overtime_hours_per_day", Number(e.target.value))
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor={`max-advance-${index}`}>Max Advance %</Label>
                  <Input
                    id={`max-advance-${index}`}
                    type="number"
                    min="0"
                    max="100"
                    value={rule.max_advance_percentage}
                    onChange={(e) => 
                      updateRule(index, "max_advance_percentage", Number(e.target.value))
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor={`working-days-${index}`}>Working Days/Month</Label>
                  <Input
                    id={`working-days-${index}`}
                    type="number"
                    min="20"
                    max="31"
                    value={rule.working_days_per_month}
                    onChange={(e) => 
                      updateRule(index, "working_days_per_month", Number(e.target.value))
                    }
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor={`standard-hours-${index}`}>Standard Hours/Day</Label>
                  <Input
                    id={`standard-hours-${index}`}
                    type="number"
                    min="4"
                    max="12"
                    step="0.5"
                    value={rule.standard_hours_per_day}
                    onChange={(e) => 
                      updateRule(index, "standard_hours_per_day", Number(e.target.value))
                    }
                  />
                  <p className="text-xs text-muted-foreground">Default hours for regular shift</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor={`overtime-multiplier-${index}`}>Overtime Multiplier</Label>
                  <Input
                    id={`overtime-multiplier-${index}`}
                    type="number"
                    min="1.0"
                    max="3.0"
                    step="0.1"
                    value={rule.overtime_multiplier}
                    onChange={(e) => 
                      updateRule(index, "overtime_multiplier", Number(e.target.value))
                    }
                  />
                  <p className="text-xs text-muted-foreground">e.g., 1.5 = 150% pay</p>
                </div>
              </div>

              {/* Shift-Specific Configuration */}
              <div className="border-t pt-4 mt-4">
                <h4 className="font-medium mb-3 flex items-center gap-2">
                  <span className="text-amber-600">☀️</span> Day Shift & 
                  <span className="text-blue-600">🌙</span> Night Shift Configuration
                </h4>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor={`day-shift-hours-${index}`} className="flex items-center gap-2">
                      <span className="text-amber-600">☀️</span> Day Shift Hours
                    </Label>
                    <Input
                      id={`day-shift-hours-${index}`}
                      type="number"
                      min="4"
                      max="14"
                      step="0.5"
                      value={rule.day_shift_hours || rule.standard_hours_per_day}
                      onChange={(e) => 
                        updateRule(index, "day_shift_hours", Number(e.target.value))
                      }
                    />
                    <p className="text-xs text-muted-foreground">Duty hours for day shift</p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor={`night-shift-hours-${index}`} className="flex items-center gap-2">
                      <span className="text-blue-600">🌙</span> Night Shift Hours
                    </Label>
                    <Input
                      id={`night-shift-hours-${index}`}
                      type="number"
                      min="4"
                      max="14"
                      step="0.5"
                      value={rule.night_shift_hours || rule.standard_hours_per_day}
                      onChange={(e) => 
                        updateRule(index, "night_shift_hours", Number(e.target.value))
                      }
                    />
                    <p className="text-xs text-muted-foreground">Duty hours for night shift</p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor={`night-shift-multiplier-${index}`}>Night Shift Multiplier</Label>
                    <Input
                      id={`night-shift-multiplier-${index}`}
                      type="number"
                      min="1.0"
                      max="3.0"
                      step="0.1"
                      value={rule.night_shift_multiplier || rule.overtime_multiplier || 1.5}
                      onChange={(e) => 
                        updateRule(index, "night_shift_multiplier", Number(e.target.value))
                      }
                    />
                    <p className="text-xs text-muted-foreground">OT multiplier for night shift</p>
                  </div>
                </div>

                <div className="mt-3 p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-800">
                  <p className="text-xs text-blue-700 dark:text-blue-300">
                    <strong>Note:</strong> When employees mark attendance with day/night shift, 
                    these hours will be used for overtime and undertime calculations instead of standard hours.
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="flex justify-end gap-2 pt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={saveRules} disabled={saving}>
            {saving ? "Saving..." : "Save Rules"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
