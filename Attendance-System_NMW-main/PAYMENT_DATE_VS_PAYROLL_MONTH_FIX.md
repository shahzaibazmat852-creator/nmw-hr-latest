# Payment Filtering Fix: Payroll Month vs Payment Date

## 🎯 Problem
When a payment is made for a previous month's wage card, but the payment date is in the current month, the payment was showing up in the current month's view instead of the wage card's month.

**Example:**
- October 2024 wage card payment
- Paid on November 5, 2024
- **Before:** Payment appeared in November 2024 view
- **After:** Payment appears only in October 2024 wage card

---

## ✅ Solution

### Changed: `useEmployeePayments` Hook
**File:** `src/hooks/usePayroll.ts`

**Before (WRONG):**
```typescript
// Filtered by payment_date - showed payments based on when they were paid
const { data, error } = await supabase
  .from("payments")
  .select("*")
  .eq("employee_id", employeeId)
  .gte("payment_date", startDate)  // ❌ Wrong - uses payment date
  .lte("payment_date", endDate)
```

**After (CORRECT):**
```typescript
// Filters by payroll month/year - shows payments for the wage card period
// 1. Get payroll IDs for the specified month/year
const { data: payrollRecords } = await supabase
  .from("payroll")
  .select("id")
  .eq("employee_id", employeeId)
  .eq("month", month)      // ✅ Correct - uses payroll month
  .eq("year", year);

// 2. Get payments for those payrolls (regardless of payment_date)
const { data } = await supabase
  .from("payments")
  .select("*")
  .in("payroll_id", payrollIds)  // ✅ Correct - uses payroll_id
```

---

## 📋 What This Fixes

### ✅ Fixed Components:
1. **WageCard** (`src/components/WageCard.tsx`)
   - Now shows payments based on payroll month/year
   - Payment date is irrelevant for display purposes

2. **Any component using `useEmployeePayments`**
   - All components using this hook now get correct filtering

### ✅ Already Correct (No Changes Needed):
1. **Payroll Page** (`src/pages/Payroll.tsx`)
   - Already filters by `payroll_id` ✅
   - Query: `.in("payroll_id", payrollIds)`

2. **Employee Ledger** (`src/pages/EmployeeLedger.tsx`)
   - Already filters by `payroll_id` ✅
   - Query: `.eq("payroll_id", pr.id)`

3. **Ledger Salary Report** (`src/components/LedgerSalaryReport.tsx`)
   - Already filters by `payroll_id` ✅
   - Query: `.in("payroll_id", payrollIds)`

### ✅ Intentional (Payment Date Filtering):
These components correctly filter by `payment_date` for their specific use cases:

1. **Dashboard** (`src/pages/Dashboard.tsx`)
   - Shows "month-to-date" payments made this month
   - Purpose: Financial tracking of when money was actually paid out
   - ✅ Correctly uses `payment_date`

2. **Query Service** (`src/services/queryService.ts`)
   - Dashboard aggregates show payments made this month
   - ✅ Correctly uses `payment_date`

---

## 🔍 Key Principle

**Rule:** 
- **Wage Cards / Payroll Views** → Filter by **payroll month/year** (via `payroll_id`)
- **Financial Reports / Dashboard** → Filter by **payment date** (when money was actually paid)

---

## ✅ Testing Checklist

1. **Create Payment for Previous Month:**
   - Open October 2024 wage card
   - Record payment with date: November 5, 2024
   - ✅ Payment should appear in October 2024 wage card
   - ✅ Payment should NOT appear in November 2024 wage card

2. **Verify Wage Card:**
   - Open wage card for any month
   - All payments shown should belong to that month's payroll
   - Payment dates can be different from the wage card month

3. **Verify Payroll Page:**
   - Switch to October 2024
   - Record payment dated November 2024
   - ✅ Payment appears in October 2024 payroll view
   - Switch to November 2024
   - ✅ Payment does NOT appear in November 2024 payroll view

---

## 📝 Database Structure

```sql
payments table:
  - id (uuid)
  - employee_id (uuid)
  - payroll_id (uuid) → Links to payroll.month/year
  - amount (numeric)
  - payment_date (date) → When payment was made
  - notes (text)

payroll table:
  - id (uuid)
  - employee_id (uuid)
  - month (int) → Wage card month
  - year (int) → Wage card year
  - final_salary (numeric)
  ...
```

**Relationship:** `payments.payroll_id` → `payroll.id` → `payroll.month/year`

---

## ✅ Status: FIXED

The wage card and all payroll views now correctly display payments based on the payroll period they belong to, not when they were paid.

