# Night Shift Hours Calculation Fix

## 🐛 Critical Bug Found

The payroll system had a **critical bug** in calculating hours worked for night shift workers whose shifts cross midnight (7 PM PKT to 8 AM PKT).

### The Problem

When calculating hours worked, the system used a simple subtraction:
```typescript
const totalMinutes = (outHour * 60 + outMin) - (inHour * 60 + inMin);
```

**Example of the bug:**
- Check-in: 7:00 PM (19:00) = 1140 minutes
- Check-out: 8:00 AM (08:00) = 480 minutes
- **Wrong calculation:** 480 - 1140 = **-660 minutes** (negative!)
- **Correct calculation:** 480 - 1140 + 1440 = **780 minutes = 13 hours** ✅

This caused:
- ❌ Incorrect hours worked (often showing 0 or negative values)
- ❌ Wrong overtime calculations (no overtime detected when there should be)
- ❌ Wrong undertime deductions (incorrect deductions applied)
- ❌ Incorrect payroll calculations for night shift workers

## ✅ Fix Applied

### 1. Created Utility Function (`src/lib/utils.ts`)

Added `calculateHoursWorked()` function that correctly handles midnight crossover:

```typescript
export function calculateHoursWorked(checkInTime: string, checkOutTime: string): number {
  // Parse times to minutes
  const checkInMinutes = parseTime(checkInTime);
  const checkOutMinutes = parseTime(checkOutTime);

  let totalMinutes: number;

  // If checkout time is earlier than checkin time, shift crossed midnight
  if (checkOutMinutes < checkInMinutes) {
    // Night shift crossing midnight: add 24 hours (1440 minutes)
    totalMinutes = checkOutMinutes + (24 * 60) - checkInMinutes;
  } else {
    // Regular day shift: simple subtraction
    totalMinutes = checkOutMinutes - checkInMinutes;
  }

  return Math.max(0, Number((totalMinutes / 60).toFixed(2)));
}
```

### 2. Updated `EditAttendanceDialog.tsx`

Replaced manual calculation with utility function:
```typescript
// Before (WRONG):
const [inHour, inMin] = checkIn.split(':').map(Number);
const [outHour, outMin] = checkOut.split(':').map(Number);
const totalMinutes = (outHour * 60 + outMin) - (inHour * 60 + inMin);

// After (CORRECT):
const workedHours = calculateHoursWorked(checkIn, checkOut);
```

### 3. Updated `salaryCalculationService.ts`

Fixed the `updateAttendanceWithOvertime()` method:
```typescript
// Before (WRONG):
const [inHour, inMin] = checkInTime.split(':').map(Number);
const [outHour, outMin] = checkOutTime.split(':').map(Number);
const totalMinutes = (outHour * 60 + outMin) - (inHour * 60 + inMin);
const hoursWorked = totalMinutes / 60;

// After (CORRECT):
const hoursWorked = calculateHoursWorked(checkInTime, checkOutTime);
```

## 📊 Test Cases

### Day Shift (No Midnight Crossover)
- Check-in: 09:00
- Check-out: 17:00
- Expected: 8.0 hours ✅
- Result: **8.0 hours** ✅

### Night Shift (Midnight Crossover)
- Check-in: 19:00 (7 PM)
- Check-out: 08:00 (8 AM)
- Expected: 13.0 hours ✅
- Result: **13.0 hours** ✅

### Night Shift with Overtime
- Check-in: 19:00 (7 PM)
- Check-out: 09:00 (9 AM)
- Hours worked: 14.0 hours
- Standard hours (night shift): 13.0 hours
- Overtime: 1.0 hour ✅

### Night Shift with Undertime
- Check-in: 19:00 (7 PM)
- Check-out: 07:00 (7 AM)
- Hours worked: 12.0 hours
- Standard hours (night shift): 13.0 hours
- Undertime: 1.0 hour ✅

## 🎯 Impact

### Before Fix:
- ❌ Night shift workers: Hours calculated as 0 or negative
- ❌ Overtime not detected for night shifts
- ❌ Incorrect undertime deductions
- ❌ Wrong payroll calculations

### After Fix:
- ✅ Night shift workers: Hours calculated correctly (13 hours for 7 PM to 8 AM)
- ✅ Overtime correctly detected when night shift exceeds 13 hours
- ✅ Undertime correctly calculated when night shift is less than 13 hours
- ✅ Accurate payroll calculations for all shift types

## 📝 Files Modified

1. `src/lib/utils.ts` - Added `calculateHoursWorked()` utility function
2. `src/components/EditAttendanceDialog.tsx` - Updated hours calculation
3. `src/services/salaryCalculationService.ts` - Updated `updateAttendanceWithOvertime()` method

## ✅ Verification

- ✅ No linting errors
- ✅ Function handles both day and night shifts
- ✅ Correctly detects midnight crossover
- ✅ Maintains backward compatibility with day shifts
- ✅ Properly rounds to 2 decimal places

## 🔍 Additional Notes

The fix ensures that:
- Night shift workers (7 PM to 8 AM PKT) get correct 13-hour calculations
- Overtime is properly calculated when night shift exceeds 13 hours
- Undertime deductions are accurate when night shift is less than 13 hours
- Day shifts continue to work correctly (no regression)

---

**Status:** ✅ **FIXED**  
**Date:** $(Get-Date)  
**Priority:** 🔴 **CRITICAL** (Affects payroll accuracy for night shift workers)

