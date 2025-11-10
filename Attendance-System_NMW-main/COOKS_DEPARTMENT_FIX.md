# Cooks Department Salary Calculation Fix

## Issues Fixed

### 1. **Cooks Department Incorrectly Exempt from Deductions**
   - **Problem**: The Cooks department was marked as `is_exempt_from_deductions: true` in the default department rules, meaning they received full salary regardless of attendance.
   - **Solution**: Updated the default rules in `DepartmentRulesDialog.tsx` to exclude Cooks from the exempt departments list.
   - **Files Changed**:
     - `src/components/DepartmentRulesDialog.tsx` (lines 63-64)
     - Created migration `supabase/migrations/007_fix_cooks_department_rules.sql`

### 2. **Employee Ledger Not Using Proper Salary Calculation Rules**
   - **Problem**: The `EmployeeLedger.tsx` page was doing manual salary calculations instead of using the `SalaryCalculationService`, which means it wasn't following the department-specific rules defined in the database.
   - **Solution**: Refactored the ledger page to use `SalaryCalculationService.calculateSalary()` method for accurate, rule-based calculations.
   - **Files Changed**:
     - `src/pages/EmployeeLedger.tsx` (lines 149-183)

## Changes Made

### `src/components/DepartmentRulesDialog.tsx`
- Removed "Cooks" from the exempt departments list
- Changed from: `["Guards", "Admins", "Cooks", "Accounts"]`
- Changed to: `["Guards", "Admins", "Accounts"]`
- This affects both `is_exempt_from_deductions` and `is_exempt_from_overtime`
- Also updated `max_advance_percentage` to 50% for Cooks (same as production departments)

### `src/pages/EmployeeLedger.tsx`
- Replaced manual salary calculation logic with `SalaryCalculationService.calculateSalary()`
- Now properly respects department-specific rules from the database
- Ensures consistency between payroll generation and ledger display
- Handles overtime, undertime, and advances according to defined business rules

### `supabase/migrations/007_fix_cooks_department_rules.sql`
- Updates existing Cooks department rules in the database
- Sets `is_exempt_from_deductions = false`
- Sets `is_exempt_from_overtime = false`
- Sets `max_advance_percentage = 50`
- Inserts default rule if one doesn't exist

## Expected Behavior After Fix

### For Cooks Department:
1. **Salary Calculation**: Based on present days (like Enamel and Workshop)
   - Formula: `earnedSalary = (presentDays + leaveDays + holidayDays) × perDaySalary`
   - Where: `perDaySalary = baseSalary / 30`

2. **Overtime**: Calculated and added to salary if overtime hours exist
   - Uses employee's `overtime_wage` or `overtime_rate` or default multiplier (1.5x hourly rate)

3. **Undertime**: Deducted from salary
   - Formula: `undertimeDeduction = undertimeHours × hourlyRate`

4. **Advances**: Deducted from final salary

5. **Absences**: Leave and holiday days are counted as paid days (no deduction)
   - Absent days result in no pay for those days (not included in present/leave/holiday count)

### Exempt Departments (Guards, Admins, Accounts):
- Continue to receive full base salary regardless of attendance
- Undertime still deducted (as per business rules)
- Overtime not calculated (exempt from overtime)

## Testing Instructions

1. **Apply Database Migration**:
   ```bash
   # Run the new migration to update existing Cooks department rules
   supabase db push
   ```

2. **Verify Department Rules**:
   - Open the application
   - Navigate to Payroll page
   - Click "Department Rules" button
   - Verify that Cooks department shows:
     - ❌ Exempt from Deductions (unchecked)
     - ❌ Exempt from Overtime (unchecked)
     - Max Advance %: 50

3. **Test Employee Ledger**:
   - Select a Cooks department employee
   - Set a date range
   - Verify salary calculation shows:
     - Earned salary based on present days
     - Overtime pay (if any overtime hours)
     - Undertime deductions (if any undertime hours)
     - Advance deductions

4. **Generate Payroll**:
   - Generate payroll for current month
   - Verify Cooks employees' salaries are calculated based on attendance
   - Compare with Guards/Admins/Accounts who should still get full salary

## Notes

- The fix ensures consistency across all salary calculation points in the application
- Employee Ledger now uses the same calculation engine as payroll generation
- All department-specific rules are centralized in the `department_calculation_rules` table
- Changes are backward compatible and won't affect historical payroll data
