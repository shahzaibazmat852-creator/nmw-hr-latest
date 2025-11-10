# Login History Setup Guide

## Overview
The login history feature tracks user login/logout activities with detailed session information including browser, device, OS, and session duration.

## Database Migration Required

You need to run the migration to create the `login_history` table in your Supabase database.

### Migration File Location
```
supabase/migrations/005_login_history.sql
```

### How to Run the Migration

**Option 1: Using Supabase Dashboard (Recommended)**
1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor**
3. Open the file `supabase/migrations/005_login_history.sql`
4. Copy all the SQL content
5. Paste it into the SQL Editor
6. Click **Run** to execute

**Option 2: Using Supabase CLI**
If you have Supabase CLI installed:
```bash
supabase db push
```

## What the Migration Creates

### 1. Login History Table
- Stores login/logout timestamps
- Tracks session duration
- Captures browser, device, and OS information
- Records success/failure status

### 2. Indexes for Performance
- Index on `user_id` for fast user-specific queries
- Index on `login_time` for chronological sorting
- Index on `user_email` for email-based searches

### 3. Row Level Security (RLS)
- Authenticated users can read all login history
- System automatically logs activities (no manual inserts needed)

### 4. Cleanup Function
- `cleanup_old_login_history()` function to remove records older than 6 months
- Can be scheduled for automatic maintenance

## Features Included

### Automatic Tracking
- **Login**: Automatically logged when user signs in
- **Logout**: Session duration calculated when user signs out
- **Browser Detection**: Chrome, Firefox, Safari, Edge, Opera
- **Device Type**: Desktop, Mobile, Tablet
- **Operating System**: Windows, macOS, Linux, Android, iOS

### Login History Page
Access at: `/login-history`

**Statistics Dashboard:**
- Total logins count
- Logins today
- Average session duration
- Unique users count

**Detailed Table:**
- User email
- Login timestamp
- Logout timestamp
- Session duration
- Browser information
- Device type
- Operating system
- Active/Completed status

## After Migration

Once the migration is complete:
1. The system will automatically start logging all login/logout activities
2. Access the Login History page from the sidebar navigation
3. View comprehensive login analytics and session tracking

## Troubleshooting

If you encounter any issues:
1. Ensure you're connected to the correct Supabase project
2. Check that your database user has sufficient permissions
3. Verify the migration executed without errors in the SQL Editor
4. Refresh your browser after running the migration

## Data Retention

By default, login history is retained indefinitely. To clean up old records:
```sql
SELECT cleanup_old_login_history();
```

You can modify the retention period in the migration file if needed.
