import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useEffect } from "react";
import { subscriptionManager } from "@/services/subscriptionManager";

// Types for biometric data
export interface BiometricDevice {
  id: string;
  employee_id: string;
  device_id: string;
  device_name: string;
  credential_id: string;
  public_key: string;
  registered_at: string;
  last_used: string | null;
  is_active: boolean;
  device_info: any;
}

export interface BiometricRegistration {
  employee_id: string;
  device_name: string;
  credential_id: string;
  public_key: string;
  device_info: any;
}

// Hook to get employee's biometric devices
export function useBiometricDevices(employeeId: string) {
  const queryClient = useQueryClient();

  // Set up realtime subscription for biometric devices
  useEffect(() => {
    subscriptionManager.incrementSubscription();
    subscriptionManager.initialize(queryClient);
    
    return () => {
      subscriptionManager.decrementSubscription();
    };
  }, [queryClient]);

  return useQuery({
    queryKey: ["biometric-devices", employeeId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("biometric_devices")
        .select("*")
        .eq("employee_id", employeeId)
        .order("registered_at", { ascending: false });

      if (error) throw error;
      return data as BiometricDevice[];
    },
    enabled: !!employeeId,
  });
}

// Hook to register biometric for employee
export function useRegisterBiometric() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (registration: BiometricRegistration) => {
      // Check if WebAuthn is supported
      if (typeof window === 'undefined' || !window.PublicKeyCredential) {
        throw new Error("Biometric authentication is not supported on this device");
      }

      // Generate device ID
      const deviceId = crypto.randomUUID();
      
      // Create credential using WebAuthn
      const credential = await navigator.credentials.create({
        publicKey: {
          challenge: crypto.getRandomValues(new Uint8Array(32)),
          rp: { 
            name: "NMW Payroll System",
            id: window.location.hostname
          },
          user: {
            id: new TextEncoder().encode(registration.employee_id),
            name: registration.employee_id,
            displayName: registration.employee_id
          },
          pubKeyCredParams: [
            { type: "public-key", alg: -7 }, // ES256
            { type: "public-key", alg: -257 } // RS256
          ],
          authenticatorSelection: {
            authenticatorAttachment: "platform",
            userVerification: "required"
          },
          timeout: 60000,
          attestation: "direct"
        }
      }) as PublicKeyCredential;

      if (!credential) {
        throw new Error("Failed to create biometric credential");
      }

      // Convert ArrayBuffer to base64 string for storage
      const credentialIdBase64 = btoa(String.fromCharCode(...new Uint8Array(credential.rawId)));
      // WebAuthn attestation provides attestationObject; use it to satisfy NOT NULL columns
      const attestationResponse = credential.response as AuthenticatorAttestationResponse;
      const attestationBase64 = btoa(String.fromCharCode(...new Uint8Array(attestationResponse.attestationObject)));

      // Store device information
      const { error: deviceError } = await supabase
        .from("biometric_devices")
        .insert({
          employee_id: registration.employee_id,
          device_id: deviceId,
          device_name: registration.device_name,
          credential_id: credentialIdBase64,
          public_key: attestationBase64,
          device_info: {
            type: credential.type,
            userAgent: navigator.userAgent,
            platform: navigator.platform,
            timestamp: new Date().toISOString()
          }
        });

      if (deviceError) throw deviceError;

      // Update employee biometric status
      const { error: employeeError } = await supabase
        .from("employees")
        .update({
          biometric_registered: true,
          biometric_credential_id: credentialIdBase64,
          biometric_public_key: attestationBase64,
          biometric_registered_at: new Date().toISOString(),
          biometric_device_info: {
            type: credential.type,
            userAgent: navigator.userAgent,
            platform: navigator.platform
          }
        })
        .eq("id", registration.employee_id);

      if (employeeError) throw employeeError;

      return { credential, deviceId };
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["biometric-devices", variables.employee_id] });
      queryClient.invalidateQueries({ queryKey: ["employees"] });
      toast.success("Biometric registration successful!");
    },
    onError: (error: any) => {
      console.error("Biometric registration error:", error);
      toast.error(error.message || "Biometric registration failed");
    },
  });
}

// Hook to authenticate biometric and get employee
export function useBiometricAuth() {
  return useMutation({
    mutationFn: async () => {
      // Check if WebAuthn is supported
      if (typeof window === 'undefined' || !window.PublicKeyCredential) {
        throw new Error("Biometric authentication is not supported on this device");
      }

      try {
        // Get all registered employees with biometric credentials
        const { data: employees, error: fetchError } = await supabase
          .from("employees")
          .select("id, name, employee_id, biometric_credential_id")
          .eq("biometric_registered", true)
          .not("biometric_credential_id", "is", null);

        if (fetchError) {
          // If biometric columns don't exist, fall back to mobile mode
          if (fetchError.message?.includes("biometric_credential_id") || 
              fetchError.message?.includes("does not exist") ||
              fetchError.message?.includes("column") ||
              fetchError.message?.includes("biometric_registered")) {
            throw new Error("BIOMETRIC_COLUMNS_NOT_FOUND");
          }
          throw fetchError;
        }

        if (!employees || employees.length === 0) {
          throw new Error("No employees registered for biometric authentication");
        }

      // Convert base64 credential IDs back to ArrayBuffer for WebAuthn
      const allowCredentials: PublicKeyCredentialDescriptor[] = employees.map(emp => {
        const credentialIdArray = new Uint8Array(atob(emp.biometric_credential_id).split('').map(c => c.charCodeAt(0)));
        return {
          type: "public-key" as const,
          id: credentialIdArray.buffer
        };
      });

      // Create authentication request
      const credential = await navigator.credentials.get({
        publicKey: {
          challenge: crypto.getRandomValues(new Uint8Array(32)),
          allowCredentials: allowCredentials,
          userVerification: "required",
          timeout: 60000
        }
      }) as PublicKeyCredential;

      if (!credential) {
        throw new Error("Biometric authentication failed");
      }

      // Convert credential ID to base64 for comparison
      const credentialIdBase64 = btoa(String.fromCharCode(...new Uint8Array(credential.rawId)));

      // Find matching employee
      const employee = employees.find(emp => emp.biometric_credential_id === credentialIdBase64);
      
      if (!employee) {
        throw new Error("Employee not found for this biometric credential");
      }

      // Update last used timestamp
      await supabase
        .from("biometric_devices")
        .update({ last_used: new Date().toISOString() })
        .eq("credential_id", credentialIdBase64);

        return employee;
      } catch (error: any) {
        // If biometric columns don't exist, throw a specific error
        if (error.message === "BIOMETRIC_COLUMNS_NOT_FOUND") {
          throw new Error("BIOMETRIC_COLUMNS_NOT_FOUND");
        }
        throw error;
      }
    },
    onError: (error: any) => {
      console.error("Biometric authentication error:", error);
      if (error.message === "BIOMETRIC_COLUMNS_NOT_FOUND") {
        // Don't show error toast for missing columns - let the UI handle it
        return;
      }
      toast.error(error.message || "Biometric authentication failed");
    },
  });
}

// Hook to remove biometric device
export function useRemoveBiometricDevice() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ deviceId, employeeId }: { deviceId: string; employeeId: string }) => {
      const { error } = await supabase
        .from("biometric_devices")
        .delete()
        .eq("device_id", deviceId)
        .eq("employee_id", employeeId);

      if (error) throw error;

      // Check if employee has any remaining devices
      const { data: remainingDevices } = await supabase
        .from("biometric_devices")
        .select("id")
        .eq("employee_id", employeeId);

      // If no devices left, update employee biometric status
      if (!remainingDevices || remainingDevices.length === 0) {
        await supabase
          .from("employees")
          .update({
            biometric_registered: false,
            biometric_credential_id: null,
            biometric_public_key: null,
            biometric_registered_at: null,
            biometric_device_info: null
          })
          .eq("id", employeeId);
      }
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["biometric-devices", variables.employeeId] });
      queryClient.invalidateQueries({ queryKey: ["employees"] });
      toast.success("Biometric device removed successfully!");
    },
    onError: (error: any) => {
      const errorMessage = error.message || "Failed to remove biometric device";
      console.error("Remove biometric device error:", error);
      toast.error(`Failed to remove biometric device: ${errorMessage}`);
    },
  });
}

// Hook to get all employees with biometric registration
export function useBiometricEmployees() {
  const queryClient = useQueryClient();

  // Set up realtime subscription for employee biometric changes
  useEffect(() => {
    subscriptionManager.incrementSubscription();
    subscriptionManager.initialize(queryClient);
    
    return () => {
      subscriptionManager.decrementSubscription();
    };
  }, [queryClient]);

  return useQuery({
    queryKey: ["biometric-employees"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("employees")
        .select("id, name, employee_id, department, biometric_registered, biometric_registered_at")
        .eq("biometric_registered", true)
        .order("name");

      if (error) throw error;
      return data;
    },
  });
}
