# Quick Vercel Deployment Fix

## 🚨 Critical Actions Required

### 1. Set Root Directory in Vercel Dashboard (REQUIRED)

1. Go to https://vercel.com/dashboard
2. Select your project: `nmw-hr-latest`
3. Go to **Settings** → **General**
4. Scroll to **Root Directory**
5. Click **Edit**
6. Set to: `Attendance-System_NMW-main`
7. Click **Save**

### 2. Set Environment Variables (REQUIRED)

1. Go to **Settings** → **Environment Variables**
2. Add these variables:

**Required:**
- `VITE_SUPABASE_URL` = `https://lfknrgwaslghsubuwbjq.supabase.co`
- `VITE_SUPABASE_PUBLISHABLE_KEY` = (get from Supabase dashboard)

**Optional:**
- `VITE_ZKTECO_DEVICE_IP` = `192.168.1.168`
- `VITE_ZKTECO_DEVICE_PORT` = `80`
- `VITE_ZKTECO_USERNAME` = `admin`
- `VITE_GEMINI_API_KEY` = (if using AI features)

3. Set for: **Production**, **Preview**, and **Development**
4. Click **Save**

### 3. Get Supabase Keys

1. Go to https://app.supabase.com
2. Select project: `lfknrgwaslghsubuwbjq`
3. Go to **Settings** → **API**
4. Copy **Project URL** → `VITE_SUPABASE_URL`
5. Copy **anon/public key** → `VITE_SUPABASE_PUBLISHABLE_KEY`

### 4. Redeploy

1. Go to **Deployments** tab
2. Click **⋯** on latest deployment
3. Click **Redeploy**
4. Uncheck **Use existing Build Cache**
5. Click **Redeploy**

---

## ✅ What Was Fixed

1. ✅ Removed `--force` flag from `installCommand`
2. ✅ Created root `vercel.json` with rootDirectory setting
3. ✅ Updated `.gitignore` to exclude temporary files
4. ✅ Created deployment documentation

---

## 🔍 Verify Deployment

After deployment, check:
- [ ] Build logs show success
- [ ] Application loads (not blank page)
- [ ] No console errors about environment variables
- [ ] Can log in successfully
- [ ] Supabase connection works

---

## 📚 Full Documentation

See `VERCEL_DEPLOYMENT_FIX.md` for detailed guide.

---

**Quick Fix Status**: ✅ Code fixes applied. Configuration needed in Vercel Dashboard.

