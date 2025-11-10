# Edit History & Admin Access Setup Guide

## Overview
This feature provides comprehensive audit tracking for all edits made to critical data in your payroll system. It automatically logs changes to attendance, payments, and payroll records.

## Admin Access Control

### Restricted Pages
The following pages are **only visible** to the admin user:
- **Login History** (`/login-history`)
- **Edit History** (`/edit-history`)

### Admin User ID
```
6d98b84a-bb05-4cee-81f2-4756a1089a55
```

Only this specific user account can:
- See Login History and Edit History navigation links in the sidebar
- Access the Login History and Edit History pages
- View all audit logs

**Note:** Other users will be automatically redirected to the dashboard if they try to access these pages.

---

## Database Migration Required

You need to run the migration to create the `edit_history` table and triggers.

### Migration File Location
```
supabase/migrations/006_edit_history.sql
```

### How to Run the Migration

**Option 1: Using Supabase Dashboard (Recommended)**
1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor**
3. Open the file `supabase/migrations/006_edit_history.sql`
4. Copy all the SQL content
5. Paste it into the SQL Editor
6. Click **Run** to execute

**Option 2: Using Supabase CLI**
If you have Supabase CLI installed:
```bash
supabase db push
```

---

## What Gets Tracked

### Automatic Edit Logging
The system automatically tracks edits to:

1. **Attendance Records**
   - Status changes (Present → Absent, etc.)
   - Date modifications
   - Any field updates

2. **Payment Records**
   - Amount changes
   - Payment date modifications
   - Status updates
   - Any field edits

3. **Payroll Records**
   - Salary adjustments
   - Deduction changes
   - Bonus modifications
   - Any payroll field updates

### What Information Is Captured

For each edit, the system records:
- **Who**: User ID and email of the person who made the edit
- **When**: Exact timestamp of the change
- **What**: Table name and record ID
- **Changes**: 
  - Old values (before edit)
  - New values (after edit)
  - List of fields that were changed
- **Action**: UPDATE or DELETE

---

## Features Included

### Edit History Page
Access at: `/edit-history` (Admin only)

**Statistics Dashboard:**
- Total edits count
- Attendance edits count
- Payment edits count
- Payroll edits count

**Filter Options:**
- View all edits
- Filter by table (Attendance, Payments, Payroll)

**Detailed Table:**
- Timestamp (date and time)
- User who made the edit
- Table name (color-coded badges)
- Action type (UPDATE/DELETE)
- List of changes with old → new values

---

## How It Works

### Behind the Scenes
1. **Database Triggers**: Automatically fire when records are updated
2. **Trigger Functions**: Capture old and new values
3. **Edit History Table**: Stores complete audit trail
4. **React Page**: Displays the data in a user-friendly format

### Example Workflow
1. User edits an attendance record (changes status from Present to Absent)
2. Database trigger automatically fires
3. System captures:
   - User: user@example.com
   - Table: attendance
   - Change: status: Present → Absent
   - Timestamp: 2025-10-18 10:30:15
4. Record is saved to `edit_history` table
5. Admin can view this change in Edit History page

---

## Security Features

### Row Level Security (RLS)
- Only authenticated users can read edit history
- System automatically logs edits (no manual inserts needed)
- Prevents unauthorized data manipulation

### Access Control
- Navigation links only visible to admin user
- Page access restricted by user ID check
- Automatic redirect for non-admin users

### Data Integrity
- Edit history cannot be modified by users
- Complete audit trail preserved
- Old and new values stored as JSON

---

## Data Retention

By default, edit history is retained for **12 months**.

### Manual Cleanup
To remove records older than 12 months:
```sql
SELECT cleanup_old_edit_history();
```

### Modify Retention Period
You can adjust the retention period in the migration file by changing:
```sql
WHERE edited_at < NOW() - INTERVAL '12 months';
```

To a different interval (e.g., '6 months', '24 months', etc.)

---

## After Migration

Once both migrations (005 and 006) are complete:

1. **Login History**: 
   - System starts logging all login/logout activities
   - Access via `/login-history` (admin only)

2. **Edit History**:
   - System starts tracking all edits to attendance, payments, payroll
   - Access via `/edit-history` (admin only)

3. **Sidebar Navigation**:
   - Admin user sees "Login History" and "Edit History" links
   - Regular users don't see these links

---

## Troubleshooting

### Pages Not Appearing
- Verify you're logged in with the admin user ID
- Check browser console for errors
- Refresh the page after logging in

### No Edit History Showing
- Ensure migration 006 was executed successfully
- Try making a test edit to an attendance or payment record
- Check that triggers were created properly

### Access Denied
- Confirm you're using the correct admin account
- User ID must exactly match: `6d98b84a-bb05-4cee-81f2-4756a1089a55`
- Try logging out and back in

---

## Testing the Feature

### Step-by-Step Test

1. **Run both migrations** (005_login_history.sql and 006_edit_history.sql)

2. **Login as admin user** (6d98b84a-bb05-4cee-81f2-4756a1089a55)

3. **Check sidebar** - You should see:
   - Login History (with History icon)
   - Edit History (with FileEdit icon)

4. **Test Edit Tracking**:
   - Go to Attendance page
   - Edit an attendance record
   - Go to Edit History page
   - You should see the edit logged

5. **Test Login Tracking**:
   - Log out
   - Log back in
   - Go to Login History page
   - You should see your login session

---

## Support

If you encounter any issues:
1. Check that migrations ran without errors
2. Verify your user ID matches the admin ID
3. Check browser console for error messages
4. Ensure Supabase connection is working

---

## Summary

✅ **Login History**: Track who logged in, when, and from which device  
✅ **Edit History**: Automatic audit trail for all data changes  
✅ **Admin Access**: Restricted to specific admin user only  
✅ **Security**: RLS policies and access control  
✅ **Triggers**: Automatic, no manual logging required  
✅ **Clean UI**: Matches existing design system with animations and gradients
