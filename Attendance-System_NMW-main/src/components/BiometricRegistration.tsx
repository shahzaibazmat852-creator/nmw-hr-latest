import { useState } from "react";
import { Fingerprint, Plus, Trash2, CheckCircle, AlertCircle, Clock } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useBiometricDevices, useRegisterBiometric, useRemoveBiometricDevice } from "@/hooks/useBiometric";

interface BiometricRegistrationProps {
  employeeId: string;
  employeeName: string;
}

export default function BiometricRegistration({ employeeId, employeeName }: BiometricRegistrationProps) {
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [deviceName, setDeviceName] = useState("");
  const [isRegistering, setIsRegistering] = useState(false);

  const { data: devices = [], isLoading: devicesLoading } = useBiometricDevices(employeeId);
  const registerBiometric = useRegisterBiometric();
  const removeDevice = useRemoveBiometricDevice();

  const handleRegister = async () => {
    if (!deviceName.trim()) {
      return;
    }

    setIsRegistering(true);
    try {
      await registerBiometric.mutateAsync({
        employee_id: employeeId,
        device_name: deviceName,
        credential_id: "", // Will be set by the hook
        public_key: "", // Will be set by the hook
        device_info: {} // Will be set by the hook
      });
      setShowAddDialog(false);
      setDeviceName("");
    } catch (error) {
      // Error is handled by the hook
    } finally {
      setIsRegistering(false);
    }
  };

  const handleRemoveDevice = async (deviceId: string) => {
    if (confirm("Are you sure you want to remove this biometric device?")) {
      await removeDevice.mutateAsync({ deviceId, employeeId });
    }
  };

  const isWebAuthnSupported = () => {
    return typeof window !== 'undefined' && 
           window.PublicKeyCredential && 
           typeof window.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable === 'function';
  };

  return (
    <Card className="shadow-soft border-0">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Fingerprint className="h-5 w-5" />
          Biometric Registration
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* WebAuthn Support Check */}
        {!isWebAuthnSupported() && (
          <Alert className="border-destructive/20 bg-destructive/5">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Biometric authentication is not supported on this device. Please use a device with fingerprint sensor.
            </AlertDescription>
          </Alert>
        )}

        {/* Registration Status */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Status:</span>
            <Badge className={devices.length > 0 ? "bg-success/10 text-success" : "bg-muted/10 text-muted-foreground"}>
              {devices.length > 0 ? "Registered" : "Not Registered"}
            </Badge>
          </div>
          <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
            <DialogTrigger asChild>
              <Button 
                size="sm" 
                className="gap-2"
                disabled={!isWebAuthnSupported()}
              >
                <Plus className="h-4 w-4" />
                Add Device
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Register Biometric Device</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="device-name">Device Name</Label>
                  <Input
                    id="device-name"
                    placeholder="e.g., Main Tablet, Office Device"
                    value={deviceName}
                    onChange={(e) => setDeviceName(e.target.value)}
                  />
                </div>
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    You will be prompted to place your finger on the sensor to register this device.
                  </AlertDescription>
                </Alert>
                <div className="flex justify-end gap-3">
                  <Button variant="outline" onClick={() => setShowAddDialog(false)}>
                    Cancel
                  </Button>
                  <Button 
                    onClick={handleRegister}
                    disabled={!deviceName.trim() || isRegistering}
                    className="bg-gradient-accent"
                  >
                    {isRegistering ? "Registering..." : "Register Device"}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Registered Devices */}
        {devicesLoading ? (
          <div className="text-center py-4 text-muted-foreground">
            Loading devices...
          </div>
        ) : devices.length > 0 ? (
          <div className="space-y-3">
            <h4 className="font-medium text-sm">Registered Devices:</h4>
            {devices.map((device) => (
              <div key={device.id} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex-1">
                  <div className="font-medium">{device.device_name}</div>
                  <div className="text-sm text-muted-foreground">
                    Registered: {new Date(device.registered_at).toLocaleDateString()}
                  </div>
                  {device.last_used && (
                    <div className="text-sm text-muted-foreground">
                      Last Used: {new Date(device.last_used).toLocaleDateString()}
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <Badge className={device.is_active ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive"}>
                    {device.is_active ? "Active" : "Inactive"}
                  </Badge>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleRemoveDevice(device.device_id)}
                    className="text-destructive hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-6 text-muted-foreground">
            <Fingerprint className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>No biometric devices registered</p>
            <p className="text-sm">Add a device to enable biometric attendance</p>
          </div>
        )}

        {/* Instructions */}
        <Alert>
          <CheckCircle className="h-4 w-4" />
          <AlertDescription>
            <strong>Instructions:</strong> Register your fingerprint on this device to enable biometric attendance. 
            You can register multiple devices for backup access.
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  );
}
