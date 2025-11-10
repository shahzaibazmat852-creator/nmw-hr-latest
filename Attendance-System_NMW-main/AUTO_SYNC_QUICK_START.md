# Quick Start: Automatic Attendance Sync

## ✨ What Changed?

Attendance now syncs **automatically** from your ZKTeco device! No more manual clicking.

## 🚀 How to Enable

### Step 1: Open Device Sync Dialog
1. Go to **Attendance** page
2. Click **"Device Sync"** button (near top-right)

### Step 2: Enable Auto-Sync
1. Find the **"Automatic Sync"** section (new!)
2. Toggle the switch to **ON** (blue)
3. Select interval: **5 minutes** (recommended)

### Step 3: Verify It's Working
- You'll see **"Auto-sync enabled (every 5 minutes)"** notification
- **Last synced** time will appear and update automatically
- **Green checkmark** appears when new attendance is synced

## 📊 Visual Guide

```
┌─────────────────────────────────────────┐
│  ZKTeco Device Synchronization          │
├─────────────────────────────────────────┤
│                                         │
│  Device Status: ● Online                │
│                                         │
│  ┌───────────────────────────────────┐ │
│  │ ⏱️  Automatic Sync        [ON]   │ │
│  │                                   │ │
│  │ Check every: [5 minutes ▼]       │ │
│  │                                   │ │
│  │ ⏰ Last synced: 2:45:30 PM        │ │
│  └───────────────────────────────────┘ │
│                                         │
└─────────────────────────────────────────┘
```

## ⚙️ Settings

### Sync Intervals
- **1 minute**: Testing only (very frequent)
- **5 minutes**: ⭐ Recommended (good balance)
- **10 minutes**: Less frequent
- **15 minutes**: Moderate
- **30 minutes**: Battery-friendly

### Default: 5 minutes

## 🔔 Notifications

You'll see notifications like:
- ✅ **"Auto-sync enabled (every 5 minutes)"** - When you turn it on
- ✅ **"Auto-sync: 3 new attendance record(s) synced"** - When new attendance found
- ℹ️ **"Auto-sync disabled"** - When you turn it off

## ⚡ How It Works

```
Employee scans fingerprint
        ↓
Device stores attendance
        ↓
⏱️ Auto-sync (every 5 min)
        ↓
Appears in your app
        ↓
All devices see it instantly ✨
```

## 🎯 Benefits

### Before (Manual):
1. Employee marks attendance ✓
2. **Admin must click "Sync" button** 👈
3. Attendance appears ✓

### Now (Automatic):
1. Employee marks attendance ✓
2. **Auto-sync pulls it every 5 min** 🔄
3. Attendance appears automatically ✨

## 💡 Tips

### Keep App Open
- Auto-sync works **only while app is open**
- Just keep the browser tab open in background
- It uses very little resources

### Manual Sync Still Works
- You can still click **"Sync Attendance from Device"** anytime
- Forces immediate sync outside the schedule

### Network Required
- Must be on same LAN as device (192.168.1.x)
- Auto-sync stops if you leave the network
- Resumes automatically when back on LAN

## 🔧 Troubleshooting

### Not syncing?
1. Check toggle is **ON**
2. Verify device is **Online**
3. Ensure you're on **same network** as device

### Want to test immediately?
1. Mark attendance on device
2. Wait 5 minutes (or your interval)
3. Should appear automatically
4. Or click manual sync to see instantly

## 📝 Summary

**What you need to do:**
1. ✅ Enable auto-sync toggle
2. ✅ Select 5-minute interval
3. ✅ Keep app open during work hours
4. ✅ That's it!

**What happens automatically:**
- Device checked every 5 minutes
- New attendance pulled automatically
- UI updates in real-time
- Notifications show what was synced

---

**Enjoy automatic attendance! No more manual syncing needed! 🎉**
