# Real-Time Data Synchronization Setup

## Overview
This system now supports **real-time data synchronization** across all devices without requiring manual page refreshes. When any user makes changes (adding employees, marking attendance, recording payments, etc.), all other connected devices will automatically see the updates within milliseconds.

## Technology Used
- **Supabase Realtime**: PostgreSQL Change Data Capture (CDC) with WebSocket subscriptions
- **React Query**: Automatic cache invalidation and refetching

## What's Been Implemented

### 1. Employee Management (`useEmployees.ts`)
- ✅ Real-time updates when employees are added, edited, or deleted
- ✅ Automatic refresh of employee lists across all devices
- ✅ Biometric registration status updates in real-time

### 2. Attendance Tracking (`useAttendance.ts`)
- ✅ Real-time updates for daily attendance
- ✅ Automatic sync when attendance is marked via biometric or manual entry
- ✅ Bulk attendance updates reflected instantly
- ✅ Attendance edits and deletions sync immediately

### 3. Payroll Management (`usePayroll.ts`)
- ✅ Real-time payroll generation updates
- ✅ Automatic sync for advance payments
- ✅ Instant payment recording across all devices
- ✅ Payroll status changes (pending/paid) sync immediately

### 4. Biometric System (`useBiometric.ts`)
- ✅ Real-time biometric device registration
- ✅ Automatic updates when devices are added/removed
- ✅ Instant sync of biometric authentication events

## How It Works

### Architecture
```
Database Change → Supabase Realtime → WebSocket → React Query → UI Update
     (Any Device)        (CDC)        (Live)     (Cache Refresh)  (All Devices)
```

### Implementation Details

1. **WebSocket Channels**: Each hook subscribes to specific database table changes
2. **Event Filtering**: Listens to INSERT, UPDATE, and DELETE events (`event: '*'`)
3. **Cache Invalidation**: When changes occur, React Query cache is invalidated
4. **Automatic Refetch**: React Query automatically refetches fresh data
5. **Cleanup**: Subscriptions are properly cleaned up when components unmount

### Example Code Pattern
```typescript
useEffect(() => {
  const channel = supabase
    .channel('table-changes')
    .on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'employees'
    }, () => {
      queryClient.invalidateQueries({ queryKey: ["employees"] });
    })
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}, [queryClient]);
```

## Supabase Setup Required

### Step 1: Enable Realtime in Supabase Dashboard

1. Go to your Supabase project: https://app.supabase.com/project/txznqdgyoctxzbeeulnc
2. Navigate to **Database** → **Replication**
3. Enable Realtime for the following tables:
   - ✅ `employees`
   - ✅ `attendance`
   - ✅ `payroll`
   - ✅ `advances`
   - ✅ `payments`
   - ✅ `biometric_devices`

### Step 2: Enable Realtime via SQL (Alternative)

Run this SQL in your Supabase SQL Editor if you prefer:

```sql
-- Enable realtime for all relevant tables
ALTER PUBLICATION supabase_realtime ADD TABLE employees;
ALTER PUBLICATION supabase_realtime ADD TABLE attendance;
ALTER PUBLICATION supabase_realtime ADD TABLE payroll;
ALTER PUBLICATION supabase_realtime ADD TABLE advances;
ALTER PUBLICATION supabase_realtime ADD TABLE payments;
ALTER PUBLICATION supabase_realtime ADD TABLE biometric_devices;
```

### Step 3: Verify Realtime is Working

1. Open your app on two different devices/browsers
2. Make a change on one device (e.g., add an employee)
3. Watch the other device update automatically within 1-2 seconds
4. No refresh button needed! 🎉

## Performance Considerations

### Bandwidth
- WebSocket connections are lightweight (~1-5 KB overhead)
- Only change notifications are sent, not full data
- Data is fetched on-demand after invalidation

### Database Load
- Minimal impact - uses PostgreSQL's native CDC
- No polling - events are pushed only when changes occur
- Supabase handles connection pooling automatically

### Browser Compatibility
- Works on all modern browsers (Chrome, Firefox, Safari, Edge)
- Mobile browsers fully supported
- Graceful degradation if WebSocket is blocked

## Troubleshooting

### Real-time not working?

1. **Check Realtime is enabled**: Verify tables are published in Supabase Dashboard
2. **Check browser console**: Look for WebSocket connection errors
3. **Check network**: Ensure WebSocket connections aren't blocked by firewall
4. **Verify environment variables**: Ensure `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` are correct

### Debugging Commands

```javascript
// Check if realtime is connected (run in browser console)
supabase.getChannels() // Should show active channels

// Check network tab
// Look for WebSocket connections to realtime.supabase.co
```

### Common Issues

| Issue | Solution |
|-------|----------|
| Updates delayed | Check internet connection speed |
| Not syncing at all | Enable Realtime in Supabase Dashboard |
| Multiple updates firing | Normal - React Query deduplicates requests |
| WebSocket errors | Check firewall/proxy settings |

## Testing Realtime Sync

### Test Scenario 1: Employee Management
1. Device A: Open Employees page
2. Device B: Open Employees page
3. Device A: Add new employee
4. Device B: Should see new employee appear automatically

### Test Scenario 2: Attendance Marking
1. Device A: Open Attendance page for today
2. Device B: Open Attendance page for today
3. Device A: Mark attendance for an employee
4. Device B: Should see attendance status update instantly

### Test Scenario 3: Payroll Updates
1. Device A: Open Payroll page
2. Device B: Open Payroll page
3. Device A: Record a payment
4. Device B: Should see payment appear and balance update

## Benefits

✅ **No Manual Refresh**: Users never need to click refresh buttons  
✅ **Always Up-to-Date**: Data is synchronized across all devices instantly  
✅ **Better UX**: Feels like a real-time collaborative application  
✅ **Multi-Device Support**: Perfect for offices with multiple terminals  
✅ **Mobile Friendly**: Works seamlessly on mobile devices  
✅ **Conflict-Free**: Supabase ensures data consistency  

## Limitations

- Requires active internet connection
- Realtime events may have 100-500ms latency (acceptable for most use cases)
- Free tier: 500MB of bandwidth/month (sufficient for small-medium deployments)
- Pro tier: Unlimited realtime bandwidth

## Future Enhancements

Potential improvements for even better real-time experience:

1. **Optimistic Updates**: Update UI immediately before server confirmation
2. **Presence Indicators**: Show which users are currently active
3. **Typing Indicators**: Show when someone is editing a record
4. **Conflict Resolution**: Advanced merge strategies for simultaneous edits
5. **Offline Support**: Queue changes when offline, sync when back online

## Resources

- [Supabase Realtime Docs](https://supabase.com/docs/guides/realtime)
- [React Query Invalidation](https://tanstack.com/query/latest/docs/react/guides/query-invalidation)
- [WebSocket Protocol](https://developer.mozilla.org/en-US/docs/Web/API/WebSockets_API)

---

**Last Updated**: 2025-10-19  
**System Version**: 2.0 with Real-time Sync
