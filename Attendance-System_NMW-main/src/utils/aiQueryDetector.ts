// Intelligent query detection for AI assistant
// Analyzes user queries to determine what data is needed

export type QueryType = 
  | 'general'           // General questions, no specific data needed
  | 'employees'         // About employees
  | 'payroll'           // About payroll/salary
  | 'attendance'        // About attendance
  | 'advances'          // About advances
  | 'payments'          // About payments
  | 'statistics'        // Statistics/analytics
  | 'employee_specific' // Specific employee query
  | 'historical'        // Historical data needed
  | 'current_month';    // Current month data

export interface QueryAnalysis {
  types: QueryType[];
  needsEmployees: boolean;
  needsPayroll: boolean;
  needsAttendance: boolean;
  needsAdvances: boolean;
  needsPayments: boolean;
  needsHistorical: boolean;
  employeeName?: string;
  employeeId?: string;
  department?: string;
  dateRange?: { start?: string; end?: string };
}

export function analyzeQuery(query: string): QueryAnalysis {
  const lowerQuery = query.toLowerCase();
  const analysis: QueryAnalysis = {
    types: [],
    needsEmployees: false,
    needsPayroll: false,
    needsAttendance: false,
    needsAdvances: false,
    needsPayments: false,
    needsHistorical: false,
  };

  // Check for specific employee mentions
  const employeePatterns = [
    /\b(employee|emp|staff|worker|person)\s+([A-Za-z]+(?:\s+[A-Za-z]+)?)/i,
    /\b([A-Z][a-z]+\s+[A-Z][a-z]+)\b/, // Names like "John Smith"
    /\bemp\s*[-_]?\s*(\d+)/i, // Employee IDs
  ];

  for (const pattern of employeePatterns) {
    const match = lowerQuery.match(pattern);
    if (match) {
      analysis.types.push('employee_specific');
      if (match[2]) analysis.employeeName = match[2];
      if (match[1] && /^\d+$/.test(match[1])) analysis.employeeId = match[1];
    }
  }

  // Check for department mentions
  const departments = ['workshop', 'enamel', 'guards', 'cooks', 'admins', 'directors'];
  for (const dept of departments) {
    if (lowerQuery.includes(dept)) {
      analysis.department = dept.charAt(0).toUpperCase() + dept.slice(1);
      analysis.needsEmployees = true;
      break;
    }
  }

  // Check for date/time references
  const datePatterns = [
    /\b(today|yesterday|this week|this month|last month|last week|this year|last year)\b/i,
    /\b(\d{4}[-/]\d{1,2}[-/]\d{1,2})\b/, // Date format
    /\b(january|february|march|april|may|june|july|august|september|october|november|december)\s+(\d{4})/i,
  ];

  for (const pattern of datePatterns) {
    if (pattern.test(lowerQuery)) {
      if (lowerQuery.includes('history') || lowerQuery.includes('past') || lowerQuery.includes('previous')) {
        analysis.needsHistorical = true;
        analysis.types.push('historical');
      } else if (lowerQuery.includes('this month') || lowerQuery.includes('current month')) {
        analysis.types.push('current_month');
      }
    }
  }

  // Check query types
  if (lowerQuery.includes('employee') || lowerQuery.includes('staff') || lowerQuery.includes('worker')) {
    analysis.needsEmployees = true;
    analysis.types.push('employees');
  }

  if (lowerQuery.includes('payroll') || lowerQuery.includes('salary') || lowerQuery.includes('wage') || 
      lowerQuery.includes('payment') || lowerQuery.includes('paid')) {
    analysis.needsPayroll = true;
    analysis.types.push('payroll');
  }

  if (lowerQuery.includes('attendance') || lowerQuery.includes('present') || lowerQuery.includes('absent') ||
      lowerQuery.includes('check') || lowerQuery.includes('clock')) {
    analysis.needsAttendance = true;
    analysis.types.push('attendance');
  }

  if (lowerQuery.includes('advance') || lowerQuery.includes('loan')) {
    analysis.needsAdvances = true;
    analysis.types.push('advances');
  }

  if (lowerQuery.includes('payment') || lowerQuery.includes('paid') || lowerQuery.includes('transaction')) {
    analysis.needsPayments = true;
    analysis.types.push('payments');
  }

  if (lowerQuery.includes('statistic') || lowerQuery.includes('analytics') || lowerQuery.includes('summary') ||
      lowerQuery.includes('total') || lowerQuery.includes('average') || lowerQuery.includes('trend')) {
    analysis.types.push('statistics');
    // Statistics usually need multiple data types
    analysis.needsEmployees = true;
    analysis.needsPayroll = true;
    analysis.needsAttendance = true;
  }

  // If no specific type detected, it's general
  if (analysis.types.length === 0) {
    analysis.types.push('general');
  }

  return analysis;
}

