/**
 * ZKTeco Auto-Sync Service
 * Automatically polls the ZKTeco device for new attendance logs at regular intervals
 */

import { ZKTecoService } from "./zktecoService";
import { toast } from "sonner";

export class ZKTecoAutoSyncService {
  private static intervalId: NodeJS.Timeout | null = null;
  private static isRunning = false;
  private static pollingInterval = 5 * 60 * 1000; // 5 minutes in milliseconds
  private static lastSyncTime: Date | null = null;
  private static onSyncCallback: ((result: any) => void) | null = null;

  /**
   * Start automatic polling
   */
  static start(intervalMinutes: number = 5, onSync?: (result: any) => void): void {
    if (this.isRunning) {
      console.log("Auto-sync is already running");
      return;
    }

    this.pollingInterval = intervalMinutes * 60 * 1000;
    this.onSyncCallback = onSync || null;
    this.isRunning = true;

    console.log(`Starting ZKTeco auto-sync with ${intervalMinutes} minute interval`);

    // Perform initial sync
    this.performSync();

    // Set up interval for periodic sync
    this.intervalId = setInterval(() => {
      this.performSync();
    }, this.pollingInterval);

    toast.success(`Auto-sync enabled (every ${intervalMinutes} minutes)`);
  }

  /**
   * Stop automatic polling
   */
  static stop(): void {
    if (!this.isRunning) {
      console.log("Auto-sync is not running");
      return;
    }

    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }

    this.isRunning = false;
    console.log("ZKTeco auto-sync stopped");
    toast.info("Auto-sync disabled");
  }

  /**
   * Check if auto-sync is currently running
   */
  static isActive(): boolean {
    return this.isRunning;
  }

  /**
   * Get the last sync time
   */
  static getLastSyncTime(): Date | null {
    return this.lastSyncTime;
  }

  /**
   * Perform a single sync operation
   */
  private static async performSync(): Promise<void> {
    try {
      console.log("Auto-sync: Checking device for new attendance...");

      // Calculate date range (last 7 days to catch any missed records)
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 7);

      // Sync attendance from device
      const result = await ZKTecoService.syncAttendanceFromDevice(startDate, endDate);

      this.lastSyncTime = new Date();

      if (result.success > 0) {
        console.log(`Auto-sync: Successfully synced ${result.success} attendance record(s)`);
        toast.success(`Auto-sync: ${result.success} new attendance record(s) synced`);
      } else if (result.failed > 0) {
        console.warn(`Auto-sync: Failed to sync ${result.failed} record(s)`);
        if (result.errors.length > 0) {
          console.error("Auto-sync errors:", result.errors);
        }
      } else {
        console.log("Auto-sync: No new attendance records found");
      }

      // Call the callback if provided
      if (this.onSyncCallback) {
        this.onSyncCallback(result);
      }
    } catch (error: any) {
      console.error("Auto-sync error:", error);
      // Don't show error toast to avoid annoying users if device is temporarily offline
      // Just log it silently
    }
  }

  /**
   * Manually trigger a sync outside the regular interval
   */
  static async manualSync(): Promise<{ success: number; failed: number; errors: string[] }> {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 7);

    const result = await ZKTecoService.syncAttendanceFromDevice(startDate, endDate);
    this.lastSyncTime = new Date();

    if (this.onSyncCallback) {
      this.onSyncCallback(result);
    }

    return result;
  }

  /**
   * Update polling interval (will restart auto-sync if running)
   */
  static setInterval(intervalMinutes: number): void {
    const wasRunning = this.isRunning;
    
    if (wasRunning) {
      this.stop();
    }

    this.pollingInterval = intervalMinutes * 60 * 1000;

    if (wasRunning) {
      this.start(intervalMinutes, this.onSyncCallback || undefined);
    }
  }

  /**
   * Get current polling interval in minutes
   */
  static getInterval(): number {
    return this.pollingInterval / 60000;
  }
}
