import { motion } from "framer-motion";
import { Clock, User, Shield, Edit, FileEdit, Calendar, Filter } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";

interface EditRecord {
  id: string;
  user_id: string;
  user_email: string;
  table_name: string;
  record_id: string;
  action: string;
  old_values: any;
  new_values: any;
  changed_fields: string[];
  edited_at: string;
}

const ADMIN_USER_ID = "cecd07a6-491b-46e7-8962-3545f7f6c5f2";

export default function EditHistory() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [editHistory, setEditHistory] = useState<EditRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterTable, setFilterTable] = useState<string>("all");
  const [employeeMap, setEmployeeMap] = useState<Record<string, string>>({});

  useEffect(() => {
    // Check if user is admin
    if (user?.id !== ADMIN_USER_ID) {
      navigate("/");
      return;
    }
    fetchEditHistory();
  }, [user, navigate, filterTable]);

  const fetchEditHistory = async () => {
    setLoading(true);
    try {
      let query = (supabase as any)
        .from('edit_history')
        .select('*')
        .order('edited_at', { ascending: false })
        .limit(100);

      if (filterTable !== "all") {
        query = query.eq('table_name', filterTable);
      }

      const { data, error } = await query;

      if (error) throw error;
      setEditHistory(data || []);
      
      // Fetch all employee IDs from the edit history
      const employeeIds = new Set<string>();
      (data || []).forEach((edit: EditRecord) => {
        if (edit.old_values?.employee_id) {
          employeeIds.add(edit.old_values.employee_id);
        }
        if (edit.new_values?.employee_id) {
          employeeIds.add(edit.new_values.employee_id);
        }
      });
      
      // Fetch employee names
      if (employeeIds.size > 0) {
        const { data: employees, error: empError } = await supabase
          .from('employees')
          .select('id, name')
          .in('id', Array.from(employeeIds));
        
        if (!empError && employees) {
          const empMap: Record<string, string> = {};
          employees.forEach((emp: any) => {
            empMap[emp.id] = emp.name;
          });
          setEmployeeMap(empMap);
        }
      }
    } catch (error) {
      console.error('Error fetching edit history:', error);
    } finally {
      setLoading(false);
    }
  };

  const getActionBadgeColor = (action: string) => {
    switch (action) {
      case 'UPDATE':
        return 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 hover:bg-blue-200 dark:hover:bg-blue-900/50';
      case 'DELETE':
        return 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 hover:bg-red-200 dark:hover:bg-red-900/50';
      default:
        return 'bg-gray-100 dark:bg-gray-800/50 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-800/70';
    }
  };

  const getTableBadgeColor = (tableName: string) => {
    switch (tableName) {
      case 'attendance':
        return 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 hover:bg-blue-200 dark:hover:bg-blue-900/50';
      case 'payments':
        return 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 hover:bg-green-200 dark:hover:bg-green-900/50';
      case 'payroll':
        return 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 hover:bg-purple-200 dark:hover:bg-purple-900/50';
      default:
        return 'bg-gray-100 dark:bg-gray-800/50 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-800/70';
    }
  };

  const formatChanges = (changedFields: string[], oldValues: any, newValues: any, action: string) => {
    if (!changedFields || changedFields.length === 0) return 'No changes';
    
    // Helper to get employee name or ID
    const getEmployeeDisplay = (employeeId: string) => {
      return employeeMap[employeeId] || employeeId;
    };
    
    // For DELETE actions, show only the meaningful old values
    if (action === 'DELETE') {
      const importantFields = ['status', 'attendance_date', 'employee_id', 'amount', 'payment_date', 'month', 'year', 'final_salary'];
      const relevantFields = changedFields.filter(field => 
        importantFields.includes(field) && oldValues?.[field] !== null && oldValues?.[field] !== undefined
      );
      
      if (relevantFields.length === 0) return 'Record deleted';
      
      return relevantFields
        .map(field => {
          if (field === 'employee_id') {
            return `employee: ${getEmployeeDisplay(oldValues[field])}`;
          }
          return `${field}: ${oldValues[field]}`;
        })
        .join(', ');
    }
    
    // For UPDATE actions, show old → new
    return changedFields
      .filter(field => !['updated_at', 'created_at', 'id'].includes(field))
      .map(field => {
        const oldVal = oldValues?.[field] ?? 'null';
        const newVal = newValues?.[field] ?? 'null';
        
        if (field === 'employee_id') {
          return `employee: ${getEmployeeDisplay(oldVal)} → ${getEmployeeDisplay(newVal)}`;
        }
        
        return `${field}: ${oldVal} → ${newVal}`;
      })
      .join(', ');
  };

  // Statistics
  const stats = {
    totalEdits: editHistory.length,
    attendanceEdits: editHistory.filter(e => e.table_name === 'attendance').length,
    paymentEdits: editHistory.filter(e => e.table_name === 'payments').length,
    payrollEdits: editHistory.filter(e => e.table_name === 'payroll').length,
  };

  if (loading || user?.id !== ADMIN_USER_ID) {
    return (
      <div className="min-h-screen bg-background p-8">
        <div className="text-center">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20 p-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <div className="flex items-center justify-between mb-6">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <Shield className="h-8 w-8 text-primary" />
              <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                Edit History
              </h1>
            </div>
            <p className="text-muted-foreground flex items-center gap-2">
              <FileEdit className="h-4 w-4" />
              Track all changes to attendance, payments, and payroll records • Admin Access Only
            </p>
          </div>
        </div>
      </motion.div>

      {/* Statistics Cards */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8"
      >
        <Card className="shadow-soft border-0 hover:shadow-strong hover:scale-105 transition-all duration-300 cursor-pointer group">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 rounded-lg bg-primary/10 group-hover:scale-110 transition-transform duration-300">
                <Edit className="h-6 w-6 text-primary" />
              </div>
            </div>
            <div className="text-3xl font-bold mb-1 group-hover:text-primary transition-colors duration-300">
              {stats.totalEdits}
            </div>
            <div className="text-sm text-muted-foreground group-hover:text-foreground transition-colors duration-300">
              Total Edits
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-soft border-0 hover:shadow-strong hover:scale-105 transition-all duration-300 cursor-pointer group">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 rounded-lg bg-blue-100 group-hover:scale-110 transition-transform duration-300">
                <Calendar className="h-6 w-6 text-blue-600" />
              </div>
            </div>
            <div className="text-3xl font-bold mb-1 group-hover:text-blue-600 transition-colors duration-300">
              {stats.attendanceEdits}
            </div>
            <div className="text-sm text-muted-foreground group-hover:text-foreground transition-colors duration-300">
              Attendance Edits
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-soft border-0 hover:shadow-strong hover:scale-105 transition-all duration-300 cursor-pointer group">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 rounded-lg bg-green-100 group-hover:scale-110 transition-transform duration-300">
                <Clock className="h-6 w-6 text-green-600" />
              </div>
            </div>
            <div className="text-3xl font-bold mb-1 group-hover:text-green-600 transition-colors duration-300">
              {stats.paymentEdits}
            </div>
            <div className="text-sm text-muted-foreground group-hover:text-foreground transition-colors duration-300">
              Payment Edits
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-soft border-0 hover:shadow-strong hover:scale-105 transition-all duration-300 cursor-pointer group">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 rounded-lg bg-purple-100 group-hover:scale-110 transition-transform duration-300">
                <Shield className="h-6 w-6 text-purple-600" />
              </div>
            </div>
            <div className="text-3xl font-bold mb-1 group-hover:text-purple-600 transition-colors duration-300">
              {stats.payrollEdits}
            </div>
            <div className="text-sm text-muted-foreground group-hover:text-foreground transition-colors duration-300">
              Payroll Edits
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Filter */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="mb-6"
      >
        <Card className="shadow-soft border-0">
          <CardContent className="p-4">
            <div className="flex items-center gap-4">
              <Filter className="h-5 w-5 text-muted-foreground" />
              <Select value={filterTable} onValueChange={setFilterTable}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Filter by table" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Tables</SelectItem>
                  <SelectItem value="attendance">Attendance</SelectItem>
                  <SelectItem value="payments">Payments</SelectItem>
                  <SelectItem value="payroll">Payroll</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Edit History Table */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        <Card className="shadow-soft border-0 hover:shadow-strong transition-all duration-300">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileEdit className="h-5 w-5 text-primary" />
              Recent Edit Activity (Last 100 records)
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-12 text-muted-foreground">
                <div className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin mx-auto mb-4" />
                Loading edit history...
              </div>
            ) : editHistory.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <FileEdit className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No edit history found</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Timestamp</TableHead>
                      <TableHead>User</TableHead>
                      <TableHead>Table</TableHead>
                      <TableHead>Action</TableHead>
                      <TableHead>Changes</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {editHistory.map((edit) => (
                      <TableRow 
                        key={edit.id}
                        className="hover:bg-muted/50 transition-colors duration-200"
                      >
                        <TableCell className="font-medium">
                          <div className="flex flex-col">
                            <span className="text-sm">
                              {format(new Date(edit.edited_at), 'MMM dd, yyyy')}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {format(new Date(edit.edited_at), 'hh:mm:ss a')}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <User className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm">{edit.user_email}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge className={getTableBadgeColor(edit.table_name)}>
                            {edit.table_name}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge className={getActionBadgeColor(edit.action)}>
                            {edit.action}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="max-w-md text-sm text-muted-foreground">
                            {formatChanges(edit.changed_fields, edit.old_values, edit.new_values, edit.action)}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
