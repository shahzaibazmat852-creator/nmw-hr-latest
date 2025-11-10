# Shift Functionality Guide

## Overview
This system now supports shift-based attendance with different duty hours based on employee departments and shift types.

## Shift Types

### 1. **Enamel Department**
- **Day Shift**: 8:00 AM to 7:00 PM (11 hours duty)
- **Night Shift**: 7:00 PM to 8:00 AM PKT (13 hours duty)
- When marking attendance for Enamel employees, you **must** select the shift type (Day or Night)

### 2. **Workshop Department**
- **Regular Shift**: 8:30 AM to 5:00 PM (8.5 hours duty)
- No shift selection needed - automatically uses 8.5 hours

### 3. **Other Departments** (Guards, Cooks, Admins, Directors, Accounts)
- **Regular Shift**: 8 hours duty (or as configured in department rules)
- No shift selection needed

## How It Works

### Attendance Marking

#### Biometric Attendance Dialog
1. Employee scans fingerprint/biometric
2. System identifies employee
3. **If employee is from Enamel department**, a shift selection appears:
   - Day Shift (11 hours) - shown with Sun icon
   - Night Shift (13 hours) - shown with Moon icon
4. Select the appropriate shift before checking in
5. The shift type is saved with the attendance record

#### Bulk Attendance Dialog
1. Select department and employees
2. **If Enamel department is selected**, shift selection appears:
   - Day Shift (11 hours)
   - Night Shift (13 hours)
3. All selected Enamel employees will be marked with the same shift type
4. Workshop employees automatically use 8.5 hours
5. Other departments use standard hours

#### Edit Attendance Dialog
1. When editing attendance for an Enamel employee, you can change the shift type
2. Changing the shift type automatically recalculates:
   - Hours worked
   - Overtime hours
   - Undertime hours

### Overtime & Undertime Calculation

The system automatically calculates overtime and undertime based on the shift type:

#### Enamel Department
- **Day Shift** (8 AM to 7 PM - 11 hours):
  - If worked > 11 hours → Overtime
  - If worked < 11 hours → Undertime
- **Night Shift** (7 PM to 8 AM - 13 hours):
  - If worked > 13 hours → Overtime
  - If worked < 13 hours → Undertime

#### Workshop Department
- **Regular Shift** (8:30 AM to 5 PM - 8.5 hours):
  - If worked > 8.5 hours → Overtime
  - If worked < 8.5 hours → Undertime

#### Other Departments
- **Regular** (8 hours):
  - If worked > 8 hours → Overtime
  - If worked < 8 hours → Undertime

### Salary Calculation

The salary calculation service automatically considers the shift type when:
1. Calculating hourly rates
2. Computing overtime pay
3. Calculating undertime deductions

For Enamel employees:
- Day shift workers: Based on 11 hours per day
- Night shift workers: Based on 13 hours per day

## Database Changes

### New Migration: `008_add_shift_types.sql`

This migration adds:
1. **New Enum Type**: `shift_type` with values: `day`, `night`, `regular`
2. **New Column**: `shift_type` in the `attendance` table (default: `regular`)
3. **Updated Department Rules**:
   - Enamel: Default 11 hours (day shift)
   - Workshop: 8.5 hours

### TypeScript Types

Updated `src/integrations/supabase/types.ts` to include:
```typescript
shift_type: "day" | "night" | "regular"
```

## Running the Migration

To apply the shift functionality, run:

```bash
# If using Supabase CLI
supabase db push

# Or manually execute the migration file
# supabase/migrations/008_add_shift_types.sql
```

## UI Components Updated

1. **BiometricAttendanceDialog.tsx**
   - Added shift selection for Enamel employees
   - Sun icon for day shift
   - Moon icon for night shift

2. **BulkAttendanceDialog.tsx**
   - Added shift selection when Enamel department is selected
   - Applies shift type to all selected employees

3. **EditAttendanceDialog.tsx**
   - Shows shift selection for Enamel employees
   - Automatically recalculates hours when shift type changes
   - Displays current shift type

## Backend Services Updated

1. **salaryCalculationService.ts**
   - `updateAttendanceWithOvertime()` now considers shift types
   - Automatically determines standard hours based on:
     - Department (Enamel, Workshop, Others)
     - Shift type (day, night, regular)

2. **useAttendance.ts**
   - `useBulkMarkAttendance()` accepts shift type parameter
   - Attendance interface includes shift_type field

## Benefits

1. **Accurate Calculations**: Different duty hours for different shifts
2. **Fair Compensation**: Night shift workers (13h) vs day shift (11h)
3. **Automatic**: System calculates overtime/undertime based on shift
4. **Flexible**: Easy to add new shift types in the future
5. **Department-Specific**: Each department can have its own shift rules

## Examples

### Example 1: Enamel Day Shift
- Check-in: 8:00 AM
- Check-out: 7:00 PM (11 hours)
- Shift: Day (11 hours)
- Result: Exactly 11 hours - no overtime, no undertime

### Example 2: Enamel Night Shift
- Check-in: 7:00 PM
- Check-out: 8:00 AM next day (13 hours)
- Shift: Night (13 hours)
- Result: Exactly 13 hours - no overtime, no undertime

### Example 3: Workshop Regular
- Check-in: 8:30 AM
- Check-out: 5:00 PM (8.5 hours)
- Shift: Regular (8.5 hours)
- Result: Exactly 8.5 hours - no overtime, no undertime

### Example 4: Enamel Day Shift Undertime
- Check-in: 8:00 AM
- Check-out: 6:00 PM (10 hours)
- Shift: Day (11 hours)
- Result: 11 - 10 = 1 hour undertime

## Future Enhancements

Possible future improvements:
1. Add more shift types (e.g., evening shift, split shift)
2. Department-specific shift configurations
3. Automatic shift detection based on check-in time
4. Shift scheduling and roster management
5. Shift differential pay rates
