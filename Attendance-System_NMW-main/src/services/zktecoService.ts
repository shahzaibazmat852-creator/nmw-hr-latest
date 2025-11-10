/**
 * ZKTeco Device Integration Service
 * Handles communication with ZKTeco biometric devices via HTTP API
 * 
 * Device Configuration:
 * - IP: 192.168.1.139
 * - Port: 80
 * - TCP COMM Port: 4370
 * - Server Mode: ADMS
 */

import { supabase } from "@/integrations/supabase/client";
import { formatLocalDate, formatLocalTime } from "@/lib/utils";
import { NetworkDiagnostics } from "@/utils/networkDiagnostics";

// ZKTeco device configuration from environment variables
const ZKTECO_DEVICE_IP = import.meta.env.VITE_ZKTECO_DEVICE_IP || '192.168.1.139';
const ZKTECO_DEVICE_PORT = import.meta.env.VITE_ZKTECO_DEVICE_PORT || '80';
const ZKTECO_USERNAME = import.meta.env.VITE_ZKTECO_USERNAME || 'admin';
const ZKTECO_PASSWORD = import.meta.env.VITE_ZKTECO_PASSWORD || '';

const DEVICE_BASE_URL = `http://${ZKTECO_DEVICE_IP}:${ZKTECO_DEVICE_PORT}`;

// Types for ZKTeco API
export interface ZKTecoUser {
  id: number;
  name: string;
  password?: string;
  privilege: number; // 0: normal user, 14: admin
  card?: string;
  group?: number;
}

export interface ZKTecoAttendanceLog {
  user_id: number;
  timestamp: string;
  status: number; // 0: check-in, 1: check-out, 2: break-out, 3: break-in
  verify_mode: number; // 1: fingerprint, 2: password, 3: card
  work_code?: string;
}

export interface ZKTecoDeviceInfo {
  device_name: string;
  serial_number: string;
  firmware_version: string;
  user_count: number;
  log_count: number;
  face_count: number;
  fingerprint_count: number;
}

export class ZKTecoService {
  private static sessionId: string | null = null;

  /**
   * Test device connectivity
   */
  static async testConnection(): Promise<boolean> {
    try {
      console.log(`Testing connection to ZKTeco device at ${DEVICE_BASE_URL}`);
      
      // First, validate the IP address
      if (!NetworkDiagnostics.isValidIp(ZKTECO_DEVICE_IP)) {
        console.error('Invalid device IP address:', ZKTECO_DEVICE_IP);
        return false;
      }
      
      // Test with a simple fetch request with timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout
      
      const response = await fetch(`${DEVICE_BASE_URL}/cgi-bin/pingServer.cgi`, {
        method: 'GET',
        mode: 'no-cors',
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      console.log('Device connection test response:', response);
      return true;
    } catch (error: any) {
      console.error('Device connection failed:', error);
      
      // Provide more specific error messages
      if (error.name === 'AbortError') {
        console.error('Connection timeout - device may be offline or unreachable');
      } else if (error instanceof TypeError) {
        console.error('Network error - check if device IP is correct and device is on same network');
      }
      
      return false;
    }
  }

  /**
   * Authenticate with the device
   */
  static async authenticate(): Promise<boolean> {
    try {
      console.log(`Authenticating with ZKTeco device at ${DEVICE_BASE_URL}`);
      
      // Try basic authentication approach
      const credentials = btoa(`${ZKTECO_USERNAME}:${ZKTECO_PASSWORD}`);
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
      
      const response = await fetch(`${DEVICE_BASE_URL}/cgi-bin/session.cgi`, {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${credentials}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        signal: controller.signal
      });

      clearTimeout(timeoutId);
      
      if (response.ok) {
        const data = await response.text();
        console.log('Authentication response:', data);
        // Extract session ID if provided
        const sessionMatch = data.match(/session_id=([^&\s]+)/);
        if (sessionMatch) {
          this.sessionId = sessionMatch[1];
          console.log('Session ID obtained:', this.sessionId);
        }
        return true;
      } else {
        console.error('Authentication failed with status:', response.status);
        console.error('Response text:', await response.text());
        return false;
      }
    } catch (error: any) {
      console.error('Authentication failed:', error);
      
      // Provide more specific error messages
      if (error.name === 'AbortError') {
        console.error('Authentication timeout - device may be busy or unresponsive');
      } else if (error instanceof TypeError) {
        console.error('Network error during authentication - check device connectivity');
      }
      
      return false;
    }
  }

  /**
   * Get device information
   */
  static async getDeviceInfo(): Promise<ZKTecoDeviceInfo | null> {
    try {
      console.log(`Getting device info from ZKTeco device at ${DEVICE_BASE_URL}`);
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
      
      const response = await fetch(`${DEVICE_BASE_URL}/cgi-bin/deviceInfo.cgi`, {
        method: 'GET',
        headers: this.getHeaders(),
        signal: controller.signal
      });

      clearTimeout(timeoutId);
      
      if (response.ok) {
        const data = await response.json();
        console.log('Device info retrieved:', data);
        return data;
      } else {
        console.error('Failed to get device info with status:', response.status);
        console.error('Response text:', await response.text());
        return null;
      }
    } catch (error) {
      console.error('Failed to get device info:', error);
      
      // Provide more specific error messages
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          console.error('Device info request timeout - device may be busy or unresponsive');
        } else if (error instanceof TypeError) {
          console.error('Network error getting device info - check device connectivity');
        }
      }
      
      return null;
    }
  }

  /**
   * Get all users from device
   */
  static async getUsers(): Promise<ZKTecoUser[]> {
    try {
      const response = await fetch(`${DEVICE_BASE_URL}/cgi-bin/recordFinder.cgi?name=user`, {
        method: 'GET',
        headers: this.getHeaders(),
      });

      if (response.ok) {
        const data = await response.text();
        return this.parseUserData(data);
      }
      return [];
    } catch (error) {
      console.error('Failed to get users:', error);
      return [];
    }
  }

  /**
   * Add or update user on device
   */
  static async setUser(user: ZKTecoUser): Promise<boolean> {
    try {
      const params = new URLSearchParams({
        id: user.id.toString(),
        name: user.name,
        privilege: user.privilege.toString(),
        ...(user.password && { password: user.password }),
        ...(user.card && { card: user.card }),
        ...(user.group && { group: user.group.toString() }),
      });

      const response = await fetch(`${DEVICE_BASE_URL}/cgi-bin/recordWriter.cgi?name=user`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: params,
      });

      return response.ok;
    } catch (error) {
      console.error('Failed to set user:', error);
      return false;
    }
  }

  /**
   * Delete user from device
   */
  static async deleteUser(userId: number): Promise<boolean> {
    try {
      const response = await fetch(`${DEVICE_BASE_URL}/cgi-bin/recordDeleter.cgi?name=user&id=${userId}`, {
        method: 'POST',
        headers: this.getHeaders(),
      });

      return response.ok;
    } catch (error) {
      console.error('Failed to delete user:', error);
      return false;
    }
  }

  /**
   * Get attendance logs from device
   */
  static async getAttendanceLogs(startDate?: Date, endDate?: Date): Promise<ZKTecoAttendanceLog[]> {
    try {
      let url = `${DEVICE_BASE_URL}/cgi-bin/recordFinder.cgi?name=attendance`;
      
      if (startDate) {
        url += `&start=${this.formatDate(startDate)}`;
      }
      if (endDate) {
        url += `&end=${this.formatDate(endDate)}`;
      }

      const response = await fetch(url, {
        method: 'GET',
        headers: this.getHeaders(),
      });

      if (response.ok) {
        const data = await response.text();
        return this.parseAttendanceData(data);
      }
      return [];
    } catch (error) {
      console.error('Failed to get attendance logs:', error);
      return [];
    }
  }

  /**
   * Clear all attendance logs from device
   */
  static async clearAttendanceLogs(): Promise<boolean> {
    try {
      const response = await fetch(`${DEVICE_BASE_URL}/cgi-bin/recordDeleter.cgi?name=attendance`, {
        method: 'POST',
        headers: this.getHeaders(),
      });

      return response.ok;
    } catch (error) {
      console.error('Failed to clear attendance logs:', error);
      return false;
    }
  }

  /**
   * Sync employees from Supabase to ZKTeco device
   */
  static async syncEmployeesToDevice(): Promise<{ success: number; failed: number; errors: string[] }> {
    const result = { success: 0, failed: 0, errors: [] as string[] };

    try {
      // Get all active employees from Supabase
      // Type assertion needed until Supabase types are regenerated
      const { data: employees, error } = await supabase
        .from('employees')
        .select('id, employee_id, name, biometric_device_user_id')
        .eq('is_active', true) as any;

      if (error) throw error;

      if (!employees || employees.length === 0) {
        result.errors.push('No employees found in database');
        return result;
      }

      // Sync each employee to device
      for (const employee of employees) {
        if (!employee.biometric_device_user_id) {
          result.errors.push(`Employee ${employee.employee_id} has no biometric_device_user_id`);
          result.failed++;
          continue;
        }

        const zkUser: ZKTecoUser = {
          id: employee.biometric_device_user_id,
          name: employee.name,
          privilege: 0, // Normal user
        };

        const success = await this.setUser(zkUser);
        if (success) {
          result.success++;
        } else {
          result.failed++;
          result.errors.push(`Failed to sync ${employee.name} (${employee.employee_id})`);
        }
      }

      return result;
    } catch (error: any) {
      result.errors.push(error.message || 'Unknown error during sync');
      return result;
    }
  }

  /**
   * Sync attendance logs from device to Supabase
   */
  static async syncAttendanceFromDevice(startDate?: Date, endDate?: Date): Promise<{ 
    success: number; 
    failed: number; 
    errors: string[] 
  }> {
    const result = { success: 0, failed: 0, errors: [] as string[] };

    try {
      // Get attendance logs from device
      const logs = await this.getAttendanceLogs(startDate, endDate);

      if (logs.length === 0) {
        result.errors.push('No attendance logs found on device');
        return result;
      }

      // Process each log
      for (const log of logs) {
        try {
          // Find employee by biometric_device_user_id
          // @ts-ignore - biometric_device_user_id exists after migration, types will be regenerated
          const { data: employee, error: empError } = await supabase
            .from('employees')
            .select('id, employee_id, name')
            .eq('biometric_device_user_id', log.user_id)
            .single();

          if (empError || !employee) {
            result.errors.push(`No employee found for device user ID ${log.user_id}`);
            result.failed++;
            continue;
          }

          // Parse timestamp without timezone conversion to avoid date shifting
          const timestampDate = new Date(log.timestamp);
          const attendanceDate = formatLocalDate(timestampDate);
          const attendanceTime = formatLocalTime(timestampDate);

          // Check if attendance already exists
          const { data: existing } = await supabase
            .from('attendance')
            .select('id, check_in_time, check_out_time')
            .eq('employee_id', employee.id)
            .eq('attendance_date', attendanceDate)
            .single();

          const isCheckIn = log.status === 0;
          const isCheckOut = log.status === 1;

          if (existing) {
            // Update existing record
            const updates: any = {};
            
            if (isCheckIn && !existing.check_in_time) {
              updates.check_in_time = attendanceTime;
            }
            if (isCheckOut && !existing.check_out_time) {
              updates.check_out_time = attendanceTime;
            }

            if (Object.keys(updates).length > 0) {
              const { error: updateError } = await supabase
                .from('attendance')
                .update(updates)
                .eq('id', existing.id);

              if (updateError) {
                result.errors.push(`Failed to update attendance for ${employee.name}: ${updateError.message}`);
                result.failed++;
              } else {
                result.success++;
              }
            }
          } else {
            // Create new attendance record
            const { error: insertError } = await supabase
              .from('attendance')
              .insert({
                employee_id: employee.id,
                attendance_date: attendanceDate,
                check_in_time: isCheckIn ? attendanceTime : null,
                check_out_time: isCheckOut ? attendanceTime : null,
                status: 'present',
                hours_worked: 0,
                overtime_hours: 0,
                undertime_hours: 0,
                late_hours: 0,
                biometric_verified: true,
                shift_type: 'regular',
              });

            if (insertError) {
              result.errors.push(`Failed to create attendance for ${employee.name}: ${insertError.message}`);
              result.failed++;
            } else {
              result.success++;
            }
          }
        } catch (error: any) {
          result.errors.push(`Error processing log: ${error.message}`);
          result.failed++;
        }
      }

      return result;
    } catch (error: any) {
      result.errors.push(error.message || 'Unknown error during attendance sync');
      return result;
    }
  }

  // Helper methods

  private static getHeaders(): HeadersInit {
    const headers: HeadersInit = {
      'Content-Type': 'application/x-www-form-urlencoded',
    };

    if (this.sessionId) {
      headers['Cookie'] = `session_id=${this.sessionId}`;
    }

    if (ZKTECO_USERNAME && ZKTECO_PASSWORD) {
      headers['Authorization'] = `Basic ${btoa(`${ZKTECO_USERNAME}:${ZKTECO_PASSWORD}`)}`;
    }

    return headers;
  }

  private static formatDate(date: Date): string {
    return date.toISOString().split('T')[0];
  }

  private static parseUserData(data: string): ZKTecoUser[] {
    // Parse user data based on device response format
    // This is a placeholder - actual parsing depends on device response
    const users: ZKTecoUser[] = [];
    const lines = data.split('\n');
    
    for (const line of lines) {
      if (line.trim()) {
        const parts = line.split('\t');
        if (parts.length >= 2) {
          users.push({
            id: parseInt(parts[0]),
            name: parts[1],
            privilege: parseInt(parts[2] || '0'),
          });
        }
      }
    }
    
    return users;
  }

  private static parseAttendanceData(data: string): ZKTecoAttendanceLog[] {
    // Parse attendance data based on device response format
    // This is a placeholder - actual parsing depends on device response
    const logs: ZKTecoAttendanceLog[] = [];
    const lines = data.split('\n');
    
    for (const line of lines) {
      if (line.trim()) {
        const parts = line.split('\t');
        if (parts.length >= 3) {
          logs.push({
            user_id: parseInt(parts[0]),
            timestamp: parts[1],
            status: parseInt(parts[2]),
            verify_mode: parseInt(parts[3] || '1'),
          });
        }
      }
    }
    
    return logs;
  }
}
