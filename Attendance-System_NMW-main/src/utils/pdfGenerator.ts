import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

// Calendar utility functions
const getDaysInMonth = (year: number, month: number) => {
  return new Date(year, month, 0).getDate();
};

const getFirstDayOfMonth = (year: number, month: number) => {
  return new Date(year, month - 1, 1).getDay();
};

const formatCurrency = (amount: number) => {
  return `PKR ${Number(amount).toLocaleString()}`;
};

export const generateLedgerPDF = (employee: any, payroll: any, attendanceData: any[], advances: any[], payments: any[], month: number, year: number) => {
  const doc = new jsPDF();
  
  // Set document properties
  doc.setProperties({
    title: `Employee Ledger - ${employee.name}`,
    subject: 'Employee Ledger Report',
    author: 'NMW Payroll System',
    keywords: 'payroll, ledger, employee, salary',
    creator: 'NMW Payroll System'
  });
  
  // Minimalist color scheme
  const colors = {
    primary: [33, 37, 41] as [number, number, number],
    secondary: [108, 117, 125] as [number, number, number],
    success: [40, 167, 69] as [number, number, number],
    warning: [255, 193, 7] as [number, number, number],
    danger: [220, 53, 69] as [number, number, number],
    info: [23, 162, 184] as [number, number, number],
    light: [248, 249, 250] as [number, number, number],
    border: [222, 226, 230] as [number, number, number]
  };
  
  // Minimalist header
  doc.setFontSize(18);
  doc.setTextColor(colors.primary[0], colors.primary[1], colors.primary[2]);
  doc.text("EMPLOYEE LEDGER", 105, 20, { align: "center" });
  
  doc.setFontSize(12);
  doc.setTextColor(colors.secondary[0], colors.secondary[1], colors.secondary[2]);
  doc.text(`${new Date(year, month - 1).toLocaleDateString("en-US", { month: "long", year: "numeric" })}`, 105, 28, { align: "center" });
  
  // Employee Information - Minimalist
  const infoY = 40;
  doc.setFontSize(14);
  doc.setTextColor(colors.primary[0], colors.primary[1], colors.primary[2]);
  doc.text(employee.name, 20, infoY);
  
  doc.setFontSize(10);
  doc.setTextColor(colors.secondary[0], colors.secondary[1], colors.secondary[2]);
  doc.text(`ID: ${employee.employee_id}`, 20, infoY + 7);
  doc.text(`Department: ${employee.department}`, 20, infoY + 14);
  doc.text(`CNIC: ${employee.cnic}`, 20, infoY + 21);
  
  // Salary information on the right
  const daysInMonth = getDaysInMonth(year, month);
  doc.text(`Base Salary: ${formatCurrency(employee.base_salary)}`, 120, infoY + 7);
  doc.text(`Per Day: ${formatCurrency(employee.base_salary / daysInMonth)}`, 120, infoY + 14);
  doc.text(`Hourly: ${formatCurrency(employee.base_salary / daysInMonth / 8)}`, 120, infoY + 21);
  doc.text(`Final Salary: ${formatCurrency(payroll.final_salary)}`, 120, infoY + 28);
  
  // Compact Calendar Section
  const calendarY = infoY + 40;
  doc.setFontSize(12);
  doc.setTextColor(colors.primary[0], colors.primary[1], colors.primary[2]);
  doc.text("Attendance", 20, calendarY);
  
  // Calendar container - smaller
  doc.setDrawColor(colors.border[0], colors.border[1], colors.border[2]);
  doc.setLineWidth(0.5);
  doc.rect(20, calendarY + 5, 170, 60, 'S');
  
  // Calendar header
  const firstDay = getFirstDayOfMonth(year, month);
  const dayNames = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
  
  const cellWidth = 24.3;
  const cellHeight = 8.5;
  const startX = 20;
  const startCalendarY = calendarY + 10;
  
  // Draw day headers
  for (let i = 0; i < 7; i++) {
    doc.setFillColor(colors.light[0], colors.light[1], colors.light[2]);
    doc.rect(startX + (i * cellWidth), startCalendarY, cellWidth, 6, 'F');
    doc.setTextColor(colors.primary[0], colors.primary[1], colors.primary[2]);
    doc.setFontSize(8);
    doc.text(dayNames[i], startX + (i * cellWidth) + cellWidth/2, startCalendarY + 4, { align: "center" });
  }
  
  // Create attendance map
  const attendanceMap = new Map();
  attendanceData.forEach(att => {
    const day = new Date(att.attendance_date).getDate();
    attendanceMap.set(day, att);
  });
  
  // Fill calendar with days and attendance
  let currentDay = 1;
  for (let week = 0; week < 6 && currentDay <= daysInMonth; week++) {
    for (let day = 0; day < 7; day++) {
      const x = startX + (day * cellWidth);
      const y = startCalendarY + 6 + (week * cellHeight);
      
      if ((week === 0 && day >= firstDay) || (week > 0 && currentDay <= daysInMonth)) {
        // Draw cell border
        doc.setDrawColor(colors.border[0], colors.border[1], colors.border[2]);
        doc.setLineWidth(0.3);
        doc.rect(x, y, cellWidth, cellHeight, 'S');
        
        // Get attendance status
        const attendance = attendanceMap.get(currentDay);
        let statusColor = [255, 255, 255] as [number, number, number]; // Default white
        let statusText = '';
        
        if (attendance) {
          switch (attendance.status) {
            case 'present':
              statusColor = colors.success;
              statusText = 'P';
              break;
            case 'absent':
              statusColor = colors.danger;
              statusText = 'A';
              break;
            case 'leave':
              statusColor = colors.warning;
              statusText = 'L';
              break;
            case 'holiday':
              statusColor = colors.info;
              statusText = 'H';
              break;
          }
        }
        
        // Draw status background
        doc.setFillColor(statusColor[0], statusColor[1], statusColor[2]);
        doc.rect(x + 0.5, y + 0.5, cellWidth - 1, cellHeight - 1, 'F');
        
        // Draw day number
        doc.setTextColor(0, 0, 0);
        doc.setFontSize(7);
        doc.text(currentDay.toString(), x + 2, y + 5);
        
        // Draw status indicator
        if (statusText) {
          doc.setTextColor(255, 255, 255);
          doc.setFontSize(6);
          doc.text(statusText, x + cellWidth - 4, y + 5);
        }
        
        currentDay++;
      }
    }
  }
  
  // Compact Legend
  const legendY = calendarY + 75;
  doc.setTextColor(colors.secondary[0], colors.secondary[1], colors.secondary[2]);
  doc.setFontSize(8);
  doc.text("Legend:", 20, legendY);
  
  const legendItems = [
    { color: colors.success, text: 'Present' },
    { color: colors.danger, text: 'Absent' },
    { color: colors.warning, text: 'Leave' },
    { color: colors.info, text: 'Holiday' }
  ];
  
  legendItems.forEach((item, index) => {
    const x = 20 + (index * 35);
    doc.setFillColor(item.color[0], item.color[1], item.color[2]);
    doc.rect(x, legendY + 2, 6, 6, 'F');
    doc.setTextColor(colors.secondary[0], colors.secondary[1], colors.secondary[2]);
    doc.setFontSize(7);
    doc.text(item.text, x + 9, legendY + 6);
  });
  
  // Summary Section - Compact
  const summaryY = legendY + 15;
  doc.setFontSize(12);
  doc.setTextColor(colors.primary[0], colors.primary[1], colors.primary[2]);
  doc.text("Summary", 20, summaryY);
  
  // Summary in a simple table format
  const summaryData = [
    ["Total Days", daysInMonth.toString()],
    ["Present", payroll.present_days.toString()],
    ["Absent", payroll.absent_days.toString()],
    ["Leave", payroll.leave_days.toString()],
    ["Holiday", payroll.holiday_days.toString()],
    ["Overtime Hours", (payroll.overtime_hours || 0).toString()],
    ["Overtime Pay", formatCurrency(payroll.overtime_pay || 0)],
    ["Advances", formatCurrency(payroll.advance_amount || 0)]
  ];
  
  autoTable(doc, {
    startY: summaryY + 7,
    body: summaryData,
    theme: "plain",
    styles: { 
      fontSize: 9,
      cellPadding: 2
    },
    columnStyles: {
      0: { cellWidth: 45 },
      1: { cellWidth: 35, halign: 'right' }
    },
    margin: { left: 20 }
  });
  
  // Transactions Section - Compact
  const transactionsY = (doc as any).lastAutoTable.finalY + 10;
  doc.setFontSize(12);
  doc.setTextColor(colors.primary[0], colors.primary[1], colors.primary[2]);
  doc.text("Transactions", 20, transactionsY);
  
  // Prepare transaction data
  const transactions = [];
  
  // Add advances
  advances.forEach(advance => {
    transactions.push({
      date: new Date(advance.advance_date).toLocaleDateString(),
      type: 'Advance',
      description: advance.description || 'Advance',
      amount: -Number(advance.amount),
      balance: 0
    });
  });
  
  // Add payments
  payments.forEach(payment => {
    transactions.push({
      date: new Date(payment.payment_date).toLocaleDateString(),
      type: 'Payment',
      description: payment.description || 'Payment',
      amount: Number(payment.amount),
      balance: 0
    });
  });
  
  // Sort by date
  transactions.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  
  // Calculate running balance
  let runningBalance = Number(payroll.final_salary);
  transactions.forEach(transaction => {
    runningBalance += transaction.amount;
    transaction.balance = runningBalance;
  });
  
  // Convert to table format
  const transactionRows = transactions.map(t => [
    t.date,
    t.type,
    t.description,
    formatCurrency(Math.abs(t.amount)),
    formatCurrency(t.balance)
  ]);
  
  if (transactionRows.length > 0) {
    autoTable(doc, {
      startY: transactionsY + 7,
      head: [["Date", "Type", "Description", "Amount", "Balance"]],
      body: transactionRows,
      theme: "plain",
      headStyles: { 
        fillColor: [colors.light[0], colors.light[1], colors.light[2]],
        textColor: [colors.primary[0], colors.primary[1], colors.primary[2]],
        fontSize: 9
      },
      styles: { 
        fontSize: 8,
        cellPadding: 2
      },
      columnStyles: {
        0: { cellWidth: 25 },
        1: { cellWidth: 20 },
        2: { cellWidth: 50 },
        3: { cellWidth: 30, halign: 'right' },
        4: { cellWidth: 30, halign: 'right' }
      },
      margin: { left: 20 }
    });
  }
  
  // Minimalist footer
  const finalY = (doc as any).lastAutoTable ? (doc as any).lastAutoTable.finalY + 10 : transactionsY + 20;
  doc.setTextColor(colors.secondary[0], colors.secondary[1], colors.secondary[2]);
  doc.setFontSize(8);
  doc.text(`Generated: ${new Date().toLocaleDateString()}`, 20, finalY);
  doc.text(`Page 1 of ${doc.getNumberOfPages()}`, 180, finalY, { align: "right" });
  
  // Save the PDF
  doc.save(`Ledger_${employee.employee_id}_${month}_${year}.pdf`);
};

export const generateWageCardPDF = (employee: any, payroll: any, attendanceData: any[], month: number, year: number) => {
  const doc = new jsPDF();
  
  // Set document properties
  doc.setProperties({
    title: `Wage Card - ${employee.name}`,
    subject: 'Employee Wage Card',
    author: 'NMW Payroll System',
    keywords: 'payroll, wage, employee, salary',
    creator: 'NMW Payroll System'
  });
  
  // Header
  doc.setFontSize(20);
  doc.text("WAGE CARD", 105, 15, { align: "center" });
  
  // Employee Info
  doc.setFontSize(11);
  doc.text(`Employee: ${employee.name}`, 20, 30);
  doc.text(`ID: ${employee.employee_id}`, 20, 37);
  doc.text(`Department: ${employee.department}`, 20, 44);
  doc.text(`CNIC: ${employee.cnic}`, 120, 30);
  doc.text(`Month: ${new Date(year, month - 1).toLocaleDateString("en-US", { month: "long", year: "numeric" })}`, 120, 37);
  
  // Attendance Table
  const attendanceRows = attendanceData.map((att) => [
    new Date(att.attendance_date).toLocaleDateString(),
    att.status.toUpperCase(),
    att.check_in_time || "-",
    att.check_out_time || "-",
    att.hours_worked || "0"
  ]);
  
  autoTable(doc, {
    startY: 55,
    head: [["Date", "Status", "Check-in", "Check-out", "Hours"]],
    body: attendanceRows,
    theme: "grid",
    headStyles: { fillColor: [41, 128, 185], fontSize: 10 },
    styles: { fontSize: 9 },
    columnStyles: {
      0: { cellWidth: 30 },
      1: { cellWidth: 25 },
      2: { cellWidth: 30 },
      3: { cellWidth: 30 },
      4: { cellWidth: 20 }
    }
  });
  
  // Salary Breakdown
  const finalY = (doc as any).lastAutoTable.finalY + 10;
  
  doc.setFontSize(13);
  doc.text("Salary Breakdown", 20, finalY);
  
  const salaryData = [
    ["Base Salary", `PKR ${Number(payroll.base_salary).toLocaleString()}`],
    ["Present Days", `${payroll.present_days}/${payroll.total_days}`],
    ["Absent Days", payroll.absent_days.toString()],
    ["Leave Days", payroll.leave_days.toString()],
    ["Absence Deduction", `PKR ${Number(payroll.absence_deduction).toLocaleString()}`],
    ["Overtime Hours", (payroll.overtime_hours || 0).toString()],
    ["Overtime Pay", `PKR ${Number(payroll.overtime_pay || 0).toLocaleString()}`],
    ["Total Advances", `PKR ${Number(payroll.advance_amount || 0).toLocaleString()}`],
    ["Final Salary", `PKR ${Number(payroll.final_salary).toLocaleString()}`],
  ];
  
  autoTable(doc, {
    startY: finalY + 7,
    body: salaryData,
    theme: "plain",
    styles: { fontSize: 10 },
    columnStyles: {
      0: { cellWidth: 50 },
      1: { cellWidth: 50, halign: 'right' }
    }
  });
  
  // Footer
  const footerY = (doc as any).lastAutoTable.finalY + 15;
  doc.setFontSize(8);
  doc.setTextColor(108, 117, 125);
  doc.text(`Generated: ${new Date().toLocaleDateString()}`, 20, footerY);
  doc.text(`Page 1 of ${doc.getNumberOfPages()}`, 180, footerY, { align: "right" });
  
  doc.save(`WageCard_${employee.employee_id}_${month}_${year}.pdf`);
};

export const generateAllPayrollPDF = (payrollData: any[], month: number, year: number) => {
  const doc = new jsPDF({ orientation: 'landscape' });
  
  // Set document properties
  doc.setProperties({
    title: `Payroll Report - ${new Date(year, month - 1).toLocaleDateString("en-US", { month: "long", year: "numeric" })}`,
    subject: 'Monthly Payroll Report',
    author: 'NMW Payroll System',
    keywords: 'payroll, report, salary, employees',
    creator: 'NMW Payroll System'
  });
  
  doc.setFontSize(18);
  doc.text("Payroll Report", 148.5, 15, { align: "center" });
  doc.setFontSize(12);
  doc.text(`${new Date(year, month - 1).toLocaleDateString("en-US", { month: "long", year: "numeric" })}`, 148.5, 23, { align: "center" });
  
  const tableData = payrollData.map((p) => [
    p.employees?.employee_id || "",
    p.employees?.name || "",
    p.employees?.department || "",
    Number(p.base_salary).toLocaleString(),
    Number(p.absence_deduction).toLocaleString(),
    Number(p.overtime_pay || 0).toLocaleString(),
    Number(p.advance_amount || 0).toLocaleString(),
    Number(p.final_salary).toLocaleString(),
    p.status,
  ]);
  
  autoTable(doc, {
    startY: 30,
    head: [["ID", "Name", "Dept", "Base", "Deduction", "Overtime", "Advances", "Final", "Status"]],
    body: tableData,
    theme: "grid",
    headStyles: { fillColor: [41, 128, 185], fontSize: 9 },
    styles: { fontSize: 8 },
    columnStyles: {
      0: { cellWidth: 20 },
      1: { cellWidth: 35 },
      2: { cellWidth: 25 },
      3: { cellWidth: 25, halign: 'right' },
      4: { cellWidth: 25, halign: 'right' },
      5: { cellWidth: 25, halign: 'right' },
      6: { cellWidth: 25, halign: 'right' },
      7: { cellWidth: 25, halign: 'right' },
      8: { cellWidth: 20 }
    }
  });
  
  // Footer
  const finalY = (doc as any).lastAutoTable.finalY + 10;
  doc.setFontSize(8);
  doc.setTextColor(108, 117, 125);
  doc.text(`Generated: ${new Date().toLocaleDateString()}`, 20, finalY);
  doc.text(`Page 1 of ${doc.getNumberOfPages()}`, 277, finalY, { align: "right" });
  
  doc.save(`Payroll_${month}_${year}.pdf`);
};