import { useState, useRef, useEffect, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { motion, AnimatePresence } from "framer-motion";
import { Send, Bot, User, Loader2, Sparkles, Mic, MicOff, Trash2, MessageSquare, Volume2, VolumeX, Zap, TrendingUp } from "lucide-react";
import { geminiService, ChatMessage } from "@/services/geminiService";
import { analyzeQuery } from "@/utils/aiQueryDetector";
import { useAIDataCache } from "@/hooks/useAIDataCache";

declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
}

interface AIChatDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function AIChatDialog({ open, onOpenChange }: AIChatDialogProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputMessage, setInputMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [recognition, setRecognition] = useState<any | null>(null);
  const [ttsEnabled, setTtsEnabled] = useState(false);
  const [showWelcome, setShowWelcome] = useState(false);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  // Get last user message to analyze
  const lastUserMessage = useMemo(() => {
    const userMessages = messages.filter(m => m.role === 'user');
    return userMessages[userMessages.length - 1]?.content || inputMessage;
  }, [messages, inputMessage]);

  // Analyze last query to determine what data is needed
  const queryAnalysis = useMemo(() => analyzeQuery(lastUserMessage), [lastUserMessage]);
  
  // Always fetch ALL data for comprehensive access
  const { employees, payrollData, attendanceData, advancesData, paymentsData } = useAIDataCache({
    needsEmployees: true,
    needsPayroll: true,
    needsAttendance: true,
    needsAdvances: true,
    needsPayments: true,
    needsHistorical: true,
  });

  // Initialize speech recognition
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      
      if (SpeechRecognition) {
        const recognitionInstance = new SpeechRecognition();
        recognitionInstance.continuous = false;
        recognitionInstance.interimResults = false;
        recognitionInstance.lang = 'en-US';
        
        recognitionInstance.onstart = () => setIsListening(true);
        recognitionInstance.onresult = (event: any) => {
          const transcript = event.results[0][0].transcript;
          setInputMessage(transcript);
          setIsListening(false);
        };
        recognitionInstance.onerror = () => setIsListening(false);
        recognitionInstance.onend = () => setIsListening(false);
        
        setRecognition(recognitionInstance);
      }
    }
  }, []);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  // Welcome screen
  useEffect(() => {
    const shown = localStorage.getItem('nmw_welcome_shown');
    if (!shown && open) {
      setShowWelcome(true);
      localStorage.setItem('nmw_welcome_shown', '1');
    }
  }, [open]);

  const speak = (text: string) => {
    if (!ttsEnabled || typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    
    try {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'en-US';
      utterance.rate = 1.0;
      utterance.pitch = 1.0;
      utterance.volume = 1.0;
      
      setTimeout(() => {
        const voices = window.speechSynthesis.getVoices();
        const preferredVoice = voices.find((v: any) => 
          v.lang.startsWith('en') && (v.name.includes('Google') || v.name.includes('Natural'))
        ) || voices.find((v: any) => v.lang.startsWith('en')) || voices[0];
        
        if (preferredVoice) utterance.voice = preferredVoice;
        window.speechSynthesis.speak(utterance);
      }, 100);
    } catch (e) {
      console.error('TTS error:', e);
    }
  };

  const buildContext = (query: string) => {
    const activeEmployees = employees.filter((e: any) => e.is_active);
    const inactiveEmployees = employees.filter((e: any) => !e.is_active);
    
    // Department breakdown
    const departmentBreakdown = activeEmployees.reduce((acc: Record<string, any>, emp: any) => {
      if (!acc[emp.department]) {
        acc[emp.department] = { count: 0, totalSalary: 0, employees: [] };
      }
      acc[emp.department].count++;
      acc[emp.department].totalSalary += Number(emp.base_salary || 0);
      acc[emp.department].employees.push(emp.name);
      return acc;
    }, {});

    // Build COMPREHENSIVE context with ALL data
    let context = `NMW Attendance-PayRoll System - COMPREHENSIVE DATA ANALYSIS:\n\n`;
    context += `You have access to COMPLETE historical data. Answer complex queries using this comprehensive dataset.\n\n`;

    // ALL EMPLOYEES DATA
    context += `=== ALL EMPLOYEES (${employees.length} total, ${activeEmployees.length} active, ${inactiveEmployees.length} inactive) ===\n`;
    context += `ACTIVE EMPLOYEES:\n`;
    activeEmployees.forEach((emp: any) => {
      context += `- ${emp.name} (ID: ${emp.employee_id}): ${emp.department}, Base Salary: PKR ${Number(emp.base_salary || 0).toLocaleString()}, CNIC: ${emp.cnic || 'N/A'}, Joined: ${emp.joining_date || 'N/A'}, Overtime Rate: ${emp.overtime_rate || 'N/A'}, Biometric: ${emp.biometric_registered ? 'Yes' : 'No'}\n`;
    });
    if (inactiveEmployees.length > 0) {
      context += `\nINACTIVE EMPLOYEES:\n`;
      inactiveEmployees.forEach((emp: any) => {
        context += `- ${emp.name} (ID: ${emp.employee_id}): ${emp.department}, Inactivated: ${emp.inactivation_date || 'N/A'}\n`;
      });
    }
    context += `\nDEPARTMENT BREAKDOWN:\n`;
    Object.entries(departmentBreakdown).forEach(([dept, stats]: [string, any]) => {
      context += `- ${dept}: ${stats.count} employees, Total Salary Budget: PKR ${stats.totalSalary.toLocaleString()}, Avg Salary: PKR ${Math.round(stats.totalSalary / stats.count).toLocaleString()}\n`;
    });
    context += `\n`;

    // ALL PAYROLL DATA
    context += `=== ALL PAYROLL RECORDS (${payrollData.length} total records) ===\n`;
    if (payrollData.length > 0) {
      // Group by employee for trends
      const payrollByEmployee: Record<string, any[]> = {};
      payrollData.forEach((p: any) => {
        const empId = p.employees?.employee_id || 'Unknown';
        if (!payrollByEmployee[empId]) payrollByEmployee[empId] = [];
        payrollByEmployee[empId].push(p);
      });

      // Group by month/year
      const payrollByPeriod: Record<string, any[]> = {};
      payrollData.forEach((p: any) => {
        const key = `${p.year}-${String(p.month).padStart(2, '0')}`;
        if (!payrollByPeriod[key]) payrollByPeriod[key] = [];
        payrollByPeriod[key].push(p);
      });

      context += `PAYROLL BY PERIOD:\n`;
      Object.entries(payrollByPeriod).slice(0, 20).forEach(([period, records]: [string, any[]]) => {
        const total = records.reduce((sum, r) => sum + Number(r.final_salary || 0), 0);
        const avg = total / records.length;
        context += `- ${period}: ${records.length} employees, Total: PKR ${total.toLocaleString()}, Avg: PKR ${Math.round(avg).toLocaleString()}\n`;
      });

      context += `\nRECENT PAYROLL RECORDS (last 100):\n`;
      payrollData.slice(0, 100).forEach((p: any) => {
        context += `- ${p.employees?.name} [${p.employees?.employee_id}] (${p.employees?.department}) ${p.month}/${p.year}: Base PKR ${Number(p.base_salary || 0).toLocaleString()}, Final PKR ${Number(p.final_salary || 0).toLocaleString()}, Present: ${p.present_days} days, Absent: ${p.absent_days} days, Leave: ${p.leave_days || 0} days, Holiday: ${p.holiday_days || 0} days, Overtime Pay: PKR ${Number(p.overtime_pay || 0).toLocaleString()}, Advance: PKR ${Number(p.advance_amount || 0).toLocaleString()}, Status: ${p.status || 'pending'}\n`;
      });
    }
    context += `\n`;

    // ALL ATTENDANCE DATA
    context += `=== ALL ATTENDANCE RECORDS (${attendanceData.length} total records) ===\n`;
    if (attendanceData.length > 0) {
      // Group by employee
      const attendanceByEmployee: Record<string, any[]> = {};
      attendanceData.forEach((a: any) => {
        const empId = a.employees?.employee_id || 'Unknown';
        if (!attendanceByEmployee[empId]) attendanceByEmployee[empId] = [];
        attendanceByEmployee[empId].push(a);
      });

      // Group by date
      const attendanceByDate: Record<string, any[]> = {};
      attendanceData.forEach((a: any) => {
        const date = a.attendance_date;
        if (!attendanceByDate[date]) attendanceByDate[date] = [];
        attendanceByDate[date].push(a);
      });

      // Calculate statistics
      const totalPresent = attendanceData.filter((a: any) => a.status === 'present').length;
      const totalAbsent = attendanceData.filter((a: any) => a.status === 'absent').length;
      const totalLeave = attendanceData.filter((a: any) => a.status === 'leave').length;
      const totalHoliday = attendanceData.filter((a: any) => a.status === 'holiday').length;
      const totalOvertimeHours = attendanceData.reduce((sum: number, a: any) => sum + Number(a.overtime_hours || 0), 0);
      const totalUndertimeHours = attendanceData.reduce((sum: number, a: any) => sum + Number(a.undertime_hours || 0), 0);
      const totalLateHours = attendanceData.reduce((sum: number, a: any) => sum + Number(a.late_hours || 0), 0);
      const biometricVerified = attendanceData.filter((a: any) => a.biometric_verified).length;

      context += `ATTENDANCE STATISTICS:\n`;
      context += `- Total Present Days: ${totalPresent}\n`;
      context += `- Total Absent Days: ${totalAbsent}\n`;
      context += `- Total Leave Days: ${totalLeave}\n`;
      context += `- Total Holiday Days: ${totalHoliday}\n`;
      context += `- Total Overtime Hours: ${totalOvertimeHours.toFixed(1)}h\n`;
      context += `- Total Undertime Hours: ${totalUndertimeHours.toFixed(1)}h\n`;
      context += `- Total Late Hours: ${totalLateHours.toFixed(1)}h\n`;
      context += `- Biometric Verified: ${biometricVerified} records\n`;

      context += `\nRECENT ATTENDANCE (last 200 records):\n`;
      attendanceData.slice(0, 200).forEach((a: any) => {
        context += `- ${a.employees?.name} [${a.employees?.employee_id}] (${a.employees?.department}) ${a.attendance_date}: ${a.status}`;
        if (a.check_in_time) context += `, Check-in: ${a.check_in_time}`;
        if (a.check_out_time) context += `, Check-out: ${a.check_out_time}`;
        if (a.hours_worked) context += `, Hours: ${a.hours_worked}h`;
        if (a.overtime_hours > 0) context += `, OT: ${a.overtime_hours}h`;
        if (a.undertime_hours > 0) context += `, UT: ${a.undertime_hours}h`;
        if (a.late_hours > 0) context += `, Late: ${a.late_hours}h`;
        if (a.biometric_verified) context += ` [Biometric]`;
        context += `\n`;
      });

      // Employee attendance patterns
      context += `\nEMPLOYEE ATTENDANCE PATTERNS:\n`;
      Object.entries(attendanceByEmployee).slice(0, 30).forEach(([empId, records]: [string, any[]]) => {
        const present = records.filter(r => r.status === 'present').length;
        const absent = records.filter(r => r.status === 'absent').length;
        const leave = records.filter(r => r.status === 'leave').length;
        const totalOT = records.reduce((sum, r) => sum + Number(r.overtime_hours || 0), 0);
        const employeeName = records[0]?.employees?.name || 'Unknown';
        context += `- ${employeeName} [${empId}]: ${records.length} records, Present: ${present}, Absent: ${absent}, Leave: ${leave}, Total OT: ${totalOT.toFixed(1)}h\n`;
      });
    }
    context += `\n`;

    // ALL ADVANCES DATA
    context += `=== ALL ADVANCES RECORDS (${advancesData.length} total transactions) ===\n`;
    if (advancesData.length > 0) {
      const totalAdvances = advancesData.reduce((sum: number, a: any) => sum + Number(a.amount || 0), 0);
      const advancesByEmployee: Record<string, number> = {};
      advancesData.forEach((a: any) => {
        const empId = a.employees?.employee_id || 'Unknown';
        advancesByEmployee[empId] = (advancesByEmployee[empId] || 0) + Number(a.amount || 0);
      });

      context += `TOTAL ADVANCES: PKR ${totalAdvances.toLocaleString()}\n`;
      context += `ADVANCES BY EMPLOYEE:\n`;
      Object.entries(advancesByEmployee).slice(0, 30).forEach(([empId, total]: [string, number]) => {
        const emp = advancesData.find((a: any) => a.employees?.employee_id === empId);
        context += `- ${emp?.employees?.name || 'Unknown'} [${empId}]: PKR ${total.toLocaleString()}\n`;
      });
      context += `\nRECENT ADVANCES (last 50):\n`;
      advancesData.slice(0, 50).forEach((a: any) => {
        context += `- ${a.employees?.name} [${a.employees?.employee_id}] (${a.employees?.department}) on ${a.advance_date}: PKR ${Number(a.amount || 0).toLocaleString()}${a.notes ? ` - ${a.notes}` : ''}\n`;
      });
    }
    context += `\n`;

    // ALL PAYMENTS DATA
    context += `=== ALL PAYMENTS RECORDS (${paymentsData.length} total transactions) ===\n`;
    if (paymentsData.length > 0) {
      const totalPayments = paymentsData.reduce((sum: number, p: any) => sum + Number(p.amount || 0), 0);
      const paymentsByEmployee: Record<string, number> = {};
      paymentsData.forEach((p: any) => {
        const empId = p.employees?.employee_id || 'Unknown';
        paymentsByEmployee[empId] = (paymentsByEmployee[empId] || 0) + Number(p.amount || 0);
      });

      // Group by month/year
      const paymentsByPeriod: Record<string, number> = {};
      paymentsData.forEach((p: any) => {
        const key = `${p.payroll?.year || 'Unknown'}-${String(p.payroll?.month || 'Unknown').padStart(2, '0')}`;
        paymentsByPeriod[key] = (paymentsByPeriod[key] || 0) + Number(p.amount || 0);
      });

      context += `TOTAL PAYMENTS: PKR ${totalPayments.toLocaleString()}\n`;
      context += `PAYMENTS BY PERIOD:\n`;
      Object.entries(paymentsByPeriod).slice(0, 20).forEach(([period, total]: [string, number]) => {
        context += `- ${period}: PKR ${total.toLocaleString()}\n`;
      });
      context += `\nPAYMENTS BY EMPLOYEE:\n`;
      Object.entries(paymentsByEmployee).slice(0, 30).forEach(([empId, total]: [string, number]) => {
        const emp = paymentsData.find((p: any) => p.employees?.employee_id === empId);
        context += `- ${emp?.employees?.name || 'Unknown'} [${empId}]: PKR ${total.toLocaleString()}\n`;
      });
      context += `\nRECENT PAYMENTS (last 50):\n`;
      paymentsData.slice(0, 50).forEach((p: any) => {
        context += `- ${p.employees?.name} [${p.employees?.employee_id}] (${p.employees?.department}) on ${p.payment_date}: PKR ${Number(p.amount || 0).toLocaleString()} for ${p.payroll?.month}/${p.payroll?.year}${p.notes ? ` - ${p.notes}` : ''}\n`;
      });
    }
    context += `\n`;

    // COMPREHENSIVE STATISTICS
    const totalPayrollAmount = payrollData.reduce((sum: number, p: any) => sum + Number(p.final_salary || 0), 0);
    const totalOvertimePaid = payrollData.reduce((sum: number, p: any) => sum + Number(p.overtime_pay || 0), 0);
    const totalAdvancesAmount = advancesData.reduce((sum: number, a: any) => sum + Number(a.amount || 0), 0);
    const totalPaymentsAmount = paymentsData.reduce((sum: number, p: any) => sum + Number(p.amount || 0), 0);
    const avgSalary = activeEmployees.length > 0 
      ? activeEmployees.reduce((sum, e) => sum + Number(e.base_salary || 0), 0) / activeEmployees.length 
      : 0;

    context += `=== COMPREHENSIVE STATISTICS ===\n`;
    context += `EMPLOYEES:\n`;
    context += `- Total Employees: ${employees.length}\n`;
    context += `- Active Employees: ${activeEmployees.length}\n`;
    context += `- Inactive Employees: ${inactiveEmployees.length}\n`;
    context += `- Average Base Salary: PKR ${Math.round(avgSalary).toLocaleString()}\n`;
    context += `\nFINANCIAL:\n`;
    context += `- Total Payroll Issued (All-Time): PKR ${totalPayrollAmount.toLocaleString()}\n`;
    context += `- Total Overtime Paid (All-Time): PKR ${totalOvertimePaid.toLocaleString()}\n`;
    context += `- Total Advances Given (All-Time): PKR ${totalAdvancesAmount.toLocaleString()}\n`;
    context += `- Total Payments Made (All-Time): PKR ${totalPaymentsAmount.toLocaleString()}\n`;
    context += `- Net Payroll Liability: PKR ${(totalPayrollAmount - totalPaymentsAmount).toLocaleString()}\n`;
    context += `\nATTENDANCE:\n`;
    const totalPresent = attendanceData.filter((a: any) => a.status === 'present').length;
    const totalAbsent = attendanceData.filter((a: any) => a.status === 'absent').length;
    const totalLeave = attendanceData.filter((a: any) => a.status === 'leave').length;
    const totalHoliday = attendanceData.filter((a: any) => a.status === 'holiday').length;
    const totalOTHours = attendanceData.reduce((sum: number, a: any) => sum + Number(a.overtime_hours || 0), 0);
    const totalUTHours = attendanceData.reduce((sum: number, a: any) => sum + Number(a.undertime_hours || 0), 0);
    context += `- Total Present Days: ${totalPresent}\n`;
    context += `- Total Absent Days: ${totalAbsent}\n`;
    context += `- Total Leave Days: ${totalLeave}\n`;
    context += `- Total Holiday Days: ${totalHoliday}\n`;
    context += `- Total Overtime Hours: ${totalOTHours.toFixed(1)}h\n`;
    context += `- Total Undertime Hours: ${totalUTHours.toFixed(1)}h\n`;
    context += `- Attendance Rate: ${attendanceData.length > 0 ? ((totalPresent / (totalPresent + totalAbsent)) * 100).toFixed(1) : 0}%\n`;

    context += `\n=== ANALYSIS CAPABILITIES ===\n`;
    context += `You can answer complex queries about:\n`;
    context += `- Employee performance trends over time\n`;
    context += `- Salary analysis and comparisons\n`;
    context += `- Attendance patterns and absenteeism analysis\n`;
    context += `- Department-wise comparisons\n`;
    context += `- Financial trends and forecasting\n`;
    context += `- Overtime/undertime analysis\n`;
    context += `- Payment status and outstanding balances\n`;
    context += `- Historical comparisons (month-over-month, year-over-year)\n`;
    context += `- Employee-specific detailed analysis\n`;
    context += `- Complex statistical queries combining multiple data points\n`;

    return context;
  };

  const handleSendMessage = async () => {
    if (!inputMessage.trim() || isLoading) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      content: inputMessage,
      role: 'user',
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    const currentQuery = inputMessage;
    setInputMessage("");
    setIsLoading(true);

    try {
      const context = buildContext(currentQuery);
      const response = await geminiService.sendMessage(currentQuery, context, messages);
      
      const assistantMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        content: response,
        role: 'assistant',
        timestamp: new Date()
      };

      setMessages(prev => [...prev, assistantMessage]);
      speak(response);
    } catch (error) {
      const errorMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        content: `Sorry, I encountered an error: ${error instanceof Error ? error.message : 'Unknown error'}. Please try again.`,
        role: 'assistant',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleVoiceInput = () => {
    if (recognition) {
      if (isListening) {
        recognition.stop();
      } else {
        try {
          recognition.start();
        } catch (error: any) {
          setIsListening(false);
          if (error.name === 'NotAllowedError') {
            alert('🎤 Microphone access denied. Please allow microphone access.');
          }
        }
      }
    } else {
      alert('🎤 Speech recognition not supported. Please use Chrome, Edge, or Safari.');
    }
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh] flex flex-col p-0 gap-0">
        <DialogHeader className="px-6 pt-6 pb-4 border-b">
          <DialogTitle className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-r from-primary/20 to-accent/20 rounded-full blur-md animate-pulse" />
                <div className="relative w-10 h-10 rounded-full bg-gradient-to-r from-primary to-accent flex items-center justify-center">
                  <Sparkles className="h-5 w-5 text-white" />
                </div>
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-lg font-bold">AI Assistant</span>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {messages.length > 1 ? `${messages.length - 1} messages` : 'Ask me anything about your payroll system'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant={ttsEnabled ? "default" : "ghost"}
                size="sm"
                onClick={() => setTtsEnabled((v) => !v)}
                className="gap-2"
              >
                {ttsEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setMessages([])}
                className="gap-2"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 flex flex-col min-h-0 relative">
          <AnimatePresence>
            {showWelcome && (
              <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="absolute inset-0 z-10 flex items-center justify-center bg-background/95 backdrop-blur-sm"
              >
                <Card className="max-w-md mx-4 border-2 border-primary/20 shadow-xl">
                  <CardContent className="p-8 text-center space-y-6">
                    <div className="relative inline-block">
                      <div className="absolute inset-0 bg-gradient-to-r from-primary/30 to-accent/30 rounded-full blur-xl animate-pulse" />
                      <div className="relative w-20 h-20 rounded-full bg-gradient-to-r from-primary to-accent flex items-center justify-center mx-auto">
                        <Sparkles className="h-10 w-10 text-white" />
                      </div>
                    </div>
                    <div>
                      <h3 className="text-2xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                        NMW HR Assistant
                      </h3>
                      <p className="text-sm text-muted-foreground mt-2">
                        Intelligent insights powered by AI. Ask questions about employees, payroll, attendance, and more.
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2 justify-center">
                      <Badge variant="outline" className="gap-1">
                        <Zap className="h-3 w-3" />
                        Fast & Smart
                      </Badge>
                      <Badge variant="outline" className="gap-1">
                        <TrendingUp className="h-3 w-3" />
                        Real-time Data
                      </Badge>
                      <Badge variant="outline" className="gap-1">
                        <Mic className="h-3 w-3" />
                        Voice Input
                      </Badge>
                    </div>
                    <Button onClick={() => setShowWelcome(false)} className="w-full bg-gradient-primary">
                      Start Chatting
                    </Button>
                  </CardContent>
                </Card>
              </motion.div>
            )}
          </AnimatePresence>

          <ScrollArea className="flex-1 px-6 py-4" ref={scrollAreaRef}>
            <div className="space-y-4">
              <AnimatePresence>
                {messages.map((message, index) => (
                  <motion.div
                    key={message.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, x: message.role === 'user' ? 20 : -20 }}
                    transition={{ delay: index * 0.05 }}
                    className={`flex gap-3 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    {message.role === 'assistant' && (
                      <Avatar className="h-8 w-8 border-2 border-primary/20">
                        <AvatarFallback className="bg-gradient-to-r from-primary/20 to-accent/20">
                          <Bot className="h-4 w-4 text-primary" />
                        </AvatarFallback>
                      </Avatar>
                    )}
                    
                    <motion.div
                      initial={{ scale: 0.9 }}
                      animate={{ scale: 1 }}
                      className={`max-w-[80%] ${message.role === 'user' ? 'order-2' : ''}`}
                    >
                      <Card className={`${
                        message.role === 'user' 
                          ? 'bg-gradient-to-r from-primary to-primary/90 text-primary-foreground border-primary/20 shadow-lg' 
                          : 'bg-muted/50 border-border/50 shadow-sm hover:shadow-md transition-shadow'
                      }`}>
                        <CardContent className="p-4">
                          <div className="text-sm whitespace-pre-wrap leading-relaxed">
                            {message.content}
                          </div>
                          <div className={`text-xs mt-2 opacity-70 flex items-center gap-1 ${
                            message.role === 'user' ? 'text-primary-foreground' : 'text-muted-foreground'
                          }`}>
                            {formatTime(message.timestamp)}
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>

                    {message.role === 'user' && (
                      <Avatar className="h-8 w-8 border-2 border-primary/20">
                        <AvatarFallback className="bg-gradient-to-r from-primary to-primary/80">
                          <User className="h-4 w-4 text-primary-foreground" />
                        </AvatarFallback>
                      </Avatar>
                    )}
                  </motion.div>
                ))}
              </AnimatePresence>
              
              {isLoading && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex gap-3 justify-start"
                >
                  <Avatar className="h-8 w-8 border-2 border-primary/20">
                    <AvatarFallback className="bg-gradient-to-r from-primary/20 to-accent/20">
                      <Bot className="h-4 w-4 text-primary" />
                    </AvatarFallback>
                  </Avatar>
                  <Card className="bg-muted/50 border-border/50">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3">
                        <Loader2 className="h-4 w-4 animate-spin text-primary" />
                        <div className="flex gap-1">
                          <span className="text-sm">Analyzing</span>
                          <motion.span
                            animate={{ opacity: [1, 0.3, 1] }}
                            transition={{ duration: 1.5, repeat: Infinity }}
                          >
                            ...
                          </motion.span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              )}
              <div ref={messagesEndRef} />
            </div>
          </ScrollArea>

          <div className="px-6 py-4 border-t bg-muted/30">
            <div className="flex gap-2">
              <Input
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Ask about employees, payroll, attendance..."
                disabled={isLoading}
                className="flex-1 bg-background"
              />
              <Button 
                onClick={handleVoiceInput}
                disabled={isLoading}
                variant={isListening ? "destructive" : "outline"}
                size="icon"
                className={isListening ? "animate-pulse" : ""}
              >
                {isListening ? (
                  <MicOff className="h-4 w-4" />
                ) : (
                  <Mic className="h-4 w-4" />
                )}
              </Button>
              <Button 
                onClick={handleSendMessage}
                disabled={!inputMessage.trim() || isLoading}
                size="icon"
                className="bg-gradient-primary hover:opacity-90"
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
            {queryAnalysis.types.length > 0 && queryAnalysis.types[0] !== 'general' && (
              <div className="mt-2 flex gap-1 flex-wrap">
                <Badge variant="secondary" className="text-xs gap-1">
                  <Brain className="h-3 w-3" />
                  Analyzing: {queryAnalysis.types.join(', ')}
                </Badge>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
