import { motion } from "framer-motion";
import { Clock, User, Monitor, MapPin, Shield, Calendar } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";

interface LoginRecord {
  id: string;
  user_id: string;
  user_email: string;
  login_time: string;
  logout_time: string | null;
  session_duration: number | null;
  browser: string | null;
  device: string | null;
  os: string | null;
  success: boolean;
}

const ADMIN_USER_ID = "cecd07a6-491b-46e7-8962-3545f7f6c5f2";

export default function LoginHistory() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loginHistory, setLoginHistory] = useState<LoginRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check if user is admin
    if (user?.id !== ADMIN_USER_ID) {
      navigate("/");
      return;
    }
    fetchLoginHistory();
  }, [user, navigate]);

  const fetchLoginHistory = async () => {
    setLoading(true);
    try {
      const { data, error } = await (supabase as any)
        .from('login_history')
        .select('*')
        .order('login_time', { ascending: false })
        .limit(100);

      if (error) throw error;
      setLoginHistory(data || []);
    } catch (error) {
      console.error('Error fetching login history:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDuration = (seconds: number | null) => {
    if (!seconds) return '-';
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
  };

  const getDeviceIcon = (device: string | null) => {
    if (!device) return <Monitor className="h-4 w-4" />;
    if (device.toLowerCase().includes('mobile')) return <Monitor className="h-4 w-4 text-primary" />;
    return <Monitor className="h-4 w-4" />;
  };

  // Statistics
  const stats = {
    totalLogins: loginHistory.length,
    activeToday: loginHistory.filter(l => {
      const loginDate = new Date(l.login_time).toDateString();
      const today = new Date().toDateString();
      return loginDate === today;
    }).length,
    averageSession: loginHistory.length > 0
      ? Math.floor(loginHistory.reduce((sum, l) => sum + (l.session_duration || 0), 0) / loginHistory.length)
      : 0,
    uniqueUsers: new Set(loginHistory.map(l => l.user_email)).size,
  };

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
            <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              Login History
            </h1>
            <p className="text-muted-foreground flex items-center gap-2">
              <Shield className="h-4 w-4" />
              Track user authentication and session activity
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
                <User className="h-6 w-6 text-primary" />
              </div>
            </div>
            <div className="text-3xl font-bold mb-1 group-hover:text-primary transition-colors duration-300">
              {stats.totalLogins}
            </div>
            <div className="text-sm text-muted-foreground group-hover:text-foreground transition-colors duration-300">
              Total Logins
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-soft border-0 hover:shadow-strong hover:scale-105 transition-all duration-300 cursor-pointer group">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 rounded-lg bg-green-100 dark:bg-green-900/30 group-hover:scale-110 transition-transform duration-300">
                <Calendar className="h-6 w-6 text-green-600 dark:text-green-400" />
              </div>
            </div>
            <div className="text-3xl font-bold mb-1 group-hover:text-green-600 transition-colors duration-300">
              {stats.activeToday}
            </div>
            <div className="text-sm text-muted-foreground group-hover:text-foreground transition-colors duration-300">
              Logins Today
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-soft border-0 hover:shadow-strong hover:scale-105 transition-all duration-300 cursor-pointer group">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 rounded-lg bg-blue-100 dark:bg-blue-900/30 group-hover:scale-110 transition-transform duration-300">
                <Clock className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
            <div className="text-3xl font-bold mb-1 group-hover:text-blue-600 transition-colors duration-300">
              {formatDuration(stats.averageSession)}
            </div>
            <div className="text-sm text-muted-foreground group-hover:text-foreground transition-colors duration-300">
              Avg. Session
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
              {stats.uniqueUsers}
            </div>
            <div className="text-sm text-muted-foreground group-hover:text-foreground transition-colors duration-300">
              Unique Users
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Login History Table */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <Card className="shadow-soft border-0 hover:shadow-strong transition-all duration-300">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-primary" />
              Recent Login Activity (Last 100 records)
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-12 text-muted-foreground">
                <div className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin mx-auto mb-4" />
                Loading login history...
              </div>
            ) : loginHistory.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Shield className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No login history found</p>
              </div>
            ) : (
              <div className="rounded-lg border overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50 hover:bg-muted/50">
                      <TableHead>User</TableHead>
                      <TableHead>Login Time</TableHead>
                      <TableHead>Logout Time</TableHead>
                      <TableHead>Duration</TableHead>
                      <TableHead>Browser</TableHead>
                      <TableHead>Device</TableHead>
                      <TableHead>OS</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loginHistory.map((record, index) => (
                      <TableRow key={record.id} className="hover:bg-muted/30 transition-colors duration-200">
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-2">
                            <User className="h-4 w-4 text-primary" />
                            {record.user_email}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Clock className="h-3 w-3 text-muted-foreground" />
                            {new Date(record.login_time).toLocaleString('en-US', {
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </div>
                        </TableCell>
                        <TableCell>
                          {record.logout_time ? (
                            new Date(record.logout_time).toLocaleString('en-US', {
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })
                          ) : (
                            <Badge variant="outline" className="border-green-300 text-green-700 bg-green-50">
                              Active
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary">
                            {formatDuration(record.session_duration)}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Monitor className="h-3 w-3 text-muted-foreground" />
                            {record.browser || 'Unknown'}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="gap-1">
                            {getDeviceIcon(record.device)}
                            {record.device || 'Unknown'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {record.os || 'Unknown'}
                        </TableCell>
                        <TableCell>
                          <Badge className={record.success ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300' : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300'}>
                            {record.success ? 'Success' : 'Failed'}
                          </Badge>
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
