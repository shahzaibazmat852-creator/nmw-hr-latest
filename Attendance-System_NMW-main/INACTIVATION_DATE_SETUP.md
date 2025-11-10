# Employee Inactivation Date Setup Guide

## Overview
This feature tracks when employees become inactive with automatic date tracking and ensures inactive employees are hidden from attendance and payroll operations.

## Database Migration Required

You need to run the migration to add the `inactivation_date` column and automatic trigger.

### Migration File Location
```
supabase/migrations/014_add_inactivation_date.sql
```

### How to Run the Migration

**Option 1: Using Supabase Dashboard (Recommended)**

1. Go to your Supabase project dashboard:
   - URL: https://app.supabase.com/project/lfknrgwaslghsubuwbjq
   
2. Navigate to **SQL Editor**

3. Click **New Query**

4. Open the file `supabase/migrations/014_add_inactivation_date.sql`

5. Copy all the SQL content

6. Paste it into the SQL Editor

7. Click **Run** to execute the migration

8. Verify the migration succeeded:
```sql
-- Check if inactivation_date column exists
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'employees' AND column_name = 'inactivation_date';

-- Check trigger exists
SELECT trigger_name, event_manipulation, event_object_table
FROM information_schema.triggers
WHERE trigger_name = 'trigger_set_inactivation_date';
```

**Option 2: Using Supabase CLI** (if installed)
```bash
supabase db push
```

---

## What the Migration Creates

### 1. Inactivation Date Column
- Adds `inactivation_date` DATE column to `employees` table
- Stores the date when an employee becomes inactive
- NULL when employee is currently active

### 2. Automatic Trigger
- **Set on Inactivation**: When `is_active` changes from `true` to `false`, automatically sets `inactivation_date` to current date
- **Clear on Reactivation**: When `is_active` changes from `false` to `true`, automatically clears `inactivation_date` to NULL
- No manual intervention needed

### 3. Performance Index
- Creates index on `inactivation_date` for faster queries filtering inactive employees

---

## Features Included

### Automatic Tracking
- ✅ **Set on Deactivation**: Date automatically recorded when employee becomes inactive
- ✅ **Clear on Reactivation**: Date automatically cleared when employee becomes active again
- ✅ **No Manual Work**: Trigger handles everything automatically

### UI Updates
- ✅ **Employees Page**: Shows inactivation date for inactive employees in grid and list views
- ✅ **Hidden from Attendance**: Inactive employees don't appear in attendance marking
- ✅ **Hidden from Payroll**: Inactive employees excluded from batch payroll generation
- ✅ **Visual Indicator**: Inactive employees shown with lower opacity

### Employee Management
- ✅ **Show All Toggle**: Users can view inactive employees with "Show All" button
- ✅ **Date Display**: Inactivation date shown in employee cards
- ✅ **Easy Reactivation**: Click eye icon to reactivate and clear date automatically

---

## Testing the Feature

### Test 1: Automatic Date Setting
1. Go to Employees page
2. Find an active employee
3. Click the Eye icon to deactivate
4. Check employee card now shows "Inactivated: [date]"

### Test 2: Automatic Date Clearing
1. Find an inactive employee
2. Click the Eye icon to reactivate
3. Check "Inactivated" date disappears from employee card

### Test 3: Attendance Filtering
1. Go to Attendance page
2. Try to mark attendance
3. Verify inactive employees don't appear in employee dropdown

### Test 4: Payroll Filtering
1. Go to Payroll page
2. Click "Generate Payroll"
3. Select "All Employees"
4. Verify only active employees are processed

---

## Verification Queries

### Check inactive employees with dates
```sql
SELECT name, employee_id, inactivation_date
FROM employees
WHERE is_active = false
ORDER BY inactivation_date DESC;
```

### Check all employees status
```sql
SELECT 
  name,
  employee_id,
  is_active,
  inactivation_date,
  CASE 
    WHEN is_active THEN 'Active'
    ELSE 'Inactive since ' || inactivation_date::text
  END AS status
FROM employees
ORDER BY is_active DESC, name;
```

### Recent inactivations (last 30 days)
```sql
SELECT name, employee_id, inactivation_date
FROM employees
WHERE inactivation_date >= CURRENT_DATE - INTERVAL '30 days'
ORDER BY inactivation_date DESC;
```

---

## Rollback (if needed)

If you need to remove this feature:

```sql
-- Drop trigger
DROP TRIGGER IF EXISTS trigger_set_inactivation_date ON employees;

-- Drop function
DROP FUNCTION IF EXISTS set_inactivation_date();

-- Drop index
DROP INDEX IF EXISTS idx_employees_inactivation_date;

-- Remove column
ALTER TABLE employees DROP COLUMN IF EXISTS inactivation_date;
```

---

## Troubleshooting

### Issue: No data showing
- **Solution**: Make sure you clicked "Show All" button in Employees page

### Issue: Date not setting automatically
- **Solution**: Check if trigger was created successfully in SQL Editor:
  ```sql
  SELECT * FROM information_schema.triggers 
  WHERE trigger_name = 'trigger_set_inactivation_date';
  ```

### Issue: Previous inactivations don't have dates
- **Solution**: Previous inactivations won't have dates. Only new inactivations after migration will have automatic dates.

### Issue: TypeScript errors
- **Solution**: Restart your dev server after applying migration


