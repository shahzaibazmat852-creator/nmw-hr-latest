// Authentication Service for NMW Attendance-PayRoll System
// Handles user authentication using Supabase

import { supabase } from '@/integrations/supabase/client';
import type { User, AuthError } from '@supabase/supabase-js';

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface SignupCredentials {
  email: string;
  password: string;
  name: string;
}

class AuthService {
  // Helper to get browser/device info
  private getBrowserInfo() {
    const ua = navigator.userAgent;
    let browser = 'Unknown';
    let device = 'Desktop';
    let os = 'Unknown';

    // Detect browser
    if (ua.indexOf('Firefox') > -1) browser = 'Firefox';
    else if (ua.indexOf('SamsungBrowser') > -1) browser = 'Samsung Browser';
    else if (ua.indexOf('Opera') > -1 || ua.indexOf('OPR') > -1) browser = 'Opera';
    else if (ua.indexOf('Trident') > -1) browser = 'Internet Explorer';
    else if (ua.indexOf('Edge') > -1) browser = 'Edge';
    else if (ua.indexOf('Chrome') > -1) browser = 'Chrome';
    else if (ua.indexOf('Safari') > -1) browser = 'Safari';

    // Detect device
    if (/mobile/i.test(ua)) device = 'Mobile';
    else if (/tablet/i.test(ua)) device = 'Tablet';

    // Detect OS
    if (ua.indexOf('Win') > -1) os = 'Windows';
    else if (ua.indexOf('Mac') > -1) os = 'MacOS';
    else if (ua.indexOf('Linux') > -1) os = 'Linux';
    else if (ua.indexOf('Android') > -1) os = 'Android';
    else if (ua.indexOf('iOS') > -1) os = 'iOS';

    return { browser, device, os, user_agent: ua };
  }

  // Log login activity
  private async logLoginActivity(userId: string, userEmail: string, success: boolean = true) {
    try {
      const browserInfo = this.getBrowserInfo();
      
      // Direct insert (type casting to bypass TypeScript until types are regenerated)
      await (supabase as any).from('login_history').insert({
        user_id: userId,
        user_email: userEmail,
        login_time: new Date().toISOString(),
        browser: browserInfo.browser,
        device: browserInfo.device,
        os: browserInfo.os,
        user_agent: browserInfo.user_agent,
        success: success,
      });
    } catch (error) {
      console.error('Failed to log login activity:', error);
      // Don't throw - login should succeed even if logging fails
    }
  }

  // Update logout time
  private async logLogoutActivity(userId: string) {
    try {
      // Get the most recent login record for this user (type casting to bypass TypeScript)
      const { data: latestLogin } = await (supabase as any)
        .from('login_history')
        .select('id, login_time')
        .eq('user_id', userId)
        .is('logout_time', null)
        .order('login_time', { ascending: false })
        .limit(1)
        .single();

      if (latestLogin) {
        const logoutTime = new Date();
        const loginTime = new Date(latestLogin.login_time);
        const sessionDuration = Math.floor((logoutTime.getTime() - loginTime.getTime()) / 1000);

        await (supabase as any)
          .from('login_history')
          .update({
            logout_time: logoutTime.toISOString(),
            session_duration: sessionDuration,
          })
          .eq('id', latestLogin.id);
      }
    } catch (error) {
      console.error('Failed to log logout activity:', error);
    }
  }
  // Sign in with email and password
  async signIn(credentials: LoginCredentials): Promise<{ user: User | null; error: AuthError | null }> {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: credentials.email,
        password: credentials.password,
      });

      // Log login activity
      if (data.user) {
        await this.logLoginActivity(data.user.id, data.user.email || credentials.email, !error);
      }

      return { user: data.user, error };
    } catch (error) {
      console.error('Sign in error:', error);
      return { user: null, error: error as AuthError };
    }
  }

  // Sign up with email and password
  async signUp(credentials: SignupCredentials): Promise<{ user: User | null; error: AuthError | null }> {
    try {
      const { data, error } = await supabase.auth.signUp({
        email: credentials.email,
        password: credentials.password,
        options: {
          data: {
            name: credentials.name,
          },
        },
      });

      return { user: data.user, error };
    } catch (error) {
      console.error('Sign up error:', error);
      return { user: null, error: error as AuthError };
    }
  }

  // Sign out
  async signOut(): Promise<{ error: AuthError | null }> {
    try {
      // Get current user before signing out
      const { data: { user } } = await supabase.auth.getUser();
      
      // Sign out
      const { error } = await supabase.auth.signOut();
      
      // Log logout activity
      if (user) {
        await this.logLogoutActivity(user.id);
      }
      
      return { error };
    } catch (error) {
      console.error('Sign out error:', error);
      return { error: error as AuthError };
    }
  }

  // Get current user
  async getCurrentUser(): Promise<User | null> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      return user;
    } catch (error) {
      console.error('Get current user error:', error);
      return null;
    }
  }

  // Get current session
  async getCurrentSession() {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      return session;
    } catch (error) {
      console.error('Get current session error:', error);
      return null;
    }
  }

  // Listen to auth state changes
  onAuthStateChange(callback: (user: User | null) => void) {
    return supabase.auth.onAuthStateChange((event, session) => {
      callback(session?.user ?? null);
    });
  }

  // Reset password
  async resetPassword(email: string): Promise<{ error: AuthError | null }> {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      return { error };
    } catch (error) {
      console.error('Reset password error:', error);
      return { error: error as AuthError };
    }
  }

  // Update password
  async updatePassword(password: string): Promise<{ error: AuthError | null }> {
    try {
      const { error } = await supabase.auth.updateUser({
        password: password,
      });
      return { error };
    } catch (error) {
      console.error('Update password error:', error);
      return { error: error as AuthError };
    }
  }
}

export const authService = new AuthService();
