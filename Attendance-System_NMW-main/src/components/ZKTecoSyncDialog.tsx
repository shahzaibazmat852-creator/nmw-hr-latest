import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@/components/ui/alert";
import {
  Fingerprint,
  RefreshCw,
  Download,
  Upload,
  Server,
  AlertCircle,
  CheckCircle2,
  Loader2,
  Wifi,
  Timer,
  Power,
  Clock,
  Network,
} from "lucide-react";
import {
  useTestDeviceConnection,
  useSyncEmployeesToDevice,
  useSyncAttendanceFromDevice,
  useDeviceInfo,
  useAutoSync,
} from "@/hooks/useZKTeco";
import { NetworkDiagnostics } from "@/utils/networkDiagnostics";

interface ZKTecoSyncDialogProps {
  children?: React.ReactNode;
}

export function ZKTecoSyncDialog({ children }: ZKTecoSyncDialogProps) {
  const [open, setOpen] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<
    "unknown" | "online" | "offline"
  >("unknown");
  const [isOnLan, setIsOnLan] = useState(true); // Assume on LAN by default

  const testConnection = useTestDeviceConnection();
  const syncEmployees = useSyncEmployeesToDevice();
  const syncAttendance = useSyncAttendanceFromDevice();
  const deviceInfo = useDeviceInfo();
  const autoSync = useAutoSync();

  // Check if we're on LAN when component mounts
  useState(() => {
    // In a browser environment, we can't definitively determine if we're on the same LAN
    // This would require server-side checking or special browser APIs
    // For now, we'll rely on user feedback
    setIsOnLan(window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1');
  });

  const handleTestConnection = async () => {
    const result = await testConnection.mutateAsync();
    setConnectionStatus(result ? "online" : "offline");
    
    if (result) {
      deviceInfo.refetch();
    }
  };

  const handleSyncEmployees = () => {
    syncEmployees.mutate();
  };

  const handleSyncAttendance = () => {
    syncAttendance.mutate({});
  };

  const handleAutoSyncToggle = (enabled: boolean) => {
    if (enabled) {
      autoSync.start(autoSync.interval);
    } else {
      autoSync.stop();
    }
  };

  const handleIntervalChange = (value: string) => {
    const minutes = parseInt(value);
    autoSync.setInterval(minutes);
  };

  const isLoading =
    testConnection.isPending ||
    syncEmployees.isPending ||
    syncAttendance.isPending ||
    deviceInfo.isLoading;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children || (
          <Button variant="outline" size="sm">
            <Fingerprint className="mr-2 h-4 w-4" />
            Device Sync
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[550px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Server className="h-5 w-5" />
            ZKTeco Device Synchronization
          </DialogTitle>
          <DialogDescription>
            Sync employees and attendance with your ZKTeco biometric device
            ({import.meta.env.VITE_ZKTECO_DEVICE_IP || '192.168.1.139'})
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Device Status */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Device Status:</span>
              <div className="flex items-center gap-2">
                {connectionStatus === "unknown" && (
                  <Badge variant="secondary">
                    <AlertCircle className="mr-1 h-3 w-3" />
                    Unknown
                  </Badge>
                )}
                {connectionStatus === "online" && (
                  <Badge variant="default" className="bg-green-600">
                    <CheckCircle2 className="mr-1 h-3 w-3" />
                    Online
                  </Badge>
                )}
                {connectionStatus === "offline" && (
                  <Badge variant="destructive">
                    <AlertCircle className="mr-1 h-3 w-3" />
                    Offline
                  </Badge>
                )}
              </div>
            </div>

            <Button
              onClick={handleTestConnection}
              disabled={isLoading}
              variant="outline"
              size="sm"
              className="w-full"
            >
              {testConnection.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Testing Connection...
                </>
              ) : (
                <>
                  <Wifi className="mr-2 h-4 w-4" />
                  Test Device Connection
                </>
              )}
            </Button>
          </div>

          {/* Device Info */}
          {deviceInfo.data && (
            <Alert>
              <Server className="h-4 w-4" />
              <AlertTitle>Device Information</AlertTitle>
              <AlertDescription>
                <div className="mt-2 space-y-1 text-xs">
                  <div>
                    <strong>Name:</strong> {deviceInfo.data.device_name || "N/A"}
                  </div>
                  <div>
                    <strong>Serial:</strong> {deviceInfo.data.serial_number || "N/A"}
                  </div>
                  <div>
                    <strong>Users:</strong> {deviceInfo.data.user_count || 0}
                  </div>
                  <div>
                    <strong>Logs:</strong> {deviceInfo.data.log_count || 0}
                  </div>
                </div>
              </AlertDescription>
            </Alert>
          )}

          <Separator />

          {/* Network Warning */}
          {connectionStatus === "offline" && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Device Unreachable</AlertTitle>
              <AlertDescription>
                Make sure you're connected to the same network as the device
                (192.168.1.x) and the device is powered on.
                Current configured IP: {import.meta.env.VITE_ZKTECO_DEVICE_IP || '192.168.1.139'}
              </AlertDescription>
            </Alert>
          )}
          
          {/* Not on LAN Warning */}
          {!isOnLan && (
            <Alert variant="destructive">
              <Network className="h-4 w-4" />
              <AlertTitle>Not on Device Network</AlertTitle>
              <AlertDescription>
                You are currently not on the same LAN as the ZKTeco device. 
                Please connect to the device's network to establish a connection.
                The device must be on the same subnet (192.168.1.x) as your computer.
              </AlertDescription>
            </Alert>
          )}

          <Separator />

          {/* Auto-Sync Settings */}
          <div className="space-y-3 rounded-lg border p-4 bg-muted/30">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <Timer className="h-4 w-4" />
                  <Label htmlFor="auto-sync" className="text-sm font-semibold">
                    Automatic Sync
                  </Label>
                </div>
                <p className="text-xs text-muted-foreground">
                  Automatically check device for new attendance every few minutes
                </p>
              </div>
              <Switch
                id="auto-sync"
                checked={autoSync.isActive}
                onCheckedChange={handleAutoSyncToggle}
                disabled={connectionStatus === "offline" || !isOnLan}
              />
            </div>

            {autoSync.isActive && (
              <div className="space-y-2 pt-2 border-t">
                <div className="flex items-center justify-between">
                  <Label htmlFor="interval" className="text-xs">
                    Check every:
                  </Label>
                  <Select
                    value={autoSync.interval.toString()}
                    onValueChange={handleIntervalChange}
                  >
                    <SelectTrigger id="interval" className="w-32 h-8">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">1 minute</SelectItem>
                      <SelectItem value="5">5 minutes</SelectItem>
                      <SelectItem value="10">10 minutes</SelectItem>
                      <SelectItem value="15">15 minutes</SelectItem>
                      <SelectItem value="30">30 minutes</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {autoSync.lastSyncTime && (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Clock className="h-3 w-3" />
                    <span>
                      Last synced: {autoSync.lastSyncTime.toLocaleTimeString()}
                    </span>
                  </div>
                )}

                <Alert className="py-2">
                  <Power className="h-3 w-3" />
                  <AlertDescription className="text-xs">
                    Auto-sync runs only while this page is open. Attendance will sync
                    automatically in the background.
                  </AlertDescription>
                </Alert>
              </div>
            )}
          </div>

          <Separator />

          {/* Sync Employees */}
          <div className="space-y-2">
            <h4 className="text-sm font-semibold">Sync Employees to Device</h4>
            <p className="text-sm text-muted-foreground">
              Push employee data from database to the biometric device. After
              syncing, you'll need to enroll fingerprints on the device.
            </p>
            <Button
              onClick={handleSyncEmployees}
              disabled={isLoading || connectionStatus === "offline" || !isOnLan}
              variant="default"
              className="w-full"
            >
              {syncEmployees.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Syncing Employees...
                </>
              ) : (
                <>
                  <Upload className="mr-2 h-4 w-4" />
                  Sync Employees to Device
                </>
              )}
            </Button>
          </div>

          <Separator />

          {/* Sync Attendance */}
          <div className="space-y-2">
            <h4 className="text-sm font-semibold">
              Sync Attendance from Device
            </h4>
            <p className="text-sm text-muted-foreground">
              Pull attendance logs from the device and save to database. This
              will import all new check-in/check-out records.
            </p>
            <Button
              onClick={handleSyncAttendance}
              disabled={isLoading || connectionStatus === "offline" || !isOnLan}
              variant="secondary"
              className="w-full"
            >
              {syncAttendance.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Syncing Attendance...
                </>
              ) : (
                <>
                  <Download className="mr-2 h-4 w-4" />
                  Sync Attendance from Device
                </>
              )}
            </Button>
          </div>

          {/* Help Text */}
          <Alert>
            <RefreshCw className="h-4 w-4" />
            <AlertTitle>Setup Steps</AlertTitle>
            <AlertDescription className="text-xs">
              <ol className="mt-2 list-decimal list-inside space-y-1">
                <li>Ensure you're on the same network (192.168.1.x)</li>
                <li>Test device connection</li>
                <li>Sync employees to device</li>
                <li>Enroll fingerprints on device (manually)</li>
                <li>Employees can now mark attendance</li>
                <li>Sync attendance logs to view in app</li>
              </ol>
            </AlertDescription>
          </Alert>
        </div>
      </DialogContent>
    </Dialog>
  );
}