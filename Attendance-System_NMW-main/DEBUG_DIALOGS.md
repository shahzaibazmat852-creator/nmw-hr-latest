# Dialog Debugging Guide

## Issue: Dialogs showing dark screen but not opening

### Possible Causes:
1. Z-index conflicts
2. Content not rendering
3. Animation issues
4. State management issues

## Current Status

### Z-Index Fix Applied:
- **Dialog Overlay**: `z-[9999]`
- **Dialog Content**: `z-[10000]`

### Test Steps:

1. **Check Console**
   - Open browser DevTools (F12)
   - Look for errors in Console tab
   - Check if state variables are updating

2. **Check Network Tab**
   - Verify no failed requests
   - Check if data is loading

3. **Check React DevTools**
   - Install React DevTools extension
   - Check component state

4. **Test Manually:**
   ```
   1. Open browser console
   2. Type: document.querySelector('[role="dialog"]')
   3. Press Enter
   4. This should show the dialog element if it exists
   ```

## Quick Fix to Test:

Add this to browser console to manually open dialog:
```javascript
// Force open dialog
window.dispatchEvent(new CustomEvent('open-dialog'));
```

## Alternative: Direct Test

Try clicking the buttons and check:
1. Does the screen darken?
2. Do you see any content at all?
3. Are the buttons responding?

If screen darkens but no content shows:
- Content might be rendering but invisible
- Check for `display: none` on dialog content
- Check for `opacity: 0` or `visibility: hidden`

If buttons don't respond:
- Check if event handlers are attached
- Check for JavaScript errors
- Check if state is updating

