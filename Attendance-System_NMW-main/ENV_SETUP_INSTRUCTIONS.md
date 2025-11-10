# Environment Setup Instructions

## ⚠️ Missing Environment Variables

The app is not showing anything because the required Supabase environment variables are not configured.

## Quick Fix

1. **Create a `.env` file** in the project root (same directory as `package.json`)

2. **Add the following content:**

```env
# Supabase Configuration
VITE_SUPABASE_URL=https://lfknrgwaslghsubuwbjq.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=YOUR_ANON_KEY_HERE

# ZKTeco Biometric Device Configuration (Optional)
VITE_ZKTECO_DEVICE_IP=192.168.1.168
VITE_ZKTECO_DEVICE_PORT=80
VITE_ZKTECO_TCP_PORT=4370
VITE_ZKTECO_USERNAME=admin
VITE_ZKTECO_PASSWORD=
```

## Getting Your Supabase Keys

### Step 1: Login to Supabase
1. Go to https://app.supabase.com
2. Select your project (lfknrgwaslghsubuwbjq)

### Step 2: Get Your Credentials
1. Click on **Settings** (gear icon in sidebar)
2. Click on **API** in the left menu
3. Find the following:
   - **Project URL**: Copy this as `VITE_SUPABASE_URL`
   - **anon/public key**: Copy this as `VITE_SUPABASE_PUBLISHABLE_KEY`

### Step 3: Update Your .env File
Replace `YOUR_ANON_KEY_HERE` with the actual anon key from Supabase.

## Example .env File

```env
VITE_SUPABASE_URL=https://lfknrgwaslghsubuwbjq.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imxma25yZ3dhc2xnaHN1YnV3YmpxIiwicm9sZSI6ImFub24iLCJpYXQiOjE2ODk2MzI5ODIsImV4cCI6MjAwNTIxMDk4Mn0.YOUR_ACTUAL_KEY_HERE
```

## After Creating .env File

1. **Restart the development server**
   - Stop the current server (Ctrl+C)
   - Run `npm run dev` again

2. **Clear browser cache and reload**
   - The app should now work properly

## Troubleshooting

### Still seeing blank page?
- Check browser console (F12) for errors
- Make sure the `.env` file is in the correct location
- Verify the Supabase URL and key are correct
- Restart the dev server after creating `.env`

### Getting "Missing Supabase environment variables" error?
- Ensure the `.env` file exists
- Check that variable names start with `VITE_`
- Restart the development server

### Supabase connection errors?
- Verify your Supabase project is active
- Check that your project URL is correct
- Make sure your anon key is valid
