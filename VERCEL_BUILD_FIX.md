# Vercel Build Error Fix - "vite: command not found"

## 🔴 Error
```
sh: line 1: vite: command not found
Error: Command "vite build" exited with 127
```

## 🔍 Root Cause
Vercel is trying to run the build from the repository root, but the `package.json` and `node_modules` are in the `Attendance-System_NMW-main/` subdirectory. The `vite` command is not found because dependencies haven't been installed in the root directory.

## ✅ Solution Applied

Updated `vercel.json` to explicitly change into the subdirectory before running commands:

```json
{
  "buildCommand": "cd Attendance-System_NMW-main && npm run build",
  "outputDirectory": "Attendance-System_NMW-main/dist",
  "installCommand": "cd Attendance-System_NMW-main && npm ci",
  "devCommand": "cd Attendance-System_NMW-main && npm run dev"
}
```

## 🚀 Next Steps

1. **Commit and push the fix**:
   ```bash
   git add vercel.json
   git commit -m "Fix Vercel build: Add cd commands for subdirectory"
   git push origin main
   ```

2. **Alternative: Set Root Directory in Vercel Dashboard** (Recommended):
   - Go to Vercel Dashboard → Settings → General
   - Set **Root Directory** to: `Attendance-System_NMW-main`
   - This is cleaner than using `cd` commands in vercel.json
   - If you set this, you can simplify vercel.json back to:
     ```json
     {
       "buildCommand": "npm run build",
       "outputDirectory": "dist"
     }
     ```

3. **Set Environment Variables** (Still Required):
   - Go to Vercel Dashboard → Settings → Environment Variables
   - Add `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY`

## 🎯 Why This Works

The `cd Attendance-System_NMW-main &&` prefix ensures that:
- `npm ci` installs dependencies in the correct directory
- `npm run build` runs from the directory containing `package.json` and `vite.config.ts`
- The output is correctly placed in `Attendance-System_NMW-main/dist`

## 📝 Alternative Solutions

### Option 1: Use Root Directory Setting (Best Practice)
Set Root Directory in Vercel Dashboard to `Attendance-System_NMW-main`. This is the cleanest approach.

### Option 2: Use cd commands in vercel.json (Current Fix)
Use `cd` commands in the build configuration. This works but is less clean.

### Option 3: Move files to root (Most Disruptive)
Move all files from `Attendance-System_NMW-main/` to repository root. This requires more changes.

---

**Status**: ✅ Fix applied. Ready to commit and push.

