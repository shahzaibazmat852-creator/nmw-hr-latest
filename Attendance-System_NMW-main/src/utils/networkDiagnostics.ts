/**
 * Network Diagnostics Utility for ZKTeco Device Integration
 * Provides tools to diagnose and troubleshoot network connectivity issues
 */

export class NetworkDiagnostics {
  /**
   * Test basic connectivity to a host
   * @param host IP address or hostname
   * @param timeout Timeout in milliseconds
   * @returns Promise resolving to true if host is reachable
   */
  static async pingHost(host: string, timeout: number = 5000): Promise<boolean> {
    try {
      // Note: Browser JavaScript cannot perform actual ICMP ping
      // This is a simplified check using fetch to a common endpoint
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);
      
      // Try to fetch a simple resource
      const response = await fetch(`http://${host}`, {
        method: 'HEAD',
        mode: 'no-cors',
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      return true;
    } catch (error) {
      console.error(`Ping failed for ${host}:`, error);
      return false;
    }
  }

  /**
   * Check if we're on the same subnet as the target device
   * @param deviceIp Device IP address
   * @param localIp Local IP address (optional, will try to detect if not provided)
   * @returns Boolean indicating if on same subnet
   */
  static isOnSameSubnet(deviceIp: string, localIp?: string): boolean {
    try {
      // If local IP not provided, we can't determine subnet in browser environment
      if (!localIp) {
        // In a browser, we can't easily get the local IP
        // Return true and let other checks determine connectivity
        return true;
      }
      
      // Extract subnet (first 3 octets) from both IPs
      const deviceSubnet = deviceIp.split('.').slice(0, 3).join('.');
      const localSubnet = localIp.split('.').slice(0, 3).join('.');
      
      return deviceSubnet === localSubnet;
    } catch (error) {
      console.error('Error checking subnet:', error);
      return true; // Assume same subnet if we can't determine
    }
  }

  /**
   * Validate IP address format
   * @param ip IP address string
   * @returns Boolean indicating if IP format is valid
   */
  static isValidIp(ip: string): boolean {
    const ipRegex = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/;
    const match = ip.match(ipRegex);
    
    if (!match) return false;
    
    // Check that each octet is between 0-255
    for (let i = 1; i <= 4; i++) {
      const octet = parseInt(match[i]);
      if (octet < 0 || octet > 255) return false;
    }
    
    return true;
  }

  /**
   * Get diagnostic information
   * @param deviceIp Configured device IP
   * @returns Diagnostic information object
   */
  static getDiagnosticInfo(deviceIp: string): {
    deviceIp: string;
    isValidIp: boolean;
    timestamp: Date;
  } {
    return {
      deviceIp,
      isValidIp: this.isValidIp(deviceIp),
      timestamp: new Date()
    };
  }

  /**
   * Perform comprehensive network diagnostics
   * @param deviceIp Device IP address
   * @returns Promise resolving to diagnostic results
   */
  static async runDiagnostics(deviceIp: string): Promise<{
    success: boolean;
    message: string;
    details: any;
  }> {
    const diagnostics = this.getDiagnosticInfo(deviceIp);
    
    // Check IP format
    if (!diagnostics.isValidIp) {
      return {
        success: false,
        message: 'Invalid IP address format',
        details: diagnostics
      };
    }
    
    // Try to reach the device
    const isReachable = await this.pingHost(deviceIp, 10000);
    
    if (!isReachable) {
      return {
        success: false,
        message: 'Device is not reachable on network. Check network connection and device power.',
        details: {
          ...diagnostics,
          reachable: false
        }
      };
    }
    
    return {
      success: true,
      message: 'Network diagnostics passed. Device appears to be reachable.',
      details: {
        ...diagnostics,
        reachable: true
      }
    };
  }
}