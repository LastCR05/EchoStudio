import { createClient } from '@supabase/supabase-js';

// These environment variables will store your Supabase project details.
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Create the Supabase client instance
export const supabase = createClient(supabaseUrl, supabaseAnonKey);
