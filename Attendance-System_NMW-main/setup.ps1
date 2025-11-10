# NMW Attendance System - Environment Setup Script
# This script helps you set up the required environment variables

Write-Host "🚀 NMW Attendance System - Environment Setup" -ForegroundColor Cyan
Write-Host ""

# Check if .env file exists
if (Test-Path .env) {
    Write-Host "✅ .env file found!" -ForegroundColor Green
    Write-Host ""
    
    # Check if credentials are set
    $envContent = Get-Content .env
    if ($envContent -match "YOUR_ANON_KEY_HERE") {
        Write-Host "⚠️  WARNING: You need to set your Supabase credentials!" -ForegroundColor Yellow
        Write-Host ""
        Write-Host "Please edit the .env file and replace 'YOUR_ANON_KEY_HERE' with your actual Supabase anon key." -ForegroundColor Yellow
        Write-Host ""
        Write-Host "To get your credentials:" -ForegroundColor Cyan
        Write-Host "1. Go to https://app.supabase.com" -ForegroundColor White
        Write-Host "2. Select your project (lfknrgwaslghsubuwbjq)" -ForegroundColor White
        Write-Host "3. Go to Settings > API" -ForegroundColor White
        Write-Host "4. Copy the 'anon/public' key" -ForegroundColor White
        Write-Host "5. Update your .env file" -ForegroundColor White
        Write-Host ""
        exit 1
    } else {
        Write-Host "✅ Environment variables appear to be configured!" -ForegroundColor Green
        Write-Host ""
        Write-Host "Starting development server..." -ForegroundColor Cyan
        Write-Host ""
        Write-Host "Press Ctrl+C to stop the server" -ForegroundColor Yellow
        Write-Host ""
        npm run dev
    }
} else {
    Write-Host "❌ .env file not found!" -ForegroundColor Red
    Write-Host ""
    Write-Host "Creating .env file with template..." -ForegroundColor Yellow
    
    @"
# Supabase Configuration
VITE_SUPABASE_URL=https://lfknrgwaslghsubuwbjq.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=YOUR_ANON_KEY_HERE

# ZKTeco Biometric Device Configuration
VITE_ZKTECO_DEVICE_IP=192.168.1.168
VITE_ZKTECO_DEVICE_PORT=80
VITE_ZKTECO_TCP_PORT=4370
VITE_ZKTECO_USERNAME=admin
VITE_ZKTECO_PASSWORD=
"@ | Out-File -FilePath .env -Encoding utf8
    
    Write-Host "✅ Created .env file!" -ForegroundColor Green
    Write-Host ""
    Write-Host "⚠️  IMPORTANT: You need to configure your Supabase credentials!" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "1. Edit the .env file and replace 'YOUR_ANON_KEY_HERE' with your actual key" -ForegroundColor White
    Write-Host "2. Then run this script again or start with: npm run dev" -ForegroundColor White
    Write-Host ""
    Write-Host "See ENV_SETUP_INSTRUCTIONS.md for detailed instructions" -ForegroundColor Cyan
    Write-Host ""
    exit 0
}

