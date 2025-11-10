# ZKTeco Device Integration - Troubleshooting Guide

## Current Status
You are currently not on the same LAN as the ZKTeco device, which is why connection attempts are failing.

## When You Return to the LAN

### Step 1: Verify Device IP Address
1. Check the device's physical display or configuration menu for its IP address
2. Look for a network settings or status screen on the device
3. Check your router's admin interface for connected devices
4. Common default IPs for ZKTeco devices:
   - 192.168.1.139
   - 192.168.1.168
   - 192.168.1.201

### Step 2: Update Environment Configuration
Edit your `.env` file with the correct device information:

```env
# ZKTeco Biometric Device Configuration
VITE_ZKTECO_DEVICE_IP=192.168.1.XXX  # Replace with actual device IP
VITE_ZKTECO_DEVICE_PORT=80
VITE_ZKTECO_TCP_PORT=4370
VITE_ZKTECO_USERNAME=admin
VITE_ZKTECO_PASSWORD=your_actual_password_here
```

### Step 3: Network Connectivity Tests

#### Test 1: Ping the Device
Open a command prompt/terminal and run:
```bash
ping 192.168.1.XXX  # Replace with actual device IP
```

Expected result: You should receive replies from the device.

#### Test 2: HTTP Access
Try accessing the device's web interface in your browser:
```
http://192.168.1.XXX
```

Expected result: You should see a login page for the device.

### Step 4: Test Integration from the App
1. Start the development server:
   ```bash
   npm run dev
   ```
2. Navigate to the ZKTeco Sync dialog in the application
3. Click "Test Device Connection"

### Step 5: Common Issues and Solutions

#### Issue: Device Not Responding to Ping
- Check that the device is powered on
- Verify network cables are connected
- Ensure your computer and device are on the same network subnet
- Check if a firewall is blocking the connection

#### Issue: Authentication Failed
- Verify the username and password are correct
- Check if the device requires a specific authentication method
- Some devices use default credentials like:
  - Username: admin, Password: (blank)
  - Username: admin, Password: admin
  - Username: admin, Password: 1234

#### Issue: CORS Errors
- The device may not support CORS for browser requests
- Solution: Use a backend proxy or server-side requests

#### Issue: Incorrect IP Address
- Double-check the device's actual IP address
- Devices may have DHCP enabled and get a different IP each time
- Consider setting a static IP for the device

### Step 6: Advanced Diagnostics

#### Network Scan
To find the device on your network, you can use:
```bash
# On Windows
arp -a

# On macOS/Linux
arp -a | grep 192.168.1
```

#### Port Check
Verify the device is listening on the expected ports:
```bash
# Check if port 80 is open
telnet 192.168.1.XXX 80

# Check if port 4370 is open (TCP communication)
telnet 192.168.1.XXX 4370
```

### Step 7: Device Configuration
Ensure the device is configured for HTTP communication:
1. Set the device to ADMS mode
2. Enable HTTP/HTTPS web server
3. Disable HTTPS if not needed
4. Ensure the correct ports are open

## Additional Resources

### ZKTeco API Documentation
You'll need the official API documentation for your specific device model:
- Check the device manual that came with the device
- Contact ZKTeco support
- Check the ZKTeco developer portal

### Common API Endpoints
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

## Support Contacts

### ZKTeco Official Support
- Website: https://www.zkteco.com
- Support: https://www.zkteco.com/en/support

### Application Issues
- Check browser console for error messages
- Enable detailed logging in the application
- Review network tab in browser developer tools

## Security Considerations

1. Change default passwords immediately
2. Keep the device on an isolated network segment
3. Use VPN for remote access if needed
4. Regularly update device firmware
5. Monitor access logs

---
**Note**: This guide is meant to be used when you return to the same network as the ZKTeco device. Connection attempts will fail when not on the same LAN due to network routing restrictions.