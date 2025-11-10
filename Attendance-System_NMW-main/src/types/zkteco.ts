// Temporary type extensions for ZKTeco integration
// This file extends Supabase types to include biometric_device_user_id
// TODO: Regenerate Supabase types after migration to remove this file

import { Database } from '@/integrations/supabase/types';

// Extend the employees table type
export type EmployeeWithBiometric = Database['public']['Tables']['employees']['Row'] & {
  biometric_device_user_id?: number | null;
};
