# Shift Functionality Implementation Guide

## ✅ Changes Completed

This implementation adds shift-based attendance tracking with different duty hours for Enamel department employees (Day: 11h, Night: 13h) and Workshop employees (8.5h).

## Files Modified

### 1. Database Migration
- **File**: `supabase/migrations/008_add_shift_types.sql`
- **Changes**:
  - Created `shift_type` enum (`day`, `night`, `regular`)
  - Added `shift_type` column to `attendance` table
  - Updated department rules for Enamel (11h) and Workshop (8.5h)

### 2. TypeScript Types
- **File**: `src/integrations/supabase/types.ts`
- **Changes**:
  - Added `shift_type` to attendance table types
  - Added `shift_type` enum definition

### 3. Attendance Hook
- **File**: `src/hooks/useAttendance.ts`
- **Changes**:
  - Added `shift_type` field to `Attendance` interface
  - Updated `useBulkMarkAttendance` to accept `shiftType` parameter

### 4. UI Components

#### BiometricAttendanceDialog
- **File**: `src/components/BiometricAttendanceDialog.tsx`
- **Changes**:
  - Added shift type state and selection
  - Shows Day/Night shift buttons for Enamel employees
  - Automatically sets shift type based on employee department
  - Includes Sun/Moon icons for visual clarity

#### BulkAttendanceDialog
- **File**: `src/components/BulkAttendanceDialog.tsx`
- **Changes**:
  - Added shift type state and selection
  - Shows shift selection when Enamel department is selected
  - Applies shift type to all selected employees
  - Includes Sun/Moon icons for visual clarity

#### EditAttendanceDialog
- **File**: `src/components/EditAttendanceDialog.tsx`
- **Changes**:
  - Added shift type state and selection
  - Shows shift buttons for Enamel employees
  - Automatically recalculates overtime/undertime when shift changes
  - Considers shift type in calculations

### 5. Salary Calculation Service
- **File**: `src/services/salaryCalculationService.ts`
- **Changes**:
  - Updated `updateAttendanceWithOvertime()` to fetch and use shift type
  - Calculates standard hours based on:
    - Enamel Day Shift: 11 hours
    - Enamel Night Shift: 13 hours
    - Workshop: 8.5 hours
    - Others: 8 hours (or department rules)

### 6. Documentation
- **File**: `SHIFT_FUNCTIONALITY_GUIDE.md`
- **Changes**: Complete user guide for shift functionality

## 🚀 Deployment Steps

### Step 1: Apply Database Migration

You need to run the migration `008_add_shift_types.sql` on your Supabase database.

#### Option A: Using Supabase Dashboard (Recommended)
1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor**
3. Click **New Query**
4. Copy the entire contents of `supabase/migrations/008_add_shift_types.sql`
5. Paste it into the SQL editor
6. Click **Run** to execute the migration
7. Verify the changes:
   ```sql
   -- Check if shift_type column exists
   SELECT column_name, data_type 
   FROM information_schema.columns 
   WHERE table_name = 'attendance' AND column_name = 'shift_type';
   
   -- Check department rules
   SELECT department, standard_hours_per_day 
   FROM department_calculation_rules 
   WHERE department IN ('Enamel', 'Workshop');
   ```

#### Option B: Using Supabase CLI (if installed)
```bash
cd "c:\Users\fymeo\Downloads\Compressed\NMW Attendance-PayRoll System_2\NMW Attendance-PayRoll System"
supabase db push
```

### Step 2: Update TypeScript Types (If Needed)

If you're using Supabase's type generation, regenerate types:
```bash
supabase gen types typescript --project-id YOUR_PROJECT_ID > src/integrations/supabase/types.ts
```

Or manually ensure the `shift_type` enum is in your types file (already done).

### Step 3: Deploy Frontend Code

Deploy the updated React application:

```bash
# Install dependencies (if needed)
npm install

# Build for production
npm run build

# Deploy to Vercel (or your hosting platform)
vercel --prod
```

### Step 4: Test the Functionality

1. **Test Biometric Attendance (Enamel Employee)**:
   - Open the attendance page
   - Click "Biometric Attendance"
   - Scan fingerprint of an Enamel employee
   - Verify shift selection appears (Day/Night)
   - Select shift and mark attendance
   - Verify attendance is saved with correct shift type

2. **Test Bulk Attendance (Enamel Department)**:
   - Open attendance page
   - Click "Bulk Attendance"
   - Select Enamel department
   - Verify shift selection appears
   - Select employees and shift type
   - Mark attendance
   - Verify all selected employees have correct shift type

3. **Test Edit Attendance (Enamel Employee)**:
   - Find an Enamel employee's attendance
   - Click edit
   - Verify shift type buttons appear
   - Change shift type
   - Verify hours/overtime/undertime recalculate
   - Save changes

4. **Test Workshop Department**:
   - Mark attendance for Workshop employees
   - No shift selection should appear
   - Verify 8.5 hours is used for calculations

5. **Test Overtime/Undertime Calculations**:
   - Enamel Day Shift: Check-in 8:00, Check-out 20:00 (12 hours)
     - Should show 1 hour overtime (12 - 11 = 1)
   - Enamel Night Shift: Check-in 20:00, Check-out 09:00 (13 hours)
     - Should show 0 overtime, 0 undertime
   - Workshop: Check-in 8:00, Check-out 17:00 (9 hours)
     - Should show 0.5 hours overtime (9 - 8.5 = 0.5)

## ⚠️ Important Notes

### Data Migration for Existing Attendance Records
All existing attendance records will have `shift_type = 'regular'` by default. If you need to update historical records:

```sql
-- Update existing Enamel employee attendance to day shift (if applicable)
UPDATE attendance
SET shift_type = 'day'
WHERE employee_id IN (
  SELECT id FROM employees WHERE department = 'Enamel'
)
AND shift_type = 'regular';

-- Or manually update specific records as needed
```

### Department Rules
The migration automatically updates:
- **Enamel**: 11 hours standard (default to day shift)
- **Workshop**: 8.5 hours

You can adjust these in the `department_calculation_rules` table if needed.

### Shift Type Logic
- **Enamel**: Must select Day (11h) or Night (13h)
- **Workshop**: Always uses Regular (8.5h)
- **Others**: Always uses Regular (8h or department rules)

## 🐛 Troubleshooting

### Issue: Shift selection not appearing
- **Solution**: Check if employee department is "Enamel" in database
- Verify the component is receiving employee data correctly

### Issue: Wrong hours calculated
- **Solution**: 
  - Check `shift_type` value in attendance record
  - Verify `department_calculation_rules` table has correct values
  - Clear browser cache and reload

### Issue: Migration fails
- **Solution**:
  - Check if `shift_type` enum already exists: `SELECT * FROM pg_type WHERE typname = 'shift_type';`
  - If it exists but migration fails, drop and recreate: 
    ```sql
    DROP TYPE IF EXISTS shift_type CASCADE;
    -- Then run migration again
    ```

### Issue: TypeScript errors
- **Solution**: 
  - Ensure `shift_type` is added to types.ts
  - Run `npm install` to ensure dependencies are up to date
  - Restart TypeScript server in your IDE

## 📊 Expected Behavior

### Enamel Department
| Shift Type | Standard Hours | Example Work Hours | Overtime | Undertime |
|------------|---------------|-------------------|----------|-----------|
| Day | 11 | 12 | 1 | 0 |
| Day | 11 | 11 | 0 | 0 |
| Day | 11 | 10 | 0 | 1 |
| Night | 13 | 14 | 1 | 0 |
| Night | 13 | 13 | 0 | 0 |
| Night | 13 | 12 | 0 | 1 |

### Workshop Department
| Shift Type | Standard Hours | Example Work Hours | Overtime | Undertime |
|------------|---------------|-------------------|----------|-----------|
| Regular | 8.5 | 9 | 0.5 | 0 |
| Regular | 8.5 | 8.5 | 0 | 0 |
| Regular | 8.5 | 8 | 0 | 0.5 |

### Other Departments
| Shift Type | Standard Hours | Example Work Hours | Overtime | Undertime |
|------------|---------------|-------------------|----------|-----------|
| Regular | 8 | 9 | 1 | 0 |
| Regular | 8 | 8 | 0 | 0 |
| Regular | 8 | 7 | 0 | 1 |

## ✨ Success Criteria

The implementation is successful when:
- ✅ Database migration runs without errors
- ✅ Shift selection appears for Enamel employees only
- ✅ Day shift correctly uses 11 hours for calculations
- ✅ Night shift correctly uses 13 hours for calculations
- ✅ Workshop always uses 8.5 hours
- ✅ Other departments use standard 8 hours (or configured hours)
- ✅ Overtime/undertime calculated correctly based on shift
- ✅ Shift type persists in database
- ✅ Edit attendance allows changing shift type
- ✅ Bulk attendance applies shift type to all selected employees
- ✅ No TypeScript or runtime errors

## 📞 Support

If you encounter any issues:
1. Check the troubleshooting section above
2. Verify the migration was applied correctly
3. Check browser console for errors
4. Review `SHIFT_FUNCTIONALITY_GUIDE.md` for usage instructions
