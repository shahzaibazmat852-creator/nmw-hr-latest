import { supabase } from "@/integrations/supabase/client";
import { QueryClient } from "@tanstack/react-query";

class SubscriptionManager {
  private static instance: SubscriptionManager;
  private queryClient: QueryClient | null = null;
  private channel: ReturnType<typeof supabase['channel']> | null = null;
  private subscriptionCount = 0;

  private constructor() {}

  static getInstance(): SubscriptionManager {
    if (!SubscriptionManager.instance) {
      SubscriptionManager.instance = new SubscriptionManager();
    }
    return SubscriptionManager.instance;
  }

  initialize(queryClient: QueryClient) {
    // Only initialize once per application lifecycle
    if (this.channel && this.queryClient === queryClient) {
      return; // Already initialized
    }
    
    this.queryClient = queryClient;
    
    // Create a single channel for all realtime subscriptions
    this.channel = supabase.channel('nmw-payroll-changes');
    
    // Set up listeners for all tables
    this.setupListeners();
    
    // Subscribe to the channel with optimized settings
    this.channel.subscribe((status) => {
      if (status !== 'SUBSCRIBED') {
        console.warn('Realtime subscription status:', status);
      }
    });
  }

  private setupListeners() {
    if (!this.channel || !this.queryClient) return;

    // Employees changes
    this.channel.on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'employees'
      },
      () => {
        this.queryClient?.invalidateQueries({ queryKey: ["employees"] });
        this.queryClient?.invalidateQueries({ queryKey: ["biometric-employees"] });
      }
    );

    // Attendance changes
    this.channel.on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'attendance'
      },
      () => {
        this.queryClient?.invalidateQueries({ queryKey: ["attendance"] });
        this.queryClient?.invalidateQueries({ queryKey: ["employee-attendance"] });
      }
    );

    // Payroll changes
    this.channel.on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'payroll'
      },
      () => {
        this.queryClient?.invalidateQueries({ queryKey: ["payroll"] });
      }
    );

    // Advances changes
    this.channel.on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'advances'
      },
      () => {
        this.queryClient?.invalidateQueries({ queryKey: ["employee-advances"] });
        this.queryClient?.invalidateQueries({ queryKey: ["payroll"] });
      }
    );

    // Payments changes
    this.channel.on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'payments'
      },
      () => {
        // Invalidate payment-related queries - they'll refetch automatically if needed
        // No need for explicit refetchQueries as invalidateQueries triggers refetch for active queries
        this.queryClient?.invalidateQueries({ queryKey: ["payroll-payments"], exact: false });
        this.queryClient?.invalidateQueries({ queryKey: ["employee-payments"], exact: false });
        this.queryClient?.invalidateQueries({ queryKey: ["all-payments"], exact: false });
        this.queryClient?.invalidateQueries({ queryKey: ["all-payments-reports"], exact: false });
      }
    );

    // Biometric devices changes
    this.channel.on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'biometric_devices'
      },
      () => {
        this.queryClient?.invalidateQueries({ queryKey: ["biometric-devices"] });
      }
    );
  }

  incrementSubscription() {
    this.subscriptionCount++;
  }

  decrementSubscription() {
    this.subscriptionCount--;
    if (this.subscriptionCount <= 0) {
      this.cleanup();
    }
  }

  private cleanup() {
    if (this.channel) {
      supabase.removeChannel(this.channel);
      this.channel = null;
    }
  }
}

export const subscriptionManager = SubscriptionManager.getInstance();