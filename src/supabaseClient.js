import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://dyvkdtmefuukzdvouprw.supabase.co';
const supabaseAnonKey = 'sb_publishable_kn5mnyBa8P26DfC_Xx1qcw_wHkgJxaS';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
