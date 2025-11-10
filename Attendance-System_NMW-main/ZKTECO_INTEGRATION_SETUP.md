# ZKTeco Device Integration Setup Guide

## Overview
This guide will help you integrate your ZKTeco biometric device (IP: 192.168.1.168) with the NMW Attendance & Payroll System.

## Device Configuration

**Your ZKTeco Device Settings:**
- 📍 IP Address: `192.168.1.168`
- 🔌 HTTP Port: `80`
- 🔌 TCP COMM Port: `4370`
- 🌐 Server Mode: ADMS
- 🔒 HTTPS: Disabled

## Step-by-Step Setup

### Step 1: Apply Database Migration

1. Go to your Supabase SQL Editor:
   - URL: https://app.supabase.com/project/lfknrgwaslghsubuwbjq/sql/new

2. Copy and paste the contents of:
   - `supabase/migrations/011_add_zkteco_integration.sql`

3. Click **Run** to execute the migration

4. Verify the migration succeeded:
```sql
SELECT employee_id, biometric_device_user_id, name
FROM employees
ORDER BY biometric_device_user_id
LIMIT 10;
```

You should see all employees with their `biometric_device_user_id` populated (e.g., EMP001 → 1, EMP002 → 2)

### Step 2: Update Environment Variables

Already done! ✅ Your `.env` file now contains:

```env
# ZKTeco Biometric Device Configuration
VITE_ZKTECO_DEVICE_IP=192.168.1.168
VITE_ZKTECO_DEVICE_PORT=80
VITE_ZKTECO_TCP_PORT=4370
VITE_ZKTECO_USERNAME=admin
VITE_ZKTECO_PASSWORD=
```

⚠️ **Important:** Set the `VITE_ZKTECO_PASSWORD` to your device admin password!

### Step 3: Regenerate Supabase Types

After applying the migration, regenerate TypeScript types:

#### Option 1: Via Supabase CLI (if installed)
```bash
npx supabase gen types typescript --project-id lfknrgwaslghsubuwbjq > src/integrations/supabase/types.ts
```

#### Option 2: Manual Update
1. Go to Supabase Dashboard → API Docs
2. Copy the TypeScript types
3. Update `src/integrations/supabase/types.ts`

### Step 4: Test Device Connectivity

#### A. From Browser Console (Simple Test)
```javascript
// Test if device is reachable
fetch('http://192.168.1.168/cgi-bin/pingServer.cgi')
  .then(res => console.log('Device reachable!'))
  .catch(err => console.error('Device not reachable:', err));
```

#### B. From Network Tab
1. Open Developer Tools → Network Tab
2. Try to access: `http://192.168.1.168`
3. You should see a response (even if it's a login page)

### Step 5: Configure CORS (If Needed)

If you get CORS errors when testing:

**Option A: Use a Proxy Server (Recommended)**
Create a simple proxy in your backend or use a CORS proxy service

**Option B: Configure Device to Allow CORS**
Some ZKTeco devices allow CORS configuration in their web interface

**Option C: Use Server-Side Requests**
Make API calls from a backend/serverless function instead of browser

### Step 6: Obtain ZKTeco API Documentation

You'll need the official API documentation from ZKTeco for your device model. This should include:

- ✅ Endpoint URLs (e.g., `/cgi-bin/user.cgi`, `/cgi-bin/attendance.cgi`)
- ✅ Request/Response formats
- ✅ Authentication methods
- ✅ Error codes

**Where to get it:**
1. Check the device manual/CD that came with the device
2. Contact ZKTeco support: https://www.zkteco.com/en/support
3. Check ZKTeco developer portal (if you have access)

## Integration Architecture

```
┌──────────────────┐
│   React App      │
│   (Frontend)     │
└────────┬─────────┘
         │
         ├─────────────────┐
         │                 │
         ▼                 ▼
┌────────────────┐   ┌──────────────┐
│   Supabase     │   │   ZKTeco     │
│   (Database)   │   │   Device     │
└────────────────┘   └──────────────┘
         │                 │
         │                 │
         └────────┬────────┘
                  │
           Real-time Sync
```

## Key Features Implemented

### 1. Employee Sync
- ✅ Push employees from Supabase to ZKTeco device
- ✅ Automatic ID mapping (EMP001 → Device User ID: 1)
- ✅ Batch sync support

### 2. Attendance Sync
- ✅ Pull attendance logs from device
- ✅ Auto-create/update attendance records in Supabase
- ✅ Support for check-in/check-out detection
- ✅ Biometric verification tracking

### 3. Device Management
- ✅ Test device connectivity
- ✅ Get device information
- ✅ Authentication support
- ✅ Error handling

## Usage Examples

### Sync Employees to Device
```typescript
import { ZKTecoService } from '@/services/zktecoService';

const result = await ZKTecoService.syncEmployeesToDevice();
console.log(`Success: ${result.success}, Failed: ${result.failed}`);
console.log('Errors:', result.errors);
```

### Sync Attendance from Device
```typescript
import { ZKTecoService } from '@/services/zktecoService';

// Sync all attendance
const result = await ZKTecoService.syncAttendanceFromDevice();

// Or sync specific date range
const startDate = new Date('2025-10-01');
const endDate = new Date('2025-10-31');
const result = await ZKTecoService.syncAttendanceFromDevice(startDate, endDate);

console.log(`Synced ${result.success} records`);
```

### Test Device Connection
```typescript
import { ZKTecoService } from '@/services/zktecoService';

const isConnected = await ZKTecoService.testConnection();
if (isConnected) {
  console.log('Device is online!');
} else {
  console.log('Device is offline or unreachable');
}
```

## Troubleshooting

### Issue: TypeScript Errors in zktecoService.ts

**Cause:** Supabase types don't include `biometric_device_user_id` yet

**Solution:**
1. Apply the database migration first
2. Regenerate Supabase types (see Step 3)
3. Restart your dev server

### Issue: Device Not Reachable

**Possible Causes:**
1. Device is on a different network
2. Firewall blocking connection
3. Device is powered off

**Solutions:**
- Ping the device: `ping 192.168.1.168`
- Ensure your computer is on the same network (192.168.1.x)
- Check device power and network cable
- Try accessing device web interface: `http://192.168.1.168`

### Issue: CORS Errors

**Solution:**
- Use a backend proxy server
- Or make requests from a serverless function (Vercel Functions)
- Or enable CORS in device settings (if available)

### Issue: Authentication Failed

**Solution:**
- Verify admin password is correct
- Check if device requires different auth method
- Consult device API documentation

### Issue: Incorrect Attendance Times

**Solution:**
- Check device time zone settings
- Verify device time is synchronized
- Adjust time parsing logic if needed

## Next Steps

### For Full Integration:

1. ✅ **Apply the database migration** (Step 1)
2. ✅ **Set device password in `.env`** (Step 2)
3. ✅ **Regenerate Supabase types** (Step 3)
4. ⏳ **Create UI Components** (React hook + Dialog)
5. ⏳ **Test with actual device** (Make real API calls)
6. ⏳ **Implement fingerprint enrollment** (If supported)
7. ⏳ **Schedule auto-sync** (Cron job or interval)

### Testing Checklist:

- [ ] Database migration applied successfully
- [ ] Environment variables configured
- [ ] Device is pingable from your network
- [ ] Can access device web interface
- [ ] API documentation obtained
- [ ] Test API call succeeds
- [ ] Employee sync works
- [ ] Attendance sync works
- [ ] Error handling tested

## API Endpoints Reference

Common ZKTeco API endpoints (may vary by model):

```
GET  /cgi-bin/pingServer.cgi          - Test connectivity
POST /cgi-bin/session.cgi             - Authentication
GET  /cgi-bin/deviceInfo.cgi          - Get device info
GET  /cgi-bin/recordFinder.cgi?name=user - Get all users
POST /cgi-bin/recordWriter.cgi?name=user - Add/update user
POST /cgi-bin/recordDeleter.cgi?name=user&id=X - Delete user
GET  /cgi-bin/recordFinder.cgi?name=attendance - Get attendance logs
POST /cgi-bin/recordDeleter.cgi?name=attendance - Clear logs
```

**Note:** Actual endpoints depend on your device model and firmware version. Consult your device's API documentation.

## Security Considerations

1. **Network Security:**
   - Keep device on isolated network segment
   - Use VPN for remote access
   - Change default admin password

2. **Application Security:**
   - Never commit `.env` file to Git (already in `.gitignore`)
   - Use HTTPS if device supports it
   - Implement rate limiting on sync operations
   - Validate all data from device before DB insertion

3. **Data Privacy:**
   - Biometric data stays on device (not synced to cloud)
   - Only attendance logs and user IDs are synced
   - Follow local data protection regulations

## Support

**ZKTeco Support:**
- Website: https://www.zkteco.com
- Support: https://www.zkteco.com/en/support

**Project Issues:**
- Check `src/services/zktecoService.ts` for error logs
- Enable browser DevTools → Console for debugging
- Review Network tab for failed requests

---

**Last Updated:** 2025-10-19  
**Device Model:** ZKTeco (ADMS Mode)  
**Integration Status:** ⚠️ Setup Required
