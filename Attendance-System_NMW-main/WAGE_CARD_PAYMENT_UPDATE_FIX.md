# Wage Card Payment Update Fix 🔧

## **Problem Identified:**
The wage card is not updating when new payments are recorded. This is due to a **query invalidation issue** in the realtime subscription.

---

## **Root Cause:**
The `useEmployeePayments` hook has a realtime subscription that only invalidates the general `["employee-payments"]` query key, but the actual query uses a specific key `["employee-payments", employeeId, month, year]`.

### ❌ **BROKEN (Before Fix):**
```javascript
// Realtime subscription only invalidates general key
queryClient.invalidateQueries({ queryKey: ["employee-payments"] });

// But the actual query uses specific key
queryKey: ["employee-payments", employeeId, month, year]
```

### ✅ **FIXED (After Fix):**
```javascript
// Now invalidates both general and specific keys
queryClient.invalidateQueries({ queryKey: ["employee-payments"] });
queryClient.invalidateQueries({ queryKey: ["employee-payments", employeeId, month, year] });
```

---

## **Fixes Applied:**

### 1. **Fixed Realtime Subscription** ✅
**File:** `src/hooks/usePayroll.ts`

**Problem:** Realtime subscription only invalidated general query key
**Fix:** Added specific query key invalidation

```javascript
// OLD (BROKEN):
queryClient.invalidateQueries({ queryKey: ["employee-payments"] });

// NEW (FIXED):
queryClient.invalidateQueries({ queryKey: ["employee-payments"] });
queryClient.invalidateQueries({ queryKey: ["employee-payments", employeeId, month, year] });
```

### 2. **Added Debug Logging** ✅
**File:** `src/hooks/usePayroll.ts`

**Added:** Console logging to track realtime updates
```javascript
console.log("🔄 Payment realtime update received for employee:", employeeId, "month:", month, "year:", year);
```

### 3. **Added WageCard Debug Logging** ✅
**File:** `src/components/WageCard.tsx`

**Added:** Console logging to track payment data changes
```javascript
useEffect(() => {
  console.log("🔄 WageCard payments data updated:", paymentsData.length, "payments for", employee.name);
  console.log("🔄 Payment details:", paymentsData);
}, [paymentsData, employee.name]);
```

---

## **How It Works Now:**

### **When a Payment is Added:**
1. **Mutation executes** → `useAddPayment` adds payment to database
2. **Mutation success** → Invalidates specific query keys
3. **Realtime subscription** → Detects database change
4. **Realtime callback** → Invalidates both general and specific query keys
5. **Query refetch** → `useEmployeePayments` refetches data
6. **WageCard re-renders** → Shows updated payment data

### **Query Key Hierarchy:**
- **General:** `["employee-payments"]` - Invalidates all employee payment queries
- **Specific:** `["employee-payments", employeeId, month, year]` - Invalidates specific employee's payments
- **Payroll:** `["payroll-payments", payrollId]` - Invalidates payroll-specific payments

---

## **Testing Instructions:**

### **Step 1: Open Console**
1. Press **F12** to open DevTools
2. Click **Console** tab
3. Clear console (click 🚫 icon)

### **Step 2: Open Wage Card**
1. Go to **Payroll** page
2. Click on any **employee's wage card**
3. Note the current payment count in console

### **Step 3: Add a Payment**
1. In the wage card, add a new payment
2. **Expected Console Output:**
   ```
   🔄 Payment realtime update received for employee: [id] month: [month] year: [year]
   🔄 WageCard payments data updated: [new count] payments for [employee name]
   🔄 Payment details: [array of payments]
   ```

### **Step 4: Verify Update**
1. **Wage card should immediately show:**
   - Updated payment count
   - New payment in payment history
   - Updated total paid amount
   - Updated balance

---

## **Expected Behavior After Fix:**

### ✅ **Immediate Updates:**
- Payment count updates instantly
- Payment history shows new payment
- Total paid amount recalculates
- Balance updates correctly

### ✅ **Console Logs:**
- Realtime subscription logs
- WageCard data update logs
- Payment details logged

### ✅ **No Manual Refresh Needed:**
- Wage card updates automatically
- No need to close/reopen dialog
- Real-time synchronization

---

## **Files Modified:**

| File | Changes | Purpose |
|------|---------|---------|
| `src/hooks/usePayroll.ts` | Fixed realtime subscription query invalidation | Ensure specific query keys are invalidated |
| `src/components/WageCard.tsx` | Added debug logging | Track payment data changes |

---

## **Why This Fixes the Issue:**

### **Before Fix:**
- Realtime subscription detected changes ✅
- But only invalidated general query key ❌
- Specific query key wasn't invalidated ❌
- WageCard didn't refetch data ❌
- UI didn't update ❌

### **After Fix:**
- Realtime subscription detects changes ✅
- Invalidates both general and specific query keys ✅
- Specific query key gets invalidated ✅
- WageCard refetches data ✅
- UI updates immediately ✅

---

## **Additional Notes:**

### **Other Mutations Already Fixed:**
- `useAddPayment` - Already invalidates correct keys ✅
- `useUpdatePayment` - Already invalidates correct keys ✅
- `useDeletePayment` - Already invalidates correct keys ✅

### **Realtime Subscriptions:**
- All payment mutations trigger realtime updates
- Realtime subscription now properly invalidates queries
- WageCard automatically updates when payments change

---

## **Quick Test:**

1. **Open wage card**
2. **Add a payment**
3. **Check console for logs**
4. **Verify wage card updates immediately**

**The wage card should now update in real-time when payments are added, updated, or deleted!** 🎯

---

**Summary: Fixed query invalidation in realtime subscription to ensure wage card updates immediately when payments change.** ✅
