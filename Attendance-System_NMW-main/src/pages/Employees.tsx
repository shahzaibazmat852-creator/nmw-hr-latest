import { motion } from "framer-motion";
import { Search, Filter, Trash2, Fingerprint, Grid3X3, List, Users, Building2, Eye, EyeOff } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { useState, useMemo } from "react";
import { useEmployees, useDeleteEmployee, useToggleEmployeeActive, Employee } from "@/hooks/useEmployees";
import AddEmployeeDialog from "@/components/AddEmployeeDialog";
import EditEmployeeDialog from "@/components/EditEmployeeDialog";
import ViewEmployeeDialog from "@/components/ViewEmployeeDialog";
import BiometricRegistration from "@/components/BiometricRegistration";
import { ZKTecoSyncDialog } from "@/components/ZKTecoSyncDialog";
import { pageVariants, containerVariants, itemVariants, cardVariants } from "@/lib/animations";

const departmentColors: Record<string, string> = {
  Enamel: "bg-primary/10 text-primary border-primary/20",
  Workshop: "bg-accent/10 text-accent border-accent/20",
  Guards: "bg-info/10 text-info border-info/20",
  Cooks: "bg-warning/10 text-warning border-warning/20",
  Admins: "bg-success/10 text-success border-success/20",
  Directors: "bg-destructive/10 text-destructive border-destructive/20",
  Accounts: "bg-purple-500/10 text-purple-500 border-purple-500/20",
};

export default function Employees() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedDepartment, setSelectedDepartment] = useState<string>("all");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("active");
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [biometricDialogOpen, setBiometricDialogOpen] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  // Fetch all employees when filter is "all" or "inactive", otherwise only active
  const { data: employees = [], isLoading } = useEmployees(statusFilter !== "active");
  const deleteEmployee = useDeleteEmployee();
  const toggleEmployeeActive = useToggleEmployeeActive();

  // Get unique departments
  const departments = useMemo(() => {
    const deptSet = new Set(employees.map(emp => emp.department));
    return Array.from(deptSet).sort();
  }, [employees]);

  // Calculate statistics
  const stats = useMemo(() => {
    const total = employees.length;
    const active = employees.filter(emp => emp.is_active).length;
    const inactive = total - active;
    const biometricRegistered = employees.filter(emp => emp.biometric_registered).length;
    const biometricNotRegistered = total - biometricRegistered;
    
    const departmentStats = departments.reduce((acc, dept) => {
      acc[dept] = employees.filter(emp => emp.department === dept).length;
      return acc;
    }, {} as Record<string, number>);

    return {
      total,
      active,
      inactive,
      biometricRegistered,
      biometricNotRegistered,
      departmentStats
    };
  }, [employees, departments]);

  // Enhanced filtering logic
  const filteredEmployees = useMemo(() => {
    let filtered = employees;

    // Filter by active/inactive status
    if (statusFilter === "active") {
      filtered = filtered.filter(emp => emp.is_active === true);
    } else if (statusFilter === "inactive") {
      filtered = filtered.filter(emp => emp.is_active === false);
    }
    // If statusFilter === "all", show all employees (no filtering)

    // Filter by department
    if (selectedDepartment !== "all") {
      filtered = filtered.filter(emp => emp.department === selectedDepartment);
    }

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(emp =>
        emp.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        emp.employee_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        emp.cnic.includes(searchTerm) ||
        emp.department.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    return filtered;
  }, [employees, searchTerm, selectedDepartment, statusFilter]);

  return (
    <motion.div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20 p-4 pt-16 md:p-6 lg:p-8">
      {/* Header */}
      <div className="mb-4 md:mb-6 lg:mb-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4 md:mb-6">
          <div>
            <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold mb-2">Employees</h1>
            <p className="text-sm md:text-base text-muted-foreground">Manage your workforce efficiently</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <ZKTecoSyncDialog />
            <AddEmployeeDialog />
          </div>
        </div>

        {/* Statistics Cards */}
        <motion.div 
          className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 mb-6"
          variants={containerVariants}
        >
          <motion.div variants={itemVariants} whileHover={{ scale: 1.05, y: -4 }} whileTap={{ scale: 0.98 }}>
            <Card className="p-4 text-center cursor-pointer group h-full flex flex-col justify-center" style={{ transform: 'translateZ(0)' }}>
              <motion.div whileHover={{ scale: 1.15, rotate: 5 }} transition={{ duration: 0.2 }} className="h-6 mb-2">
                <Users className="h-6 w-6 mx-auto text-primary" />
              </motion.div>
              <div className="text-2xl font-bold group-hover:text-primary transition-colors duration-300">{stats.total}</div>
              <div className="text-sm text-muted-foreground group-hover:text-foreground transition-colors duration-300">Total</div>
            </Card>
          </motion.div>
          <motion.div variants={itemVariants} whileHover={{ scale: 1.05, y: -4 }} whileTap={{ scale: 0.98 }}>
            <Card className="p-4 text-center cursor-pointer group h-full flex flex-col justify-center" style={{ transform: 'translateZ(0)' }}>
              <motion.div whileHover={{ scale: 1.15, rotate: 5 }} transition={{ duration: 0.2 }} className="h-6 mb-2">
                <Eye className="h-6 w-6 mx-auto text-success" />
              </motion.div>
              <div className="text-2xl font-bold group-hover:text-success transition-colors duration-300">{stats.active}</div>
              <div className="text-sm text-muted-foreground group-hover:text-foreground transition-colors duration-300">Active</div>
            </Card>
          </motion.div>
          <motion.div variants={itemVariants} whileHover={{ scale: 1.05, y: -4 }} whileTap={{ scale: 0.98 }}>
            <Card className="p-4 text-center cursor-pointer group h-full flex flex-col justify-center" style={{ transform: 'translateZ(0)' }}>
              <motion.div whileHover={{ scale: 1.15, rotate: 5 }} transition={{ duration: 0.2 }} className="h-6 mb-2">
                <EyeOff className="h-6 w-6 mx-auto text-muted-foreground" />
              </motion.div>
              <div className="text-2xl font-bold group-hover:text-muted-foreground transition-colors duration-300">{stats.inactive}</div>
              <div className="text-sm text-muted-foreground group-hover:text-foreground transition-colors duration-300">Inactive</div>
            </Card>
          </motion.div>
          <motion.div variants={itemVariants} whileHover={{ scale: 1.05, y: -4 }} whileTap={{ scale: 0.98 }}>
            <Card className="p-4 text-center cursor-pointer group h-full flex flex-col justify-center" style={{ transform: 'translateZ(0)' }}>
              <motion.div whileHover={{ scale: 1.15, rotate: 5 }} transition={{ duration: 0.2 }} className="h-6 mb-2">
                <Fingerprint className="h-6 w-6 mx-auto text-accent" />
              </motion.div>
              <div className="text-2xl font-bold group-hover:text-accent transition-colors duration-300">{stats.biometricRegistered}</div>
              <div className="text-sm text-muted-foreground group-hover:text-foreground transition-colors duration-300">Biometric</div>
            </Card>
          </motion.div>
          <motion.div variants={itemVariants} whileHover={{ scale: 1.05, y: -4 }} whileTap={{ scale: 0.98 }}>
            <Card className="p-4 text-center cursor-pointer group h-full flex flex-col justify-center" style={{ transform: 'translateZ(0)' }}>
              <motion.div whileHover={{ scale: 1.15, rotate: 5 }} transition={{ duration: 0.2 }} className="h-6 mb-2">
                <Building2 className="h-6 w-6 mx-auto text-info" />
              </motion.div>
              <div className="text-2xl font-bold group-hover:text-info transition-colors duration-300">{departments.length}</div>
              <div className="text-sm text-muted-foreground group-hover:text-foreground transition-colors duration-300">Departments</div>
            </Card>
          </motion.div>
          <motion.div variants={itemVariants} whileHover={{ scale: 1.05, y: -4 }} whileTap={{ scale: 0.98 }}>
            <Card className="p-4 text-center cursor-pointer group h-full flex flex-col justify-center" style={{ transform: 'translateZ(0)' }}>
              <motion.div whileHover={{ scale: 1.15, rotate: 5 }} transition={{ duration: 0.2 }} className="h-6 mb-2 flex items-center justify-center">
                <Filter className="h-6 w-6 mx-auto text-info" />
              </motion.div>
              <div className="text-2xl font-bold group-hover:text-primary transition-colors duration-300">{filteredEmployees.length}</div>
              <div className="text-sm text-muted-foreground group-hover:text-foreground transition-colors duration-300">Filtered</div>
            </Card>
          </motion.div>
        </motion.div>

        {/* Enhanced Search and Filter Bar */}
        <div className="flex flex-col lg:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by name, ID, CNIC, or department..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          
          <div className="flex gap-2">
            <Select value={selectedDepartment} onValueChange={setSelectedDepartment}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="All Departments" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Departments</SelectItem>
                {departments.map(dept => (
                  <SelectItem key={dept} value={dept}>
                    {dept} ({stats.departmentStats[dept]})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={statusFilter} onValueChange={(value: "all" | "active" | "inactive") => setStatusFilter(value)}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Filter status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Show All</SelectItem>
                <SelectItem value="active">Show Active</SelectItem>
                <SelectItem value="inactive">Show Inactive</SelectItem>
              </SelectContent>
            </Select>

            <div className="flex border rounded-lg">
              <Button
                variant={viewMode === "grid" ? "default" : "ghost"}
                size="sm"
                onClick={() => setViewMode("grid")}
                className="rounded-r-none"
              >
                <Grid3X3 className="h-4 w-4" />
              </Button>
              <Button
                variant={viewMode === "list" ? "default" : "ghost"}
                size="sm"
                onClick={() => setViewMode("list")}
                className="rounded-l-none"
              >
                <List className="h-4 w-4" />
              </Button>
            </div>
          </div>
          </div>
        </div>
  
        {/* Employee Display */}
      {isLoading ? (
        <div className="text-center py-12">Loading employees...</div>
      ) : filteredEmployees.length === 0 ? (
        <div className="text-center py-12">
          <Users className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <h3 className="text-lg font-semibold mb-2">No employees found</h3>
          <p className="text-muted-foreground">
            {searchTerm || selectedDepartment !== "all" || statusFilter !== "all"
              ? "Try adjusting your filters or search terms"
              : "Get started by adding your first employee"}
          </p>
        </div>
      ) : viewMode === "grid" ? (
        <motion.div 
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4 lg:gap-6"
          variants={containerVariants}
          initial="initial"
          animate="animate"
        >
          {filteredEmployees.map((employee, index) => (
            <motion.div 
              key={employee.id}
              variants={itemVariants}
            >
              <Card 
                className={`p-6 border-0 shadow-soft group ${
                  !employee.is_active ? 'opacity-60' : ''
                }`}
                style={{
                  transform: 'translateZ(0)',
                  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                }}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    {employee.photo_url ? (
                      <img 
                        src={employee.photo_url} 
                        alt={employee.name} 
                        className="w-12 h-12 rounded-full object-cover border-2 border-border group-hover:scale-110 group-hover:border-primary transition-all duration-300"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-full bg-gradient-primary flex items-center justify-center text-white font-bold group-hover:scale-110 transition-transform duration-300">
                        {employee.name.split(" ").map(n => n[0]).join("")}
                      </div>
                    )}
                    <div>
                      <h3 className="font-semibold group-hover:text-primary transition-colors duration-300">{employee.name}</h3>
                      <p className="text-sm text-muted-foreground group-hover:text-foreground transition-colors duration-300">{employee.employee_id}</p>
                    </div>
                  </div>
                  {!employee.is_active && (
                    <Badge variant="secondary" className="text-xs">
                      Inactive
                    </Badge>
                  )}
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Department</span>
                    <Badge className={departmentColors[employee.department]}>
                      {employee.department}
                    </Badge>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">CNIC</span>
                    <span className="text-sm font-medium">{employee.cnic}</span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Salary</span>
                    <span className="text-sm font-semibold">PKR {Number(employee.base_salary).toLocaleString()}</span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Joined</span>
                    <span className="text-sm">{new Date(employee.joining_date).toLocaleDateString()}</span>
                  </div>

                  {employee.inactivation_date && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Inactivated</span>
                      <span className="text-sm text-muted-foreground">{new Date(employee.inactivation_date).toLocaleDateString()}</span>
                    </div>
                  )}

                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Biometric</span>
                    <Badge className={employee.biometric_registered ? "bg-success/10 text-success" : "bg-muted/10 text-muted-foreground"}>
                      {employee.biometric_registered ? "Registered" : "Not Registered"}
                    </Badge>
                  </div>
                </div>

                <div className="mt-4 pt-4 border-t border-border">
                  <div className="grid grid-cols-3 gap-2 mb-2">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => {
                        console.log("View button clicked for:", employee.name);
                        setSelectedEmployee(employee);
                        setViewDialogOpen(true);
                        console.log("View dialog should now be open");
                      }}
                      className="hover:bg-primary hover:text-primary-foreground hover:scale-105 transition-all duration-300"
                    >
                      View Details
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => {
                        console.log("Edit button clicked for:", employee.name);
                        setSelectedEmployee(employee);
                        setEditDialogOpen(true);
                        console.log("Edit dialog should now be open");
                      }}
                      className="hover:bg-primary hover:text-primary-foreground hover:scale-105 transition-all duration-300"
                    >
                      Edit
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => {
                        toggleEmployeeActive.mutate({ id: employee.id, is_active: !employee.is_active });
                      }}
                      className={`${employee.is_active ? "text-success border-success hover:bg-success hover:text-white" : "text-muted-foreground border-muted-foreground hover:bg-muted-foreground hover:text-white"} hover:scale-105 transition-all duration-300`}
                      disabled={toggleEmployeeActive.isPending}
                    >
                      {employee.is_active ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                    </Button>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <Button 
                      variant="outline" 
                      size="sm"
                      className={`${employee.biometric_registered ? "text-success border-success hover:bg-success hover:text-white" : "text-primary border-primary hover:bg-primary hover:text-white"} hover:scale-105 transition-all duration-300`}
                      onClick={() => {
                        setSelectedEmployee(employee);
                        setBiometricDialogOpen(true);
                      }}
                    >
                      <Fingerprint className="h-4 w-4 mr-1" />
                      {employee.biometric_registered ? "Manage" : "Register"}
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => {
                        setSelectedEmployee(employee);
                        setDeleteDialogOpen(true);
                      }}
                      className="text-destructive border-destructive hover:bg-destructive hover:text-destructive-foreground hover:scale-105 transition-all duration-300"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </Card>
            </motion.div>
          ))}
        </motion.div>
      ) : (
        <motion.div 
          className="space-y-4"
          variants={containerVariants}
          initial="initial"
          animate="animate"
        >
          {filteredEmployees.map((employee, index) => (
            <motion.div
              key={employee.id}
              variants={itemVariants}
              whileHover={{ scale: 1.01, x: 4 }}
              whileTap={{ scale: 0.99 }}
            >
              <Card 
                className={`p-4 ${
                  !employee.is_active ? 'opacity-60' : ''
                }`}
                style={{
                  transform: 'translateZ(0)',
                  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                }}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    {employee.photo_url ? (
                      <img 
                        src={employee.photo_url} 
                        alt={employee.name} 
                        className="w-10 h-10 rounded-full object-cover border-2 border-border"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-gradient-primary flex items-center justify-center text-white font-bold text-sm">
                        {employee.name.split(" ").map(n => n[0]).join("")}
                      </div>
                    )}
                    <div>
                      <h3 className="font-semibold">{employee.name}</h3>
                      <p className="text-sm text-muted-foreground">{employee.employee_id}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-6">
                    <Badge className={departmentColors[employee.department]}>
                      {employee.department}
                    </Badge>
                    <span className="text-sm font-medium">{employee.cnic}</span>
                    <span className="text-sm font-semibold">PKR {Number(employee.base_salary).toLocaleString()}</span>
                    <span className="text-sm text-muted-foreground">Joined: {new Date(employee.joining_date).toLocaleDateString()}</span>
                    {employee.inactivation_date && (
                      <span className="text-sm text-muted-foreground">Inactivated: {new Date(employee.inactivation_date).toLocaleDateString()}</span>
                    )}
                    <Badge className={employee.biometric_registered ? "bg-success/10 text-success" : "bg-muted/10 text-muted-foreground"}>
                      {employee.biometric_registered ? "Biometric" : "No Biometric"}
                    </Badge>
                    {!employee.is_active && (
                      <Badge variant="secondary">Inactive</Badge>
                    )}
                  </div>

                  <div className="flex gap-2">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => {
                        setSelectedEmployee(employee);
                        setViewDialogOpen(true);
                      }}
                    >
                      View
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => {
                        setSelectedEmployee(employee);
                        setEditDialogOpen(true);
                      }}
                    >
                      Edit
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => {
                        toggleEmployeeActive.mutate({ id: employee.id, is_active: !employee.is_active });
                      }}
                      className={`${employee.is_active ? "text-success border-success hover:bg-success hover:text-white" : "text-muted-foreground border-muted-foreground hover:bg-muted-foreground hover:text-white"} hover:scale-105 transition-all duration-300`}
                      disabled={toggleEmployeeActive.isPending}
                    >
                      {employee.is_active ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm"
                      className={employee.biometric_registered ? "text-success border-success hover:bg-success hover:text-white" : "text-primary border-primary hover:bg-primary hover:text-white"}
                      onClick={() => {
                        setSelectedEmployee(employee);
                        setBiometricDialogOpen(true);
                      }}
                    >
                      <Fingerprint className="h-4 w-4 mr-1" />
                      {employee.biometric_registered ? "Manage" : "Register"}
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => {
                        setSelectedEmployee(employee);
                        setDeleteDialogOpen(true);
                      }}
                      className="text-destructive border-destructive hover:bg-destructive hover:text-destructive-foreground hover:scale-105 transition-all duration-300"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </Card>
            </motion.div>
          ))}
        </motion.div>
      )}

      <EditEmployeeDialog 
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        employee={selectedEmployee}
      />

      <ViewEmployeeDialog 
        open={viewDialogOpen}
        onOpenChange={setViewDialogOpen}
        employee={selectedEmployee}
      />

      {/* Biometric Registration Dialog */}
      <AlertDialog open={biometricDialogOpen} onOpenChange={setBiometricDialogOpen}>
        <AlertDialogContent className="max-w-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Fingerprint className="h-5 w-5" />
              Register Fingerprint for {selectedEmployee?.name}
            </AlertDialogTitle>
            <AlertDialogDescription>
              Register this employee's fingerprint on the current device for biometric attendance.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-4">
            {selectedEmployee && (
              <BiometricRegistration 
                employeeId={selectedEmployee.id} 
                employeeName={selectedEmployee.name} 
              />
            )}
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Close</AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Employee</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete {selectedEmployee?.name}? This will mark the employee as inactive.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (selectedEmployee) {
                  deleteEmployee.mutate(selectedEmployee.id);
                  setDeleteDialogOpen(false);
                }
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </motion.div>
  );
}
