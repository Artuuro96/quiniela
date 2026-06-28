import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || '';

const isValid = supabaseUrl.startsWith('http') && supabaseAnonKey.length > 10;
export const supabase = isValid ? createClient(supabaseUrl, supabaseAnonKey) : null;
