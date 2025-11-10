import * as XLSX from "xlsx";

export const exportPayrollToExcel = (payrollData: any[], month: number, year: number) => {
  const worksheetData = payrollData.map((p) => ({
    "Employee ID": p.employees?.employee_id || "",
    "Name": p.employees?.name || "",
    "Department": p.employees?.department || "",
    "Base Salary": Math.round(Number(p.base_salary)),
    "Total Days": p.total_days,
    "Present Days": p.present_days,
    "Absent Days": p.absent_days,
    "Leave Days": p.leave_days,
    "Holiday Days": p.holiday_days,
    "Absence Deduction": Math.round(Number(p.absence_deduction)),
    "Overtime Hours": Number(p.overtime_hours || 0),
    "Overtime Pay": Math.round(Number(p.overtime_pay || 0)),
    "Advance Amount": Math.round(Number(p.advance_amount || 0)),
    "Final Salary": Math.round(Number(p.final_salary)),
    "Status": p.status,
  }));
  
  const worksheet = XLSX.utils.json_to_sheet(worksheetData);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Payroll");
  
  XLSX.writeFile(workbook, `Payroll_${month}_${year}.xlsx`);
};
