import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ZKTecoService } from "@/services/zktecoService";
import { ZKTecoAutoSyncService } from "@/services/zktecoAutoSyncService";
import { toast } from "sonner";
import { useState, useEffect } from "react";

/**
 * Hook for testing ZKTeco device connectivity
 */
export function useTestDeviceConnection() {
  return useMutation({
    mutationFn: async () => {
      return await ZKTecoService.testConnection();
    },
    onSuccess: (isConnected) => {
      if (isConnected) {
        toast.success("Device is online and reachable!");
      } else {
        toast.error("Device is offline or unreachable. Check network connection and device IP settings.");
      }
    },
    onError: (error: any) => {
      console.error("Connection test error:", error);
      toast.error("Connection test failed", {
        description: error.message || "Failed to connect to device. Check console for details."
      });
    },
  });
}

/**
 * Hook for getting device information
 */
export function useDeviceInfo() {
  return useQuery({
    queryKey: ["zkteco-device-info"],
    queryFn: async () => {
      return await ZKTecoService.getDeviceInfo();
    },
    enabled: false, // Manual trigger only
    retry: false,
  });
}

/**
 * Hook for syncing employees from database to ZKTeco device
 */
export function useSyncEmployeesToDevice() {
  return useMutation({
    mutationFn: async () => {
      return await ZKTecoService.syncEmployeesToDevice();
    },
    onSuccess: (result) => {
      if (result.success > 0) {
        toast.success(
          `Successfully synced ${result.success} employee(s) to device!`,
          {
            description: result.failed > 0 
              ? `${result.failed} failed. Check details.` 
              : "All employees synced successfully.",
          }
        );
      }
      
      if (result.failed > 0) {
        console.error("Sync errors:", result.errors);
        toast.error(
          `Failed to sync ${result.failed} employee(s)`,
          {
            description: result.errors[0] || "Check console for details",
          }
        );
      }

      if (result.success === 0 && result.failed === 0) {
        toast.info("No employees to sync");
      }
    },
    onError: (error: any) => {
      toast.error("Sync failed", {
        description: error.message || "Failed to sync employees to device",
      });
    },
  });
}

/**
 * Hook for syncing attendance from ZKTeco device to database
 */
export function useSyncAttendanceFromDevice() {
  return useMutation({
    mutationFn: async ({ 
      startDate, 
      endDate 
    }: { 
      startDate?: Date; 
      endDate?: Date 
    } = {}) => {
      return await ZKTecoService.syncAttendanceFromDevice(startDate, endDate);
    },
    onSuccess: (result) => {
      if (result.success > 0) {
        toast.success(
          `Successfully synced ${result.success} attendance record(s)!`,
          {
            description: result.failed > 0 
              ? `${result.failed} failed. Check details.` 
              : "All attendance logs synced successfully.",
          }
        );
      }
      
      if (result.failed > 0) {
        console.error("Attendance sync errors:", result.errors);
        toast.error(
          `Failed to sync ${result.failed} record(s)`,
          {
            description: result.errors[0] || "Check console for details",
          }
        );
      }

      if (result.success === 0 && result.failed === 0) {
        toast.info("No new attendance logs found on device");
      }
    },
    onError: (error: any) => {
      toast.error("Attendance sync failed", {
        description: error.message || "Failed to sync attendance from device",
      });
    },
  });
}

/**
 * Hook for getting users from device
 */
export function useDeviceUsers() {
  return useQuery({
    queryKey: ["zkteco-device-users"],
    queryFn: async () => {
      return await ZKTecoService.getUsers();
    },
    enabled: false, // Manual trigger only
    retry: false,
  });
}

/**
 * Hook for clearing attendance logs from device
 */
export function useClearDeviceLogs() {
  return useMutation({
    mutationFn: async () => {
      return await ZKTecoService.clearAttendanceLogs();
    },
    onSuccess: (success) => {
      if (success) {
        toast.success("Device attendance logs cleared successfully!");
      } else {
        toast.error("Failed to clear device logs");
      }
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to clear device logs");
    },
  });
}

/**
 * Hook for managing automatic attendance sync
 */
export function useAutoSync() {
  const [isActive, setIsActive] = useState(ZKTecoAutoSyncService.isActive());
  const [interval, setIntervalState] = useState(ZKTecoAutoSyncService.getInterval());
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(ZKTecoAutoSyncService.getLastSyncTime());
  const queryClient = useQueryClient();

  // Update state when auto-sync completes
  useEffect(() => {
    const onSyncCallback = (result: any) => {
      setLastSyncTime(new Date());
      // Invalidate attendance queries to refresh UI
      queryClient.invalidateQueries({ queryKey: ["attendance"] });
    };

    // Set the callback
    if (isActive) {
      ZKTecoAutoSyncService.stop();
      ZKTecoAutoSyncService.start(interval, onSyncCallback);
    }

    return () => {
      // Cleanup is handled by stop()
    };
  }, [queryClient]);

  const start = (intervalMinutes: number = 5) => {
    const onSyncCallback = (result: any) => {
      setLastSyncTime(new Date());
      queryClient.invalidateQueries({ queryKey: ["attendance"] });
    };

    ZKTecoAutoSyncService.start(intervalMinutes, onSyncCallback);
    setIsActive(true);
    setIntervalState(intervalMinutes);
  };

  const stop = () => {
    ZKTecoAutoSyncService.stop();
    setIsActive(false);
  };

  const setInterval = (intervalMinutes: number) => {
    const onSyncCallback = (result: any) => {
      setLastSyncTime(new Date());
      queryClient.invalidateQueries({ queryKey: ["attendance"] });
    };

    ZKTecoAutoSyncService.setInterval(intervalMinutes);
    setIntervalState(intervalMinutes);

    if (isActive) {
      ZKTecoAutoSyncService.stop();
      ZKTecoAutoSyncService.start(intervalMinutes, onSyncCallback);
    }
  };

  const manualSync = async () => {
    const result = await ZKTecoAutoSyncService.manualSync();
    setLastSyncTime(new Date());
    queryClient.invalidateQueries({ queryKey: ["attendance"] });
    return result;
  };

  return {
    isActive,
    interval,
    lastSyncTime,
    start,
    stop,
    setInterval,
    manualSync,
  };
}
