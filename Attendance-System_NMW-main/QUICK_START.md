# Quick Start Guide

## 🚀 Getting the App Running

### The Problem
The app shows a blank page because it needs Supabase database credentials to connect.

### The Solution

**Option 1: Run the setup script (Recommended)**
```powershell
.\setup.ps1
```

**Option 2: Manual setup**

1. **Create a `.env` file** in the project root (if it doesn't exist)

2. **Get your Supabase credentials:**
   - Go to https://app.supabase.com
   - Select project: `lfknrgwaslghsubuwbjq`
   - Go to **Settings** → **API**
   - Copy the **Project URL** and **anon/public key**

3. **Update your `.env` file:**
   ```env
   VITE_SUPABASE_URL=https://lfknrgwaslghsubuwbjq.supabase.co
   VITE_SUPABASE_PUBLISHABLE_KEY=paste_your_anon_key_here
   ```

4. **Start the development server:**
   ```powershell
   npm run dev
   ```

5. **Open your browser:**
   - The app will be running at http://localhost:8080

## 🔍 Troubleshooting

### Still seeing blank page?
- Open browser console (F12) and check for errors
- Make sure the `.env` file is in the correct location
- Verify you've replaced `YOUR_ANON_KEY_HERE` with actual key
- Restart the dev server after updating `.env`

### Getting Supabase connection errors?
- Verify your Supabase project is active
- Check that your project URL is correct
- Make sure your anon key is valid
- Clear browser cache and cookies

### Can't find the .env file?
- Create it in: `C:\Users\fymeo\Downloads\Compressed\Attendance-System_NMW-main\Attendance-System_NMW-main\`
- Or navigate to the project folder and run: `.\setup.ps1`

## 📚 More Information

- Detailed setup instructions: `ENV_SETUP_INSTRUCTIONS.md`
- Admin guide: `ADMIN_ACCESS_GUIDE.md`
- ZKTeco integration: `ZKTECO_INTEGRATION_SETUP.md`

