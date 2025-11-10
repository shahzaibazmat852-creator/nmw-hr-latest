# Half-Day Deduction Feature

## Overview
The wage card now automatically identifies and displays half-day deductions with specific dates and amounts when an employee works only half their scheduled duty hours.

## What is Half-Day?

A **half-day** is when an employee's undertime equals exactly half of their standard duty hours. The system identifies this based on department-specific rules.

### Department-Specific Half-Day Hours

| Department | Standard Hours | Half-Day Hours | Undertime for Half-Day |
|------------|---------------|----------------|----------------------|
| **Enamel (Day Shift)** | 11 hours | 5.5 hours | 5.5 hours |
| **Enamel (Night Shift)** | 13 hours | 6.5 hours | 6.5 hours |
| **Workshop** | 8.5 hours | 4.25 hours | 4.25 hours |
| **Others** | 8 hours | 4 hours | 4 hours |

## How It Works

### 1. Detection Logic
The system automatically detects half-days by:
- Checking each attendance record's undertime hours
- Comparing undertime with the half-day hours from department rules
- Using a tolerance of ±0.5 hours to account for rounding

**Example:**
```typescript
// Enamel Day Shift employee
Standard Hours: 11
Half-Day Hours: 5.5
Undertime: 5.5 hours
Result: ✅ Detected as Half-Day
```

### 2. Deduction Calculation
For each half-day:
```
Deduction Amount = Undertime Hours × Hourly Rate

Where:
Hourly Rate = Base Salary / (30 days × Standard Hours per Day)
```

**Example Calculation:**
```
Employee: Workshop Department
Base Salary: PKR 30,000
Standard Hours: 8.5 hours/day
Hourly Rate: 30,000 / (30 × 8.5) = PKR 117.65/hour

Half-Day Undertime: 4.25 hours
Deduction: 4.25 × 117.65 = PKR 500
```

## Wage Card Display

### Visual Representation

The wage card intelligently shows undertime deductions in two categories:

**1. Half-Day Deductions (if applicable):**
```
┌─────────────────────────────────────────┐
│ Half-Day Deductions                     │
├─────────────────────────────────────────┤
│ Jan 15 - Half Day (5.5hrs short)        │
│                        -PKR 320          │
├─────────────────────────────────────────┤
│ Jan 22 - Half Day (5.5hrs short)        │
│                        -PKR 320          │
├─────────────────────────────────────────┤
│ Total Half-Day Deductions  -PKR 640     │
└─────────────────────────────────────────┘
```

**2. Other Undertime Deduction (if applicable):**
```
┌─────────────────────────────────────────┐
│ Undertime Deduction                     │
│ (non-half-days)              -PKR 450   │
└─────────────────────────────────────────┘
```

### Display Logic

The system now shows **BOTH** sections when applicable:

✅ **Scenario 1: Only Half-Days**
- Shows: "Half-Day Deductions" section with dates
- Hides: "Undertime Deduction" (because otherUndertimeDeduction = 0)

✅ **Scenario 2: Only Other Undertime**
- Shows: "Undertime Deduction" with total amount
- Hides: "Half-Day Deductions" (because no half-days detected)

✅ **Scenario 3: Mix of Both**
- Shows: "Half-Day Deductions" section with dates
- Shows: "Undertime Deduction" for remaining undertime
- **Example:** 2 half-days (PKR 640) + 3 hours other undertime (PKR 350) = Total PKR 990

✅ **Scenario 4: No Undertime**
- Both sections hidden

### Calculation

```
Total Absence Deduction (from payroll) = PKR 990
Half-Day Deductions = PKR 640
Other Undertime Deduction = 990 - 640 = PKR 350
```

This ensures **all undertime is shown**, whether it's exactly half-day or any other amount!

### Features
✅ **Date Specific**: Shows exact date of each half-day
✅ **Hours Display**: Shows how many hours were short
✅ **Individual Amounts**: Deduction amount for each half-day
✅ **Total Summary**: Sum of all half-day deductions
✅ **Visual Distinction**: Orange color scheme for easy identification

## Real-World Examples

### Example 1: Enamel Day Shift Employee

**Scenario:**
- Employee: Ali (Enamel Dept)
- Shift: Day (11 hours)
- Base Salary: PKR 35,000
- Date: January 10, 2025

**Attendance:**
- Check-in: 8:00 AM
- Check-out: 2:30 PM
- Hours Worked: 6.5 hours
- Undertime: 4.5 hours ❌ *Not half-day (tolerance check)*

**Attendance (Half-Day):**
- Check-in: 8:00 AM
- Check-out: 2:00 PM
- Hours Worked: 6 hours (or 5.5 hours)
- Undertime: 5.5 hours ✅ **Half-Day Detected**

**Deduction:**
```
Hourly Rate: 35,000 / (30 × 11) = PKR 106.06/hour
Deduction: 5.5 × 106.06 = PKR 583
```

**Wage Card Shows:**
```
Jan 10 - Half Day (5.5hrs short)    -PKR 583
```

### Example 2: Workshop Employee

**Scenario:**
- Employee: Sara (Workshop)
- Standard Hours: 8.5 hours
- Base Salary: PKR 28,000
- Dates: Multiple half-days

**Half-Days:**
1. January 5: 4.25 hours undertime
2. January 18: 4.25 hours undertime
3. January 25: 4.25 hours undertime

**Wage Card Shows:**
```
┌─────────────────────────────────────────┐
│ Half-Day Deductions                     │
├─────────────────────────────────────────┤
│ Jan 5  - Half Day (4.25hrs short)       │
│                        -PKR 461          │
├─────────────────────────────────────────┤
│ Jan 18 - Half Day (4.25hrs short)       │
│                        -PKR 461          │
├─────────────────────────────────────────┤
│ Jan 25 - Half Day (4.25hrs short)       │
│                        -PKR 461          │
├─────────────────────────────────────────┤
│ Total Half-Day Deductions  -PKR 1,383   │
└─────────────────────────────────────────┘
```

## Benefits

### 1. **Transparency**
- Employees can see exactly which days were counted as half-days
- Clear breakdown of deduction amounts

### 2. **Accuracy**
- Automatic detection based on department rules
- Consistent calculation across all employees

### 3. **Clarity**
- Separate from general absence deductions
- Easy to identify and verify

### 4. **Compliance**
- Follows department-specific rules
- Considers shift types (Day/Night for Enamel)

## Technical Implementation

### Files Modified

1. **`src/components/WageCard.tsx`**
   - Added [`departmentRules`](file://c:\Users\fymeo\Downloads\Compressed\NMW%20Attendance-PayRoll%20System_2\NMW%20Attendance-PayRoll%20System\src\components\WageCard.tsx#L36-L36) state
   - Added [`halfDayDeductions`](file://c:\Users\fymeo\Downloads\Compressed\NMW%20Attendance-PayRoll%20System_2\NMW%20Attendance-PayRoll%20System\src\components\WageCard.tsx#L68-L68) calculation using useMemo
   - Added department rules loading effect
   - Added Half-Day Deductions display section

### Key Functions

#### Half-Day Detection
```typescript
const halfDayDeductions = useMemo(() => {
  if (!departmentRules) return [];
  
  const halfDayHours = departmentRules.half_day_hours || 
                       (departmentRules.standard_hours_per_day / 2);
  const hourlyRate = Number(payroll.base_salary) / 
                     (30 * departmentRules.standard_hours_per_day);
  
  return attendanceData
    .filter((a: any) => {
      const undertime = a.undertime_hours || 0;
      // Within 0.5 hour tolerance
      return Math.abs(undertime - halfDayHours) <= 0.5 && undertime > 0;
    })
    .map((a: any) => ({
      date: a.attendance_date,
      hours: a.undertime_hours,
      deduction: Math.round((a.undertime_hours || 0) * hourlyRate),
      hoursWorked: a.hours_worked || 0,
    }));
}, [attendanceData, departmentRules, payroll.base_salary]);
```

## Configuration

### Department Rules Table

The feature uses the `department_calculation_rules` table:

| Column | Type | Description |
|--------|------|-------------|
| `standard_hours_per_day` | number | Full day hours |
| `half_day_hours` | number | Half day hours threshold |

**Default Values:**
- Enamel: 11 hours (standard), 5.5 hours (half-day)
- Workshop: 8.5 hours (standard), 4.25 hours (half-day)
- Others: 8 hours (standard), 4 hours (half-day)

## Testing Scenarios

### Test Case 1: Exact Half-Day
```
Department: Enamel Day Shift
Standard: 11 hours
Worked: 5.5 hours
Undertime: 5.5 hours
Expected: ✅ Detected as half-day
```

### Test Case 2: Near Half-Day (Within Tolerance)
```
Department: Workshop
Standard: 8.5 hours
Worked: 4.5 hours
Undertime: 4.0 hours
Half-Day Hours: 4.25 hours
Difference: 0.25 hours (< 0.5 tolerance)
Expected: ✅ Detected as half-day
```

### Test Case 3: Not Half-Day
```
Department: Workshop
Standard: 8.5 hours
Worked: 6 hours
Undertime: 2.5 hours
Half-Day Hours: 4.25 hours
Difference: 1.75 hours (> 0.5 tolerance)
Expected: ❌ NOT detected as half-day
```

### Test Case 4: Multiple Half-Days
```
Month: January 2025
Half-Days: Jan 5, Jan 12, Jan 20
Expected: All three should appear in list
Expected: Total deduction = Sum of all three
```

## Troubleshooting

### Issue: Half-days not showing
**Solution:**
1. Check if department rules are loaded correctly
2. Verify undertime hours are recorded in attendance
3. Check if undertime is within ±0.5 hours of half-day hours

### Issue: Wrong deduction amount
**Solution:**
1. Verify base salary is correct
2. Check standard_hours_per_day in department rules
3. Verify hourly rate calculation

### Issue: Dates showing incorrectly
**Solution:**
1. Check timezone settings
2. Verify attendance_date format in database
3. Clear browser cache

## Future Enhancements

Potential improvements:
1. **Configurable Tolerance**: Allow setting custom tolerance per department
2. **Partial Days**: Support quarter-day, three-quarter-day detection
3. **Comments**: Allow adding notes/reasons for half-days
4. **Approval Workflow**: Require manager approval for half-day deductions
5. **Export**: Include half-day details in PDF/Excel exports

## Related Features

- [Shift Functionality](SHIFT_FUNCTIONALITY_GUIDE.md): Different duty hours for day/night shifts
- [Department Rules](src/components/DepartmentRulesDialog.tsx): Configure department-specific rules
- [Salary Calculation](src/services/salaryCalculationService.ts): Undertime deduction logic

---

**Note**: This feature is automatically active for all employees. The system will detect and display half-days based on actual attendance records and department rules.
