# Vercel Deployment Fix & Configuration Guide

## 🚨 Critical Issues Found and Fixed

### Issue 1: Project Structure (CRITICAL)
**Problem**: Project files are in `Attendance-System_NMW-main/` subdirectory, but Vercel expects them at root by default.

**Solution**: Configure Vercel to use the subdirectory as the root directory.

### Issue 2: Install Command (FIXED)
**Problem**: `vercel.json` had `npm ci --force` which can cause dependency conflicts.

**Solution**: Changed to `npm ci` (removed `--force` flag).

### Issue 3: Environment Variables (REQUIRED)
**Problem**: Application requires environment variables that must be set in Vercel dashboard.

**Solution**: Set all required environment variables in Vercel project settings.

---

## ✅ Step-by-Step Deployment Fix

### Step 1: Configure Root Directory in Vercel

1. **Go to Vercel Dashboard**:
   - Visit https://vercel.com/dashboard
   - Select your project: `nmw-hr-latest`

2. **Configure Root Directory**:
   - Go to **Settings** → **General**
   - Scroll to **Root Directory**
   - Click **Edit**
   - Set Root Directory to: `Attendance-System_NMW-main`
   - Click **Save**

   ⚠️ **IMPORTANT**: This tells Vercel to treat `Attendance-System_NMW-main/` as the project root.

### Step 2: Set Environment Variables

1. **Go to Project Settings**:
   - Navigate to **Settings** → **Environment Variables**

2. **Add Required Variables**:

   #### Required (Application won't work without these):
   ```env
   VITE_SUPABASE_URL=https://lfknrgwaslghsubuwbjq.supabase.co
   VITE_SUPABASE_PUBLISHABLE_KEY=your_anon_key_here
   ```

   #### Optional (For ZKTeco Integration):
   ```env
   VITE_ZKTECO_DEVICE_IP=192.168.1.168
   VITE_ZKTECO_DEVICE_PORT=80
   VITE_ZKTECO_TCP_PORT=4370
   VITE_ZKTECO_USERNAME=admin
   VITE_ZKTECO_PASSWORD=your_device_password
   ```

   #### Optional (For AI Features):
   ```env
   VITE_GEMINI_API_KEY=your_gemini_api_key
   ```

3. **Set for All Environments**:
   - Select **Production**, **Preview**, and **Development**
   - Click **Save** for each variable

4. **Get Your Supabase Keys**:
   - Go to https://app.supabase.com
   - Select project: `lfknrgwaslghsubuwbjq`
   - Go to **Settings** → **API**
   - Copy **Project URL** → `VITE_SUPABASE_URL`
   - Copy **anon/public key** → `VITE_SUPABASE_PUBLISHABLE_KEY`

### Step 3: Verify Build Configuration

1. **Check Build Settings**:
   - Go to **Settings** → **General** → **Build & Development Settings**
   - Verify:
     - **Framework Preset**: Vite
     - **Root Directory**: `Attendance-System_NMW-main`
     - **Build Command**: `npm run build` (should auto-detect)
     - **Output Directory**: `dist` (should auto-detect)
     - **Install Command**: `npm ci` (should auto-detect)

2. **Verify vercel.json**:
   - The `vercel.json` in `Attendance-System_NMW-main/` should have:
     - `installCommand: "npm ci"` (without `--force`)
     - `buildCommand: "npm run build"`
     - `outputDirectory: "dist"`

### Step 4: Trigger New Deployment

1. **Option A: Push Empty Commit** (Recommended):
   ```bash
   git commit --allow-empty -m "Fix Vercel deployment configuration"
   git push origin main
   ```

2. **Option B: Manual Redeploy**:
   - Go to **Deployments** tab in Vercel
   - Find the latest deployment
   - Click **⋯** (three dots) → **Redeploy**
   - Select **Use existing Build Cache: No**
   - Click **Redeploy**

### Step 5: Verify Deployment

1. **Check Build Logs**:
   - Go to **Deployments** → Latest deployment
   - Click on the deployment
   - Check **Build Logs** for errors
   - Verify build completed successfully

2. **Test the Application**:
   - Open the deployment URL
   - Check browser console (F12) for errors
   - Verify Supabase connection works
   - Test login functionality

---

## 🔍 Common Issues & Solutions

### Issue: "Missing Supabase environment variables"

**Cause**: Environment variables not set in Vercel.

**Solution**:
1. Go to Vercel → Settings → Environment Variables
2. Add `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY`
3. Redeploy the application

### Issue: "Build failed: Cannot find module"

**Cause**: Root Directory not configured correctly.

**Solution**:
1. Go to Vercel → Settings → General
2. Set Root Directory to `Attendance-System_NMW-main`
3. Redeploy

### Issue: "Build failed: npm ci error"

**Cause**: Package lock file conflicts or missing dependencies.

**Solution**:
1. Verify `package-lock.json` exists in `Attendance-System_NMW-main/`
2. Check that `vercel.json` has `installCommand: "npm ci"` (not `--force`)
3. Clear build cache and redeploy

### Issue: "Application shows blank page"

**Cause**: Environment variables missing or incorrect.

**Solution**:
1. Check browser console for errors
2. Verify all `VITE_*` environment variables are set in Vercel
3. Verify Supabase URL and key are correct
4. Check Supabase project is active

### Issue: "Changes not reflecting after deployment"

**Cause**: Browser or CDN cache.

**Solution**:
1. Hard refresh: `Ctrl + Shift + R` (Windows) or `Cmd + Shift + R` (Mac)
2. Clear browser cache
3. Use incognito/private window
4. Clear Vercel build cache and redeploy

---

## 📋 Pre-Deployment Checklist

Before deploying to Vercel, ensure:

- [ ] Root Directory is set to `Attendance-System_NMW-main` in Vercel settings
- [ ] `VITE_SUPABASE_URL` is set in Environment Variables
- [ ] `VITE_SUPABASE_PUBLISHABLE_KEY` is set in Environment Variables
- [ ] `vercel.json` has `installCommand: "npm ci"` (no `--force`)
- [ ] `package.json` has correct `build` script: `"build": "vite build"`
- [ ] `package-lock.json` exists and is up to date
- [ ] All code is committed and pushed to GitHub
- [ ] Vercel project is connected to the correct GitHub repository
- [ ] Branch is set to `main` in Vercel settings

---

## 🔧 Alternative Solution: Move Files to Root

If you prefer to have files at the repository root (instead of using Root Directory setting):

1. **Move all files from subdirectory to root**:
   ```bash
   # Move all files from Attendance-System_NMW-main/ to root
   # (This is a manual process - be careful with .gitignore)
   ```

2. **Update vercel.json**:
   - Remove the `cd Attendance-System_NMW-main &&` prefixes
   - Update `outputDirectory` to `dist`

3. **Update .gitignore**:
   - Ensure it's at the root level

**⚠️ Note**: This approach requires more changes and is more disruptive. The Root Directory setting is recommended.

---

## 📊 Verification Commands

### Check Build Locally:
```bash
cd Attendance-System_NMW-main
npm ci
npm run build
```

### Verify Environment Variables:
```bash
# In Vercel Dashboard
# Settings → Environment Variables
# Verify all VITE_* variables are set
```

### Check Deployment Status:
```bash
# In Vercel Dashboard
# Deployments → Latest deployment
# Check Build Logs for errors
```

---

## 🎯 Expected Results After Fix

1. **Build Success**: Deployment should complete without errors
2. **Application Loads**: App should load without blank page
3. **Supabase Connection**: Should connect to Supabase successfully
4. **No Console Errors**: Browser console should show no environment variable errors
5. **Login Works**: User should be able to log in

---

## 📞 Support

If issues persist:

1. **Check Vercel Build Logs**: Look for specific error messages
2. **Check Browser Console**: Look for runtime errors
3. **Verify Environment Variables**: Ensure all are set correctly
4. **Check Supabase Status**: Verify Supabase project is active
5. **Contact Support**: Vercel support or check Vercel status page

---

## 📝 Summary of Fixes Applied

1. ✅ Fixed `vercel.json` - Removed `--force` from `installCommand`
2. ✅ Created root-level `vercel.json` for subdirectory support (alternative approach)
3. ✅ Created comprehensive deployment guide
4. ✅ Documented all required environment variables
5. ✅ Documented Root Directory configuration

---

**Last Updated**: 2024-12-19  
**Version**: 1.0.0

